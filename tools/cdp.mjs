/**
 * One Chrome, one WebSocket, one `evaluate`. The plumbing every measurement tool needs and
 * none of them should own.
 *
 * 🔴 WHY THIS EXISTS: SIX COPIES, AND THEY HAD ALREADY DRIFTED INTO FOUR DEFECTS. `probe.mjs`
 * was written in this same phase because three copies of the overflow probe had drifted to
 * three different hashes — and the harness AROUND it was copied six times in the same commit.
 * The copies were not merely redundant; they disagreed, and every disagreement was a bug:
 *
 *   ① 🔴 `evaluate()` SWALLOWED EXCEPTIONS IN FOUR OF SIX. `matrix`, `edges`, `states` and
 *      `matrix-canary` returned `.result.value` without looking at `exceptionDetails`, so an
 *      expression that THREW in the page came back `undefined` — which `states.mjs` read as
 *      "the step did not land" and `matrix.mjs` read as "not ready". A broken probe was
 *      indistinguishable from a page that failed, in a repository whose entire thesis is that
 *      a silent zero is the enemy. `contrast` and `tokenContrast` had already fixed it locally.
 *   ② 🔴 TWO TOOLS DIED WITH THE WRONG ERROR. `edges` and `states` indexed `targets.find(...)`
 *      directly, so a Chrome that never came up gave `Cannot read properties of undefined`
 *      instead of "no page target on port N".
 *   ③ 🔴 PORT RANGES COLLIDED. `contrast` and `matrix-canary` both drew from `9500 + rand(80)`;
 *      `edges` and `tokenContrast` both from `9600 + rand(80)`. Two tools run together could
 *      fight over one debug port. Ports are allocated here now, from one list.
 *   ④ 🔴 "IS THIS A PHONE" HAD TWO ANSWERS. `metrics()` used `width < 500` in `edges` and
 *      `width < 700` in `matrix` and `contrast`, and `deviceScaleFactor` was `mobile ? 2 : 1`
 *      in two tools and a hard `1` in a third. So the matrix and the edge sweep were NOT
 *      measuring the same 640±1 condition on the same 25 routes, which is the one thing a
 *      matrix and an edge sweep exist to do together.
 *
 * 🔑 AND THE T23 IDENTITY CHECK WAS IN TWO OF SIX. `matrix` and `contrast` proved the server
 * was the built client before measuring it; `edges`, `states`, `matrix-canary` and
 * `tokenContrast` measured whatever held the port. `serve-dist.mjs`'s own header records that
 * this already cost this arc a measurement of the mockups directory index instead of the
 * application. It is `assertBuiltClient()` here, so a tool cannot omit it by forgetting.
 */
import { spawn } from 'node:child_process';

const CHROME = 'C:/Users/mfazl/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';

/**
 * Debug ports, one range per tool, allocated here so two tools cannot collide.
 *
 * Written out rather than hashed from the tag: a hash gives collisions nobody can predict,
 * and this list is the one place to look when a port is already in use.
 */
const PORTS = Object.freeze({
  matrix: 9400,
  canary: 9450,
  edges: 9500,
  states: 9550,
  contrast: 9600,
  tokens: 9650,
  probe: 9700,
  motion: 9750,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Launch Chrome, attach to its page target, and return the handful of operations every tool
 * actually needs.
 *
 * `tag` names the port range and the profile directory, so a crashed run leaves an
 * identifiable profile behind rather than an anonymous one.
 */
export async function launch(tag, { flags = [] } = {}) {
  const base = PORTS[tag];
  if (!base) {
    throw new Error(
      `launch('${tag}') has no port range. Add it to PORTS in tools/cdp.mjs rather than ` +
        `picking a number here — two tools drawing from the same range is how the last set collided.`,
    );
  }
  const port = base + Math.floor(Math.random() * 40);

  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--remote-debugging-port=${port}`, '--no-first-run',
    `--user-data-dir=${process.env.TEMP}/${tag}-profile-${port}`,
    ...flags,
    'about:blank',
  ], { stdio: 'ignore' });

  let targets;
  for (let i = 0; i < 60; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      if (targets.some((t) => t.type === 'page')) break;
    } catch { /* chrome not up yet */ }
    await sleep(250);
  }
  const page = targets && targets.find((t) => t.type === 'page');
  // Guarded, and it is guarded because two copies were not: indexing the `find()` result
  // directly turns "Chrome never started" into an unrelated TypeError.
  if (!page) {
    chrome.kill();
    throw new Error(`no page target on port ${port} after 15s — did Chrome start?`);
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error(`could not attach to the page target on port ${port}`));
  });

  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
    }
  };

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const msg = { id: ++id, method, params };
      pending.set(msg.id, { resolve, reject });
      ws.send(JSON.stringify(msg));
    });

  /**
   * Evaluate an expression in the page.
   *
   * 🔴 A THROW IS A THROW. This raises rather than returning `undefined`, because the four
   * copies that returned `undefined` made a broken probe look like a failed page. There is no
   * opt-out: a tool that wants to tolerate an exception can catch it, which is visible in the
   * tool, whereas swallowing it here is visible nowhere.
   */
  const evaluate = async (expression, { awaitPromise = false } = {}) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
    if (r.exceptionDetails) {
      const detail = r.exceptionDetails.exception?.description
        ?? r.exceptionDetails.text
        ?? 'no detail';
      throw new Error(`the page threw while evaluating: ${String(detail).split('\n')[0]}`);
    }
    return r.result.value;
  };

  await send('Page.enable');
  await send('Runtime.enable');

  /**
   * The viewport, with ONE answer to "is this a phone".
   *
   * 🔴 TRUE DEVICE METRICS, NOT A RESIZED WINDOW (T14). Headless Chrome will not lay out below
   * roughly 500px and silently CROPS instead, so `--window-size=390,844` renders a wider page
   * with its right-hand side cut off. `Emulation.setDeviceMetricsOverride` with `mobile: true`
   * is the only thing that produces a real 390px viewport.
   *
   * 🔑 THE 700px CUTOFF IS THE WIDER OF THE TWO THAT WERE IN USE, deliberately: `mobile: true`
   * is what makes a narrow viewport real, and a tablet-width layout measured without it is
   * measured in a window that merely says 768. The two thresholds meant the matrix and the edge
   * sweep disagreed about the same route at the same width.
   */
  const metrics = (width, height = width < 500 ? 844 : 900) => {
    const mobile = width < 700;
    return send('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: mobile ? 2 : 1, mobile,
    });
  };

  /** Poll an expression until it is `true`. Returns whether it ever was. */
  const waitFor = async (expression, { tries = 80, every = 150 } = {}) => {
    for (let i = 0; i < tries; i++) {
      if (await evaluate(expression) === true) return true;
      await sleep(every);
    }
    return false;
  };

  /**
   * 🔴 T23: PROVE THE SERVER IS OURS BEFORE MEASURING ANYTHING. A 200 says something is there,
   * never that it is yours — and the mockups are built from the same tokens, so a wrong-server
   * measurement looks entirely plausible.
   */
  const assertBuiltClient = async (baseUrl) => {
    await send('Page.navigate', { url: `${baseUrl}/login` });
    await sleep(800);
    const entry = await evaluate(
      "document.querySelector('script[type=module]')?.src || location.href",
    );
    if (!/\/assets\/index-[A-Za-z0-9_-]+\.js$/.test(entry)) {
      throw new Error(`the server at ${baseUrl} is not the built client (entry script: ${entry})`);
    }
    return String(entry).split('/').pop();
  };

  const close = () => {
    try { ws.close(); } catch { /* already closed */ }
    chrome.kill();
  };

  return { send, evaluate, metrics, waitFor, assertBuiltClient, close, port, sleep };
}

export { sleep };
