import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { demoService } from "./service";
import Voice from "./Voice";
import "./workspace.css";

const pages = [
  "Settings",
  "Automation",
  "Memory",
  "Tools",
  "Files",
];

const sections = [
  "Profile",
  "Appearance",
  "AI & Usage",
  "Memory",
  "Tools & Security",
  "Voice",
  "System",
];

const categories = [
  "Preferences",
  "Projects",
  "Workflows",
  "Devices",
];

const ErrorContext = createContext("");

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("jarvis.theme");

      return ["Dark", "Light", "System"].includes(saved)
        ? saved
        : "Dark";
    } catch {
      return "Dark";
    }
  });

  const [systemLight, setSystemLight] = useState(
    () =>
      window.matchMedia(
        "(prefers-color-scheme: light)"
      ).matches
  );

  useEffect(() => {
    const media = window.matchMedia(
      "(prefers-color-scheme: light)"
    );

    const change = (event) => {
      setSystemLight(event.matches);
    };

    media.addEventListener("change", change);

    return () => {
      media.removeEventListener("change", change);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("jarvis.theme", theme);
    } catch {
      // The selected theme still works for this session.
    }
  }, [theme]);

  return {
    theme,
    setTheme,

    resolved:
      theme === "System"
        ? systemLight
          ? "light"
          : "dark"
        : theme.toLowerCase(),
  };
}

// HOME-PAGE HANDOFF
//
// Import Workspace directly into your teammate's home page/router.
//
// Optional props:
//   initialPage="Tools"
//   onHome={() => ...}
//   onSignOut={() => ...}
//   service={realService}
//
// Keep the service object stable; create it outside rendering.

export default function Workspace({
  service = demoService,
  initialPage = "Settings",
  onHome,
  onSignOut,
}) {
  const [page, setPage] = useState(
    pages.includes(initialPage) ? initialPage : "Settings"
  );

  const [section, setSection] = useState("Profile");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const lock = useRef(false);
  const request = useRef(0);
  const alive = useRef(false);
  const main = useRef(null);

  const appearance = useTheme();

  const reload = useCallback(async () => {
    const id = ++request.current;

    try {
      const snapshot = await service.load();

      if (alive.current && id === request.current) {
        setData(snapshot);
        setError("");
      }
    } catch (err) {
      if (alive.current && id === request.current) {
        setError(
          err.message || "Could not load workspace data."
        );
      }
    } finally {
      if (alive.current && id === request.current) {
        setLoading(false);
      }
    }
  }, [service]);

  useEffect(() => {
    alive.current = true;

    setData(null);
    setLoading(true);

    const unsubscribe = service.subscribe?.(reload);

    reload();

    return () => {
      alive.current = false;
      request.current += 1;
      unsubscribe?.();
    };
  }, [service, reload]);

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => {
      setNotice("");
    }, 6500);

    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    main.current?.scrollTo(0, 0);
  }, [page, section]);

  async function run(
    action,
    message = "Updated for this session."
  ) {
    if (lock.current) return false;

    lock.current = true;
    setBusy(true);
    setError("");

    try {
      const result = await action();

      if (alive.current) {
        await reload();

        setNotice(
          typeof result === "string" ? result : message
        );
      }

      return true;
    } catch (err) {
      if (alive.current) {
        setError(
          err.message ||
            "The change could not be saved. Try again."
        );
      }

      return false;
    } finally {
      lock.current = false;

      if (alive.current) {
        setBusy(false);
      }
    }
  }

  const ctx = {
    data,
    service,
    run,
    busy,
  };

  return (
    <ErrorContext.Provider value={error}>
      <div
        className="jx-app"
        data-theme={appearance.resolved}
      >
        <a className="jx-skip" href="#jarvis-content">
          Skip to content
        </a>

        <aside className="jx-sidebar">
          <div className="jx-brand">
            <span className="jx-orb" aria-hidden="true" />

            <div>
              <strong>JARVIS</strong>
              <p>Control center</p>
            </div>
          </div>

          <nav aria-label="Workspace pages">
            {onHome && (
              <button
                className="jx-nav"
                onClick={onHome}
              >
                ← Home
              </button>
            )}

            {pages.map((item) => (
              <button
                key={item}
                className="jx-nav"
                aria-current={
                  page === item ? "page" : undefined
                }
                onClick={() => setPage(item)}
              >
                <span aria-hidden="true">•</span>
                {item}
              </button>
            ))}
          </nav>

          {page === "Settings" && (
            <nav
              className="jx-subnav"
              aria-label="Settings sections"
            >
              <p className="jx-eyebrow">SETTINGS</p>

              {sections.map((item) => (
                <button
                  key={item}
                  aria-current={
                    section === item ? "page" : undefined
                  }
                  onClick={() => setSection(item)}
                >
                  {item}
                </button>
              ))}
            </nav>
          )}

          <div className="jx-sidebar-bottom">
            <span className="jx-badge">
              {data?.status || "Loading workspace"}
            </span>

            <p>One workspace. Your preferences.</p>

            {onSignOut && (
              <button onClick={onSignOut}>
                Exit workspace
              </button>
            )}
          </div>
        </aside>

        <main
          id="jarvis-content"
          className="jx-main"
          ref={main}
          tabIndex={-1}
        >
          <div className="jx-content">
            <header className="jx-header">
              <div>
                <p className="jx-eyebrow">
                  JARVIS CONTROL CENTER
                </p>

                <h1>
                  {page === "Settings" ? section : page}
                </h1>

                <p>
                  {page === "Settings"
                    ? "Configure how your personal intelligence works for you."
                    : "Your tools, context, and routines in one place."}
                </p>
              </div>

              <span className="jx-badge">
                {data?.status || "Loading"}
              </span>
            </header>

            {error && (
              <div className="jx-error" role="alert">
                {error}

                <button
                  onClick={reload}
                  disabled={busy}
                >
                  Refresh data
                </button>
              </div>
            )}

            {loading && (
              <p role="status">
                Loading your workspace…
              </p>
            )}

            {data && (
              <>
                {page === "Settings" ? (
                  <Settings
                    {...ctx}
                    section={section}
                    appearance={appearance}
                  />
                ) : (
                  <Library
                    key={page}
                    {...ctx}
                    page={page}
                  />
                )}
              </>
            )}

            <div
              className="jx-notice"
              role="status"
              aria-live="polite"
            >
              {notice}
            </div>
          </div>
        </main>
      </div>
    </ErrorContext.Provider>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <section className="jx-card">
      <div className="jx-card-heading">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>

      {children}
    </section>
  );
}

function Modal({
  title,
  close,
  busy,
  children,
}) {
  const ref = useRef(null);
  const id = useId();
  const error = useContext(ErrorContext);

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
      className="jx-modal"
      ref={ref}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();

        if (!busy) {
          close();
        }
      }}
    >
      <header>
        <h2 id={id}>{title}</h2>

        <button
          disabled={busy}
          aria-label="Close dialog"
          onClick={close}
        >
          ×
        </button>
      </header>

      {error && (
        <p className="jx-error" role="alert">
          {error}
        </p>
      )}

      {children}
    </dialog>
  );
}

function Editor({
  title,
  fields,
  initial = {},
  close,
  submit,
  busy,
}) {
  const [validation, setValidation] = useState("");

  async function save(event) {
    event.preventDefault();

    const values = Object.fromEntries(
      new FormData(event.currentTarget)
    );

    for (const key of Object.keys(values)) {
      values[key] = values[key].trim();
    }

    const missing = fields.some(
      (field) => field.required && !values[field.name]
    );

    if (missing) {
      setValidation("Complete all required fields.");
      return;
    }

    if (await submit(values)) {
      close();
    }
  }

  return (
    <Modal
      title={title}
      close={close}
      busy={busy}
    >
      <form className="jx-form" onSubmit={save}>
        <fieldset disabled={busy}>
          {fields.map((field) => (
            <label
              className="jx-field"
              key={field.name}
            >
              {field.label}

              {field.options ? (
                <select
                  name={field.name}
                  defaultValue={
                    initial[field.name] || field.options[0]
                  }
                >
                  {field.options.map((option) => (
                    <option key={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  name={field.name}
                  defaultValue={initial[field.name] || ""}
                  required={field.required}
                  maxLength={2000}
                />
              ) : (
                <input
                  name={field.name}
                  type={field.type || "text"}
                  defaultValue={initial[field.name] || ""}
                  required={field.required}
                  maxLength={120}
                />
              )}
            </label>
          ))}
        </fieldset>

        {validation && (
          <p className="jx-error" role="alert">
            {validation}
          </p>
        )}

        <div className="jx-actions">
          <button
            type="button"
            disabled={busy}
            onClick={close}
          >
            Cancel
          </button>

          <button
            className="jx-primary"
            disabled={busy}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Settings({
  data,
  service,
  run,
  busy,
  section,
  appearance,
}) {
  const [edit, setEdit] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoError, setPhotoError] = useState("");

  const photoInput = useRef(null);
  const settings = data.settings;

  useEffect(() => {
    return () => {
      if (photo) {
        URL.revokeObjectURL(photo);
      }
    };
  }, [photo]);

  const update = (patch) =>
    run(() => service.updateSettings(patch));

  function toggle(key, title, description) {
    return (
      <label className="jx-toggle" key={key}>
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>

        <input
          type="checkbox"
          checked={settings[key]}
          disabled={busy}
          onChange={(event) =>
            update({
              [key]: event.target.checked,
            })
          }
        />
      </label>
    );
  }

  function select(key, label, options) {
    return (
      <label className="jx-field">
        {label}

        <select
          value={settings[key]}
          disabled={busy}
          onChange={(event) =>
            update({
              [key]: event.target.value,
            })
          }
        >
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="jx-stack">
      {section === "Profile" && (
        <>
          <Card
            title="Your Jarvis profile"
            subtitle="Your identity in this workspace."
          >
            <div className="jx-profile">
              <div className="jx-photo-area">
                <div className="jx-avatar">
                  {photo ? (
                    <img
                      src={photo}
                      alt="Profile preview"
                    />
                  ) : (
                    data.profile.name.slice(0, 1)
                  )}
                </div>

                <button
                  onClick={() => photoInput.current.click()}
                >
                  Change photo
                </button>

                <input
                  ref={photoInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    event.target.value = "";

                    if (!file) return;

                    if (
                      !file.type.startsWith("image/") ||
                      file.size > 5 * 1024 * 1024
                    ) {
                      setPhotoError(
                        "Choose an image smaller than 5 MB."
                      );
                      return;
                    }

                    setPhotoError("");
                    setPhoto(URL.createObjectURL(file));
                  }}
                />

                <small>Local preview only</small>

                {photoError && (
                  <p role="alert">{photoError}</p>
                )}
              </div>

              <dl className="jx-details">
                {Object.entries(data.profile).map(
                  ([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>{value}</dd>
                    </div>
                  )
                )}
              </dl>
            </div>

            <button onClick={() => setEdit(true)}>
              Edit profile
            </button>
          </Card>

          <Card
            title="Account connection"
            subtitle="Your teammate can connect account management through the service adapter."
          >
            <p>
              Sign-in, password changes, and cloud syncing
              are not connected in this demo.
            </p>
          </Card>
        </>
      )}

      {section === "Appearance" && (
        <Card
          title="Interface"
          subtitle="Applies immediately to every page, sidebar, and dialog."
        >
          <div className="jx-theme-options">
            {["Dark", "Light", "System"].map((theme) => (
              <button
                key={theme}
                aria-pressed={appearance.theme === theme}
                onClick={() => appearance.setTheme(theme)}
              >
                <span
                  className={
                    "jx-theme-preview " +
                    `jx-preview-${theme.toLowerCase()}`
                  }
                  aria-hidden="true"
                />

                <strong>{theme}</strong>
              </button>
            ))}
          </div>

          <p className="jx-footnote">
            Saved on this device. System follows your
            operating system automatically.
          </p>
        </Card>
      )}

      {section === "AI & Usage" && (
        <>
          <Card
            title="Active AI"
            subtitle="Choose your preferred configuration."
          >
            {select("model", "Model", [
              "Phi-3 Mini",
              "Cloud AI",
            ])}

            {select("inference", "Inference mode", [
              "Automatic",
              "Local only",
              "Cloud only",
            ])}

            {toggle(
              "remoteFallback",
              "Remote fallback",
              "Preference only until a backend is connected."
            )}
          </Card>

          <Card
            title="Connection & usage"
            subtitle="Live information will come from your backend."
          >
            <p>
              No AI connection has been verified.
              Token usage is unavailable.
            </p>

            <p className="jx-footnote">
              Provider API keys belong in your backend,
              not in React or local storage.
            </p>
          </Card>
        </>
      )}

      {section === "Memory" && (
        <Card
          title="Memory preferences"
          subtitle="Control the context Jarvis should keep."
        >
          {toggle(
            "memoryEnabled",
            "Enable memory",
            "Allow remembered context when the backend is connected."
          )}

          {toggle(
            "saveHistory",
            "Conversation history",
            "Keep previous conversations."
          )}

          {toggle(
            "rememberPreferences",
            "Remember preferences",
            "Remember your preferred settings and choices."
          )}

          {toggle(
            "learnWorkflows",
            "Learn workflows",
            "Remember frequently used routines."
          )}

          <div className="jx-row">
            <div>
              <strong>Clear memory library</strong>

              <p>
                Remove the {data.memories.length} current
                memory entries.
              </p>
            </div>

            <button
              className="jx-danger"
              disabled={busy || !data.memories.length}
              onClick={() => setConfirmClear(true)}
            >
              Clear memory
            </button>
          </div>
        </Card>
      )}

      {section === "Tools & Security" && (
        <Card
          title="Tools & security"
          subtitle="Preferences for your teammate to enforce in the backend."
        >
          {toggle(
            "toolsEnabled",
            "Tool execution",
            "Allow approved tools. Demo previews never execute tools."
          )}

          {toggle(
            "toolGeneration",
            "Generate tools",
            "Allow new capability drafts."
          )}

          {toggle(
            "sandboxTools",
            "Sandbox tools",
            "Request isolated execution; not enforced by this frontend."
          )}

          {select(
            "toolApproval",
            "Approval policy",
            [
              "Always ask",
              "Ask for sensitive actions",
              "Run approved tools",
            ]
          )}
        </Card>
      )}

      {section === "Voice" && (
        <Voice
          settings={settings}
          update={update}
          busy={busy}
        />
      )}

      {section === "System" && (
        <>
          <Card
            title="Application"
            subtitle="Stored preferences; desktop behaviour requires Electron/backend integration."
          >
            {toggle(
              "launchOnStartup",
              "Launch on startup",
              "Preference only; does not modify Windows startup."
            )}

            {toggle(
              "runInBackground",
              "Run in background",
              "Preference only; does not change window closing behaviour."
            )}

            {toggle(
              "notifications",
              "Desktop notifications",
              "Preference only; does not request notification permission."
            )}
          </Card>

          <Card title="About Jarvis">
            <p>React + Electron Forge</p>

            <p>
              Workspace data stays available while switching
              pages. Demo data resets when the app reloads;
              appearance stays saved.
            </p>
          </Card>
        </>
      )}

      {edit && (
        <Editor
          title="Edit profile"
          fields={[
            {
              name: "name",
              label: "Name",
              required: true,
            },
            {
              name: "username",
              label: "Username",
              required: true,
            },
            {
              name: "email",
              label: "Email",
              type: "email",
              required: true,
            },
          ]}
          initial={data.profile}
          busy={busy}
          close={() => setEdit(false)}
          submit={(values) =>
            run(() => service.updateProfile(values))
          }
        />
      )}

      {confirmClear && (
        <Modal
          title="Clear all memories?"
          busy={busy}
          close={() => setConfirmClear(false)}
        >
          <p>
            This removes all entries from the current
            memory library.
          </p>

          <div className="jx-actions">
            <button
              disabled={busy}
              onClick={() => setConfirmClear(false)}
            >
              Cancel
            </button>

            <button
              className="jx-danger"
              disabled={busy}
              onClick={async () => {
                const success = await run(
                  () => service.clearMemory(),
                  "Memory library cleared."
                );

                if (success) {
                  setConfirmClear(false);
                }
              }}
            >
              Clear memories
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Library({
  page,
  data,
  service,
  run,
  busy,
}) {
  const name = {
    Automation: "automations",
    Memory: "memories",
    Tools: "tools",
    Files: "files",
  }[page];

  const rows = data[name];

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [form, setForm] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [view, setView] = useState("grid");
  const [result, setResult] = useState("");

  const input = useRef(null);

  const selected = rows.find(
    (row) => row.id === selectedId
  );

  const options =
    page === "Memory"
      ? ["All", "Pinned", ...categories]
      : page === "Tools"
        ? ["All", "System", "Files", "Web", "Generated"]
        : page === "Automation"
          ? ["All", "Enabled", "Paused"]
          : ["All", "Images", "Imported"];

  const filtered = rows
    .filter((row) => {
      const text =
        `${row.name || row.title} ` +
        `${row.description || row.content || row.location || ""}`;

      const matches = text
        .toLowerCase()
        .includes(search.toLowerCase());

      const categoryMatch =
        filter === "All" ||
        (filter === "Pinned"
          ? row.pinned
          : filter === "Generated"
            ? row.generated
            : filter === "Enabled"
              ? row.enabled
              : filter === "Paused"
                ? !row.enabled
                : filter === "Images"
                  ? row.type === "Image"
                  : filter === "Imported"
                    ? row.location === "Imported metadata"
                    : row.category === filter);

      return matches && categoryMatch;
    })
    .sort((a, b) =>
      page === "Memory"
        ? Number(b.pinned) - Number(a.pinned)
        : 0
    );

  const fields =
    page === "Memory"
      ? [
          {
            name: "title",
            label: "Title",
            required: true,
          },
          {
            name: "content",
            label: "Memory",
            type: "textarea",
            required: true,
          },
          {
            name: "category",
            label: "Category",
            options: categories,
          },
        ]
      : [
          {
            name: "name",
            label: "Name",
            required: true,
          },
          {
            name: "description",
            label: "Description",
            type: "textarea",
            required: true,
          },
          ...(page === "Automation"
            ? [
                {
                  name: "frequency",
                  label: "Frequency",
                  options: [
                    "Daily",
                    "Weekdays",
                    "Friday",
                    "Sunday",
                    "Monthly on the 1st",
                  ],
                },
                {
                  name: "time",
                  label: "Time",
                  type: "time",
                  required: true,
                },
              ]
            : [
                {
                  name: "category",
                  label: "Category",
                  options: ["System", "Files", "Web"],
                },
              ]),
        ];

  const save = (row) =>
    run(() => service.save(name, row));

  return (
    <div className="jx-stack">
      <Card
        title={`${page} library`}
        subtitle="Demo actions are simulated. No tasks run and no file contents are uploaded."
      >
        <div className="jx-row">
          <p>
            {rows.length} entries · {filtered.length} shown
          </p>

          <div className="jx-actions">
            {page === "Files" ? (
              <>
                <button
                  className="jx-primary"
                  disabled={busy}
                  onClick={() => input.current.click()}
                >
                  Import files
                </button>

                <input
                  type="file"
                  multiple
                  hidden
                  ref={input}
                  onChange={(event) => {
                    const files = Array.from(
                      event.target.files || []
                    );

                    event.target.value = "";

                    if (files.length) {
                      run(
                        () => service.importFiles(files),
                        "File metadata imported."
                      );
                    }
                  }}
                />

                <button
                  aria-pressed={view === "list"}
                  onClick={() =>
                    setView((current) =>
                      current === "grid" ? "list" : "grid"
                    )
                  }
                >
                  {view === "grid" ? "List view" : "Grid view"}
                </button>
              </>
            ) : (
              <button
                className="jx-primary"
                disabled={busy}
                onClick={() => setForm({})}
              >
                +{" "}
                {page === "Tools"
                  ? "Create draft"
                  : page === "Memory"
                    ? "Add memory"
                    : "New automation"}
              </button>
            )}
          </div>
        </div>

        <label className="jx-field">
          Search

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search names and descriptions…"
          />
        </label>

        <div
          className="jx-tabs"
          aria-label="Library filters"
        >
          {options.map((option) => (
            <button
              key={option}
              aria-pressed={filter === option}
              onClick={() => setFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </Card>

      <div
        className={
          page === "Automation" ||
          (page === "Files" && view === "list")
            ? "jx-stack"
            : "jx-grid"
        }
      >
        {filtered.map((row) => (
          <article
            className="jx-card jx-item"
            key={row.id}
          >
            <div className="jx-row">
              <span
                className="jx-icon"
                aria-hidden="true"
              >
                {page === "Automation"
                  ? "↻"
                  : page === "Files"
                    ? "▤"
                    : "◈"}
              </span>

              <span className="jx-badge">
                {page === "Memory"
                  ? row.category
                  : page === "Files"
                    ? row.type
                    : row.enabled
                      ? "Enabled in demo"
                      : "Paused"}
              </span>
            </div>

            <h2>{row.name || row.title}</h2>

            <p>
              {row.description || row.content || row.location}
            </p>

            {page === "Automation" && (
              <p className="jx-footnote">
                {row.frequency} · {row.time} ·{" "}
                {row.enabled ? "Demo schedule" : "Paused"}
              </p>
            )}

            {page === "Files" && (
              <p className="jx-footnote">
                {row.size} · Metadata only
              </p>
            )}

            {row.generated && (
              <span className="jx-badge">
                Generated draft · Unverified
              </span>
            )}

            <div className="jx-item-actions">
              {page === "Memory" ? (
                <button
                  disabled={busy}
                  aria-pressed={row.pinned}
                  onClick={() =>
                    save({
                      ...row,
                      pinned: !row.pinned,
                    })
                  }
                >
                  {row.pinned ? "Unpin" : "Pin"}
                </button>
              ) : (
                page !== "Files" && (
                  <button
                    disabled={busy}
                    aria-pressed={row.enabled}
                    onClick={() =>
                      save({
                        ...row,
                        enabled: !row.enabled,
                      })
                    }
                  >
                    {row.enabled ? "Pause" : "Enable"}
                  </button>
                )
              )}

              {page === "Files" || page === "Tools" ? (
                <button
                  onClick={() => {
                    setResult("");
                    setSelectedId(row.id);
                  }}
                >
                  Details
                </button>
              ) : (
                <button
                  disabled={busy}
                  onClick={() => setForm(row)}
                >
                  Edit
                </button>
              )}

              {page === "Automation" && (
                <button
                  disabled={busy || !row.enabled}
                  onClick={() =>
                    run(() => service.preview(name, row.id))
                  }
                >
                  Preview
                </button>
              )}

              {page !== "Files" && (
                <button
                  className="jx-danger"
                  disabled={busy}
                  aria-label={
                    `Delete ${row.name || row.title}`
                  }
                  onClick={() => setDeleting(row)}
                >
                  Delete
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {!filtered.length && (
        <Card
          title="Nothing here yet"
          subtitle="Try another filter or add a new entry."
        >
          <button
            onClick={() => {
              setSearch("");
              setFilter("All");
            }}
          >
            Clear filters
          </button>
        </Card>
      )}

      {page === "Automation" && (
        <Card title="Recent activity">
          {data.activity.length ? (
            data.activity.map((entry, index) => (
              <p className="jx-activity" key={index}>
                {entry}
              </p>
            ))
          ) : (
            <p>No previews yet this session.</p>
          )}
        </Card>
      )}

      {form && (
        <Editor
          title={
            `${form.id ? "Edit" : "Create"} ` +
            (page === "Memory"
              ? "memory"
              : page === "Tools"
                ? "tool draft"
                : "automation")
          }
          fields={fields}
          initial={form}
          busy={busy}
          close={() => setForm(null)}
          submit={(values) =>
            save({
              enabled: page !== "Tools",
              pinned: false,
              generated: page === "Tools",
              ...form,
              ...values,
            })
          }
        />
      )}

      {deleting && (
        <Modal
          title="Delete this entry?"
          busy={busy}
          close={() => setDeleting(null)}
        >
          <p>{deleting.name || deleting.title}</p>

          <div className="jx-actions">
            <button
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </button>

            <button
              className="jx-danger"
              disabled={busy}
              onClick={async () => {
                const success = await run(
                  () => service.remove(name, deleting.id),
                  "Entry deleted."
                );

                if (success) {
                  setDeleting(null);
                }
              }}
            >
              Delete entry
            </button>
          </div>
        </Modal>
      )}

      {selected && (
        <Modal
          title={selected.name}
          busy={busy}
          close={() => setSelectedId(null)}
        >
          <p>
            {selected.description || selected.location}
          </p>

          <p className="jx-footnote">
            {page === "Tools"
              ? "Demo capability. No executable code or verified backend connection."
              : "File metadata only. No file contents have been read."}
          </p>

          <div className="jx-actions">
            {(page === "Files"
              ? [
                  "Summarize",
                  "Ask about file",
                  "Find information",
                  "Open file",
                ]
              : ["Preview tool"]
            ).map((action) => (
              <button
                key={action}
                disabled={
                  busy || selected.enabled === false
                }
                onClick={() =>
                  run(async () => {
                    try {
                      const message =
                        await service.preview(
                          name,
                          selected.id,
                          action
                        );

                      setResult(message);
                      return message;
                    } catch (err) {
                      setResult(err.message);
                      throw err;
                    }
                  })
                }
              >
                {action}
              </button>
            ))}
          </div>

          <p role="status" className="jx-footnote">
            {result}
          </p>
        </Modal>
      )}
    </div>
  );
}

// Standalone demo entry point.
// Your teammate can bypass this and import Workspace directly.

export function JarvisApp() {
  const [entered, setEntered] = useState(false);

  return entered ? (
    <Workspace
      onSignOut={() => setEntered(false)}
    />
  ) : (
    <DemoSignIn
      enter={() => setEntered(true)}
    />
  );
}

function DemoSignIn({ enter }) {
  const { resolved } = useTheme();
  const [show, setShow] = useState(false);

  return (
    <div
      className="jx-app jx-login"
      data-theme={resolved}
    >
      <main className="jx-card">
        <div className="jx-brand">
          <span className="jx-orb" aria-hidden="true" />
          <strong>JARVIS</strong>
        </div>

        <p className="jx-eyebrow">
          YOUR WORKSPACE AWAITS
        </p>

        <h1>Welcome back.</h1>

        <p>
          One place for your tools, context, and routines.
        </p>

        <form
          className="jx-form"
          onSubmit={(event) => {
            event.preventDefault();
            enter();
          }}
        >
          <label className="jx-field">
            Email
            <input
              type="email"
              required
              autoComplete="email"
            />
          </label>

          <label className="jx-field">
            Demo password
            <input
              type={show ? "text" : "password"}
              required
              autoComplete="off"
            />
          </label>

          <label className="jx-toggle">
            <span>Show password</span>

            <input
              type="checkbox"
              checked={show}
              onChange={(event) =>
                setShow(event.target.checked)
              }
            />
          </label>

          <button className="jx-primary">
            Sign in to demo
          </button>
        </form>

        <button onClick={enter}>
          Explore without signing in
        </button>

        <p className="jx-footnote">
          Preview only. Credentials are not checked,
          stored, or sent.
        </p>
      </main>
    </div>
  );
}