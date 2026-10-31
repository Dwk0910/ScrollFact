import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// Check the installable artifact, not a component fixture. A dev loader must fail.
const frontend = fileURLToPath(new URL('../', import.meta.url))
const directory = resolve(frontend, process.argv[2] ?? 'dist')
function asset(reference, parent = directory) {
  assert.ok(!/^[a-z]+:/i.test(reference), `External extension script: ${reference}`)
  const path = reference.startsWith('/')
    ? resolve(directory, `.${reference}`)
    : resolve(parent, reference)
  assert.ok(path.startsWith(directory + sep), `Asset outside build: ${reference}`)
  assert.ok(statSync(path).isFile(), `Missing asset: ${reference}`)
  return path
}

const manifest = JSON.parse(readFileSync(asset('manifest.json'), 'utf8'))
assert.equal(manifest.manifest_version, 3)
asset(manifest.background.service_worker)
for (const script of manifest.content_scripts ?? []) {
  for (const file of [...(script.js ?? []), ...(script.css ?? [])]) asset(file)
}
for (const icon of Object.values(manifest.icons ?? {})) asset(icon)
for (const icon of Object.values(manifest.action?.default_icon ?? {})) asset(icon)
assert.ok(manifest.web_accessible_resources.some(({ resources }) =>
  resources.includes('src/sidepanel/index.html')), 'Embedded panel must be web accessible')
asset('src/sidepanel/index.html')

let checked = 0
for (const file of readdirSync(directory, { recursive: true })) {
  if (!['.js', '.html', '.css'].includes(extname(file))) continue
  const path = asset(file)
  const text = readFileSync(path, 'utf8')
  assert.ok(!/CRXJS DEV MODE|@vite\/|@crx\/client|vendor\/vite-client|react-refresh/.test(text),
    `${file}: development output detected. Load dist after npm run build; dist-dev requires Vite.`)
  if (extname(file) === '.html') {
    for (const match of text.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/g))
      asset(match[1], dirname(path))
  }
  if (extname(file) === '.js') {
    for (const match of text.matchAll(/\bimport\s*(?:[^;\n]*?\bfrom\s*)?["']([^"']+)["']/g))
      asset(match[1], dirname(path))
  }
  checked++
}
console.log(`Extension build OK: ${checked} files checked in ${directory}`)
