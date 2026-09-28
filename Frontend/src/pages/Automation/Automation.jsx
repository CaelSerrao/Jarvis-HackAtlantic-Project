import React, { useEffect, useId, useRef, useState } from "react";
import "./Automation.css";

const starterAutomations = [
  {
    id: 1,
    name: "Morning Briefing",
    description:
      "Prepare a summary of important information for the day.",
    schedule: "Every day • 8:00 AM",
    nextRun: "Tomorrow, 8:00 AM",
    lastRun: "Today, 8:00 AM",
    enabled: true,
    status: "Success",
  },
  {
    id: 2,
    name: "Organize Downloads",
    description:
      "Sort downloaded files into their appropriate folders.",
    schedule: "Every Friday • 6:00 PM",
    nextRun: "Friday, 6:00 PM",
    lastRun: "Last Friday",
    enabled: true,
    status: "Success",
  },
  {
    id: 3,
    name: "Project Backup",
    description:
      "Prepare selected project files for backup.",
    schedule: "Every Sunday • 9:00 PM",
    nextRun: "Sunday, 9:00 PM",
    lastRun: "Sunday",
    enabled: false,
    status: "Paused",
  },
];

function Automation() {
  const [items, setItems] = useState(starterAutomations);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [create, setCreate] = useState(false);
  const [notice, setNotice] = useState("");
  const [activity, setActivity] = useState([
    "Sample history · Morning Briefing preview completed.",
    "Sample history · Project Backup paused.",
  ]);
  const [removed, setRemoved] = useState(null);
  const [runs, setRuns] = useState(0);

  const filtered = items.filter(
    (x) =>
      (x.name + " " + x.description)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (category === "All" ||
        (category === "Enabled" ? x.enabled : !x.enabled))
  );

  const log = (text) => {
    setActivity((a) => [text, ...a].slice(0, 6));
    setNotice(text);
  };

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
          f.get("description").trim() || "Custom Jarvis workflow.",
        schedule: f.get("frequency") + " · " + f.get("time"),
        enabled: true,
        lastRun: "Not previewed",
      },
      ...a,
    ]);

    setCreate(false);
    log(name + " added to this demo.");
  }

  return (
    <Shell
      title="Automation"
      subtitle="Build a calmer day, one routine at a time."
      notice={notice}
      action={
        <button
          className="j-primary"
          onClick={() => setCreate(true)}
        >
          + New automation
        </button>
      }
    >
      <Stats
        items={[
          [items.length, "Total workflows"],
          [items.filter((x) => x.enabled).length, "Enabled in demo"],
          [items.filter((x) => !x.enabled).length, "Paused"],
          [runs, "Previews this session"],
        ]}
      />

      <div className="j-heading">
        <div>
          <h2>Your workflows</h2>
          <p>Recurring routines, ready for you to shape.</p>
        </div>

        <span>{filtered.length} shown</span>
      </div>

      <Filters
        {...{ search, setSearch, category, setCategory }}
        options={["All", "Enabled", "Paused"]}
      />

      <div className="j-stack">
        {filtered.map((x) => (
          <article className="j-card j-workflow" key={x.id}>
            <div className="j-icon" aria-hidden="true">
              ↻
            </div>

            <div>
              <div className="j-row-top">
                <h3>{x.name}</h3>

                <Badge active={x.enabled}>
                  {x.enabled ? "Enabled" : "Paused"}
                </Badge>
              </div>

              <p>{x.description}</p>

              <div className="j-meta">
                {x.schedule} ·{" "}
                {x.enabled ? "Demo schedule only" : "Schedule paused"}
              </div>

              <div className="j-meta">{x.lastRun}</div>
            </div>

            <div className="j-actions">
              <button
                disabled={!x.enabled}
                onClick={() => {
                  setRuns((n) => n + 1);

                  setItems((a) =>
                    a.map((v) =>
                      v.id === x.id
                        ? { ...v, lastRun: "Previewed this session" }
                        : v
                    )
                  );

                  log(
                    "Preview complete: " +
                      x.name +
                      ". No task was executed."
                  );
                }}
              >
                Preview
              </button>

              <button
                aria-label={(x.enabled ? "Pause " : "Enable ") + x.name}
                aria-pressed={x.enabled}
                onClick={() => {
                  setItems((a) =>
                    a.map((v) =>
                      v.id === x.id
                        ? { ...v, enabled: !v.enabled }
                        : v
                    )
                  );

                  log(
                    x.name +
                      (x.enabled ? " paused." : " enabled in demo.")
                  );
                }}
              >
                {x.enabled ? "Pause" : "Enable"}
              </button>

              <button
                className="j-danger"
                aria-label={"Delete " + x.name}
                onClick={() => {
                  setRemoved(x);
                  setItems((a) => a.filter((v) => v.id !== x.id));
                  log(x.name + " removed. Undo is available below.");
                }}
              >
                Delete
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

      {removed && (
        <div className="j-heading">
          <p>Removed “{removed.name}”</p>

          <button
            onClick={() => {
              setItems((a) => [removed, ...a]);
              setRemoved(null);
              setNotice("Workflow restored.");
            }}
          >
            Undo delete
          </button>
        </div>
      )}

      <section className="j-panel">
        <h2>Recent activity</h2>
        <p>Sample history and your preview actions.</p>

        {activity.map((text, i) => (
          <div className="j-activity" key={i}>
            {text}
          </div>
        ))}
      </section>

      {create && (
        <Modal
          title="Create automation"
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
                placeholder="e.g. Morning briefing"
              />
            </label>

            <label>
              What should Jarvis do?
              <textarea
                name="description"
                maxLength={800}
                placeholder="Describe the routine…"
              />
            </label>

            <label>
              Frequency
              <select name="frequency">
                <option>Daily</option>
                <option>Weekly on Friday</option>
                <option>Weekdays</option>
                <option>Monthly on the 1st</option>
              </select>
            </label>

            <label>
              Time
              <input
                name="time"
                type="time"
                defaultValue="08:00"
                required
              />
            </label>

            <p>
              Save a demo routine. Scheduling is not connected yet.
            </p>

            <div className="j-actions">
              <button
                type="button"
                onClick={() => setCreate(false)}
              >
                Cancel
              </button>

              <button className="j-primary">
                Create automation
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
    <main className="automation-page j-page">
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

export default Automation;