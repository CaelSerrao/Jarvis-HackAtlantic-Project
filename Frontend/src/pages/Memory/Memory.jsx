import React, { useEffect, useId, useRef, useState } from "react";
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
  const [items, setItems] = useState(starterMemories);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState("");
  const [removed, setRemoved] = useState(null);
  const [pinnedOnly, setPinnedOnly] = useState(false);

  const filtered = items
    .filter(
      (x) =>
        (x.title + " " + x.content)
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (category === "All" || x.category === category) &&
        (!pinnedOnly || x.pinned)
    )
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  function submit(e) {
    e.preventDefault();

    const f = new FormData(e.currentTarget);
    const content = f.get("content").trim();

    if (!content) return;

    const value = {
      ...form,
      id: form.id || crypto.randomUUID(),
      title: f.get("title").trim() || "New memory",
      content,
      category: f.get("category"),
      date: "Just now",
      source: form.source || "Manually added",
      pinned: form.pinned || false,
    };

    setItems((a) =>
      form.id
        ? a.map((x) => (x.id === form.id ? value : x))
        : [value, ...a]
    );

    setForm(null);
    setNotice("Memory saved in this demo.");
  }

  return (
    <Shell
      title="Memory"
      subtitle="A little context makes every conversation better."
      notice={notice}
      action={
        <button
          className="j-primary"
          onClick={() => setForm({})}
        >
          + Add memory
        </button>
      }
    >
      <Stats
        items={[
          [items.length, "Stored memories"],
          [items.filter((x) => x.pinned).length, "Pinned"],
          [new Set(items.map((x) => x.category)).size, "Categories"],
          [
            items.filter((x) => x.category === "Workflows").length,
            "Workflows",
          ],
        ]}
      />

      <div className="j-heading">
        <div>
          <h2>Recently added</h2>
          <p>A glance at your latest context.</p>
        </div>

        <Badge>Session only</Badge>
      </div>

      <div className="j-grid">
        {items.slice(0, 3).map((x) => (
          <article className="j-card" key={x.id}>
            <div className="j-row-top">
              <Badge>{x.category}</Badge>
              <span className="j-meta">{x.date}</span>
            </div>

            <h3>{x.title}</h3>
            <p>{x.content}</p>
          </article>
        ))}
      </div>

      <div className="j-heading">
        <div>
          <h2>Memory library</h2>
          <p>Review, refine, or remove what Jarvis remembers.</p>
        </div>

        <button
          aria-pressed={pinnedOnly}
          onClick={() => setPinnedOnly((v) => !v)}
        >
          Pinned only
        </button>
      </div>

      <Filters
        {...{ search, setSearch, category, setCategory }}
        options={categories}
      />

      <div className="j-grid">
        {filtered.map((x) => (
          <article className="j-card" key={x.id}>
            <div className="j-row-top">
              <Badge>{x.category}</Badge>
              {x.pinned && <Badge active>Pinned</Badge>}
            </div>

            <h3>{x.title}</h3>
            <p>{x.content}</p>

            <div className="j-meta">
              {x.source} · {x.date}
            </div>

            <div className="j-card-footer">
              <button
                aria-pressed={x.pinned}
                aria-label={(x.pinned ? "Unpin " : "Pin ") + x.title}
                onClick={() =>
                  setItems((a) =>
                    a.map((v) =>
                      v.id === x.id
                        ? { ...v, pinned: !v.pinned }
                        : v
                    )
                  )
                }
              >
                {x.pinned ? "Unpin" : "Pin"}
              </button>

              <div className="j-actions">
                <button onClick={() => setForm(x)}>
                  Edit
                </button>

                <button
                  className="j-danger"
                  aria-label={"Delete " + x.title}
                  onClick={() => {
                    setRemoved(x);
                    setItems((a) => a.filter((v) => v.id !== x.id));
                    setNotice(
                      "Memory removed. Undo is available below."
                    );
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {!filtered.length && (
        <Empty
          reset={() => {
            setSearch("");
            setCategory("All");
            setPinnedOnly(false);
          }}
        />
      )}

      {removed && (
        <div className="j-heading">
          <p>Removed “{removed.title}”</p>

          <button
            onClick={() => {
              setItems((a) => [removed, ...a]);
              setRemoved(null);
              setNotice("Memory restored.");
            }}
          >
            Undo delete
          </button>
        </div>
      )}

      {form && (
        <Modal
          title={form.id ? "Edit memory" : "Add memory"}
          close={() => setForm(null)}
        >
          <form className="j-form" onSubmit={submit}>
            <label>
              Title
              <input
                name="title"
                defaultValue={form.title || ""}
                maxLength={100}
                autoFocus
                placeholder="A useful detail"
              />
            </label>

            <label>
              Memory
              <textarea
                name="content"
                defaultValue={form.content || ""}
                required
                maxLength={2000}
                placeholder="What would you like Jarvis to remember?"
              />
            </label>

            <label>
              Category
              <select
                name="category"
                defaultValue={form.category || "Preferences"}
              >
                {categories.slice(1).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>

            <p>
              Stored only while this page is open. No syncing or AI
              learning occurs.
            </p>

            <div className="j-actions">
              <button
                type="button"
                onClick={() => setForm(null)}
              >
                Cancel
              </button>

              <button className="j-primary">
                Save memory
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Shell>
  );
}

// State is intentionally session-only. No network, filesystem or execution APIs.
function Badge({ children, active = false }) {
  return (
    <span className={active ? "j-badge j-active" : "j-badge"}>
      {children}
    </span>
  );
}

function Stats({ items }) {
  return (
    <section className="j-stats" aria-label="Overview">
      {items.map(([value, label]) => (
        <div className="j-stat" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}

function Empty({ reset }) {
  return (
    <div className="j-empty">
      <span aria-hidden="true">⌕</span>
      <h3>Nothing here yet</h3>
      <p>Try another search or add something new.</p>

      <button onClick={reset}>Clear filters</button>
    </div>
  );
}

function Filters({
  search,
  setSearch,
  options,
  category,
  setCategory,
}) {
  return (
    <div className="j-controls">
      <label className="j-search">
        <span className="j-sr">Search library</span>

        <input
          type="search"
          placeholder="Search by name or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>

      <div className="j-tabs" aria-label="Filter library">
        {options.map((item) => (
          <button
            key={item}
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function Modal({ title, close, children }) {
  const ref = useRef(null);
  const heading = useId();

  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;

    dialog.showModal();

    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);

  return (
    <dialog
      className="j-modal"
      ref={ref}
      aria-labelledby={heading}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();

          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          ) {
            close();
          }
        }
      }}
    >
      <header className="j-modal-head">
        <div>
          <p className="j-eyebrow">JARVIS / PREVIEW</p>
          <h2 id={heading}>{title}</h2>
        </div>

        <button aria-label="Close dialog" onClick={close}>
          ×
        </button>
      </header>

      {children}
    </dialog>
  );
}

function Shell({ title, subtitle, action, notice, children }) {
  return (
    <main className="memory-page j-page">
      <div className="j-container">
        <header className="j-header">
          <div>
            <p className="j-eyebrow">JARVIS / WORKSPACE</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          {action}
        </header>

        <div className="j-demo">
          <Badge active>Demo workspace</Badge>
          <span>
            Sample data · Changes reset when you leave this page.
          </span>
        </div>

        {children}

        <div className="j-notice" role="status" aria-live="polite">
          {notice}
        </div>
      </div>
    </main>
  );
}

export default Memory;