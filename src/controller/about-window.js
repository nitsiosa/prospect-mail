const { BrowserWindow, app, shell } = require("electron");
const path = require("path");

let aboutWindow = null;
const ABOUT_LINKS = Object.freeze({
  github: "https://github.com/julian-alarcon/prospect-mail",
  donate: "https://github.com/sponsors/julian-alarcon",
  issues: "https://github.com/julian-alarcon/prospect-mail/issues",
});

/**
 * Opens the About window
 * Creates a new window if it doesn't exist, or focuses the existing one
 */
function openAboutWindow() {
  // If window already exists, focus it
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.focus();
    return;
  }

  const version = app.getVersion();

  aboutWindow = new BrowserWindow({
    width: 450,
    height: 580,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    transparent: true,
    title: "About Prospect Mail",
    autoHideMenuBar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      preload: path.join(__dirname, "about-preload.js"),
    },
  });

  // Build URL with the display-only version. External destinations are fixed
  // in the main process and selected by an enum, never supplied by HTML.
  const htmlPath = path.join(__dirname, "../about.html");
  const params = new URLSearchParams({ version });

  aboutWindow.loadFile(htmlPath, {
    search: params.toString(),
  });

  const contents = aboutWindow.webContents;
  contents.ipc.on("open-about-link", (event, target, ...extra) => {
    if (
      extra.length > 0 ||
      event.senderFrame !== contents.mainFrame ||
      typeof target !== "string" ||
      !Object.hasOwn(ABOUT_LINKS, target)
    ) {
      return;
    }
    void shell.openExternal(ABOUT_LINKS[target]).catch(() => {
      console.warn("[About] Could not open the selected external link");
    });
  });

  contents.ipc.on("close-about-window", (event, ...args) => {
    if (args.length > 0 || event.senderFrame !== contents.mainFrame) return;
    if (aboutWindow && !aboutWindow.isDestroyed()) {
      aboutWindow.close();
    }
  });

  // Open external links in default browser
  aboutWindow.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });

  // Clean up reference when window is closed
  aboutWindow.on("closed", () => {
    aboutWindow = null;
  });
}

module.exports = { openAboutWindow };
