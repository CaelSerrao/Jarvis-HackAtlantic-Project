import json
import shutil
from pathlib import Path


class ToolInstaller:

    def __init__(
        self,
        candidate_path,
        installed_root
    ):
        self.candidate_path = Path(
            candidate_path
        ).resolve()

        self.installed_root = Path(
            installed_root
        ).resolve()

        self.installed_root.mkdir(
            parents=True,
            exist_ok=True
        )


    def load_json(
        self,
        filename
    ):
        path = (
            self.candidate_path
            / filename
        )

        return json.loads(
            path.read_text(
                encoding="utf-8"
            )
        )


    def verify_validation(
        self
    ):
        report = self.load_json(
            "validation_report.json"
        )

        if not report.get(
            "success"
        ):
            raise RuntimeError(
                "Candidate has not passed validation."
            )


    def get_manifest(
        self
    ):
        return self.load_json(
            "manifest.json"
        )


    def install(
        self
    ):
        self.verify_validation()

        manifest = self.get_manifest()

        tool_name = manifest[
            "name"
        ]

        destination = (
            self.installed_root
            / tool_name
        )

        if destination.exists():

            raise RuntimeError(
                f"Tool '{tool_name}' "
                "is already installed."
            )

        destination.mkdir(
            parents=True
        )

        files_to_install = [
            "tool.py",
            "manifest.json",
            "test_tool.py",
            "validation_report.json"
        ]

        for filename in files_to_install:

            source = (
                self.candidate_path
                / filename
            )

            if source.exists():

                shutil.copy2(
                    source,
                    destination / filename
                )

        return {
            "success": True,
            "tool_name": tool_name,
            "installed_path": str(
                destination
            )
        }