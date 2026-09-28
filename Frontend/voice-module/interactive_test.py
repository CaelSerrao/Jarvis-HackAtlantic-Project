"""Interactive microphone/STT/TTS smoke test; run from voice-module."""

from voice_module import VoiceModule


def main() -> None:
    voice = VoiceModule(model_size="tiny", record_seconds=5)
    input("Press Enter, then speak for five seconds…")
    try:
        transcription = voice.listen()
        print(f"Transcription: {transcription or '[no speech recognized]'}")
        voice.speak(
            f"I heard: {transcription}" if transcription else "I didn't catch that."
        )
    except KeyboardInterrupt:
        voice.stop_speaking()
        print("\nStopped.")


if __name__ == "__main__":
    main()
