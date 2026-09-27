import React, { useId, useState } from "react";
import "./SignIn.css";

function SignIn({ onSignIn }) {
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password to continue.");
      return;
    }

    setError("");

    // Frontend preview only.
    // Connect your authentication backend here later.
    // The password is never saved or sent anywhere.
    onSignIn();
  }

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
              FRONTEND PREVIEW
            </span>

            <span className="signin-card-symbol" aria-hidden="true">
              ✦
            </span>
          </div>

          <div className="signin-heading">
            <p className="signin-eyebrow">YOUR WORKSPACE AWAITS</p>
            <h2 id="signin-title">Welcome back.</h2>
            <p>A little focus starts here.</p>
          </div>

          <form className="signin-form" onSubmit={handleSubmit}>
            <div className="signin-field">
              <label htmlFor={emailId}>Email address</label>

              <input
                id={emailId}
                name="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder="you@example.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
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
                  placeholder="Enter a demo password"
                  autoComplete="off"
                  aria-describedby={error ? errorId : undefined}
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

            {error && (
              <p className="signin-error" id={errorId} role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="signin-submit">
              <span>Sign in to demo</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <div className="signin-divider">
            <span />
            <p>or explore first</p>
            <span />
          </div>

          <button
            type="button"
            className="signin-demo-button"
            onClick={() => onSignIn()}
          >
            Explore demo workspace
          </button>

          <div className="signin-preview-note">
            <span className="signin-note-icon" aria-hidden="true">
              ◇
            </span>

            <p>
              This is a preview. Use sample details—credentials are not
              verified, saved, or sent.
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