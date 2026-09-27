import platform
from pathlib import Path

from core.capability_learning_pipeline import (
    CapabilityLearningPipeline
)

from core.capability_resolver import (
    CapabilityResolver
)

from core.host import (
    build_host_registry
)

from database import (
    create_conversation,
    get_latest_conversation,
    get_or_create_device,
    get_or_create_user,
    initialize_database,
    list_memories
)

from generated_tool_loader import (
    GeneratedToolLoader
)

from jarvis import Jarvis

from research import (
    OpenAIResearchProvider
)

from llm.mistral_provider import (
    MistralProvider
)

from llm_client import LocalLLM

from tools import build_registry


BASE_DIR = Path(
    __file__
).resolve().parent


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


def main():

    # ============================================
    # DATABASE
    # ============================================

    initialize_database()

    user_id = get_or_create_user(
        "local_user"
    )

    device_id = get_or_create_device(
        user_id,
        tier="max"
    )

    conversation_id = (
        get_latest_conversation(
            user_id,
            device_id
        )
    )


    # ============================================
    # LOCAL JARVIS MODEL
    # ============================================

    llm = LocalLLM()


    # ============================================
    # BUILT-IN JARVIS TOOLS
    # ============================================

    tools = build_registry()


    # ============================================
    # LOAD LEARNED TOOLS
    # ============================================

    generated_loader = (
        GeneratedToolLoader(
            BASE_DIR
            / "generated_tools"
            / "installed"
        )
    )

    loaded_tools = (
        generated_loader.load_into_registry(
            tools
        )
    )


    # ============================================
    # TRUSTED HOST API
    # ============================================

    host_registry = (
        build_host_registry()
    )


    # ============================================
    # CAPABILITY RESOLVER
    # ============================================

    resolver = CapabilityResolver(
        llm=llm,
        tool_registry=tools,
        host_registry=host_registry
    )


    # ============================================
    # LAZY-LOADED REMOTE PROVIDERS
    # ============================================

    learning_pipeline = None
    research_provider = None


    # ============================================
    # CAPABILITY LEARNING
    # ============================================

    def handle_capability(
        capability_result
    ):
        nonlocal learning_pipeline

        if learning_pipeline is None:

            print()
            print(
                "Starting Jarvis developer agent..."
            )

            developer_llm = (
                MistralProvider()
            )

            learning_pipeline = (
                CapabilityLearningPipeline(
                    base_dir=BASE_DIR,
                    llm=developer_llm,
                    registry=tools,
                    max_repairs=3
                )
            )


        return learning_pipeline.learn(
            capability_id=(
                capability_result[
                    "capability_id"
                ]
            ),

            capability=(
                capability_result[
                    "capability"
                ]
            ),

            reason=(
                capability_result.get(
                    "reason"
                )
            ),

            approval_callback=(
                approve_generated_tool
            )
        )


    # ============================================
    # WEB LOOKUP / RESEARCH
    # ============================================

    def handle_research(
        arguments
    ):
        nonlocal research_provider


        if research_provider is None:

            print()
            print(
                "Starting Jarvis Web Agent..."
            )

            research_provider = (
                OpenAIResearchProvider()
            )


        query = arguments[
            "query"
        ]


        mode = arguments.get(
            "mode",
            "lookup"
        )


        # ----------------------------------------
        # QUICK WEB LOOKUP
        # ----------------------------------------

        if mode == "lookup":

            effort = arguments.get(
                "effort",
                "medium"
            )

            print(
                "[Web Agent] lookup"
            )

            return (
                research_provider.lookup(
                    query=query,
                    effort=effort
                )
            )


        # ----------------------------------------
        # DEEPER WEB RESEARCH
        # ----------------------------------------

        effort = arguments.get(
            "effort",
            "high"
        )

        print(
            "[Research Agent] starting"
        )


        last_status = {
            "value": None
        }


        def show_status(
            status
        ):
            if (
                status
                != last_status["value"]
            ):

                print(
                    f"[Research Agent] "
                    f"{status}"
                )

                last_status[
                    "value"
                ] = status


        return (
            research_provider.research(
                query=query,
                effort=effort,
                status_callback=
                    show_status
            )
        )


    # ============================================
    # JARVIS
    # ============================================

    jarvis = Jarvis(
        user_id=user_id,
        device_id=device_id,
        conversation_id=conversation_id,

        llm=llm,

        tools=tools,

        capability_handler=(
            handle_capability
        ),

        resolver=resolver,

        host_registry=(
            host_registry
        ),

        research_handler=(
            handle_research
        )
    )


    # ============================================
    # STARTUP OUTPUT
    # ============================================

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
        f"{conversation_id}"
    )


    if loaded_tools:

        print()
        print(
            "Generated tools loaded:"
        )

        for tool_name in loaded_tools:

            print(
                f"  - {tool_name}"
            )


    print()

    print(
        "Host API primitives loaded:"
    )

    for primitive_name in sorted(
        host_registry.get_names()
    ):

        print(
            f"  - {primitive_name}"
        )


    print()

    print(
        "Resolver attached: "
        f"{jarvis.resolver is not None}"
    )

    print(
        "Host registry attached: "
        f"{jarvis.host_registry is not None}"
    )

    print(
        "Research handler attached: "
        f"{jarvis.research_handler is not None}"
    )


    print()

    print(
        "Commands: "
        "/new, /memories, /exit"
    )

    print()


    # ============================================
    # CLI LOOP
    # ============================================

    while True:

        message = input(
            "You: "
        ).strip()


        if not message:
            continue


        # ----------------------------------------
        # EXIT
        # ----------------------------------------

        if message == "/exit":

            break


        # ----------------------------------------
        # NEW CONVERSATION
        # ----------------------------------------

        if message == "/new":

            conversation_id = (
                create_conversation(
                    user_id,
                    device_id
                )
            )

            jarvis.conversation_id = (
                conversation_id
            )

            print(
                f"Started conversation "
                f"{conversation_id}\n"
            )

            continue


        # ----------------------------------------
        # MEMORY LIST
        # ----------------------------------------

        if message in {
            "/memory",
            "/memories"
        }:

            memories = list_memories(
                user_id
            )

            print()


            if not memories:

                print(
                    "No memories stored."
                )

            else:

                for memory in memories:

                    print(
                        f"[{memory['category']}] "
                        f"{memory['content']}"
                    )


            print()

            continue


        # ----------------------------------------
        # UNKNOWN COMMAND
        # ----------------------------------------

        if message.startswith(
            "/"
        ):

            print()

            print(
                f"Unknown command: "
                f"{message}"
            )

            print(
                "Available commands: "
                "/new, /memories, /exit"
            )

            print()

            continue


        # ----------------------------------------
        # JARVIS REQUEST
        # ----------------------------------------

        try:

            response = jarvis.handle(
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