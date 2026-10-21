const { contextBridge, ipcRenderer } = require("electron");

/**
 * Preload script for the About window
 * Exposes safe APIs to the renderer process
 */
contextBridge.exposeInMainWorld("electronAPI", {
  openExternal: (target) => {
    ipcRenderer.send("open-about-link", target);
  },
  closeWindow: () => {
    ipcRenderer.send("close-about-window");
  },
});
