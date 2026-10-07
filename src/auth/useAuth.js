import { useContext } from 'react';
import { AuthContext } from './AuthContext';

/** `{ status, mode, user, can(permission), signIn, signOut, … }` -- the anonymous caller outside a provider. */
export const useAuth = () => useContext(AuthContext);

/**
 * What a menu entry says when its screen needs a permission this person does not hold -- or `null` when they may use
 * it, or it needs none. The entry stays and is marked rather than hidden (permissions.md, "Menus": until the owner
 * decides otherwise), so a person can see what exists and what they would need.
 */
export const useAccessNote = (permission) => {
  const { status, can } = useAuth();
  if (!permission || can(permission)) return null;
  return status === 'signed-in' ? 'Needs a permission' : 'Sign in needed';
};
