// Run: node --test tests/auth.test.cjs (uses only installed project dependencies).
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const test = require('node:test')
const ts = require('typescript')
const React = require('react')
const { renderToString } = require('react-dom/server')
const router = require('react-router-dom')

global.window = new EventTarget()
window.location = { hostname: 'localhost' }
const modules = new Map()
function load(filename) {
  if (filename.endsWith('.css')) return {}
  if (!path.extname(filename)) filename += fs.existsSync(filename + '.ts') ? '.ts' : '.tsx'
  if (modules.has(filename)) return modules.get(filename).exports
  const module = { exports: {} }
  modules.set(filename, module)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  function resolve(specifier) {
    if (specifier.startsWith('.')) return load(path.resolve(path.dirname(filename), specifier))
    if (specifier === 'react-router-dom') return {
      ...router,
      // Make navigation intent observable in server-rendered route-guard tests.
      Navigate: props => React.createElement('span', { 'data-redirect': props.to, 'data-from': props.state?.from }),
    }
    return require(specifier)
  }
  new Function('require', 'module', 'exports', code)(resolve, module, module.exports)
  return module.exports
}
const src = path.resolve(__dirname, '../src')
const api = load(path.join(src, 'services/api.ts'))
const auth = load(path.join(src, 'services/auth.ts'))
const { AuthContext } = load(path.join(src, 'auth/AuthContext.ts'))
const { RequireAuth } = load(path.join(src, 'auth/AuthProvider.tsx'))
const AuthPage = load(path.join(src, 'auth/AuthPage.tsx')).default

function render(element, state, pathname = '/memory') {
  return renderToString(React.createElement(router.MemoryRouter, { initialEntries: [pathname] },
    React.createElement(AuthContext.Provider, { value: { user: null, status: 'ready', error: '', retry() {}, ...state } }, element)))
}

test('all Jarvis routes redirect anonymous users; loading/errors never reveal content', () => {
  const element = React.createElement(RequireAuth, null, React.createElement('div', null, 'PRIVATE_CONTENT'))
  for (const pathname of ['/chat', '/tools', '/automation', '/files', '/memory', '/settings', '/']) {
    const html = render(element, {}, pathname)
    assert.ok(html.includes('data-redirect="/sign-in"'))
    assert.ok(!html.includes('PRIVATE_CONTENT'))
  }
  for (const status of ['loading', 'error']) assert.ok(!render(element, { status }).includes('PRIVATE_CONTENT'))
  assert.ok(render(element, { user: { id: 7, username: 'demo' } }).includes('PRIVATE_CONTENT'))
})

test('sign-up/sign-in forms expose validation and authenticated users return safely', () => {
  const signup = render(React.createElement(AuthPage, { mode: 'signup' }), {}, '/sign-up')
  assert.ok(signup.includes('Confirm password'))
  assert.ok(signup.includes('minLength="12"'))
  assert.ok(signup.includes('type="password"'))
  assert.ok(signup.includes('autoComplete="new-password"'))
  const login = render(React.createElement(AuthPage, { mode: 'login' }), {}, '/sign-in')
  assert.ok(login.includes('current-password'))
  assert.ok(!login.includes('Confirm password'))
  assert.equal(auth.returnPath('https://evil.example'), '/chat')
  assert.equal(auth.returnPath('//evil.example'), '/chat')
  assert.equal(auth.returnPath('/memory'), '/memory')
})

test('signup/login/session reload/logout request contracts and invalid credentials', async () => {
  const user = { id: 1, username: 'demo_user' }
  const calls = []
  global.fetch = async (url, options) => {
    calls.push({ url, options })
    return new Response(JSON.stringify({ user }), { status: 200 })
  }
  assert.deepEqual(await auth.submitCredentials('signup', ' Demo_User ', 'valid passphrase 123'), user)
  assert.deepEqual(await auth.submitCredentials('login', 'demo_user', 'valid passphrase 123'), user)
  assert.deepEqual(await auth.getSession(), user)
  await auth.endSession()
  assert.deepEqual(calls.map(call => call.url), [
    'http://localhost:8000/auth/signup', 'http://localhost:8000/auth/login',
    'http://localhost:8000/auth/me', 'http://localhost:8000/auth/logout',
  ])
  assert.ok(calls.every(call => call.options.credentials === 'include'))
  assert.equal(JSON.parse(calls[0].options.body).username, 'demo_user')
  global.fetch = async () => new Response('{"detail":"Invalid username or password."}', { status: 401 })
  await assert.rejects(auth.submitCredentials('login', 'demo_user', 'wrong passphrase'), /Invalid username or password/)
  assert.equal(await auth.getSession(), null)
  global.fetch = async () => new Response('{}', { status: 404 })
  await assert.rejects(auth.getSession(), /endpoints are unavailable/)
  global.fetch = async () => { throw new Error('Offline') }
  await assert.rejects(auth.endSession(), /Could not reach/)
})

test('protected API calls send cookies and notify the guard when sessions expire', async () => {
  let expired = 0
  const listener = () => { expired += 1 }
  window.addEventListener(api.SESSION_EXPIRED_EVENT, listener)
  global.fetch = async (_url, options) => {
    assert.equal(options.credentials, 'include')
    return new Response('{}', { status: 401 })
  }
  await api.apiFetch('/memories')
  assert.equal(expired, 1)
  await api.apiFetch('/auth/login', {}, false)
  assert.equal(expired, 1)
  window.removeEventListener(api.SESSION_EXPIRED_EVENT, listener)
})
