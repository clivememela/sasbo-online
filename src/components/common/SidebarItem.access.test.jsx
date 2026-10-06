// @vitest-environment jsdom -- the rail's entries for a caller: open, marked, or not drawn at all
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import SidebarItem from './SidebarItem'
import { renderWithProviders } from '../../test/renderWithProviders'
import { TestAuthProvider } from '../../test/authTestUtils'
import { PERMISSIONS } from '../../auth/permissions'
import { entryAccess } from '../../config/navAccess'

/**
 * `permission` and `hideWithout` on a menu entry (contracts/permissions.md, "Menus"). Unpaids are never shown to an
 * organiser (Stephne, DOD-14), so an entry carrying both keys is not drawn for a signed-in user without the permission;
 * an anonymous caller still sees it, marked "Sign in", and the holder sees it plain. Each red case has its must-pass.
 */

const GUARDED = { title: 'Unpaids', href: '/admin/acb/debits', permission: PERMISSIONS.DOD_PREPARE, hideWithout: true }
const MARKED = { title: 'Settings', href: '/admin/acb/settings', permission: PERMISSIONS.DOD_SETTINGS }
const OPEN = { title: 'Runs', href: '/admin/acb/runs' }

const rail = (items, permissions) => renderWithProviders(
  <TestAuthProvider permissions={permissions}>
    <nav aria-label="Main">
      {items.map((item) => <SidebarItem key={item.href} item={item} isActive={false} expandedItems={{}} onToggle={() => {}} />)}
    </nav>
  </TestAuthProvider>,
)

describe('a menu entry that needs a permission', () => {
  it('is not drawn for a signed-in user without it, when it hides without it -- an organiser never sees unpaids', () => {
    rail([GUARDED, OPEN], [PERMISSIONS.MEMBERS_VIEW, PERMISSIONS.MEMBERS_CAPTURE])
    expect(screen.queryByRole('link', { name: /Unpaids/ })).not.toBeInTheDocument()
    // The must-pass beside it: the rail itself still drew, so the absence is the entry's, not an empty render.
    expect(screen.getByRole('link', { name: 'Runs' })).toBeInTheDocument()
  })

  it('is drawn plain for a user who holds the permission', () => {
    rail([GUARDED], [PERMISSIONS.DOD_PREPARE])
    expect(screen.getByRole('link', { name: 'Unpaids' })).toHaveAttribute('href', '/admin/acb/debits')
  })

  it('is drawn for an anonymous caller, marked with the way in -- the screen behind it says how to sign in', () => {
    rail([GUARDED, MARKED], [])
    expect(screen.getByRole('link', { name: 'Unpaids Sign in' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Settings Sign in' })).toBeInTheDocument()
  })

  it('without hideWithout, stays drawn for a signed-in user who lacks it, marked "No access"', () => {
    rail([MARKED], [PERMISSIONS.MEMBERS_VIEW])
    expect(screen.getByRole('link', { name: 'Settings No access' })).toBeInTheDocument()
  })

  it('an entry with no permission is open to everyone, signed in or not', () => {
    rail([OPEN], [])
    expect(screen.getByRole('link', { name: 'Runs' })).toBeInTheDocument()
  })
})

describe('entryAccess, the rule itself', () => {
  const anonymous = { status: 'anonymous', can: () => false }
  const organiser = { status: 'signed-in', can: (p) => p === PERMISSIONS.MEMBERS_VIEW }
  const administrator = { status: 'signed-in', can: (p) => p === PERMISSIONS.DOD_PREPARE }

  it.each([
    ['anonymous, a hidden-without entry', 'locked', GUARDED, anonymous],
    ['an organiser, a hidden-without entry', 'hidden', GUARDED, organiser],
    ['the administrator, a hidden-without entry', 'open', GUARDED, administrator],
    ['an organiser, an entry with no hideWithout', 'locked', MARKED, organiser],
    ['anyone, an entry with no permission', 'open', OPEN, organiser],
  ])('%s: %s', (_who, expected, entry, auth) => {
    expect(entryAccess(entry, auth)).toBe(expected)
  })
})
