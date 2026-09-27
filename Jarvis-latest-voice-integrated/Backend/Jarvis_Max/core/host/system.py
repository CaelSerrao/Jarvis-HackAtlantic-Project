import platform
from pathlib import Path

from core.path_resolver import (
    resolve_user_path
)


def register_system_primitives(
    registry
):

    def resolve_path(
        arguments,
        context
    ):
        value = arguments[
            "path"
        ]

        resolved = resolve_user_path(
            value
        )

        return {
            "success": True,
            "input": value,
            "resolved_path":
                resolved
        }


    def get_system_info(
        arguments,
        context
    ):
        return {
            "success": True,
            "os": platform.system(),
            "os_version":
                platform.version(),
            "architecture":
                platform.machine(),
            "hostname":
                platform.node()
        }


    def get_working_directory(
        arguments,
        context
    ):
        return {
            "success": True,
            "path": str(
                Path.cwd().resolve()
            )
        }


    registry.register(
        name="system.resolve_path",

        description=(
            "Resolve a user-friendly location such "
            "as desktop, downloads, or documents "
            "into an absolute local filesystem path."
        ),

        permissions=[],

        parameters={
            "type": "object",

            "properties": {
                "path": {
                    "type": "string"
                }
            },

            "required": [
                "path"
            ],

            "additionalProperties": False
        },

        handler=resolve_path
    )


    registry.register(
        name="system.get_info",

        description=(
            "Get basic information about "
            "the current host system."
        ),

        permissions=[],

        parameters={
            "type": "object",
            "properties": {},
            "additionalProperties": False
        },

        handler=get_system_info
    )


    registry.register(
        name="system.get_working_directory",

        description=(
            "Get Jarvis's current working directory."
        ),

        permissions=[],

        parameters={
            "type": "object",
            "properties": {},
            "additionalProperties": False
        },

        handler=get_working_directory
    )