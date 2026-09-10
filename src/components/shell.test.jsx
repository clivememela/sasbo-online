// @vitest-environment jsdom -- the shell is a rendered thing; none of this is visible in source
import { beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'

import App from '../App'
import { renderWithProviders } from '../test/renderWithProviders'
import { server } from '../test/msw/server'
import { smokeHandlers } from '../test/msw/smokeLayer'
import { setupUser } from '../test/user'

/**
 * The application shell — header, drawer, and the controls that open them. `04.1`.
 *
 * 🔴 WHAT THIS COVERS THAT NOTHING ELSE DID. The route smoke mounts every route and
 * asserts it did not throw; the a11y pass scans pages. Neither looks at the shell's own
 * controls, and all three of them were broken in the same way: an icon-only raw
 * `<button>` announces as "button" and nothing more. The one control that opens the
 * navigation on a phone, and the one that closes it, were both unusable by anyone not
 * looking at the screen — and both passed every check this repository had.
 *
 * 🔑 AND THE MERGE. `AuthLayout` carried a SECOND theme button: same job, hand-rolled,
 * so every accessibility fix had two places to land and only ever got one. The last two
 * cases here are what stops a third appearing.
 */

const appRoute = (path = '/home') => renderWithProviders(<App />, { initialEntries: [path] })

describe('the shell — every control says what it is', () => {
  beforeEach(() => {
    server.use(...smokeHandlers)
  })

  it('the menu button is named, and points at a drawer that exists', async () => {
    appRoute()

    const menu = await screen.findByRole('button', { name: /open navigation menu/i })

    // 🔴 `aria-controls` NAMING A MISSING ELEMENT FAILS SILENTLY — the attribute is
    // simply ignored and the relationship is gone, with nothing to see. Resolving it is
    // the only way to know the id was not a typo, which is why `SIDEBAR_ID` is exported
    // rather than written twice.
    const controls = menu.getAttribute('aria-controls')
    expect(controls, 'The menu button controls nothing.').toBeTruthy()
    expect(
      document.getElementById(controls),
      `aria-controls="${controls}" names an element that is not in the document.`,
    ).toBeInTheDocument()

    expect(menu).toHaveAttribute('aria-expanded', 'false')
  })

  it('opening the drawer reports itself, and the close button is named too', async () => {
    const user = setupUser()
    appRoute()

    const menu = await screen.findByRole('button', { name: /open navigation menu/i })
    await user.click(menu)

    expect(
      menu,
      'The drawer opened and the button still says it is collapsed, so a screen reader ' +
        'announces the opposite of what happened.',
    ).toHaveAttribute('aria-expanded', 'true')

    const close = screen.getByRole('button', { name: /close navigation menu/i })
    await user.click(close)

    expect(menu).toHaveAttribute('aria-expanded', 'false')
  })

  it('the account placeholder is not a control, because there is no account', async () => {
    appRoute()
    await screen.findByRole('button', { name: /open navigation menu/i })

    // Authentication is DEFERRED (R-SEC-C). This was a <button> with no handler, no name
    // and no menu — a tab stop that did nothing. A control that does nothing is worse
    // than no control: it is a promise.
    expect(
      screen.queryByRole('button', { name: /^CM$/ }),
      'The account placeholder is a button again. It has nothing to open.',
    ).not.toBeInTheDocument()
  })
})

describe('the shell — one theme control, not two', () => {
  beforeEach(() => {
    server.use(...smokeHandlers)
  })

  it('an application route offers exactly one, and it is a real button', async () => {
    appRoute()

    // N7: this was a `<div onClick>`, so the only way to change theme was a mouse — no
    // tab stop, no Enter, no Space, nothing announced. Asking for a BUTTON by role is
    // what says so.
    const toggles = await screen.findAllByRole('button', { name: /switch to (dark|light) mode/i })
    expect(toggles).toHaveLength(1)
    expect(toggles[0]).toHaveAttribute('aria-pressed', 'false')
  })

  it('an auth route offers exactly one too — the same component', async () => {
    appRoute('/login')

    // 🔴 THE MERGE, AND THE ASSERTION IS `1` RATHER THAN `>= 1` ON PURPOSE. Before
    // `04.1` this route had its own hand-rolled copy; a subset check would have been
    // green throughout and would stay green if a third were added tomorrow.
    const toggles = await screen.findAllByRole('button', { name: /switch to (dark|light) mode/i })
    expect(
      toggles,
      'The auth screens have their own theme button again. Two implementations of one ' +
        'control is one place for the next accessibility fix to be forgotten.',
    ).toHaveLength(1)
  })

  it('changes the theme from the keyboard, and says so', async () => {
    const user = setupUser()
    appRoute('/login')

    const toggle = await screen.findByRole('button', { name: /switch to dark mode/i })

    toggle.focus()
    await user.keyboard('{Enter}')

    expect(document.documentElement).toHaveClass('dark')
    // The name changes with the state, which is how `aria-pressed` and a visible label
    // stay in agreement instead of drifting apart.
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

describe('the shell — landmarks and the skip link, `05.3`', () => {
  beforeEach(() => {
    server.use(...smokeHandlers)
  })

  it('offers one banner, one main, one contentinfo and a NAMED main navigation', async () => {
    appRoute()
    await screen.findByRole('button', { name: /open navigation menu/i })

    // 🔴 THE ELEMENTS WERE ALL PRESENT BEFORE AND TWO OF THEM WERE NOT LANDMARKS.
    // `<main>` used to be the outer wrapper with `<header>` and `<footer>` inside it, and
    // HTML maps `<header>` to `banner` ONLY when it is not a descendant of `<main>`,
    // `<article>`, `<aside>`, `<nav>` or `<section>` — the same rule strips `contentinfo`
    // from `<footer>`. The page therefore rendered a header and a footer that announced
    // as nothing at all.
    expect(screen.getAllByRole('banner')).toHaveLength(1)
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1)

    // 🔑 AND THE NAVIGATION IS NAMED, because there are two. The menu tree and the
    // breadcrumb trail are both `navigation` landmarks, and two unlabelled ones are
    // announced identically — which is worse than having one.
    expect(
      screen.getByRole('navigation', { name: /main/i }),
      'The menu tree is not a named `navigation` landmark. It is the only way to reach ' +
        '25 of 27 routes, and it used to be a bare <div>.',
    ).toBeInTheDocument()
  })

  it('the skip link is the first tab stop and lands on the main region', async () => {
    const user = setupUser()
    appRoute()
    await screen.findByRole('button', { name: /open navigation menu/i })

    const skip = screen.getByRole('link', { name: /skip to main content/i })

    // 🔴 FIRST, OR IT IS DECORATION. The whole point is to get ahead of the navigation
    // tree; a skip link placed after it saves nobody anything.
    await user.tab()
    expect(
      document.activeElement,
      'The first Tab does not reach the skip link, so a keyboard user still walks the ' +
        'entire menu before reaching the page.',
    ).toBe(skip)

    // 🔑 AND IT POINTS AT SOMETHING THAT EXISTS. A fragment naming a missing id fails in
    // complete silence — and the link is invisible until focused, so nobody ever sees it
    // fail.
    const target = skip.getAttribute('href')
    expect(target).toMatch(/^#/)
    const main = document.getElementById(target.slice(1))
    expect(
      main,
      `The skip link points at "${target}", which is not in the document.`,
    ).toBeInTheDocument()
    expect(main.tagName).toBe('MAIN')
    // Focusable, or the jump moves the caret and not the focus ring.
    expect(main).toHaveAttribute('tabindex', '-1')
  })

  it('a navigation section can be expanded without a mouse', async () => {
    const user = setupUser()
    appRoute()
    await screen.findByRole('button', { name: /open navigation menu/i })

    // 🔴 THIS WAS A `<div onClick>` WRAPPING THE LINK. Expanding a section was mouse-only:
    // no tab stop, no role, no key handler, no `aria-expanded` — and a click on the link
    // fired both handlers, navigating and toggling at once. Every sub-route in the menu
    // was unreachable by keyboard.
    const expanders = screen.getAllByRole('button', { name: /^expand /i })
    expect(
      expanders.length,
      'No navigation section exposes a disclosure control, so the sub-items cannot be ' +
        'reached from the keyboard.',
    ).toBeGreaterThan(0)

    const first = expanders[0]
    expect(first).toHaveAttribute('aria-expanded', 'false')

    first.focus()
    await user.keyboard('{Enter}')

    const opened = screen.getByRole('button', { name: /^collapse /i })
    expect(opened).toHaveAttribute('aria-expanded', 'true')
    const controls = opened.getAttribute('aria-controls')
    expect(
      document.getElementById(controls),
      `aria-controls="${controls}" names an element that is not in the document.`,
    ).toBeInTheDocument()
  })
})

describe('the shell — BR-18, the banner is not the page heading', () => {
  beforeEach(() => {
    server.use(...smokeHandlers)
  })

  it('the application name is present, and is not a heading', async () => {
    appRoute()
    await screen.findByRole('button', { name: /open navigation menu/i })

    const banner = screen.getByRole('banner')

    // It still says what the application is — losing the name would be a regression of
    // its own. What changed is that it is no longer the page's <h1>.
    expect(within(banner).getByText('Membership Administration System')).toBeInTheDocument()
    expect(
      within(banner).queryByRole('heading'),
      'The shell contributes a heading again. It is the same string on every route, so ' +
        'it tells a screen-reader user nothing about where they are — and it gives every ' +
        'page that uses PageTitle a second <h1>.',
    ).not.toBeInTheDocument()
  })
})
