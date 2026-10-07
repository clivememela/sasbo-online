/**
 * The signed-in session, where the sign-in contract puts it: `sessionStorage['sasbo.session'] = {token, expiresAt, user}`
 * -- gone when the tab closes, and never `localStorage`, which would keep a bearer token on a shared office computer.
 *
 * 🔑 ONE STORE, TWO READERS. `api.js` reads the token for every API request and ends the session when the server refuses
 * it; `AuthProvider` reads the same store through `useSyncExternalStore`. Neither keeps a copy, so the header can never
 * say "signed in" while the requests go out without a token, or the other way round.
 *
 * 🔑 THE STORED TEXT IS THE TRUTH, RE-READ ON EVERY CALL. A deck slide sets the key before any script runs, and the
 * suite clears `sessionStorage` after every test; a cached object would miss both. The parsed value is kept only while
 * the text is unchanged, which is what `useSyncExternalStore` needs: the same object until something really changed.
 *
 * Every storage call is wrapped (as `ThemeContext` wraps its own): Safari's private mode and blocked site data throw.
 * When a write is refused the session lives in memory for this page, so signing in still works -- it just does not
 * survive a reload.
 */
export const SESSION_KEY = 'sasbo.session';
export const MODE_KEY = 'sasbo.mode';

let memory = null;
let cachedText;
let cachedSession = null;
const changeListeners = new Set();
const endListeners = new Set();

const storedText = () => {
  try {
    return sessionStorage.getItem(SESSION_KEY) ?? memory;
  } catch {
    return memory;
  }
};

/** A session is a token and a user; anything else in the key (an old shape, a hand edit) is no session at all. */
const parse = (text) => {
  try {
    const value = JSON.parse(text);
    return typeof value?.token === 'string' && value.token && value.user && typeof value.user === 'object' ? value : null;
  } catch {
    return null;
  }
};

/** The session, or `null` -- the same object for as long as the stored text is unchanged. */
export const readSession = () => {
  const text = storedText();
  if (text !== cachedText) {
    cachedText = text;
    cachedSession = text ? parse(text) : null;
  }
  return cachedSession;
};

const changed = () => changeListeners.forEach((listener) => listener());

export const saveSession = (session) => {
  const text = JSON.stringify(session);
  try {
    sessionStorage.setItem(SESSION_KEY, text);
    memory = null;
  } catch {
    memory = text;
  }
  changed();
};

export const clearSession = () => {
  memory = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing could have been stored there either; the memory copy is gone above.
  }
  changed();
};

/** For `useSyncExternalStore`: called after every save or clear. */
export const subscribeSession = (listener) => {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
};

/**
 * The server refused a request with `SESSION_EXPIRED` or `SIGN_IN_REQUIRED` (signin.md, "The client").
 *
 * `token` is the one that request carried. It ends the session only if that token is still the stored one: a request
 * that left before a fresh sign-in must not sign the new session out. An anonymous request ends nothing, but is still
 * announced (`hadSession: false`), because in required mode it means "sign in first".
 */
export const endSession = (code, token) => {
  const current = readSession();
  if (token) {
    if (current?.token !== token) return;
    clearSession();
  } else if (current) {
    return;
  }
  endListeners.forEach((listener) => listener({ code, hadSession: Boolean(token) }));
};

export const onSessionEnded = (listener) => {
  endListeners.add(listener);
  return () => endListeners.delete(listener);
};

/**
 * The server's mode, as this tab last heard it (`GET /api/auth/mode`, cached for the session). Only a read the server
 * answered is ever stored, so an unreadable or missing value is `open` -- what the application is until it says otherwise.
 */
export const readMode = () => {
  try {
    return sessionStorage.getItem(MODE_KEY) === 'required' ? 'required' : 'open';
  } catch {
    return 'open';
  }
};

export const saveMode = (mode) => {
  try {
    sessionStorage.setItem(MODE_KEY, mode);
  } catch {
    // The mode is asked for again on the next page load; nothing is lost but one round trip.
  }
};
