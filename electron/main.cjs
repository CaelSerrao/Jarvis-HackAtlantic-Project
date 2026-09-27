const { app, BrowserWindow, dialog } = require("electron");
const path = require("node:path");

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: "Jarvis",
    backgroundColor: "#050b13",
    show: false,
    autoHideMenuBar: true,

    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  window.once("ready-to-show", () => {
    window.show();
  });

  window.webContents.setWindowOpenHandler(() => ({
    action: "deny",
  }));

  window.webContents.on("will-navigate", (event) => {
    event.preventDefault();
  });

  window
    .loadFile(path.join(__dirname, "../dist/index.html"))
    .catch((error) => {
      dialog.showErrorBox(
        "Jarvis could not start",
        error.message
      );

      app.quit();
    });
}

if (require("electron-squirrel-startup")) {
  app.quit();
} else {
  app.whenReady().then(() => {
    app.setAppUserModelId("com.squirrel.Jarvis.Jarvis");

    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}