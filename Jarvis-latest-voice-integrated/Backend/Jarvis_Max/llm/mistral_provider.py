import os
import time

from mistralai.client import Mistral
from mistralai.client.utils import (
    BackoffStrategy,
    RetryConfig
)

from llm.agent_provider import AgentProvider


class MistralProvider(AgentProvider):

    def __init__(
        self,
        model="ministral-8b-2512"
    ):
        api_key = os.environ.get(
            "MISTRAL_API_KEY"
        )

        if not api_key:
            raise RuntimeError(
                "MISTRAL_API_KEY is not set."
            )

        self.model = model

        self.last_request_time = 0

        self.minimum_request_interval = 1.2

        self.client = Mistral(
            api_key=api_key,

            retry_config=RetryConfig(
                strategy="backoff",

                backoff=BackoffStrategy(
                    initial_interval=1000,
                    max_interval=30000,
                    exponent=2.0,
                    max_elapsed_time=60000
                ),

                retry_connection_errors=False
            )
        )


    def wait_for_rate_limit(
        self
    ):
        elapsed = (
            time.time()
            - self.last_request_time
        )

        if elapsed < self.minimum_request_interval:

            wait_time = (
                self.minimum_request_interval
                - elapsed
            )

            time.sleep(
                wait_time
            )


    def chat(
        self,
        messages,
        tools=None
    ):
        self.wait_for_rate_limit()

        request = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.1
        }

        if tools:
            request["tools"] = tools
            request["tool_choice"] = "auto"

        response = self.client.chat.complete(
            **request
        )

        self.last_request_time = time.time()

        message = response.choices[0].message

        result = {
            "role": "assistant",
            "content": message.content or "",
            "tool_calls": []
        }

        if message.tool_calls:

            for tool_call in message.tool_calls:

                result["tool_calls"].append({
                    "id": tool_call.id,
                    "type": "function",

                    "function": {
                        "name":
                            tool_call.function.name,

                        "arguments":
                            tool_call.function.arguments
                    }
                })

        return result