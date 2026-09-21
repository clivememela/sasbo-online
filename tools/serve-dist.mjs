/**
 * Serves the built `dist/` AND answers `/api/**` with synthetic data. `05.1`.
 *
 * 🔴 WHY NOT `vite preview`. On this machine it binds `[::1]` ONLY, so a probe pointed at
 * `127.0.0.1:<port>` can reach a DIFFERENT server that happens to hold the IPv4 side of
 * the same port — which is exactly [T23], and it cost this arc a measurement of the
 * mockups directory index instead of the application. This binds `127.0.0.1` explicitly
 * and prints what it bound, so the address measured is the address served.
 *
 * 🔑 WHY IT SERVES THE API TOO. The matrix measures LAYOUT, and a table with no rows has
 * no layout worth measuring — a nine-column table that overflows at 390px does not
 * overflow when it is empty. The client is built with `VITE_API_BASE_URL=` so it calls
 * `/api/...` same-origin and lands here.
 *
 * 🔑 THAT BUILD NEEDS ONE FILE, AND IT IS NOT COMMITTED. Create `.env.production.local`
 * holding `VITE_API_BASE_URL=` (empty), run `npx vite build`, then delete it again -- it is
 * a measurement artefact, not part of the app, and a build that keeps it would ship a client
 * that calls its own origin. Without it `.env.local` wins and the built client talks to a
 * dead backend on 8081, which looks exactly like a working measurement of empty pages.
 *
 * ⚠️ SYNTHETIC DATA ONLY (R-SEC-H). Every name, number and address below is invented.
 * Nothing here touches a real database, and the long values are deliberate: a matrix run
 * against three-character names proves nothing about a column that has to hold
 * "Pietermaritzburg & Midlands Branch".
 */
import { createReadStream, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

/** Is this a readable file? One stat, and a missing path is simply `false`. */
const isFile = (path) => {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
};

const ROOT = process.argv[2] ?? 'dist';
const PORT = Number(process.argv[3] ?? 4319);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
};

/** Long, plausible, and entirely invented. */
const surnames = ['Nkosi', 'Van der Merwe', 'Pillay', 'Mokoena', 'Abrahams', 'Ndlovu', 'Botha', 'Naidoo'];
const banks = ['Absa Bank', 'Standard Bank of South Africa', 'First National Bank', 'Nedbank', 'Capitec Bank'];
const branches = ['Pietermaritzburg & Midlands Branch', 'Sandton Central', 'Cape Town CBD', 'Gqeberha Central'];
const statuses = ['Active', 'Pending', 'Suspended', 'Resigned', 'Retired'];

const members = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  membershipNumber: String(100000 + i),
  employeeNumber: String(778800 + i),
  title: ['Mr', 'Ms', 'Dr', 'Adv'][i % 4],
  initials: 'ABC'.slice(0, (i % 3) + 1),
  firstNames: 'Synthetic Testperson',
  surname: surnames[i % surnames.length],
  identityType: 'I.D. Number',
  identityNumber: '9001010000080',
  bankName: banks[i % banks.length],
  branch: branches[i % branches.length],
  status: statuses[i % statuses.length],
  phone: '0110000000',
  personalEmail: 'synthetic.member@example.invalid',
  workEmail: 'synthetic.work@example.invalid',
  address: '1 Percy Street, Fourways, 2191',
  bankAddress: '1 Percy Street, Fourways, 2191',
  paymentType: i % 2 ? 'Debit Order' : 'Payroll',
  bankAccountNumber: '000123456789',
  monthlySubscription: '182.77',
  joinDate: '2019-04-01',
  recruitmentRepresentativeId: (i % 5) + 1,
  isBec: i % 3 === 0,
  isCosatu: i % 4 === 0 ? 'Y' : 'N',
  cosatuLocal: 'Braamfontein',
  cosatuRegion: 'Gauteng South',
  cosatuPositions: ['PEC'],
}));

/*
 * 🔴 ONE ROW AT EVERY CAP. The register's column ladder promises that its columns FIT, and the widths it steps
 * at were measured against this data -- whose longest member line, "Adv ABC Van der Merwe", is far short of the
 * width the member cell allows. A real roll has longer names, so a ladder measured on this data clipped Status
 * at widths where this data fitted. Row 8 carries the longest value each capped column can show, so every
 * sweep measures the worst case the caps permit, and `overflowProbe`'s register check holds it there.
 */
Object.assign(members[7], {
  title: 'Adv',
  initials: 'NTN',
  surname: 'Van der Merwe-Mokoena',
  firstNames: 'Nomvula Thandeka Ntombifuthi',
  employeeNumber: 'E001234567',
  bankName: 'The Standard Bank of South Africa Limited',
  branch: 'Johannesburg Central Business District Branch',
  status: 'Suspended',
});

const bankRows = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  bankName: banks[i % banks.length],
  bankAbbreviation: ['ABSA', 'SBSA', 'FNB', 'NED', 'CAP'][i % 5],
  abbreviation: ['ABSA', 'SBSA', 'FNB', 'NED', 'CAP'][i % 5],
  branchName: branches[i % branches.length],
  area: ['Gauteng South', 'Western Cape', 'KwaZulu-Natal'][i % 3],
  randomAccessNumber: String(250655 + i),
  universalBranchCode: String(250655 + i),
  phoneNumber: '011 000 0000',
  managerName: `Synthetic Manager ${i + 1}`,
  fax: '011 000 0001',
  email: 'branch.manager.synthetic@example.invalid',
  provinceCommitteeName: ['Gauteng South', 'Western Cape', 'KwaZulu-Natal'][i % 3],
}));


/**
 * A.C.B. -> Runs (`01.5`). The list is the `API` table's; one run, its lines, its exclusions, a
 * prepare and a cancel are answered per shape in `acbRunAnswer` below, because a prefix match would
 * hand the list's page to every one of them.
 *
 * 🔑 THE PREPARE IS STATEFUL, and only that: a POST starts run 9002 `PREPARING`, and its first two
 * reads answer `PREPARING` before it is `PREPARED` -- the polling flow, measurable (`screens.md` ask 2).
 * ⏱️ The two reads are the run panel's own, at once, and the screen's first poll at 1 s; its second
 * poll, at 1 + 2 = 3 s, sees `PREPARED` -- well inside a surface step's wait, so it does not race it
 * (the design session's review, 2026-09-19). The count resets on EVERY POST, not per process, so
 * each row of a sweep (widths × themes) exercises the polling afresh.
 * Accounts are last-four only, as the server sends them; every name is the synthetic members'.
 */
const acbRun = (id, actionMonth, status, overrides = {}) => ({
  id, actionMonth, status, version: 1, setupDate: '2026-09-18', creationDate: null,
  makeBy: `${actionMonth}-17`, makeByPassed: false,
  purgeDate: `${actionMonth}-30`, firstDueDate: `${actionMonth}-20`, lastDueDate: `${actionMonth}-30`,
  lineCount: 30, totalAmount: 5220, totalsAgree: true, calendarAgrees: true, rateAmount: 174,
  rateEffectiveFrom: '2026-01-01', holidaySet: 'za-statutory', holidaysKnown: true, createdBy: 'system', approvedBy: null,
  startedAt: '2026-09-18T10:00+02:00', heartbeatAt: '2026-09-18T10:00+02:00', failureReason: null,
  exclusions: [
    { reason: 'NOT_DEBIT_ORDER', listed: false, detail: 'Payroll Deduction', memberCount: 48 },
    { reason: 'STATUS_NOT_ACTIVE', listed: false, detail: 'Suspended', memberCount: 3 },
    { reason: 'NO_BANK_ON_RECORD', listed: true, detail: null, memberCount: 2 },
    { reason: 'DAY_OUT_OF_WINDOW', listed: true, detail: null, memberCount: 1 },
  ],
  ...overrides,
});
const acbRuns = [
  acbRun(41, '2026-10', 'PREPARED'),
  acbRun(40, '2026-09', 'SUBMITTED'),
  acbRun(39, '2026-08', 'CANCELLED', { lineCount: 28, totalAmount: 4872 }),
];
const acbPage = (content, size) => ({ content, page: 0, size, totalElements: content.length, totalPages: 1 });
const acbLines = members.slice(0, 30).map((m, i) => ({
  id: 1000 + i, memberId: m.id, membershipNumber: m.membershipNumber, surname: m.surname, initials: m.initials,
  bankName: m.bankName, branchCode: '632005', accountLastFour: String(1000 + i * 37).slice(-4), accountType: null,
  debitDay: 20 + (i % 12), actionDate: `2026-10-${String(20 + (i % 11)).padStart(2, '0')}`, amount: 174,
  outcome: 'PENDING', rePresentsLineId: null, fileSequence: null, unpaidCode: null, unpaidReason: null, decision: null,
}));
const acbExclusions = members.slice(30, 33).map((m, i) => ({
  memberId: m.id, membershipNumber: m.membershipNumber, surname: m.surname, initials: m.initials,
  reason: ['NO_BANK_ON_RECORD', 'NO_BANK_ON_RECORD', 'DAY_OUT_OF_WINDOW'][i], detail: [m.bankName, m.bankName, '5'][i],
}));
/**
 * The Debits screen (`04.1`): run 40's unpaids -- every reason, one decided, one Invalid Account Number with its
 * banking cure -- run 41's one held-over re-debit, run 40's two held letters, and the member search's page. The
 * search answers the same page whatever is asked: it measures the table, not the matching.
 */
const UNPAID_CASES = [
  ['2', 'NOT_PROVIDED_FOR', 'RE_PRESENT', null, 'QUEUED'],
  ['4', 'PAYMENT_STOPPED', 'SUSPEND', null, 'RENDERED'],
  ['8', 'INVALID_ACCOUNT_NUMBER', null, null, 'QUEUED'],
  ['12', 'ACCOUNT_CLOSED', 'SUSPEND', null, 'RENDERED'],
  ['2', 'NOT_PROVIDED_FOR', null, 'RE_PRESENT', 'SENT'],
  ['30', 'OTHER', null, null, null],
];
const acbUnpaids = UNPAID_CASES.map(([code, reason, suggested, decided, letterStatus], i) => ({
  ...acbLines[i], id: 2000 + i, outcome: 'UNPAID', actionDate: '2026-09-25', unpaidCode: code, unpaidReason: reason,
  decision: decided, suggestedDecision: decided ? null : suggested, permissionNote: null, letterStatus,
}));
const acbHeldOver = [{
  lineId: 1900, runId: 38, memberId: members[1].id, membershipNumber: members[1].membershipNumber,
  surname: members[1].surname, month: '2026-07', amount: 174, permitted: false,
}];
const acbHeldLetters = members.slice(0, 2).map((m, i) => ({
  letterId: 3000 + i, lineId: 2000 + i, memberId: m.id, membershipNumber: m.membershipNumber, surname: m.surname,
  template: ['RE_DEBIT', 'RETURN_DEBIT'][i], reason: 'NO_EMAIL', canSend: i === 0,
}));
const acbFound = members.slice(0, 25).map((m, i) => ({
  id: m.id, membershipNumber: m.membershipNumber, title: m.title, initials: m.initials, surname: m.surname,
  bankName: m.bankName, accountLastFour: String(1000 + i * 37).slice(-4), debitDay: 20 + (i % 12), status: m.status,
}));
let acbPreparedReads = 0;

/** The A.C.B. run shapes a prefix match cannot answer; `false` when the path is not one of them. */
const acbRunAnswer = (req, path) => {
  const reply = (status, body) => ({ status, body });
  if (req.method === 'POST' && path === '/api/acb/runs') {
    acbPreparedReads = 0;
    return reply(202, acbRun(9002, '2026-10', 'PREPARING', { lineCount: 0, totalAmount: 0, exclusions: [] }));
  }
  let m = /^\/api\/acb\/runs\/(\d+)\/cancel$/.exec(path);
  if (req.method === 'POST' && m) return reply(200, acbRun(Number(m[1]), '2026-10', 'CANCELLED', { version: 2 }));
  if (req.method !== 'GET') return false;
  if (req.method === 'POST' && path === '/api/acb/members/search') {
    return reply(200, { content: acbFound, page: 0, size: 25, totalElements: 57, totalPages: 3 });
  }
  if (/^\/api\/acb\/runs\/\d+\/unpaids$/.test(path)) return reply(200, acbPage(acbUnpaids, 50));
  if (/^\/api\/acb\/runs\/\d+\/held-over$/.test(path)) return reply(200, acbPage(acbHeldOver, 50));
  if (/^\/api\/acb\/runs\/\d+\/letters\/held$/.test(path)) return reply(200, acbPage(acbHeldLetters, 50));
  m = /^\/api\/acb\/runs\/\d+\/lines\/(\d+)\/decision$/.exec(path);
  if (req.method === 'POST' && m) {
    const line = acbUnpaids.find((l) => l.id === Number(m[1])) ?? acbUnpaids[0];
    return reply(200, { ...line, decision: line.suggestedDecision ?? 'RE_PRESENT', suggestedDecision: null });
  }
  m = /^\/api\/acb\/runs\/\d+\/lines\/(\d+)\/permission$/.exec(path);
  if (req.method === 'POST' && m) return reply(200, { ...acbUnpaids[0], decision: 'RE_PRESENT', permissionNote: 'noted' });
  m = /^\/api\/acb\/runs\/\d+\/letters\/(\d+)\/handled$/.exec(path);
  if (req.method === 'POST' && m) return reply(200, acbHeldLetters.find((l) => l.letterId === Number(m[1])) ?? acbHeldLetters[0]);
  // As the server answers today: the send waits for sign-in (B1).
  if (req.method === 'POST' && /^\/api\/acb\/runs\/\d+\/letters\/\d+\/send$/.test(path)) {
    return reply(403, { status: 403, code: 'IDENTITY_REQUIRED', details: {},
      message: 'Sending a letter to a member waits until administrators sign in to this system. Nothing has been sent.' });
  }
  if (/^\/api\/acb\/runs\/\d+\/lines$/.test(path)) return reply(200, acbPage(acbLines, 50));
  if (/^\/api\/acb\/runs\/\d+\/exclusions$/.test(path)) return reply(200, acbPage(acbExclusions, 50));
  m = /^\/api\/acb\/runs\/(\d+)$/.exec(path);
  if (!m) return false;
  const id = Number(m[1]);
  if (id === 9002) {
    acbPreparedReads += 1;
    return reply(200, acbRun(9002, '2026-10', acbPreparedReads <= 2 ? 'PREPARING' : 'PREPARED'));
  }
  return reply(200, acbRuns.find((r) => r.id === id) ?? acbRuns[0]);
};

const API = {
  '/api/members': members,
  // The runs list; one run and its sheets are answered per shape by `acbRunAnswer`.
  '/api/acb/runs': acbPage(acbRuns, 12),
  // The Debits screen's member search (`04.1`) -- a POST, answered by `acbRunAnswer` first; the key is what
  // `stubDrift` reads, so the path is covered by name rather than by accident.
  '/api/acb/members/search': { content: acbFound, page: 0, size: 25, totalElements: 57, totalPages: 3 },
  // The dated rates the Runs screen reads (Q43): V41's one row, and no January notice in September.
  '/api/acb/rates': {
    rates: [{ effectiveFrom: '2026-01-01', amount: 174, source: 'From January -- confirmed by SASBO 2026-09-21 (Q43)' }],
    januaryNotice: null,
  },
  // The holiday calendar the Runs screen reads (D30): V47's, far from its end, so no notice.
  '/api/acb/holidays': {
    name: 'za-statutory', knownUntil: '2027-12-31', endingSoon: false, year: 2026,
    holidays: [
      { date: '2026-09-24', name: 'Heritage Day', source: 'STATUTORY' },
      { date: '2026-12-16', name: 'Day of Reconciliation', source: 'STATUTORY' },
      { date: '2026-12-25', name: 'Christmas Day', source: 'STATUTORY' },
    ],
  },
  '/api/banks': bankRows,
  '/api/banks/branches': bankRows,
  // `Locations` searches `/api/branches?...` and hands each result to `LocationListing`,
  // which renders `data.members` -- so a bare branch row produces an EMPTY table and the
  // eleven-column layout the matrix most wants to measure never appears.
  '/api/branches': bankRows.map((b) => ({
    ...b,
    branchCode: b.randomAccessNumber,
    areaRepName: 'Synthetic Area Rep',
    becMembers: '4', memnetMembers: '9', bankManager: 'Synthetic Manager',
    bankManagerEmail: 'manager.synthetic@example.invalid',
    alternativeContact: 'Synthetic Alternate', alternativeContactEmail: 'alt.synthetic@example.invalid',
    compliments: '-', membership: '28', lastVisited: '2026-08-01',
    members: members.slice(0, 14).map((m) => ({
      memNo: m.membershipNumber, name: `${m.title} ${m.initials} ${m.surname}`,
      bankAt: m.bankName, subscr: m.monthlySubscription, empNum: m.employeeNumber,
      email: m.workEmail, id: m.identityNumber, cell: m.phone, joined: m.joinDate,
      susp: '-', label: 'Y', alternateAddress: '1 Percy Street, Fourways, 2191',
    })),
  })),
  '/api/recruitment-channels': Array.from({ length: 12 }, (_, i) => ({
    id: i + 1, name: `Synthetic Channel ${i + 1}`, enabled: i % 3 !== 0,
  })),
  '/api/representatives': Array.from({ length: 8 }, (_, i) => ({
    id: i + 1, name: `Synthetic Recruiter ${i + 1}`, email: 'rep.synthetic@example.invalid',
    phone: '0110000000', memberId: i + 1, roleId: 1, isElectedRep: i % 2 === 0,
    electionDate: '2024-06-01', recruiterTypeId: 1, structureIds: [],
  })),
  // `recruiterService.getRecruiters()` -- the Capture Member re-port's own endpoint (main `bb1052b`), which reached
  // this branch in P10's merge. The drift guard below refused to serve until it had a stub (P10, 2026-09-18): a
  // Recruiter drop-down answered by nothing is a capture screen measured with an empty control.
  '/api/recruiters': Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `Synthetic Recruiter ${i + 1}` })),
  // `recruiterService.getRoles()` and `.getStructures()`. These were `/api/roles` and
  // `/api/structures`, which nothing calls, so both lists were being answered by `/api/members`
  // -- see `stubDrift` below.
  '/api/members/userRoles': [{ id: 1, name: 'Lead Recruiter' }, { id: 2, name: 'Standard Recruiter' }],
  '/api/members/structures/tree': [{ id: 1, name: 'INC / IC', parentId: null, children: [] }],
  '/api/provinces': ['Gauteng', 'Western Cape', 'KwaZulu-Natal'].map((name, i) => ({ id: i + 1, name })),
  '/api/areas': ['Gauteng South', 'Western Cape'].map((name, i) => ({ id: i + 1, name })),
  '/api/districts': [{ id: 1, name: 'Synthetic District' }],
  '/api/job-grades': [{ code: 'A1', description: 'Clerk' }, { code: 'B2', description: 'Officer' }],
  '/api/subscriptions': Array.from({ length: 15 }, (_, i) => ({
    id: i + 1, bankName: banks[i % banks.length], acbDebitDay: 25,
    subscriptionAmount: 182.77, isCoreBanking: i % 2 === 0,
    status: ['ACTIVE', 'PENDING', 'CANCELLED', 'INACTIVE'][i % 4],
    registrationDate: '2023-01-15',
  })),
};

/**
 * The stub routes, longest first, established ONCE.
 *
 * It was re-keyed and re-sorted on every `/api/` hit — a per-request recomputation of a
 * constant, in the one server all ~700 navigations of a full sweep pass through. Sorting here
 * also makes "longest match first" a property of a value rather than a claim in a comment.
 */
const API_KEYS = Object.keys(API).sort((a, b) => b.length - a.length);

/**
 * 🔴 A STUB THAT ANSWERS FOR THE WRONG PATH IS SILENT -- AND IT HAPPENED.
 *
 * Matching is by prefix (see below), so when the client moved `getRoles()` to
 * `/api/members/userRoles` and `getStructures()` to `/api/members/structures/tree`, both were
 * answered by `/api/members`: sixty members handed to a roles picker and to a structure tree.
 * Nothing 501'd, because something matched -- and the keys the client had moved away from sat
 * in this table answering nothing. Found 2026-09-14, by `06.3`.
 *
 * So the table is checked against the paths the services actually call, once, before serving:
 * every service path must be answered by a key that covers its whole fixed part, and every key
 * must be called by something. Either failure refuses to serve, because a sweep over the wrong
 * stubs measures pages nobody will ever see.
 *
 * ⚠️ IT READS `apiUrl('<literal>')` IN `src/services`, the same net `apiContract.test.js` casts,
 * so it has to be run from the client's root -- which is where every measurement runs from.
 */
/**
 * Service paths deliberately NOT stubbed, each with its reason -- and each asserted to still be
 * called, because an exception list nobody checks against the code rots in silence (T34).
 */
const NOT_STUBBED = {
  // A2, pinned in `apiContract.test.js`: the server has no such route, and no screen imports the
  // service that calls it. A stub here would measure against an endpoint production does not have.
  '/api/debounce': 'A2',
};

const stubDrift = () => {
  let files;
  try {
    files = readdirSync('src/services').filter((f) => f.endsWith('.js') && !f.includes('.test.'));
  } catch (e) {
    throw new Error(`serve-dist runs from the client root, and cannot read src/services here (${e.message})`);
  }
  const called = new Set();
  for (const file of files) {
    // `/api/[a-z]`: a doc comment's `apiUrl('/api/...')` is an example, not a call.
    for (const [, literal] of readFileSync(join('src/services', file), 'utf8').matchAll(/apiUrl\(\s*[`'"](\/api\/[a-z][^`'"]*)[`'"]/g)) {
      // The fixed part: everything before the first interpolation or query string.
      called.add(literal.split('${')[0].split('?')[0]);
    }
  }
  if (called.size < 10) {
    return [`read only ${called.size} service paths from src/services -- the scan is not seeing the services`];
  }

  const problems = [];
  for (const path of [...called].sort()) {
    if (path in NOT_STUBBED) continue;
    const key = API_KEYS.find((k) => path.startsWith(k));
    if (!key) problems.push(`${path} has no stub at all`);
    // What is left over may only be the slash in front of an id. Anything else is a path this
    // key was never written for.
    else if (!['', '/'].includes(path.slice(key.length))) problems.push(`${path} is answered by the shorter stub ${key}`);
  }
  for (const key of API_KEYS) {
    if (![...called].some((path) => path.startsWith(key))) problems.push(`${key} is stubbed and no service calls it`);
  }
  for (const path of Object.keys(NOT_STUBBED)) {
    if (!called.has(path)) problems.push(`${path} is excused from stubbing and no service calls it any more -- drop the excuse`);
  }
  return problems;
};

/**
 * Payloads serialised once at startup.
 *
 * `/api/branches` is 189 KB of JSON and cost 0.6ms per call to stringify; `/api/locations` is
 * 57 KB and `/api/members` 46 KB. Holding the buffers costs ~470 KB of memory and removes both
 * the CPU and ~189 KB of garbage from every hit.
 */
const API_BODY = new Map(API_KEYS.map((k) => [k, Buffer.from(JSON.stringify(API[k]), 'utf8')]));

/**
 * 🔴 UNMATCHED `/api/` PATHS ARE A LOUD 501, AND THEY USED TO BE A CHEERFUL `200 []`.
 *
 * That default is the exact failure this whole family of tools is written against. A client that
 * renames an endpoint, or a stub table that drifts from the app, produced an EMPTY TABLE on a
 * page that rendered perfectly: it cleared `pageReady`, cleared the 8-element population floor,
 * and never overflowed — because an empty page is the most reliably non-overflowing page there
 * is. Every "0 overflow" in the phase rested on this default not having fired.
 *
 * It is also not hypothetical here: the sweep that found this was itself run against a build
 * whose tables were empty, and only the population canary caught it.
 *
 * So an unmatched path answers **501** and is COUNTED, and the count is printed at shutdown and
 * folded into the exit code — a drifted stub reddens a lane instead of producing a clean sweep of
 * empty tables.
 *
 * ⚠️ MATCHING IS STILL PREFIX-BASED, deliberately: the app calls `/api/members/42/banking` and
 * `/api/banks/branches/7`, so a strict exact-match table would need every id. What changed is
 * that a path matching NOTHING is an error rather than an empty array.
 */
const unmatched = new Map();

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const path = decodeURIComponent(url.pathname);

  if (path.startsWith('/api/')) {
    // The two writes the capture form's welcome letter needs, answered as the server does (MemberController): a saved
    // member comes back WITH its id, and `send-welcome` is an EMPTY 200 -- the shape A50 was about, so a measurement of
    // the "sent" state goes through the same read the application does. Nothing is stored: every save is id 9001.
    if (req.method === 'POST' && path === '/api/members') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ id: 9001 }));
      return;
    }
    if (req.method === 'POST' && /^\/api\/members\/\d+\/send-welcome$/.test(path)) {
      res.writeHead(200);
      res.end();
      return;
    }
    const acb = acbRunAnswer(req, path);
    if (acb) {
      res.writeHead(acb.status, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(acb.body));
      return;
    }
    const key = API_KEYS.find((k) => path.startsWith(k));
    if (!key) {
      // 🔴 LOGGED ON FIRST SIGHT, not only at shutdown. On Windows a measurement session ends
      // this process with a forced kill, which runs no SIGINT/SIGTERM handler — so a report
      // that only prints on the way out is a report that never prints. Once per distinct path,
      // so a route requested 400 times does not bury everything else.
      if (!unmatched.has(path)) console.error(`⚠ NO STUB: ${path} — answered 501`);
      unmatched.set(path, (unmatched.get(path) ?? 0) + 1);
      res.writeHead(501, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        error: 'no stub for this path',
        path,
        hint: 'add it to API in tools/serve-dist.mjs — an empty array here would measure as a '
          + 'page that renders fine and never overflows',
      }));
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(API_BODY.get(key));
    return;
  }

  const rel = normalize(path).replace(/^([/\\])+/, '');
  const file = join(ROOT, rel);
  // One stat, not `existsSync` followed by `statSync` — two syscalls for one question.
  if (rel && isFile(file)) {
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
    return;
  }

  // Everything else is a client route: the SPA shell.
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  createReadStream(join(ROOT, 'index.html')).pipe(res);
});

const drift = stubDrift();
if (drift.length) {
  console.error('⚠ the stub table has drifted from what the services call -- refusing to serve:');
  for (const line of drift) console.error(`    ${line}`);
  process.exit(1);
}

// 🔴 EXPLICITLY 127.0.0.1, NOT `localhost` AND NOT THE DEFAULT (T23).
server.listen(PORT, '127.0.0.1', () => {
  const { address, port } = server.address();
  console.log(`serving ${ROOT} on http://${address}:${port}  (api stubbed, synthetic data)`);
});

/**
 * On the way out, say what the app asked for that this server does not have.
 *
 * 🔑 A STUB THAT DRIFTED IS SILENT BY NATURE, so the report is the point. The 501s above make a
 * single request loud; this makes the RUN loud, because a measurement session ends by killing
 * this process and nobody reads a log they were not told to look at. Non-zero exit so a script
 * that starts the server, sweeps and stops it can tell.
 */
const reportUnmatched = () => {
  if (!unmatched.size) {
    console.log('every /api/ path the app requested had a stub.');
    process.exit(0);
  }
  console.error(`\n⚠ ${unmatched.size} /api/ path(s) had NO STUB and were answered 501:`);
  for (const [path, hits] of [...unmatched].sort((a, b) => b[1] - a[1])) {
    console.error(`    ${String(hits).padStart(4)} × ${path}`);
  }
  console.error(
    '  Whatever consumed those paths measured an EMPTY surface. Add them to API and re-run —\n'
    + '  an empty table renders perfectly, clears every readiness check, and never overflows.',
  );
  process.exit(1);
};

process.on('SIGINT', reportUnmatched);
process.on('SIGTERM', reportUnmatched);
