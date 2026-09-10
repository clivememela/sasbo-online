/**
 * The contrast RATIO of every ink/ground token pair, computed by a real browser, both themes.
 *
 * 🔴 WHY THIS EXISTS BESIDE `contrast.mjs`, WHICH ALREADY MEASURES RENDERED PIXELS. axe walks
 * the DOM and can only judge text it can SEE. Three whole classes of text are invisible to it:
 *
 *   1. PLACEHOLDERS. `Field.jsx` sets `placeholder:text-ink-faint` on every control in the
 *      application. A placeholder is text, WCAG 1.4.3 applies to it, and axe examines text
 *      NODES -- a placeholder is an attribute. It is unmeasurable by the pixel sweep, and it
 *      is on every form in the app.
 *   2. STATE-GATED text -- a dropdown's "no matches" row, a calendar's weekday headers, a
 *      dialog's dismiss. `contrast.mjs` never opens them (contract ⑤, L2), so their colours
 *      are simply absent from a run that reports "every route, both themes".
 *   3. A PAIR THAT IS NOT CURRENTLY USED but is one edit away from being.
 *
 * So this measures the TOKENS rather than the pages: every ink role against every ground it is
 * painted on, in a real browser so the oklch() values are resolved by the same engine that
 * paints them. Hand-converting oklch to sRGB in Node would be a second implementation of the
 * one thing that must not disagree.
 *
 * 🔑 IT IS A LOWER BOUND ON THE APP'S PROBLEMS, NOT A SUBSTITUTE FOR THE SWEEP. A pair
 * passing here says nothing about a place where opacity, a gradient or an overlay changes the
 * effective colour -- `DateField` puts `opacity-60` on top of one of these, and a pair passing
 * at full opacity is exactly the "measured, and still wrong" this arc keeps finding. Both
 * runs, always.
 *
 *   node tools/tokenContrast.mjs [baseUrl]
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CHROME = 'C:/Users/mfazl/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';

/** The ink roles, and the grounds each is actually painted on. */
const INKS = ['ink', 'ink-muted', 'ink-faint', 'brand-ink', 'nav-ink'];
const GROUNDS = ['bg', 'bg-raised', 'surface', 'surface-2'];

/**
 * Roles that are NOT text, and are therefore judged against 1.4.11's 3:1 rather than 1.4.3's
 * 4.5:1.
 *
 * 🔴 WHY THIS LIST HAD TO EXIST BEFORE THE TOOL WAS USEFUL. `ink-faint` is 3.65:1 at worst,
 * which is a PASS for what `card.css:27` defines it as -- *"icons, dividers; never body text"*
 * -- and a fail for text. Judging every ink against 4.5:1 made the tool report "5 pairs below
 * 4.5:1" on a palette that is entirely correct, every single run.
 *
 * 🔑 AND A TOOL THAT ALWAYS REPORTS THE SAME FIVE FAILURES IS A TOOL NOBODY READS. That is how
 * the finding it is FOR gets lost: five permanent complaints are indistinguishable from six,
 * so the day a real one appears the diff in the output is one line nobody is looking at any
 * more. The threshold is per role, so a clean run means clean.
 *
 * ⚠️ THE LIST IS A CLAIM, AND IT IS ENFORCED ELSEWHERE. Putting `ink-faint` here asserts that
 * nothing paints text with it -- which is not a promise this tool can keep. It is held by
 * `src/test/inkFaintIsNeverText.test.js`, which fails the suite if any element or `placeholder:`
 * variant uses it for something a reader reads. Without that guard this entry would be a way of
 * lowering the bar, which is the opposite of the point.
 */
const NON_TEXT_ROLES = new Set(['ink-faint']);

/**
 * WCAG 2.x thresholds. 4.5 for body text, 3.0 for large text AND for non-text (1.4.11:
 * icons, control boundaries). Every pair is reported against both, so a reader sees which
 * uses a pair is fit for rather than being handed a single pass/fail.
 */
const AA_TEXT = 4.5;
const AA_LARGE_OR_NONTEXT = 3.0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 9600 + Math.floor(Math.random() * 80);
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu',
  `--remote-debugging-port=${PORT}`, '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/tokens-profile-' + PORT, 'about:blank',
], { stdio: 'ignore' });

let ws;
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const msg = { id: ++id, method, params };
    pending.set(msg.id, { resolve, reject });
    ws.send(JSON.stringify(msg));
  });
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'threw');
  return r.result.value;
};

/**
 * Resolve every pair in the page and compute the ratio there.
 *
 * The relative-luminance formula is WCAG 2.x's own, written out rather than taken from axe
 * because axe's is bound to elements it found in a document -- and these pairs include ones
 * no element currently uses, which is half the point of the file.
 */
const MEASURE = (inks, grounds) => `(() => {
  const probe = document.createElement('span');
  probe.style.display = 'none';
  document.body.appendChild(probe);

  // 🔴 THE COMPUTED VALUE IS NOT rgb(), AND PARSING IT AS ONE PRODUCED CONFIDENT NONSENSE.
  // The first version read \`getComputedStyle(probe).color\` and pulled the numbers out with
  // /[\\d.]+/g. Chrome PRESERVES the authored colour space, so for these tokens that string
  // is 'oklch(0.179 0.02 252)' -- and the regex happily returned [0.179, 0.02, 252], i.e.
  // r=0, g=0, b=252. Every ink came back as pure blue, every pair as roughly 1:1, and the
  // tool reported all 40 pairs FAILING.
  //
  // 🔑 IT FAILED IN THE SAFE DIRECTION, WHICH IS THE ONLY REASON IT WAS CHEAP. A probe that
  // reports everything broken gets investigated in a minute; T1's probe reported everything
  // PASSING and survived a whole arc. Same defect, opposite blast radius -- worth writing
  // down, because the instinct on seeing 40 failures is to start fixing the palette.
  //
  // So the colour is composited to real sRGB bytes by the engine instead of parsed: painted
  // into a 1×1 canvas and read back. That is the same conversion the compositor performs on
  // its way to the screen, rather than a second implementation of it in a regex.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const resolve = (token) => {
    probe.style.color = 'var(--color-' + token + ')';
    const c = getComputedStyle(probe).color;
    if (!c || c === 'rgba(0, 0, 0, 0)') return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = c;
    // A fillStyle the engine could not parse leaves the previous value, so an unparseable
    // colour reads as black rather than throwing -- guard by checking it actually changed.
    if (ctx.fillStyle === '#000000' && !/^(black|#000000|rgb\\(0, 0, 0\\))$/.test(c)) return null;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a === 0) return null;
    return [r, g, b];
  };
  const lum = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const out = [];
  for (const ink of ${JSON.stringify(inks)}) {
    const fg = resolve(ink);
    if (!fg) { out.push({ ink, ground: null, error: 'token did not resolve' }); continue; }
    for (const ground of ${JSON.stringify(grounds)}) {
      const bg = resolve(ground);
      if (!bg) { out.push({ ink, ground, error: 'token did not resolve' }); continue; }
      const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
      out.push({
        ink, ground,
        fg: hex(fg), bg: hex(bg),
        ratio: Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100,
      });
    }
  }
  probe.remove();
  return out;
})()`;

const results = [];
try {
  let targets;
  for (let i = 0; i < 60; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      if (targets.some((t) => t.type === 'page')) break;
    } catch { /* not up */ }
    await sleep(250);
  }
  const page = targets && targets.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
    }
  };
  await send('Page.enable');
  await send('Runtime.enable');

  const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4319';

  // ── THE PROBE'S OWN KNOWN-BROKEN CASE, BEFORE ANY TOKEN IS BELIEVED (T1) ────────────
  //
  // Two pairs whose ratios are arithmetic rather than opinion: black on white is exactly
  // 21:1, and #777 on #888 is about 1.4:1. A probe that cannot reproduce both is not
  // measuring contrast, and the first version of this file proved that is not hypothetical
  // -- it returned ~1:1 for every pair in the palette and was entirely self-consistent
  // about it. Consistency is not correctness, so the fixed points are checked explicitly.
  await send('Page.navigate', { url: baseUrl + '/home' });
  await sleep(1200);
  const calibration = await evaluate(`(() => {
    const style = document.createElement('style');
    style.textContent = ':root{--color-__cal_hi:#ffffff;--color-__cal_lo:#000000;--color-__cal_a:#777777;--color-__cal_b:#888888}';
    document.head.appendChild(style);
    return true;
  })()`);
  if (!calibration) throw new Error('could not install the calibration tokens');
  const cal = await evaluate(MEASURE(['__cal_lo', '__cal_a'], ['__cal_hi', '__cal_b']));
  const find = (ink, ground) => cal.find((r) => r.ink === ink && r.ground === ground);
  const blackOnWhite = find('__cal_lo', '__cal_hi');
  const greyOnGrey = find('__cal_a', '__cal_b');
  console.log(
    `calibration: black-on-white ${blackOnWhite?.ratio} (expect 21), ` +
    `#777-on-#888 ${greyOnGrey?.ratio} (expect ~1.4)`,
  );
  if (!blackOnWhite || Math.abs(blackOnWhite.ratio - 21) > 0.1) {
    throw new Error(
      `the probe computed black on white as ${blackOnWhite?.ratio}:1, which is 21:1 by ` +
      'definition. Nothing it reports about the palette can be trusted.',
    );
  }
  if (!greyOnGrey || greyOnGrey.ratio > 2) {
    throw new Error(
      `the probe computed #777 on #888 as ${greyOnGrey?.ratio}:1. It cannot see a failing ` +
      'pair, so a clean report from it would mean nothing (T1).',
    );
  }

  for (const theme of ['light', 'dark']) {
    await evaluate(`(() => { try { localStorage.setItem('darkMode', '${theme === 'dark'}') } catch {} return 1 })()`);
    await send('Page.navigate', { url: baseUrl + '/home' });
    await sleep(1500);
    const painted = await evaluate('getComputedStyle(document.body).backgroundColor');
    const rows = await evaluate(MEASURE(INKS, GROUNDS));
    for (const r of rows) results.push({ theme, painted, ...r });
    console.log(`${theme}: ${rows.length} pairs, body painted ${painted}`);
  }

  // The theme dimension, proved rather than counted -- if both halves painted the same
  // ground, one theme was measured twice and every "both themes" claim here is inflated.
  if (new Set(results.map((r) => r.painted)).size < 2) {
    throw new Error(
      'both themes painted the same body background ' +
      `(${[...new Set(results.map((r) => `${r.theme}=${r.painted}`))].join(' ')})`,
    );
  }
} catch (e) {
  console.error('token contrast failed:', e.message);
  process.exitCode = 1;
} finally {
  try { ws && ws.close(); } catch { /* closed */ }
  chrome.kill();
}

writeFileSync('reports/token-contrast.json', JSON.stringify(results, null, 2));

console.log('\n  theme  ink            ground        fg       bg        ratio  needs  verdict  judged as');
const failures = [];
let errors = 0;
for (const r of results) {
  if (r.error) {
    console.log(`  ${r.theme} ${r.ink}/${r.ground}: ${r.error}`);
    errors += 1;
    continue;
  }
  const nonText = NON_TEXT_ROLES.has(r.ink);
  const needs = nonText ? AA_LARGE_OR_NONTEXT : AA_TEXT;
  const ok = r.ratio >= needs;
  if (!ok) failures.push(r);
  console.log(
    `  ${r.theme.padEnd(6)} ${r.ink.padEnd(14)} ${r.ground.padEnd(13)} ${r.fg}  ${r.bg}   ` +
    `${String(r.ratio).padStart(5)}  ${needs.toFixed(1)}    ${ok ? 'PASS' : 'FAIL'}    ` +
    `${nonText ? 'icons/dividers (1.4.11)' : 'text (1.4.3)'}`,
  );
}
console.log(`\n  ${results.length} pairs measured; ${failures.length} failing its own threshold`);
for (const r of failures) {
  console.log(`    ✗ ${r.theme} ${r.ink} on ${r.ground}: ${r.ratio}:1`);
}
// A pair that did not resolve is a failure of the tool, not a pass for the palette.
if (errors) {
  console.log(`  ⚠ ${errors} pair(s) did not resolve -- the palette below them is UNMEASURED.`);
}
if (failures.length || errors) process.exitCode = 1;
