import React, { useMemo, useState } from "react";
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
  const [files, setFiles] = useState(sampleFiles);
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [view, setView] = useState("list");

  const filteredFiles = useMemo(() => {
    return files.filter((file) =>
      file.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [files, search]);

  const handleMockUpload = (event) => {
    const uploaded = Array.from(event.target.files);

    const additions = uploaded.map((file) => ({
      id: Date.now() + Math.random(),
      name: file.name,
      type: file.type || "File",
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      modified: "Just now",
      location: "Imported Files",
      icon: "NEW",
    }));

    setFiles((current) => [...additions, ...current]);
  };

  return (
    <div className="files-page">
      <main className="files-container">
        <header className="files-header">
          <div>
            <p className="files-eyebrow">
              JARVIS FILE INTELLIGENCE
            </p>
            <h1>Files</h1>
            <p>
              Find, inspect and work with files available to
              Jarvis.
            </p>
          </div>

          <label className="file-import-button">
            + Import File
            <input
              type="file"
              multiple
              hidden
              onChange={handleMockUpload}
            />
          </label>
        </header>

        <section className="quick-access">
          <QuickFolder
            icon="▣"
            name="Projects"
            count="34 files"
          />

          <QuickFolder
            icon="▤"
            name="Documents"
            count="128 files"
          />

          <QuickFolder
            icon="↓"
            name="Downloads"
            count="16 files"
          />

          <QuickFolder
            icon="◫"
            name="Images"
            count="47 files"
          />
        </section>

        <section className="file-browser">
          <div className="file-browser-top">
            <div className="file-search">
              <span>⌕</span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search files..."
              />
            </div>

            <div className="view-controls">
              <button
                className={view === "list" ? "active" : ""}
                onClick={() => setView("list")}
              >
                ☷
              </button>

              <button
                className={view === "grid" ? "active" : ""}
                onClick={() => setView("grid")}
              >
                ▦
              </button>
            </div>
          </div>

          <div
            className={
              view === "grid"
                ? "file-grid"
                : "file-list"
            }
          >
            {view === "list" && (
              <div className="file-table-heading">
                <span>Name</span>
                <span>Type</span>
                <span>Size</span>
                <span>Modified</span>
              </div>
            )}

            {filteredFiles.map((file) => (
              <button
                key={file.id}
                className="file-row"
                onClick={() => setSelectedFile(file)}
              >
                <div className="file-name">
                  <div className="file-type-icon">
                    {file.icon}
                  </div>

                  <strong>{file.name}</strong>
                </div>

                <span>{file.type}</span>
                <span>{file.size}</span>
                <span>{file.modified}</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      {selectedFile && (
        <aside className="file-inspector">
          <button
            className="file-close"
            onClick={() => setSelectedFile(null)}
          >
            ×
          </button>

          <p className="files-eyebrow">FILE DETAILS</p>

          <div className="large-file-icon">
            {selectedFile.icon}
          </div>

          <h2>{selectedFile.name}</h2>
          <p className="file-subtitle">
            {selectedFile.type} • {selectedFile.size}
          </p>

          <FileInfo
            label="Location"
            value={selectedFile.location}
          />

          <FileInfo
            label="Modified"
            value={selectedFile.modified}
          />

          <div className="jarvis-file-actions">
            <span>JARVIS ACTIONS</span>

            <button>✦ Summarize</button>
            <button>◈ Ask About File</button>
            <button>⌕ Find Information</button>
            <button>↗ Open File</button>
          </div>

          <div className="file-ai-note">
            <span className="file-online-dot"></span>

            <div>
              <strong>Ready for Jarvis</strong>
              <p>
                Select an action to work with this file.
              </p>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

function QuickFolder({ icon, name, count }) {
  return (
    <button className="quick-folder">
      <span>{icon}</span>

      <div>
        <strong>{name}</strong>
        <p>{count}</p>
      </div>
    </button>
  );
}

function FileInfo({ label, value }) {
  return (
    <div className="file-info">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default Files;