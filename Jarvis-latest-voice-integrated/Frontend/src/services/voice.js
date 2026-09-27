import {
  listenForVoice,
  speakVoice,
} from "./jarvis";

const STORAGE_KEY = "jarvis_voice_settings";

const DEFAULT_SETTINGS = {
  enabled: true,
  inputDevice: null,
  language: null,
  recordSeconds: 5,
  voiceId: "",
  rate: 1,
  volume: 1,
};

export function getVoiceSettings() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(stored),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveVoiceSettings(settings) {
  const value = {
    ...getVoiceSettings(),
    ...settings,
  };

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(value)
  );

  window.dispatchEvent(
    new CustomEvent("jarvis-voice-settings-changed", {
      detail: value,
    })
  );

  return value;
}

export async function speakJarvisText(text) {
  const settings = getVoiceSettings();

  if (!settings.enabled || !text) {
    return false;
  }

  await speakVoice({
    text,
    voiceId: settings.voiceId || null,
    rate: Number(settings.rate) || 1,
    volume: Number.isFinite(Number(settings.volume))
      ? Number(settings.volume)
      : 1,
  });

  return true;
}

export async function captureJarvisVoice() {
  const settings = getVoiceSettings();

  const data = await listenForVoice({
    durationSeconds: Number(settings.recordSeconds) || 5,
    language: settings.language || null,
    inputDevice:
      settings.inputDevice === "" || settings.inputDevice == null
        ? null
        : Number.isNaN(Number(settings.inputDevice))
          ? settings.inputDevice
          : Number(settings.inputDevice),
  });

  return data.transcript || "";
}
