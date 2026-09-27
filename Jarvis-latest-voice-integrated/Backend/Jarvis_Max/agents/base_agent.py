import json


class BaseAgent:

    def __init__(
        self,
        name,
        llm,
        tools,
        system_prompt,
        max_iterations=10,
        required_tools=None
    ):
        self.name = name
        self.llm = llm
        self.tools = tools
        self.system_prompt = system_prompt
        self.max_iterations = max_iterations

        self.required_tools = set(
            required_tools or []
        )


    def build_initial_messages(
        self,
        task,
        context=None
    ):
        context = context or {}

        return [
            {
                "role": "system",
                "content": self.system_prompt
            },

            {
                "role": "user",
                "content": (
                    f"TASK:\n{task}\n\n"
                    f"CONTEXT:\n"
                    f"{json.dumps(context, indent=2)}"
                )
            }
        ]


    def run(
        self,
        task,
        context=None
    ):
        messages = self.build_initial_messages(
            task,
            context
        )

        used_tools = set()

        for iteration in range(
            self.max_iterations
        ):

            print(
                f"[{self.name}] "
                f"Iteration {iteration + 1}"
            )

            response = self.llm.chat(
                messages,
                self.tools.get_schemas()
            )

            tool_calls = response.get(
                "tool_calls",
                []
            )

            if not tool_calls:

                missing_required_tools = (
                    self.required_tools
                    - used_tools
                )

                if missing_required_tools:

                    messages.append({
                        "role": "assistant",
                        "content": (
                            response.get(
                                "content",
                                ""
                            )
                        )
                    })

                    messages.append({
                        "role": "user",
                        "content": (
                            "The task is not complete yet.\n\n"
                            "You must perform the required "
                            "tool actions before finishing.\n\n"
                            "Required tools not yet used:\n"
                            + "\n".join(
                                f"- {tool_name}"
                                for tool_name
                                in sorted(
                                    missing_required_tools
                                )
                            )
                        )
                    })

                    continue

                return {
                    "success": True,
                    "response": (
                        response.get(
                            "content",
                            ""
                        )
                    ),
                    "iterations": (
                        iteration + 1
                    ),
                    "used_tools": list(
                        used_tools
                    )
                }

            messages.append(
                response
            )

            for tool_call in tool_calls:

                tool_name = (
                    tool_call[
                        "function"
                    ]["name"]
                )

                raw_arguments = (
                    tool_call[
                        "function"
                    ].get(
                        "arguments",
                        "{}"
                    )
                )

                if isinstance(
                    raw_arguments,
                    str
                ):

                    try:
                        arguments = json.loads(
                            raw_arguments
                        )

                    except json.JSONDecodeError:
                        arguments = {}

                else:
                    arguments = raw_arguments

                print(
                    f"[{self.name}] "
                    f"Tool: {tool_name}"
                )

                try:

                    result = (
                        self.tools.execute(
                            tool_name,
                            arguments
                        )
                    )

                except Exception as error:

                    result = {
                        "success": False,
                        "error": str(error)
                    }

                if result.get(
                    "success",
                    True
                ):
                    used_tools.add(
                        tool_name
                    )

                messages.append({
                    "role": "tool",

                    "name": tool_name,

                    "tool_call_id":
                        tool_call["id"],

                    "content":
                        json.dumps(result)
                })

        return {
            "success": False,
            "error": (
                "Agent reached maximum "
                "iterations."
            ),
            "used_tools": list(
                used_tools
            )
        }