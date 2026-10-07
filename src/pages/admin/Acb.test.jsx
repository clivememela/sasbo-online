// @vitest-environment jsdom -- the module's own page: "Debit Order Deductions", and its screens by who may use them
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import Acb from './Acb'
import DodEndings from '../acb/DodEndings'
import { renderWithProviders } from '../../test/renderWithProviders'
import { TestAuthProvider } from '../../test/authTestUtils'
import { PERMISSIONS } from '../../auth/permissions'
import { expectNoA11yViolations } from '../../test/assertions'

/**
 * The module once called A.C.B. is "Debit Order Deductions" (the 5 Oct Show & Tell; Stephne, DOD-39), and its screens
 * keep their names (DOD-37). Its cards carry the rail's access keys (OB18): an organiser never sees the runs, the
 * unpaids, the endings or the counts (DOD-14); Settings and the letters are shown, marked (the letters' preview is
 * DOD_PREPARE's on the server).
 */

const as = (permissions, ui) => renderWithProviders(<TestAuthProvider permissions={permissions}>{ui}</TestAuthProvider>)

describe('Debit Order Deductions, the module\'s page', () => {
  it('is titled with SASBO\'s name for the module, and offers every screen to the administrator', async () => {
    const { container } = as([PERMISSIONS.DOD_PREPARE], <Acb />)
    expect(screen.getByRole('heading', { level: 1, name: 'Debit Order Deductions' })).toBeInTheDocument()
    for (const [name, href] of [['Runs', '/admin/acb/runs'], ['Debits', '/admin/acb/debits'], ['Endings to confirm', '/admin/acb/endings'],
      ['Unpaid counts', '/admin/acb/unpaid-counts'], ['Letters', '/admin/acb/letters']]) {
      expect(screen.getByRole('link', { name: new RegExp(`^${name}`) })).toHaveAttribute('href', href)
    }
    expect(screen.getByRole('link', { name: /^Settings.*No access/ })).toHaveAttribute('href', '/admin/acb/settings')
    expect(screen.getByText('No longer run by SASBO — kept as an option, as they asked')).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it('an organiser sees none of the screens that show unpaids -- the settings and the letters marked', () => {
    as([PERMISSIONS.MEMBERS_VIEW, PERMISSIONS.MEMBERS_CAPTURE], <Acb />)
    for (const name of ['Runs', 'Debits', 'Endings to confirm', 'Unpaid counts']) {
      expect(screen.queryByRole('link', { name: new RegExp(`^${name}`) })).not.toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: /^Settings.*No access/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Letters.*No access/ })).toBeInTheDocument()
  })

  it('nobody signed in sees every screen, each guarded one marked "Sign in"', () => {
    renderWithProviders(<Acb />)
    for (const name of ['Runs', 'Debits', 'Endings to confirm', 'Unpaid counts', 'Settings', 'Letters']) {
      expect(screen.getByRole('link', { name: new RegExp(`^${name}.*Sign in`) })).toBeInTheDocument()
    }
  })
})

describe('Endings to confirm, the screen', () => {
  it('keeps its head for everyone, and asks the signed-out caller to sign in', () => {
    renderWithProviders(<DodEndings />, { initialEntries: ['/admin/acb/endings'] })
    expect(screen.getByRole('heading', { level: 1, name: 'Endings to confirm' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Sign in to prepare debit order runs.')
  })
})
