import os
import platform
import shutil
import subprocess
from difflib import get_close_matches
from pathlib import Path


BLOCKED_APPLICATIONS = {
    "cmd",
    "command prompt",
    "powershell",
    "pwsh",
    "bash",
    "sh",
    "wsl",
    "python",
    "python3"
}


APPLICATION_ALIASES = {
    "google chrome": "chrome",
    "chrome browser": "chrome",
    "microsoft edge": "edge",
    "visual studio code": "vscode",
    "vs code": "vscode"
}


def normalize_app_name(
    name
):
    normalized = (
        name
        .strip()
        .lower()
    )

    return APPLICATION_ALIASES.get(
        normalized,
        normalized
    )


def windows_common_paths():

    program_files = Path(
        os.environ.get(
            "PROGRAMFILES",
            ""
        )
    )

    program_files_x86 = Path(
        os.environ.get(
            "PROGRAMFILES(X86)",
            ""
        )
    )

    local_app_data = Path(
        os.environ.get(
            "LOCALAPPDATA",
            ""
        )
    )

    return {
        "chrome": [
            program_files
            / "Google"
            / "Chrome"
            / "Application"
            / "chrome.exe",

            program_files_x86
            / "Google"
            / "Chrome"
            / "Application"
            / "chrome.exe",

            local_app_data
            / "Google"
            / "Chrome"
            / "Application"
            / "chrome.exe"
        ],

        "edge": [
            program_files_x86
            / "Microsoft"
            / "Edge"
            / "Application"
            / "msedge.exe",

            program_files
            / "Microsoft"
            / "Edge"
            / "Application"
            / "msedge.exe"
        ],

        "vscode": [
            local_app_data
            / "Programs"
            / "Microsoft VS Code"
            / "Code.exe",

            program_files
            / "Microsoft VS Code"
            / "Code.exe"
        ],

        "notepad": [
            Path(
                os.environ.get(
                    "WINDIR",
                    "C:\\Windows"
                )
            )
            / "notepad.exe"
        ]
    }


def find_windows_start_menu_app(
    name
):
    roots = [
        Path(
            os.environ.get(
                "APPDATA",
                ""
            )
        )
        / "Microsoft"
        / "Windows"
        / "Start Menu"
        / "Programs",

        Path(
            os.environ.get(
                "PROGRAMDATA",
                ""
            )
        )
        / "Microsoft"
        / "Windows"
        / "Start Menu"
        / "Programs"
    ]

    shortcuts = {}

    for root in roots:

        if not root.exists():
            continue

        for shortcut in root.rglob(
            "*.lnk"
        ):

            shortcuts[
                shortcut.stem.lower()
            ] = shortcut

    if name in shortcuts:
        return shortcuts[name]

    matches = get_close_matches(
        name,
        shortcuts.keys(),
        n=1,
        cutoff=0.75
    )

    if matches:
        return shortcuts[
            matches[0]
        ]

    return None


def find_windows_application(
    name
):
    normalized = normalize_app_name(
        name
    )

    if normalized in BLOCKED_APPLICATIONS:

        return {
            "success": False,
            "error": (
                "This application is blocked "
                "from the application launcher."
            )
        }

    common = windows_common_paths()

    if normalized in common:

        for path in common[
            normalized
        ]:

            if path.exists():

                return {
                    "success": True,
                    "application": normalized,
                    "target": str(path)
                }

    executable = shutil.which(
        normalized
    )

    if executable:

        return {
            "success": True,
            "application": normalized,
            "target": executable
        }

    shortcut = (
        find_windows_start_menu_app(
            normalized
        )
    )

    if shortcut:

        return {
            "success": True,
            "application": normalized,
            "target": str(shortcut)
        }

    return {
        "success": False,
        "error": (
            f"Could not find application "
            f"'{name}'."
        )
    }


def find_macos_application(
    name
):
    normalized = normalize_app_name(
        name
    )

    if normalized in BLOCKED_APPLICATIONS:

        return {
            "success": False,
            "error": (
                "This application is blocked "
                "from the application launcher."
            )
        }

    aliases = {
        "chrome": "Google Chrome",
        "edge": "Microsoft Edge",
        "vscode": "Visual Studio Code"
    }

    app_name = aliases.get(
        normalized,
        name
    )

    roots = [
        Path("/Applications"),
        Path.home() / "Applications"
    ]

    candidates = {}

    for root in roots:

        if not root.exists():
            continue

        for app in root.glob(
            "*.app"
        ):

            candidates[
                app.stem.lower()
            ] = app

    exact = app_name.lower()

    if exact in candidates:

        return {
            "success": True,
            "application": app_name,
            "target": str(
                candidates[exact]
            )
        }

    matches = get_close_matches(
        exact,
        candidates.keys(),
        n=1,
        cutoff=0.75
    )

    if matches:

        return {
            "success": True,
            "application": app_name,
            "target": str(
                candidates[
                    matches[0]
                ]
            )
        }

    return {
        "success": False,
        "error": (
            f"Could not find application "
            f"'{name}'."
        )
    }


def register_application_primitives(
    registry
):

    def find_application(
        arguments,
        context
    ):
        name = arguments[
            "name"
        ]

        system = platform.system()

        if system == "Windows":

            return (
                find_windows_application(
                    name
                )
            )

        if system == "Darwin":

            return (
                find_macos_application(
                    name
                )
            )

        return {
            "success": False,
            "error": (
                "Application discovery is not "
                "supported on this OS yet."
            )
        }


    def launch_application(
        arguments,
        context
    ):
        result = find_application(
            arguments,
            context
        )

        if not result.get(
            "success"
        ):
            return result

        target = result[
            "target"
        ]

        system = platform.system()

        if system == "Windows":

            os.startfile(
                target
            )

        elif system == "Darwin":

            subprocess.Popen([
                "open",
                target
            ])

        else:

            return {
                "success": False,
                "error": (
                    "Application launching is not "
                    "supported on this OS yet."
                )
            }

        return {
            "success": True,
            "application":
                result["application"],
            "target": target
        }


    registry.register(
        name="applications.find",

        description=(
            "Find an installed graphical application "
            "on the user's current computer."
        ),

        permissions=[
            "applications.discover"
        ],

        parameters={
            "type": "object",

            "properties": {
                "name": {
                    "type": "string"
                }
            },

            "required": [
                "name"
            ],

            "additionalProperties": False
        },

        handler=find_application
    )


    registry.register(
        name="applications.launch",

        description=(
            "Find and launch an installed graphical "
            "application such as Chrome, Edge, "
            "Visual Studio Code, or another "
            "installed desktop app. This does not "
            "provide arbitrary shell execution."
        ),

        permissions=[
            "applications.launch"
        ],

        parameters={
            "type": "object",

            "properties": {
                "name": {
                    "type": "string"
                }
            },

            "required": [
                "name"
            ],

            "additionalProperties": False
        },

        handler=launch_application
    )