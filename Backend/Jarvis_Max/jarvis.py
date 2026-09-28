import json

from database import (
    add_message,
    get_recent_messages,
    log_tool_run,
    search_memories
)


class Jarvis:

    def __init__(
        self,
        user_id,
        device_id,
        conversation_id,
        llm,
        tools,
        capability_handler=None,
        resolver=None,
        host_registry=None,
        research_handler=None
    ):
        self.user_id = user_id
        self.device_id = device_id
        self.conversation_id = conversation_id
        self.llm = llm
        self.tools = tools
        self.capability_handler = capability_handler
        self.resolver = resolver
        self.host_registry = host_registry
        self.research_handler = research_handler


    def is_explicit_memory_request(
        self,
        message
    ):
        message = message.lower().strip()

        memory_phrases = [
            "remember that",
            "remember this",
            "remember my",
            "save that",
            "save this",
            "store that",
            "store this",
            "keep in mind that",
            "note that"
        ]

        return any(
            phrase in message
            for phrase in memory_phrases
        )


    def looks_like_missing_capability(
        self,
        response
    ):
        response = response.lower()

        phrases = [
            "can't",
            "cannot",
            "unable to",
            "don't have",
            "do not have",
            "not available",
            "isn't available",
            "not in my toolset",
            "isn't in my toolset",
            "currently can't",
            "currently cannot",
            "do this manually",
            "not supported",
            "don't currently support",
            "do not currently support"
        ]

        return any(
            phrase in response
            for phrase in phrases
        )


    def get_setting(
        self,
        context,
        section,
        key,
        default
    ):
        settings = (context or {}).get(
            "settings",
            {}
        )

        section_settings = settings.get(
            section,
            {}
        )

        return section_settings.get(
            key,
            default
        )


    def store_message(
        self,
        context,
        role,
        content
    ):
        if not self.get_setting(
            context,
            "memory",
            "saveHistory",
            True
        ):
            return

        add_message(
            self.conversation_id,
            role,
            content
        )


    def build_system_prompt(
        self,
        user_message,
        context=None
    ):
        memory_enabled = self.get_setting(
            context,
            "memory",
            "memoryEnabled",
            True
        )

        if memory_enabled:
            memories = search_memories(
                self.user_id,
                user_message,
                limit=8
            )

            memory_text = "\n".join(
                f"- {memory['content']}"
                for memory in memories
            )

            if not memory_text:
                memory_text = (
                    "No relevant long-term memories found."
                )
        else:
            memory_text = (
                "Long-term memory is disabled in Settings."
            )

        return f"""
You are Jarvis, a persistent personal AI assistant.

You are not tied to one device or one language model.
You represent the same assistant wherever the user
accesses Jarvis.

Your goals are:

1. Help the user quickly and accurately.

2. Always inspect the currently available tools before
   deciding that an action cannot be performed.

3. If an available tool can perform the requested
   action, use the tool instead of saying that the
   capability is unavailable.

4. Previous conversation messages may refer to
   capabilities that Jarvis did not have at the time.
   The current tool list represents Jarvis's current
   capabilities and takes priority over old statements.

5. Never claim that you performed an action unless a
   tool actually performed it.

6. Use recall_memory when older personal context is
   required.

7. If the user asks Jarvis to perform an action and no
   available tool can reasonably perform it, use
   request_capability.

8. Only report a missing capability when none of the
   currently available tools can perform the action.

9. Keep responses concise unless the user asks for
   more detail.

10. Carefully preserve who the user is referring to.

When the user says "me", "my", or "I", those words
refer to the user, not Jarvis.

If the user asks:

"Introduce me"
"Describe me"
"Tell someone about me"

introduce or describe the USER using known information
and relevant memories.

Do not introduce Jarvis unless the user specifically
asks you to introduce yourself.

11. Never invent personal details, nicknames, names,
preferences, or facts about the user.

Only use information supported by the conversation or
relevant long-term memories.

Example:

Relevant memories:
- User's name is Cael.
- User is a software engineering student.
- User's favorite drink is Turkish black coffee.

User:
Introduce me and mention my favorite drink.

Good:
"Cael is a software engineering student whose favorite
drink is Turkish black coffee."

Bad:
"Hi, I'm Jarvis, your personal assistant..."

Relevant long-term memories:

{memory_text}
""".strip()


    def build_messages(
        self,
        user_message,
        context=None
    ):
        history = []

        if self.get_setting(
            context,
            "memory",
            "saveHistory",
            True
        ):
            history = get_recent_messages(
                self.conversation_id,
                limit=12
            )

        messages = [
            {
                "role": "system",
                "content": self.build_system_prompt(
                    user_message,
                    context
                )
            }
        ]

        messages.extend(
            history
        )

        return messages


    def handle_chat(
        self,
        user_message,
        context=None
    ):
        messages = self.build_messages(
            user_message,
            context
        )

        response = self.llm.chat(
            messages,
            tools=None
        )

        content = (
            response.get("content")
            or ""
        )

        self.store_message(
            context,
            "assistant",
            content
        )

        return content


    def format_execution_result(
        self,
        result
    ):
        """
        Convert a successful structured tool result
        into text that can be shown to the user.
        """

        if result is None:
            return "Done."

        if isinstance(
            result,
            str
        ):
            return result

        if not isinstance(
            result,
            dict
        ):
            return json.dumps(
                result,
                indent=2,
                default=str
            )

        # Rich textual responses.
        for key in (
            "text",
            "message",
            "response"
        ):
            value = result.get(
                key
            )

            if (
                isinstance(
                    value,
                    str
                )
                and value.strip()
            ):
                return value

        # Current time.
        if result.get(
            "time"
        ):
            return (
                f"The current time is "
                f"{result['time']}."
            )

        # Application launch.
        if result.get(
            "application"
        ):
            return (
                f"Opened "
                f"{result['application']}."
            )

        # Memories.
        if "memories" in result:
            memories = (
                result.get(
                    "memories"
                )
                or []
            )

            if not memories:
                return (
                    "I couldn't find any "
                    "matching memories."
                )

            return "\n".join(
                str(memory)
                for memory in memories
            )

        # Files / generated outputs.
        if result.get(
            "destination"
        ):
            return (
                "Completed successfully: "
                f"{result['destination']}"
            )

        # Generic structured result fallback.
        useful_result = {
            key: value
            for key, value
            in result.items()
            if key not in {
                "success"
            }
        }

        if useful_result:
            return json.dumps(
                useful_result,
                indent=2,
                default=str
            )

        return "Done."


    def format_execution_error(
        self,
        result
    ):
        """
        Extract a useful error message from a failed
        structured tool result.
        """

        if result is None:
            return "unknown error"

        if isinstance(
            result,
            str
        ):
            return result

        if not isinstance(
            result,
            dict
        ):
            return str(
                result
            )

        for key in (
            "error",
            "message",
            "reason",
            "details"
        ):
            value = result.get(
                key
            )

            if value is None:
                continue

            if value == "":
                continue

            if isinstance(
                value,
                str
            ):
                return value

            return json.dumps(
                value,
                indent=2,
                default=str
            )

        useful_result = {
            key: value
            for key, value
            in result.items()
            if key not in {
                "success"
            }
        }

        if useful_result:
            return json.dumps(
                useful_result,
                indent=2,
                default=str
            )

        return "unknown error"


    def save_explicit_memory(
        self,
        user_message,
        context
    ):
        if not self.get_setting(
            context,
            "memory",
            "memoryEnabled",
            True
        ):
            response = (
                "Memory is disabled in Settings."
            )

            self.store_message(
                context,
                "assistant",
                response
            )

            return response

        try:
            memory = (
                self.llm.extract_memory(
                    user_message
                )
            )

            result = (
                self.tools.execute(
                    "save_memory",
                    memory,
                    context
                )
            )

            success = result.get(
                "success",
                False
            )

            log_tool_run(
                self.conversation_id,
                "save_memory",
                json.dumps(
                    memory
                ),
                json.dumps(
                    result
                ),
                success
            )

            if success:
                response = (
                    f"Remembered: "
                    f"{memory['content']}"
                )

            else:
                response = (
                    "I couldn't save that memory."
                )

        except Exception as error:
            response = (
                "I couldn't save that memory: "
                f"{error}"
            )

        self.store_message(
            context,
            "assistant",
            response
        )

        return response


    def run_capability_learning(
        self,
        capability_result
    ):
        if not self.capability_handler:
            return None

        try:
            return (
                self.capability_handler(
                    capability_result
                )
            )

        except Exception as error:
            return {
                "success": False,
                "status": "learning_failed",
                "error": str(error)
            }


    def build_capability_response(
        self,
        capability_result,
        learning_result
    ):
        capability_name = (
            capability_result.get(
                "capability",
                "the requested capability"
            )
        )

        if learning_result is None:
            return (
                "I don't currently have that "
                "capability. I've registered a "
                "need for: "
                f"{capability_name}."
            )

        status = learning_result.get(
            "status"
        )

        if status == "installed":
            return (
                "I've learned and installed "
                "the capability: "
                f"{learning_result['tool_name']}."
            )

        if status == "approval_required":
            return (
                "I created the capability, "
                "but it was not installed."
            )

        if status == "validation_failed":
            return (
                "I tried to build the missing "
                "capability, but the generated "
                "tool failed validation."
            )

        if status == "learning_failed":
            return (
                "I detected the missing capability, "
                "but the capability-learning process "
                "failed: "
                f"{learning_result.get('error', 'unknown error')}"
            )

        return (
            "I registered the missing capability, "
            "but it could not be installed."
        )


    def handle_missing_capability(
        self,
        user_message,
        context
    ):
        """
        Legacy missing-capability path.

        This remains available if Jarvis is ever run
        without the CapabilityResolver.

        When the resolver is active, capability learning
        should normally happen through
        handle_resolver_capability_gap().
        """

        if not self.get_setting(
            context,
            "tools",
            "toolGeneration",
            True
        ):
            response = (
                "New tool generation is disabled in Settings."
            )

            self.store_message(
                context,
                "assistant",
                response
            )

            return response

        try:
            capability = (
                self.llm.extract_missing_capability(
                    user_message
                )
            )

            capability_result = (
                self.tools.execute(
                    "request_capability",
                    capability,
                    context
                )
            )

            success = (
                capability_result.get(
                    "status"
                )
                == "capability_missing"
            )

            log_tool_run(
                self.conversation_id,
                "request_capability",
                json.dumps(
                    capability
                ),
                json.dumps(
                    capability_result
                ),
                success
            )

            if success:
                learning_result = (
                    self.run_capability_learning(
                        capability_result
                    )
                )

                response = (
                    self.build_capability_response(
                        capability_result,
                        learning_result
                    )
                )

            else:
                response = (
                    "I detected that a capability "
                    "is missing, but I couldn't "
                    "register it."
                )

        except Exception as error:
            response = (
                "I couldn't register the missing "
                f"capability: {error}"
            )

        self.store_message(
            context,
            "assistant",
            response
        )

        return response


    def execute_tool_resolution(
        self,
        tool_name,
        arguments,
        context
    ):
        try:
            result = (
                self.tools.execute(
                    tool_name,
                    arguments,
                    context
                )
            )

            success = result.get(
                "success",
                True
            )

        except Exception as error:
            result = {
                "success": False,
                "error": str(error)
            }

            success = False

        log_tool_run(
            self.conversation_id,
            tool_name,
            json.dumps(
                arguments
            ),
            json.dumps(
                result
            ),
            success
        )

        return result


    def execute_host_resolution(
        self,
        primitive_name,
        arguments,
        context
    ):
        if not self.host_registry:
            return {
                "success": False,
                "error": (
                    "Host registry is not configured."
                )
            }

        try:
            result = (
                self.host_registry.execute(
                    primitive_name,
                    arguments,
                    context
                )
            )

            success = result.get(
                "success",
                True
            )

        except Exception as error:
            result = {
                "success": False,
                "error": str(error)
            }

            success = False

        log_tool_run(
            self.conversation_id,
            f"host:{primitive_name}",
            json.dumps(
                arguments
            ),
            json.dumps(
                result
            ),
            success
        )

        return result


    def execute_composite_plan(
        self,
        steps,
        context
    ):
        results = []

        tool_names = {
            schema["function"]["name"]
            for schema
            in self.tools.get_schemas()
        }

        host_names = set()

        if self.host_registry:
            host_names = (
                self.host_registry.get_names()
            )

        for step in steps:
            action = (
                step.get("action")
                or step.get("name")
            )

            arguments = (
                step.get("parameters")
                or step.get("arguments")
                or {}
            )

            executor = step.get(
                "executor"
            )

            if (
                executor == "tool"
                or (
                    executor is None
                    and action in tool_names
                )
            ):
                result = (
                    self.execute_tool_resolution(
                        action,
                        arguments,
                        context
                    )
                )

            elif (
                executor == "primitive"
                or (
                    executor is None
                    and action in host_names
                )
            ):
                result = (
                    self.execute_host_resolution(
                        action,
                        arguments,
                        context
                    )
                )

            else:
                return {
                    "success": False,
                    "error": (
                        f"Unknown plan action: "
                        f"{action}"
                    ),
                    "results": results
                }

            results.append({
                "action": action,
                "result": result
            })

            if not result.get(
                "success",
                True
            ):
                return {
                    "success": False,
                    "error": (
                        f"Plan failed while "
                        f"executing {action}."
                    ),
                    "results": results
                }

        return {
            "success": True,
            "results": results
        }


    def execute_resolution(
        self,
        resolution,
        context
    ):
        resolution_type = str(
            resolution.get(
                "resolution",
                ""
            )
        ).lower()

        # CHAT
        if resolution_type == "chat":
            return {
                "handled": False
            }

        if (
            resolution_type
            in {
                "direct_tool",
                "host_primitive",
                "composite_plan"
            }
            and not self.get_setting(
                context,
                "tools",
                "toolsEnabled",
                True
            )
        ):
            return {
                "handled": True,
                "result": {
                    "success": False,
                    "error": (
                        "Tool execution is disabled in Settings."
                    )
                }
            }

        # WEB LOOKUP / RESEARCH
        if resolution_type in {
            "web_lookup",
            "web_research"
        }:
            inference_mode = self.get_setting(
                context,
                "ai",
                "inferenceMode",
                "Automatic"
            )

            remote_fallback = self.get_setting(
                context,
                "ai",
                "remoteFallback",
                True
            )

            if (
                inference_mode == "Local Only"
                or not remote_fallback
            ):
                return {
                    "handled": True,
                    "result": {
                        "success": False,
                        "error": (
                            "Remote web and research access "
                            "is disabled in Settings."
                        )
                    }
                }

            if not self.research_handler:
                return {
                    "handled": True,
                    "result": {
                        "success": False,
                        "error": (
                            "Research provider "
                            "is not configured."
                        )
                    }
                }

            arguments = (
                resolution.get(
                    "arguments"
                )
                or {}
            )

            try:
                result = (
                    self.research_handler(
                        arguments
                    )
                )

            except Exception as error:
                result = {
                    "success": False,
                    "error": str(error)
                }

            return {
                "handled": True,
                "result": result
            }

        # DIRECT TOOL
        if resolution_type == "direct_tool":
            tool_name = (
                resolution.get(
                    "tool_name"
                )
                or resolution.get(
                    "tool"
                )
            )

            arguments = (
                resolution.get(
                    "arguments"
                )
                or resolution.get(
                    "parameters"
                )
                or {}
            )

            result = (
                self.execute_tool_resolution(
                    tool_name,
                    arguments,
                    context
                )
            )

            return {
                "handled": True,
                "result": result
            }

        # HOST PRIMITIVE
        if resolution_type == "host_primitive":
            primitive_name = (
                resolution.get(
                    "primitive_name"
                )
                or resolution.get(
                    "primitive"
                )
            )

            arguments = (
                resolution.get(
                    "arguments"
                )
                or resolution.get(
                    "parameters"
                )
                or {}
            )

            result = (
                self.execute_host_resolution(
                    primitive_name,
                    arguments,
                    context
                )
            )

            return {
                "handled": True,
                "result": result
            }

        # COMPOSITE PLAN
        if resolution_type == "composite_plan":
            result = (
                self.execute_composite_plan(
                    resolution.get(
                        "steps",
                        []
                    ),
                    context
                )
            )

            return {
                "handled": True,
                "result": result
            }

        # CAPABILITY GAP
        if resolution_type == "capability_gap":
            return {
                "handled": True,
                "capability_gap": True
            }

        return {
            "handled": False
        }


    def handle_resolver_capability_gap(
        self,
        user_message,
        resolution,
        context
    ):
        if not self.get_setting(
            context,
            "tools",
            "toolGeneration",
            True
        ):
            return (
                "New tool generation is disabled in Settings."
            )

        missing = resolution.get(
            "missing_capability"
        )

        capability_name = None

        reason = resolution.get(
            "reason"
        )

        if isinstance(
            missing,
            dict
        ):
            capability_name = (
                missing.get(
                    "name"
                )
            )

            reason = (
                missing.get(
                    "reason"
                )
                or reason
            )

        invalid_capability_names = {
            "Resolve requested action",
            "Resolve research request",
            "Unknown missing capability"
        }

        if (
            capability_name
            in invalid_capability_names
        ):
            return (
                "The capability resolver could not "
                "determine a valid execution path. "
                "No new capability was generated."
            )

        if not capability_name:
            try:
                extracted = (
                    self.llm.extract_missing_capability(
                        user_message
                    )
                )

            except Exception as error:
                return (
                    "I couldn't determine the missing "
                    f"capability: {error}"
                )

            capability_name = (
                extracted.get(
                    "capability"
                )
            )

            reason = (
                reason
                or extracted.get(
                    "reason"
                )
            )

        if (
            not capability_name
            or capability_name
            in invalid_capability_names
        ):
            return (
                "The capability resolver could not "
                "identify a valid reusable capability. "
                "No new capability was generated."
            )

        capability = {
            "capability":
                capability_name,

            "reason":
                reason
        }

        try:
            capability_result = (
                self.tools.execute(
                    "request_capability",
                    capability,
                    context
                )
            )

        except Exception as error:
            return (
                "I identified the missing capability, "
                "but couldn't register it: "
                f"{error}"
            )

        success = (
            capability_result.get(
                "status"
            )
            == "capability_missing"
        )

        log_tool_run(
            self.conversation_id,
            "request_capability",
            json.dumps(
                capability
            ),
            json.dumps(
                capability_result
            ),
            success
        )

        if not success:
            return (
                "I couldn't register the "
                "missing capability."
            )

        learning_result = (
            self.run_capability_learning(
                capability_result
            )
        )

        if learning_result is None:
            return (
                "I've registered the missing "
                f"capability: {capability_name}."
            )

        if (
            learning_result.get(
                "status"
            )
            != "installed"
        ):
            return (
                self.build_capability_response(
                    capability_result,
                    learning_result
                )
            )

        # ----------------------------------------
        # AUTOMATIC RETRY
        # ----------------------------------------

        print()
        print(
            "Capability installed."
        )
        print(
            "Retrying original request..."
        )
        print()

        if not self.resolver:
            return (
                "I installed the capability, "
                "but couldn't automatically "
                "retry the request."
            )

        try:
            retry_resolution = (
                self.resolver.resolve(
                    user_message
                )
            )

        except Exception as error:
            return (
                "I installed the capability, "
                "but retrying the original "
                "request failed: "
                f"{error}"
            )

        retry_type = str(
            retry_resolution.get(
                "resolution",
                ""
            )
        ).lower()

        print(
            "[Capability Resolver]"
        )

        print(
            "Retry resolution: "
            f"{retry_type.upper()}"
        )

        if retry_type == "capability_gap":
            return (
                "I installed the capability, "
                "but I still couldn't resolve "
                "the original request."
            )

        if retry_type == "chat":
            return self.handle_chat(
                user_message,
                context
            )

        execution = (
            self.execute_resolution(
                retry_resolution,
                context
            )
        )

        if not execution.get(
            "handled"
        ):
            return (
                "I installed the capability, "
                "but couldn't automatically "
                "execute the original request."
            )

        result = execution.get(
            "result",
            {}
        )

        # UPDATED:
        # Preserve actual structured tool output.
        if result.get(
            "success",
            True
        ):
            return (
                self.format_execution_result(
                    result
                )
            )

        return (
            "I learned the capability, but "
            "the original action still failed: "
            f"{self.format_execution_error(result)}"
        )


    def handle(
        self,
        user_message,
        settings=None
    ):
        context = {
            "user_id":
                self.user_id,

            "device_id":
                self.device_id,

            "conversation_id":
                self.conversation_id,

            "settings":
                settings or {}
        }

        self.store_message(
            context,
            "user",
            user_message
        )

        # ----------------------------------------
        # EXPLICIT MEMORY
        # ----------------------------------------

        if self.is_explicit_memory_request(
            user_message
        ):
            return self.save_explicit_memory(
                user_message,
                context
            )

        # ----------------------------------------
        # CAPABILITY RESOLVER
        # ----------------------------------------

        if self.resolver:
            try:
                resolution = (
                    self.resolver.resolve(
                        user_message
                    )
                )

                resolution_type = str(
                    resolution.get(
                        "resolution",
                        ""
                    )
                ).lower()

                print()
                print(
                    "[Capability Resolver]"
                )
                print(
                    f"Resolution: "
                    f"{resolution_type.upper()}"
                )

                # CHAT
                if resolution_type == "chat":
                    return self.handle_chat(
                        user_message,
                        context
                    )

                # CAPABILITY GAP
                if (
                    resolution_type
                    == "capability_gap"
                ):
                    response = (
                        self.handle_resolver_capability_gap(
                            user_message,
                            resolution,
                            context
                        )
                    )

                    self.store_message(
                        context,
                        "assistant",
                        response
                    )

                    return response

                # All executable resolver routes.
                execution = (
                    self.execute_resolution(
                        resolution,
                        context
                    )
                )

                if execution.get(
                    "handled"
                ):
                    result = execution.get(
                        "result",
                        {}
                    )

                    # UPDATED:
                    # Preserve structured results instead
                    # of replacing them with "Done."
                    if result.get(
                        "success",
                        True
                    ):
                        response = (
                            self.format_execution_result(
                                result
                            )
                        )

                    else:
                        response = (
                            "I couldn't complete "
                            "that action: "
                            f"{self.format_execution_error(result)}"
                        )

                    self.store_message(
                        context,
                        "assistant",
                        response
                    )

                    return response

                print(
                    "[Capability Resolver] "
                    "Unrecognized execution route. "
                    "Using safe chat fallback."
                )

                return self.handle_chat(
                    user_message,
                    context
                )

            except Exception as error:
                print(
                    "[Capability Resolver Error] "
                    f"{error}"
                )

                print(
                    "Falling back to safe chat mode."
                )

                return self.handle_chat(
                    user_message,
                    context
                )

        # ----------------------------------------
        # LEGACY MODE
        #
        # Only used when Jarvis is started WITHOUT
        # a CapabilityResolver.
        # ----------------------------------------

        messages = self.build_messages(
            user_message,
            context
        )

        for _ in range(4):
            response = self.llm.chat(
                messages,
                self.tools.get_schemas()
            )

            tool_calls = response.get(
                "tool_calls"
            )

            if not tool_calls:
                content = (
                    response.get(
                        "content"
                    )
                    or ""
                )

                if self.looks_like_missing_capability(
                    content
                ):
                    return (
                        self.handle_missing_capability(
                            user_message,
                            context
                        )
                    )

                self.store_message(
                    context,
                    "assistant",
                    content
                )

                return content

            messages.append(
                response
            )

            for tool_call in tool_calls:
                function = tool_call[
                    "function"
                ]

                tool_name = function[
                    "name"
                ]

                raw_arguments = function.get(
                    "arguments",
                    "{}"
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

                try:
                    result = (
                        self.tools.execute(
                            tool_name,
                            arguments,
                            context
                        )
                    )

                    success = result.get(
                        "success",
                        True
                    )

                except Exception as error:
                    result = {
                        "success": False,
                        "error": str(error)
                    }

                    success = False

                log_tool_run(
                    self.conversation_id,
                    tool_name,
                    json.dumps(
                        arguments
                    ),
                    json.dumps(
                        result
                    ),
                    success
                )

                if (
                    tool_name
                    == "request_capability"
                    and result.get(
                        "status"
                    )
                    == "capability_missing"
                ):
                    learning_result = (
                        self.run_capability_learning(
                            result
                        )
                    )

                    capability_response = (
                        self.build_capability_response(
                            result,
                            learning_result
                        )
                    )

                    self.store_message(
                        context,
                        "assistant",
                        capability_response
                    )

                    return capability_response

                messages.append({
                    "role": "tool",

                    "tool_call_id":
                        tool_call["id"],

                    "content":
                        json.dumps(
                            result
                        )
                })

        response = (
            "I couldn't complete the request "
            "after several tool attempts."
        )

        self.store_message(
            context,
            "assistant",
            response
        )

        return response