// @vitest-environment jsdom -- renders a provider and asserts on documentElement's class list
import { describe, expect, it } from 'vitest'
import { act, render, renderHook, screen } from '@testing-library/react'

import { ThemeProvider } from './ThemeContext'
import { useTheme } from './useTheme'

/**
 * `ThemeContext` is the ONLY `createContext` in this codebase, and it wraps the
 * whole application. A break here is total: every page loses its theme at once,
 * and `useTheme` throwing takes the entire tree with it -- there is no error
 * boundary anywhere in the client to catch it (retired row A11 -- a boundary now sits
 * beside the outlet in both layouts, so the blast radius is one panel, not the app).
 *
 * It is also the only piece of genuinely shared state, which makes it the one
 * place a shuffled suite can leak: `darkMode` is persisted to `localStorage`
 * and applied as a class on `document.documentElement`. Both are reset in
 * `setup.js` after every test, and the last case here asserts that reset
 * actually happens rather than trusting it.
 */
const wrapper = ({ children }) => <ThemeProvider>{children}</ThemeProvider>

const renderTheme = () => renderHook(() => useTheme(), { wrapper })

describe('ThemeProvider', () => {
  it('starts light when nothing has been stored', () => {
    const { result } = renderTheme()
    expect(result.current.darkMode).toBe(false)
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('restores dark mode from localStorage', () => {
    localStorage.setItem('darkMode', 'true')
    const { result } = renderTheme()
    expect(
      result.current.darkMode,
      'A member who chose dark mode gets light mode back on their next visit. The ' +
        'preference is being written and not read.',
    ).toBe(true)
    expect(document.documentElement).toHaveClass('dark')
  })

  it('treats any stored value other than "true" as light', () => {
    // The comparison is `saved === 'true'` against a string. Worth pinning:
    // `localStorage.setItem('darkMode', false)` stores the STRING "false", and
    // a truthiness check would read that as dark.
    for (const stored of ['false', '', '0', 'TRUE', 'yes']) {
      localStorage.setItem('darkMode', stored)
      const { result, unmount } = renderTheme()
      expect(result.current.darkMode, `stored value ${JSON.stringify(stored)}`).toBe(false)
      unmount()
    }
  })

  it('toggling flips the mode, the stored value and the document class together', () => {
    const { result } = renderTheme()

    act(() => result.current.toggleDarkMode())

    expect(result.current.darkMode).toBe(true)
    expect(document.documentElement).toHaveClass('dark')
    expect(
      localStorage.getItem('darkMode'),
      'The class was applied but the preference was not stored, so the choice is lost on ' +
        'reload -- which reads to the member as the toggle not working at all.',
    ).toBe('true')

    act(() => result.current.toggleDarkMode())

    expect(result.current.darkMode).toBe(false)
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('darkMode')).toBe('false')
  })

  it('setDarkMode sets it directly, without toggling', () => {
    const { result } = renderTheme()
    act(() => result.current.setDarkMode(true))
    expect(result.current.darkMode).toBe(true)
    act(() => result.current.setDarkMode(true))
    expect(result.current.darkMode, 'setting true twice toggled it off').toBe(true)
  })

  it('renders its children', () => {
    render(
      <ThemeProvider>
        <p>the application</p>
      </ThemeProvider>,
    )
    expect(screen.getByText('the application')).toBeInTheDocument()
  })
})

describe('useTheme outside a provider', () => {
  it('throws a message that names the mistake', () => {
    // `createContext()` has no default value, so the context reads `undefined`
    // outside a provider and the guard fires. Asserted because the guard is
    // one `=== undefined` away from being dead: give createContext a default
    // object and this throw silently stops happening, and every component
    // outside the provider gets a theme that does nothing.
    expect(() => renderHook(() => useTheme())).toThrow(/must be used within a ThemeProvider/)
  })
})

describe('the suite cleans up after this provider', () => {
  // These two run in a SHUFFLED order and neither may assume it goes first.
  // ThemeProvider writes to localStorage and to documentElement, which are the
  // only two pieces of global state in the client -- so if the afterEach in
  // setup.js ever stops resetting them, this is what says so.
  it('leaves no dark class behind (a)', () => {
    expect(document.documentElement).not.toHaveClass('dark')
    const { result } = renderTheme()
    act(() => result.current.setDarkMode(true))
  })

  it('leaves no dark class behind (b)', () => {
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('darkMode')).toBeNull()
  })
})
