import React, { useId, useState } from "react";
import "./SignIn.css";

function SignIn({ onSubmit, initialError = "" }) {
  const usernameId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const errorId = useId();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,32}$/.test(normalizedUsername)) {
      setError("Use 3–32 characters: letters, numbers, or underscores.");
      return;
    }

    if (!password.trim()) {
      setError("Enter any password to continue with the local placeholder account.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit({ username: normalizedUsername, password, mode });
    } catch (submitError) {
      setError(submitError.message || "Authentication failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
  }

  const displayedError = error || initialError;

  return (
    <main className="signin-page">
      <div className="signin-glow signin-glow-one" aria-hidden="true" />
      <div className="signin-glow signin-glow-two" aria-hidden="true" />

      <div className="signin-layout">
        <section className="signin-intro" aria-labelledby="signin-intro-title">
          <div className="signin-brand">
            <div className="signin-brand-mark" aria-hidden="true">
              <span />
            </div>

            <div>
              <span className="signin-brand-name">JARVIS</span>
              <span className="signin-brand-caption">
                Your personal intelligence
              </span>
            </div>
          </div>

          <div className="signin-intro-content">
            <p className="signin-eyebrow">A LITTLE LESS EFFORT. A LOT MORE FOCUS.</p>

            <h1 id="signin-intro-title">
              Your world.
              <br />
              <span>Working together.</span>
            </h1>

            <p className="signin-intro-description">
              Bring your files, ideas, and everyday routines into one
              thoughtful workspace.
            </p>

            <div className="signin-features">
              <Feature
                symbol="↻"
                title="Make room for what matters"
                description="Shape recurring tasks into simple routines."
              />

              <Feature
                symbol="◈"
                title="Keep useful context close"
                description="Organize the details you want Jarvis to remember."
              />

              <Feature
                symbol="⌕"
                title="Find your next step"
                description="Bring your tools and files into a clearer view."
              />
            </div>
          </div>

          <p className="signin-intro-footer">
            Built around your workflow.
          </p>
        </section>

        <section className="signin-card" aria-labelledby="signin-title">
          <div className="signin-card-top">
            <span className="signin-preview-badge">
              <span aria-hidden="true" />
              LOCAL ACCOUNT
            </span>

            <span className="signin-card-symbol" aria-hidden="true">
              ✦
            </span>
          </div>

          <div className="signin-heading">
            <p className="signin-eyebrow">YOUR WORKSPACE AWAITS</p>
            <h2 id="signin-title">{mode === "login" ? "Welcome back." : "Create your account."}</h2>
            <p>{mode === "login" ? "A little focus starts here." : "Choose your Jarvis account details."}</p>
          </div>

          <form className="signin-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
            <div className="signin-field">
              <label htmlFor={usernameId}>Username</label>

              <input
                id={usernameId}
                name="username"
                type="text"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setError("");
                }}
                placeholder="your_username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                minLength={3}
                maxLength={32}
                pattern="[A-Za-z0-9_]{3,32}"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="signin-field">
              <label htmlFor={passwordId}>Password</label>

              <div className="signin-password-field">
                <input
                  id={passwordId}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  placeholder="Enter your password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  aria-describedby={displayedError ? errorId : undefined}
                  minLength={1}
                  maxLength={128}
                  disabled={isSubmitting}
                  required
                />

                <button
                  type="button"
                  className="signin-password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div className="signin-field">
                <label htmlFor={confirmPasswordId}>Confirm password</label>
                <input
                  id={confirmPasswordId}
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setError("");
                  }}
                  autoComplete="new-password"
                  minLength={1}
                  maxLength={128}
                  disabled={isSubmitting}
                  required
                />
              </div>
            )}

            {displayedError && (
              <p className="signin-error" id={errorId} role="alert">
                {displayedError}
              </p>
            )}

            <button type="submit" className="signin-submit" disabled={isSubmitting}>
              <span>{isSubmitting ? "Please wait…" : mode === "login" ? "Sign in to Jarvis" : "Create account"}</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <div className="signin-divider">
            <span />
            <p>{mode === "login" ? "New to Jarvis?" : "Already have an account?"}</p>
            <span />
          </div>

          <button
            type="button"
            className="signin-demo-button"
            onClick={() => changeMode(mode === "login" ? "signup" : "login")}
            disabled={isSubmitting}
          >
            {mode === "login" ? "Create an account" : "Return to sign in"}
          </button>

          <div className="signin-preview-note">
            <span className="signin-note-icon" aria-hidden="true">
              ◇
            </span>

            <p>
              Prototype login only. Your username is stored locally so you can enter the Jarvis workspace; the password is not sent to the backend or saved.
            </p>
          </div>

          <p className="signin-card-footer">
            Your next idea starts here.
          </p>
        </section>
      </div>

      <footer className="signin-page-footer">
        <span>JARVIS</span>
        <span>Personal intelligence, thoughtfully connected.</span>
      </footer>
    </main>
  );
}

function Feature({ symbol, title, description }) {
  return (
    <div className="signin-feature">
      <div className="signin-feature-icon" aria-hidden="true">
        {symbol}
      </div>

      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default SignIn;
