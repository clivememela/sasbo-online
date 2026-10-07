import { describe, expect, it } from 'vitest'

import fixture from '../../test/fixtures/recruitment-channel-fixture.json'
import { bankPlacesOf, channelRowsFromMembers, channelRowsFromSummary } from './channelFigures'

/**
 * RC15: THE RECRUITERS SCREEN'S FIGURES, TWO WAYS, ONE FIXTURE.
 *
 * `recruitment-channel-fixture.json` is the same file the server's `RecruitmentChannelMembersTest` reads, and both
 * sides are held to its `expected.all`: the server's grouped SQL there, the screen's own count here -- before the
 * screen's count is removed for the server's.
 */

const channels = fixture.channels.map((name, i) => ({ id: i + 1, name, enabled: true }))

/** The fixture's members as `GET /api/members` sends them: the channel by name, the recruiter by id. */
const members = fixture.members.map((m, i) => ({
  id: i + 1,
  membershipNumber: m.membershipNumber,
  title: m.title,
  initials: m.initials,
  firstNames: m.firstNames,
  surname: m.surname,
  bankName: m.bankName,
  branch: m.branch,
  status: m.status,
  recruitedHow: m.channel,
  recruitmentRepresentativeId: m.recruiterId,
}))

/** The server's answer for the fixture, as `GET /api/recruitment-channels/summary` sends it. */
const summary = fixture.expected.all.map((c) => ({
  channelId: channels.find((ch) => ch.name === c.name).id,
  name: c.name,
  enabled: true,
  members: c.members,
  banks: c.banks,
  branches: c.branches,
}))

const places = bankPlacesOf(fixture.banks)

/** A row as the fixture states it: its count, and its banks and branches as lists. */
const figuresOf = (row) => ({
  name: row.name,
  members: row.count,
  banks: row.banks ? row.banks.split(', ') : [],
  branches: row.branches ? row.branches.split(', ') : [],
})

const byName = (rows) => Object.fromEntries(rows.map((row) => [row.name, row]))

describe('RC15: the figures, from each member\'s own recruitment channel', () => {
  it('🔴 the screen\'s own count gives the fixture\'s figures', () => {
    const rows = channelRowsFromMembers(members, channels, places)

    expect(byName(rows.map(figuresOf))).toEqual(byName(fixture.expected.all))
  })

  it('the server\'s figures make the same rows, string for string -- provinces and areas included', () => {
    expect(channelRowsFromSummary(summary, places)).toEqual(channelRowsFromMembers(members, channels, places))
  })

  it('the rows keep the screen\'s order: by name, every channel listed, a channel nobody joined reading 0', () => {
    const rows = channelRowsFromSummary(summary, places)

    expect(rows.map((row) => row.name)).toEqual(['BEC', 'EORO', 'MSO', 'RO', 'Website', 'Youth'])
    expect(byName(rows).EORO).toMatchObject({ count: 0, banks: '', branches: '', provinces: '', areas: '' })
    expect(byName(rows).BEC).toMatchObject({
      banks: 'Invented Bank, Synthetic Bank',
      provinces: 'Invented North, Invented South',
      areas: 'Invented Area A, Invented Area B',
    })
  })

  it('what RC15 was: matched on the RECRUITER\'s id, RO counted the member of recruiter 4 and not its own two', () => {
    // The old join, written out once so the difference is on record: each channel took the members whose
    // recruitmentRepresentativeId was the channel's id.
    const old = Object.fromEntries(channels.map((channel) => [
      channel.name, members.filter((m) => m.recruitmentRepresentativeId === channel.id).length,
    ]))

    expect(old.RO).toBe(1)
    expect(byName(fixture.expected.all).RO.members).toBe(2)
  })
})
