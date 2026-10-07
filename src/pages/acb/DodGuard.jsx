import RequirePermission from '../../auth/RequirePermission';
import { useAuth } from '../../auth/useAuth';
import { canAny } from './dodRules.js';

/**
 * A Debit Order screen's door: its children for a user holding ANY of `permissions` -- reading a run is any of the
 * three (`DOD_READ`) -- and `RequirePermission`'s own sentence for the first of them to anyone else, so every refused
 * screen says the same thing in the same place. Nothing behind it mounts, so a refused screen asks the server nothing.
 */
export default function DodGuard({ permissions, children }) {
  const { can } = useAuth();
  if (canAny(can, permissions)) return children;
  return <RequirePermission permission={permissions[0]}>{children}</RequirePermission>;
}
