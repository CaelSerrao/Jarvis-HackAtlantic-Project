import json
from pathlib import Path

from agents.tool_builder_agent import (
    ToolBuilderAgent
)

from agents.tool_repair_agent import (
    ToolRepairAgent
)

from agent_runtime.workspace_tools import (
    build_workspace_tools
)

from agent_runtime.candidate_validator import (
    CandidateValidator
)

from agent_runtime.tool_installer import (
    ToolInstaller
)

from generated_tool_loader import (
    GeneratedToolLoader
)


class CapabilityLearningPipeline:

    def __init__(
        self,
        base_dir,
        llm,
        registry,
        max_repairs=3,
        max_rebuilds=1
    ):
        self.base_dir = Path(
            base_dir
        ).resolve()

        self.llm = llm
        self.registry = registry

        self.max_repairs = max_repairs
        self.max_rebuilds = max_rebuilds

        self.pending_root = (
            self.base_dir
            / "generated_tools"
            / "pending"
        )

        self.installed_root = (
            self.base_dir
            / "generated_tools"
            / "installed"
        )

        self.pending_root.mkdir(
            parents=True,
            exist_ok=True
        )

        self.installed_root.mkdir(
            parents=True,
            exist_ok=True
        )


    # ==================================================
    # REPORT
    # ==================================================

    def save_report(
        self,
        path,
        report
    ):
        path.write_text(
            json.dumps(
                report,
                indent=2
            ),
            encoding="utf-8"
        )


    # ==================================================
    # VALIDATION
    # ==================================================

    def validate_candidate(
        self,
        workspace
    ):
        validator = CandidateValidator(
            candidate_path=workspace,
            test_timeout=10
        )

        report = (
            validator.validate()
        )

        report_path = (
            workspace
            / "validation_report.json"
        )

        self.save_report(
            report_path,
            report
        )

        return report


    # ==================================================
    # FAILURE CLASSIFICATION
    # ==================================================

    def classify_validation_failure(
        self,
        report
    ):
        """
        Decide whether the current candidate should:

        - be repaired by modifying tool.py
        - be rebuilt because builder-owned files failed
        """

        checks = report.get(
            "checks",
            {}
        )

        failed_checks = {
            name
            for name, result
            in checks.items()
            if not result.get(
                "success",
                False
            )
        }


        # These cannot legally be fixed by
        # ToolRepairAgent because it may edit
        # tool.py only.
        rebuild_checks = {
            "required_files",
            "manifest_json",
            "manifest_schema",
            "syntax_test_tool.py",
            "security_test_tool.py"
        }


        if (
            failed_checks
            & rebuild_checks
        ):
            return {
                "action": "rebuild",
                "failed_checks":
                    sorted(
                        failed_checks
                    )
            }


        # These can reasonably be fixed through
        # tool.py.
        repair_checks = {
            "syntax_tool.py",
            "security_tool.py",
            "function_exists",
            "tests"
        }


        if (
            failed_checks
            & repair_checks
        ):
            return {
                "action": "repair",
                "failed_checks":
                    sorted(
                        failed_checks
                    )
            }


        return {
            "action": "rebuild",
            "failed_checks":
                sorted(
                    failed_checks
                )
        }


    # ==================================================
    # RESET GENERATED CANDIDATE
    # ==================================================

    def reset_candidate(
        self,
        workspace
    ):
        """
        Remove only files owned by the generated
        candidate so a rebuild starts cleanly.
        """

        candidate_files = [
            "tool.py",
            "manifest.json",
            "test_tool.py",
            "validation_report.json"
        ]


        for filename in candidate_files:

            path = (
                workspace
                / filename
            )

            if path.exists():
                path.unlink()


    # ==================================================
    # BUILD
    # ==================================================

    def build_candidate(
        self,
        workspace,
        capability,
        reason,
        capability_id
    ):
        # The builder may only write the three
        # candidate files.
        tools = build_workspace_tools(
            workspace,
            writable_files={
                "tool.py",
                "manifest.json",
                "test_tool.py"
            }
        )

        agent = ToolBuilderAgent(
            llm=self.llm,
            tools=tools
        )


        task = f"""
Create a reusable Jarvis tool for this missing
capability:

{capability}

Reason:

{reason or "Not provided"}

The tool must target Windows and macOS where
practical.

Create exactly:

- tool.py
- manifest.json
- test_tool.py

The manifest MUST contain:

- name
- description
- function_name
- parameters
- permissions
- supported_platforms
- risk_level

The name must use snake_case and contain no spaces.

The parameters field must contain a valid JSON Schema
describing exactly how Jarvis should call the
function.

If any parameter represents a filesystem location,
include:

"path_parameters": [
    "parameter_name"
]

in manifest.json.

Tests must be isolated and deterministic.

Filesystem tests must use:

tempfile.TemporaryDirectory()

Do not use the user's real filesystem in tests.

Do not install the tool.

Only create the candidate.
""".strip()


        return agent.run(
            task,

            context={
                "language":
                    "Python",

                "capability_id":
                    capability_id,

                "jarvis_tool_version":
                    "0.1"
            }
        )


    # ==================================================
    # REPAIR
    # ==================================================

    def repair_candidate(
            self,
            workspace,
            report,
            repair_attempt,
            capability,
            reason
        ):
            # The Repair Agent may only modify tool.py.
            #
            # It can read the other candidate files itself.
            # Runtime validation is controlled externally by
            # CapabilityLearningPipeline / CandidateValidator.
            tools = build_workspace_tools(
                workspace,
                writable_files={
                    "tool.py"
                }
            )

            agent = ToolRepairAgent(
                llm=self.llm,
                tools=tools
            )

            task = f"""
        Repair the generated Jarvis tool for this capability:

        {capability}

        Reason:

        {reason or "Not provided"}

        This is repair attempt:

        {repair_attempt}


        The following candidate files are already available
        inside your workspace:

        - tool.py
        - manifest.json
        - test_tool.py
        - validation_report.json


        Perform this process:

        1. Read validation_report.json first.

        2. Identify the exact validation failure.

        3. Read tool.py.

        4. Read test_tool.py if necessary to understand the
        expected behavior.

        5. Read manifest.json if necessary to understand the
        declared interface.

        6. Determine whether the failure can be fixed by
        modifying tool.py.

        7. If it can, make one coherent repair to tool.py.

        8. Call validate_python on tool.py.

        9. If validate_python reports a syntax error, correct
        that syntax error and validate tool.py again.

        10. Once tool.py has valid Python syntax, stop.


        Do NOT run the candidate test suite yourself.

        The external CapabilityLearningPipeline will run the
        complete validator after this repair, including:

        - syntax validation
        - security validation
        - manifest validation
        - candidate tests

        If the candidate still fails, you will receive a new
        validation_report.json during the next repair attempt.


        Do NOT modify:

        - test_tool.py
        - manifest.json
        - validation_report.json


        Do not weaken tests.

        Do not hard-code test-specific values.

        Do not repeatedly rewrite tool.py speculatively.

        Fix the reusable implementation itself.
        """.strip()

            return agent.run(
                task,
                context={
                    "repair_attempt":
                        repair_attempt,

                    "allowed_file":
                        "tool.py",

                    "external_validation":
                        True
                }
            )


    # ==================================================
    # INSTALL
    # ==================================================

    def install_candidate(
        self,
        workspace
    ):
        installer = ToolInstaller(
            candidate_path=workspace,

            installed_root=
                self.installed_root
        )

        install_result = (
            installer.install()
        )


        loader = (
            GeneratedToolLoader(
                self.installed_root
            )
        )

        loaded_tools = (
            loader.load_into_registry(
                self.registry
            )
        )


        install_result[
            "loaded_tools"
        ] = loaded_tools

        return install_result


    # ==================================================
    # LEARNING PIPELINE
    # ==================================================

    def learn(
        self,
        capability_id,
        capability,
        reason=None,
        approval_callback=None
    ):
        workspace = (
            self.pending_root
            / f"capability_{capability_id}"
        )

        workspace.mkdir(
            parents=True,
            exist_ok=True
        )


        print()
        print("=" * 60)
        print("JARVIS CAPABILITY LEARNING")
        print("=" * 60)

        print(
            f"Capability: "
            f"{capability}"
        )

        print()


        build_results = []
        report = None

        validated = False


        # ==============================================
        # BUILD / REBUILD LOOP
        # ==============================================

        for build_attempt in range(
            0,
            self.max_rebuilds + 1
        ):

            if build_attempt == 0:

                print(
                    "[1/4] Building candidate..."
                )

            else:

                print()
                print(
                    "[1/4] Rebuilding candidate "
                    f"({build_attempt}/"
                    f"{self.max_rebuilds})..."
                )


            self.reset_candidate(
                workspace
            )


            build_result = (
                self.build_candidate(
                    workspace,
                    capability,
                    reason,
                    capability_id
                )
            )


            build_results.append(
                build_result
            )


            print(
                "Candidate generated."
            )

            print()
            print(
                "[2/4] Validating candidate..."
            )


            report = (
                self.validate_candidate(
                    workspace
                )
            )


            if report.get(
                "success",
                False
            ):

                validated = True
                break


            failure = (
                self.classify_validation_failure(
                    report
                )
            )


            # ------------------------------------------
            # BUILDER-OWNED FAILURE
            # ------------------------------------------

            if (
                failure[
                    "action"
                ]
                == "rebuild"
            ):

                print()
                print(
                    "Candidate has a builder-level "
                    "validation failure."
                )

                print(
                    "Failed checks: "
                    + ", ".join(
                        failure[
                            "failed_checks"
                        ]
                    )
                )


                if (
                    build_attempt
                    < self.max_rebuilds
                ):

                    print(
                        "Generating a fresh "
                        "candidate..."
                    )

                    continue


                break


            # ------------------------------------------
            # TOOL.PY REPAIR LOOP
            # ------------------------------------------

            for repair_attempt in range(
                1,
                self.max_repairs + 1
            ):

                print()
                print(
                    "Validation failed."
                )

                print(
                    f"Repair attempt "
                    f"{repair_attempt}/"
                    f"{self.max_repairs}"
                )


                self.repair_candidate(
                    workspace=
                        workspace,

                    report=
                        report,

                    repair_attempt=
                        repair_attempt,

                    capability=
                        capability,

                    reason=
                        reason
                )


                # IMPORTANT:
                #
                # Python owns validation.
                #
                # The model does NOT decide whether
                # or when tests run.
                report = (
                    self.validate_candidate(
                        workspace
                    )
                )


                if report.get(
                    "success",
                    False
                ):

                    validated = True
                    break


                failure = (
                    self.classify_validation_failure(
                        report
                    )
                )


                # Repair produced or revealed a
                # builder-owned failure.
                if (
                    failure[
                        "action"
                    ]
                    == "rebuild"
                ):

                    print()
                    print(
                        "Repair cannot fix the "
                        "remaining candidate files."
                    )

                    print(
                        "Failed checks: "
                        + ", ".join(
                            failure[
                                "failed_checks"
                            ]
                        )
                    )

                    break


            if validated:
                break


            # If repair attempts were exhausted,
            # automatically allow a clean rebuild
            # if one remains.
            if (
                build_attempt
                < self.max_rebuilds
            ):

                print()
                print(
                    "Repair attempts exhausted."
                )

                print(
                    "Trying a fresh candidate..."
                )

                continue


            break


        # ==============================================
        # VALIDATION FAILED
        # ==============================================

        if not validated:

            print()
            print(
                "Capability could not "
                "be validated."
            )

            return {
                "success":
                    False,

                "status":
                    "validation_failed",

                "workspace":
                    str(
                        workspace
                    ),

                "build_results":
                    build_results,

                "validation":
                    report
            }


        # ==============================================
        # VALIDATION PASSED
        # ==============================================

        print()
        print(
            "[3/4] Validation passed."
        )


        manifest_path = (
            workspace
            / "manifest.json"
        )

        manifest = json.loads(
            manifest_path.read_text(
                encoding="utf-8"
            )
        )


        # ==============================================
        # APPROVAL
        # ==============================================

        approved = False


        if approval_callback:

            approved = (
                approval_callback(
                    manifest
                )
            )


        if not approved:

            print(
                "Installation not approved."
            )

            return {
                "success":
                    False,

                "status":
                    "approval_required",

                "manifest":
                    manifest,

                "workspace":
                    str(
                        workspace
                    )
            }


        # ==============================================
        # INSTALL
        # ==============================================

        print()
        print(
            "[4/4] Installing capability..."
        )


        install_result = (
            self.install_candidate(
                workspace
            )
        )


        print(
            f"Installed: "
            f"{manifest['name']}"
        )


        return {
            "success":
                True,

            "status":
                "installed",

            "tool_name":
                manifest[
                    "name"
                ],

            "manifest":
                manifest,

            "install_result":
                install_result
        }