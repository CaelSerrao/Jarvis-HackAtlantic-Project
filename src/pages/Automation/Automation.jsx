import React, { useMemo, useState } from "react";
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
  const [automations, setAutomations] =
    useState(starterAutomations);

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [newAutomation, setNewAutomation] = useState({
    name: "",
    description: "",
    frequency: "Daily",
    time: "08:00",
  });

  const filtered = useMemo(() => {
    return automations.filter((automation) =>
      automation.name
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [automations, search]);

  const toggleAutomation = (id) => {
    setAutomations((current) =>
      current.map((automation) =>
        automation.id === id
          ? {
              ...automation,
              enabled: !automation.enabled,
              status: automation.enabled
                ? "Paused"
                : "Ready",
            }
          : automation
      )
    );
  };

  const deleteAutomation = (id) => {
    setAutomations((current) =>
      current.filter((automation) => automation.id !== id)
    );
  };

  const createAutomation = () => {
    if (!newAutomation.name.trim()) return;

    setAutomations((current) => [
      {
        id: Date.now(),
        name: newAutomation.name,
        description:
          newAutomation.description ||
          "Custom Jarvis automation.",
        schedule: `${newAutomation.frequency} • ${newAutomation.time}`,
        nextRun: "Scheduled",
        lastRun: "Never",
        enabled: true,
        status: "Ready",
      },
      ...current,
    ]);

    setNewAutomation({
      name: "",
      description: "",
      frequency: "Daily",
      time: "08:00",
    });

    setShowCreate(false);
  };

  const activeCount = automations.filter(
    (item) => item.enabled
  ).length;

  return (
    <div className="automation-page">
      <main className="automation-container">
        <header className="automation-header">
          <div>
            <p className="auto-eyebrow">
              JARVIS WORKFLOWS
            </p>
            <h1>Automation</h1>
            <p>
              Let Jarvis handle recurring tasks and workflows
              automatically.
            </p>
          </div>

          <button
            className="auto-primary"
            onClick={() => setShowCreate(true)}
          >
            + New Automation
          </button>
        </header>

        <div className="automation-stats">
          <div>
            <span className="pulse-dot"></span>
            <strong>{activeCount}</strong>
            <p>Active</p>
          </div>

          <div>
            <strong>{automations.length}</strong>
            <p>Total Workflows</p>
          </div>

          <div>
            <strong>24</strong>
            <p>Runs This Week</p>
          </div>

          <div>
            <strong>96%</strong>
            <p>Success Rate</p>
          </div>
        </div>

        <div className="automation-search">
          <span>⌕</span>
          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search automations..."
          />
        </div>

        <section className="automation-list">
          <div className="auto-section-heading">
            <h2>Your Automations</h2>
            <span>{filtered.length} workflows</span>
          </div>

          {filtered.map((automation) => (
            <article
              className="automation-card"
              key={automation.id}
            >
              <div className="automation-icon">⚡</div>

              <div className="automation-info">
                <div className="automation-name-row">
                  <h3>{automation.name}</h3>

                  <span
                    className={`automation-status ${
                      automation.enabled ? "active" : ""
                    }`}
                  >
                    <i></i>
                    {automation.enabled
                      ? "ACTIVE"
                      : "PAUSED"}
                  </span>
                </div>

                <p>{automation.description}</p>

                <div className="automation-meta">
                  <span>◷ {automation.schedule}</span>
                  <span>Next: {automation.nextRun}</span>
                  <span>
                    Last: {automation.lastRun}
                  </span>
                </div>
              </div>

              <div className="automation-actions">
                <label className="automation-switch">
                  <input
                    type="checkbox"
                    checked={automation.enabled}
                    onChange={() =>
                      toggleAutomation(automation.id)
                    }
                  />
                  <span></span>
                </label>

                <button
                  className="automation-delete"
                  onClick={() =>
                    deleteAutomation(automation.id)
                  }
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </section>

        <section className="activity-panel">
          <div className="auto-section-heading">
            <h2>Recent Activity</h2>
          </div>

          <Activity
            text="Morning Briefing completed successfully"
            time="Today • 8:00 AM"
          />

          <Activity
            text="Organize Downloads completed"
            time="Yesterday • 6:00 PM"
          />

          <Activity
            text="Project Backup was paused"
            time="Yesterday"
            paused
          />
        </section>
      </main>

      {showCreate && (
        <div className="automation-modal-background">
          <div className="automation-modal">
            <div className="automation-modal-header">
              <div>
                <p className="auto-eyebrow">
                  NEW WORKFLOW
                </p>
                <h2>Create Automation</h2>
              </div>

              <button onClick={() => setShowCreate(false)}>
                ×
              </button>
            </div>

            <label>
              Automation Name
              <input
                value={newAutomation.name}
                onChange={(event) =>
                  setNewAutomation({
                    ...newAutomation,
                    name: event.target.value,
                  })
                }
                placeholder="Example: Morning Briefing"
              />
            </label>

            <label>
              What should Jarvis do?
              <textarea
                value={newAutomation.description}
                onChange={(event) =>
                  setNewAutomation({
                    ...newAutomation,
                    description: event.target.value,
                  })
                }
                placeholder="Describe the workflow..."
              />
            </label>

            <div className="automation-form-grid">
              <label>
                Frequency
                <select
                  value={newAutomation.frequency}
                  onChange={(event) =>
                    setNewAutomation({
                      ...newAutomation,
                      frequency: event.target.value,
                    })
                  }
                >
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Weekdays</option>
                  <option>Monthly</option>
                </select>
              </label>

              <label>
                Time
                <input
                  type="time"
                  value={newAutomation.time}
                  onChange={(event) =>
                    setNewAutomation({
                      ...newAutomation,
                      time: event.target.value,
                    })
                  }
                />
              </label>
            </div>

            <div className="automation-modal-actions">
              <button
                className="auto-cancel"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>

              <button
                className="auto-primary"
                onClick={createAutomation}
              >
                Create Automation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Activity({ text, time, paused }) {
  return (
    <div className="activity-row">
      <div
        className={`activity-check ${
          paused ? "paused" : ""
        }`}
      >
        {paused ? "—" : "✓"}
      </div>

      <div>
        <strong>{text}</strong>
        <span>{time}</span>
      </div>
    </div>
  );
}

export default Automation;