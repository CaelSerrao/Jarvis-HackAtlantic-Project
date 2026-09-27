// Backend handoff:
//
// Replace this adapter, not the page components.
//
// All methods return promises.
// load() returns the complete snapshot shown below.
// subscribe(callback) signals changed data and returns an unsubscribe function.
//
// A real adapter can signal changes using WebSocket events, SSE, or polling.
//
// Authentication belongs to the host app.
// This demo does not authenticate users.

const seed = {
  status: "Demo mode",

  profile: {
    name: "Ryan",
    username: "ryan",
    email: "ryan@example.com",
  },

  settings: {
    model: "Phi-3 Mini",
    inference: "Automatic",
    remoteFallback: true,

    memoryEnabled: true,
    saveHistory: true,
    rememberPreferences: true,
    learnWorkflows: true,

    toolsEnabled: true,
    toolGeneration: true,
    sandboxTools: true,
    toolApproval: "Always ask",

    ttsEnabled: true,
    voice: "",
    microphone: "",
    speechRate: 1,
    speechVolume: 1,

    notifications: true,
    launchOnStartup: false,
    runInBackground: true,
  },

  automations: [
    {
      id: "a1",
      name: "Morning Briefing",
      description: "Prepare a summary for the day.",
      frequency: "Daily",
      time: "08:00",
      enabled: true,
    },
    {
      id: "a2",
      name: "Organize Downloads",
      description: "Sort downloaded files into folders.",
      frequency: "Friday",
      time: "18:00",
      enabled: true,
    },
    {
      id: "a3",
      name: "Project Backup",
      description: "Prepare selected project files for backup.",
      frequency: "Sunday",
      time: "21:00",
      enabled: false,
    },
  ],

  memories: [
    {
      id: "m1",
      title: "Development environment",
      content: "Prefers VS Code for programming projects.",
      category: "Preferences",
      pinned: true,
    },
    {
      id: "m2",
      title: "Current project",
      content: "Working on the Jarvis HackAtlantic project.",
      category: "Projects",
      pinned: true,
    },
    {
      id: "m3",
      title: "Morning workflow",
      content: "Checks upcoming tasks before development work.",
      category: "Workflows",
      pinned: false,
    },
    {
      id: "m4",
      title: "AI preference",
      content: "Prefers local AI when hardware allows.",
      category: "Preferences",
      pinned: false,
    },
    {
      id: "m5",
      title: "Primary device",
      content: "Uses a Windows computer.",
      category: "Devices",
      pinned: false,
    },
  ],

  tools: [
    {
      id: "t1",
      name: "Open Application",
      description: "Launch an installed application.",
      category: "System",
      enabled: true,
      generated: false,
    },
    {
      id: "t2",
      name: "Search Files",
      description: "Find local files and folders.",
      category: "Files",
      enabled: true,
      generated: false,
    },
    {
      id: "t3",
      name: "Create Directory",
      description: "Create a folder at a chosen location.",
      category: "Files",
      enabled: true,
      generated: true,
    },
    {
      id: "t4",
      name: "Web Research",
      description: "Gather information from online sources.",
      category: "Web",
      enabled: true,
      generated: false,
    },
    {
      id: "t5",
      name: "Take Screenshot",
      description: "Capture a screen for analysis.",
      category: "System",
      enabled: true,
      generated: false,
    },
    {
      id: "t6",
      name: "Organize Downloads",
      description: "Sort downloaded files into folders.",
      category: "Files",
      enabled: false,
      generated: true,
    },
  ],

  files: [
    {
      id: "f1",
      name: "Jarvis Architecture.pdf",
      type: "PDF",
      size: "4.2 MB",
      location: "Documents / Jarvis",
    },
    {
      id: "f2",
      name: "Hackathon Notes.txt",
      type: "Text",
      size: "24 KB",
      location: "Documents",
    },
    {
      id: "f3",
      name: "Presentation.pptx",
      type: "Presentation",
      size: "12.8 MB",
      location: "Documents / Hackathon",
    },
    {
      id: "f4",
      name: "Research.docx",
      type: "Document",
      size: "1.3 MB",
      location: "Documents",
    },
    {
      id: "f5",
      name: "jarvis-ui.png",
      type: "Image",
      size: "2.8 MB",
      location: "Pictures",
    },
  ],

  activity: [],
};

export function createDemoService() {
  let state = structuredClone(seed);

  const listeners = new Set();
  const collections = ["automations", "memories", "tools", "files"];

  function emit() {
    listeners.forEach((listener) => listener());
  }

  function collection(name) {
    if (!collections.includes(name)) {
      throw new Error("Unknown collection.");
    }

    return state[name];
  }

  return {
    async load() {
      return structuredClone(state);
    },

    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    async updateSettings(patch) {
      state.settings = {
        ...state.settings,
        ...patch,
      };

      emit();
    },

    async updateProfile(patch) {
      state.profile = {
        ...state.profile,
        ...patch,
      };

      emit();
    },

    async save(name, item) {
      const rows = collection(name);

      const value = {
        ...item,
        id: item.id || crypto.randomUUID(),
      };

      state[name] = item.id
        ? rows.map((row) => (row.id === item.id ? value : row))
        : [value, ...rows];

      emit();
    },

    async remove(name, id) {
      state[name] = collection(name).filter((row) => row.id !== id);

      emit();
    },

    async clearMemory() {
      state.memories = [];

      emit();
    },

    async importFiles(files) {
      // Metadata only.
      // File contents are not read, retained, or uploaded.

      const additions = files.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,

        type: file.type.startsWith("image/")
          ? "Image"
          : file.name.split(".").pop().toUpperCase(),

        size:
          file.size < 1048576
            ? `${(file.size / 1024).toFixed(1)} KB`
            : `${(file.size / 1048576).toFixed(1)} MB`,

        location: "Imported metadata",
      }));

      state.files = [...additions, ...state.files];

      emit();
    },

    async preview(name, id, action = "Preview") {
      const row = collection(name).find((item) => item.id === id);

      if (!row) {
        throw new Error("This item is no longer available.");
      }

      if (row.enabled === false) {
        throw new Error("Enable this item first.");
      }

      const message =
        `${action}: ${row.name || row.title}. ` +
        "Demo only; nothing was executed or read.";

      state.activity = [message, ...state.activity].slice(0, 8);

      emit();

      return message;
    },
  };
}

export const demoService = createDemoService();