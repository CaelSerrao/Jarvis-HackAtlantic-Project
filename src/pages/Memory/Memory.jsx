import React, { useMemo, useState } from "react";
import "./Memory.css";

const starterMemories = [
  {
    id: 1,
    title: "Preferred Development Environment",
    content: "Prefers using VS Code for programming projects.",
    category: "Preferences",
    date: "Just now",
    source: "Conversation",
    pinned: true,
  },
  {
    id: 2,
    title: "Current Project",
    content:
      "Currently working on the Jarvis HackAtlantic project.",
    category: "Projects",
    date: "12 min ago",
    source: "Conversation",
    pinned: true,
  },
  {
    id: 3,
    title: "Morning Workflow",
    content:
      "Frequently checks upcoming tasks before starting development work.",
    category: "Workflows",
    date: "Today",
    source: "Learned Workflow",
    pinned: false,
  },
  {
    id: 4,
    title: "AI Preference",
    content:
      "Prefers local AI processing when sufficient hardware is available.",
    category: "Preferences",
    date: "Yesterday",
    source: "Settings",
    pinned: false,
  },
  {
    id: 5,
    title: "Primary Device",
    content: "Uses a Windows computer as the primary Jarvis device.",
    category: "Devices",
    date: "Yesterday",
    source: "Device",
    pinned: false,
  },
];

const categories = [
  "All",
  "Preferences",
  "Projects",
  "Workflows",
  "Devices",
];

function Memory() {
  const [memories, setMemories] = useState(starterMemories);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showAdd, setShowAdd] = useState(false);

  const [newMemory, setNewMemory] = useState({
    title: "",
    content: "",
    category: "Preferences",
  });

  const filtered = useMemo(() => {
    return memories.filter((memory) => {
      const matchesSearch =
        memory.title
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        memory.content
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesCategory =
        category === "All" || memory.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [memories, search, category]);

  const addMemory = () => {
    if (!newMemory.content.trim()) return;

    setMemories((current) => [
      {
        id: Date.now(),
        title: newMemory.title || "New Memory",
        content: newMemory.content,
        category: newMemory.category,
        date: "Just now",
        source: "Manually Added",
        pinned: false,
      },
      ...current,
    ]);

    setNewMemory({
      title: "",
      content: "",
      category: "Preferences",
    });

    setShowAdd(false);
  };

  const deleteMemory = (id) => {
    setMemories((current) =>
      current.filter((memory) => memory.id !== id)
    );
  };

  const togglePin = (id) => {
    setMemories((current) =>
      current.map((memory) =>
        memory.id === id
          ? { ...memory, pinned: !memory.pinned }
          : memory
      )
    );
  };

  return (
    <div className="memory-page">
      <main className="memory-container">
        <header className="memory-header">
          <div>
            <p className="memory-eyebrow">
              JARVIS PERSONAL INTELLIGENCE
            </p>

            <h1>Memory</h1>

            <p>
              View and control what Jarvis remembers about you.
            </p>
          </div>

          <button
            className="memory-primary"
            onClick={() => setShowAdd(true)}
          >
            + Add Memory
          </button>
        </header>

        <section className="memory-overview">
          <div className="memory-core">
            <div className="memory-orb">
              <div></div>
            </div>

            <div>
              <span>JARVIS MEMORY</span>
              <strong>{memories.length} Memories</strong>
              <p>
                <i></i>
                Memory system active
              </p>
            </div>
          </div>

          <MemoryMetric
            value={
              memories.filter((memory) => memory.pinned)
                .length
            }
            label="Pinned"
          />

          <MemoryMetric
            value={
              memories.filter(
                (memory) =>
                  memory.category === "Workflows"
              ).length
            }
            label="Workflows"
          />

          <MemoryMetric value="100%" label="Synced" />
        </section>

        <section className="recent-memory-section">
          <div className="memory-section-title">
            <div>
              <h2>Recently Stored</h2>
              <p>
                The newest information Jarvis has remembered.
              </p>
            </div>

            <span>LIVE</span>
          </div>

          <div className="recent-memory-grid">
            {memories.slice(0, 3).map((memory) => (
              <div
                className="recent-memory-card"
                key={memory.id}
              >
                <div className="recent-memory-top">
                  <span>{memory.category}</span>
                  <time>{memory.date}</time>
                </div>

                <strong>{memory.title}</strong>
                <p>{memory.content}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="memory-library">
          <div className="memory-search">
            <span>⌕</span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search Jarvis memory..."
            />
          </div>

          <div className="memory-categories">
            {categories.map((item) => (
              <button
                key={item}
                className={
                  category === item ? "active" : ""
                }
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="memory-list">
            {filtered.map((memory) => (
              <article
                className="memory-card"
                key={memory.id}
              >
                <div className="memory-category-icon">
                  ◈
                </div>

                <div className="memory-content">
                  <div className="memory-card-title">
                    <h3>{memory.title}</h3>

                    {memory.pinned && (
                      <span>PINNED</span>
                    )}
                  </div>

                  <p>{memory.content}</p>

                  <div className="memory-source">
                    {memory.source} • {memory.date}
                  </div>
                </div>

                <div className="memory-actions">
                  <button
                    onClick={() => togglePin(memory.id)}
                  >
                    {memory.pinned ? "Unpin" : "Pin"}
                  </button>

                  <button
                    className="delete-memory"
                    onClick={() =>
                      deleteMemory(memory.id)
                    }
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {showAdd && (
        <div className="memory-modal-background">
          <div className="memory-modal">
            <div className="memory-modal-heading">
              <div>
                <p className="memory-eyebrow">
                  PERSONAL KNOWLEDGE
                </p>
                <h2>Add Memory</h2>
              </div>

              <button onClick={() => setShowAdd(false)}>
                ×
              </button>
            </div>

            <label>
              Title
              <input
                value={newMemory.title}
                onChange={(event) =>
                  setNewMemory({
                    ...newMemory,
                    title: event.target.value,
                  })
                }
                placeholder="Memory title"
              />
            </label>

            <label>
              What should Jarvis remember?
              <textarea
                value={newMemory.content}
                onChange={(event) =>
                  setNewMemory({
                    ...newMemory,
                    content: event.target.value,
                  })
                }
                placeholder="Enter information..."
              />
            </label>

            <label>
              Category
              <select
                value={newMemory.category}
                onChange={(event) =>
                  setNewMemory({
                    ...newMemory,
                    category: event.target.value,
                  })
                }
              >
                {categories
                  .filter((item) => item !== "All")
                  .map((item) => (
                    <option key={item}>{item}</option>
                  ))}
              </select>
            </label>

            <div className="memory-modal-actions">
              <button
                className="memory-cancel"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </button>

              <button
                className="memory-primary"
                onClick={addMemory}
              >
                Save Memory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MemoryMetric({ value, label }) {
  return (
    <div className="memory-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export default Memory;