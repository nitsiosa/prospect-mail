const { app } = require("electron");
const path = require("path");
const MailWindowController = require("./controller/mail-window-controller");
const {
  extractMailtoArgument,
} = require("./controller/protocol-command");
const TrayController = require("./controller/tray-controller");

// Set the app name to use kebab-case for config directory (avoids spaces in path)
// This must be set before app is ready
app.setPath("userData", path.join(app.getPath("appData"), "prospect-mail"));

// Set desktop name so Wayland uses the correct XDG app_id, which lets GNOME
// match a notification's activation token to our installed .desktop entry and
// raise the window instead of showing a phantom "app is ready" prompt.
// The value must be the installed .desktop base filename, which differs per
// package format.
if (process.platform === "linux") {
  let desktopName;
  const snapName = process.env.SNAP_INSTANCE_NAME || process.env.SNAP_NAME;
  if (snapName) {
    // snap: <instance>_<app>.desktop
    desktopName = `${snapName}_${snapName}`;
  } else if (process.env.FLATPAK_ID) {
    desktopName = process.env.FLATPAK_ID;
  } else {
    // deb/rpm/tar: executableName matches the .desktop file name generated
    // by electron-builder (build.executableName in package.json).
    desktopName = "prospect-mail";
  }
  app.setDesktopName(`${desktopName}.desktop`);
}

//Store commandline for global purpose
global.cmdLine = process.argv;

class ProspectMail {
  constructor() {
    this.mailController = null;
    this.trayController = null;
    this.pendingProtocolUrl = extractMailtoArgument(process.argv);
  }

  // init method, the entry point of the app
  init() {
    const lock = app.requestSingleInstanceLock();
    if (!lock) {
      app.quit();
    } else {
      app.on("second-instance", (_event, commandLine) => {
        const protocolUrl = extractMailtoArgument(commandLine);
        if (protocolUrl && this.mailController) {
          this.mailController.handleProtocolUrl(protocolUrl);
        } else if (this.mailController) {
          this.mailController.show();
        }
      });

      app.on("open-url", (event, url) => {
        event.preventDefault();
        const protocolUrl = extractMailtoArgument([url]);
        if (!protocolUrl) return;
        if (this.mailController) {
          this.mailController.handleProtocolUrl(protocolUrl);
        } else {
          this.pendingProtocolUrl = protocolUrl;
        }
      });

      this.initApp();
    }
  }

  // init the main app
  initApp() {
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on("ready", () => {
      this.createControllers();
    });
    // Quit when all windows are closed.
    app.on("window-all-closed", () => {
      // On macOS it is common for applications and their menu bar
      // to stay active until the user quits explicitly with Cmd + Q
      if (process.platform !== "darwin" && !this.mailController) {
        app.quit();
      }
    });
  }

  createControllers() {
    this.mailController = new MailWindowController({
      initialProtocolUrl: this.pendingProtocolUrl,
    });
    this.pendingProtocolUrl = null;
    this.trayController = new TrayController(this.mailController);
  }
}

new ProspectMail().init();
