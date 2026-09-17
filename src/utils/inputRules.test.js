import { describe, expect, it } from 'vitest'
import { sanitiseField, validateField, digitCount, SANITISED_FIELDS } from './inputRules'

/**
 * The typing rules, and the one way they could do real harm.
 *
 * Most of this file is ordinary: digits-only fields refuse letters, phone fields keep
 * their punctuation, initials refuse digits. The section that earns its place is
 * `names are not [A-Za-z]` — a letters-only filter looks correct in review, passes
 * every test somebody thinks to write with English names, and then tells a member
 * called Naudé that their surname is invalid by silently dropping a character as they
 * type it. That is worse than any defect this module prevents.
 */

describe('sanitiseField — what may be typed', () => {
    describe('digits only', () => {
        for (const field of ['bankAccountNumber', 'ibtNo']) {
            it(`${field} refuses letters and punctuation`, () => {
                expect(sanitiseField(field, '62abc00-98 76 54')).toBe('620098 7654'.replace(/\s/g, ''))
            })
            it(`${field} keeps leading zeros`, () => {
                // 🔴 The reason these fields are `text` and never `type="number"`.
                // 152 of the 152 seeded IBT values begin with a zero, and Standard
                // Bank's branch code is 051001.
                expect(sanitiseField(field, '0051001')).toBe('0051001')
            })
        }
    })

    describe('phone numbers', () => {
        for (const field of ['phone', 'workTel', 'homeTel']) {
            it(`${field} refuses letters`, () => {
                expect(sanitiseField(field, '082abc1234567')).toBe('0821234567')
            })
            it(`${field} keeps the way a South African number is written`, () => {
                // The seed writes them like this; stripping "+" changes the number's
                // meaning rather than tidying it.
                expect(sanitiseField(field, '+27 82 100 0001')).toBe('+27 82 100 0001')
                expect(sanitiseField(field, '(011) 555-0001')).toBe('(011) 555-0001')
            })
        }
    })

    describe('initials', () => {
        it('refuses digits', () => {
            expect(sanitiseField('initials', 'J2P3')).toBe('JP')
        })
        it('keeps the separators people actually write', () => {
            expect(sanitiseField('initials', 'J.P.')).toBe('J.P.')
            expect(sanitiseField('initials', 'J-P')).toBe('J-P')
        })
    })

    describe('🔴 names are NOT [A-Za-z], and this is the half that matters', () => {
        // Every one of these is an ordinary South African name. A letters-only filter
        // mangles all of them, and does it invisibly — the character simply never
        // appears as the administrator types it.
        const realNames = [
            'de Villiers', 'van der Merwe', "O'Brien", 'N’wamitwa',
            'Smit-Nel', 'Müller', 'Naudé', 'Nkosikhona', 'Thabo Sipho',
        ]
        for (const name of realNames) {
            it(`keeps "${name}" exactly`, () => {
                expect(sanitiseField('surname', name)).toBe(name)
                expect(sanitiseField('firstNames', name)).toBe(name)
            })
        }

        it('...but still refuses digits and symbols in a name', () => {
            // The non-vacuity half. Without it, "keeps every name" passes against a
            // filter that has stopped filtering anything at all.
            expect(sanitiseField('surname', 'Khumalo123')).toBe('Khumalo')
            expect(sanitiseField('surname', 'Khum@lo#')).toBe('Khumlo')
        })
    })

    describe('identity number', () => {
        const ID = { identityType: 'I.D. Number' }
        it('strips non-digits and caps at 13 for a South African ID', () => {
            expect(sanitiseField('identityNumber', '80a01b015001081999', ID)).toBe('8001015001081')
        })
        it('leaves a passport alphanumeric', () => {
            expect(sanitiseField('identityNumber', 'A1234567', { identityType: 'Passport Number' }))
                .toBe('A1234567')
        })
    })

    it('a field with no rule is returned untouched', () => {
        // The default branch, asserted so that adding a rule is a deliberate act and
        // an unlisted field is never silently filtered.
        expect(sanitiseField('bankAddress', '135 Rivonia Rd, Sandton #4')).toBe('135 Rivonia Rd, Sandton #4')
        expect(SANITISED_FIELDS).not.toContain('bankAddress')
    })
})

describe('validateField — what may be saved', () => {
    it('says nothing about an empty field', () => {
        // Requiredness belongs to the screen: a bank account number is required for a
        // debit order and meaningless for payroll.
        for (const f of SANITISED_FIELDS) expect(validateField(f, '')).toBeNull()
    })

    describe('bank account number', () => {
        it('accepts a real one', () => {
            expect(validateField('bankAccountNumber', '62000987654')).toBeNull()
            expect(validateField('bankAccountNumber', '6000012345')).toBeNull()
        })
        it('🔴 refuses one that is too short to be an account', () => {
            // The gap this closes: the field was REQUIRED for a debit order and had no
            // format check, so a typo was stored and only surfaced when the collection
            // failed — the member in arrears through nobody's fault.
            expect(validateField('bankAccountNumber', '123')).toMatch(/too short/i)
        })
        it('refuses one that is too long', () => {
            expect(validateField('bankAccountNumber', '12345678901234')).toMatch(/too long/i)
        })
    })

    describe('phone numbers', () => {
        it('accepts the seeded shape', () => {
            expect(validateField('workTel', '+27 11 555 0001')).toBeNull()
            expect(validateField('phone', '0821234567')).toBeNull()
        })
        it('refuses a number with too few digits to dial', () => {
            expect(validateField('homeTel', '0821')).toMatch(/too short/i)
        })
    })

    it('initials are at most six letters', () => {
        expect(validateField('initials', 'J.P.')).toBeNull()
        expect(validateField('initials', 'ABCDEFG')).toMatch(/too long/i)
    })

    it('an IBT number is at most six digits', () => {
        expect(validateField('ibtNo', '051001')).toBeNull()
        expect(validateField('ibtNo', '0510011')).toMatch(/6 digits/i)
    })

    describe('email — checked at SUBMIT, not only as it is typed', () => {
        // 🔴 The gap this closes. Both screens already validated an email on CHANGE,
        // so a typo caught you as you made it. But a member LOADED into Edit Member
        // with a bad address already stored fires no change event — saving them
        // unchanged never challenged it, and editing is exactly where such a record
        // turns up.
        it('accepts a real address', () => {
            expect(validateField('personalEmail', 'thabo.nkosi@sasbo.org.za')).toBeNull()
            expect(validateField('workEmail', 'a@b.co')).toBeNull()
        })
        it('refuses one that is not an address', () => {
            expect(validateField('personalEmail', 'thabo.nkosi')).not.toBeNull()
            expect(validateField('workEmail', 'a@b')).not.toBeNull()
            expect(validateField('workEmail', 'a b@c.co')).not.toBeNull()
        })
    })

    describe('date of birth — it had no bound of any kind', () => {
        // `type="date"` stops "hello". It does not stop next Tuesday or the year 1066,
        // and the field is REQUIRED for passport holders, so it is typed by hand.
        const iso = (d) => d.toISOString().slice(0, 10)
        it('accepts a plausible one', () => {
            const forty = new Date(); forty.setFullYear(forty.getFullYear() - 40)
            expect(validateField('dateOfBirth', iso(forty))).toBeNull()
        })
        it('refuses the future', () => {
            const soon = new Date(); soon.setFullYear(soon.getFullYear() + 1)
            expect(validateField('dateOfBirth', iso(soon))).toMatch(/future/i)
        })
        it('refuses a member who would be under 16', () => {
            const child = new Date(); child.setFullYear(child.getFullYear() - 10)
            expect(validateField('dateOfBirth', iso(child))).toMatch(/under 16/i)
        })
        it('refuses an implausibly distant past', () => {
            expect(validateField('dateOfBirth', '1850-01-01')).toMatch(/too far in the past/i)
        })
        it('🔴 reads every form the app actually holds a date in -- through lib/format.js', () => {
            // A member LOADED into Edit Member carries its date as Jackson's [y, m, d]
            // array, and the approved picker accepts "15 Jun 1985" and "15/06/1985".
            // `new Date(raw)` reads the array as the string "1985,6,15" and the
            // day-first form as nothing at all -- and main's R-ROB-N bans it anyway,
            // because it parses an ISO date as midnight UTC.
            expect(validateField('dateOfBirth', [1985, 6, 15])).toBeNull()
            expect(validateField('dateOfBirth', '15 Jun 1985')).toBeNull()
            expect(validateField('dateOfBirth', '15/06/1985')).toBeNull()
            expect(validateField('dateOfBirth', '1985-06-15')).toBeNull()
        })
        it('refuses a value that is not a date at all', () => {
            expect(validateField('dateOfBirth', 'not-a-date')).toMatch(/not a real date/i)
        })
    })

    it('digitCount ignores punctuation', () => {
        // 27 82 100 0001 -> eleven digits. Counted, not assumed: the first version of
        // this line said twelve and the test caught it.
        expect(digitCount('+27 82 100 0001')).toBe(11)
        expect(digitCount('')).toBe(0)
        expect(digitCount(null)).toBe(0)
    })
})
