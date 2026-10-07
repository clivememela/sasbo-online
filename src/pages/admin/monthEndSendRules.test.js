import { describe, expect, it } from 'vitest'

import { committedSurface, committedVocabulary } from '../../test/apiContractScan'
import { STATISTICS } from './monthEndRules'
import {
  DELIVERY, DELIVERY_REASON, FORMATS, MAIL_OFF, PACKS_UNAVAILABLE, SEND_REFUSAL, SENDING_READS, SFTP_OFF, areasSaid,
  defaultDelivery, deliveriesOf, downloads, emails, fileSaid, filesOf, formatLabel, formatsSaid, howSaid, kindSaid,
  layoutSaid, leftOutSaid, noTableCodeSaid, outcomeSaid, packSaid, passwordWarning, previewSaid, protectionSaid,
  receivesSaid, regionPacksOf, sentence, takeSaid, uncoveredSaid, whyNoEmail, wordsSaid,
} from './monthEndSendRules'
import {
  delivery, monthEndFile, monthFiles, packSet, regionPack, regionPacks, suspendedPage,
} from '../../test/msw/monthEndSendExamples'

/**
 * SENDING THE MONTH'S RULES, held to the server's: the codes the screens branch on and the codes a delivery's record
 * names are codes it publishes; the month reads that are not statistics are exactly the sending screens' own; and every
 * sentence a person reads for the server's words (`contracts/monthend-api.md` §1-4; Stephne, MEN-02 to MEN-05, MEN-32
 * to MEN-35).
 */

const published = () => committedVocabulary().monthEnd.refusalCodes.map((refusal) => refusal.code)

describe('the codes are the server\'s', () => {
  it('every refusal the sending screens branch on is one the server publishes (ME-13)', () => {
    expect(published()).toEqual(expect.arrayContaining(Object.values(SEND_REFUSAL)))
  })

  it('every code a delivery\'s record is said by is one the server publishes -- and a code never heard of is shown as written', () => {
    expect(published()).toEqual(expect.arrayContaining(Object.keys(DELIVERY_REASON)))
    expect(outcomeSaid({ outcome: 'FAILED', code: 'SOMETHING_NEW' })).toBe('Failed: SOMETHING_NEW')
  })

  it('the month reads that are not statistics are exactly the sending screens\' -- neither list can hide a route', () => {
    const routed = committedSurface()
      .map((line) => /^GET \/api\/month-end\/\{month\}\/([a-z-]+)$/.exec(line)?.[1])
      .filter(Boolean)
    const statistics = STATISTICS.map((statistic) => statistic.key)
    expect(routed.filter((name) => !statistics.includes(name)).sort()).toEqual([...SENDING_READS].sort())
    expect(SENDING_READS.filter((name) => statistics.includes(name))).toEqual([])
  })
})

describe('a recipient\'s pack -- MEN-04: download, e-mail, or both, chosen each month; MEN-05: PDF, Excel or both', () => {
  const jhb = packSet('JHB', 'Johannesburg (first set)', 'JHB', ['A', 'F', 'K', 'X'])
  const noAddress = packSet('PE', 'Port Elizabeth', 'PE', [], { email: null })

  it('opens on both where the system can e-mail the recipient, and on a download where it cannot -- and says why', () => {
    expect(defaultDelivery(jhb, true)).toBe(DELIVERY.BOTH)
    expect(whyNoEmail(jhb, true)).toBeNull()
    expect(defaultDelivery(jhb, false)).toBe(DELIVERY.DOWNLOAD)
    expect(whyNoEmail(jhb, false)).toBe(MAIL_OFF)
    expect(defaultDelivery(noAddress, true)).toBe(DELIVERY.DOWNLOAD)
    expect(whyNoEmail(noAddress, true)).toBe('No e-mail address is on record for this recipient, so its pack can only be downloaded.')
  })

  it('MAIL_OFF says that downloading still works -- the e-mail refused, never the pack', () => {
    expect(MAIL_OFF).toMatch(/cannot be e-mailed/)
    expect(MAIL_OFF).toMatch(/Downloading works as usual/)
  })

  it('a choice downloads, e-mails, or both', () => {
    expect([downloads(DELIVERY.DOWNLOAD), emails(DELIVERY.DOWNLOAD)]).toEqual([true, false])
    expect([downloads(DELIVERY.EMAIL), emails(DELIVERY.EMAIL)]).toEqual([false, true])
    expect([downloads(DELIVERY.BOTH), emails(DELIVERY.BOTH)]).toEqual([true, true])
  })

  it('the formats are the server\'s two, as a person names them -- and a format never heard of as written', () => {
    expect(FORMATS).toEqual(['PDF', 'XLSX'])
    expect(formatsSaid(['PDF', 'XLSX'])).toBe('PDF and Excel')
    expect(formatsSaid(['XLSX'])).toBe('Excel')
    expect(formatsSaid([])).toBe('')
    expect(formatLabel('CSV')).toBe('CSV')
  })

  it('what no pack can hold: areas no recipient covers, payroll members in no bank\'s file -- counted, and nothing where none', () => {
    expect(uncoveredSaid({ areas: ['Q'], members: 12 })).toBe('Area Q has 12 members on record whom no recipient’s pack covers.')
    expect(uncoveredSaid({ areas: ['Q', 'Z'], members: 1 })).toBe('Areas Q and Z have 1 member on record whom no recipient’s pack covers.')
    expect(uncoveredSaid({ areas: [], members: 0 })).toBe('')
    expect(uncoveredSaid(undefined)).toBe('')
    expect(noTableCodeSaid({ rows: 1 })).toBe('1 member who pays by payroll deduction is in no bank’s file: no workplace, or '
      + 'a workplace with no table code, is on record for them.')
    expect(noTableCodeSaid({ rows: 0 })).toBe('')
    expect(PACKS_UNAVAILABLE).toMatch(/no pack can be made here/)
  })

  it('the areas a pack covers -- or the whole region where the set names none (MEN-02: Johannesburg twice)', () => {
    expect(areasSaid(['A', 'F', 'K', 'X'])).toBe('Areas A, F, K and X')
    expect(areasSaid(['H'])).toBe('Area H')
    expect(areasSaid([])).toBe('The whole region')
    expect(wordsSaid(['one', 'two'])).toBe('one and two')
  })

  it('a pack says when it was produced, by whom, and what it counted', () => {
    expect(packSaid(regionPack(jhb))).toBe('Produced on 1 October 2026 at 08:58 by Head Office Administrator '
      + '(demo.headoffice): 34 joined, 12 left, 5 suspended.')
  })

  it('the take the month\'s packs are made from -- and a take again, by its number', () => {
    expect(takeSaid('2026-08', { takeNumber: 1, takenAt: '2026-09-29T08:00:00Z', takenBy: 'seed' }))
      .toBe('August 2026, taken on 29 September 2026 at 10:00 by seed')
    expect(takeSaid('2026-08', { takeNumber: 2, takenAt: '2026-10-01T08:00:00Z', takenBy: null }))
      .toBe('August 2026, taken again (take 2) on 1 October 2026 at 10:00')
    expect(takeSaid('2026-08', null)).toBe('August 2026')
  })
})

describe('what was sent -- by download, e-mail or SFTP, and never WhatsApp', () => {
  it('says how each delivery went', () => {
    expect(howSaid(delivery())).toBe('E-mailed as PDF and Excel to regional.secretary.jhb@example.org')
    expect(howSaid(delivery({ channel: 'DOWNLOAD', formats: ['PDF'], address: null }))).toBe('Downloaded as PDF')
    expect(howSaid(delivery({ channel: 'DOWNLOAD', formats: [], address: null }))).toBe('Downloaded')
    expect(howSaid(delivery({ channel: 'SFTP', formats: [], address: 'sftp.example.org' }))).toBe('Sent by SFTP to sftp.example.org')
  })

  it('says what came of it, and why where it did not go', () => {
    expect(outcomeSaid(delivery())).toBe('Done')
    expect(outcomeSaid(delivery({ outcome: 'REFUSED', code: 'MAIL_NOT_CONFIGURED' }))).toBe('Not sent: no mail is set up on this server')
    expect(outcomeSaid(delivery({ outcome: 'FAILED', code: 'MAIL_FAILED' })))
      .toBe('Failed: the mail server refused it or could not be reached')
    expect(outcomeSaid(delivery({ outcome: 'REFUSED', code: null }))).toBe('Not sent')
  })

  it('names what was sent by its kind', () => {
    expect(['REGION_PACK', 'BANK_FILE', 'PROVIDER_FILE', 'OTHER'].map(kindSaid))
      .toEqual(['Region’s pack', 'Bank’s file', 'Provider’s list', 'OTHER'])
  })
})

describe('the banks\' and providers\' files -- MEN-05 (POPIA), MEN-32 to MEN-35', () => {
  it('a bank receives its full list, or the month\'s new and deleted members only -- each bank\'s setting (MEN-33)', () => {
    expect(receivesSaid(true)).toBe('The full list')
    expect(receivesSaid(false)).toBe('New and deleted members only')
    expect(previewSaid({ rows: 412, newRows: 0, deletedRows: 0 }, true)).toBe('412 members')
    expect(previewSaid({ rows: 1, newRows: 0, deletedRows: 0 }, true)).toBe('1 member')
    expect(previewSaid({ rows: 9, newRows: 6, deletedRows: 3 }, false)).toBe('6 new and 3 deleted')
    expect(previewSaid(null, true)).toBe('')
  })

  it('says each layout and each protection as a person reads it -- and one never heard of as written', () => {
    expect(layoutSaid('ABSA_FIXED_WIDTH')).toBe('Absa’s fixed-width text file')
    expect(layoutSaid('SHEET')).toBe('an Excel workbook')
    expect(sentence(layoutSaid('PROVISIONAL_MEMBER_LIST'))).toBe('A member list')
    expect(sentence('')).toBe('')
    expect(layoutSaid('NEDBANK_OWN')).toBe('NEDBANK_OWN')
    expect(protectionSaid('AES_256_ZIP')).toBe('in a ZIP with a password: open it with 7-Zip, WinZip or WinRAR')
    expect(protectionSaid('EXCEL_AES_256')).toBe('with a password Excel asks for when it opens')
  })

  it('a file says its name, its rows, who made it and how often it was downloaded -- and counts what it left out', () => {
    expect(fileSaid(monthEndFile())).toBe('ABSAFULL_260831.zip: 412 rows, produced on 1 October 2026 at 09:20 by Head Office '
      + 'Administrator (demo.headoffice). Downloaded 1 time, last on 1 October 2026 at 09:21.')
    expect(leftOutSaid(2)).toBe('2 members could not be put in this layout and are left out.')
    expect(leftOutSaid(1)).toBe('1 member could not be put in this layout and is left out.')
    expect(leftOutSaid(0)).toBe('')
  })

  it('the one-time password\'s warning: by phone, and never shown again', () => {
    expect(passwordWarning('BANK')).toBe('Give this password to the bank by phone — it will not be shown again.')
    expect(passwordWarning('PROVIDER')).toBe('Give this password to the provider by phone — it will not be shown again.')
    expect(SFTP_OFF).toMatch(/not set up on this server/)
  })
})

describe('MV-36: an answer of another shape is not available, never an empty list', () => {
  it('the contract\'s answers are each its shape', () => {
    expect(regionPacksOf(regionPacks())).not.toBeNull()
    expect(filesOf(monthFiles())).not.toBeNull()
    expect(deliveriesOf({ month: '2026-08', page: 0, size: 50, total: 0, items: [] })).not.toBeNull()
  })

  it('the shared fixture\'s [] and anything half-shaped are not', () => {
    for (const answer of [[], null, {}, { month: '2026-08' }, suspendedPage()]) {
      expect(regionPacksOf(answer)).toBeNull()
      expect(filesOf(answer)).toBeNull()
    }
    expect(regionPacksOf({ month: '2026-08', sets: [{ set: {} }] })).toBeNull()
    expect(deliveriesOf({ items: [], total: '0' })).toBeNull()
  })
})
