// @vitest-environment jsdom -- opens a listbox and navigates it with the arrow keys
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import SearchableSelect from './SearchableSelect'
import { renderWithProviders } from '../../test/renderWithProviders'
import { expectNoA11yViolations } from '../../test/assertions'
import { setupUser } from '../../test/user'

const BANKS = [
  { value: 'absa', label: 'Absa' },
  { value: 'fnb', label: 'First National Bank' },
  { value: 'nedbank', label: 'Nedbank' },
  { value: 'standard', label: 'Standard Bank' },
]

describe('SearchableSelect — the states', () => {
  it('default: a combobox with a real label and a resolvable listbox', async () => {
    const user = setupUser()
    renderWithProviders(<SearchableSelect label="Bank Name" value="" onChange={() => {}} options={BANKS} />)

    const combobox = screen.getByRole('combobox', { name: 'Bank Name' })
    expect(combobox).toHaveAttribute('aria-expanded', 'false')
    // Closed, it must not claim to control an element that is not there.
    expect(combobox).not.toHaveAttribute('aria-controls')

    await user.click(combobox)
    expect(combobox).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById(combobox.getAttribute('aria-controls'))).toBe(
      screen.getByRole('listbox'),
    )
  })

  it('loading: busy, disabled, and not an empty list', () => {
    renderWithProviders(<SearchableSelect label="Bank Name" value="" onChange={() => {}} options={[]} loading />)
    const combobox = screen.getByRole('combobox', { name: 'Bank Name' })
    expect(combobox).toHaveAttribute('aria-busy', 'true')
    expect(combobox).toBeDisabled()
    expect(combobox).toHaveAttribute('placeholder', 'Loading…')
  })

  it('empty: says there are no options at all', () => {
    renderWithProviders(<SearchableSelect label="Bank Name" value="" onChange={() => {}} options={[]} />)
    const combobox = screen.getByRole('combobox', { name: 'Bank Name' })
    expect(combobox).toBeDisabled()
    expect(combobox).toHaveAttribute('placeholder', 'No options available')
  })

  it('failed: the choices are unavailable, a retry is offered, and it is NOT the empty state above (F-P54)', async () => {
    // The "empty" case above is this one's must-pass: the same `options={[]}`, and only `loadError`
    // separates "there are none" from "we could not find out".
    const user = setupUser()
    const retry = vi.fn()
    renderWithProviders(
      <SearchableSelect label="Bank Name" value="" onChange={() => {}} options={[]} loadError="The banks list could not be loaded." onRetryLoad={retry} />,
    )

    const combobox = screen.getByRole('combobox', { name: 'Bank Name' })
    expect(combobox).toBeDisabled()
    expect(combobox).toHaveAttribute('placeholder', 'Unavailable')
    expect(combobox).not.toHaveAttribute('placeholder', 'No options available')
    expect(screen.getByText('Bank Name could not be loaded.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it('no matches is a different message from no options, and is not a selectable row', async () => {
    const user = setupUser()
    renderWithProviders(<SearchableSelect label="Bank Name" value="" onChange={() => {}} options={BANKS} />)

    await user.click(screen.getByRole('combobox', { name: 'Bank Name' }))
    await user.keyboard('zzz')

    expect(screen.getByText('No matches')).toBeInTheDocument()
    // 🔑 Not a role="option": an unselectable row inside a listbox is announced as a
    // choice, and Enter would then "select" a message.
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('invalid: aria-invalid and an announced message whose id resolves', () => {
    renderWithProviders(
      <SearchableSelect label="Bank Name" value="" onChange={() => {}} options={BANKS} error="Pick a bank" />,
    )
    const combobox = screen.getByRole('combobox', { name: 'Bank Name' })
    expect(combobox).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById(combobox.getAttribute('aria-describedby'))).not.toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('Pick a bank')
  })

  it('closed, it shows the SELECTION rather than the last thing typed', async () => {
    const user = setupUser()
    const onChange = vi.fn()
    renderWithProviders(
      <SearchableSelect label="Bank Name" value="fnb" onChange={onChange} options={BANKS} />,
    )
    const combobox = screen.getByRole('combobox', { name: 'Bank Name' })
    expect(combobox).toHaveValue('First National Bank')

    await user.click(combobox)
    await user.keyboard('ned')
    await user.keyboard('{Escape}')
    // Escape abandons the filter; the field must not be left showing "ned" as if that
    // were the current value.
    expect(combobox).toHaveValue('First National Bank')
  })
})

describe('SearchableSelect — the keyboard', () => {
  /**
   * 🔴 THE TEST THAT WOULD HAVE CAUGHT THE OLD ONE. Its options were `<li onClick>` with
   * no key handling whatsoever: the list opened and could never be navigated. The axe
   * scan in `a11y.test.jsx` was green over it the whole time, because axe cannot see
   * that an element is unreachable — [T17]. This is why conventions §7 says the keyboard
   * is proved with `userEvent` and never with a scan.
   */
  it('ArrowDown opens it, the arrows move a REPORTED active option, and Enter selects', async () => {
    const user = setupUser()
    const onChange = vi.fn()
    renderWithProviders(<SearchableSelect label="Bank Name" value="" onChange={onChange} options={BANKS} />)

    await user.tab()
    const combobox = screen.getByRole('combobox', { name: 'Bank Name' })
    expect(combobox).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(combobox).toHaveAttribute('aria-expanded', 'true')

    // 🔑 aria-activedescendant is the assertion, not the highlight. Without it a screen
    // reader is never told which option the arrows landed on, which is precisely what
    // "not a combobox in the ARIA sense" meant.
    const first = combobox.getAttribute('aria-activedescendant')
    expect(first).toBeTruthy()
    expect(document.getElementById(first)).toHaveTextContent('Absa')

    await user.keyboard('{ArrowDown}')
    expect(document.getElementById(combobox.getAttribute('aria-activedescendant'))).toHaveTextContent(
      'First National Bank',
    )

    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith('fnb', BANKS[1])
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('ArrowUp from closed opens at the END, and the arrows wrap', async () => {
    const user = setupUser()
    renderWithProviders(<SearchableSelect label="Bank Name" value="" onChange={() => {}} options={BANKS} />)

    const combobox = screen.getByRole('combobox', { name: 'Bank Name' })
    await user.click(combobox)
    await user.keyboard('{Escape}')
    combobox.focus()

    await user.keyboard('{ArrowUp}')
    expect(document.getElementById(combobox.getAttribute('aria-activedescendant'))).toHaveTextContent(
      'Standard Bank',
    )

    await user.keyboard('{ArrowDown}')
    expect(document.getElementById(combobox.getAttribute('aria-activedescendant'))).toHaveTextContent('Absa')
  })

  it('Home and End jump to the ends of the FILTERED list, not the whole one', async () => {
    const user = setupUser()
    renderWithProviders(<SearchableSelect label="Bank Name" value="" onChange={() => {}} options={BANKS} />)

    const combobox = screen.getByRole('combobox', { name: 'Bank Name' })
    await user.click(combobox)
    await user.keyboard('ban') // Absa? no — matches "First National Bank", "Nedbank", "Standard Bank"

    await user.keyboard('{End}')
    expect(document.getElementById(combobox.getAttribute('aria-activedescendant'))).toHaveTextContent(
      'Standard Bank',
    )

    await user.keyboard('{Home}')
    expect(document.getElementById(combobox.getAttribute('aria-activedescendant'))).toHaveTextContent(
      'First National Bank',
    )
  })

  it('Escape closes without selecting, and Enter on nothing does not swallow the key', async () => {
    const user = setupUser()
    const onChange = vi.fn()
    const onSubmit = vi.fn((event) => event.preventDefault())

    renderWithProviders(
      <form onSubmit={onSubmit}>
        <SearchableSelect label="Bank Name" value="" onChange={onChange} options={BANKS} />
      </form>,
    )

    const combobox = screen.getByRole('combobox', { name: 'Bank Name' })
    await user.click(combobox)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()

    // 🔑 With the list closed, Enter belongs to the FORM. A combobox that swallows Enter
    // unconditionally is a form that cannot be submitted from the keyboard.
    await user.keyboard('{Enter}')
    expect(onSubmit).toHaveBeenCalled()
  })

  it('the clear control is a real button, reachable by keyboard', async () => {
    const user = setupUser()
    const onChange = vi.fn()
    renderWithProviders(
      <SearchableSelect label="Bank Name" value="absa" onChange={onChange} options={BANKS} />,
    )

    // 🔴 It used to be an <svg onClick> — not focusable, not announced, one of the six
    // controls run 7 found that only a mouse can reach.
    const clear = screen.getByRole('button', { name: /clear bank name/i })
    clear.focus()
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith('', undefined)
  })
})

describe('SearchableSelect — accessibility, both themes', () => {
  it('has no violations closed or open, in light or dark', async () => {
    const user = setupUser()
    const { container } = renderWithProviders(
      <SearchableSelect label="Bank Name" value="absa" onChange={() => {}} options={BANKS} />,
    )

    await expectNoA11yViolations(container)

    // ⚠️ Contract ⑤: a state-gated surface must be DRIVEN into its state or it is not
    // covered. Scanning only the closed control would never scan the listbox at all.
    await user.click(screen.getByRole('combobox', { name: 'Bank Name' }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await expectNoA11yViolations(container)

    document.documentElement.classList.add('dark')
    try {
      await expectNoA11yViolations(container)
    } finally {
      document.documentElement.classList.remove('dark')
    }
  })
})

describe('SearchableSelect — the 16px rule, mutation-checked', () => {
  // `07.2`: the combobox is an <input>, which draws no ::after, so `touch-target` gives it nothing. See
  // TextInput.test.jsx for the rule; the browser half is tools/surfaces.mjs.
  it('the control wears touch-size, so a coarse pointer gets a 44px target', () => {
    renderWithProviders(<SearchableSelect label="Bank Name" value="" onChange={() => {}} options={BANKS} />)
    expect(screen.getByRole('combobox', { name: 'Bank Name' }).className).toMatch(/\btouch-size\b/)
  })

  it('the control wears field-text, and so does every option row', async () => {
    const user = setupUser()
    renderWithProviders(<SearchableSelect label="Bank Name" value="" onChange={() => {}} options={BANKS} />)

    const combobox = screen.getByRole('combobox', { name: 'Bank Name' })
    expect(combobox.className).toMatch(/\bfield-text\b/)
    expect(combobox.className).not.toMatch(/\btext-(xs|sm|2xs)\b/)

    // 🔴 F-D01's actual finding was `text-sm` on a WRAPPER inside three shared
    // primitives — including this one — which is why `facts.py` saw 1 offender and the
    // rendered pixels said 74. The option rows are that wrapper's descendants.
    await user.click(combobox)
    for (const option of screen.getAllByRole('option')) {
      expect(option.className).toMatch(/\bfield-text\b/)
    }
  })
})
