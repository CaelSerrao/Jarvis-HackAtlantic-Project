from pathlib import Path


KNOWN_LOCATIONS = {
    "home": Path.home(),
    "desktop": Path.home() / "Desktop",
    "documents": Path.home() / "Documents",
    "downloads": Path.home() / "Downloads",
    "pictures": Path.home() / "Pictures",
    "music": Path.home() / "Music",
    "videos": Path.home() / "Videos"
}


ALIASES = {
    "my desktop": "desktop",
    "the desktop": "desktop",
    "my documents": "documents",
    "the documents": "documents",
    "my downloads": "downloads",
    "the downloads": "downloads",
    "my pictures": "pictures",
    "my music": "music",
    "my videos": "videos",
    "my home": "home"
}


def resolve_user_path(path_value):

    if path_value is None:
        return None

    value = str(
        path_value
    ).strip()

    normalized = (
        value
        .replace("\\", "/")
        .strip("/")
    )

    lower_value = normalized.lower()

    if lower_value in ALIASES:
        lower_value = ALIASES[
            lower_value
        ]

    if lower_value in KNOWN_LOCATIONS:
        return str(
            KNOWN_LOCATIONS[
                lower_value
            ].resolve()
        )

    parts = normalized.split("/")

    if parts:

        first_part = (
            parts[0]
            .lower()
            .strip()
        )

        if first_part in ALIASES:
            first_part = ALIASES[
                first_part
            ]

        if first_part in KNOWN_LOCATIONS:

            resolved = KNOWN_LOCATIONS[
                first_part
            ]

            for part in parts[1:]:
                resolved = resolved / part

            return str(
                resolved.resolve()
            )

    path = Path(
        value
    )

    if path.is_absolute():
        return str(
            path.resolve()
        )

    return str(
        (
            Path.cwd()
            / path
        ).resolve()
    )