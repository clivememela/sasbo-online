// @vitest-environment jsdom -- the address search when Google answers, and when it does not
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { useState } from 'react'

import AddressAutocomplete from './AddressAutocomplete'
import { renderWithProviders } from '../../test/renderWithProviders'
import { setupUser } from '../../test/user'

/**
 * THE SUGGESTION LIST, DRIVEN. `06.4`.
 *
 * `src/test/setup.js` mocks `useMapsLibrary` to `null` for the whole suite, so no suggestion ever arrives in
 * `AddressAutocomplete.test.jsx` -- and that file says so. This one replaces the mock with a library that is
 * present, and a `google.maps.places` whose lookup this file controls, so both outcomes can be driven.
 *
 * 🔴 A lookup that FAILED looked exactly like an address Google did not know: the list never opened, and the
 * person typing waited for suggestions that were not coming. The case below is paired with the lookup that
 * works -- without it, a field that always said the suggestions failed would pass, and so would a mock that
 * never reached the component at all.
 */

// 🔑 ONE LIBRARY OBJECT, NOT ONE PER RENDER. The component's lookup is a `useCallback` keyed on the library, and
// the debounce effect is keyed on the lookup: a mock returning `({})` hands it a new library on every render, so
// every render re-arms the lookup, whose own state update renders again -- the test never settles. The real hook
// returns the same library once it has loaded, and so does this.
vi.mock('@vis.gl/react-google-maps', () => {
  const places = {}
  return {
    APIProvider: ({ children }) => children,
    useMapsLibrary: () => places,
    useMap: () => null,
    Map: () => null,
    Marker: () => null,
    AdvancedMarker: () => null,
  }
})

const fetchAutocompleteSuggestions = vi.fn()

function Harness() {
  const [value, setValue] = useState('')
  return <AddressAutocomplete label="Residential Address" value={value} onChange={(event) => setValue(event.target.value)} />
}

describe('AddressAutocomplete — the suggestion lookup', () => {
  beforeEach(() => {
    // The component reports the failure through the sink as well as showing it.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    globalThis.google = {
      maps: { places: { AutocompleteSessionToken: class {}, AutocompleteSuggestion: { fetchAutocompleteSuggestions } } },
    }
  })

  afterEach(() => {
    delete globalThis.google
    fetchAutocompleteSuggestions.mockReset()
  })

  it('that failed says so, and keeps what was typed', async () => {
    fetchAutocompleteSuggestions.mockRejectedValue(new Error('REQUEST_DENIED'))
    const user = setupUser()
    renderWithProviders(<Harness />)

    await user.type(screen.getByLabelText('Residential Address'), '12 Synthetic Street')

    expect(await screen.findByText(/Address suggestions could not be loaded/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Residential Address')).toHaveValue('12 Synthetic Street')
  })

  it('the must-pass: a lookup that works offers its suggestions and says nothing of the kind', async () => {
    fetchAutocompleteSuggestions.mockResolvedValue({
      suggestions: [
        {
          placePrediction: {
            placeId: 'synthetic-1',
            text: { text: '12 Synthetic Street, Johannesburg' },
            structuredFormat: { mainText: { text: '12 Synthetic Street' }, secondaryText: { text: 'Johannesburg' } },
          },
        },
      ],
    })
    const user = setupUser()
    renderWithProviders(<Harness />)

    await user.type(screen.getByLabelText('Residential Address'), '12 Synthetic Street')

    expect(await screen.findByRole('option', { name: /12 Synthetic Street/ })).toBeInTheDocument()
    expect(screen.queryByText(/could not be loaded/i)).not.toBeInTheDocument()
  })
})
