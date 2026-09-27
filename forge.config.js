module.exports = {
  packagerConfig: {
    name: "Jarvis",
    executableName: "Jarvis",
    asar: true,

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