const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
} = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const API_HOST = "127.0.0.1";
const API_PORT = 8765;

let backendProcess = null;
let backendStartedByElectron = false;
let mainWindow = null;
let isQuitting = false;
let runInBackground = false;

function getDesktopSettingsPath() {
  return path.join(app.getPath("userData"), "desktop-settings.json");
}

function loadDesktopSettings() {
  try {
    const settingsPath = getDesktopSettingsPath();

    if (!fs.existsSync(settingsPath)) {
      return;
    }

    const stored = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    runInBackground = Boolean(stored.runInBackground);
  } catch (error) {
    console.error("[Jarvis] Could not load desktop settings:", error);
  }
}

function saveDesktopSettings() {
  try {
    fs.writeFileSync(
      getDesktopSettingsPath(),
      JSON.stringify({ runInBackground }, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error("[Jarvis] Could not save desktop settings:", error);
  }
}

function getBackendDirectory() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "Backend", "Jarvis_Max");
  }

  return path.resolve(__dirname, "../../Backend/Jarvis_Max");
}

function getPythonCommand(backendDirectory) {
  const candidates = process.platform === "win32"
    ? [
        path.join(backendDirectory, "venv", "Scripts", "python.exe"),
        path.join(backendDirectory, ".venv", "Scripts", "python.exe"),
      ]
    : [
        path.join(backendDirectory, "venv", "bin", "python"),
        path.join(backendDirectory, ".venv", "bin", "python"),
      ];

  const localPython = candidates.find((candidate) => fs.existsSync(candidate));

  if (localPython) {
    return localPython;
  }

  return process.platform === "win32" ? "python" : "python3";
}

function backendIsReady() {
  return new Promise((resolve) => {
    const request = http.get(
      {
        hostname: API_HOST,
        port: API_PORT,
        path: "/health",
        timeout: 900,
      },
      (response) => {
        response.resume();
        resolve(response.statusCode === 200);
      }
    );

    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });

    request.on("error", () => resolve(false));
  });
}

async function waitForBackend(timeoutMs = 45000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await backendIsReady()) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  return false;
}

async function startBackend() {
  if (await backendIsReady()) {
    console.log("[Jarvis] Backend already running on port 8765.");
    return;
  }

  const backendDirectory = getBackendDirectory();

  if (!fs.existsSync(backendDirectory)) {
    throw new Error(`Jarvis backend directory was not found:\n${backendDirectory}`);
  }

  const pythonCommand = getPythonCommand(backendDirectory);

  console.log(`[Jarvis] Starting backend with ${pythonCommand}`);
  console.log(`[Jarvis] Backend directory: ${backendDirectory}`);

  backendProcess = spawn(
    pythonCommand,
    [
      "-m",
      "uvicorn",
      "api.server:app",
      "--host",
      API_HOST,
      "--port",
      String(API_PORT),
    ],
    {
      cwd: backendDirectory,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  backendStartedByElectron = true;

  backendProcess.stdout.on("data", (data) => {
    process.stdout.write(`[Jarvis Backend] ${data}`);
  });

  backendProcess.stderr.on("data", (data) => {
    process.stderr.write(`[Jarvis Backend] ${data}`);
  });

  backendProcess.on("error", (error) => {
    console.error("[Jarvis] Backend process error:", error);
  });

  backendProcess.on("exit", (code, signal) => {
    console.log(
      `[Jarvis] Backend stopped (code=${code}, signal=${signal || "none"}).`
    );
    backendProcess = null;
  });

  const ready = await waitForBackend();

  if (!ready) {
    throw new Error(
      "The Jarvis backend did not become ready in time.\n\n" +
        "Make sure the Python dependencies are installed and the local LLM server is available."
    );
  }
}

function stopBackend() {
  if (!backendProcess || !backendStartedByElectron) {
    return;
  }

  try {
    backendProcess.kill();
  } catch (error) {
    console.error("[Jarvis] Could not stop backend:", error);
  }

  backendProcess = null;
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: "Jarvis",
    backgroundColor: "#050b13",
    show: false,
    autoHideMenuBar: true,

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("close", (event) => {
    if (runInBackground && !isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({
    action: "deny",
  }));

  mainWindow.webContents.on("will-navigate", (event) => {
    event.preventDefault();
  });

  mainWindow
    .loadFile(path.join(__dirname, "../dist/index.html"))
    .catch((error) => {
      dialog.showErrorBox("Jarvis could not start", error.message);
      app.quit();
    });
}

ipcMain.handle("jarvis:get-system-settings", () => {
  const loginSettings = app.getLoginItemSettings();

  return {
    launchOnStartup: Boolean(loginSettings.openAtLogin),
    runInBackground,
  };
});

ipcMain.handle("jarvis:set-system-settings", (_event, settings = {}) => {
  const launchOnStartup = Boolean(settings.launchOnStartup);
  runInBackground = Boolean(settings.runInBackground);

  app.setLoginItemSettings({
    openAtLogin: launchOnStartup,
  });

  saveDesktopSettings();

  return {
    launchOnStartup: Boolean(app.getLoginItemSettings().openAtLogin),
    runInBackground,
  };
});

if (require("electron-squirrel-startup")) {
  app.quit();
} else {
  const gotSingleInstanceLock = app.requestSingleInstanceLock();

  if (!gotSingleInstanceLock) {
    app.quit();
  } else {
    app.on("second-instance", () => {
      showMainWindow();
    });

    app.whenReady().then(async () => {
      app.setAppUserModelId("com.squirrel.Jarvis.Jarvis");
      loadDesktopSettings();

      try {
        await startBackend();
        createWindow();
      } catch (error) {
        dialog.showErrorBox("Jarvis backend could not start", error.message);
        app.quit();
        return;
      }

      app.on("activate", () => {
        showMainWindow();
      });
    });

    app.on("before-quit", () => {
      isQuitting = true;
      stopBackend();
    });

    app.on("window-all-closed", () => {
      if (!runInBackground) {
        stopBackend();
        app.quit();
      }
    });
  }
}
