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
    get_latest_conversation,
    get_or_create_device,
    get_or_create_user,
    initialize_database
)

from generated_tool_loader import (
    GeneratedToolLoader
)

from jarvis import Jarvis

from llm.mistral_provider import (
    MistralProvider
)

from llm_client import LocalLLM

from research import (
    OpenAIResearchProvider
)

from tools import build_registry


BASE_DIR = Path(
    __file__
).resolve().parent


class JarvisRuntime:

    def __init__(
        self,
        event_handler=None,
        approval_handler=None
    ):
        self.event_handler = event_handler
        self.approval_handler = approval_handler

        initialize_database()

        self.user_id = get_or_create_user(
            "local_user"
        )

        self.device_id = get_or_create_device(
            self.user_id,
            tier="max"
        )

        self.conversation_id = (
            get_latest_conversation(
                self.user_id,
                self.device_id
            )
        )

        self.llm = LocalLLM()

        self.tools = build_registry()

        self.generated_loader = (
            GeneratedToolLoader(
                BASE_DIR
                / "generated_tools"
                / "installed"
            )
        )

        self.loaded_tools = (
            self.generated_loader
            .load_into_registry(
                self.tools
            )
        )

        self.host_registry = (
            build_host_registry()
        )

        self.resolver = (
            CapabilityResolver(
                llm=self.llm,
                tool_registry=self.tools,
                host_registry=
                    self.host_registry
            )
        )

        self.learning_pipeline = None
        self.research_provider = None


        self.jarvis = Jarvis(
            user_id=self.user_id,
            device_id=self.device_id,
            conversation_id=
                self.conversation_id,
            llm=self.llm,
            tools=self.tools,
            capability_handler=
                self.handle_capability,
            resolver=self.resolver,
            host_registry=
                self.host_registry,
            research_handler=
                self.handle_research
        )


    def emit(
        self,
        event_type,
        data=None
    ):
        if self.event_handler:

            self.event_handler({
                "type": event_type,
                "data": data or {}
            })


    def handle_capability(
        self,
        capability_result
    ):
        if self.learning_pipeline is None:

            self.emit(
                "developer_agent_started"
            )

            self.learning_pipeline = (
                CapabilityLearningPipeline(
                    base_dir=BASE_DIR,
                    llm=MistralProvider(),
                    registry=self.tools,
                    max_repairs=3
                )
            )


        self.emit(
            "capability_learning_started",
            {
                "capability":
                    capability_result.get(
                        "capability"
                    )
            }
        )


        return (
            self.learning_pipeline.learn(
                capability_id=
                    capability_result[
                        "capability_id"
                    ],

                capability=
                    capability_result[
                        "capability"
                    ],

                reason=
                    capability_result.get(
                        "reason"
                    ),

                approval_callback=
                    self.approval_handler
            )
        )


    def handle_research(
        self,
        arguments
    ):
        if self.research_provider is None:

            self.research_provider = (
                OpenAIResearchProvider()
            )


        query = arguments[
            "query"
        ]

        mode = arguments.get(
            "mode",
            "lookup"
        )


        if mode == "lookup":

            self.emit(
                "web_lookup_started",
                {
                    "query": query
                }
            )

            result = (
                self.research_provider.lookup(
                    query=query,
                    effort="low"
                )
            )

            self.emit(
                "web_lookup_finished",
                {
                    "success":
                        result.get(
                            "success",
                            False
                        )
                }
            )

            return result


        self.emit(
            "research_started",
            {
                "query": query
            }
        )


        def status_callback(
            status
        ):
            self.emit(
                "research_status",
                {
                    "status": status
                }
            )


        return (
            self.research_provider.research(
                query=query,
                effort="high",
                status_callback=
                    status_callback
            )
        )


    def handle(
            self,
            message,
            settings=None
        ):
            self.emit(
                "request_started",
                {
                    "message": message
                }
            )

            try:

                response = (
                    self.jarvis.handle(
                        message,
                        settings=settings or {}
                    )
                )

                self.emit(
                    "request_completed",
                    {
                        "response": response
                    }
                )

                return response

            except Exception as error:

                self.emit(
                    "request_failed",
                    {
                        "error": str(error)
                    }
                )

                raise