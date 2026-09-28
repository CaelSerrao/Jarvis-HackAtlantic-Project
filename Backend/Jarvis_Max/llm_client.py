import json

import requests


class LocalLLM:

    def __init__(
        self,
        base_url="http://127.0.0.1:8080/v1"
    ):
        self.base_url = base_url
        self.model_name = None


    def get_model_name(self):

        if self.model_name:
            return self.model_name

        response = requests.get(
            f"{self.base_url}/models",
            timeout=10
        )

        response.raise_for_status()

        models = response.json()["data"]

        if not models:
            raise RuntimeError(
                "No model loaded by llama-server."
            )

        self.model_name = models[0]["id"]

        return self.model_name


    def chat(
        self,
        messages,
        tools=None,
        tool_choice="auto"
    ):

        payload = {
            "model": self.get_model_name(),
            "messages": messages,
            "temperature": 0.1,
            "max_tokens": 256
        }

        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = tool_choice

        response = requests.post(
            f"{self.base_url}/chat/completions",
            json=payload,
            timeout=90
        )

        response.raise_for_status()

        return response.json()[
            "choices"
        ][0]["message"]


    def structured_chat(
            self,
            messages,
            schema,
            max_tokens=512
        ):
            last_content = None

            for attempt in range(2):

                token_limit = (
                    max_tokens
                    if attempt == 0
                    else max_tokens * 2
                )

                payload = {
                    "model":
                        self.get_model_name(),

                    "messages":
                        messages,

                    "temperature":
                        0,

                    "max_tokens":
                        token_limit,

                    "response_format": {
                        "type":
                            "json_schema",

                        "schema":
                            schema
                    }
                }


                response = requests.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    timeout=90
                )

                response.raise_for_status()


                content = response.json()[
                    "choices"
                ][0]["message"]["content"]

                last_content = content


                if not content:
                    continue


                try:

                    return json.loads(
                        content
                    )

                except json.JSONDecodeError:

                    continue


            raise RuntimeError(
                "LLM returned invalid structured JSON "
                "after retrying: "
                f"{last_content}"
            )


    def extract_memory(
        self,
        user_message
    ):

        memory_schema = {
            "type": "object",

            "properties": {
                "content": {
                    "type": "string"
                },

                "category": {
                    "type": "string",
                    "enum": [
                        "preference",
                        "project",
                        "person",
                        "device",
                        "work",
                        "general"
                    ]
                },

                "importance": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 5
                }
            },

            "required": [
                "content",
                "category",
                "importance"
            ],

            "additionalProperties": False
        }

        system_prompt = """
You extract long-term memories for Jarvis.

The user has explicitly asked Jarvis to remember
something.

Convert the user's statement into one short,
clear, reusable fact.

Do not include phrases such as:
"remember that"
"the user said"
"Jarvis should remember"

Choose one category:

preference
project
person
device
work
general

Importance:

1 = minor information
2 = useful information
3 = moderately important
4 = important long-term information
5 = very important information

Example:

User:
Remember that my favorite pasta sauce is alfredo

Result:
{
    "content": "User's favorite pasta sauce is Alfredo.",
    "category": "preference",
    "importance": 2
}

Example:

User:
Remember that my preferred programming language
for Jarvis tools is Python

Result:
{
    "content": "User prefers Python for Jarvis tools.",
    "category": "preference",
    "importance": 4
}
""".strip()

        messages = [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_message
            }
        ]

        return self.structured_chat(
            messages=messages,
            schema=memory_schema,
            max_tokens=128
        )


    def extract_missing_capability(
        self,
        user_message
    ):

        capability_schema = {
            "type": "object",

            "properties": {
                "capability": {
                    "type": "string"
                },

                "reason": {
                    "type": "string"
                }
            },

            "required": [
                "capability",
                "reason"
            ],

            "additionalProperties": False
        }

        system_prompt = """
You identify reusable capabilities that Jarvis is missing.

The user asked Jarvis to perform an action that Jarvis
currently cannot perform.

Convert the user's request into a short, reusable
capability description.

Do not describe only the exact task the user requested.

The capability should describe something Jarvis could
reuse for future requests.

Example:

User:
Create a folder called Homework on my desktop.

Result:
{
    "capability": "Create filesystem directories",
    "reason": "Jarvis needs the ability to create directories at user-specified filesystem locations."
}

Example:

User:
Convert these HEIC images to WebP.

Result:
{
    "capability": "Convert image files between formats",
    "reason": "Jarvis needs a reusable capability for converting image files between user-specified formats."
}

Example:

User:
Rename every PDF in this folder using the date inside
the document.

Result:
{
    "capability": "Rename files using extracted document metadata",
    "reason": "Jarvis needs the ability to inspect document contents and rename files using extracted metadata."
}
""".strip()

        messages = [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_message
            }
        ]

        return self.structured_chat(
            messages=messages,
            schema=capability_schema,
            max_tokens=384
        )