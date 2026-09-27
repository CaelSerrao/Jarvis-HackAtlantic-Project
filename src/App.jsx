import React, { useEffect, useState } from "react";

import SignIn from "./pages/SignIn/SignIn";
import Settings from "./pages/Settings/Settings";
import Automation from "./pages/Automation/Automation";
import Memory from "./pages/Memory/Memory";
import Tools from "./pages/Tools/Tools";
import Files from "./pages/Files/Files";
import Chat from "./pages/Chat/Chat";
import { getCurrentUser, signIn, signOut, signUp } from "./services/auth";

const pages = { Chat, Settings, Automation, Memory, Tools, Files };

function App() {
  const [user, setUser] = useState(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [signOutError, setSignOutError] = useState("");
  const [activePage, setActivePage] = useState("Settings");

  const ActivePage = pages[activePage];

  useEffect(() => {
    let isActive = true;

    getCurrentUser()
      .then((currentUser) => {
        if (isActive) setUser(currentUser);
      })
      .catch((error) => {
        if (isActive) setSessionError(error.message);
      })
      .finally(() => {
        if (isActive) setIsRestoringSession(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function handleSignIn({ username, password, mode }) {
    if (mode === "signup") {
      await signUp(username, password);
    }

    const authenticatedUser = await signIn(username, password);
    setUser(authenticatedUser);
    setActivePage("Settings");
    setSessionError("");
  }

  async function handleSignOut() {
    setSignOutError("");
    try {
      await signOut();
      setUser(null);
      setActivePage("Settings");
    } catch (error) {
      setSignOutError(error.message);
    }
  }

  if (isRestoringSession) {
    return (
      <main className="signin-page" aria-live="polite">
        <p className="signin-session-status">Restoring your Jarvis session…</p>
      </main>
    );
  }

  if (!user) {
    return <SignIn onSubmit={handleSignIn} initialError={sessionError} />;
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
          Sign out
        </button>
      </nav>

      {signOutError && (
        <p className="signin-error signin-signout-error" role="alert">
          {signOutError}
        </p>
      )}

      <ActivePage />
    </div>
  );
}

export default App;
