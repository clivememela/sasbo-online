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
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

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

const API = {
  '/api/members': members,
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
  '/api/roles': [{ id: 1, name: 'Lead Recruiter' }, { id: 2, name: 'Standard Recruiter' }],
  '/api/structures': [{ id: 1, name: 'INC / IC', parentId: null, children: [] }],
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
  '/api/locations': bankRows.slice(0, 6).map((b) => ({ ...b, members: members.slice(0, 12) })),
};

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const path = decodeURIComponent(url.pathname);

  if (path.startsWith('/api/')) {
    // Longest match first, so `/api/banks/branches` beats `/api/banks`.
    const key = Object.keys(API).sort((a, b) => b.length - a.length).find((k) => path.startsWith(k));
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(key ? API[key] : []));
    return;
  }

  const rel = normalize(path).replace(/^([/\\])+/, '');
  const file = join(ROOT, rel);
  if (rel && existsSync(file) && statSync(file).isFile()) {
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
    return;
  }

  // Everything else is a client route: the SPA shell.
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  createReadStream(join(ROOT, 'index.html')).pipe(res);
});

// 🔴 EXPLICITLY 127.0.0.1, NOT `localhost` AND NOT THE DEFAULT (T23).
server.listen(PORT, '127.0.0.1', () => {
  const { address, port } = server.address();
  console.log(`serving ${ROOT} on http://${address}:${port}  (api stubbed, synthetic data)`);
});
