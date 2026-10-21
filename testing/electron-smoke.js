"use strict";

const { app, BrowserWindow, protocol } = require("electron");

const SYNTHETIC_OUTLOOK = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Synthetic Outlook</title></head>
  <body>
    <main>Offline smoke page</main>
    <section data-app-section="NavigationPane">
      <div id="folderPaneDroppableContainer">
        <div data-folder-name="inbox" title="Inbox - 0 items"></div>
      </div>
    </section>
    <section data-app-section="NotificationPane"></section>
  </body>
</html>`;

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitFor(predicate, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = predicate();
    if (result) return result;
    await delay(50);
  }
  throw new Error("smoke test timed out");
}

// Register before loading src/main.js so this ready listener runs before the
// app creates its Outlook BrowserWindow. No Microsoft request leaves the host.
app.once("ready", () => {
  protocol.handle(
    "https",
    () =>
      new Response(SYNTHETIC_OUTLOOK, {
        headers: { "content-type": "text/html; charset=utf-8" },
      })
  );
});

require("../src/main");

app
  .whenReady()
  .then(async () => {
    const mainWindow = await waitFor(() =>
      BrowserWindow.getAllWindows().find(
        (window) =>
          window.webContents.getURL().startsWith(
            "https://outlook.cloud.microsoft/"
          )
      )
    );
    await waitFor(
      () => mainWindow.webContents.getTitle() === "Synthetic Outlook"
    );

    const apiKeys = await mainWindow.webContents.executeJavaScript(
      "Object.keys(window.electronAPI || {}).sort()"
    );
    await mainWindow.webContents.executeJavaScript(
      "window.electronAPI.updateUnread(1); window.electronAPI.showNotification({ kind: 'mail', count: 1 });"
    );

    await mainWindow.webContents.executeJavaScript(
      "window.open('about:blank', '_blank'); true"
    );
    const popup = await waitFor(() =>
      BrowserWindow.getAllWindows().find((window) => window !== mainWindow)
    );
    const popupHasApi = await popup.webContents.executeJavaScript(
      "typeof window.electronAPI !== 'undefined'"
    );

    const mainPreferences = mainWindow.webContents.getLastWebPreferences();
    const popupPreferences = popup.webContents.getLastWebPreferences();
    const composeUrl = new URL(mainWindow.webContents.getURL());
    const mailtoCompose =
      composeUrl.pathname === "/mail/deeplink/compose" &&
      composeUrl.searchParams.get("to") === "smoke@example.invalid" &&
      composeUrl.searchParams.get("subject") === "Wayland smoke";
    if (!mailtoCompose) throw new Error("mailto compose route was not loaded");

    const result = {
      apiKeys,
      main: {
        contextIsolation: mainPreferences.contextIsolation,
        nodeIntegration: mainPreferences.nodeIntegration,
        sandbox: mainPreferences.sandbox,
        visible: mainWindow.isVisible(),
      },
      mailtoCompose,
      ozonePlatform: app.commandLine.getSwitchValue("ozone-platform"),
      popup: {
        contextIsolation: popupPreferences.contextIsolation,
        hasPrivilegedApi: popupHasApi,
        nodeIntegration: popupPreferences.nodeIntegration,
        sandbox: popupPreferences.sandbox,
      },
      windowCount: BrowserWindow.getAllWindows().length,
    };

    console.log(`SMOKE_RESULT ${JSON.stringify(result)}`);
    app.exit(0);
  })
  .catch((error) => {
    console.error(`SMOKE_FAILURE ${error.message}`);
    app.exit(1);
  });
