import importlib.util
import json
from pathlib import Path

from core.path_resolver import resolve_user_path


KNOWN_LOCATION_PREFIXES = {
    "desktop",
    "downloads",
    "documents",
    "pictures",
    "music",
    "videos",
    "home"
}


class GeneratedToolLoader:

    def __init__(
        self,
        installed_root
    ):
        self.installed_root = Path(
            installed_root
        ).resolve()


    def load_function(
        self,
        tool_path,
        function_name,
        module_name
    ):
        spec = (
            importlib.util.spec_from_file_location(
                module_name,
                tool_path
            )
        )

        if (
            spec is None
            or spec.loader is None
        ):
            raise RuntimeError(
                "Could not load generated tool."
            )

        module = (
            importlib.util.module_from_spec(
                spec
            )
        )

        spec.loader.exec_module(
            module
        )

        function = getattr(
            module,
            function_name,
            None
        )

        if function is None:
            raise RuntimeError(
                f"Function "
                f"'{function_name}' "
                f"was not found."
            )

        return function


    def is_known_location_path(
        self,
        value
    ):
        if not isinstance(
            value,
            str
        ):
            return False

        normalized = (
            value
            .replace("\\", "/")
            .strip("/")
        )

        if not normalized:
            return False

        first_part = (
            normalized
            .split("/")[0]
            .lower()
            .strip()
        )

        return (
            first_part
            in KNOWN_LOCATION_PREFIXES
        )


    def normalize_directory_paths(
        self,
        normalized
    ):
        """
        Handles model outputs such as:

        {
            "directory_paths": "Desktop/Homework"
        }

        when parent_path was not supplied.
        """

        if "directory_paths" not in normalized:
            return normalized

        # If the model already gave us a parent_path,
        # leave directory_paths relative to that parent.
        if normalized.get(
            "parent_path"
        ):
            return normalized

        directory_paths = normalized[
            "directory_paths"
        ]

        if isinstance(
            directory_paths,
            str
        ):

            if self.is_known_location_path(
                directory_paths
            ):
                normalized[
                    "directory_paths"
                ] = resolve_user_path(
                    directory_paths
                )

        elif isinstance(
            directory_paths,
            list
        ):

            converted = []

            for item in directory_paths:

                if self.is_known_location_path(
                    item
                ):
                    converted.append(
                        resolve_user_path(
                            item
                        )
                    )

                else:
                    converted.append(
                        item
                    )

            normalized[
                "directory_paths"
            ] = converted

        return normalized


    def normalize_arguments(
        self,
        arguments,
        manifest
    ):
        normalized = dict(
            arguments
        )

        path_parameters = manifest.get(
            "path_parameters",
            []
        )

        for parameter_name in path_parameters:

            if parameter_name not in normalized:
                continue

            value = normalized[
                parameter_name
            ]

            if value is None:
                continue

            if isinstance(
                value,
                str
            ):
                normalized[
                    parameter_name
                ] = resolve_user_path(
                    value
                )

            elif isinstance(
                value,
                list
            ):
                normalized[
                    parameter_name
                ] = [
                    resolve_user_path(
                        item
                    )
                    for item in value
                ]

        # Handle combined paths such as
        # "Desktop/Homework".
        normalized = (
            self.normalize_directory_paths(
                normalized
            )
        )

        return normalized


    def load_into_registry(
        self,
        registry
    ):
        if not self.installed_root.exists():
            return []

        loaded = []

        for directory in (
            self.installed_root.iterdir()
        ):

            if not directory.is_dir():
                continue

            manifest_path = (
                directory
                / "manifest.json"
            )

            tool_path = (
                directory
                / "tool.py"
            )

            if (
                not manifest_path.exists()
                or not tool_path.exists()
            ):
                continue

            try:
                manifest = json.loads(
                    manifest_path.read_text(
                        encoding="utf-8"
                    )
                )

                tool_name = manifest[
                    "name"
                ]

                function_name = manifest[
                    "function_name"
                ]

                function = self.load_function(
                    tool_path,
                    function_name,
                    (
                        "jarvis_generated_"
                        + tool_name
                    )
                )

                def make_handler(
                    generated_function,
                    tool_manifest,
                    generated_tool_name
                ):

                    def handler(
                        arguments,
                        context
                    ):
                        print()
                        print(
                            f"[Generated Tool: "
                            f"{generated_tool_name}]"
                        )

                        print(
                            "Raw arguments:"
                        )

                        print(
                            json.dumps(
                                arguments,
                                indent=2
                            )
                        )

                        normalized_arguments = (
                            self.normalize_arguments(
                                arguments,
                                tool_manifest
                            )
                        )

                        print(
                            "Normalized arguments:"
                        )

                        print(
                            json.dumps(
                                normalized_arguments,
                                indent=2
                            )
                        )

                        print()

                        return (
                            generated_function(
                                **normalized_arguments
                            )
                        )

                    return handler

                registry.register(
                    name=tool_name,

                    description=manifest[
                        "description"
                    ],

                    parameters=manifest.get(
                        "parameters",
                        {
                            "type": "object",
                            "properties": {},
                            "additionalProperties":
                                True
                        }
                    ),

                    handler=make_handler(
                        function,
                        manifest,
                        tool_name
                    )
                )

                loaded.append(
                    tool_name
                )

            except Exception as error:
                print(
                    f"Failed to load "
                    f"{directory.name}: "
                    f"{error}"
                )

        return loaded