// @vitest-environment jsdom -- Home's three views and every menu page say what the rail says about access (OB18)
import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'

import Home from '../Home'
import ModuleTable from './ModuleTable'
import { NavigationList } from '../../components/common/NavigationCard'
import { navItems } from '../../config/navigation'
import { renderWithProviders } from '../../test/renderWithProviders'
import { TestAuthProvider } from '../../test/authTestUtils'
import { PERMISSIONS } from '../../auth/permissions'
import { setupUser } from '../../test/user'

/**
 * `permission` and `hideWithout` (`config/navAccess.js`) are read by the rail, by Home's cards, list and table, and by
 * every menu page, so none can disagree: an entry hidden from a signed-in user without the permission is hidden in
 * every view -- unpaids are never shown to an organiser (Stephne, DOD-14) -- and an anonymous caller sees it marked
 * "Sign in". Each red case has its must-pass beside it.
 */

const ORGANISER = [PERMISSIONS.MEMBERS_VIEW, PERMISSIONS.MEMBERS_CAPTURE]

const ENTRIES = [
  { title: 'Open module', href: '/open', desc: 'Anyone may open it' },
  { title: 'Unpaids module', href: '/unpaids', desc: 'Never an organiser\'s', permission: PERMISSIONS.DOD_PREPARE, hideWithout: true },
  { title: 'Settings module', href: '/settings', desc: 'Shown, marked', permission: [PERMISSIONS.DOD_SETTINGS, PERMISSIONS.SUBSCRIPTIONS_MAINTAIN] },
].map((entry) => ({ ...entry, places: [entry.title], under: [] }))

const as = (permissions, ui) => renderWithProviders(<TestAuthProvider permissions={permissions}>{ui}</TestAuthProvider>)

describe.each([
  ['the cards', (entries) => <NavigationList tiles cards={entries} />],
  ['the list', (entries) => <NavigationList wide cards={entries} />],
  ['the table', (entries) => <ModuleTable modules={entries} />],
])('%s', (_view, render) => {
  it('hide an entry from a signed-in user without its permission when it says so, and mark the others', () => {
    as(ORGANISER, render(ENTRIES))
    expect(screen.queryByText('Unpaids module')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Settings module.*No access/ })).toHaveAttribute('href', '/settings')
    // The must-pass beside it: the view itself drew, so the absence is the entry's.
    expect(screen.getByRole('link', { name: /^Open module/ })).toBeInTheDocument()
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
  })

  it('mark every guarded entry "Sign in" for an anonymous caller, and hide none', () => {
    as([], render(ENTRIES))
    expect(screen.getByRole('link', { name: /^Unpaids module.*Sign in/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Settings module.*Sign in/ })).toBeInTheDocument()
  })

  it('show the holder every entry plain -- any one of a list of permissions will do', () => {
    as([PERMISSIONS.DOD_PREPARE, PERMISSIONS.SUBSCRIPTIONS_MAINTAIN], render(ENTRIES))
    expect(screen.getByRole('link', { name: /^Unpaids module/ })).toBeInTheDocument()
    expect(screen.queryByText('No access')).not.toBeInTheDocument()
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
  })
})

describe('Home, on the real menu', () => {
  it('the table\'s "Under it" leaves out what an organiser may never see, and keeps it for the administrator', async () => {
    const user = setupUser()
    as(ORGANISER, <Home />)
    await user.click(screen.getByRole('button', { name: 'Table' }))
    const row = screen.getByRole('link', { name: /^Debit Order Deductions/ }).closest('tr')
    const under = within(row).getByText(/^Under it:/)
    expect(under).toHaveTextContent('Under it: Settings, Letters')
    expect(under).not.toHaveTextContent(/Debits|Runs|Endings|Unpaid counts/)
  })

  it('the must-pass: the administrator reads the module\'s screens under it', async () => {
    const user = setupUser()
    as([PERMISSIONS.DOD_PREPARE], <Home />)
    await user.click(screen.getByRole('button', { name: 'Table' }))
    const row = screen.getByRole('link', { name: /^Debit Order Deductions/ }).closest('tr')
    expect(within(row).getByText(/^Under it:/))
      .toHaveTextContent('Under it: Debits, Runs, Endings to confirm, Unpaid counts, Settings, Letters')
  })

  it('every permission the menu names is one the server publishes (contracts/permissions.md)', () => {
    const named = (items) => items.flatMap((item) => [...[].concat(item.permission ?? []), ...named(item.subItems ?? [])])
    const used = named(navItems)
    expect(used.length).toBeGreaterThan(0)
    for (const permission of used) expect(Object.values(PERMISSIONS)).toContain(permission)
  })
})
