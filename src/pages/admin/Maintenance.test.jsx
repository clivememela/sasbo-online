// @vitest-environment jsdom -- the maintenance menu's cards, and where each one goes
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import Maintenance from './Maintenance'
import { navItems } from '../../config/navigation'
import { renderWithProviders } from '../../test/renderWithProviders'

/**
 * 🗣️ SASBO, 18 Sep 2026: "in maintenance there was an option where we could edit the member" -- gone since the menus
 * were rebuilt -- and Bank/Branch was "not linking. It's not active."
 *
 * Neither needed a new screen. A member is edited on their own record (the register at /members: open the member, then
 * Edit), and /banks has had working add and edit since before this arc; the Bank/Branch card had just never been given
 * an href, so `NavigationCard` rendered it as a quiet label that went nowhere. Both cards now go where the work is
 * done, and the sidebar's Maintenance entries say the same as this page -- two lists that are meant to agree, so the
 * last case holds them together.
 */

/** The sidebar's Admin Menu > Maintenance entries. */
const sidebarMaintenance = () => {
  const admin = navItems.find((item) => item.title === 'Admin Menu')
  return admin.subItems.find((item) => item.title === 'Maintenance').subItems
}

describe('the Maintenance menu', () => {
  it('offers Edit Member, which opens the member register where a record is edited', () => {
    renderWithProviders(<Maintenance />)

    expect(screen.getByRole('link', { name: /Edit Member/ })).toHaveAttribute('href', '/members')
  })

  it('links Bank/Branch to /banks, where banks and branches are added and edited', () => {
    renderWithProviders(<Maintenance />)

    expect(screen.getByRole('link', { name: /Bank\/Branch/ })).toHaveAttribute('href', '/banks')
  })

  it('keeps Recruitment Channel and Subscriptions going where they went', () => {
    renderWithProviders(<Maintenance />)

    expect(screen.getByRole('link', { name: /Recruitment Channel/ }))
      .toHaveAttribute('href', '/admin/maintenance/recruitment-channel')
    expect(screen.getByRole('link', { name: /Subscriptions/ })).toHaveAttribute('href', '/admin/maintenance/subscriptions')
  })

  it('says the same in the sidebar as on the page -- every entry a link, to the same place', () => {
    renderWithProviders(<Maintenance />)
    const onPage = screen.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])

    const inSidebar = sidebarMaintenance()
    expect(inSidebar.length, 'the sidebar lost or gained a Maintenance entry the page does not have').toBe(onPage.length)
    for (const entry of inSidebar) {
      expect(entry.href, `${entry.title} has no href in the sidebar, so it is a label that goes nowhere`).toBeTruthy()
      expect(onPage.some(([text, href]) => text.includes(entry.title) && href === entry.href)).toBe(true)
    }
  })
})
