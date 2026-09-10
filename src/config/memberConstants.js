export const FREQUENCY_OPTIONS = ['Monthly', 'Quarterly', 'Bi-annually', 'Annually'];
export const TITLE_OPTIONS = ['Mr', 'Ms', 'Mrs', 'Dr', 'Prof'];
export const RACE_OPTIONS = ['African', 'White', 'Coloured', 'Indian', 'Other'];
export const PAYMENT_TYPE_OPTIONS = ['Debit Order', 'Payroll'];
export const STATUS_OPTIONS = ['Active', 'Pending', 'Suspended', 'Resigned', 'Retired'];
export const IDENTITY_TYPE_OPTIONS = ['I.D. Number', 'Passport Number'];
export const GENDER_OPTIONS = ['Male', 'Female'];
export const YES_NO_OPTIONS = ['Y', 'N'];
export const SUSPENSION_CODE_OPTIONS = ['', 'NON-PAY', 'RESIGN'];
export const EMPLOYMENT_TYPE_OPTIONS = ['Permanent', 'Contract'];
// Job grades are now provided by the backend per-bank. Keep an empty default here so
// the front-end does not hard-code values. Components will fetch populated values
// from the API at runtime and fall back to this array only when necessary.
export const JOB_GRADE_OPTIONS = [];
export const MANAGER_OPTIONS = ['MGR-001'];
export const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
export const YEAR_OPTIONS = Array.from({ length: 21 }, (_, i) => (new Date().getFullYear() - 10 + i).toString());

export const BEC_STRUCTURE_OPTIONS = ['Shop Stewart', 'Branch Executive Committee'];

export const BRANCH_OPTIONS = [
  'Cape Town', 'Durban', 'Head Office', 'Johannesburg', 'Johannesburg Branch', 'Midrand', 'Pretoria',
  'Representative Office', 'Rivonia', 'Rosebank', 'Sandton', 'South Africa Branch', 'Soweto', 'Stellenbosch',
];

export const REP_OPTIONS = [
  'Self', 'System', 'Achmat Adams', 'Alvaro Legoinha', 'Amanda Hlatshwayo', 'Amol Prabhu', 'Annerie Visser',
  'Ashley Cameron', 'Ashutosh Kumar', 'Benjamin Davis', 'Bob Jones', 'Chaoyang Zhang', 'Charles van Staden',
  'Cheslyn Jacobs', 'Cumesh Moodliar', 'Dale Wood', 'David Hodnett', 'David Kasinamunda', 'Dean Radbourne',
  'Graham Lee', 'Hannah Sadiki', 'Hanri Maritz', 'Hylton Kallner', 'J Wang', 'John Doe', 'Jonathan Fincham',
  'Karen Black', 'Kathryn Quayle', 'Kennedy Bungane', 'Kenny Fihla', 'Li Li', 'Lungisa Fuzile', 'M Luo',
  'Mark Selcraig', 'Mark Sherratt', 'Marna Sabrina Pfranger', 'Mary Vilakazi', 'Mauro Rogerio', 'Michael Shirley',
  'Micheal Sassoon', 'Nathalie Villette Py', 'Nthabeleng Likotsi', 'Paul Sayers', 'Peter Liu', 'Peter Taylor',
  'Phibeon Mutibura', 'Ramiro Sebastiao', 'Raphael Marlio-Marette', 'Saloshni Pillay', 'Sandile Shabalala',
  'Shabir Chohan', 'Shugo Suzuki', 'Shyamasish Acharya', 'Sidhambaram Perumal Pillay', 'Simon Denny',
  'Stefano Rausch', 'Thorsten Metz', 'Tinus Myburgh', 'Tsakani Clarence Nethengwe', 'Veronica Padi',
  'Viviana van Agtmaal', 'Yatin Narsai', 'Yongzhi Ban', 'Yvonne Holenstein',
];

/*
 * THE FIVE SECTIONS OF A MEMBER'S RECORD, and the words for them.
 *
 * 🔴 THE LABELS ARE SHORT BECAUSE ONE OF THE TWO SCREENS THAT SHOWS THEM IS A 400px COLUMN.
 * Docked, the record panel is at most 448px wide, and "Personal Information · Employment &
 * Bank · Membership & Subscriptions · Recruitment Channel · Sasbo Structures" is 762px of
 * tabs -- so the strip wrapped to three rows, and when it was made to scroll instead it cut
 * a word in half, which the owner saw and called wrong (2026-09-10). Each label is now the
 * noun that matters; the qualifier was doing no work the fields under the tab do not do.
 * `full` keeps the long form as the control's `title`.
 *
 * 🔑 AND THERE IS ONE LIST, NOT TWO. `Members.jsx` carried its own copy of this array, so
 * the register's record and the capture form could name the same five sections differently
 * and nothing would notice. They read the same list now.
 */
export const MEMBER_TABS = [
  { id: 'personal', label: 'Personal', full: 'Personal Information' },
  { id: 'employment', label: 'Employment', full: 'Employment & Bank' },
  { id: 'membership', label: 'Membership', full: 'Membership & Subscriptions' },
  { id: 'representatives', label: 'Recruitment', full: 'Recruitment Channel' },
  { id: 'structures', label: 'Structures', full: 'Sasbo Structures' },
  // { id: 'history', label: 'History', full: 'History & Remarks' },
];

export const DEBIT_DAY_OPTIONS = ['20', '25', '31'];

export const MEMBER_FIELD_LABEL_MAP = {
  title: 'Title',
  initials: 'Initials',
  firstNames: 'First Names',
  surname: 'Surname',
  identityNumber: 'I.D. Number',
  dateOfBirth: 'Date of Birth',
  gender: 'Gender',
  race: 'Race',
  email: 'Email Address',
  phone: 'Cell Tel',
  cellTel: 'Cell Tel',
  workTel: 'Work Tel',
  homeTel: 'Home Tel',
  address: 'Address',
  joinDate: 'Date Joined',
  status: 'Status',
  monthlySubscription: 'Monthly Sasbo Subscription',
  subscriptionFrequency: 'Frequency of Sasbo Subscription',
  endowmentSubs: 'Endowment Fund Subs',
  endowmentFrequency: 'Frequency of Endowment Fund',
  endowmentPolicyNo: 'Endowment Fund Policy Number',
  lastMonthBalance: 'Last Months Balance',
  currentBalance: 'Current Balance',
  arrearsBalance: 'Arrears Balance',
  dateLastChanged: 'Date Last Changed',
  employeeNumber: 'Employee Number',
  jobGrade: 'Job Grade',
  bankName: 'Bank Where Member Is Employed',
  bankAccountNumber: 'Bank Account Number',
  branch: 'Bank Branch Where Member Works',
  ibtNo: 'IBT No.',
  paymentType: 'Payment Type',
  debitDay: 'Day to be debited',
  bankAddress: 'Bank Address',
  workBankAddress: 'Work Bank Address',
  recruitmentRep: 'Recruitment Rep',
  areasRep: "Area's Rep",
  recruitmentChannel: 'Recruitment Channel',
  repElectionDay: 'Sasbo Rep Election Day',
  repElectionMonth: 'Sasbo Rep Election Month',
  repElectionYear: 'Sasbo Rep Election Year',
  electedRep: 'Elected Sasbo Recruiter (Y/N)',
  remarks: 'Remarks / Comments',
  remarks2: '2nd Remarks Field',
  remarks3: '3rd Remarks Field',
  remarks4: '4th Remarks Field',
  memnetMember: 'MEMNET Member (Y/N)',
  printLabelForPostage: 'Print Label for Postage (Y/N)',
  suspensionCode: 'Suspension Code',
  useAltAddress: 'Use Alternate Address (Y/N)',
  deductACB: 'Deduct Subs through ACB (Y/N)',
  printMembershipCards: 'Print Membership Cards (Y/N)',
  homeLoanReducedRateOption: 'Home Loan Reduced Interest Rate Option (Y/N)',
  isRepresentative: 'Is Representative',
  roleId: 'Representative Role',
  structureId: 'Union Structure / Position',
  electionDate: 'Election Date',
};
