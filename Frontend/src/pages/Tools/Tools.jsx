import React, { useEffect, useId, useRef, useState } from "react";
import "./Tools.css";

const initialTools = [
  {
    id: 1,
    name: "Open Application",
    description: "Launch an installed application on this device.",
    category: "System",
    generated: false,
    enabled: true,
    verified: true,
    runs: 18,
    icon: ">_",
  },
  {
    id: 2,
    name: "Search Files",
    description: "Search local files and folders by name or type.",
    category: "Files",
    generated: false,
    enabled: true,
    verified: true,
    runs: 12,
    icon: "⌕",
  },
  {
    id: 3,
    name: "Create Directory",
    description: "Create a folder at a requested filesystem location.",
    category: "Files",
    generated: true,
    enabled: true,
    verified: true,
    runs: 7,
    icon: "▣",
  },
  {
    id: 4,
    name: "Web Research",
    description: "Gather information from supported online sources.",
    category: "Web",
    generated: false,
    enabled: true,
    verified: true,
    runs: 9,
    icon: "◎",
  },
  {
    id: 5,
    name: "Take Screenshot",
    description: "Capture the current screen for Jarvis to analyze.",
    category: "System",
    generated: false,
    enabled: true,
    verified: true,
    runs: 5,
    icon: "◫",
  },
  {
    id: 6,
    name: "Organize Downloads",
    description: "Sort downloaded files into appropriate folders.",
    category: "Files",
    generated: true,
    enabled: false,
    verified: true,
    runs: 3,
    icon: "⇄",
  },
];

function Tools() {
  const [items, setItems] = useState(initialTools);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState(null);
  const [create, setCreate] = useState(false);
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState("");
  const [previews, setPreviews] = useState(0);

  const tool = items.find((x) => x.id === selected);

  const inspect = (x) => {
    setSelected(x.id);
    setResult("");
  };

  const filtered = items.filter(
    (x) =>
      (x.name + " " + x.description)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (category === "All" ||
        (category === "Generated"
          ? x.generated
          : x.category === category))
  );

  function submit(e) {
    e.preventDefault();

    const f = new FormData(e.currentTarget);
    const name = f.get("name").trim();

    if (!name) return;

    setItems((a) => [
      {
        id: crypto.randomUUID(),
        name,
        description:
          f.get("description").trim() || "Custom Jarvis capability.",
        category: f.get("category"),
        generated: true,
        enabled: false,
        verified: false,
        runs: 0,
        icon: "✦",
      },
      ...a,
    ]);

    setCreate(false);
    setNotice("Tool draft created. No code was generated or executed.");
  }

  return (
    <Shell
      title="Tools"
      subtitle="The right capability, ready when you need it."
      notice={notice}
      action={
        <button
          className="j-primary"
          onClick={() => setCreate(true)}
        >
          + Create tool
        </button>
      }
    >
      <Stats
        items={[
          [items.filter((x) => x.enabled).length, "Enabled in demo"],
          [
            items.filter((x) => x.generated).length,
            "Generated / drafts",
          ],
          [items.filter((x) => !x.enabled).length, "Disabled"],
          [previews, "Previews this session"],
        ]}
      />

      <div className="j-heading">
        <div>
          <h2>Quick access</h2>
          <p>Your most-used sample capabilities.</p>
        </div>
      </div>

      <div className="j-grid">
        {[...items]
          .sort((a, b) => b.runs - a.runs)
          .slice(0, 3)
          .map((x) => (
            <button
              className="j-card"
              key={x.id}
              onClick={() => inspect(x)}
            >
              <div className="j-row-top">
                <span className="j-icon" aria-hidden="true">
                  {x.icon}
                </span>

                <Badge active={x.enabled}>
                  {x.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              <h3>{x.name}</h3>
              <span className="j-meta">Inspect capability →</span>
            </button>
          ))}
      </div>

      <div className="j-heading">
        <div>
          <h2>Tool library</h2>
          <p>Explore capabilities and control their demo availability.</p>
        </div>

        <span>{filtered.length} tools</span>
      </div>

      <Filters
        {...{ search, setSearch, category, setCategory }}
        options={["All", "System", "Files", "Web", "Generated"]}
      />

      <div className="j-grid">
        {filtered.map((x) => (
          <article className="j-card" key={x.id}>
            <div className="j-row-top">
              <span className="j-icon" aria-hidden="true">
                {x.icon}
              </span>

              <Badge active={x.enabled}>
                {x.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>

            <h3>{x.name}</h3>
            <p>{x.description}</p>

            <div className="j-actions">
              <Badge>{x.category}</Badge>
              {x.generated && <Badge>Generated draft</Badge>}
            </div>

            <div className="j-card-footer">
              <button onClick={() => inspect(x)}>
                Details
              </button>

              <button
                aria-pressed={x.enabled}
                aria-label={
                  (x.enabled ? "Disable " : "Enable ") + x.name
                }
                onClick={() =>
                  setItems((a) =>
                    a.map((v) =>
                      v.id === x.id
                        ? { ...v, enabled: !v.enabled }
                        : v
                    )
                  )
                }
              >
                {x.enabled ? "Disable" : "Enable"}
              </button>
            </div>
          </article>
        ))}
      </div>

      {!filtered.length && (
        <Empty
          reset={() => {
            setSearch("");
            setCategory("All");
          }}
        />
      )}

      {tool && (
        <Modal
          title={tool.name}
          close={() => setSelected(null)}
        >
          <Badge active={tool.enabled}>
            {tool.enabled ? "Enabled in demo" : "Disabled"}
          </Badge>

          <dl className="j-detail">
            <div>
              <dt>Purpose</dt>
              <dd>{tool.description}</dd>
            </div>

            <div>
              <dt>Category</dt>
              <dd>{tool.category}</dd>
            </div>

            <div>
              <dt>Sample run history</dt>
              <dd>{tool.runs} example runs</dd>
            </div>

            <div>
              <dt>Verification</dt>
              <dd>
                {tool.verified
                  ? "Verified in sample data only. No security test has been performed."
                  : "Unverified draft. No executable code is attached."}
              </dd>
            </div>
          </dl>

          <button
            className="j-primary"
            disabled={!tool.enabled}
            onClick={() => {
              setPreviews((n) => n + 1);

              setResult(
                "Preview complete for “" +
                  tool.name +
                  "”. In the connected app, this capability would: " +
                  tool.description +
                  " This preview performed no system or network action."
              );
            }}
          >
            Preview tool
          </button>

          <div role="status">
            {result && <p className="j-result">{result}</p>}
          </div>
        </Modal>
      )}

      {create && (
        <Modal
          title="Create tool draft"
          close={() => setCreate(false)}
        >
          <form className="j-form" onSubmit={submit}>
            <label>
              Name
              <input
                name="name"
                required
                maxLength={80}
                autoFocus
                placeholder="e.g. Organize documents"
              />
            </label>

            <label>
              Description
              <textarea
                name="description"
                maxLength={800}
                placeholder="Describe the capability…"
              />
            </label>

            <label>
              Category
              <select name="category">
                <option>System</option>
                <option>Files</option>
                <option>Web</option>
              </select>
            </label>

            <p>
              Create a demo entry to review. Code generation and
              execution are not connected.
            </p>

            <div className="j-actions">
              <button
                type="button"
                onClick={() => setCreate(false)}
              >
                Cancel
              </button>

              <button className="j-primary">
                Create draft
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
    <main className="tools-page j-page">
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

export default Tools;