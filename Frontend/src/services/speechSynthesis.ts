export type SpeechState = 'speaking' | 'ended' | 'error'

let activeUtterance: SpeechSynthesisUtterance | null = null

export function isSpeechSynthesisAvailable(): boolean {
  return typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined'
}

export function stopSpeech(): void {
  if (!isSpeechSynthesisAvailable() || activeUtterance === null) return
  // Clear identity first because cancel can dispatch an asynchronous error event.
  activeUtterance = null
  window.speechSynthesis.cancel()
}

export function speakText(text: string, onState?: (state: SpeechState) => void): boolean {
  if (!text.trim() || !isSpeechSynthesisAvailable()) return false

  stopSpeech()
  try {
    const utterance = new SpeechSynthesisUtterance(text)
    activeUtterance = utterance
    utterance.onstart = () => {
      if (activeUtterance === utterance) onState?.('speaking')
    }
    utterance.onend = () => {
      if (activeUtterance === utterance) {
        activeUtterance = null
        onState?.('ended')
      }
    }
    utterance.onerror = () => {
      if (activeUtterance === utterance) {
        activeUtterance = null
        onState?.('error')
      }
    }
    window.speechSynthesis.speak(utterance)
    return true
  } catch {
    activeUtterance = null
    onState?.('error')
    return false
  }
}
