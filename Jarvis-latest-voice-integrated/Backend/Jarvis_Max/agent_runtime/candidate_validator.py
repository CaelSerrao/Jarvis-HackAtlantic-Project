import ast
import json
import os
import subprocess
import sys
from pathlib import Path


class CandidateValidator:

    REQUIRED_FILES = {
        "tool.py",
        "manifest.json",
        "test_tool.py"
    }

    REQUIRED_MANIFEST_FIELDS = {
        "name",
        "description",
        "function_name",
        "permissions",
        "supported_platforms",
        "risk_level"
    }

    VALID_RISK_LEVELS = {
        "low",
        "medium",
        "high"
    }

    # Phase 2B is intentionally conservative.
    FORBIDDEN_IMPORTS = {
        "subprocess",
        "socket",
        "requests",
        "urllib",
        "http",
        "ctypes",
        "winreg"
    }

    FORBIDDEN_FUNCTIONS = {
        "eval",
        "exec",
        "compile",
        "__import__"
    }

    FORBIDDEN_ATTRIBUTE_CALLS = {
        ("os", "system"),
        ("os", "popen"),
        ("shutil", "rmtree")
    }


    def __init__(
        self,
        candidate_path,
        test_timeout=10
    ):
        self.root = Path(
            candidate_path
        ).resolve()

        self.test_timeout = test_timeout

        self.report = {
            "candidate": str(self.root),
            "success": False,
            "checks": {},
            "errors": []
        }


    def add_check(
        self,
        name,
        success,
        details=None
    ):
        self.report["checks"][name] = {
            "success": success,
            "details": details
        }

        if not success and details:
            self.report["errors"].append(
                f"{name}: {details}"
            )


    def validate_required_files(
        self
    ):
        if not self.root.exists():

            self.add_check(
                "required_files",
                False,
                "Candidate directory does not exist."
            )

            return False

        existing_files = {
            path.name
            for path in self.root.iterdir()
            if path.is_file()
        }

        missing = (
            self.REQUIRED_FILES
            - existing_files
        )

        if missing:

            self.add_check(
                "required_files",
                False,
                (
                    "Missing files: "
                    + ", ".join(sorted(missing))
                )
            )

            return False

        self.add_check(
            "required_files",
            True,
            "All required files exist."
        )

        return True


    def load_manifest(
        self
    ):
        path = (
            self.root
            / "manifest.json"
        )

        try:

            with path.open(
                "r",
                encoding="utf-8"
            ) as file:

                manifest = json.load(
                    file
                )

        except Exception as error:

            self.add_check(
                "manifest_json",
                False,
                str(error)
            )

            return None

        self.add_check(
            "manifest_json",
            True,
            "manifest.json contains valid JSON."
        )

        return manifest


    def validate_manifest(
        self,
        manifest
    ):
        missing_fields = (
            self.REQUIRED_MANIFEST_FIELDS
            - set(manifest.keys())
        )

        if missing_fields:

            self.add_check(
                "manifest_schema",
                False,
                (
                    "Missing fields: "
                    + ", ".join(
                        sorted(missing_fields)
                    )
                )
            )

            return False

        if not isinstance(
            manifest["name"],
            str
        ):
            self.add_check(
                "manifest_schema",
                False,
                "name must be a string."
            )

            return False

        if not isinstance(
            manifest["description"],
            str
        ):
            self.add_check(
                "manifest_schema",
                False,
                "description must be a string."
            )

            return False

        if not isinstance(
            manifest["function_name"],
            str
        ):
            self.add_check(
                "manifest_schema",
                False,
                "function_name must be a string."
            )

            return False

        permissions = manifest[
            "permissions"
        ]

        if (
            not isinstance(
                permissions,
                list
            )
            or not all(
                isinstance(item, str)
                for item in permissions
            )
        ):
            self.add_check(
                "manifest_schema",
                False,
                "permissions must be a list of strings."
            )

            return False

        platforms = manifest[
            "supported_platforms"
        ]

        if (
            not isinstance(
                platforms,
                list
            )
            or not all(
                isinstance(item, str)
                for item in platforms
            )
        ):
            self.add_check(
                "manifest_schema",
                False,
                (
                    "supported_platforms must "
                    "be a list of strings."
                )
            )

            return False

        risk_level = (
            manifest[
                "risk_level"
            ].lower()
        )

        if (
            risk_level
            not in self.VALID_RISK_LEVELS
        ):
            self.add_check(
                "manifest_schema",
                False,
                (
                    "risk_level must be "
                    "low, medium, or high."
                )
            )

            return False

        self.add_check(
            "manifest_schema",
            True,
            "Manifest structure is valid."
        )

        return True


    def parse_python_file(
        self,
        filename
    ):
        path = (
            self.root
            / filename
        )

        try:

            source = path.read_text(
                encoding="utf-8"
            )

            tree = ast.parse(
                source,
                filename=filename
            )

        except SyntaxError as error:

            self.add_check(
                f"syntax_{filename}",
                False,
                (
                    f"Line {error.lineno}: "
                    f"{error.msg}"
                )
            )

            return None

        except Exception as error:

            self.add_check(
                f"syntax_{filename}",
                False,
                str(error)
            )

            return None

        self.add_check(
            f"syntax_{filename}",
            True,
            "Valid Python syntax."
        )

        return tree


    def scan_security(
        self,
        filename,
        tree
    ):
        problems = []

        for node in ast.walk(
            tree
        ):

            if isinstance(
                node,
                ast.Import
            ):

                for alias in node.names:

                    root_module = (
                        alias.name
                        .split(".")[0]
                    )

                    if (
                        root_module
                        in self.FORBIDDEN_IMPORTS
                    ):
                        problems.append(
                            f"Forbidden import: "
                            f"{alias.name}"
                        )


            elif isinstance(
                node,
                ast.ImportFrom
            ):

                if node.module:

                    root_module = (
                        node.module
                        .split(".")[0]
                    )

                    if (
                        root_module
                        in self.FORBIDDEN_IMPORTS
                    ):
                        problems.append(
                            "Forbidden import: "
                            f"{node.module}"
                        )


            elif isinstance(
                node,
                ast.Call
            ):

                if isinstance(
                    node.func,
                    ast.Name
                ):

                    if (
                        node.func.id
                        in self.FORBIDDEN_FUNCTIONS
                    ):
                        problems.append(
                            "Forbidden function: "
                            f"{node.func.id}"
                        )


                elif isinstance(
                    node.func,
                    ast.Attribute
                ):

                    if isinstance(
                        node.func.value,
                        ast.Name
                    ):

                        call = (
                            node.func.value.id,
                            node.func.attr
                        )

                        if (
                            call
                            in self.FORBIDDEN_ATTRIBUTE_CALLS
                        ):
                            problems.append(
                                "Forbidden call: "
                                f"{call[0]}.{call[1]}"
                            )


        if problems:

            self.add_check(
                f"security_{filename}",
                False,
                problems
            )

            return False

        self.add_check(
            f"security_{filename}",
            True,
            "No blocked constructs detected."
        )

        return True


    def validate_function_exists(
        self,
        tree,
        function_name
    ):
        functions = {
            node.name
            for node in tree.body
            if isinstance(
                node,
                (
                    ast.FunctionDef,
                    ast.AsyncFunctionDef
                )
            )
        }

        if (
            function_name
            not in functions
        ):
            self.add_check(
                "function_exists",
                False,
                (
                    f"Function "
                    f"'{function_name}' "
                    f"was not found in tool.py."
                )
            )

            return False

        self.add_check(
            "function_exists",
            True,
            (
                f"Function "
                f"'{function_name}' exists."
            )
        )

        return True


    def run_tests(
        self
    ):
        test_file = (
            self.root
            / "test_tool.py"
        )

        environment = (
            os.environ.copy()
        )

        environment[
            "PYTHONDONTWRITEBYTECODE"
        ] = "1"

        try:

            result = subprocess.run(
                [
                    sys.executable,
                    str(test_file)
                ],
                cwd=self.root,
                capture_output=True,
                text=True,
                timeout=self.test_timeout,
                env=environment
            )

        except subprocess.TimeoutExpired:

            self.add_check(
                "tests",
                False,
                (
                    "Tests exceeded the "
                    f"{self.test_timeout} second timeout."
                )
            )

            return False

        except Exception as error:

            self.add_check(
                "tests",
                False,
                str(error)
            )

            return False

        details = {
            "return_code":
                result.returncode,

            "stdout":
                result.stdout.strip(),

            "stderr":
                result.stderr.strip()
        }

        if result.returncode != 0:

            self.add_check(
                "tests",
                False,
                details
            )

            return False

        self.add_check(
            "tests",
            True,
            details
        )

        return True


    def validate(
        self
    ):
        if not self.validate_required_files():

            return self.report


        manifest = self.load_manifest()

        if manifest is None:

            return self.report


        if not self.validate_manifest(
            manifest
        ):
            return self.report


        tool_tree = (
            self.parse_python_file(
                "tool.py"
            )
        )

        test_tree = (
            self.parse_python_file(
                "test_tool.py"
            )
        )


        if tool_tree is None:
            return self.report

        if test_tree is None:
            return self.report


        tool_security = (
            self.scan_security(
                "tool.py",
                tool_tree
            )
        )

        test_security = (
            self.scan_security(
                "test_tool.py",
                test_tree
            )
        )

        if (
            not tool_security
            or not test_security
        ):
            return self.report


        if not self.validate_function_exists(
            tool_tree,
            manifest[
                "function_name"
            ]
        ):
            return self.report


        tests_passed = (
            self.run_tests()
        )


        self.report["success"] = (
            tests_passed
        )

        return self.report