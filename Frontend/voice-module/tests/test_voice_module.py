import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

import numpy as np

from voice_module import VoiceModule, _resample_audio


class VoiceModuleTests(unittest.TestCase):
    def test_listen_records_and_returns_transcribed_text(self):
        voice = VoiceModule(record_seconds=2, input_device=1)
        voice._model = Mock()
        voice._model.transcribe.return_value = (
            iter([SimpleNamespace(text=" hello "), SimpleNamespace(text="world")]),
            SimpleNamespace(language="en"),
        )
        audio = np.zeros((32_000, 1), dtype=np.float32)

        with patch("sounddevice.query_devices", return_value={"default_samplerate": 16_000}), patch(
            "sounddevice.rec", return_value=audio
        ) as record, patch("sounddevice.wait") as wait:
            self.assertEqual(voice.listen(), "hello world")

        record.assert_called_once_with(
            32_000, samplerate=16_000, channels=1, dtype="float32", device=1
        )
        wait.assert_called_once_with()
        voice._model.transcribe.assert_called_once()

    def test_listen_accepts_duration_and_language(self):
        voice = VoiceModule(input_device=7)
        voice._model = Mock()
        voice._model.transcribe.return_value = (iter([]), None)
        with patch("sounddevice.query_devices", return_value={"default_samplerate": 16_000}), patch(
            "sounddevice.rec", return_value=np.zeros((8_000, 1))
        ), patch("sounddevice.wait"):
            self.assertEqual(voice.listen(0.5, language="en"), "")
        self.assertEqual(voice._model.transcribe.call_args.kwargs["language"], "en")

    def test_listen_captures_at_selected_device_native_rate_then_resamples(self):
        voice = VoiceModule(record_seconds=2, input_device=15)
        voice._model = Mock()
        voice._model.transcribe.return_value = (iter([]), None)
        captured = np.zeros((96_000, 1), dtype=np.float32)

        with patch(
            "sounddevice.query_devices", return_value={"default_samplerate": 48_000}
        ), patch("sounddevice.rec", return_value=captured) as record, patch(
            "sounddevice.wait"
        ):
            voice.listen()

        record.assert_called_once_with(
            96_000, samplerate=48_000, channels=1, dtype="float32", device=15
        )
        model_audio = voice._model.transcribe.call_args.args[0]
        self.assertEqual(model_audio.shape, (32_000,))
        self.assertEqual(model_audio.dtype, np.float32)

    def test_input_device_can_be_selected_by_unambiguous_name(self):
        voice = VoiceModule(input_device="Microphone Array")
        devices = [
            {"name": "Speakers", "max_input_channels": 0, "hostapi": 0},
            {
                "name": "Microphone Array (Realtek)",
                "max_input_channels": 2,
                "hostapi": 1,
            },
        ]
        sounddevice = Mock()
        sounddevice.query_devices.return_value = devices
        sounddevice.query_hostapis.return_value = {"name": "Windows WASAPI"}

        self.assertEqual(voice._resolve_input_device(sounddevice), 1)

    def test_ambiguous_input_device_name_requires_specific_selection(self):
        voice = VoiceModule(input_device="Microphone Realtek")
        devices = [
            {"name": "Microphone Realtek", "max_input_channels": 2, "hostapi": 0},
            {"name": "Microphone Realtek", "max_input_channels": 2, "hostapi": 1},
        ]
        sounddevice = Mock()
        sounddevice.query_devices.return_value = devices
        sounddevice.query_hostapis.side_effect = [
            {"name": "MME"},
            {"name": "Windows WASAPI"},
        ]

        with self.assertRaisesRegex(ValueError, "ambiguous"):
            voice._resolve_input_device(sounddevice)

    def test_resampler_converts_48khz_to_16khz_and_preserves_speech_band(self):
        source_rate = 48_000
        time = np.arange(source_rate, dtype=np.float32) / source_rate
        source = np.sin(2 * np.pi * 1_000 * time).astype(np.float32)

        result = _resample_audio(source, source_rate, 16_000)

        self.assertEqual(result.shape, (16_000,))
        self.assertAlmostEqual(float(np.sqrt(np.mean(result**2))), 2**-0.5, places=3)

    def test_resampler_removes_frequencies_above_target_nyquist(self):
        source_rate = 48_000
        time = np.arange(source_rate, dtype=np.float32) / source_rate
        source = np.sin(2 * np.pi * 12_000 * time).astype(np.float32)

        result = _resample_audio(source, source_rate, 16_000)

        # Float32 capture quantization leaves a small numerical residual.
        self.assertLess(float(np.sqrt(np.mean(result**2))), 1e-3)

    def test_speak_uses_local_engine_and_stop_speaking(self):
        engine = Mock()
        with patch("pyttsx3.init", return_value=engine) as initialize:
            voice = VoiceModule()
            voice.speak("Hello from Jarvis")
            initialize.assert_called_once_with(driverName="sapi5")
            engine.say.assert_called_once_with("Hello from Jarvis")
            engine.runAndWait.assert_called_once_with()
            voice.stop_speaking()
            engine.stop.assert_called_once_with()

    def test_empty_speech_does_not_initialize_tts(self):
        voice = VoiceModule()
        with patch("pyttsx3.init") as initialize:
            voice.speak("  ")
        initialize.assert_not_called()

    def test_whisper_model_is_lazy_and_uses_cpu_int8(self):
        voice = VoiceModule()
        with patch("faster_whisper.WhisperModel") as model_type:
            first = voice._get_model()
            second = voice._get_model()
        self.assertIs(first, second)
        model_type.assert_called_once_with("tiny", device="cpu", compute_type="int8")


if __name__ == "__main__":
    unittest.main()
