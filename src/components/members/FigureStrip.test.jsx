// @vitest-environment jsdom -- renders the register's figures and reads them back
import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import FigureStrip from './FigureStrip'

/**
 * A FIGURE IS A READING, AND A READING NOBODY TOOK IS NOT A ZERO. `06.3`, K1.
 *
 * 🔴 With the register unreachable the strip printed Total 0 · Active 0 · Pending 0 · Suspended 0
 * -- the union, apparently, with no members -- directly above the sentence saying the register
 * could not be reached. It printed the same row of zeros for the length of every load, so the
 * first thing the register said on every visit was that it was empty.
 */
const ZEROS = { total: 0, active: 0, pending: 0, suspended: 0, updatedToday: 0 }
const strip = () => within(screen.getByTestId('figure-strip'))

describe('FigureStrip', () => {
  it('prints no figure while the register cannot be reached', () => {
    render(<FigureStrip {...ZEROS} state="error" />)

    expect(strip().queryByText('0')).not.toBeInTheDocument()
    // Each figure still has a value for a screen reader, and the value is the truth.
    expect(strip().getAllByText('not available')).toHaveLength(5)
  })

  it('prints no figure while the register is still loading', () => {
    render(<FigureStrip {...ZEROS} state="loading" />)

    expect(strip().queryByText('0')).not.toBeInTheDocument()
    expect(screen.getByTestId('figure-strip')).toHaveAttribute('aria-busy', 'true')
  })

  it('a register that really is empty still reads zero', () => {
    // The pair: the locator above is seen to match when zero is the truth.
    render(<FigureStrip {...ZEROS} />)

    expect(strip().getAllByText('0')).toHaveLength(5)
    expect(screen.getByTestId('figure-strip')).not.toHaveAttribute('aria-busy')
  })
})
