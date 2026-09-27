import { useCallback, useEffect, useState } from 'react'
import { isSpeechSynthesisAvailable, speakText, stopSpeech } from '../services/speechSynthesis'

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => () => stopSpeech(), [])

  const speak = useCallback((text: string) => {
    setError(false)
    const started = speakText(text, state => {
      setSpeaking(state === 'speaking')
      setError(state === 'error')
    })
    setSpeaking(started)
    setError(!started && isSpeechSynthesisAvailable())
    return started
  }, [])

  const stop = useCallback(() => {
    stopSpeech()
    setSpeaking(false)
  }, [])

  return { available: isSpeechSynthesisAvailable(), speaking, error, speak, stop }
}
