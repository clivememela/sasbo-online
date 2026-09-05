import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { DEFECTS } from './knownDefects.js'
import { readSources } from './sourceScan.js'

/**
 * Discovering every endpoint this browser calls, from its own source.
 *
 * Extraction lives in a module rather than inside the test so that the FLOORS
 * in the test can be measured through this exact discovery, by running it,
 * rather than by a `grep` that would disagree with it by design. A floor
 * justified by a number the guard never produces is how a comment goes quietly
 * wrong.
 */

const HERE = dirname(fileURLToPath(import.meta.url))

/** `src/test/` -> repo root. */
export const REPO_ROOT = resolve(HERE, '..', '..')

export const SURFACE_FILE = join(HERE, 'api-surface.txt')
export const VOCABULARY_FILE = join(HERE, 'api-vocabulary.json')

/**
 * Endpoints the browser calls that THIS SERVER DOES NOT HAVE.
 *
 * The value is the REGISTER ROW ITSELF, not a copy of its prose. An earlier
 * draft restated each defect here, which quietly made this a SECOND register
 * that `defectPopulation.test.js` could not see -- and a second register is
 * precisely what this suite exists to prevent, not to create. Each row also
 * carries a skipped standard-facing test and a live pin in
 * `apiContract.test.js`, so the correspondence guard counts them like any other.
 *
 * Asserted exactly, in both directions -- every entry still missing, and
 * nothing else missing. A silent exclusion list would hide the third one when
 * it arrives, and would let a repaired endpoint sit here forever pretending to
 * still be broken.
 */
export const KNOWN_MISSING = {
  '/api/districts': DEFECTS.A1,
  '/api/debounce': DEFECTS.A2,
}

/**
 * Paths the browser builds dynamically and the static scan cannot see.
 *
 * Empty today, and asserted to be empty rather than merely absent -- an
 * explicit list nobody can see is where the next missed endpoint hides. Every
 * `apiUrl(...)` call site in this repository passes a literal or a template
 * literal, and the scan reads both.
 */
export const DYNAMIC_PATHS = []

/**
 * The placeholder an interpolation collapses to, mid-normalisation.
 *
 * A NAMED token rather than a bare space or an escape. Earlier drafts used a
 * single space here and, later, a backreference nearby -- and the shell
 * pipeline used to edit this file turned both into raw control bytes, which
 * git then treats as binary and which made the regex match nothing while still
 * looking correct in a diff. A plain alphanumeric token that is impossible in
 * a URL path cannot fail that way.
 */
const PARAM = 'PARAMPARAM'

/**
 * A path as the committed surface writes it.
 *
 * `/api/members/${id}` and `/api/members/42` both become `/api/members/{id}`,
 * because the surface is a list of ROUTES and a route's parameter has no value
 * until a request is made.
 */
export function normalisePath(raw) {
  // Interpolations first, and to a token containing no `?`, so that a ternary
  // inside one cannot be mistaken for the start of a query string.
  let path = raw.replace(/\$\{[^}]*\}/g, PARAM)

  // Everything from `?` is a query string. The server routes on the path.
  const query = path.indexOf('?')
  if (query !== -1) path = path.slice(0, query)

  // A segment that STARTS with an interpolation is a path parameter. Note it
  // need not be the whole segment: `/api/members/${id}-draft` collapses to
  // `/api/members/{id}-draft`, which is deliberate -- the server has no such
  // route, and silently rewriting it to `/api/members/{id}` would hide that.
  path = path.split('/' + PARAM).join('/{id}')

  // An interpolation that does NOT start a segment -- `/api/job-grades${qs}` --
  // is a suffix the caller appended, in practice a query string built
  // elsewhere. It is not part of the route, so it goes.
  path = path.split(PARAM).join('')

  // A trailing slash is the same route.
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)

  return path
}

/** The service modules the scan reads: `src/services/*.js`, tests excluded. */
export function discoverServiceModules() {
  return readSources(join(REPO_ROOT, 'src', 'services'), {
    root: REPO_ROOT,
    pattern: /\.js$/,
  }).filter((source) => !source.path.includes('.test.'))
}

/**
 * Every `apiUrl(...)` call site under `src/services/`, with its file and line.
 *
 * Reads the ARGUMENT rather than matching a path-shaped regex against the whole
 * file. A regex for `/api/...` would also match the string in a comment, in a
 * fixture and in an unrelated log message -- and would miss a path built with a
 * template literal, which is most of them here.
 */
export function discoverEndpoints() {
  const calls = []

  // Built once, not once per line. `lastIndex` is reset explicitly, because a
  // /g regex carries state between calls and reusing one without resetting is
  // how a scan silently skips every other match.
  const pattern = /apiUrl\(\s*(['"`])([^'"`]*)\1/g

  for (const source of discoverServiceModules()) {
    source.code.split('\n').forEach((line, index) => {
      pattern.lastIndex = 0
      let match
      while ((match = pattern.exec(line)) !== null) {
        calls.push({
          path: normalisePath(match[2]),
          raw: match[2],
          file: source.path,
          line: index + 1,
          at: `${source.path}:${index + 1}`,
        })
      }
    })
  }

  return calls
}

/** The routes the server publishes, as `METHOD /path` lines. */
export function committedSurface() {
  return readFileSync(SURFACE_FILE, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/** Just the paths from the committed surface, deduplicated. */
export function committedPaths() {
  return new Set(committedSurface().map((line) => line.slice(line.indexOf(' ') + 1)))
}

/** The committed vocabulary artifact, parsed. */
export function committedVocabulary() {
  return JSON.parse(readFileSync(VOCABULARY_FILE, 'utf8'))
}
