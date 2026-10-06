import { useContext } from 'react';
import { AuthContext } from './AuthContext';

/** `{ status, mode, user, can(permission), signIn, signOut }` -- the anonymous caller outside a provider. */
export const useAuth = () => useContext(AuthContext);
