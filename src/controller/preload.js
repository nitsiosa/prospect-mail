const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  updateUnread: (unread) => ipcRenderer.send("updateUnread", unread),
  showWindow: () => ipcRenderer.send("show"),
  showNotification: (request) =>
    ipcRenderer.send("show-notification", request),
  reportLoginRequired: (reason) =>
    ipcRenderer.send("report-login-required", reason),
});
