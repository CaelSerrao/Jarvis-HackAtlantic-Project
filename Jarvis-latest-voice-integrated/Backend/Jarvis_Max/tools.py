import json
import platform
import subprocess
from datetime import datetime

from database import (
    add_memory,
    record_missing_capability,
    search_memories
)


class ToolRegistry:

    def __init__(self):
        self.tools = {}


    def register(
        self,
        name,
        description,
        parameters,
        handler
    ):
        self.tools[name] = {
            "description": description,
            "parameters": parameters,
            "handler": handler
        }


    def get_schemas(self):
        schemas = []

        for name, tool in self.tools.items():

            schemas.append({
                "type": "function",

                "function": {
                    "name": name,
                    "description": tool["description"],
                    "parameters": tool["parameters"]
                }
            })

        return schemas


    def execute(
        self,
        name,
        arguments,
        context
    ):
        if name not in self.tools:
            raise ValueError(
                f"Tool '{name}' is not registered."
            )

        handler = self.tools[name]["handler"]

        return handler(
            arguments,
            context
        )


def get_current_time(
    arguments,
    context
):
    return {
        "time": datetime.now().strftime(
            "%Y-%m-%d %I:%M:%S %p"
        )
    }


def get_system_info(
    arguments,
    context
):
    return {
        "os": platform.system(),
        "os_version": platform.version(),
        "machine": platform.machine(),
        "device": platform.node()
    }


def save_memory(
    arguments,
    context
):
    content = arguments["content"]

    category = arguments.get(
        "category",
        "general"
    )

    importance = arguments.get(
        "importance",
        1
    )

    memory_id = add_memory(
        context["user_id"],
        content,
        category,
        importance
    )

    return {
        "success": True,
        "memory_id": memory_id
    }


def recall_memory(
    arguments,
    context
):
    query = arguments["query"]

    memories = search_memories(
        context["user_id"],
        query
    )

    return {
        "memories": [
            memory["content"]
            for memory in memories
        ]
    }


def request_capability(
    arguments,
    context
):
    capability = arguments[
        "capability"
    ]

    reason = arguments.get(
        "reason"
    )

    capability_id = (
        record_missing_capability(
            context["user_id"],
            capability,
            reason
        )
    )

    return {
        "success": True,
        "status": "capability_missing",
        "capability_id": capability_id,
        "capability": capability,
        "reason": reason
    }

def open_application(
    arguments,
    context
):
    name = arguments["name"].lower()

    system = platform.system()

    if system == "Windows":

        apps = {
            "calculator": ["calc.exe"],
            "notepad": ["notepad.exe"]
        }

        if name not in apps:
            return {
                "success": False,
                "error": "Application is not registered."
            }

        subprocess.Popen(
            apps[name]
        )

    elif system == "Darwin":

        apps = {
            "calculator": "Calculator",
            "textedit": "TextEdit"
        }

        if name not in apps:
            return {
                "success": False,
                "error": "Application is not registered."
            }

        subprocess.Popen([
            "open",
            "-a",
            apps[name]
        ])

    else:

        return {
            "success": False,
            "error": "Operating system not supported yet."
        }

    return {
        "success": True,
        "application": name
    }


def build_registry():
    registry = ToolRegistry()

    registry.register(
        name="get_current_time",

        description=(
            "Get the current date and time "
            "from the local device."
        ),

        parameters={
            "type": "object",
            "properties": {},
            "additionalProperties": False
        },

        handler=get_current_time
    )

    registry.register(
        name="get_system_info",

        description=(
            "Get information about the "
            "computer Jarvis is currently running on."
        ),

        parameters={
            "type": "object",
            "properties": {},
            "additionalProperties": False
        },

        handler=get_system_info
    )

    registry.register(
        name="save_memory",

        description=(
            "Store an important long-term fact, "
            "preference, project detail, or other "
            "information about the user."
        ),

        parameters={
            "type": "object",

            "properties": {
                "content": {
                    "type": "string"
                },

                "category": {
                    "type": "string"
                },

                "importance": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 5
                }
            },

            "required": [
                "content"
            ],

            "additionalProperties": False
        },

        handler=save_memory
    )

    registry.register(
        name="recall_memory",

        description=(
            "Search Jarvis's long-term memory "
            "for information related to a query."
        ),

        parameters={
            "type": "object",

            "properties": {
                "query": {
                    "type": "string"
                }
            },

            "required": [
                "query"
            ],

            "additionalProperties": False
        },

        handler=recall_memory
    )
    """
    registry.register(
        name="open_application",

        description=(
            "Open a supported application "
            "on the current computer."
        ),

        parameters={
            "type": "object",

            "properties": {
                "name": {
                    "type": "string"
                }
            },

            "required": [
                "name"
            ],

            "additionalProperties": False
        },

        handler=open_application
    )
    """
    registry.register(
        name="request_capability",

        description=(
            "Use this when the user wants Jarvis "
            "to perform an action but none of the "
            "available tools can perform it."
        ),

        parameters={
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
                "capability"
            ],

            "additionalProperties": False
        },

        handler=request_capability
    )

    return registry