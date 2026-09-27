const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jarvisDesktop", {
  getSystemSettings: () => ipcRenderer.invoke("jarvis:get-system-settings"),
  setSystemSettings: (settings) =>
    ipcRenderer.invoke("jarvis:set-system-settings", settings),
});
