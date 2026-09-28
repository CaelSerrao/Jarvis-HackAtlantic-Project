import json
from pathlib import Path

from agents.tool_repair_agent import (
    ToolRepairAgent
)

from agent_runtime.workspace_tools import (
    build_workspace_tools
)

from agent_runtime.candidate_validator import (
    CandidateValidator
)

from llm.mistral_provider import (
    MistralProvider
)


BASE_DIR = Path(
    __file__
).resolve().parent


def find_latest_candidate():
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

    if not candidates:
        return None

    return max(
        candidates,
        key=lambda path:
            path.stat().st_mtime
    )


def read_file(path):
    return path.read_text(
        encoding="utf-8"
    )


def main():
    candidate = find_latest_candidate()

    if not candidate:
        print(
            "No pending candidate found."
        )
        return

    report_path = (
        candidate
        / "validation_report.json"
    )

    if not report_path.exists():
        print(
            "Candidate has not been validated yet."
        )
        return

    report = json.loads(
        read_file(report_path)
    )

    if report.get("success"):
        print(
            "Candidate already passes validation."
        )
        return

    print()
    print(
        f"Repairing: {candidate.name}"
    )
    print("-" * 50)

    tool_code = read_file(
        candidate / "tool.py"
    )

    manifest = read_file(
        candidate / "manifest.json"
    )

    tests = read_file(
        candidate / "test_tool.py"
    )

    validation_report = read_file(
        report_path
    )

    # The repair agent may ONLY modify tool.py.
    tools = build_workspace_tools(
        candidate,
        writable_files={
            "tool.py"
        }
    )

    llm = MistralProvider()

    agent = ToolRepairAgent(
        llm=llm,
        tools=tools
    )

    task = f'''
Repair the generated Jarvis tool.

CURRENT TOOL.PY:

--- tool.py ---
{tool_code}
--- end tool.py ---

MANIFEST:

--- manifest.json ---
{manifest}
--- end manifest.json ---

TESTS:

--- test_tool.py ---
{tests}
--- end test_tool.py ---

VALIDATION REPORT:

--- validation_report.json ---
{validation_report}
--- end validation_report.json ---

Fix tool.py so that it satisfies the existing tests
and still implements the capability described by the
manifest.

Do not modify test_tool.py or manifest.json.

Do not weaken or bypass the existing tests.

Do not hard-code values from the tests.

After modifying tool.py, validate its Python syntax.
'''.strip()

    result = agent.run(
        task,
        context={
            "candidate": candidate.name,
            "allowed_file": "tool.py"
        }
    )

    print()
    print("REPAIR RESULT")
    print("-" * 50)
    print(result)

    print()
    print(
        "Running validator again..."
    )
    print("-" * 50)

    validator = CandidateValidator(
        candidate_path=candidate,
        test_timeout=10
    )

    new_report = validator.validate()

    # Replace the previous validation report
    # with the new validation results.
    report_path.write_text(
        json.dumps(
            new_report,
            indent=2
        ),
        encoding="utf-8"
    )

    print()

    for name, check in (
        new_report["checks"].items()
    ):
        status = (
            "PASS"
            if check["success"]
            else "FAIL"
        )

        print(
            f"[{status}] {name}"
        )

        details = check.get(
            "details"
        )

        if (
            details
            and not check["success"]
        ):
            print(
                f"       {details}"
            )

    print()
    print("=" * 50)

    if new_report["success"]:
        print(
            "REPAIR SUCCESSFUL"
        )

        print(
            "Candidate is ready for manual approval."
        )

    else:
        print(
            "REPAIR FAILED"
        )

        print(
            "Candidate still requires repair."
        )

        print()

        print(
            "Errors:"
        )

        for error in new_report[
            "errors"
        ]:
            print(
                f"- {error}"
            )

    print()
    print(
        "Validation report saved to:"
    )
    print(
        report_path
    )


if __name__ == "__main__":
    main()