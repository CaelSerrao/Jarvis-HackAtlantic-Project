import os
import requests


JEV_URL = "https://jevmodel.org/v1/systemone"


class DecisionGate:

    def __init__(self):
        self.api_key = os.getenv("JEVMODEL_API_KEY")

    def available(self) -> bool:
        return bool(self.api_key)

    def evaluate(
        self,
        user_request: str,
        resolver_result: str,
        available_capabilities: list[str],
    ):
        if not self.api_key:
            return None

        state = {
            "user_request": user_request,
            "resolver_result": resolver_result,
            "available_capabilities": available_capabilities,
        }

        questions = {
            "route": {
                "type": "choice",
                "instructions": (
                    "Determine how Jarvis should handle the request."
                ),
                "criteria": {
                    "existing_tool": (
                        "An existing capability can directly complete the request."
                    ),
                    "compose_tools": (
                        "Existing capabilities can be combined to complete the request."
                    ),
                    "normal_llm": (
                        "The language model can answer without using a tool."
                    ),
                    "research": (
                        "The request requires external research or current information."
                    ),
                    "create_tool": (
                        "Jarvis lacks the required capability and a reusable new tool "
                        "should be created."
                    ),
                    "unsupported": (
                        "Jarvis cannot reasonably complete the request."
                    ),
                },
            },

            "existing_capability": {
                "type": "noul",
                "instructions": (
                    "Can Jarvis already complete this request "
                    "with an existing capability?"
                ),
            },

            "composable": {
                "type": "noul",
                "instructions": (
                    "Can existing capabilities be combined "
                    "to complete this request?"
                ),
            },

            "new_capability_needed": {
                "type": "noul",
                "instructions": (
                    "Does this request genuinely require "
                    "a capability Jarvis does not have?"
                ),
            },

            "reusable": {
                "type": "noul",
                "instructions": (
                    "Would a new tool created for this request "
                    "likely be useful again?"
                ),
            },
        }

        response = requests.post(
            JEV_URL,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "jev-latest",
                "state": state,
                "questions": questions,
            },
            timeout=10,
        )

        response.raise_for_status()

        return response.json()


def parse_decision(result: dict):
    if not result:
        return None

    answers = result["answers"]
    route = answers["route"]

    return {
        "route": route["choice"],
        "confidence": route.get("confidence", 0),
        "probabilities": route.get("probabilities", {}),
        "existing_capability":
            answers["existing_capability"]["noul"],
        "composable":
            answers["composable"]["noul"],
        "new_capability_needed":
            answers["new_capability_needed"]["noul"],
        "reusable":
            answers["reusable"]["noul"],
        }