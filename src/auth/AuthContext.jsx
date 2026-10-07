import { createContext, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import reportError from '../lib/reportError';
import { changePassword as postPassword, getMe, getMode, signIn as postSignIn, signOut as postSignOut } from '../services/authService';
import { ERROR_KINDS } from '../services/parseApiError';
import { SIGN_IN_MODES } from './authVocabulary';
import { clearSession, onSessionEnded, readMode, readSession, saveMode, saveSession, subscribeSession } from './session';

/**
 * Who is signed in, and what they may do -- `{ status, mode, user, can(permission), signIn, signOut, changePassword,
 * sessionEnded, dismissSessionEnded }`.
 *
 * The DEFAULT VALUE is the anonymous caller, deliberately -- unlike `ThemeContext`, which has none. A screen that asks
 * `useAuth()` outside a provider (every test that mounts one page) gets "nobody is signed in" rather than a throw, which
 * is also what an open-mode visitor without an account is.
 */
export const ANONYMOUS = Object.freeze({
  status: 'anonymous',
  mode: 'open',
  user: null,
  can: () => false,
  signIn: async () => {
    throw new Error('Signing in is not available here.');
  },
  signOut: async () => {},
  changePassword: async () => {
    throw new Error('Sign in before changing a password.');
  },
  sessionEnded: false,
  dismissSessionEnded: () => {},
});

const AuthContext = createContext(ANONYMOUS);

const noSessionOnTheServer = () => null;

/**
 * The real caller, from the session `api.js` sends (`session.js`): the stored session is read as an external store, so
 * a session the server ends mid-request is gone from the header in the same render as from the next request.
 *
 * 🔑 THE SERVER DECIDES THE MODE; THIS ONLY ASKS. Until `GET /api/auth/mode` answers, the tab's last answer stands (or
 * `open`), and a failed read changes nothing: in required mode the server refuses every anonymous request whatever the
 * browser believes, so a wrong guess here costs a redirect, never access.
 */
export const AuthProvider = ({ children }) => {
  const session = useSyncExternalStore(subscribeSession, readSession, noSessionOnTheServer);
  const [mode, setMode] = useState(readMode);
  const [sessionEnded, setSessionEnded] = useState(false);
  // The token a sign-in has just answered with: its user is fresh, so it is not asked for again (below).
  const fresh = useRef(null);

  useEffect(() => {
    let current = true;
    getMode()
      .then((answer) => {
        if (!current || !SIGN_IN_MODES.includes(answer?.mode)) return;
        saveMode(answer.mode);
        setMode(answer.mode);
      })
      .catch((error) => {
        // Unreachable is not reported, so it raises no offline banner of its own: the screen's own reads say so if the
        // server is down, and a page stubbed without this one route (a deck slide) must not show a false alarm.
        if (error?.kind !== ERROR_KINDS.NETWORK) reportError('AuthProvider.mode', error);
      });
    return () => {
      current = false;
    };
  }, []);

  // A session found in the tab is read again from the server, once: a role may have changed since sign-in, and a
  // revoked session ends here rather than at the first screen that asks. A `401` is ended by `api.js`; any other
  // failure keeps the session -- a network blip is not a sign-out.
  const token = session?.token;
  useEffect(() => {
    if (!token || fresh.current === token) return undefined;
    let current = true;
    getMe()
      .then((answer) => {
        const stored = readSession();
        if (current && answer?.user && stored?.token === token) saveSession({ ...stored, user: answer.user });
      })
      .catch((error) => reportError('AuthProvider.me', error));
    return () => {
      current = false;
    };
  }, [token]);

  useEffect(() => onSessionEnded(({ hadSession }) => {
    if (hadSession) setSessionEnded(true);
  }), []);

  const signIn = useCallback(async ({ username, password }) => {
    const answer = await postSignIn({ username: username.trim(), password });
    if (typeof answer?.token !== 'string' || !answer.user) {
      throw new Error('The server answered the sign-in in a way this page cannot read. Try again.');
    }
    fresh.current = answer.token;
    saveSession({ token: answer.token, expiresAt: answer.expiresAt ?? null, user: answer.user });
    setSessionEnded(false);
    return answer.user;
  }, []);

  // The request goes WITH the token, so the server can revoke it; the tab forgets it whatever the answer.
  const signOut = useCallback(async () => {
    try {
      if (readSession()) await postSignOut();
    } catch (error) {
      reportError('AuthProvider.signOut', error);
    } finally {
      clearSession();
      setSessionEnded(false);
    }
  }, []);

  /** Resolves `true` while still signed in afterwards; `false` if the server ended the session with the change. */
  const changePassword = useCallback(async (passwords) => {
    await postPassword(passwords);
    const before = readSession();
    if (!before) return false;
    let user = { ...before.user, mustChangePassword: false };
    try {
      const answer = await getMe();
      if (answer?.user) user = answer.user;
    } catch (error) {
      reportError('AuthProvider.changePassword', error);
    }
    const after = readSession();
    if (after?.token !== before.token) return false;
    saveSession({ ...after, user });
    return true;
  }, []);

  const dismissSessionEnded = useCallback(() => setSessionEnded(false), []);

  const user = session?.user ?? null;
  const value = useMemo(() => {
    const shared = { mode, signIn, signOut, changePassword, sessionEnded, dismissSessionEnded };
    if (!user) return { ...ANONYMOUS, ...shared };
    const held = new Set(Array.isArray(user.permissions) ? user.permissions : []);
    return { ...shared, status: 'signed-in', user, can: (permission) => held.has(permission) };
  }, [user, mode, signIn, signOut, changePassword, sessionEnded, dismissSessionEnded]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext };
