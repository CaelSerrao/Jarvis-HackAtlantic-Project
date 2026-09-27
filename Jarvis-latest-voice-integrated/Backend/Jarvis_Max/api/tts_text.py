import re


def make_tts_safe(
    text: str
) -> str:

    if not text:
        return ""


    result = str(
        text
    )


    # -----------------------------------------
    # Remove fenced code blocks
    # -----------------------------------------

    result = re.sub(
        r"```[\s\S]*?```",
        "",
        result
    )


    # -----------------------------------------
    # Remove inline code formatting
    # but keep the actual text
    # -----------------------------------------

    result = re.sub(
        r"`([^`]+)`",
        r"\1",
        result
    )


    # -----------------------------------------
    # Markdown links:
    #
    # [OpenAI](https://openai.com)
    # becomes:
    # OpenAI
    # -----------------------------------------

    result = re.sub(
        r"\[([^\]]+)\]\([^)]+\)",
        r"\1",
        result
    )


    # -----------------------------------------
    # Remove raw URLs
    # -----------------------------------------

    result = re.sub(
        r"https?://\S+",
        "",
        result
    )


    # -----------------------------------------
    # Remove common citation markers
    #
    # [1]
    # [2, 3]
    # [4-6]
    # -----------------------------------------

    result = re.sub(
        r"\[\s*\d+(?:\s*[-,]\s*\d+)*\s*\]",
        "",
        result
    )


    # -----------------------------------------
    # Remove Markdown headings
    # -----------------------------------------

    result = re.sub(
        r"^\s*#{1,6}\s*",
        "",
        result,
        flags=re.MULTILINE
    )


    # -----------------------------------------
    # Remove Markdown blockquotes
    # -----------------------------------------

    result = re.sub(
        r"^\s*>\s*",
        "",
        result,
        flags=re.MULTILINE
    )


    # -----------------------------------------
    # Remove Markdown bullets
    # -----------------------------------------

    result = re.sub(
        r"^\s*[-*+]\s+",
        "",
        result,
        flags=re.MULTILINE
    )


    # -----------------------------------------
    # Remove numbered-list formatting
    #
    # 1. Hello
    # becomes:
    # Hello
    # -----------------------------------------

    result = re.sub(
        r"^\s*\d+[.)]\s+",
        "",
        result,
        flags=re.MULTILINE
    )


    # -----------------------------------------
    # Remove bold / italic markers
    # -----------------------------------------

    result = result.replace(
        "**",
        ""
    )

    result = result.replace(
        "__",
        ""
    )

    result = result.replace(
        "*",
        ""
    )

    result = result.replace(
        "_",
        " "
    )


    # -----------------------------------------
    # Remove HTML tags
    # -----------------------------------------

    result = re.sub(
        r"<[^>]+>",
        "",
        result
    )


    # -----------------------------------------
    # Replace symbols that TTS may read badly
    # -----------------------------------------

    replacements = {
        "&": " and ",
        "→": " then ",
        "←": " from ",
        "=>": " then ",
        "->": " then ",
        "%": " percent ",
    }


    for old, new in (
        replacements.items()
    ):
        result = result.replace(
            old,
            new
        )


    # -----------------------------------------
    # Remove leftover brackets/braces that are
    # usually formatting rather than speech
    # -----------------------------------------

    result = re.sub(
        r"[{}\[\]]",
        "",
        result
    )


    # -----------------------------------------
    # Normalize whitespace
    # -----------------------------------------

    result = re.sub(
        r"[ \t]+",
        " ",
        result
    )

    result = re.sub(
        r"\n{2,}",
        "\n",
        result
    )


    return result.strip()