module.exports = {
  packagerConfig: {
    name: "Jarvis",
    executableName: "Jarvis",
    asar: true,

    // Include the Python backend source next to the packaged app.
    // The current prototype still expects Python to be installed on the host.
    extraResource: ["../Backend"],

    ignore: [
      /^\/src(?:\/|$)/,
      /^\/\.git(?:\/|$)/,
      /^\/\.env(?:\.|$)/,
      /^\/out(?:\/|$)/,
    ],
  },

  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      platforms: ["win32"],

      config: {
        name: "Jarvis",
        authors: "Jarvis Team",
        description: "Jarvis personal intelligence desktop app",
        setupExe: "JarvisSetup.exe",
      },
    },
  ],
};