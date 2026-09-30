import json

from .decision_gate import DecisionGate, parse_decision


RESOLUTION_SCHEMA = {
    "type": "object",
    "properties": {
        "resolution": {
            "type": "string",
            "enum": [
                "chat",
                "web_lookup",
                "web_research",
                "direct_tool",
                "host_primitive",
                "composite_plan",
                "capability_gap",
            ],
        },
        "tool_name": {
            "type": ["string", "null"],
        },
        "primitive_name": {
            "type": ["string", "null"],
        },
        "arguments": {
            "type": "object",
        },
        "steps": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "executor": {
                        "type": "string",
                        "enum": [
                            "tool",
                            "primitive",
                        ],
                    },
                    "name": {
                        "type": "string",
                    },
                    "arguments": {
                        "type": "object",
                    },
                },
                "required": [
                    "executor",
                    "name",
                    "arguments",
                ],
                "additionalProperties": False,
            },
        },
        "missing_capability": {
            "type": [
                "object",
                "null",
            ],
            "properties": {
                "name": {
                    "type": "string",
                },
                "reason": {
                    "type": "string",
                },
            },
            "required": [
                "name",
                "reason",
            ],
            "additionalProperties": False,
        },
        "reason": {
            "type": "string",
        },
    },
    "required": [
        "resolution",
        "tool_name",
        "primitive_name",
        "arguments",
        "steps",
        "missing_capability",
        "reason",
    ],
    "additionalProperties": False,
}


class CapabilityResolver:

    def __init__(
        self,
        llm,
        tool_registry,
        host_registry,
    ):
        self.llm = llm
        self.tool_registry = tool_registry
        self.host_registry = host_registry

        self.decision_gate = DecisionGate()

    def get_tool_catalog(self):
        catalog = []

        for schema in self.tool_registry.get_schemas():
            function = schema["function"]

            catalog.append({
                "name": function["name"],
                "description": function["description"],
                "parameters": function["parameters"],
            })

        return catalog

    def get_host_catalog(self):
        return self.host_registry.get_schemas()

    def should_allow_deep_research(
        self,
        user_request,
    ):
        """
        Prevent the local router from selecting
        expensive multi-step research too aggressively.
        """

        text = (
            user_request
            or ""
        ).lower()

        strong_signals = [
            "research",
            "deep research",
            "investigate",
            "in-depth",
            "in depth",
            "deep dive",
            "comprehensive",
            "literature review",
            "detailed report",
            "research report",
            "analyze multiple sources",
            "analyse multiple sources",
        ]

        return any(
            signal in text
            for signal in strong_signals
        )

    def build_messages(
        self,
        user_request,
    ):
        tools = self.get_tool_catalog()
        primitives = self.get_host_catalog()

        system_prompt = """
You are Jarvis's Capability Resolver.

Your only job is to determine HOW Jarvis should
handle the user's request.

You do not execute actions.
You do not answer the user's question yourself.

You have access to:

1. Jarvis tools
2. trusted Host API primitives


Choose exactly one resolution:


CHAT

Use when the user is asking for normal information,
conversation, explanation, advice, reasoning, or
anything that does not require an action on the
computer or current information from the internet.

Examples:

"What is recursion?"
"Explain Docker."
"How are you?"
"What is my favorite pasta sauce?"
"Help me understand REST APIs."
"Explain meta-learning."

Normal conversation is NOT a capability gap.


WEB_LOOKUP

Use when the user needs current, recent, externally
verified, or internet-based information, but does NOT
need substantial multi-step investigation.

WEB_LOOKUP is the default web route.

Examples:

"What is the latest Python version?"
"What happened with OpenAI this week?"
"Find recent papers about meta-learning."
"What is the newest llama.cpp release?"
"Look up the current documentation for FastAPI."
"What are the latest NVIDIA drivers?"

Use web_lookup when a small number of web searches
should be enough to answer the request.

A request does NOT require web_research merely because:

- it asks for recent information
- it contains "latest" or "current"
- it asks for citations
- it asks for a comparison
- web access would improve the answer
- multiple sources could be useful

For web_lookup, arguments must contain:

{
    "query": "<clear standalone lookup request>",
    "effort": "low"
}


WEB_RESEARCH

Use only when the user clearly asks for substantial
investigation, synthesis, or analysis across multiple
sources.

Strong signals include:

- "research"
- "investigate"
- "in-depth"
- "in depth"
- "deep dive"
- "comprehensive"
- "literature review"
- "detailed report"
- "research report"
- "analyze multiple sources"

Examples:

"Research the major advances in meta-learning over the
last year, compare the approaches, explain their
technical importance, and cite the literature."

"Do an in-depth investigation into the current local AI
assistant market and compare the major products."

"Write a comprehensive research report on current
approaches to retrieval augmented generation."

Do NOT use web_research for ordinary freshness checks.

Examples:

"What happened in AI this week?"
→ web_lookup

"What is the latest version of PyTorch?"
→ web_lookup

"Find the newest meta-learning papers."
→ web_lookup

"Research the major developments in meta-learning over
the last year and compare them in depth."
→ web_research

When uncertain between web_lookup and web_research,
choose web_lookup.

For web_research, arguments must contain:

{
    "query": "<clear standalone research request>",
    "effort": "high"
}


DIRECT_TOOL

Use when one existing Jarvis tool directly performs
the requested action.

Example:

"Create a folder called Homework."

If create_directories already exists, use it.


HOST_PRIMITIVE

Use when one trusted Host API primitive directly
performs the requested action.

Host primitives are trusted ways to interact with
the operating system.

Example:

"Open Google Chrome."

Use:

resolution = host_primitive

primitive_name = applications.launch

arguments = {
    "name": "Google Chrome"
}


IMPORTANT APPLICATION RULE:

Application launching belongs to the Host API.

If the user asks to open, start, or launch a
graphical desktop application, prefer:

applications.launch

Do NOT create a new capability simply because the
specific application name is not known in advance.

applications.launch is responsible for finding and
launching installed graphical applications.

Examples:

"Open Google Chrome"
→ applications.launch

"Start Visual Studio Code"
→ applications.launch

"Launch Spotify"
→ applications.launch


COMPOSITE_PLAN

Use when the request requires two or more existing
Jarvis tools or Host API primitives.

Example:

"Create a Project folder and put README.txt inside."

This could use:

1. filesystem.create_directory
2. filesystem.write_text_file


CAPABILITY_GAP

Use only when Jarvis genuinely cannot perform the
request using any available Jarvis tool, Host API
primitive, web lookup, web research, or reasonable
combination of existing capabilities.

Examples might include:

- parsing an unsupported proprietary binary format
- performing a transformation requiring functionality
  that does not currently exist
- interacting with a system for which Jarvis has no
  capability

Current information is NOT a capability gap.

Research is NOT a capability gap.

Example:

"Create a ZIP archive from this folder."

If no existing ZIP, archive, or compression capability
exists:

→ capability_gap

missing_capability.name:

"Create ZIP archives"

Do NOT rename the folder so that its name ends in .zip.
Renaming something does not create an archive.

When choosing capability_gap:

- missing_capability must not be null
- give the missing capability a reusable name
- explain why existing capabilities cannot perform it


IMPORTANT FILE TRANSFORMATION RULE:

filesystem.move only relocates or renames an existing
file or directory.

Changing a filename or extension does NOT transform
the underlying data.

Never use filesystem.move to simulate:

- compression
- ZIP/archive creation
- archive extraction
- image conversion
- audio conversion
- video conversion
- document conversion
- encoding changes
- format transformation

Examples:

Move report.txt to Documents/report.txt
→ filesystem.move

Rename report.txt to notes.txt
→ filesystem.move

Create archive.zip from Project/
→ NOT filesystem.move

Convert photo.png to photo.webp
→ NOT filesystem.move

Convert report.docx to report.pdf
→ NOT filesystem.move

If the transformation cannot be performed by an
existing tool or Host primitive, use capability_gap.


IMPORTANT RULES:

1. Never invent a tool name.

2. Never invent a Host primitive name.

3. Prefer existing Jarvis tools over generating new
   capabilities.

4. Prefer trusted Host API primitives over generated
   Python that directly accesses the operating system.

5. Prefer a composite plan when existing capabilities
   can genuinely perform every required operation.

6. Do not classify normal conversation as a
   capability gap.

7. Do not classify current-information questions as a
   capability gap. Use web_lookup.

8. Do not classify substantial research requests as a
   capability gap. Use web_research.

9. Do not treat missing application configuration as
   a new coding capability if applications.find or
   applications.launch can handle it.

10. Do not treat ordinary filesystem actions as new
    capabilities when filesystem primitives can handle
    them.

11. Only use capability_gap when Jarvis genuinely lacks
    the required functionality.

12. Arguments must match the selected tool or
    primitive's parameter schema.

13. For direct_tool:
    - tool_name must contain the selected tool
    - primitive_name must be null
    - steps must be empty

14. For host_primitive:
    - primitive_name must contain the selected primitive
    - tool_name must be null
    - steps must be empty

15. For composite_plan:
    - steps must contain at least two actions
    - each action must reference an existing tool or
      primitive
    - every step must genuinely contribute to the
      requested result

16. For chat:
    - tool_name must be null
    - primitive_name must be null
    - arguments must be empty
    - steps must be empty
    - missing_capability must be null

17. For web_lookup:
    - tool_name must be null
    - primitive_name must be null
    - steps must be empty
    - missing_capability must be null
    - arguments must contain query
    - effort should be low

18. For web_research:
    - tool_name must be null
    - primitive_name must be null
    - steps must be empty
    - missing_capability must be null
    - arguments must contain query
    - effort should be high

19. For capability_gap:
    - missing_capability must describe the genuinely
      missing reusable capability

20. When opening, starting, or launching an installed
    application, use applications.launch whenever it
    is available.

21. The exact application name does not need its own
    Jarvis tool.

22. If a capability exists in the supplied catalogs,
    use its exact catalog name instead of inventing a
    new capability.

23. When uncertain between web_lookup and web_research,
    choose web_lookup.

24. Prefer the cheaper and simpler valid execution path.

25. Never pretend that renaming a file changes its
    underlying format.

26. Never create a composite plan from unrelated
    operations merely because their names sound similar
    to the user's requested result.
""".strip()

        user_prompt = f"""
USER REQUEST:

{user_request}


AVAILABLE JARVIS TOOLS:

{json.dumps(
    tools,
    indent=2
)}


AVAILABLE HOST PRIMITIVES:

{json.dumps(
    primitives,
    indent=2
)}
""".strip()

        return [
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ]

    def capability_gap_result(
        self,
        name,
        reason,
    ):
        return {
            "resolution": "capability_gap",
            "tool_name": None,
            "primitive_name": None,
            "arguments": {},
            "steps": [],
            "missing_capability": {
                "name": name,
                "reason": reason,
            },
            "reason": reason,
        }

    def plan_conflicts_with_request(
        self,
        user_request,
        steps,
    ):
        """
        Detect plans that are syntactically valid but
        cannot actually perform the semantic operation
        requested by the user.

        This first guard focuses on archive/compression
        requests because filesystem.move must never be
        mistaken for archive creation.
        """

        text = (
            user_request
            or ""
        ).lower()

        archive_signals = [
            "zip archive",
            ".zip",
            "create a zip",
            "make a zip",
            "zip this",
            "zip the",
            "compress",
            "compressed",
            "create an archive",
            "archive this",
            "archive the",
        ]

        wants_archive = any(
            signal in text
            for signal in archive_signals
        )

        if not wants_archive:
            return None

        archive_capability_terms = [
            "zip",
            "archive",
            "compress",
        ]

        for step in steps or []:

            if not isinstance(
                step,
                dict,
            ):
                continue

            name = str(
                step.get(
                    "name",
                    "",
                )
            ).lower()

            if any(
                term in name
                for term in archive_capability_terms
            ):
                return None

        return {
            "name": "Create ZIP archives",
            "reason": (
                "The user requested archive or "
                "compression functionality, but the "
                "execution plan contains no tool or "
                "Host primitive capable of creating "
                "an archive. Renaming or moving a "
                "directory to a .zip path does not "
                "create a ZIP archive."
            ),
        }

    def normalize_composite_step(
        self,
        step,
        tool_names,
        primitive_names,
    ):
        """
        Repair alternate composite-plan formats produced
        by the local model and convert them into the
        canonical:

        {
            "executor": "tool" | "primitive",
            "name": "...",
            "arguments": {...}
        }
        """

        if not isinstance(
            step,
            dict,
        ):
            return None

        name = step.get(
            "name"
        )

        if not name:

            tool_name = step.get(
                "tool_name"
            )

            primitive_name = step.get(
                "primitive_name"
            )

            if tool_name:
                name = tool_name

            elif primitive_name:
                name = primitive_name

        arguments = (
            step.get(
                "arguments"
            )
            or step.get(
                "parameters"
            )
            or {}
        )

        executor = step.get(
            "executor"
        )

        if name in tool_names:
            executor = "tool"

        elif name in primitive_names:
            executor = "primitive"

        if (
            not name
            or executor not in {
                "tool",
                "primitive",
            }
        ):
            return None

        return {
            "executor": executor,
            "name": name,
            "arguments": arguments,
        }

    def validate_resolution(
        self,
        result,
        user_request=None,
    ):
        if not isinstance(
            result,
            dict,
        ):
            return self.capability_gap_result(
                "Resolve requested action",
                (
                    "Capability resolver "
                    "returned an invalid result."
                ),
            )

        resolution = str(
            result.get(
                "resolution",
                "",
            )
        ).lower()

        result["resolution"] = resolution

        tool_names = {
            item["name"]
            for item in self.get_tool_catalog()
        }

        primitive_names = set(
            self.host_registry.get_names()
        )

        # ========================================
        # CHAT
        # ========================================

        if resolution == "chat":

            result["tool_name"] = None
            result["primitive_name"] = None
            result["arguments"] = {}
            result["steps"] = []
            result["missing_capability"] = None

            return result

        # ========================================
        # WEB LOOKUP
        # ========================================

        if resolution == "web_lookup":

            arguments = (
                result.get(
                    "arguments"
                )
                or {}
            )

            query = (
                arguments.get(
                    "query"
                )
                or user_request
            )

            if not query:
                return self.capability_gap_result(
                    "Resolve lookup request",
                    (
                        "The lookup route did not "
                        "contain a lookup query."
                    ),
                )

            result["arguments"] = {
                "query": query,
                "effort": "low",
                "mode": "lookup",
            }

            result["tool_name"] = None
            result["primitive_name"] = None
            result["steps"] = []
            result["missing_capability"] = None

            return result

        # ========================================
        # WEB RESEARCH
        # ========================================

        if resolution == "web_research":

            arguments = (
                result.get(
                    "arguments"
                )
                or {}
            )

            query = (
                arguments.get(
                    "query"
                )
                or user_request
            )

            if not query:
                return self.capability_gap_result(
                    "Resolve research request",
                    (
                        "The research route did not "
                        "contain a research query."
                    ),
                )

            if (
                user_request
                and not self.should_allow_deep_research(
                    user_request
                )
            ):
                return {
                    "resolution": "web_lookup",
                    "tool_name": None,
                    "primitive_name": None,
                    "arguments": {
                        "query": query,
                        "effort": "low",
                        "mode": "lookup",
                    },
                    "steps": [],
                    "missing_capability": None,
                    "reason": (
                        "The request needs current web "
                        "information, but substantial "
                        "multi-step research was not "
                        "explicitly requested. "
                        "Using web lookup instead."
                    ),
                }

            result["arguments"] = {
                "query": query,
                "effort": "high",
                "mode": "research",
            }

            result["tool_name"] = None
            result["primitive_name"] = None
            result["steps"] = []
            result["missing_capability"] = None

            return result

        # ========================================
        # DIRECT TOOL
        # ========================================

        if resolution == "direct_tool":

            name = result.get(
                "tool_name"
            )

            if name in tool_names:

                result["primitive_name"] = None
                result["steps"] = []
                result["missing_capability"] = None

                return result

            if name in primitive_names:

                result["resolution"] = "host_primitive"
                result["primitive_name"] = name
                result["tool_name"] = None
                result["steps"] = []
                result["missing_capability"] = None

                return result

            return self.capability_gap_result(
                "Resolve requested action",
                (
                    "Resolver selected an "
                    f"unknown capability: {name}"
                ),
            )

        # ========================================
        # HOST PRIMITIVE
        # ========================================

        if resolution == "host_primitive":

            name = result.get(
                "primitive_name"
            )

            if name in primitive_names:

                result["tool_name"] = None
                result["steps"] = []
                result["missing_capability"] = None

                return result

            if name in tool_names:

                result["resolution"] = "direct_tool"
                result["tool_name"] = name
                result["primitive_name"] = None
                result["steps"] = []
                result["missing_capability"] = None

                return result

            return self.capability_gap_result(
                "Resolve requested action",
                (
                    "Resolver selected an "
                    f"unknown capability: {name}"
                ),
            )

        # ========================================
        # COMPOSITE PLAN
        # ========================================

        if resolution == "composite_plan":

            raw_steps = (
                result.get(
                    "steps"
                )
                or []
            )

            if len(
                raw_steps
            ) < 2:

                return self.capability_gap_result(
                    "Resolve requested action",
                    (
                        "Resolver produced an "
                        "incomplete composite plan."
                    ),
                )

            normalized_steps = []

            for raw_step in raw_steps:

                step = self.normalize_composite_step(
                    raw_step,
                    tool_names,
                    primitive_names,
                )

                if step is None:

                    return self._invalid_plan(
                        str(
                            raw_step
                        )
                    )

                name = step["name"]
                executor = step["executor"]

                if (
                    executor == "tool"
                    and name not in tool_names
                ):
                    return self._invalid_plan(
                        name
                    )

                if (
                    executor == "primitive"
                    and name not in primitive_names
                ):
                    return self._invalid_plan(
                        name
                    )

                normalized_steps.append(
                    step
                )

            conflict = self.plan_conflicts_with_request(
                user_request,
                normalized_steps,
            )

            if conflict:

                return self.capability_gap_result(
                    conflict["name"],
                    conflict["reason"],
                )

            result["steps"] = normalized_steps
            result["tool_name"] = None
            result["primitive_name"] = None
            result["arguments"] = {}
            result["missing_capability"] = None

            return result

        # ========================================
        # CAPABILITY GAP
        # ========================================

        if resolution == "capability_gap":

            missing = result.get(
                "missing_capability"
            )

            if not isinstance(
                missing,
                dict,
            ):
                return self.capability_gap_result(
                    "Unknown missing capability",
                    result.get(
                        "reason",
                        (
                            "Jarvis cannot currently "
                            "perform this request."
                        ),
                    ),
                )

            name = missing.get(
                "name"
            )

            reason = missing.get(
                "reason"
            )

            if not name:
                name = (
                    "Unknown missing capability"
                )

            if not reason:
                reason = result.get(
                    "reason",
                    (
                        "Jarvis lacks a capability "
                        "required for this request."
                    ),
                )

            return self.capability_gap_result(
                name,
                reason,
            )

        # ========================================
        # UNKNOWN RESOLUTION
        # ========================================

        return self.capability_gap_result(
            "Resolve requested action",
            (
                f"Unknown resolver result: "
                f"{resolution}"
            ),
        )

    def _invalid_plan(
        self,
        invalid_name,
    ):
        return self.capability_gap_result(
            "Resolve requested action",
            (
                "The resolver produced an "
                "invalid execution plan. "
                f"Unknown capability: "
                f"{invalid_name}"
            ),
        )

    def resolve(
        self,
        user_request,
    ):
        messages = self.build_messages(
            user_request
        )

        result = self.llm.structured_chat(
            messages=messages,
            schema=RESOLUTION_SCHEMA,
            max_tokens=512,
        )

        # Useful during development.

        print()
        print(
            "[Resolver Raw Result]"
        )

        print(
            json.dumps(
                result,
                indent=2,
            )
        )

        validated = self.validate_resolution(
            result,
            user_request=user_request,
        )

        print()
        print(
            "[Resolver Validated Result]"
        )

        print(
            json.dumps(
                validated,
                indent=2,
            )
        )

        # ========================================
        # JEV DECISION GATE - OBSERVATION MODE
        # ========================================

        if self.decision_gate.available():

            try:
                available_capabilities = [
                    f"tool:{tool['name']}"
                    for tool in self.get_tool_catalog()
                ]

                available_capabilities.extend(
                    f"primitive:{name}"
                    for name
                    in self.host_registry.get_names()
                )

                jev_raw = self.decision_gate.evaluate(
                    user_request=user_request,
                    resolver_result=json.dumps(
                        validated
                    ),
                    available_capabilities=(
                        available_capabilities
                    ),
                )

                jev_decision = parse_decision(
                    jev_raw
                )

                print()
                print(
                    "[Jev Decision]"
                )

                print(
                    json.dumps(
                        jev_decision,
                        indent=2,
                    )
                )

            except Exception as exc:

                print()
                print(
                    f"[Jev Decision Gate Error] {exc}"
                )

        return validated