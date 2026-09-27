import React, { useEffect, useRef, useState } from "react";
import "./Settings.css";

function Settings() {
  const [activeSection, setActiveSection] = useState("Profile");

  // ==============================
  // PROFILE
  // ==============================
  const [profilePicture, setProfilePicture] = useState(null);

  // ==============================
  // APPEARANCE
  // ==============================
  const [theme, setTheme] = useState("Dark");

  const [systemTheme, setSystemTheme] = useState(
    window.matchMedia("(prefers-color-scheme: light)").matches
      ? "Light"
      : "Dark"
  );

  // ==============================
  // AI / API
  // ==============================
  const [inferenceMode, setInferenceMode] = useState("Automatic");
  const [remoteFallback, setRemoteFallback] = useState(true);

  const [activeModel, setActiveModel] = useState(
    "phi-3-mini-4k-instruct-q4"
  );

  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);

  // Placeholder values until backend is connected
  const tokensUsed = 21580;
  const tokenLimit = 100000;
  const tokensRemaining = tokenLimit - tokensUsed;

  const tokenPercentage = Math.round(
    (tokensRemaining / tokenLimit) * 100
  );

  // ==============================
  // MEMORY
  // ==============================
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [saveHistory, setSaveHistory] = useState(true);
  const [rememberPreferences, setRememberPreferences] =
    useState(true);
  const [learnWorkflows, setLearnWorkflows] = useState(true);

  // ==============================
  // TOOLS & SECURITY
  // ==============================
  const [toolsEnabled, setToolsEnabled] = useState(true);
  const [toolGeneration, setToolGeneration] = useState(true);
  const [sandboxTools, setSandboxTools] = useState(true);
  const [toolApproval, setToolApproval] = useState("Always Ask");

  // ==============================
  // MICROPHONE
  // ==============================
  const [microphones, setMicrophones] = useState([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState("");
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);

  // ==============================
  // TEXT TO SPEECH
  // ==============================
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [speechRate, setSpeechRate] = useState(1);
  const [speechVolume, setSpeechVolume] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ==============================
  // SYSTEM
  // ==============================
  const [notifications, setNotifications] = useState(true);
  const [launchOnStartup, setLaunchOnStartup] = useState(false);
  const [runInBackground, setRunInBackground] = useState(true);

  // ==============================
  // SETTINGS SECTIONS
  // ==============================
  const sections = [
    "Profile",
    "Appearance",
    "AI & Usage",
    "Memory",
    "Tools & Security",
    "Voice",
    "System",
  ];

  // ==============================
  // MICROPHONE CLEANUP
  // ==============================
  useEffect(() => {
    return () => {
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
    };
  }, []);

  // ==============================
  // SYSTEM THEME
  // ==============================
  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(prefers-color-scheme: light)"
    );

    const handleThemeChange = (event) => {
      setSystemTheme(event.matches ? "Light" : "Dark");
    };

    mediaQuery.addEventListener("change", handleThemeChange);

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleThemeChange
      );
    };
  }, []);

  // ==============================
  // LOAD TEXT TO SPEECH VOICES
  // ==============================
  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    const loadVoices = () => {
      const availableVoices =
        window.speechSynthesis.getVoices();

      setVoices(availableVoices);

      if (availableVoices.length > 0) {
        setSelectedVoice((currentVoice) => {
          if (currentVoice) {
            return currentVoice;
          }

          return availableVoices[0].voiceURI;
        });
      }
    };

    loadVoices();

    window.speechSynthesis.addEventListener(
      "voiceschanged",
      loadVoices
    );

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        loadVoices
      );

      window.speechSynthesis.cancel();
    };
  }, []);

  // ==============================
  // PROFILE PICTURE
  // ==============================
  const handleProfilePicture = (event) => {
    const file = event.target.files[0];

    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfilePicture(imageUrl);
    }
  };

  // ==============================
  // MICROPHONE FUNCTIONS
  // ==============================
  const loadMicrophones = async () => {
    try {
      if (!navigator.mediaDevices) {
        alert("Microphone access is not supported on this device.");
        return;
      }

      const permissionStream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      permissionStream
        .getTracks()
        .forEach((track) => track.stop());

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

      alert(
        "Jarvis could not access your microphone. Check your microphone permissions."
      );
    }
  };

  const startMicTest = async () => {
    try {
      if (!navigator.mediaDevices) {
        alert("Microphone access is not supported.");
        return;
      }

      const constraints = {
        audio: selectedMicrophone
          ? {
              deviceId: {
                exact: selectedMicrophone,
              },
            }
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
          dataArray.reduce(
            (sum, value) => sum + value,
            0
          ) / dataArray.length;

        setMicLevel(
          Math.min(
            100,
            Math.round(average * 1.5)
          )
        );

        animationRef.current =
          requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.error("Microphone test failed:", error);

      alert(
        "Unable to test this microphone. Check your device permissions."
      );
    }
  };

  const stopMicTest = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;

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

  // ==============================
  // TEXT TO SPEECH TEST
  // ==============================
  const testVoice = () => {
    if (!ttsEnabled) {
      alert("Text-to-Speech is currently disabled.");
      return;
    }

    if (!("speechSynthesis" in window)) {
      alert(
        "Text-to-Speech is not supported on this device."
      );
      return;
    }

    window.speechSynthesis.cancel();

    const message = new SpeechSynthesisUtterance(
      "Jarvis online. Voice systems are functioning normally."
    );

    const voice = voices.find(
      (item) => item.voiceURI === selectedVoice
    );

    if (voice) {
      message.voice = voice;
    }

    message.rate = speechRate;
    message.volume = speechVolume;

    message.onstart = () => {
      setIsSpeaking(true);
    };

    message.onend = () => {
      setIsSpeaking(false);
    };

    message.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(message);
  };

  // ==============================
  // API MOCK CONNECTION
  // ==============================
  const testApiConnection = () => {
    if (!apiKey.trim()) {
      setApiConnected(false);

      alert(
        "Enter an API key before testing the connection."
      );

      return;
    }

    // Frontend demo only.
    // The real connection check should be handled securely
    // by the backend.
    setApiConnected(true);

    alert(
      "Frontend demo: API key detected. Backend connection testing will be added later."
    );
  };

  const removeApiKey = () => {
    setApiKey("");
    setApiConnected(false);
    setShowApiKey(false);
  };

  // ==============================
  // SAVE SETTINGS
  // ==============================
  const saveSettings = () => {
    alert("Jarvis settings saved.");
  };

  // If System is selected, follow the operating system theme.
  const currentTheme =
    theme === "System" ? systemTheme : theme;

  return (
    <div
      className={`settings-page ${
        currentTheme === "Light"
          ? "light-theme"
          : ""
      }`}
    >
      <div className="ambient-glow glow-one"></div>
      <div className="ambient-glow glow-two"></div>

      {/* =========================
          SETTINGS SIDEBAR
          ========================= */}

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
              onClick={() =>
                setActiveSection(section)
              }
            >
              <span className="nav-dot"></span>

              {section}
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <div className="status-title">
            SYSTEM STATUS
          </div>

          <StatusLine
            label="Local LLM"
            value="Online"
          />

          <StatusLine
            label="Tools"
            value="Ready"
          />

          <StatusLine
            label="Cloud AI"
            value={
              apiConnected
                ? "Ready"
                : "Offline"
            }
            active={apiConnected}
          />

          <StatusLine
            label="Voice"
            value={
              ttsEnabled
                ? "Ready"
                : "Disabled"
            }
            active={ttsEnabled}
          />
        </div>
      </aside>

      {/* =========================
          MAIN SETTINGS
          ========================= */}

      <main className="settings-main">
        <header className="settings-header">
          <div>
            <p className="eyebrow">
              JARVIS CONTROL CENTER
            </p>

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
          {/* =========================
              PROFILE
              ========================= */}

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
                        <strong>
                          ••••••••••••
                        </strong>

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

          {/* =========================
              APPEARANCE
              ========================= */}

          {activeSection === "Appearance" && (
            <SettingsCard
              title="Interface"
              subtitle="Choose how Jarvis looks on this device."
            >
              <div className="theme-options">
                {[
                  "Dark",
                  "Light",
                  "System",
                ].map((option) => (
                  <button
                    key={option}
                    className={
                      theme === option
                        ? "theme-card selected"
                        : "theme-card"
                    }
                    onClick={() =>
                      setTheme(option)
                    }
                  >
                    <div
                      className={`theme-preview ${option.toLowerCase()}`}
                    >
                      <div></div>
                      <span></span>
                      <span></span>
                    </div>

                    <strong>
                      {option}
                    </strong>
                  </button>
                ))}
              </div>
            </SettingsCard>
          )}

          {/* =========================
              AI & USAGE
              ========================= */}

          {activeSection === "AI & Usage" && (
            <>
              {/* ACTIVE MODEL */}

              <SettingsCard
                title="Active AI"
                subtitle="Models currently available to Jarvis."
              >
                <div className="model-status-grid">
                  <button
                    className={`model-status-card ${
                      activeModel ===
                      "phi-3-mini-4k-instruct-q4"
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setActiveModel(
                        "phi-3-mini-4k-instruct-q4"
                      )
                    }
                  >
                    <div className="model-status-top">
                      <span className="status-dot"></span>
                      LOCAL
                    </div>

                    <strong>
                      Phi-3 Mini
                    </strong>

                    <p>
                      phi-3-mini-4k-instruct-q4
                    </p>

                    <small>
                      Fast • Private • No cloud tokens
                    </small>
                  </button>

                  <button
                    className={`model-status-card ${
                      activeModel === "Cloud AI"
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setActiveModel(
                        "Cloud AI"
                      )
                    }
                  >
                    <div className="model-status-top cloud">
                      <span className="status-dot"></span>
                      CLOUD
                    </div>

                    <strong>
                      Cloud AI
                    </strong>

                    <p>
                      Remote intelligence model
                    </p>

                    <small>
                      Powerful • Remote • Uses API tokens
                    </small>
                  </button>
                </div>

                <div className="active-model-line">
                  <span>
                    Currently Selected
                  </span>

                  <strong>
                    {activeModel}
                  </strong>
                </div>
              </SettingsCard>

              {/* TOKEN USAGE */}

              <SettingsCard
                title="AI Usage"
                subtitle="Cloud AI usage for your current plan."
              >
                <div className="token-header">
                  <div>
                    <span className="token-number">
                      {tokensRemaining.toLocaleString()}
                    </span>

                    <p>
                      cloud tokens remaining
                    </p>
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
                    <strong>
                      Local AI
                    </strong>

                    <p>
                      Local inference does not use your
                      cloud token allowance.
                    </p>
                  </div>
                </div>
              </SettingsCard>

              {/* API CONNECTION */}

              <SettingsCard
                title="API Connection"
                subtitle="Configure Jarvis cloud intelligence access."
              >
                <div className="api-status-row">
                  <div>
                    <span
                      className={`api-status-dot ${
                        apiConnected
                          ? "connected"
                          : ""
                      }`}
                    ></span>

                    <div>
                      <strong>
                        {apiConnected
                          ? "Cloud API Connected"
                          : "Cloud API Not Connected"}
                      </strong>

                      <p>
                        Used when Jarvis requires
                        remote inference.
                      </p>
                    </div>
                  </div>

                  <span
                    className={`api-badge ${
                      apiConnected
                        ? "connected"
                        : ""
                    }`}
                  >
                    {apiConnected
                      ? "CONNECTED"
                      : "DISCONNECTED"}
                  </span>
                </div>

                <div className="api-key-area">
                  <label>
                    API KEY
                  </label>

                  <div className="api-key-input">
                    <input
                      type={
                        showApiKey
                          ? "text"
                          : "password"
                      }
                      value={apiKey}
                      onChange={(event) =>
                        setApiKey(
                          event.target.value
                        )
                      }
                      placeholder="Enter API key"
                      autoComplete="off"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowApiKey(
                          !showApiKey
                        )
                      }
                    >
                      {showApiKey
                        ? "Hide"
                        : "Show"}
                    </button>
                  </div>

                  <p>
                    API credentials should be stored
                    securely by the backend in the
                    production version of Jarvis.
                  </p>
                </div>

                <div className="api-actions">
                  <button
                    className="secondary-button"
                    onClick={testApiConnection}
                  >
                    Test Connection
                  </button>

                  <button
                    className="text-button"
                    onClick={removeApiKey}
                  >
                    Remove Key
                  </button>
                </div>
              </SettingsCard>

              {/* INFERENCE */}

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
                        <strong>
                          {mode}
                        </strong>

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
                    setRemoteFallback(
                      !remoteFallback
                    )
                  }
                />

                <InfoField
                  label="Local Model"
                  value="phi-3-mini-4k-instruct-q4"
                />

                <InfoField
                  label="Selected Model"
                  value={activeModel}
                />
              </SettingsCard>
            </>
          )}

          {/* =========================
              MEMORY
              ========================= */}

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
                  setMemoryEnabled(
                    !memoryEnabled
                  )
                }
              />

              <SettingToggle
                title="Conversation History"
                description="Save your previous conversations."
                checked={saveHistory}
                onChange={() =>
                  setSaveHistory(
                    !saveHistory
                  )
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
                  setLearnWorkflows(
                    !learnWorkflows
                  )
                }
              />

              <div className="danger-area">
                <div>
                  <strong>
                    Clear Jarvis Memory
                  </strong>

                  <p>
                    Remove information Jarvis has
                    remembered about you.
                  </p>
                </div>

                <button className="danger-button">
                  Clear Memory
                </button>
              </div>
            </SettingsCard>
          )}

          {/* =========================
              TOOLS & SECURITY
              ========================= */}

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
                  setToolsEnabled(
                    !toolsEnabled
                  )
                }
              />

              <SettingToggle
                title="Generate New Tools"
                description="Allow Jarvis to create tools when it encounters an unsupported request."
                checked={toolGeneration}
                onChange={() =>
                  setToolGeneration(
                    !toolGeneration
                  )
                }
              />

              <SettingToggle
                title="Sandbox New Tools"
                description="Test newly generated tools in an isolated environment before use."
                checked={sandboxTools}
                onChange={() =>
                  setSandboxTools(
                    !sandboxTools
                  )
                }
              />

              <div className="setting-row">
                <div>
                  <h3>
                    Generated Tool Approval
                  </h3>

                  <p>
                    Choose when Jarvis needs
                    permission before running a
                    generated tool.
                  </p>
                </div>

                <select
                  value={toolApproval}
                  onChange={(event) =>
                    setToolApproval(
                      event.target.value
                    )
                  }
                >
                  <option>
                    Always Ask
                  </option>

                  <option>
                    Ask for Sensitive Actions
                  </option>

                  <option>
                    Run Approved Tools
                  </option>
                </select>
              </div>
            </SettingsCard>
          )}

          {/* =========================
              VOICE
              ========================= */}

          {activeSection === "Voice" && (
            <>
              {/* VOICE INPUT */}

              <SettingsCard
                title="Voice Input"
                subtitle="Configure and test the microphone Jarvis uses to hear you."
              >
                <div className="setting-row">
                  <div>
                    <h3>
                      Input Device
                    </h3>

                    <p>
                      Select the microphone Jarvis
                      should use.
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

                      {microphones.map(
                        (
                          microphone,
                          index
                        ) => (
                          <option
                            key={
                              microphone.deviceId
                            }
                            value={
                              microphone.deviceId
                            }
                          >
                            {microphone.label ||
                              `Microphone ${
                                index + 1
                              }`}
                          </option>
                        )
                      )}
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

              {/* TEXT TO SPEECH */}

              <SettingsCard
                title="Text-to-Speech"
                subtitle="Configure how Jarvis speaks responses aloud."
              >
                <SettingToggle
                  title="Voice Responses"
                  description="Allow Jarvis to respond using synthesized speech."
                  checked={ttsEnabled}
                  onChange={() =>
                    setTtsEnabled(
                      !ttsEnabled
                    )
                  }
                />

                <div className="setting-row">
                  <div>
                    <h3>
                      Voice
                    </h3>

                    <p>
                      Choose the voice Jarvis should
                      use for spoken responses.
                    </p>
                  </div>

                  <select
                    value={selectedVoice}
                    onChange={(event) =>
                      setSelectedVoice(
                        event.target.value
                      )
                    }
                    disabled={!ttsEnabled}
                  >
                    {voices.length === 0 && (
                      <option value="">
                        Default System Voice
                      </option>
                    )}

                    {voices.map((voice) => (
                      <option
                        key={voice.voiceURI}
                        value={voice.voiceURI}
                      >
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="setting-row">
                  <div>
                    <h3>
                      Speech Speed
                    </h3>

                    <p>
                      Control how quickly Jarvis
                      speaks.
                    </p>
                  </div>

                  <div className="range-control">
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={speechRate}
                      disabled={!ttsEnabled}
                      onChange={(event) =>
                        setSpeechRate(
                          Number(
                            event.target.value
                          )
                        )
                      }
                    />

                    <span>
                      {speechRate.toFixed(1)}x
                    </span>
                  </div>
                </div>

                <div className="setting-row">
                  <div>
                    <h3>
                      Voice Volume
                    </h3>

                    <p>
                      Adjust Jarvis speech output
                      volume.
                    </p>
                  </div>

                  <div className="range-control">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={speechVolume}
                      disabled={!ttsEnabled}
                      onChange={(event) =>
                        setSpeechVolume(
                          Number(
                            event.target.value
                          )
                        )
                      }
                    />

                    <span>
                      {Math.round(
                        speechVolume * 100
                      )}
                      %
                    </span>
                  </div>
                </div>

                <div className="tts-test">
                  <div
                    className={`voice-wave ${
                      isSpeaking
                        ? "speaking"
                        : ""
                    }`}
                  >
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>

                  <div className="tts-test-info">
                    <strong>
                      {isSpeaking
                        ? "Jarvis is speaking..."
                        : "Test Jarvis Voice"}
                    </strong>

                    <p>
                      Preview the selected voice,
                      speed and volume.
                    </p>
                  </div>

                  <button
                    className="primary-button"
                    onClick={testVoice}
                    disabled={
                      !ttsEnabled ||
                      isSpeaking
                    }
                  >
                    {isSpeaking
                      ? "Speaking..."
                      : "Test Voice"}
                  </button>
                </div>
              </SettingsCard>
            </>
          )}

          {/* =========================
              SYSTEM
              ========================= */}

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
                    setLaunchOnStartup(
                      !launchOnStartup
                    )
                  }
                />

                <SettingToggle
                  title="Run in Background"
                  description="Keep Jarvis available when the main window is closed."
                  checked={runInBackground}
                  onChange={() =>
                    setRunInBackground(
                      !runInBackground
                    )
                  }
                />

                <SettingToggle
                  title="Desktop Notifications"
                  description="Allow Jarvis to send system notifications."
                  checked={notifications}
                  onChange={() =>
                    setNotifications(
                      !notifications
                    )
                  }
                />
              </SettingsCard>

              <SettingsCard
                title="AI Status"
                subtitle="Current Jarvis intelligence configuration."
              >
                <InfoField
                  label="Selected Model"
                  value={activeModel}
                />

                <InfoField
                  label="Inference Mode"
                  value={inferenceMode}
                />

                <InfoField
                  label="Local LLM"
                  value="Online"
                />

                <InfoField
                  label="Cloud API"
                  value={
                    apiConnected
                      ? "Connected"
                      : "Not Connected"
                  }
                />

                <InfoField
                  label="Text-to-Speech"
                  value={
                    ttsEnabled
                      ? "Enabled"
                      : "Disabled"
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

        {/* =========================
            SAVE
            ========================= */}

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

// ==============================
// REUSABLE COMPONENTS
// ==============================

function SettingsCard({
  title,
  subtitle,
  children,
}) {
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

function InfoField({
  label,
  value,
}) {
  return (
    <div className="info-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusLine({
  label,
  value,
  active = true,
}) {
  return (
    <div className="status-line">
      <div>
        <span
          className={`status-dot ${
            !active
              ? "status-dot-offline"
              : ""
          }`}
        ></span>

        {label}
      </div>

      <strong>
        {value}
      </strong>
    </div>
  );
}

export default Settings;