import React, {
  useEffect,
  useRef,
  useState,
} from "react";

export default function Voice({
  settings,
  update,
  busy,
}) {
  const [devices, setDevices] = useState([]);
  const [voices, setVoices] = useState([]);

  const [testing, setTesting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const [level, setLevel] = useState(0);
  const [message, setMessage] = useState("");

  const resources = useRef({});
  const generation = useRef(0);

  function release() {
    const current = resources.current;

    if (current.frame) {
      cancelAnimationFrame(current.frame);
    }

    current.stream
      ?.getTracks()
      .forEach((track) => track.stop());

    current.context?.close().catch(() => {});

    resources.current = {};
  }

  useEffect(() => {
    const synth = window.speechSynthesis;

    const load = () => {
      setVoices(synth?.getVoices() || []);
    };

    load();

    synth?.addEventListener("voiceschanged", load);

    return () => {
      generation.current += 1;

      release();

      synth?.removeEventListener("voiceschanged", load);
      synth?.cancel();
    };
  }, []);

  async function start() {
    const token = ++generation.current;

    setStarting(true);
    setMessage("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is unavailable.");
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: settings.microphone
            ? {
                deviceId: {
                  exact: settings.microphone,
                },
              }
            : true,
        });

      if (token !== generation.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      resources.current.stream = stream;

      const context = new AudioContext();
      resources.current.context = context;

      await context.resume();

      if (token !== generation.current) return;

      const analyser = context.createAnalyser();
      analyser.fftSize = 256;

      context
        .createMediaStreamSource(stream)
        .connect(analyser);

      const data = new Uint8Array(
        analyser.frequencyBinCount
      );

      const tick = () => {
        analyser.getByteFrequencyData(data);

        setLevel(
          Math.min(
            100,
            data.reduce((a, b) => a + b, 0) / data.length
          )
        );

        resources.current.frame =
          requestAnimationFrame(tick);
      };

      tick();
      setTesting(true);

      const all =
        await navigator.mediaDevices.enumerateDevices();

      if (token === generation.current) {
        setDevices(
          all.filter(
            (device) => device.kind === "audioinput"
          )
        );
      }
    } catch (error) {
      if (token === generation.current) {
        release();
        setTesting(false);

        setMessage(
          error.message || "Microphone test failed."
        );
      }
    } finally {
      if (token === generation.current) {
        setStarting(false);
      }
    }
  }

  function stop() {
    generation.current += 1;

    release();

    setTesting(false);
    setStarting(false);
    setLevel(0);
  }

  function speak() {
    const synth = window.speechSynthesis;

    if (!synth) {
      setMessage("Speech synthesis is unavailable.");
      return;
    }

    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(
      "Hello. This is your Jarvis voice preview."
    );

    const voice = voices.find(
      (item) => item.voiceURI === settings.voice
    );

    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = settings.speechRate;
    utterance.volume = settings.speechVolume;

    utterance.onend = () => {
      setSpeaking(false);
    };

    utterance.onerror = () => {
      setSpeaking(false);
      setMessage("Voice playback could not finish.");
    };

    setSpeaking(true);
    synth.speak(utterance);
  }

  return (
    <div className="jx-stack">
      <section className="jx-card">
        <h2>Voice input</h2>

        <p>
          Test your microphone locally. Audio is not recorded
          or uploaded.
        </p>

        <label className="jx-field">
          Input device

          <select
            value={settings.microphone}
            disabled={busy || testing || starting}
            onChange={(event) =>
              update({
                microphone: event.target.value,
              })
            }
          >
            <option value="">System default</option>

            {devices.map((device, index) => (
              <option
                key={device.deviceId}
                value={device.deviceId}
              >
                {device.label || `Microphone ${index + 1}`}
              </option>
            ))}
          </select>
        </label>

        <meter
          min="0"
          max="100"
          value={level}
          aria-label="Microphone level"
        />

        <button
          className="jx-primary"
          disabled={starting}
          onClick={testing ? stop : start}
        >
          {starting
            ? "Requesting microphone…"
            : testing
              ? "Stop test"
              : "Test microphone"}
        </button>
      </section>

      <section className="jx-card">
        <h2>Text-to-speech</h2>

        <label className="jx-toggle">
          <span>Voice responses</span>

          <input
            type="checkbox"
            checked={settings.ttsEnabled}
            disabled={busy || speaking}
            onChange={(event) =>
              update({
                ttsEnabled: event.target.checked,
              })
            }
          />
        </label>

        <label className="jx-field">
          Voice

          <select
            disabled={
              busy || !settings.ttsEnabled || speaking
            }
            value={settings.voice}
            onChange={(event) =>
              update({
                voice: event.target.value,
              })
            }
          >
            <option value="">System default</option>

            {voices.map((voice) => (
              <option
                key={voice.voiceURI}
                value={voice.voiceURI}
              >
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </label>

        <label className="jx-field">
          Speed · {settings.speechRate}×

          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={settings.speechRate}
            disabled={
              busy || speaking || !settings.ttsEnabled
            }
            onChange={(event) =>
              update({
                speechRate: Number(event.target.value),
              })
            }
          />
        </label>

        <label className="jx-field">
          Volume · {Math.round(settings.speechVolume * 100)}%

          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.speechVolume}
            disabled={
              busy || speaking || !settings.ttsEnabled
            }
            onChange={(event) =>
              update({
                speechVolume: Number(event.target.value),
              })
            }
          />
        </label>

        <div className="jx-actions">
          <button
            className="jx-primary"
            disabled={!settings.ttsEnabled || speaking}
            onClick={speak}
          >
            Test voice
          </button>

          {speaking && (
            <button
              onClick={() => {
                window.speechSynthesis.cancel();
                setSpeaking(false);
              }}
            >
              Stop speaking
            </button>
          )}
        </div>
      </section>

      <p role="status">{message}</p>
    </div>
  );
}