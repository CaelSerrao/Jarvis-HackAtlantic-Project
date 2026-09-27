import json
import sys
from pathlib import Path

from agent_runtime.candidate_validator import (
    CandidateValidator
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


def main():

    if len(sys.argv) > 1:

        candidate = Path(
            sys.argv[1]
        ).resolve()

    else:

        candidate = (
            find_latest_candidate()
        )


    if not candidate:

        print(
            "No pending candidate found."
        )

        return


    print()
    print(
        f"Validating: {candidate.name}"
    )

    print(
        "-" * 50
    )


    validator = CandidateValidator(
        candidate_path=candidate,
        test_timeout=10
    )

    report = validator.validate()


    for name, check in (
        report["checks"].items()
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
    print(
        "=" * 50
    )

    if report["success"]:

        print(
            "CANDIDATE VALIDATION: PASSED"
        )

        print(
            "The tool is ready for "
            "manual approval."
        )

    else:

        print(
            "CANDIDATE VALIDATION: FAILED"
        )

        print()

        print(
            "Errors:"
        )

        for error in report["errors"]:

            print(
                f"- {error}"
            )


    report_path = (
        candidate
        / "validation_report.json"
    )

    report_path.write_text(
        json.dumps(
            report,
            indent=2
        ),
        encoding="utf-8"
    )

    print()
    print(
        f"Report saved to:"
    )

    print(
        report_path
    )


if __name__ == "__main__":
    main()