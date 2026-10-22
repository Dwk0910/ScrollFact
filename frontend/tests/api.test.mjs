import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { randomBytes } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import vm from 'node:vm'
import test from 'node:test'

const source = (path) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
const main = source('sidepanel/main.tsx')
const start = main.indexOf('window.SCROLLFACT_MOCK_RESPONSE =')
const fixtureContext = vm.createContext({ window: {} })
vm.runInContext(
  main.slice(start, main.indexOf('\n}\n', start) + 3),
  fixtureContext,
)
const fixture = structuredClone(fixtureContext.window.SCROLLFACT_MOCK_RESPONSE)
const snapshot = {
  snapshotId: fixture.snapshotId,
  url: fixture.document.url,
  title: '한글 원문',
  html: '<html><body><p>한글 & "원문"</p></body></html>'.repeat(1000),
}
const queued = {
  analysisId: fixture.analysisId,
  snapshotId: snapshot.snapshotId,
  status: 'queued',
  phase: 'queued',
}
const completed = { ...queued, status: 'completed' }
const response = (body, status = 200) =>
  new Response(JSON.stringify(body), { status })
function setup(fetch) {
  const context = vm.createContext({
    URL,
    Blob,
    Response,
    FormData,
    CompressionStream,
    AbortSignal,
    DOMException,
    setTimeout: (fn, ms) => setTimeout(fn, ms === 2000 ? 1 : ms),
    clearTimeout,
    fetch,
  })
  vm.runInContext(
    stripTypeScriptTypes(source('types/index.ts').replaceAll('export ', '')) +
      '\n' +
      stripTypeScriptTypes(
        source('api/analyze.ts')
          .replace(/^import[\s\S]*?from '\.\.\/types'\n/, '')
          .replaceAll('export ', ''),
      ),
    context,
  )
  return context
}

test('uploads exact UTF-8 HTML as gzip multipart; polls actual progress and final result', async () => {
  const calls = [],
    progress = []
  const api = setup(async (url, init) => {
    calls.push({ url, init })
    if (init.method === 'POST') {
      const req = new Request(url, init)
      assert.match(
        req.headers.get('content-type'),
        /^multipart\/form-data; boundary=/,
      )
      assert.equal(req.headers.get('idempotency-key'), snapshot.snapshotId)
      const form = await req.formData()
      const meta = JSON.parse(await form.get('metadata').text())
      assert.equal(meta.htmlBytes, Buffer.byteLength(snapshot.html))
      assert.equal(meta.encoding, 'gzip')
      const binary = Buffer.from(await form.get('document').arrayBuffer())
      assert.equal(gunzipSync(binary).toString('utf8'), snapshot.html)
      assert.ok(binary.length < meta.htmlBytes)
      return response(queued, 202)
    }
    if (url.endsWith('/result')) return response(fixture)
    return calls.length === 2
      ? response({
          ...queued,
          status: 'running',
          phase: 'checking_sources',
          sources: { completed: 2, total: 5, failed: 1 },
        })
      : response(completed)
  })
  const result = await api.createApiAnalyzer('https://api.example.test/')(
    snapshot,
    new AbortController().signal,
    (p) => progress.push(p),
  )
  assert.equal(result.overview.score, fixture.overview.score)
  assert.deepEqual(
    progress.map((p) => p.phase),
    ['compressing', 'uploading', 'queued', 'checking_sources'],
  )
  assert.equal(progress.at(-1).sources.completed, 2)
  assert.equal(
    calls[1].url,
    `https://api.example.test/v1/analyses/${fixture.analysisId}`,
  )
  assert.equal(calls.length, 4)
  assert.ok(calls[3].url.endsWith('/result'))
})

test('cancelling a known job stops polling and requests server cancellation', async () => {
  const controller = new AbortController(),
    methods = []
  const api = setup(async (_url, init) => {
    methods.push(init.method ?? 'GET')
    if (init.method === 'DELETE') {
      assert.equal(init.signal.aborted, false)
      return new Response(null, { status: 204 })
    }
    return response(queued, 202)
  })
  await assert.rejects(
    api.createApiAnalyzer('https://api.example.test')(
      snapshot,
      controller.signal,
      (p) => {
        if (p.phase === 'queued') controller.abort()
      },
    ),
    { name: 'AbortError' },
  )
  assert.deepEqual(methods, ['POST', 'DELETE'])
})

test('rejects oversize input before uploading, including compressed limit', async () => {
  const api = setup(() => {
    throw new Error('must not upload')
  })
  const analyze = api.createApiAnalyzer('https://api.example.test')
  await assert.rejects(
    analyze(
      { ...snapshot, html: 'a'.repeat(20 * 1024 * 1024 + 1) },
      new AbortController().signal,
    ),
    /20 MiB/,
  )
  await assert.rejects(
    analyze(
      { ...snapshot, html: randomBytes(6 * 1024 * 1024).toString('base64') },
      new AbortController().signal,
    ),
    /5 MiB/,
  )
})

test('rejects invalid source counts, wrong identities, legacy responses and server errors', async () => {
  const api = setup(() => response(queued))
  for (const sources of [
    { completed: -1, total: 4, failed: 0 },
    { completed: 5, total: 4, failed: 0 },
    { completed: 1, total: null, failed: 2 },
  ]) {
    assert.equal(api.isAnalysisJob({ ...queued, sources }), false)
  }
  assert.equal(
    api.isAnalysisJob({
      ...queued,
      sources: { completed: 2, total: null, failed: 0 },
    }),
    true,
  )
  for (const [body, status, error] of [
    [{ ...queued, snapshotId: 'wrong' }, 202, /다른 페이지/],
    [fixture, 200, /비동기/],
    [{ detail: '서버가 바쁩니다' }, 503, /서버가 바쁩니다/],
    [{ detail: '크기 초과' }, 413, /크기 초과/],
  ]) {
    const client = setup(() => response(body, status))
    await assert.rejects(
      client.createApiAnalyzer('https://api.example.test')(
        snapshot,
        new AbortController().signal,
      ),
      error,
    )
  }
})

test('a failed job ends with server error, without another cancellation or poll', async () => {
  let calls = 0
  const api = setup(() => {
    calls++
    return calls === 1
      ? response(queued, 202)
      : response({ ...queued, status: 'failed', error: '출처 확인 실패' })
  })
  await assert.rejects(
    api.createApiAnalyzer('https://api.example.test')(
      snapshot,
      new AbortController().signal,
    ),
    /출처 확인 실패/,
  )
  assert.equal(calls, 2)
})

test('rejects a result from a different snapshot without deleting a completed job', async () => {
  const methods = []
  const api = setup((url, init) => {
    methods.push(init.method ?? 'GET')
    return url.endsWith('/result')
      ? response({ ...fixture, snapshotId: 'wrong-snapshot' })
      : response(completed, init.method === 'POST' ? 202 : 200)
  })
  await assert.rejects(
    api.createApiAnalyzer('https://api.example.test')(
      snapshot,
      new AbortController().signal,
    ),
    /다른 페이지/,
  )
  assert.deepEqual(methods, ['POST', 'GET'])
})
