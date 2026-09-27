import json
from pathlib import Path

from agent_runtime.tool_installer import (
    ToolInstaller
)


BASE_DIR = Path(
    __file__
).resolve().parent


def find_latest_valid_candidate():

    pending_dir = (
        BASE_DIR
        / "generated_tools"
        / "pending"
    )

    if not pending_dir.exists():
        return None

    candidates = [
        path
        for path in pending_dir.iterdir()
        if path.is_dir()
    ]

    candidates.sort(
        key=lambda path:
            path.stat().st_mtime,
        reverse=True
    )

    for candidate in candidates:

        report_path = (
            candidate
            / "validation_report.json"
        )

        if not report_path.exists():
            continue

        try:

            report = json.loads(
                report_path.read_text(
                    encoding="utf-8"
                )
            )

        except Exception:
            continue

        if report.get(
            "success"
        ):
            return candidate

    return None


def main():

    candidate = (
        find_latest_valid_candidate()
    )

    if not candidate:

        print(
            "No validated candidate found."
        )

        return

    manifest_path = (
        candidate
        / "manifest.json"
    )

    manifest = json.loads(
        manifest_path.read_text(
            encoding="utf-8"
        )
    )

    print()
    print("TOOL READY FOR INSTALLATION")
    print("-" * 50)

    print(
        f"Name: "
        f"{manifest['name']}"
    )

    print(
        f"Description: "
        f"{manifest['description']}"
    )

    print(
        f"Function: "
        f"{manifest['function_name']}"
    )

    print(
        f"Risk: "
        f"{manifest['risk_level']}"
    )

    print(
        "Permissions:"
    )

    for permission in (
        manifest["permissions"]
    ):
        print(
            f"  - {permission}"
        )

    print()

    answer = input(
        "Install this tool? [y/N]: "
    ).strip().lower()

    if answer != "y":

        print(
            "Installation cancelled."
        )

        return

    installed_root = (
        BASE_DIR
        / "generated_tools"
        / "installed"
    )

    installer = ToolInstaller(
        candidate_path=candidate,
        installed_root=installed_root
    )

    result = installer.install()

    print()
    print("INSTALLATION COMPLETE")
    print("-" * 50)

    print(
        f"Tool: "
        f"{result['tool_name']}"
    )

    print(
        f"Path: "
        f"{result['installed_path']}"
    )


if __name__ == "__main__":
    main()