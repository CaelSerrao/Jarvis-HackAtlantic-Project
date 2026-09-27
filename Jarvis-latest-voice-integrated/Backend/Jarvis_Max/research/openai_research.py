import json
import os
import time

from openai import OpenAI


class OpenAIResearchProvider:

    def __init__(
        self,
        lookup_model=None,
        research_model=None
    ):
        self.client = OpenAI()

        # Fast / cheaper model for ordinary lookups.
        self.lookup_model = (
            lookup_model
            or os.environ.get(
                "JARVIS_LOOKUP_MODEL",
                "gpt-5.6-luna"
            )
        )

        # Stronger model for substantial research.
        self.research_model = (
            research_model
            or os.environ.get(
                "JARVIS_RESEARCH_MODEL",
                "gpt-5.6-sol"
            )
        )


    # ==================================================
    # QUICK WEB LOOKUP
    # ==================================================

    def lookup(
        self,
        query,
        effort="low"
    ):
        """
        Fast foreground web lookup.

        Intended for:
        - current facts
        - recent releases
        - simple news questions
        - quick verification
        - lightweight source-backed answers
        """

        # Keep lookup fast even if the resolver sends
        # "medium" by mistake.
        if effort not in {
            "none",
            "low"
        }:
            effort = "low"


        try:
            response = (
                self.client.responses.create(
                    model=self.lookup_model,

                    reasoning={
                        "effort": effort
                    },

                    tools=[
                        {
                            "type": "web_search",

                            # Correct Responses API field.
                            "search_context_size": "low"
                        }
                    ],

                    # The resolver already determined
                    # that web information is required.
                    tool_choice="required",

                    include=[
                        "web_search_call.action.sources"
                    ],

                    background=False,

                    input=(
                        "Answer the following request "
                        "using current web information.\n\n"

                        f"{query}\n\n"

                        "Keep the lookup focused and fast. "
                        "Search only as much as necessary "
                        "to answer accurately. "

                        "Do not perform a broad research "
                        "project. "

                        "Give a concise answer and cite "
                        "the web sources used."
                    )
                )
            )

        except Exception as error:

            return {
                "success": False,
                "type": "lookup",
                "status": "request_failed",
                "error": str(error)
            }


        if response.status != "completed":

            return (
                self.build_failure_result(
                    response=response,
                    result_type="lookup",
                    label="Web Lookup"
                )
            )


        return (
            self.build_result(
                response=response,
                result_type="lookup"
            )
        )


    # ==================================================
    # DEEPER WEB RESEARCH
    # ==================================================

    def start(
        self,
        query,
        effort="high"
    ):
        """
        Start a long-running research request.
        """

        # Research should actually use meaningful
        # reasoning effort.
        if effort not in {
            "medium",
            "high",
            "xhigh",
            "max"
        }:
            effort = "high"


        try:
            response = (
                self.client.responses.create(
                    model=self.research_model,

                    reasoning={
                        "effort": effort
                    },

                    tools=[
                        {
                            "type": "web_search",

                            # Correct Responses API field.
                            "search_context_size": "high"
                        }
                    ],

                    tool_choice="required",

                    include=[
                        "web_search_call.action.sources"
                    ],

                    background=True,

                    input=(
                        "Research the following request "
                        "carefully using current web "
                        "sources.\n\n"

                        f"{query}\n\n"

                        "Perform substantial investigation "
                        "where useful. "

                        "Compare multiple credible sources "
                        "when appropriate. "

                        "Clearly distinguish established "
                        "facts from uncertainty or "
                        "disagreement. "

                        "Synthesize the findings instead of "
                        "simply listing search results. "

                        "Provide a detailed but focused "
                        "answer with citations."
                    )
                )
            )

        except Exception as error:

            return {
                "success": False,
                "type": "research",
                "status": "request_failed",
                "error": str(error)
            }


        return {
            "success": True,
            "type": "research",
            "response_id": response.id,
            "status": response.status
        }


    # ==================================================
    # RESPONSE RETRIEVAL
    # ==================================================

    def get(
        self,
        response_id
    ):
        return (
            self.client.responses.retrieve(
                response_id
            )
        )


    # ==================================================
    # CANCELLATION
    # ==================================================

    def cancel(
        self,
        response_id
    ):
        try:
            response = (
                self.client.responses.cancel(
                    response_id
                )
            )

        except Exception as error:

            return {
                "success": False,
                "type": "research",
                "response_id": response_id,
                "status": "cancel_failed",
                "error": str(error)
            }


        return {
            "success": True,
            "type": "research",
            "response_id": response.id,
            "status": response.status
        }


    # ==================================================
    # BACKGROUND WAITING
    # ==================================================

    def wait(
        self,
        response_id,
        poll_seconds=2,
        status_callback=None
    ):
        try:
            response = self.get(
                response_id
            )

        except Exception as error:

            return {
                "success": False,
                "type": "research",
                "response_id": response_id,
                "status": "retrieve_failed",
                "error": str(error)
            }


        while response.status in {
            "queued",
            "in_progress"
        }:

            if status_callback:

                status_callback(
                    response.status
                )


            time.sleep(
                poll_seconds
            )


            try:
                response = self.get(
                    response_id
                )

            except Exception as error:

                return {
                    "success": False,
                    "type": "research",
                    "response_id": response_id,
                    "status": "retrieve_failed",
                    "error": str(error)
                }


        if status_callback:

            status_callback(
                response.status
            )


        if response.status != "completed":

            return (
                self.build_failure_result(
                    response=response,
                    result_type="research",
                    label="Research Agent"
                )
            )


        return (
            self.build_result(
                response=response,
                result_type="research"
            )
        )


    # ==================================================
    # HIGH-LEVEL RESEARCH CALL
    # ==================================================

    def research(
        self,
        query,
        effort="high",
        status_callback=None
    ):
        job = self.start(
            query=query,
            effort=effort
        )


        if not job.get(
            "success",
            False
        ):

            return job


        if status_callback:

            status_callback(
                job["status"]
            )


        return (
            self.wait(
                response_id=job[
                    "response_id"
                ],
                status_callback=
                    status_callback
            )
        )


    # ==================================================
    # FAILURE PARSING
    # ==================================================

    def build_failure_result(
        self,
        response,
        result_type,
        label
    ):
        try:
            data = (
                response.model_dump()
                or {}
            )

        except Exception:
            data = {}


        error = data.get(
            "error"
        )

        incomplete_details = (
            data.get(
                "incomplete_details"
            )
        )


        failure_details = {
            "status":
                getattr(
                    response,
                    "status",
                    None
                ),

            "error":
                error,

            "incomplete_details":
                incomplete_details,

            "response_id":
                getattr(
                    response,
                    "id",
                    None
                ),

            "model":
                data.get(
                    "model"
                )
        }


        print()
        print(
            f"[{label} Failure]"
        )

        print(
            json.dumps(
                failure_details,
                indent=2,
                default=str
            )
        )

        print()


        if error:

            if isinstance(
                error,
                dict
            ):

                error_message = (
                    error.get(
                        "message"
                    )
                    or str(error)
                )

            else:

                error_message = str(
                    error
                )


        elif incomplete_details:

            if isinstance(
                incomplete_details,
                dict
            ):

                reason = (
                    incomplete_details.get(
                        "reason"
                    )
                )

                error_message = (
                    "Response was incomplete"
                )

                if reason:

                    error_message += (
                        f": {reason}"
                    )

            else:

                error_message = str(
                    incomplete_details
                )


        else:

            error_message = (
                f"{label} ended with status: "
                f"{getattr(response, 'status', 'unknown')}"
            )


        return {
            "success": False,

            "type":
                result_type,

            "response_id":
                getattr(
                    response,
                    "id",
                    None
                ),

            "status":
                getattr(
                    response,
                    "status",
                    None
                ),

            "error":
                error_message,

            "details":
                failure_details
        }


    # ==================================================
    # SUCCESS RESULT PARSING
    # ==================================================

    def build_result(
        self,
        response,
        result_type="research"
    ):
        try:
            data = (
                response.model_dump()
                or {}
            )

        except Exception:
            data = {}


        citations = []
        sources = []


        output_items = (
            data.get(
                "output"
            )
            or []
        )


        for item in output_items:

            if not isinstance(
                item,
                dict
            ):

                continue


            # ======================================
            # MESSAGE CITATIONS
            # ======================================

            if (
                item.get(
                    "type"
                )
                == "message"
            ):

                content_items = (
                    item.get(
                        "content"
                    )
                    or []
                )


                for content in content_items:

                    if not isinstance(
                        content,
                        dict
                    ):

                        continue


                    annotations = (
                        content.get(
                            "annotations"
                        )
                        or []
                    )


                    for annotation in annotations:

                        if not isinstance(
                            annotation,
                            dict
                        ):

                            continue


                        if (
                            annotation.get(
                                "type"
                            )
                            != "url_citation"
                        ):

                            continue


                        url = annotation.get(
                            "url"
                        )


                        if not url:

                            continue


                        citations.append({
                            "title":
                                annotation.get(
                                    "title"
                                ),

                            "url":
                                url,

                            "start_index":
                                annotation.get(
                                    "start_index"
                                ),

                            "end_index":
                                annotation.get(
                                    "end_index"
                                )
                        })


            # ======================================
            # WEB SEARCH SOURCE LIST
            # ======================================

            if (
                item.get(
                    "type"
                )
                == "web_search_call"
            ):

                action = (
                    item.get(
                        "action"
                    )
                    or {}
                )


                if not isinstance(
                    action,
                    dict
                ):

                    continue


                source_items = (
                    action.get(
                        "sources"
                    )
                    or []
                )


                for source in source_items:

                    if not isinstance(
                        source,
                        dict
                    ):

                        continue


                    url = source.get(
                        "url"
                    )


                    if not url:

                        continue


                    sources.append({
                        "title":
                            source.get(
                                "title"
                            ),

                        "url":
                            url
                    })


        citations = (
            self.deduplicate_sources(
                citations
            )
        )

        sources = (
            self.deduplicate_sources(
                sources
            )
        )


        text = (
            getattr(
                response,
                "output_text",
                None
            )
            or ""
        )


        return {
            "success": True,

            "type":
                result_type,

            "response_id":
                getattr(
                    response,
                    "id",
                    None
                ),

            "status":
                getattr(
                    response,
                    "status",
                    "completed"
                ),

            "model":
                data.get(
                    "model"
                ),

            "text":
                text,

            "citations":
                citations,

            "sources":
                sources
        }


    # ==================================================
    # SOURCE DEDUPLICATION
    # ==================================================

    def deduplicate_sources(
        self,
        items
    ):
        seen = set()
        result = []


        for item in (
            items
            or []
        ):

            if not isinstance(
                item,
                dict
            ):

                continue


            url = item.get(
                "url"
            )


            if not url:

                continue


            if url in seen:

                continue


            seen.add(
                url
            )

            result.append(
                item
            )


        return result