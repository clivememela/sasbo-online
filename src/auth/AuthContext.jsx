import { createContext } from 'react';

/**
 * Who is signed in, and what they may do.
 *
 * The DEFAULT VALUE is the anonymous caller, deliberately -- unlike `ThemeContext`, which has none. A screen that asks
 * `useAuth()` outside a provider (every existing test that mounts one page) gets "nobody is signed in" rather than a
 * throw, which is also exactly what the app is today. The sign-in stream of the October build makes `AuthProvider`
 * real; this file is the shape every other screen builds against (`C:/tmp/sasbo-work/oct/contracts/signin.md`).
 */
export const ANONYMOUS = Object.freeze({
  status: 'anonymous',
  mode: 'open',
  user: null,
  can: () => false,
  signIn: async () => {
    throw new Error('Signing in is not available yet.');
  },
  signOut: async () => {},
});

const AuthContext = createContext(ANONYMOUS);

/** Until sign-in lands, the provider supplies the anonymous caller: nothing changes for any screen. */
export const AuthProvider = ({ children }) => (
  <AuthContext.Provider value={ANONYMOUS}>{children}</AuthContext.Provider>
);

export { AuthContext };
