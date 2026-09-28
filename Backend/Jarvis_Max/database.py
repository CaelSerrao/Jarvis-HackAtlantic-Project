import platform
import re
import sqlite3
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

DATA_DIR.mkdir(exist_ok=True)

DB_PATH = DATA_DIR / "jarvis.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)

    conn.row_factory = sqlite3.Row

    conn.execute("PRAGMA foreign_keys = ON")

    return conn


def initialize_database():
    conn = get_connection()

    conn.executescript("""
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            tier TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,

            UNIQUE(user_id, name),

            FOREIGN KEY(user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            device_id INTEGER,
            title TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(user_id)
                REFERENCES users(id)
                ON DELETE CASCADE,

            FOREIGN KEY(device_id)
                REFERENCES devices(id)
                ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(conversation_id)
                REFERENCES conversations(id)
                ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            importance INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tool_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER,
            tool_name TEXT NOT NULL,
            arguments TEXT,
            result TEXT,
            success INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(conversation_id)
                REFERENCES conversations(id)
                ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS missing_capabilities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            capability TEXT NOT NULL,
            reason TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY(user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        );
    """)

    conn.commit()
    conn.close()


def get_or_create_user(name="local_user"):
    conn = get_connection()

    row = conn.execute(
        "SELECT id FROM users WHERE name = ?",
        (name,)
    ).fetchone()

    if row:
        user_id = row["id"]

    else:
        cursor = conn.execute(
            "INSERT INTO users (name) VALUES (?)",
            (name,)
        )

        user_id = cursor.lastrowid

        conn.commit()

    conn.close()

    return user_id


def get_or_create_device(user_id, tier="max"):
    device_name = platform.node()

    conn = get_connection()

    row = conn.execute(
        """
        SELECT id
        FROM devices
        WHERE user_id = ?
        AND name = ?
        """,
        (
            user_id,
            device_name
        )
    ).fetchone()

    if row:
        device_id = row["id"]

        conn.execute(
            """
            UPDATE devices
            SET last_seen = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (device_id,)
        )

    else:
        cursor = conn.execute(
            """
            INSERT INTO devices (
                user_id,
                name,
                tier
            )
            VALUES (?, ?, ?)
            """,
            (
                user_id,
                device_name,
                tier
            )
        )

        device_id = cursor.lastrowid

    conn.commit()
    conn.close()

    return device_id


def create_conversation(
    user_id,
    device_id,
    title="Jarvis conversation"
):
    conn = get_connection()

    cursor = conn.execute(
        """
        INSERT INTO conversations (
            user_id,
            device_id,
            title
        )
        VALUES (?, ?, ?)
        """,
        (
            user_id,
            device_id,
            title
        )
    )

    conversation_id = cursor.lastrowid

    conn.commit()
    conn.close()

    return conversation_id


def get_latest_conversation(
    user_id,
    device_id
):
    conn = get_connection()

    row = conn.execute(
        """
        SELECT id
        FROM conversations
        WHERE user_id = ?
        AND device_id = ?
        ORDER BY updated_at DESC
        LIMIT 1
        """,
        (
            user_id,
            device_id
        )
    ).fetchone()

    conn.close()

    if row:
        return row["id"]

    return create_conversation(
        user_id,
        device_id
    )


def add_message(
    conversation_id,
    role,
    content
):
    conn = get_connection()

    conn.execute(
        """
        INSERT INTO messages (
            conversation_id,
            role,
            content
        )
        VALUES (?, ?, ?)
        """,
        (
            conversation_id,
            role,
            content
        )
    )

    conn.execute(
        """
        UPDATE conversations
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (conversation_id,)
    )

    conn.commit()
    conn.close()


def get_recent_messages(
    conversation_id,
    limit=12
):
    conn = get_connection()

    rows = conn.execute(
        """
        SELECT role, content
        FROM messages
        WHERE conversation_id = ?
        ORDER BY id DESC
        LIMIT ?
        """,
        (
            conversation_id,
            limit
        )
    ).fetchall()

    conn.close()

    return [
        dict(row)
        for row in reversed(rows)
    ]


def add_memory(
    user_id,
    content,
    category="general",
    importance=1
):
    conn = get_connection()

    cursor = conn.execute(
        """
        INSERT INTO memories (
            user_id,
            content,
            category,
            importance
        )
        VALUES (?, ?, ?, ?)
        """,
        (
            user_id,
            content,
            category,
            importance
        )
    )

    memory_id = cursor.lastrowid

    conn.commit()
    conn.close()

    return memory_id


def search_memories(
    user_id,
    query,
    limit=8
):
    words = re.findall(
        r"[a-zA-Z0-9]+",
        query.lower()
    )

    words = [
        word
        for word in words
        if len(word) >= 3
    ]

    conn = get_connection()

    if not words:
        rows = conn.execute(
            """
            SELECT *
            FROM memories
            WHERE user_id = ?
            ORDER BY importance DESC,
                     updated_at DESC
            LIMIT ?
            """,
            (
                user_id,
                limit
            )
        ).fetchall()

    else:
        conditions = " OR ".join(
            ["LOWER(content) LIKE ?" for _ in words]
        )

        parameters = [
            f"%{word}%"
            for word in words
        ]

        sql = f"""
            SELECT *
            FROM memories
            WHERE user_id = ?
            AND ({conditions})
            ORDER BY importance DESC,
                     updated_at DESC
            LIMIT ?
        """

        rows = conn.execute(
            sql,
            [
                user_id,
                *parameters,
                limit
            ]
        ).fetchall()

    conn.close()

    return [
        dict(row)
        for row in rows
    ]


def list_memories(user_id):
    conn = get_connection()

    rows = conn.execute(
        """
        SELECT *
        FROM memories
        WHERE user_id = ?
        ORDER BY importance DESC,
                 updated_at DESC
        """,
        (user_id,)
    ).fetchall()

    conn.close()

    return [
        dict(row)
        for row in rows
    ]


def log_tool_run(
    conversation_id,
    tool_name,
    arguments,
    result,
    success
):
    conn = get_connection()

    conn.execute(
        """
        INSERT INTO tool_runs (
            conversation_id,
            tool_name,
            arguments,
            result,
            success
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            conversation_id,
            tool_name,
            arguments,
            result,
            int(success)
        )
    )

    conn.commit()
    conn.close()

def get_latest_missing_capability(
    user_id
):
    conn = get_connection()

    row = conn.execute(
        """
        SELECT
            id,
            capability,
            reason,
            created_at

        FROM missing_capabilities

        WHERE user_id = ?

        ORDER BY id DESC

        LIMIT 1
        """,
        (user_id,)
    ).fetchone()

    conn.close()

    if not row:
        return None

    return dict(row)

def record_missing_capability(
    user_id,
    capability,
    reason=None
):
    conn = get_connection()

    cursor = conn.execute(
        """
        INSERT INTO missing_capabilities (
            user_id,
            capability,
            reason
        )
        VALUES (?, ?, ?)
        """,
        (
            user_id,
            capability,
            reason
        )
    )

    capability_id = cursor.lastrowid

    conn.commit()
    conn.close()

    return capability_id