import React, { useState } from "react";

import Settings from "./pages/Settings/Settings";
import Automation from "./pages/Automation/Automation";
import Memory from "./pages/Memory/Memory";
import Tools from "./pages/Tools/Tools";
import Files from "./pages/Files/Files";

const pages = {
  Settings,
  Automation,
  Memory,
  Tools,
  Files,
};

function App() {
  const [activePage, setActivePage] = useState("Settings");
  const ActivePage = pages[activePage];

  return (
    <div>
      <nav
        aria-label="Page preview navigation"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          padding: "12px 20px",
          background: "#07111e",
          borderBottom: "1px solid rgba(120, 177, 225, 0.2)",
        }}
      >
        {Object.keys(pages).map((page) => (
          <button
            key={page}
            type="button"
            aria-pressed={activePage === page}
            onClick={() => setActivePage(page)}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border:
                activePage === page
                  ? "1px solid #42a5ff"
                  : "1px solid rgba(120, 177, 225, 0.2)",
              background:
                activePage === page ? "#163b5c" : "transparent",
              color: activePage === page ? "#89d7ff" : "#edf6ff",
              fontFamily: "inherit",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            {page}
          </button>
        ))}
      </nav>

      <ActivePage />
    </div>
  );
}

export default App;