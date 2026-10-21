const {
  app,
  BrowserWindow,
  Menu,
  Notification,
  powerMonitor,
  shell,
} = require("electron");
const { spawn } = require("child_process");
const settings = require("../settings");
const getClientFile = require("./client-injector");
const path = require("path");
const { sanitizeDownloadFilename } = require("./download-security");
const { FederatedAuthPolicy } = require("./federated-auth-policy");
const {
  buildNotificationContent,
  isTrustedIpcEvent,
  validateLoginReason,
  validateNotificationRequest,
  validateUnreadCount,
} = require("./ipc-validation");
const {
  decideAuthRecovery,
  shouldReloadForNetworkFailure,
} = require("./recovery-policy");
const {
  DEFAULT_OUTLOOK_URL,
  ROUTE_ACTIONS,
  buildOutlookComposeUrl,
  classifyUrl,
  isAuthenticationUrl,
  isOutlookUrl,
  isTeamsProtocolUrl,
  normalizeExternalHttpUrl,
  normalizeOutlookMainUrl,
  parseMailto,
  teamsHttpsFallback,
  toTeamsProtocolUrl,
} = require("./url-router");
const { chooseShowAction } = require("./window-state");

let showWindowFrame;

// Microsoft auth domains whose cookies are checked/cleaned for session recovery
const AUTH_DOMAINS = [
  "login.microsoftonline.com",
  "login.microsoft.com",
  "login.live.com",
  "outlook.cloud.microsoft",
  "outlook.office.com",
  "outlook.office365.com",
  "outlook.live.com",
  "cloud.microsoft",
  "microsoft.com",
  "office.com",
  "live.com",
];

// Azure AD / MSAL / OWA auth cookie names
const AUTH_COOKIE_NAMES = new Set([
  "ESTSAUTH",
  "ESTSAUTHPERSISTENT",
  "ESTSAUTHLIGHT",
  "SignInStateCookie",
  "buid",
  "fpc",
  "x-ms-gateway-slice",
  "stsservicecookie",
  "CCState",
  "FedAuth",
  "rtFa",
]);

//Setted by cmdLine to initial minimization
const initialMinimization = {
  domReady: false,
};

class MailWindowController {
  constructor({ initialProtocolUrl = null } = {}) {
    // Check both command-line flag and settings for initial minimization
    const commandLine = Array.isArray(global.cmdLine) ? global.cmdLine : [];
    const hasMinimizedFlag = commandLine.includes("--minimized");
    const startMinimizedSetting = settings.get("startupWindowState") === "minimized";
    initialMinimization.domReady = hasMinimizedFlag || startMinimizedSetting;

    this.lastNetworkReloadAt = 0;
    this.networkRecoveryPending = false;
    this.lastAuthRecoveryReloadAt = 0;
    this.onUnreadChanged = null;
    this.ownedWebContents = new Set();
    this.downloadSession = null;
    this.downloadHandler = null;
    this.resumeHandler = null;
    this.federatedAuthPolicy = new FederatedAuthPolicy();
    this.initialMailtoFields = initialProtocolUrl
      ? parseMailto(initialProtocolUrl)
      : null;
    this.init();
  }

  reloadSettings() {
    showWindowFrame = settings.get("showWindowFrame") === true;

    const configuredMainUrl = settings.get("urlMainWindow");
    this.mainMailServiceUrl =
      normalizeOutlookMainUrl(configuredMainUrl) || DEFAULT_OUTLOOK_URL;
    if (this.mainMailServiceUrl !== configuredMainUrl) {
      console.warn(
        "[Settings] Ignoring an invalid or untrusted Outlook main URL"
      );
    }
  }

  openExternalLink(url) {
    const safeUrl = normalizeExternalHttpUrl(url);
    if (!safeUrl) return false;

    const customBrowserPath = settings.get("customBrowserPath");
    const useCustomBrowser =
      typeof customBrowserPath === "string" &&
      customBrowserPath.length > 0 &&
      customBrowserPath.length <= 4096 &&
      !customBrowserPath.includes("\u0000");

    if (useCustomBrowser) {
      try {
        const child = spawn(customBrowserPath, [safeUrl], {
          detached: true,
          stdio: "ignore",
          shell: false,
        });
        child.unref();
        child.once("error", (error) => {
          this.logOperationError("Custom browser launch", error);
          this.openSystemExternal(safeUrl);
        });
      } catch (error) {
        this.logOperationError("Custom browser launch", error);
        this.openSystemExternal(safeUrl);
      }
    } else {
      this.openSystemExternal(safeUrl);
    }
    return true;
  }

  openSystemExternal(url) {
    void shell.openExternal(url).catch((error) => {
      this.logOperationError("External browser launch", error);
    });
  }

  async openTeamsLink(url) {
    const nativeUrl = isTeamsProtocolUrl(url)
      ? url
      : toTeamsProtocolUrl(url);
    const fallbackUrl = teamsHttpsFallback(url);
    if (!nativeUrl || !fallbackUrl) return false;

    let handlerName = "";
    try {
      handlerName = app.getApplicationNameForProtocol(nativeUrl);
    } catch {
      // The fallback browser remains available when handler detection fails.
    }

    if (!handlerName) {
      return this.openExternalLink(fallbackUrl);
    }

    try {
      await shell.openExternal(nativeUrl);
      return true;
    } catch (error) {
      this.logOperationError("Teams protocol launch", error);
      return this.openExternalLink(fallbackUrl);
    }
  }

  openMailtoFields(fields) {
    const composeUrl = buildOutlookComposeUrl(fields, this.mainMailServiceUrl);
    if (!composeUrl || !this.win || this.win.isDestroyed()) return false;
    void this.win.loadURL(composeUrl).catch((error) => {
      this.logOperationError("Outlook compose navigation", error);
    });
    this.show();
    return true;
  }

  handleProtocolUrl(url) {
    const fields = parseMailto(url);
    return fields ? this.openMailtoFields(fields) : false;
  }

  setUnreadHandler(handler) {
    this.onUnreadChanged = typeof handler === "function" ? handler : null;
  }

  logOperationError(operation, error) {
    const code =
      error &&
      typeof error.code === "string" &&
      /^[A-Z0-9_-]{1,64}$/i.test(error.code)
        ? ` (${error.code})`
        : "";
    console.warn(`[Prospect Mail] ${operation} failed${code}`);
  }

  routeUserLink(url, sourceUrl) {
    return this.dispatchRoute(classifyUrl(url, { sourceUrl }));
  }

  dispatchRoute(route) {
    switch (route.action) {
      case ROUTE_ACTIONS.EXTERNAL:
        return this.openExternalLink(route.url);
      case ROUTE_ACTIONS.TEAMS:
        void this.openTeamsLink(route.url);
        return true;
      case ROUTE_ACTIONS.MAILTO:
        return this.openMailtoFields(route.fields);
      case ROUTE_ACTIONS.INTERNAL:
        if (route.url && this.win && !this.win.isDestroyed()) {
          void this.win.loadURL(route.url).catch((error) => {
            this.logOperationError("Outlook navigation", error);
          });
          return true;
        }
        return false;
      default:
        return false;
    }
  }

  securePopupOptions() {
    return {
      autoHideMenuBar: true,
      webPreferences: {
        allowRunningInsecureContent: false,
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, "popup-preload.js"),
        sandbox: true,
        webSecurity: true,
        webviewTag: false,
      },
    };
  }

  configureWebContents(contents, { allowIpc }) {
    const contentsId = contents.id;
    this.ownedWebContents.add(contentsId);
    contents.once("destroyed", () => {
      this.ownedWebContents.delete(contentsId);
      this.federatedAuthPolicy.clear(contentsId);
    });

    contents.on("will-attach-webview", (event) => event.preventDefault());
    contents.on("will-navigate", (details) => {
      this.guardNavigation(details, contents, false);
    });
    contents.on("will-redirect", (details) => {
      this.guardNavigation(details, contents, true);
    });

    contents.setWindowOpenHandler((details) => {
      const sourceUrl = details.referrer?.url || contents.getURL();
      const route = classifyUrl(details.url, { sourceUrl });

      if (
        route.action === ROUTE_ACTIONS.INTERNAL_POPUP ||
        (route.action === ROUTE_ACTIONS.INTERNAL &&
          isAuthenticationUrl(route.url))
      ) {
        return {
          action: "allow",
          overrideBrowserWindowOptions: this.securePopupOptions(),
        };
      }

      this.dispatchRoute(route);
      return { action: "deny" };
    });

    contents.on("did-create-window", (childWindow) => {
      this.configureWebContents(childWindow.webContents, { allowIpc: false });
    });

    if (allowIpc) this.registerIpcHandlers(contents);
  }

  guardNavigation(details, contents, isRedirect) {
    if (details.isMainFrame === false) return;

    const sourceUrl = details.initiator?.url || contents.getURL();
    const route = classifyUrl(details.url, { sourceUrl });
    if (
      route.action === ROUTE_ACTIONS.INTERNAL ||
      route.action === ROUTE_ACTIONS.INTERNAL_POPUP
    ) {
      return;
    }
    if (
      route.action === ROUTE_ACTIONS.EXTERNAL &&
      this.federatedAuthPolicy.allows({
        contentsId: contents.id,
        sourceUrl,
        destinationUrl: details.url,
        isRedirect,
      })
    ) {
      return;
    }

    details.preventDefault();
    this.dispatchRoute(route);
  }

  registerIpcHandlers(contents) {
    const isTrusted = (event) => isTrustedIpcEvent(event, contents);

    contents.ipc.on("show", (event, ...args) => {
      if (args.length === 0 && isTrusted(event)) this.show();
    });

    contents.ipc.on("updateUnread", (event, value, ...extra) => {
      if (extra.length > 0 || !isTrusted(event)) return;
      const unread = validateUnreadCount(value);
      if (unread !== null && this.onUnreadChanged) {
        this.onUnreadChanged(unread);
      }
    });

    contents.ipc.on("show-notification", (event, value, ...extra) => {
      if (extra.length > 0 || !isTrusted(event)) return;
      const request = validateNotificationRequest(value);
      if (request) this.showRendererNotification(request);
    });

    contents.ipc.on("report-login-required", (event, value, ...extra) => {
      if (extra.length > 0 || !isTrusted(event)) return;
      const reason = validateLoginReason(value);
      if (reason) this.handleLoginRequired(reason);
    });
  }

  showRendererNotification(request) {
    if (
      request.kind === "mail" &&
      settings.get("showUnreadNotifications") !== true
    ) {
      return;
    }
    if (!Notification.isSupported()) return;

    const content = buildNotificationContent(
      request,
      settings.get("showNotificationContent") === true
    );
    this.showAppNotification(content.title, content.body);
  }

  handleLoginRequired(reason) {
    const decision = decideAuthRecovery({
      reason,
      isFocused: this.win.isFocused(),
      isVisible: this.win.isVisible(),
      now: Date.now(),
      lastReloadAt: this.lastAuthRecoveryReloadAt,
    });
    this.lastAuthRecoveryReloadAt = decision.lastReloadAt;

    if (decision.action === "reload") {
      console.log("[Auth] Attempting one silent session recovery reload");
      this.reloadWindowSilently();
      return;
    }

    this.showAppNotification(
      "Prospect Mail: Sign in required",
      "Outlook requires you to sign in again. Click here to open Prospect Mail."
    );
  }

  configureDownloadHandling(downloadSession) {
    if (this.downloadSession && this.downloadHandler) {
      this.downloadSession.removeListener("will-download", this.downloadHandler);
    }

    this.downloadSession = downloadSession;
    this.downloadHandler = (_event, item, webContents) => {
      if (
        !webContents ||
        !this.ownedWebContents.has(webContents.id)
      ) {
        return;
      }

      const filename = sanitizeDownloadFilename(item.getFilename());
      item.setSaveDialogOptions({
        title: "Save Outlook attachment",
        defaultPath: path.join(app.getPath("downloads"), filename),
      });
    };
    downloadSession.on("will-download", this.downloadHandler);
  }

  init() {
    this.reloadSettings();

    // Create the browser window.
    this.win = new BrowserWindow({
      x: 100,
      y: 100,
      width: 1400,
      height: 900,
      frame: showWindowFrame,
      autoHideMenuBar: true,

      show: false,
      title: "Prospect Mail",
      icon: path.join(__dirname, "../../assets/outlook_linux_black.png"),
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        webviewTag: false,
        preload: path.join(__dirname, "preload.js"),
        // Keep the injected unread observer's timers running while the window is
        // hidden to tray (hideOnClose/hideOnMinimize). Chromium throttles timers
        // in hidden windows by default, which stopped new-mail detection in the
        // tray (#415).
        backgroundThrottling: false,
      },
    });
    this.ownedWebContents.clear();
    this.configureWebContents(this.win.webContents, { allowIpc: true });
    this.configureDownloadHandling(this.win.webContents.session);

    // Set true right before a silent recovery reload so the dom-ready handler
    // doesn't re-show a hidden/background window (see reloadWindowSilently).
    this.suppressReloadShow = false;

    const isDev = process.env.NODE_ENV === "development";

    // Open DevTools in development mode
    if (isDev) {
      this.win.webContents.openDevTools();
    }

    const platform = process.platform;
    let userAgentOS;
    let customUserAgent;

    // Set OS-specific part of the user agent
    switch (platform) {
      case "darwin":
        userAgentOS = "Macintosh; Intel Mac OS X 10_15_7";
        break;
      case "linux":
        userAgentOS = "X11; Linux x86_64";
        break;
      case "win32":
      default:
        userAgentOS = "Windows NT 10.0; Win64; x64";
        break;
    }

    // Derive the version from the bundled Chromium so the UA stays correct on
    // Electron bumps. Chrome/Edge freeze the UA to MAJOR.0.0.0 (UA reduction).
    const chromeMajor = process.versions.chrome.split(".")[0];
    customUserAgent =
      "Mozilla/5.0 " +
      userAgentOS +
      ` AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 Safari/537.36 Edg/${chromeMajor}.0.0.0`;

    // and load the index.html of the app.
    // Clean expired auth cookies first so Outlook starts from a clean session
    // state, giving SSO the best chance to silently re-authenticate (#419).
    const initialUrl = this.initialMailtoFields
      ? buildOutlookComposeUrl(
          this.initialMailtoFields,
          this.mainMailServiceUrl
        ) || this.mainMailServiceUrl
      : this.mainMailServiceUrl;
    this.initialMailtoFields = null;
    const initialWindow = this.win;
    this.cleanExpiredAuthCookies().finally(() => {
      if (!initialWindow.isDestroyed()) {
        void initialWindow
          .loadURL(initialUrl, {
            userAgent: customUserAgent,
          })
          .catch((error) =>
            this.logOperationError("Initial Outlook navigation", error)
          );
      }
    });

    // Setup context menu for text selection and links
    this.win.webContents.on("context-menu", (_event, params) => {
      const menuTemplate = [];

      // Add text editing options if text is selected or in an editable field
      if (params.isEditable) {
        menuTemplate.push(
          { label: "Undo", role: "undo" },
          { label: "Redo", role: "redo" },
          { type: "separator" },
          { label: "Cut", role: "cut", enabled: params.editFlags.canCut },
          { label: "Copy", role: "copy", enabled: params.editFlags.canCopy },
          { label: "Paste", role: "paste", enabled: params.editFlags.canPaste },
          { type: "separator" },
          { label: "Select All", role: "selectAll" }
        );
      } else {
        // For non-editable content (reading emails)
        if (params.selectionText) {
          menuTemplate.push({
            label: "Copy",
            role: "copy",
          });
        }

        // Add link-specific options
        if (params.linkURL) {
          if (menuTemplate.length > 0) {
            menuTemplate.push({ type: "separator" });
          }
          menuTemplate.push(
            {
              label: "Open Link",
              click: () => {
                this.routeUserLink(params.linkURL, params.pageURL);
              },
            },
            {
              label: "Copy Link Address",
              click: () => {
                const { clipboard } = require("electron");
                clipboard.writeText(params.linkURL);
              },
            }
          );
        }

        // Add select all if there's text content
        if (params.selectionText || params.pageURL) {
          if (menuTemplate.length > 0) {
            menuTemplate.push({ type: "separator" });
          }
          menuTemplate.push({ label: "Select All", role: "selectAll" });
        }
      }

      // Add inspect element in development mode
      if (isDev) {
        if (menuTemplate.length > 0) {
          menuTemplate.push({ type: "separator" });
        }
        menuTemplate.push({
          label: "Inspect Element",
          click: () => {
            this.win.webContents.inspectElement(params.x, params.y);
          },
        });
      }

      // Only show menu if there are items
      if (menuTemplate.length > 0) {
        const menu = Menu.buildFromTemplate(menuTemplate);
        menu.popup();
      }
    });

    // Network recovery: reload when the main frame fails to load with a
    // transient connectivity error (e.g. after sleep or a network change).
    // Debounced so a burst of failures triggers a single reload; sub-frame and
    // non-recoverable errors (aborts, cert/HTTP) are ignored.
    this.win.webContents.on(
      "did-fail-load",
      (_event, errorCode, _errorDescription, _validatedURL, isMainFrame) => {
        const now = Date.now();
        if (
          !shouldReloadForNetworkFailure({
            errorCode,
            isMainFrame,
            isFocused: this.win.isFocused(),
            recoveryPending: this.networkRecoveryPending,
            now,
            lastReloadAt: this.lastNetworkReloadAt,
          })
        ) {
          return;
        }
        this.lastNetworkReloadAt = now;
        this.networkRecoveryPending = true;
        console.log(`[Network] Recovering main-frame load error ${errorCode}`);
        this.reloadWindowSilently();
      }
    );
    this.win.webContents.on("did-finish-load", () => {
      this.networkRecoveryPending = false;
    });

    // After resuming from sleep, cookies may have expired during suspend.
    // Clean them so Outlook doesn't show a stale session state.
    if (this.resumeHandler) {
      powerMonitor.removeListener("resume", this.resumeHandler);
    }
    this.resumeHandler = () => {
      void this.cleanExpiredAuthCookies();
    };
    powerMonitor.on("resume", this.resumeHandler);

    // Inject only into known Microsoft Outlook/auth pages. A navigation guard
    // prevents external content from retaining the privileged preload.
    this.win.webContents.on("dom-ready", () => {
      const currentUrl = this.win.webContents.getURL();
      if (isOutlookUrl(currentUrl)) {
        void this.win.webContents
          .insertCSS(getClientFile("main.css"))
          .catch((error) => this.logOperationError("Style injection", error));
        if (!showWindowFrame) {
          void this.win.webContents
            .insertCSS(getClientFile("no-frame.css"))
            .catch((error) => this.logOperationError("Style injection", error));
        }
        this.addUnreadNumberObserver();
      } else if (isAuthenticationUrl(currentUrl)) {
        this.addUnreadNumberObserver();
      }

      if (this.suppressReloadShow) {
        // A silent session-recovery reload must not change window visibility.
        this.suppressReloadShow = false;
      } else if (!initialMinimization.domReady) {
        // A minimized startup keeps the window hidden, so if we're here we only
        // need to honor the maximized case. maximize() also shows the window.
        if (settings.get("startupWindowState") === "maximized") {
          this.win.maximize();
        } else {
          this.win.show();
        }
      }
    });

    // prevent the app quit, hide the window instead.
    this.win.on("close", (e) => {
      //console.log('Log invoked: ' + this.win.isVisible())
      if (this.win.isVisible()) {
        if (settings.get("hideOnClose") === true) {
          e.preventDefault();
          this.win.hide();
        }
      }
    });

    // prevent the app minimze, hide the window instead.
    this.win.on("minimize", (e) => {
      if (settings.get("hideOnMinimize") === true) {
        e.preventDefault();
        this.win.hide();
      }
    });

    // Emitted when the window is closed.
    this.win.on("closed", () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      this.win = null;
      if (!global.preventAutoCloseApp) {
        app.exit(0); //dont should the app exit is mainWindow is closed?
      }
      global.preventAutoCloseApp = false;
    });
  }

  addUnreadNumberObserver() {
    if (!this.win || this.win.isDestroyed()) return;
    const contents = this.win.webContents;
    const config = {
      showUnreadNotifications:
        settings.get("showUnreadNotifications") === true,
      showNotificationContent:
        settings.get("showNotificationContent") === true,
      unreadNotificationSource:
        settings.get("unreadNotificationSource") === "favorites"
          ? "favorites"
          : "inbox",
    };
    const setConfig = `window.prospectMailConfig = Object.assign(window.prospectMailConfig || {}, ${JSON.stringify(config)});`;

    void contents
      .executeJavaScript(setConfig)
      .then(() =>
        contents.executeJavaScript(
          getClientFile("unread-number-observer.js")
        )
      )
      .catch((error) =>
        this.logOperationError("Outlook observer injection", error)
      );
  }

  /**
   * Removes expired auth cookies for Microsoft domains. Only cookies past
   * their expirationDate are removed — valid cookies are preserved. This
   * prevents Outlook from loading with a stale session that shows the
   * "sign in again" state instead of auto-authenticating via SSO.
   */
  async cleanExpiredAuthCookies() {
    if (!this.win || this.win.isDestroyed()) return;
    const currentSession = this.win.webContents.session;
    try {
      const allCookies = await currentSession.cookies.get({});
      const nowSeconds = Date.now() / 1000;

      const expired = allCookies.filter((cookie) => {
        const domain = (cookie.domain || "").replace(/^\./, "");
        const isAuthDomain = AUTH_DOMAINS.some(
          (d) => domain === d || domain.endsWith("." + d)
        );
        return (
          isAuthDomain &&
          AUTH_COOKIE_NAMES.has(cookie.name) &&
          cookie.expirationDate &&
          cookie.expirationDate < nowSeconds
        );
      });

      if (expired.length === 0) return;

      console.log(`[Auth] Removing ${expired.length} expired auth cookie(s)`);
      for (const cookie of expired) {
        try {
          const protocol = cookie.secure ? "https" : "http";
          const domain = cookie.domain.startsWith(".")
            ? cookie.domain.substring(1)
            : cookie.domain;
          const url = `${protocol}://${domain}${cookie.path || "/"}`;
          await currentSession.cookies.remove(url, cookie.name);
        } catch (error) {
          this.logOperationError("Expired auth cookie removal", error);
        }
      }
    } catch (error) {
      this.logOperationError("Auth cookie check", error);
    }
  }

  /**
   * Shows a native notification directly from the main process (used to tell a
   * tray/minimized user that Outlook needs an interactive sign-in).
   */
  showAppNotification(title, body) {
    if (!Notification.isSupported()) return;

    const notification = new Notification({
      title,
      body,
      icon: path.join(__dirname, "../../assets/outlook_linux_black.png"),
    });
    notification.on("click", () => this.show());
    notification.show();
  }

  toggleWindow() {
    if (!this.win || this.win.isDestroyed()) return;
    if (this.win.isVisible()) {
      this.win.hide();
    } else {
      initialMinimization.domReady = false;
      this.show();
    }
  }
  reloadWindow() {
    if (!this.win || this.win.isDestroyed()) return;
    initialMinimization.domReady = false;
    this.win.reload();
  }

  // Reload without changing window visibility. Used for background session
  // recovery while the window is hidden/unfocused: unlike reloadWindow(), it
  // does not force the window to show on the next dom-ready.
  reloadWindowSilently() {
    if (!this.win || this.win.isDestroyed()) return;
    this.suppressReloadShow = true;
    this.win.webContents.reload();
  }

  show() {
    if (!this.win || this.win.isDestroyed()) return;
    initialMinimization.domReady = false;

    // Raise with exactly ONE Wayland activation. restore()/show()/focus()
    // each triggers an xdg-activation, but only the first consumes the token
    // GNOME forwarded on notification click; extra calls just mint stale
    // tokens that GNOME rejects with an "X is ready" prompt. moveTop() is a
    // no-op on Wayland and never consumes the token.
    // See https://github.com/electron/electron/pull/50568
    const action = chooseShowAction({
      isMinimized: this.win.isMinimized(),
      isVisible: this.win.isVisible(),
    });
    this.win[action]();
  }
}

module.exports = MailWindowController;
