// Run: node --test tests/speech.test.cjs
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const test = require('node:test')
const ts = require('typescript')

class MockUtterance {
  constructor(text) { this.text = text; this.onstart = null; this.onend = null; this.onerror = null }
}
global.SpeechSynthesisUtterance = MockUtterance
const synthesis = {
  utterances: [],
  cancellations: 0,
  speak(utterance) { this.utterances.push(utterance) },
  cancel() {
    this.cancellations += 1
    this.utterances.at(-1)?.onerror?.({ error: 'interrupted' })
  },
}
global.window = { speechSynthesis: synthesis }

const sourcePath = path.resolve(__dirname, '../src/services/speechSynthesis.ts')
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText
const speech = { exports: {} }
new Function('exports', compiled)(speech.exports)

function reset() {
  synthesis.utterances = []
  synthesis.cancellations = 0
  global.window.speechSynthesis = synthesis
}

test('speaks only the supplied nonempty assistant text and reports playback lifecycle', () => {
  reset()
  const states = []
  assert.equal(speech.exports.speakText('Jarvis response', state => states.push(state)), true)
  const utterance = synthesis.utterances[0]
  assert.equal(utterance.text, 'Jarvis response')
  utterance.onstart()
  utterance.onend()
  assert.deepEqual(states, ['speaking', 'ended'])
  assert.equal(speech.exports.speakText('  '), false)
})

test('a new response cancels the previous speech and stale cancel events are ignored', () => {
  reset()
  const previousStates = []
  const nextStates = []
  speech.exports.speakText('first reply', state => previousStates.push(state))
  const previous = synthesis.utterances[0]
  speech.exports.speakText('second reply', state => nextStates.push(state))
  assert.equal(synthesis.cancellations, 1)
  assert.equal(synthesis.utterances[1].text, 'second reply')
  previous.onerror({ error: 'interrupted' })
  assert.deepEqual(previousStates, [])
  synthesis.utterances[1].onstart()
  assert.deepEqual(nextStates, ['speaking'])
  speech.exports.stopSpeech()
  assert.equal(synthesis.cancellations, 2)
  assert.deepEqual(nextStates, ['speaking'])
})

test('unavailable speech synthesis is reported without throwing', () => {
  reset()
  delete global.window.speechSynthesis
  assert.equal(speech.exports.isSpeechSynthesisAvailable(), false)
  assert.equal(speech.exports.speakText('Jarvis response'), false)
  assert.doesNotThrow(() => speech.exports.stopSpeech())
})
