const STORAGE_KEY = "jarvis_app_settings";

export const DEFAULT_SETTINGS = {
  appearance: {
    theme: "Dark",
  },
  ai: {
    inferenceMode: "Automatic",
    remoteFallback: true,
    activeModel: "phi-3-mini-4k-instruct-q4",
  },
  memory: {
    memoryEnabled: true,
    saveHistory: true,
    rememberPreferences: true,
    learnWorkflows: true,
  },
  tools: {
    toolsEnabled: true,
    toolGeneration: true,
    sandboxTools: true,
    toolApproval: "Always Ask",
  },
  system: {
    notifications: true,
    launchOnStartup: false,
    runInBackground: false,
  },
};

function mergeSettings(value = {}) {
  return {
    appearance: {
      ...DEFAULT_SETTINGS.appearance,
      ...(value.appearance || {}),
    },
    ai: {
      ...DEFAULT_SETTINGS.ai,
      ...(value.ai || {}),
    },
    memory: {
      ...DEFAULT_SETTINGS.memory,
      ...(value.memory || {}),
    },
    tools: {
      ...DEFAULT_SETTINGS.tools,
      ...(value.tools || {}),
    },
    system: {
      ...DEFAULT_SETTINGS.system,
      ...(value.system || {}),
    },
  };
}

export function getSettings() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return mergeSettings();
  }

  try {
    return mergeSettings(JSON.parse(stored));
  } catch {
    return mergeSettings();
  }
}

export function resolveTheme(theme) {
  if (theme === "System") {
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "Light"
      : "Dark";
  }

  return theme === "Light" ? "Light" : "Dark";
}

export function applyTheme(settings = getSettings()) {
  const resolved = resolveTheme(settings.appearance.theme);
  document.documentElement.dataset.jarvisTheme = resolved.toLowerCase();
  document.documentElement.style.colorScheme = resolved.toLowerCase();
  return resolved;
}

export function saveSettings(nextSettings) {
  const value = mergeSettings(nextSettings);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(value)
  );

  applyTheme(value);

  window.dispatchEvent(
    new CustomEvent("jarvis-settings-changed", {
      detail: value,
    })
  );

  return value;
}

export async function saveDesktopSettings(settings) {
  if (!window.jarvisDesktop?.setSystemSettings) {
    return {
      supported: false,
    };
  }

  return window.jarvisDesktop.setSystemSettings({
    launchOnStartup: Boolean(settings.system.launchOnStartup),
    runInBackground: Boolean(settings.system.runInBackground),
  });
}

export async function hydrateDesktopSettings(settings) {
  if (!window.jarvisDesktop?.getSystemSettings) {
    return settings;
  }

  try {
    const desktop = await window.jarvisDesktop.getSystemSettings();

    return mergeSettings({
      ...settings,
      system: {
        ...settings.system,
        launchOnStartup: Boolean(desktop.launchOnStartup),
        runInBackground: Boolean(desktop.runInBackground),
      },
    });
  } catch {
    return settings;
  }
}

export function getRuntimeSettings() {
  const settings = getSettings();

  return {
    ai: settings.ai,
    memory: settings.memory,
    tools: settings.tools,
  };
}
