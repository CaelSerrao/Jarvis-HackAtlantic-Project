import ast
import subprocess
import sys
from pathlib import Path

from agent_runtime.tool_registry import (
    AgentToolRegistry
)


class Workspace:

    def __init__(
        self,
        path
    ):
        self.root = Path(
            path
        ).resolve()

        self.root.mkdir(
            parents=True,
            exist_ok=True
        )


    def resolve(
        self,
        relative_path
    ):
        path = (
            self.root
            / relative_path
        ).resolve()

        if (
            self.root != path
            and self.root not in path.parents
        ):
            raise ValueError(
                "Path escapes agent workspace."
            )

        return path


def build_workspace_tools(
    workspace_path,
    writable_files=None,
    allow_test_execution=False
):

    workspace = Workspace(
        workspace_path
    )

    registry = AgentToolRegistry()


    if writable_files is not None:

        writable_files = {
            Path(path).as_posix()
            for path in writable_files
        }


    # ==================================================
    # WRITE FILE
    # ==================================================

    def write_file(
        arguments
    ):

        requested_path = arguments[
            "path"
        ]

        path = workspace.resolve(
            requested_path
        )

        relative_path = (
            path
            .relative_to(
                workspace.root
            )
            .as_posix()
        )


        if (
            writable_files is not None
            and relative_path
            not in writable_files
        ):

            return {
                "success": False,

                "error": (
                    f"Writing '{relative_path}' "
                    "is not permitted."
                )
            }


        path.parent.mkdir(
            parents=True,
            exist_ok=True
        )


        path.write_text(
            arguments[
                "content"
            ],
            encoding="utf-8"
        )


        return {
            "success": True,
            "path": str(
                path
            )
        }


    # ==================================================
    # READ FILE
    # ==================================================

    def read_file(
        arguments
    ):

        path = workspace.resolve(
            arguments[
                "path"
            ]
        )


        if not path.exists():

            return {
                "success": False,
                "error": (
                    "File does not exist."
                )
            }


        if not path.is_file():

            return {
                "success": False,
                "error": (
                    "Path is not a file."
                )
            }


        return {
            "success": True,

            "content":
                path.read_text(
                    encoding="utf-8"
                )
        }


    # ==================================================
    # LIST FILES
    # ==================================================

    def list_files(
        arguments
    ):

        files = []


        for path in (
            workspace.root.rglob(
                "*"
            )
        ):

            if path.is_file():

                files.append(
                    path
                    .relative_to(
                        workspace.root
                    )
                    .as_posix()
                )


        return {
            "success": True,
            "files": files
        }


    # ==================================================
    # VALIDATE PYTHON
    # ==================================================

    def validate_python(
        arguments
    ):

        path = workspace.resolve(
            arguments[
                "path"
            ]
        )


        if not path.exists():

            return {
                "success": False,
                "error": (
                    "File does not exist."
                )
            }


        if not path.is_file():

            return {
                "success": False,
                "error": (
                    "Path is not a file."
                )
            }


        source = path.read_text(
            encoding="utf-8"
        )


        try:

            ast.parse(
                source
            )


        except SyntaxError as error:

            return {
                "success": False,

                "error":
                    str(
                        error
                    ),

                "line":
                    error.lineno
            }


        return {
            "success": True,
            "valid_python": True
        }


    # ==================================================
    # RUN CANDIDATE TESTS
    #
    # IMPORTANT:
    # This exists as an optional internal developer
    # utility, but it is NOT exposed to agents unless
    # allow_test_execution=True.
    # ==================================================

    def run_candidate_tests(
        arguments
    ):

        requested_path = arguments.get(
            "path",
            "test_tool.py"
        )

        timeout = arguments.get(
            "timeout",
            15
        )


        try:

            timeout = int(
                timeout
            )

        except (
            TypeError,
            ValueError
        ):

            return {
                "success": False,
                "error": (
                    "Timeout must be an integer."
                )
            }


        timeout = max(
            1,
            min(
                timeout,
                30
            )
        )


        try:

            test_path = (
                workspace.resolve(
                    requested_path
                )
            )

        except Exception as error:

            return {
                "success": False,
                "error": str(
                    error
                )
            }


        if not test_path.exists():

            return {
                "success": False,
                "error": (
                    "Test file does not exist."
                )
            }


        if not test_path.is_file():

            return {
                "success": False,
                "error": (
                    "Test path is not a file."
                )
            }


        relative_path = (
            test_path
            .relative_to(
                workspace.root
            )
            .as_posix()
        )


        # Never allow this to become arbitrary
        # Python execution.
        if (
            relative_path
            != "test_tool.py"
        ):

            return {
                "success": False,

                "error": (
                    "Only test_tool.py may be "
                    "executed."
                )
            }


        try:

            result = subprocess.run(
                [
                    sys.executable,
                    str(
                        test_path
                    )
                ],

                cwd=str(
                    workspace.root
                ),

                capture_output=True,
                text=True,

                timeout=timeout,

                shell=False
            )


            return {
                "success":
                    result.returncode
                    == 0,

                "return_code":
                    result.returncode,

                "stdout":
                    result.stdout,

                "stderr":
                    result.stderr
            }


        except subprocess.TimeoutExpired as error:

            stdout = (
                error.stdout
                or ""
            )

            stderr = (
                error.stderr
                or ""
            )


            if isinstance(
                stdout,
                bytes
            ):

                stdout = stdout.decode(
                    "utf-8",
                    errors="replace"
                )


            if isinstance(
                stderr,
                bytes
            ):

                stderr = stderr.decode(
                    "utf-8",
                    errors="replace"
                )


            return {
                "success": False,

                "return_code":
                    None,

                "error": (
                    "Candidate tests exceeded "
                    f"the {timeout} second timeout."
                ),

                "stdout":
                    stdout,

                "stderr":
                    stderr
            }


        except Exception as error:

            return {
                "success": False,

                "return_code":
                    None,

                "error":
                    str(
                        error
                    ),

                "stdout":
                    "",

                "stderr":
                    ""
            }


    # ==================================================
    # NORMAL TOOL REGISTRATION
    # ==================================================

    registry.register(
        name="write_file",

        description=(
            "Write text to a file inside "
            "the isolated agent workspace."
        ),

        parameters={
            "type": "object",

            "properties": {
                "path": {
                    "type": "string"
                },

                "content": {
                    "type": "string"
                }
            },

            "required": [
                "path",
                "content"
            ],

            "additionalProperties":
                False
        },

        handler=write_file
    )


    registry.register(
        name="read_file",

        description=(
            "Read a file from the "
            "agent workspace."
        ),

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

            "additionalProperties":
                False
        },

        handler=read_file
    )


    registry.register(
        name="list_files",

        description=(
            "List all files currently "
            "in the agent workspace."
        ),

        parameters={
            "type": "object",

            "properties": {},

            "additionalProperties":
                False
        },

        handler=list_files
    )


    registry.register(
        name="validate_python",

        description=(
            "Check whether a Python file "
            "has valid Python syntax."
        ),

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

            "additionalProperties":
                False
        },

        handler=validate_python
    )


    # ==================================================
    # OPTIONAL TEST EXECUTION
    # ==================================================

    if allow_test_execution:

        registry.register(
            name="run_candidate_tests",

            description=(
                "Run test_tool.py inside the current "
                "candidate workspace and return the "
                "exit code, stdout, and stderr."
            ),

            parameters={
                "type": "object",

                "properties": {
                    "path": {
                        "type": "string",

                        "description": (
                            "Only test_tool.py "
                            "is allowed."
                        )
                    },

                    "timeout": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 30
                    }
                },

                "additionalProperties":
                    False
            },

            handler=
                run_candidate_tests
        )


    return registry