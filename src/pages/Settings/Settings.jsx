import React, { useEffect, useRef, useState } from "react";
import "./Settings.css";

function Settings() {
  const [activeSection, setActiveSection] = useState("Profile");

  // Profile
  const [profilePicture, setProfilePicture] = useState(null);

  // Appearance
  const [theme, setTheme] = useState("Dark");

  // AI
  const [inferenceMode, setInferenceMode] = useState("Automatic");
  const [remoteFallback, setRemoteFallback] = useState(true);

  // Memory
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [saveHistory, setSaveHistory] = useState(true);
  const [rememberPreferences, setRememberPreferences] = useState(true);
  const [learnWorkflows, setLearnWorkflows] = useState(true);

  // Tools
  const [toolsEnabled, setToolsEnabled] = useState(true);
  const [toolGeneration, setToolGeneration] = useState(true);
  const [sandboxTools, setSandboxTools] = useState(true);
  const [toolApproval, setToolApproval] = useState("Always Ask");

  // Voice
  const [microphones, setMicrophones] = useState([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState("");
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);

  // System
  const [notifications, setNotifications] = useState(true);
  const [launchOnStartup, setLaunchOnStartup] = useState(false);
  const [runInBackground, setRunInBackground] = useState(true);

  // Placeholder values until backend is connected
  const tokensUsed = 21580;
  const tokenLimit = 100000;
  const tokensRemaining = tokenLimit - tokensUsed;
  const tokenPercentage = Math.round(
    (tokensRemaining / tokenLimit) * 100
  );

  const sections = [
    "Profile",
    "Appearance",
    "AI & Usage",
    "Memory",
    "Tools & Security",
    "Voice",
    "System",
  ];

  useEffect(() => {
    return () => {
      stopMicTest();
    };
  }, []);

  const handleProfilePicture = (event) => {
    const file = event.target.files[0];

    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfilePicture(imageUrl);
    }
  };

  const loadMicrophones = async () => {
    try {
      const permissionStream =
        await navigator.mediaDevices.getUserMedia({ audio: true });

      permissionStream.getTracks().forEach((track) => track.stop());

      const devices =
        await navigator.mediaDevices.enumerateDevices();

      const audioInputs = devices.filter(
        (device) => device.kind === "audioinput"
      );

      setMicrophones(audioInputs);

      if (audioInputs.length > 0 && !selectedMicrophone) {
        setSelectedMicrophone(audioInputs[0].deviceId);
      }
    } catch (error) {
      console.error("Could not access microphones:", error);
      alert("Jarvis could not access your microphone.");
    }
  };

  const startMicTest = async () => {
    try {
      const constraints = {
        audio: selectedMicrophone
          ? { deviceId: { exact: selectedMicrophone } }
          : true,
      };

      const stream =
        await navigator.mediaDevices.getUserMedia(constraints);

      streamRef.current = stream;

      const AudioContext =
        window.AudioContext || window.webkitAudioContext;

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 256;

      const source =
        audioContext.createMediaStreamSource(stream);

      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      setIsTestingMic(true);

      const dataArray =
        new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);

        const average =
          dataArray.reduce((sum, value) => sum + value, 0) /
          dataArray.length;

        setMicLevel(Math.min(100, Math.round(average * 1.5)));

        animationRef.current =
          requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.error("Microphone test failed:", error);
      alert("Unable to test this microphone.");
    }
  };

  const stopMicTest = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setIsTestingMic(false);
    setMicLevel(0);
  };

  const handleMicTest = () => {
    if (isTestingMic) {
      stopMicTest();
    } else {
      startMicTest();
    }
  };

  const saveSettings = () => {
    alert("Jarvis settings saved.");
  };

  return (
    <div
      className={`settings-page ${
        theme === "Light" ? "light-theme" : ""
      }`}
    >
      <div className="ambient-glow glow-one"></div>
      <div className="ambient-glow glow-two"></div>

      <aside className="settings-sidebar">
        <div className="jarvis-brand">
          <div className="jarvis-orb">
            <div className="orb-inner"></div>
          </div>

          <div>
            <h2>JARVIS</h2>
            <span>Settings Console</span>
          </div>
        </div>

        <nav>
          {sections.map((section) => (
            <button
              key={section}
              className={
                activeSection === section
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => setActiveSection(section)}
            >
              <span className="nav-dot"></span>
              {section}
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <div className="status-title">SYSTEM STATUS</div>

          <StatusLine label="Local LLM" value="Online" />
          <StatusLine label="Tools" value="Ready" />
          <StatusLine label="Cloud AI" value="Ready" />
        </div>
      </aside>

      <main className="settings-main">
        <header className="settings-header">
          <div>
            <p className="eyebrow">JARVIS CONTROL CENTER</p>
            <h1>{activeSection}</h1>
            <p>
              Configure how your personal intelligence
              works for you.
            </p>
          </div>

          <div className="connection-pill">
            <span></span>
            Jarvis Online
          </div>
        </header>

        <div
          className="settings-content"
          key={activeSection}
        >
          {activeSection === "Profile" && (
            <>
              <SettingsCard
                title="Your Jarvis Profile"
                subtitle="Your profile follows you across your Jarvis devices."
              >
                <div className="profile-layout">
                  <div className="profile-picture-area">
                    <div className="profile-picture">
                      {profilePicture ? (
                        <img
                          src={profilePicture}
                          alt="Profile"
                        />
                      ) : (
                        <span>R</span>
                      )}
                    </div>

                    <label className="secondary-button">
                      Change Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePicture}
                        hidden
                      />
                    </label>
                  </div>

                  <div className="profile-information">
                    <InfoField
                      label="Name"
                      value="Ryan"
                    />

                    <InfoField
                      label="Username"
                      value="ryan"
                    />

                    <InfoField
                      label="Email"
                      value="ryan@example.com"
                    />

                    <div className="info-field">
                      <span>Password</span>

                      <div className="password-row">
                        <strong>••••••••••••</strong>
                        <button className="text-button">
                          Change Password
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </SettingsCard>

              <SettingsCard
                title="Jarvis Identity"
                subtitle="Your persistent Jarvis profile."
              >
                <InfoField
                  label="Jarvis Profile ID"
                  value="JRV-2048-RYAN"
                />
              </SettingsCard>
            </>
          )}

          {activeSection === "Appearance" && (
            <SettingsCard
              title="Interface"
              subtitle="Choose how Jarvis looks on this device."
            >
              <div className="theme-options">
                {["Dark", "Light", "System"].map(
                  (option) => (
                    <button
                      key={option}
                      className={
                        theme === option
                          ? "theme-card selected"
                          : "theme-card"
                      }
                      onClick={() => setTheme(option)}
                    >
                      <div
                        className={`theme-preview ${option.toLowerCase()}`}
                      >
                        <div></div>
                        <span></span>
                        <span></span>
                      </div>

                      <strong>{option}</strong>
                    </button>
                  )
                )}
              </div>
            </SettingsCard>
          )}

          {activeSection === "AI & Usage" && (
            <>
              <SettingsCard
                title="AI Usage"
                subtitle="Cloud AI usage for your current plan."
              >
                <div className="token-header">
                  <div>
                    <span className="token-number">
                      {tokensRemaining.toLocaleString()}
                    </span>

                    <p>cloud tokens remaining</p>
                  </div>

                  <div className="token-percent">
                    {tokenPercentage}%
                  </div>
                </div>

                <div className="token-bar">
                  <div
                    style={{
                      width: `${tokenPercentage}%`,
                    }}
                  ></div>
                </div>

                <div className="token-footer">
                  <span>
                    {tokensUsed.toLocaleString()} used
                  </span>

                  <span>
                    {tokenLimit.toLocaleString()} total
                  </span>
                </div>

                <div className="local-ai-note">
                  <span className="status-dot"></span>

                  <div>
                    <strong>Local AI</strong>
                    <p>
                      Local inference does not use your
                      cloud token allowance.
                    </p>
                  </div>
                </div>
              </SettingsCard>

              <SettingsCard
                title="Inference"
                subtitle="Choose where Jarvis should process requests."
              >
                <div className="mode-grid">
                  {[
                    "Automatic",
                    "Prefer Local",
                    "Prefer Cloud",
                  ].map((mode) => (
                    <button
                      key={mode}
                      className={
                        inferenceMode === mode
                          ? "mode-card selected"
                          : "mode-card"
                      }
                      onClick={() =>
                        setInferenceMode(mode)
                      }
                    >
                      <span className="radio-circle">
                        <span></span>
                      </span>

                      <div>
                        <strong>{mode}</strong>

                        <p>
                          {mode === "Automatic" &&
                            "Jarvis chooses the best available inference source."}

                          {mode === "Prefer Local" &&
                            "Prioritize privacy and local processing."}

                          {mode === "Prefer Cloud" &&
                            "Prioritize powerful remote models."}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <SettingToggle
                  title="Remote Fallback"
                  description="Use cloud inference when the local model cannot complete a request."
                  checked={remoteFallback}
                  onChange={() =>
                    setRemoteFallback(!remoteFallback)
                  }
                />

                <InfoField
                  label="Local Model"
                  value="phi-3-mini-4k-instruct-q4"
                />
              </SettingsCard>
            </>
          )}

          {activeSection === "Memory" && (
            <SettingsCard
              title="Memory & Personalization"
              subtitle="Control what Jarvis learns and remembers."
            >
              <SettingToggle
                title="Jarvis Memory"
                description="Allow Jarvis to remember useful information across conversations."
                checked={memoryEnabled}
                onChange={() =>
                  setMemoryEnabled(!memoryEnabled)
                }
              />

              <SettingToggle
                title="Conversation History"
                description="Save your previous conversations."
                checked={saveHistory}
                onChange={() =>
                  setSaveHistory(!saveHistory)
                }
              />

              <SettingToggle
                title="Remember Preferences"
                description="Remember your preferred applications, settings, and choices."
                checked={rememberPreferences}
                onChange={() =>
                  setRememberPreferences(
                    !rememberPreferences
                  )
                }
              />

              <SettingToggle
                title="Learn My Workflows"
                description="Allow Jarvis to learn frequently used workflows and actions."
                checked={learnWorkflows}
                onChange={() =>
                  setLearnWorkflows(!learnWorkflows)
                }
              />

              <div className="danger-area">
                <div>
                  <strong>Clear Jarvis Memory</strong>
                  <p>
                    Remove information Jarvis has remembered
                    about you.
                  </p>
                </div>

                <button className="danger-button">
                  Clear Memory
                </button>
              </div>
            </SettingsCard>
          )}

          {activeSection === "Tools & Security" && (
            <SettingsCard
              title="Tools & Security"
              subtitle="Control how Jarvis interacts with your computer."
            >
              <SettingToggle
                title="Tool Execution"
                description="Allow Jarvis to use approved tools."
                checked={toolsEnabled}
                onChange={() =>
                  setToolsEnabled(!toolsEnabled)
                }
              />

              <SettingToggle
                title="Generate New Tools"
                description="Allow Jarvis to create tools when it encounters an unsupported request."
                checked={toolGeneration}
                onChange={() =>
                  setToolGeneration(!toolGeneration)
                }
              />

              <SettingToggle
                title="Sandbox New Tools"
                description="Test newly generated tools in an isolated environment before use."
                checked={sandboxTools}
                onChange={() =>
                  setSandboxTools(!sandboxTools)
                }
              />

              <div className="setting-row">
                <div>
                  <h3>Generated Tool Approval</h3>
                  <p>
                    Choose when Jarvis needs permission before
                    running a generated tool.
                  </p>
                </div>

                <select
                  value={toolApproval}
                  onChange={(event) =>
                    setToolApproval(event.target.value)
                  }
                >
                  <option>Always Ask</option>
                  <option>Ask for Sensitive Actions</option>
                  <option>Run Approved Tools</option>
                </select>
              </div>
            </SettingsCard>
          )}

          {activeSection === "Voice" && (
            <>
              <SettingsCard
                title="Voice Input"
                subtitle="Configure and test the microphone Jarvis uses to hear you."
              >
                <div className="setting-row">
                  <div>
                    <h3>Input Device</h3>
                    <p>
                      Select the microphone Jarvis should use.
                    </p>
                  </div>

                  <div className="microphone-controls">
                    <select
                      value={selectedMicrophone}
                      onChange={(event) =>
                        setSelectedMicrophone(
                          event.target.value
                        )
                      }
                      onClick={loadMicrophones}
                    >
                      <option value="">
                        Select microphone
                      </option>

                      {microphones.map((microphone, index) => (
                        <option
                          key={microphone.deviceId}
                          value={microphone.deviceId}
                        >
                          {microphone.label ||
                            `Microphone ${index + 1}`}
                        </option>
                      ))}
                    </select>

                    <button
                      className="secondary-button"
                      onClick={loadMicrophones}
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="mic-test">
                  <div className="mic-visual">
                    <div
                      className={
                        isTestingMic
                          ? "mic-orb listening"
                          : "mic-orb"
                      }
                    >
                      🎙
                    </div>

                    <div className="audio-meter">
                      <div
                        style={{
                          width: `${micLevel}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="mic-test-info">
                    <h3>
                      {isTestingMic
                        ? "Listening..."
                        : "Test Microphone"}
                    </h3>

                    <p>
                      {isTestingMic
                        ? "Speak normally. The meter will react to your microphone."
                        : "Make sure Jarvis can hear you clearly before enabling voice commands."}
                    </p>
                  </div>

                  <button
                    className={
                      isTestingMic
                        ? "secondary-button active-test"
                        : "primary-button"
                    }
                    onClick={handleMicTest}
                  >
                    {isTestingMic
                      ? "Stop Test"
                      : "Test Mic"}
                  </button>
                </div>
              </SettingsCard>

              <SettingsCard
                title="Voice Output"
                subtitle="Jarvis voice responses are planned for a future version."
              >
                <div className="coming-soon">
                  <div className="voice-wave">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>

                  <div>
                    <strong>Text-to-Speech</strong>
                    <p>
                      Voice responses are coming soon.
                    </p>
                  </div>

                  <span className="coming-badge">
                    COMING SOON
                  </span>
                </div>
              </SettingsCard>
            </>
          )}

          {activeSection === "System" && (
            <>
              <SettingsCard
                title="Application"
                subtitle="Configure how Jarvis behaves on this device."
              >
                <SettingToggle
                  title="Launch on Startup"
                  description="Start Jarvis automatically when this device starts."
                  checked={launchOnStartup}
                  onChange={() =>
                    setLaunchOnStartup(!launchOnStartup)
                  }
                />

                <SettingToggle
                  title="Run in Background"
                  description="Keep Jarvis available when the main window is closed."
                  checked={runInBackground}
                  onChange={() =>
                    setRunInBackground(!runInBackground)
                  }
                />

                <SettingToggle
                  title="Desktop Notifications"
                  description="Allow Jarvis to send system notifications."
                  checked={notifications}
                  onChange={() =>
                    setNotifications(!notifications)
                  }
                />
              </SettingsCard>

              <SettingsCard
                title="About Jarvis"
                subtitle="Hackathon prototype information."
              >
                <InfoField
                  label="Version"
                  value="1.0.0"
                />

                <InfoField
                  label="Frontend"
                  value="React + Electron"
                />

                <InfoField
                  label="Architecture"
                  value="Local + Remote AI"
                />
              </SettingsCard>
            </>
          )}
        </div>

        <div className="save-area">
          <span>
            Changes apply to your Jarvis profile.
          </span>

          <button
            className="primary-button save-button"
            onClick={saveSettings}
          >
            Save Changes
          </button>
        </div>
      </main>
    </div>
  );
}

function SettingsCard({ title, subtitle, children }) {
  return (
    <section className="settings-card">
      <div className="card-heading">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      {children}
    </section>
  );
}

function SettingToggle({
  title,
  description,
  checked,
  onChange,
}) {
  return (
    <div className="setting-row">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <label className="switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
        />

        <span className="switch-slider"></span>
      </label>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div className="info-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusLine({ label, value }) {
  return (
    <div className="status-line">
      <div>
        <span className="status-dot"></span>
        {label}
      </div>

      <strong>{value}</strong>
    </div>
  );
}

export default Settings;
