"""Standalone local microphone, speech recognition, and speech synthesis."""

from __future__ import annotations

from typing import Any


def _resample_audio(
    audio: Any,
    source_rate: int,
    target_rate: int
) -> Any:
    """
    Band-limit and resample mono audio using NumPy's
    Fourier transform.
    """

    import numpy as np

    samples = np.asarray(
        audio,
        dtype=np.float32
    ).reshape(-1)

    if source_rate <= 0 or target_rate <= 0:
        raise ValueError(
            "sample rates must be positive"
        )

    if (
        source_rate == target_rate
        or samples.size == 0
    ):
        return samples

    target_length = round(
        samples.size
        * target_rate
        / source_rate
    )

    if target_length <= 0:
        return np.empty(
            0,
            dtype=np.float32
        )

    source_spectrum = np.fft.rfft(
        samples
    )

    target_spectrum = np.zeros(
        target_length // 2 + 1,
        dtype=source_spectrum.dtype
    )

    common_bins = min(
        source_spectrum.size,
        target_spectrum.size
    )

    target_spectrum[
        :common_bins
    ] = source_spectrum[
        :common_bins
    ]

    # A Nyquist bin is represented once in an rFFT.
    # When it becomes an ordinary positive-frequency
    # bin, split its energy. When downsampling, combine
    # the positive/negative pair into the new Nyquist.
    shared_nyquist = min(
        samples.size,
        target_length
    )

    if shared_nyquist % 2 == 0:
        nyquist_bin = (
            shared_nyquist // 2
        )

        if target_length < samples.size:
            target_spectrum[
                nyquist_bin
            ] *= 2

        elif samples.size < target_length:
            target_spectrum[
                nyquist_bin
            ] *= 0.5

    resampled = np.fft.irfft(
        target_spectrum,
        n=target_length
    )

    resampled *= (
        target_length
        / samples.size
    )

    return resampled.astype(
        np.float32,
        copy=False
    )


class VoiceModule:
    """
    Small synchronous interface for local speech
    input and output.

    Speech recognition defaults to CPU/int8 for
    reliable Windows operation.

    Whisper model weights are loaded lazily on the
    first call to listen().
    """

    def __init__(
        self,
        model_size: str = "tiny",
        *,
        device: str = "cpu",
        compute_type: str = "int8",
        sample_rate: int = 16_000,
        record_seconds: float = 5.0,
        language: str | None = None,
        input_device: int | str | None = None,
    ) -> None:

        if sample_rate <= 0:
            raise ValueError(
                "sample_rate must be positive"
            )

        if record_seconds <= 0:
            raise ValueError(
                "record_seconds must be positive"
            )

        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self.sample_rate = sample_rate
        self.record_seconds = record_seconds
        self.language = language
        self.input_device = input_device

        self._model: Any | None = None


    def _get_model(
        self
    ) -> Any:

        if self._model is None:

            from faster_whisper import (
                WhisperModel
            )

            self._model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type
            )

        return self._model


    def listen(
        self,
        duration_seconds: float | None = None,
        *,
        language: str | None = None,
    ) -> str:
        """
        Record from the selected microphone and return
        recognized text.

        Capture uses the selected device's native sample
        rate and resamples in memory to sample_rate
        before passing the audio to Whisper.
        """

        import numpy as np
        import sounddevice as sd

        seconds = (
            self.record_seconds
            if duration_seconds is None
            else duration_seconds
        )

        if seconds <= 0:
            raise ValueError(
                "duration_seconds must be positive"
            )

        device_index = (
            self._resolve_input_device(
                sd
            )
        )

        device_info = sd.query_devices(
            device_index,
            kind="input"
        )

        capture_rate = round(
            device_info[
                "default_samplerate"
            ]
        )

        if capture_rate <= 0:
            raise RuntimeError(
                "The selected input device "
                "has no valid sample rate"
            )

        frames = round(
            seconds
            * capture_rate
        )

        print(
            f"Recording for "
            f"{seconds:g} seconds..."
        )

        recording = sd.rec(
            frames,
            samplerate=capture_rate,
            channels=1,
            dtype="float32",
            device=device_index
        )

        sd.wait()

        audio = np.asarray(
            recording,
            dtype=np.float32
        ).reshape(-1)

        audio = _resample_audio(
            audio,
            capture_rate,
            self.sample_rate
        )

        segments, _info = (
            self._get_model()
            .transcribe(
                audio,
                language=(
                    language
                    if language is not None
                    else self.language
                ),
                vad_filter=True
            )
        )

        return " ".join(
            segment.text.strip()
            for segment in segments
        ).strip()


    def _resolve_input_device(
        self,
        sd: Any
    ) -> int:
        """
        Resolve a device index or name, falling back
        to the system default.
        """

        selection = (
            self.input_device
        )

        if selection is None:

            default_index = (
                sd.default.device[0]
            )

            if (
                default_index is None
                or default_index < 0
            ):
                raise RuntimeError(
                    "No default microphone "
                    "is configured"
                )

            return int(
                default_index
            )

        if isinstance(
            selection,
            int
        ):
            return selection

        if (
            not isinstance(
                selection,
                str
            )
            or not selection.strip()
        ):
            raise ValueError(
                "input_device must be an index, "
                "a device name, or None"
            )

        requested = (
            selection
            .strip()
            .casefold()
        )

        matches: list[
            tuple[
                int,
                str,
                str
            ]
        ] = []

        for index, info in enumerate(
            sd.query_devices()
        ):

            if (
                info[
                    "max_input_channels"
                ]
                <= 0
            ):
                continue

            host_api = (
                sd.query_hostapis(
                    info["hostapi"]
                )["name"]
            )

            label = (
                f"{info['name']}, "
                f"{host_api}"
            )

            matches.append(
                (
                    index,
                    info["name"],
                    label
                )
            )

        exact_labels = [
            index
            for (
                index,
                _name,
                label
            )
            in matches
            if (
                label.casefold()
                == requested
            )
        ]

        exact_names = [
            index
            for (
                index,
                name,
                _label
            )
            in matches
            if (
                name.casefold()
                == requested
            )
        ]

        candidates = (
            exact_labels
            or exact_names
        )

        if not candidates:

            candidates = [
                index
                for (
                    index,
                    name,
                    label
                )
                in matches
                if (
                    requested
                    in name.casefold()
                    or requested
                    in label.casefold()
                )
            ]

        if len(
            candidates
        ) == 1:

            return candidates[0]

        if not candidates:

            raise ValueError(
                f"No input device "
                f"matches {selection!r}"
            )

        raise ValueError(
            f"Input device name "
            f"{selection!r} is ambiguous; "
            "pass a device index or include "
            "its host API in the name"
        )


    def list_input_devices(
        self
    ) -> list[
        dict[
            str,
            Any
        ]
    ]:
        """
        Return input-capable audio devices in a
        JSON-compatible form.
        """

        import sounddevice as sd

        try:

            default_index = int(
                sd.default.device[0]
            )

        except (
            TypeError,
            ValueError,
            IndexError
        ):

            default_index = -1

        devices: list[
            dict[
                str,
                Any
            ]
        ] = []

        for index, info in enumerate(
            sd.query_devices()
        ):

            if (
                info[
                    "max_input_channels"
                ]
                <= 0
            ):
                continue

            host_api = (
                sd.query_hostapis(
                    info["hostapi"]
                )["name"]
            )

            label = (
                f"{info['name']}, "
                f"{host_api}"
            )

            devices.append({
                "index":
                    index,

                "name":
                    str(
                        info["name"]
                    ),

                "host_api":
                    str(
                        host_api
                    ),

                "label":
                    label,

                "default_samplerate":
                    float(
                        info[
                            "default_samplerate"
                        ]
                    ),

                "is_default":
                    index
                    == default_index
            })

        return devices


    # ==================================================
    # TTS
    # ==================================================

    def _create_tts_engine(
        self
    ) -> Any:
        """
        Create a fresh TTS engine.

        Do not cache the SAPI engine between requests.

        Reusing the same pyttsx3/SAPI engine can become
        silent after the first runAndWait() on Windows.
        """

        import pyttsx3

        try:

            return pyttsx3.init(
                driverName="sapi5"
            )

        except Exception:

            return pyttsx3.init()


    def list_voices(
        self
    ) -> list[
        dict[
            str,
            Any
        ]
    ]:
        """
        Return locally installed pyttsx3/SAPI voices.

        A temporary engine is created only for this
        operation and discarded afterwards.
        """

        engine = (
            self._create_tts_engine()
        )

        try:

            voices = (
                engine.getProperty(
                    "voices"
                )
                or []
            )

            result: list[
                dict[
                    str,
                    Any
                ]
            ] = []

            for voice in voices:

                languages: list[
                    str
                ] = []

                raw_languages = (
                    getattr(
                        voice,
                        "languages",
                        []
                    )
                    or []
                )

                for language in (
                    raw_languages
                ):

                    if isinstance(
                        language,
                        bytes
                    ):

                        try:

                            decoded = (
                                language.decode(
                                    "utf-8",
                                    errors="ignore"
                                )
                            )

                        except Exception:

                            decoded = str(
                                language
                            )

                    else:

                        decoded = str(
                            language
                        )

                    decoded = (
                        decoded.strip(
                            "\x00 "
                        )
                    )

                    if decoded:
                        languages.append(
                            decoded
                        )

                result.append({
                    "id":
                        str(
                            getattr(
                                voice,
                                "id",
                                ""
                            )
                        ),

                    "name":
                        str(
                            getattr(
                                voice,
                                "name",
                                "System Voice"
                            )
                        ),

                    "languages":
                        languages,

                    "gender":
                        str(
                            getattr(
                                voice,
                                "gender",
                                ""
                            )
                        ),

                    "age":
                        str(
                            getattr(
                                voice,
                                "age",
                                ""
                            )
                        )
                })

            return result

        finally:

            try:
                engine.stop()

            except Exception:
                pass


    def speak(
        self,
        text: str,
        *,
        voice_id: str | None = None,
        rate: float = 1.0,
        volume: float = 1.0,
    ) -> None:
        """
        Speak text using a fresh local SAPI engine.

        A new pyttsx3 engine is created for every speech
        request so Windows SAPI does not become stuck or
        silently stop after the first request.
        """

        if not isinstance(
            text,
            str
        ):
            raise TypeError(
                "text must be a string"
            )

        text = text.strip()

        if not text:
            return

        if rate <= 0:
            raise ValueError(
                "rate must be positive"
            )

        if not (
            0
            <= volume
            <= 1
        ):
            raise ValueError(
                "volume must be between "
                "0 and 1"
            )

        engine = None

        try:

            print(
                "[Voice] Starting speech..."
            )

            engine = (
                self._create_tts_engine()
            )

            # ------------------------------------------
            # Voice selection
            # ------------------------------------------

            if voice_id:

                raw_voices = (
                    engine.getProperty(
                        "voices"
                    )
                    or []
                )

                available_ids = {
                    str(
                        getattr(
                            voice,
                            "id",
                            ""
                        )
                    )
                    for voice
                    in raw_voices
                }

                if (
                    voice_id
                    in available_ids
                ):

                    engine.setProperty(
                        "voice",
                        voice_id
                    )

            # ------------------------------------------
            # Rate
            #
            # UI sends a multiplier:
            #
            # 0.8
            # 1.0
            # 1.2
            # ------------------------------------------

            speech_rate = max(
                80,
                min(
                    420,
                    round(
                        200
                        * rate
                    )
                )
            )

            engine.setProperty(
                "rate",
                speech_rate
            )

            # ------------------------------------------
            # Volume
            # ------------------------------------------

            engine.setProperty(
                "volume",
                float(
                    volume
                )
            )

            # ------------------------------------------
            # Speak
            # ------------------------------------------

            engine.say(
                text
            )

            engine.runAndWait()

            print(
                "[Voice] Speech completed."
            )

        except Exception as error:

            print(
                "[Voice] Speech failed: "
                f"{error}"
            )

            raise

        finally:

            if engine is not None:

                try:
                    engine.stop()

                except Exception:
                    pass

            # Do not save this engine anywhere.
            # Every request gets a new instance.
            engine = None


    def stop_speaking(
        self
    ) -> None:
        """
        Kept for API compatibility.

        Speech engines are now short-lived and destroyed
        after every request, so there is no persistent
        engine to stop.
        """

        return