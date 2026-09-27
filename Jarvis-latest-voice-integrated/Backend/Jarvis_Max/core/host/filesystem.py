import shutil
from pathlib import Path

from core.path_resolver import (
    resolve_user_path
)


def register_filesystem_primitives(
    registry
):

    def create_directory(
        arguments,
        context
    ):
        path = Path(
            resolve_user_path(
                arguments["path"]
            )
        )

        parents = arguments.get(
            "parents",
            True
        )

        path.mkdir(
            parents=parents,
            exist_ok=True
        )

        return {
            "success": True,
            "path": str(path)
        }


    def write_text_file(
        arguments,
        context
    ):
        path = Path(
            resolve_user_path(
                arguments["path"]
            )
        )

        content = arguments[
            "content"
        ]

        overwrite = arguments.get(
            "overwrite",
            False
        )

        create_parent = arguments.get(
            "create_parent",
            True
        )

        if (
            path.exists()
            and not overwrite
        ):
            return {
                "success": False,
                "error": (
                    "File already exists and "
                    "overwrite was not permitted."
                ),
                "path": str(path)
            }

        if create_parent:
            path.parent.mkdir(
                parents=True,
                exist_ok=True
            )

        path.write_text(
            content,
            encoding="utf-8"
        )

        return {
            "success": True,
            "path": str(path)
        }


    def read_text_file(
        arguments,
        context
    ):
        path = Path(
            resolve_user_path(
                arguments["path"]
            )
        )

        if not path.exists():
            return {
                "success": False,
                "error": "File does not exist."
            }

        if not path.is_file():
            return {
                "success": False,
                "error": "Path is not a file."
            }

        max_chars = arguments.get(
            "max_chars",
            100000
        )

        content = path.read_text(
            encoding="utf-8"
        )

        return {
            "success": True,
            "path": str(path),
            "content": content[
                :max_chars
            ]
        }


    def list_directory(
        arguments,
        context
    ):
        path = Path(
            resolve_user_path(
                arguments["path"]
            )
        )

        if not path.exists():

            return {
                "success": False,
                "error": (
                    "Directory does not exist."
                )
            }

        if not path.is_dir():

            return {
                "success": False,
                "error": (
                    "Path is not a directory."
                )
            }

        items = []

        for item in path.iterdir():

            items.append({
                "name": item.name,
                "path": str(item),
                "type": (
                    "directory"
                    if item.is_dir()
                    else "file"
                )
            })

        return {
            "success": True,
            "path": str(path),
            "items": items
        }


    def move_path(
        arguments,
        context
    ):
        source = Path(
            resolve_user_path(
                arguments["source"]
            )
        )

        destination = Path(
            resolve_user_path(
                arguments["destination"]
            )
        )

        overwrite = arguments.get(
            "overwrite",
            False
        )

        if not source.exists():

            return {
                "success": False,
                "error": (
                    "Source does not exist."
                )
            }

        if (
            destination.exists()
            and not overwrite
        ):

            return {
                "success": False,
                "error": (
                    "Destination already exists."
                )
            }

        destination.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        shutil.move(
            str(source),
            str(destination)
        )

        return {
            "success": True,
            "source": str(source),
            "destination":
                str(destination)
        }


    registry.register(
        name="filesystem.create_directory",

        description=(
            "Create a directory or folder "
            "at a user-specified location."
        ),

        permissions=[
            "filesystem.write"
        ],

        parameters={
            "type": "object",

            "properties": {
                "path": {
                    "type": "string"
                },

                "parents": {
                    "type": "boolean"
                }
            },

            "required": [
                "path"
            ],

            "additionalProperties": False
        },

        handler=create_directory
    )


    registry.register(
        name="filesystem.write_text_file",

        description=(
            "Create or write a UTF-8 text file. "
            "Use for plain text files, source files, "
            "configuration files, notes, and similar "
            "text content."
        ),

        permissions=[
            "filesystem.write"
        ],

        parameters={
            "type": "object",

            "properties": {
                "path": {
                    "type": "string"
                },

                "content": {
                    "type": "string"
                },

                "overwrite": {
                    "type": "boolean"
                },

                "create_parent": {
                    "type": "boolean"
                }
            },

            "required": [
                "path",
                "content"
            ],

            "additionalProperties": False
        },

        handler=write_text_file
    )


    registry.register(
        name="filesystem.read_text_file",

        description=(
            "Read text from a file."
        ),

        permissions=[
            "filesystem.read"
        ],

        parameters={
            "type": "object",

            "properties": {
                "path": {
                    "type": "string"
                },

                "max_chars": {
                    "type": "integer"
                }
            },

            "required": [
                "path"
            ],

            "additionalProperties": False
        },

        handler=read_text_file
    )


    registry.register(
        name="filesystem.list_directory",

        description=(
            "List files and directories "
            "inside a directory."
        ),

        permissions=[
            "filesystem.read"
        ],

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

        handler=list_directory
    )


    registry.register(
        name="filesystem.move",

        description=(
            "Move or rename a file or directory."
        ),

        permissions=[
            "filesystem.read",
            "filesystem.write"
        ],

        parameters={
            "type": "object",

            "properties": {
                "source": {
                    "type": "string"
                },

                "destination": {
                    "type": "string"
                },

                "overwrite": {
                    "type": "boolean"
                }
            },

            "required": [
                "source",
                "destination"
            ],

            "additionalProperties": False
        },

        handler=move_path
    )