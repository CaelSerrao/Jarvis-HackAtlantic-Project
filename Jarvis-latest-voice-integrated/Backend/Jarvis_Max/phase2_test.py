from pathlib import Path

from agents.tool_builder_agent import (
    ToolBuilderAgent
)

from agent_runtime.workspace_tools import (
    build_workspace_tools
)

from database import (
    get_latest_missing_capability,
    get_or_create_user,
    initialize_database
)

from llm.mistral_provider import (
    MistralProvider
)


BASE_DIR = Path(
    __file__
).resolve().parent


def main():

    initialize_database()

    user_id = get_or_create_user(
        "local_user"
    )

    capability = (
        get_latest_missing_capability(
            user_id
        )
    )

    if not capability:

        print(
            "No missing capability found."
        )

        return

    print(
        "Building capability:"
    )

    print(
        capability["capability"]
    )

    workspace = (
        BASE_DIR
        / "generated_tools"
        / "pending"
        / f"capability_{capability['id']}"
    )

    agent_tools = (
        build_workspace_tools(
            workspace
        )
    )

    llm = MistralProvider()

    agent = ToolBuilderAgent(
        llm=llm,
        tools=agent_tools
    )

    task = f"""
Create a reusable Jarvis tool for this
missing capability:

{capability["capability"]}

Reason:

{capability.get("reason") or "Not provided"}

The current prototype primarily targets
Windows and macOS.
""".strip()

    result = agent.run(
        task,

        context={
            "language": "Python",

            "jarvis_tool_version":
                "0.1",

            "capability_id":
                capability["id"]
        }
    )

    print()
    print("RESULT")
    print("------")
    print(result)


if __name__ == "__main__":
    main()