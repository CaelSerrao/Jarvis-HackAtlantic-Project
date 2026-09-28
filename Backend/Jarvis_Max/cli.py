import platform

from bootstrap import (
    JarvisRuntime
)

from database import (
    create_conversation,
    list_memories
)


def approve_generated_tool(
    manifest
):
    print()
    print("=" * 60)
    print("NEW JARVIS CAPABILITY")
    print("=" * 60)

    print(
        f"Name: "
        f"{manifest.get('name', 'Unknown')}"
    )

    print(
        f"Description: "
        f"{manifest.get('description', 'No description')}"
    )

    print(
        f"Risk: "
        f"{manifest.get('risk_level', 'unknown')}"
    )

    print()
    print(
        "Permissions:"
    )


    permissions = manifest.get(
        "permissions",
        []
    )


    if permissions:

        for permission in permissions:

            print(
                f"  - {permission}"
            )

    else:

        print(
            "  - None declared"
        )


    print()


    answer = input(
        "Install this capability? "
        "[y/N]: "
    ).strip().lower()


    return answer == "y"


def handle_event(
    event
):
    event_type = event[
        "type"
    ]

    data = event.get(
        "data",
        {}
    )


    if event_type == "web_lookup_started":

        print(
            "[Web Agent] lookup"
        )


    elif event_type == "research_started":

        print(
            "[Research Agent] starting"
        )


    elif event_type == "research_status":

        print(
            f"[Research Agent] "
            f"{data.get('status')}"
        )


    elif event_type == "developer_agent_started":

        print(
            "Starting Jarvis developer agent..."
        )


    elif event_type == "capability_learning_started":

        print(
            "[Capability Learning] "
            f"{data.get('capability')}"
        )


def main():

    runtime = JarvisRuntime(
        event_handler=
            handle_event,

        approval_handler=
            approve_generated_tool
    )


    jarvis = runtime.jarvis


    print()
    print(
        "Jarvis Max"
    )

    print(
        "-----------"
    )

    print(
        f"Device: "
        f"{platform.node()}"
    )

    print(
        f"Conversation: "
        f"{runtime.conversation_id}"
    )


    if runtime.loaded_tools:

        print()
        print(
            "Generated tools loaded:"
        )

        for tool_name in (
            runtime.loaded_tools
        ):

            print(
                f"  - {tool_name}"
            )


    print()

    print(
        "Commands: "
        "/new, /memories, /exit"
    )

    print()


    while True:

        message = input(
            "You: "
        ).strip()


        if not message:
            continue


        if message == "/exit":
            break


        if message == "/new":

            conversation_id = (
                create_conversation(
                    runtime.user_id,
                    runtime.device_id
                )
            )

            runtime.conversation_id = (
                conversation_id
            )

            jarvis.conversation_id = (
                conversation_id
            )

            print(
                f"Started conversation "
                f"{conversation_id}"
            )

            print()

            continue


        if message in {
            "/memory",
            "/memories"
        }:

            memories = list_memories(
                runtime.user_id
            )

            print()


            for memory in memories:

                print(
                    f"[{memory['category']}] "
                    f"{memory['content']}"
                )


            print()

            continue


        if message.startswith(
            "/"
        ):

            print(
                f"Unknown command: "
                f"{message}"
            )

            continue


        try:

            response = runtime.handle(
                message
            )

            print()
            print(
                f"Jarvis: {response}"
            )

            print()


        except KeyboardInterrupt:

            print()
            print(
                "Request cancelled."
            )
            print()


        except Exception as error:

            print()
            print(
                f"Jarvis error: "
                f"{error}"
            )
            print()


if __name__ == "__main__":
    main()