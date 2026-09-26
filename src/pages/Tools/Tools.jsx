import React, { useMemo, useState } from "react";
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
  const [tools, setTools] = useState(initialTools);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedTool, setSelectedTool] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const [newTool, setNewTool] = useState({
    name: "",
    description: "",
    category: "System",
  });

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesSearch =
        tool.name.toLowerCase().includes(search.toLowerCase()) ||
        tool.description.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        category === "All" ||
        (category === "Generated"
          ? tool.generated
          : tool.category === category);

      return matchesSearch && matchesCategory;
    });
  }, [tools, search, category]);

  const toggleTool = (id) => {
    setTools((current) =>
      current.map((tool) =>
        tool.id === id
          ? { ...tool, enabled: !tool.enabled }
          : tool
      )
    );
  };

  const createTool = () => {
    if (!newTool.name.trim()) return;

    const tool = {
      id: Date.now(),
      name: newTool.name,
      description:
        newTool.description || "Custom Jarvis capability.",
      category: newTool.category,
      generated: true,
      enabled: true,
      verified: false,
      runs: 0,
      icon: "✦",
    };

    setTools((current) => [tool, ...current]);
    setNewTool({
      name: "",
      description: "",
      category: "System",
    });
    setShowCreate(false);
  };

  const readyCount = tools.filter((tool) => tool.enabled).length;
  const generatedCount = tools.filter((tool) => tool.generated).length;
  const verifiedCount = tools.filter((tool) => tool.verified).length;
  const totalRuns = tools.reduce((sum, tool) => sum + tool.runs, 0);

  return (
    <div className="tools-page">
      <div className="tools-glow glow-a"></div>
      <div className="tools-glow glow-b"></div>

      <main className="tools-container">
        <header className="tools-header">
          <div>
            <p className="tools-eyebrow">JARVIS CAPABILITIES</p>
            <h1>Tools</h1>
            <p>
              Manage the capabilities Jarvis can use to interact
              with your system.
            </p>
          </div>

          <button
            className="tool-primary"
            onClick={() => setShowCreate(true)}
          >
            + Create Tool
          </button>
        </header>

        <section className="tool-stats">
          <StatCard
            value={readyCount}
            label="Tools Ready"
            status="green"
          />

          <StatCard
            value={generatedCount}
            label="Generated"
            status="purple"
          />

          <StatCard
            value={verifiedCount}
            label="Verified"
            status="blue"
          />

          <StatCard
            value={totalRuns}
            label="Total Runs"
            status="cyan"
          />
        </section>

        <section className="quick-tools">
          <div className="section-heading">
            <div>
              <h2>Quick Tools</h2>
              <p>Your most frequently used Jarvis capabilities.</p>
            </div>
          </div>

          <div className="quick-grid">
            {tools.slice(0, 4).map((tool) => (
              <button
                key={tool.id}
                className="quick-tool"
                onClick={() => setSelectedTool(tool)}
              >
                <span className="quick-icon">{tool.icon}</span>

                <div>
                  <strong>{tool.name}</strong>
                  <span>
                    {tool.enabled ? "Ready" : "Disabled"}
                  </span>
                </div>

                <span
                  className={`quick-status ${
                    tool.enabled ? "online" : ""
                  }`}
                ></span>
              </button>
            ))}
          </div>
        </section>

        <section className="tool-library">
          <div className="section-heading">
            <div>
              <h2>Tool Library</h2>
              <p>
                Search, inspect and manage available capabilities.
              </p>
            </div>
          </div>

          <div className="tool-controls">
            <div className="tool-search">
              <span>⌕</span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search tools..."
              />
            </div>

            <div className="category-buttons">
              {["All", "System", "Files", "Web", "Generated"].map(
                (item) => (
                  <button
                    key={item}
                    className={
                      category === item ? "selected" : ""
                    }
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="tools-grid">
            {filteredTools.map((tool) => (
              <article
                className={`tool-card ${
                  tool.generated ? "generated" : ""
                }`}
                key={tool.id}
              >
                <div className="tool-card-top">
                  <div className="tool-icon">{tool.icon}</div>

                  <div
                    className={`tool-state ${
                      tool.enabled ? "ready" : ""
                    }`}
                  >
                    <span></span>
                    {tool.enabled ? "READY" : "DISABLED"}
                  </div>
                </div>

                <h3>{tool.name}</h3>
                <p>{tool.description}</p>

                <div className="tool-tags">
                  <span>{tool.category}</span>

                  {tool.generated && (
                    <span className="generated-tag">
                      ✦ Generated
                    </span>
                  )}

                  {tool.verified && (
                    <span className="verified-tag">
                      ✓ Verified
                    </span>
                  )}
                </div>

                <div className="tool-card-footer">
                  <span>{tool.runs} runs</span>

                  <div>
                    <button
                      className="details-button"
                      onClick={() => setSelectedTool(tool)}
                    >
                      Details
                    </button>

                    <label className="tool-switch">
                      <input
                        type="checkbox"
                        checked={tool.enabled}
                        onChange={() => toggleTool(tool.id)}
                      />
                      <span></span>
                    </label>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {selectedTool && (
        <div
          className="tool-overlay"
          onClick={() => setSelectedTool(null)}
        >
          <aside
            className="tool-details-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="panel-close"
              onClick={() => setSelectedTool(null)}
            >
              ×
            </button>

            <p className="tools-eyebrow">TOOL DETAILS</p>

            <div className="detail-icon">
              {selectedTool.icon}
            </div>

            <h2>{selectedTool.name}</h2>

            <div className="detail-status">
              <span></span>
              {selectedTool.enabled ? "Ready" : "Disabled"}
            </div>

            <DetailBlock
              label="Description"
              value={selectedTool.description}
            />

            <DetailBlock
              label="Type"
              value={
                selectedTool.generated
                  ? "Jarvis Generated Tool"
                  : "System Tool"
              }
            />

            <DetailBlock
              label="Category"
              value={selectedTool.category}
            />

            <DetailBlock
              label="Executions"
              value={`${selectedTool.runs} runs`}
            />

            <div className="detail-security">
              <span>SECURITY</span>

              <p>
                {selectedTool.verified
                  ? "✓ Sandbox verified"
                  : "○ Awaiting sandbox verification"}
              </p>
            </div>

            <button className="test-tool-button">
              Test Tool
            </button>
          </aside>
        </div>
      )}

      {showCreate && (
        <div className="tool-modal-background">
          <div className="create-tool-modal">
            <div className="modal-heading">
              <div>
                <p className="tools-eyebrow">
                  NEW CAPABILITY
                </p>
                <h2>Create Tool</h2>
              </div>

              <button onClick={() => setShowCreate(false)}>
                ×
              </button>
            </div>

            <label>
              Tool Name
              <input
                value={newTool.name}
                onChange={(event) =>
                  setNewTool({
                    ...newTool,
                    name: event.target.value,
                  })
                }
                placeholder="Example: Organize Documents"
              />
            </label>

            <label>
              Description
              <textarea
                value={newTool.description}
                onChange={(event) =>
                  setNewTool({
                    ...newTool,
                    description: event.target.value,
                  })
                }
                placeholder="What should this tool do?"
              />
            </label>

            <label>
              Category
              <select
                value={newTool.category}
                onChange={(event) =>
                  setNewTool({
                    ...newTool,
                    category: event.target.value,
                  })
                }
              >
                <option>System</option>
                <option>Files</option>
                <option>Web</option>
              </select>
            </label>

            <div className="modal-warning">
              ✦ New tools should be sandbox tested before
              being approved for use.
            </div>

            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>

              <button
                className="tool-primary"
                onClick={createTool}
              >
                Generate Tool
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label, status }) {
  return (
    <div className="tool-stat">
      <span className={`stat-light ${status}`}></span>
      <strong>{value}</strong>
      <p>{label}</p>
    </div>
  );
}

function DetailBlock({ label, value }) {
  return (
    <div className="detail-block">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

export default Tools;