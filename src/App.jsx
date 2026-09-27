import React, { useState } from "react";

import SignIn from "./pages/SignIn/SignIn";
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
  const [demoOpen, setDemoOpen] = useState(false);
  const [activePage, setActivePage] = useState("Settings");

  const ActivePage = pages[activePage];

  function handleSignIn() {
    setActivePage("Settings");
    setDemoOpen(true);
  }

  function handleSignOut() {
    setDemoOpen(false);
    setActivePage("Settings");
  }

  if (!demoOpen) {
    return <SignIn onSignIn={handleSignIn} />;
  }

  return (
    <div className="jarvis-demo-app">
      <nav
        className="jarvis-demo-nav"
        aria-label="Page preview navigation"
      >
        {Object.keys(pages).map((page) => (
          <button
            key={page}
            type="button"
            aria-pressed={activePage === page}
            onClick={() => setActivePage(page)}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          className="jarvis-demo-signout"
          onClick={handleSignOut}
        >
          Exit demo
        </button>
      </nav>

      <ActivePage />
    </div>
  );
}

export default App;