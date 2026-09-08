#!/usr/bin/env node
/**
 * Verify the generated service worker's precache manifest.
 *
 * The build being green does not mean the service worker is installable. Workbox writes a
 * manifest of URLs and fetches every one of them at install; a single entry that is not on
 * disk fails the whole install, and a failed install does not quietly degrade to
 * online-only - it takes the PWA down.
 *
 * That is a live risk in this repo rather than a theoretical one, because
 * `paddock:strip-authoring-notes` deletes files from dist/ *after* vite-plugin-pwa has
 * generated the manifest. Today `globIgnores` keeps those files out of it, so the two agree.
 * If either side is edited without the other, they stop agreeing, and nothing else notices
 * until a user's app stops working offline.
 *
 * Run after `npm run build`. Reads dist/ only; changes nothing.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const sw = path.join(dist, 'sw.js')

const failures = []
const fail = (msg) => failures.push(msg)

if (!fs.existsSync(sw)) {
  console.error('dist/sw.js not found. Run `npm run build` first.')
  process.exit(1)
}

const source = fs.readFileSync(sw, 'utf8')

/**
 * vite-plugin-pwa emits the manifest minified, as `{revision:"...",url:"..."}` with unquoted
 * keys. Parsed by pattern rather than by evaluating the file, since running a service worker
 * bundle in node is neither safe nor possible.
 */
const urls = [...source.matchAll(/url:"([^"]+)"/g)].map((m) => m[1])

/**
 * An empty parse must be an error, not a pass.
 *
 * This is the failure this script is most likely to have itself: if the emitted shape ever
 * changes, the pattern above matches nothing, every loop below iterates zero times, and the
 * script reports success while checking nothing at all. That happened once while writing it.
 */
if (urls.length === 0) {
  console.error(
    'Parsed 0 precache entries from dist/sw.js.\n' +
      'The manifest format has probably changed - fix the pattern in this script rather than ' +
      'assuming the manifest is empty.'
  )
  process.exit(1)
}

// 1. Every entry must exist, or SW install fails outright.
const missing = urls.filter((u) => !fs.existsSync(path.join(dist, decodeURIComponent(u))))
if (missing.length > 0) {
  fail(
    `${missing.length} precache entr${missing.length === 1 ? 'y is' : 'ies are'} not on disk. ` +
      'Service worker install would fail, taking the PWA offline-capability down entirely:\n' +
      missing.map((m) => `    ${m}`).join('\n')
  )
}

// 2. Author-facing prose must not reach users, in the manifest or on the server.
const AUTHORING = /(^|\/)(CLAUDE\.md|_template[^/]*\.md)$/

const inManifest = urls.filter((u) => AUTHORING.test(u))
if (inManifest.length > 0) {
  fail(
    `${inManifest.length} author-facing file(s) in the precache manifest - these would be ` +
      'downloaded onto every user\'s device at install:\n' +
      inManifest.map((m) => `    ${m}`).join('\n')
  )
}

const onDisk = []
const walk = (dir) => {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (AUTHORING.test(full)) onDisk.push(path.relative(dist, full))
  }
}
walk(path.join(dist, 'guides'))
if (onDisk.length > 0) {
  fail(
    `${onDisk.length} author-facing file(s) still in dist/ - these would be publicly ` +
      'fetchable in production:\n' +
      onDisk.map((m) => `    ${m}`).join('\n')
  )
}

// 3. The guides must actually be precached. Guards the same regression as
//    src/test/precache.test.ts, but against the built output rather than the config text -
//    the config can be right while an ignore rule or a path change empties the result.
const guideMarkdown = urls.filter((u) => u.startsWith('guides/') && u.endsWith('.md'))
const guideIndexes = urls.filter((u) => u.startsWith('guides/') && u.endsWith('index.json'))

if (guideMarkdown.length === 0) {
  fail('No guide markdown is precached - the guide libraries would be blank offline.')
}
if (guideIndexes.length < 3) {
  fail(
    `Only ${guideIndexes.length} of 3 guide index files are precached (microgreens, ` +
      'vegetables, propagation). A library cannot render without its index, so its guides ' +
      'would be on the device and unreachable.'
  )
}

// Report.
if (failures.length > 0) {
  console.error('\nPrecache verification FAILED\n')
  for (const f of failures) console.error(`  - ${f}\n`)
  process.exit(1)
}

console.log(
  `Precache OK: ${urls.length} entries, all present on disk. ` +
    `${guideMarkdown.length} guides + ${guideIndexes.length} indexes cached, no authoring files.`
)
