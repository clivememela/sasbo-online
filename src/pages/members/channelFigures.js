/**
 * RC15 -- THE RECRUITERS SCREEN'S ROWS: ONE PER RECRUITMENT CHANNEL, AND THE MEMBERS RECRUITED THROUGH IT.
 *
 * 🔴 The screen counted a channel's members by `recruitmentRepresentativeId` -- the member's RECRUITER, a person --
 * matched against the CHANNEL's id, so each row counted whoever's recruiter happened to share the channel's number
 * (BEC, id 1, counted the members of recruiter 1). A member is recruited through a channel when their own channel
 * (`recruitedHow` on the wire; `recruitment_channel_id` on record) is it.
 *
 * Two ways to the same rows, held to one fixture (`src/test/fixtures/recruitment-channel-fixture.json`, the same file
 * the server's test reads):
 *   `channelRowsFromMembers` -- the screen's own count, from every member (the old path, corrected);
 *   `channelRowsFromSummary` -- from the server's figures (`GET /api/recruitment-channels/summary`).
 * A channel's banks and branches are listed in reading order either way, as the server lists them.
 */

/** A bank's province and area, from the branch listing -- the last branch listed for a bank name wins, as it did. */
export const bankPlacesOf = (branches) => {
  const places = {};
  (Array.isArray(branches) ? branches : []).forEach((branch) => {
    if (branch?.bankName) places[branch.bankName] = { province: branch.provinceCommitteeName, area: branch.area };
  });
  return places;
};

/** Reading order: ignoring case first, exactly after -- the server's own (`READING_ORDER`). */
const readingOrder = (a, b) => {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la !== lb) return la < lb ? -1 : 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
};

const listed = (values) => [...values].filter(Boolean).sort(readingOrder);

/** The row the table draws for one channel. */
const rowOf = (channel, count, banks, branches, places) => {
  const provinces = new Set();
  const areas = new Set();
  banks.forEach((bank) => {
    const place = places[bank] || {};
    if (place.province) provinces.add(place.province);
    if (place.area) areas.add(place.area);
  });
  return {
    id: channel.id,
    name: channel.name,
    enabled: channel.enabled,
    banks: banks.join(', '),
    branches: branches.join(', '),
    provinces: listed(provinces).join(', '),
    areas: listed(areas).join(', '),
    count,
  };
};

/** The rows in the screen's order: by name, numbers counted as numbers ("Channel 2" before "Channel 10"). */
const inScreenOrder = (rows) =>
  rows.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));

/** The rows from every member -- each counted under the channel they were recruited through. */
export const channelRowsFromMembers = (members, channels, places) => {
  const byName = new Map();
  (Array.isArray(members) ? members : []).forEach((member) => {
    const channel = member?.recruitedHow;
    if (!channel) return;
    if (!byName.has(channel)) byName.set(channel, { count: 0, banks: new Set(), branches: new Set() });
    const figures = byName.get(channel);
    figures.count += 1;
    figures.banks.add(member.bankName ?? '');
    figures.branches.add(member.branch ?? '');
  });
  return inScreenOrder((Array.isArray(channels) ? channels : []).map((channel) => {
    const figures = byName.get(channel.name) ?? { count: 0, banks: new Set(), branches: new Set() };
    return rowOf(channel, figures.count, listed(figures.banks), listed(figures.branches), places);
  }));
};

/** The rows from the server's figures, which are already counted and listed. */
export const channelRowsFromSummary = (summary, places) =>
  inScreenOrder((Array.isArray(summary) ? summary : []).map((channel) => rowOf(
    { id: channel.channelId, name: channel.name, enabled: channel.enabled },
    channel.members ?? 0,
    Array.isArray(channel.banks) ? channel.banks : [],
    Array.isArray(channel.branches) ? channel.branches : [],
    places,
  )));
