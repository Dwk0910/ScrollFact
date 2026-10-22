import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const skillDir = dirname(dirname(fileURLToPath(import.meta.url)))
const frontendDir = dirname(dirname(dirname(skillDir)))
const evidenceDir = join(skillDir, 'evidence')
const previewPort = 4175
const debugPort = 9334
const panelUrl = `http://localhost:${previewPort}/src/sidepanel/index.html`
const chromePath =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const journey = process.argv[2] ?? ''

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

async function fetchPanel() {
  try {
    const response = await fetch(panelUrl)
    if (!response.ok) return null
    const html = await response.text()
    return html.includes('sidepanel') || html.includes('ScrollFact') ? html : null
  } catch {
    return null
  }
}

async function runDoctor() {
  const checks = []
  checks.push(['node', process.version])
  checks.push(['chrome exists', existsSync(chromePath) ? chromePath : 'MISSING'])
  checks.push([
    'dist built',
    existsSync(join(frontendDir, 'dist', 'src', 'sidepanel', 'index.html')) ? 'yes' : 'MISSING',
  ])
  const served = await fetchPanel()
  checks.push(['port 4175', served ? 'serves ScrollFact panel' : 'free or foreign'])
  for (const [name, value] of checks) console.log(`${name}: ${value}`)
  const failed = checks.some(([, value]) => value === 'MISSING')
  process.exit(failed ? 1 : 0)
}

function startPreview() {
  const viteBin = join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js')
  const child = spawn(process.execPath, [viteBin, 'preview', '--port', String(previewPort), '--strictPort'], {
    cwd: frontendDir,
    stdio: 'ignore',
  })
  return child
}

function send(ws, id, method, params) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`cdp timeout ${method}`)), 10000)
    function onMessage(event) {
      const data = JSON.parse(event.data)
      if (data.id !== id) return
      ws.removeEventListener('message', onMessage)
      clearTimeout(timer)
      if (data.error) reject(new Error(JSON.stringify(data.error)))
      else resolve(data.result)
    }
    ws.addEventListener('message', onMessage)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function connectChrome(profileDir) {
  const child = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profileDir}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  )
  let targets
  for (let i = 0; i < 40; i += 1) {
    try {
      targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((r) => r.json())
      break
    } catch {
      await delay(250)
    }
  }
  if (!targets) throw new Error('chrome debug port never answered')
  const page = targets.find((item) => item.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })
  return { child, ws }
}

async function evaluate(ws, id, expression) {
  const result = await send(ws, id, 'Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  return result.result.value
}

const journeys = {
  analyze: [
    {
      name: 'analyze completes with brief and neighbors',
      run: `(async () => {
        const button = [...document.querySelectorAll('button')].find((el) => el.textContent.includes('이 페이지 맥락/신뢰도 분석'))
        if (!button) return false
        button.click()
        await new Promise((resolve) => setTimeout(resolve, 1200))
        const text = document.body.innerText
        return text.includes('분석 완료') && text.includes('읽기 전 요약') && text.includes('이전 문단 없음') && text.includes('지금 읽는 문단')
      })()`,
    },
    {
      name: 'overview shows progress distribution claims terms sources',
      run: `(async () => {
        const text = document.body.innerText
        return text.includes('읽기 진행') && text.includes('신뢰도 분포') && text.includes('핵심 주장') && text.includes('용어') && text.includes('출처')
      })()`,
    },
    {
      name: 'next button moves to second paragraph',
      run: `(async () => {
        const button = [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === '다음 문단')
        if (!button) return false
        button.click()
        await new Promise((resolve) => setTimeout(resolve, 500))
        return document.body.innerText.includes('수도권 인구')
      })()`,
    },
  ],
  'login-guard': [
    {
      name: 'preview login shows extension only message',
      run: `(async () => {
        const button = [...document.querySelectorAll('button')].find((el) => el.textContent.includes('Google로 로그인'))
        if (!button) return false
        button.click()
        await new Promise((resolve) => setTimeout(resolve, 500))
        return document.body.innerText.includes('확장 프로그램에서만 로그인할 수 있습니다.')
      })()`,
    },
    {
      name: 'preview shows no redirect url',
      run: `(async () => !document.body.innerText.includes('chromiumapp.org'))()`,
    },
  ],
}

async function main() {
  if (journey === 'doctor') {
    await runDoctor()
    return
  }
  const steps = journeys[journey]
  if (!steps) {
    console.error(`unknown journey: ${journey}. Use analyze, login-guard, or doctor.`)
    process.exit(2)
  }
  if (await fetchPanel()) {
    console.error('port 4175 already serves the ScrollFact panel. Stop that preview first.')
    process.exit(2)
  }

  mkdirSync(evidenceDir, { recursive: true })
  const profileDir = join(tmpdir(), `scrollfact-verify-${Date.now()}`)
  const preview = startPreview()
  let chrome
  let ws
  const results = []
  try {
    let ready = false
    for (let i = 0; i < 40; i += 1) {
      if (await fetchPanel()) {
        ready = true
        break
      }
      await delay(250)
    }
    if (!ready) throw new Error('preview never served the panel page')

    const connected = await connectChrome(profileDir)
    chrome = connected.child
    ws = connected.ws
    await send(ws, 1, 'Page.enable', {})
    await send(ws, 2, 'Runtime.enable', {})
    await send(ws, 3, 'Page.navigate', { url: panelUrl })
    await delay(2000)

    let id = 10
    for (const step of steps) {
      id += 1
      const passed = await evaluate(ws, id, step.run)
      results.push({ name: step.name, passed: Boolean(passed) })
      console.log(`${passed ? 'PASS' : 'FAIL'} ${step.name}`)
    }

    const shot = await send(ws, 99, 'Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(evidenceDir, `${journey}-${stamp()}.png`), Buffer.from(shot.data, 'base64'))
  } finally {
    const evidencePath = join(evidenceDir, `${journey}-${stamp()}.json`)
    writeFileSync(evidencePath, JSON.stringify({ journey, results }, null, 2))
    console.log(`evidence: ${evidencePath}`)
    if (ws) ws.close()
    if (chrome) chrome.kill()
    preview.kill()
    await delay(300)
    rmSync(profileDir, { recursive: true, force: true })
  }
  const failed = results.filter((item) => !item.passed)
  process.exit(failed.length > 0 ? 1 : 0)
}

await main()
