import { createContext, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import reportError from '../lib/reportError';
import { getMe, getMode, signOut as postSignOut } from '../services/authService';
import { ERROR_KINDS } from '../services/parseApiError';
import {
  SIGN_IN_MODES, clearSession, isFresh, onSessionEnded, readMode, readSession, saveMode, saveSession, subscribeSession,
} from './session';

/**
 * Who is signed in, and what they may do -- `{ status, mode, user, can(permission), signOut, sessionEnded,
 * dismissSessionEnded }`. Signing in and changing a password are `authActions.js`'s, loaded with the pages that do them;
 * this file is in the first load, so it holds only what the shell needs to know who is there.
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
  signOut: async () => {},
  sessionEnded: false,
  dismissSessionEnded: () => {},
});

const AuthContext = createContext(ANONYMOUS);

const noSessionOnTheServer = () => null;

/**
 * The real caller, from the session `api.js` sends (`session.js`), read as an external store: a session the server ends
 * mid-request is gone from the header in the same render as from the next request, and one a sign-in saves is here at once.
 *
 * 🔑 THE SERVER DECIDES THE MODE; THIS ONLY ASKS. Until `GET /api/auth/mode` answers, the tab's last answer stands (or
 * `open`), and a failed read changes nothing: in required mode the server refuses every anonymous request whatever the
 * browser believes, so a wrong guess here costs a redirect, never access.
 */
export const AuthProvider = ({ children }) => {
  const session = useSyncExternalStore(subscribeSession, readSession, noSessionOnTheServer);
  const [mode, setMode] = useState(readMode);
  const [ended, setEnded] = useState(false);

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
  // failure keeps the session -- a network blip is not a sign-out. A sign-in's own answer is not asked for again.
  const token = session?.token;
  useEffect(() => {
    if (!token || isFresh(token)) return undefined;
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
    if (hadSession) setEnded(true);
  }), []);

  // The request goes WITH the token, so the server can revoke it; the tab forgets it whatever the answer.
  const signOut = useCallback(async () => {
    try {
      if (readSession()) await postSignOut();
    } catch (error) {
      reportError('AuthProvider.signOut', error);
    } finally {
      clearSession();
      setEnded(false);
    }
  }, []);

  const dismissSessionEnded = useCallback(() => setEnded(false), []);

  const user = session?.user ?? null;
  const value = useMemo(() => {
    // "Your session has ended" is true only while nobody is signed in again.
    const shared = { mode, signOut, sessionEnded: ended && !user, dismissSessionEnded };
    if (!user) return { ...ANONYMOUS, ...shared };
    const held = new Set(Array.isArray(user.permissions) ? user.permissions : []);
    return { ...shared, status: 'signed-in', user, can: (permission) => held.has(permission) };
  }, [user, mode, signOut, ended, dismissSessionEnded]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext };
