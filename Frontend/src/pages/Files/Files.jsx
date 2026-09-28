import React, { useEffect, useId, useRef, useState } from "react";
import "./Files.css";

const sampleFiles = [
  {
    id: 1,
    name: "Jarvis Architecture.pdf",
    type: "PDF",
    size: "4.2 MB",
    modified: "2 min ago",
    location: "Documents / Jarvis",
    icon: "PDF",
  },
  {
    id: 2,
    name: "Hackathon Notes.txt",
    type: "Text",
    size: "24 KB",
    modified: "Today",
    location: "Documents",
    icon: "TXT",
  },
  {
    id: 3,
    name: "Presentation.pptx",
    type: "Presentation",
    size: "12.8 MB",
    modified: "Yesterday",
    location: "Documents / Hackathon",
    icon: "PPT",
  },
  {
    id: 4,
    name: "Research.docx",
    type: "Document",
    size: "1.3 MB",
    modified: "Yesterday",
    location: "Documents",
    icon: "DOC",
  },
  {
    id: 5,
    name: "jarvis-ui.png",
    type: "Image",
    size: "2.8 MB",
    modified: "Sep 25",
    location: "Pictures",
    icon: "IMG",
  },
];

function Files() {
  const [items, setItems] = useState(sampleFiles);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState("");
  const input = useRef(null);

  const match = (x, c) =>
    c === "All" ||
    (c === "Projects"
      ? /Jarvis|Hackathon/i.test(x.location)
      : c === "Documents"
        ? ["PDF", "Text", "Document", "Presentation"].includes(x.type)
        : c === "Images"
          ? x.type === "Image"
          : c === "Downloads"
            ? x.location.includes("Downloads")
            : x.location === "Imported files");

  const filtered = items.filter(
    (x) =>
      (x.name + " " + x.location)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      match(x, category)
  );

  function add(e) {
    const picked = Array.from(e.target.files || []);

    if (!picked.length) return;

    const added = picked.map((f) => {
      const ext = f.name.split(".").pop().toLowerCase();

      const type =
        {
          pdf: "PDF",
          txt: "Text",
          md: "Text",
          doc: "Document",
          docx: "Document",
          ppt: "Presentation",
          pptx: "Presentation",
          png: "Image",
          jpg: "Image",
          jpeg: "Image",
          gif: "Image",
          webp: "Image",
        }[ext] || "File";

      return {
        id: crypto.randomUUID(),
        name: f.name,
        type,
        size:
          f.size < 1024
            ? f.size + " B"
            : f.size < 1048576
              ? (f.size / 1024).toFixed(1) + " KB"
              : (f.size / 1048576).toFixed(1) + " MB",
        modified: "Just now",
        location: "Imported files",
        icon:
          type === "Image"
            ? "IMG"
            : ext.slice(0, 4).toUpperCase(),
      };
    });

    setItems((a) => [...added, ...a]);
    setCategory("Imported");
    setSearch("");
    setNotice(
      added.length +
        " file entries added. Contents were not read or uploaded."
    );

    e.target.value = "";
  }

  return (
    <Shell
      title="Files"
      subtitle="A clear view of the files that matter to you."
      notice={notice}
      action={
        <>
          <button
            className="j-primary"
            onClick={() => input.current.click()}
          >
            + Import files
          </button>

          <input
            ref={input}
            type="file"
            multiple
            hidden
            onChange={add}
          />
        </>
      }
    >
      <div className="j-stats">
        {["Projects", "Documents", "Downloads", "Images"].map((c) => (
          <button
            className="j-stat"
            key={c}
            aria-pressed={category === c}
            onClick={() =>
              setCategory((v) => (v === c ? "All" : c))
            }
          >
            <span>{c}</span>
            <strong>{items.filter((x) => match(x, c)).length}</strong>
            <span>file entries →</span>
          </button>
        ))}
      </div>

      <div className="j-heading">
        <div>
          <h2>File library</h2>
          <p>Browse sample files or add local file details.</p>
        </div>

        <div className="j-tabs" aria-label="View style">
          {["list", "grid"].map((x) => (
            <button
              key={x}
              aria-pressed={view === x}
              onClick={() => setView(x)}
            >
              {x === "list" ? "List" : "Grid"}
            </button>
          ))}
        </div>
      </div>

      <Filters
        {...{ search, setSearch, category, setCategory }}
        options={[
          "All",
          "Projects",
          "Documents",
          "Downloads",
          "Images",
          "Imported",
        ]}
      />

      <p className="j-meta">
        {filtered.length} of {items.length} file entries · Select a file
        to inspect
      </p>

      <div
        className={view === "grid" ? "j-grid" : "j-file-list"}
        style={{ marginTop: 16 }}
      >
        {filtered.map((x) => (
          <button
            className="j-file-row"
            key={x.id}
            onClick={() => {
              setSelected(x);
              setResult("");
            }}
          >
            <div className="j-file-name">
              <div className="j-icon" aria-hidden="true">
                {x.icon}
              </div>

              <strong>{x.name}</strong>
            </div>

            <span>{x.type}</span>
            <span>{x.size}</span>
            <span>{x.modified}</span>
          </button>
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

      <section className="j-panel">
        <h2>Your files stay with you</h2>
        <p>
          Imports add names, sizes, and types to this preview. File
          contents stay unread, and nothing is uploaded.
        </p>
      </section>

      {selected && (
        <Modal
          title={selected.name}
          close={() => setSelected(null)}
        >
          <Badge>
            {selected.type} · {selected.size}
          </Badge>

          <dl className="j-detail">
            <div>
              <dt>Location</dt>
              <dd>{selected.location}</dd>
            </div>

            <div>
              <dt>Added / modified</dt>
              <dd>{selected.modified}</dd>
            </div>

            <div>
              <dt>Availability</dt>
              <dd>
                {selected.location === "Imported files"
                  ? "Metadata only · File contents not loaded"
                  : "Sample entry · No file attached"}
              </dd>
            </div>
          </dl>

          <h3>Explore Jarvis actions</h3>
          <p>Choose an action to preview its purpose.</p>

          <div className="j-actions" style={{ marginTop: 16 }}>
            {[
              "Summarize",
              "Ask about file",
              "Find information",
              "Open file",
            ].map((action) => (
              <button
                key={action}
                onClick={() =>
                  setResult(
                    {
                      Summarize:
                        "A connected Jarvis would read the file and produce a summary.",
                      "Ask about file":
                        "A connected Jarvis would answer questions using this file as context.",
                      "Find information":
                        "A connected Jarvis would search within the file for relevant passages.",
                      "Open file":
                        "A connected Jarvis would open this file in its associated application.",
                    }[action] +
                      " This is a preview; no file was read or opened."
                  )
                }
              >
                {action}
              </button>
            ))}
          </div>

          <div role="status">
            {result && <p className="j-result">{result}</p>}
          </div>
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
    <main className="files-page j-page">
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

export default Files;