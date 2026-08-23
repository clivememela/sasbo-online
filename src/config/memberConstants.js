export const FREQUENCY_OPTIONS = ['Monthly', 'Quarterly', 'Bi-annually', 'Annually'];
export const TITLE_OPTIONS = ['Mr', 'Ms', 'Mrs', 'Dr', 'Prof'];
export const RACE_OPTIONS = ['African', 'White', 'Coloured', 'Indian', 'Other'];
export const PAYMENT_TYPE_OPTIONS = ['Debit Order', 'Payroll Deduction'];
export const STATUS_OPTIONS = ['Active', 'Pending', 'Suspended', 'Resigned', 'Retired'];
export const IDENTITY_TYPE_OPTIONS = ['I.D. Number', 'Passport Number'];
export const YES_NO_OPTIONS = ['Y', 'N'];
export const SUSPENSION_CODE_OPTIONS = ['', 'NON-PAY', 'RESIGN'];
export const JOB_GRADE_OPTIONS = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
export const MANAGER_OPTIONS = ['MGR-001'];
export const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
export const YEAR_OPTIONS = Array.from({ length: 21 }, (_, i) => (new Date().getFullYear() - 10 + i).toString());

export const BANK_OPTIONS = [
  'Absa Bank', 'Absa Bank Limited', 'Access Bank (South Africa) Limited', 'AfrAsia Bank Limited', 'African Bank Limited',
  'Albaraka Bank Limited', 'Banco Internacional de Credito', 'Bank Julius Baer & Co. Ltd', 'Bank Lombard Odier & Co Limited',
  'Bank Of China Limited', 'Bank Of Communication Co., Ltd', 'Bank Vontobel AG', 'Bank Zero Mutual Bank', 'Bank of America N.A.',
  'Bank of Taiwan', 'Banque SYZ SA', 'Barclays Bank PLC', 'Bidvest Bank Limited', 'CBZ Bank Limited', 'Caixa Geral de Depositos',
  'CaixaBank', 'Capital International Bank Limited', 'Capitec Bank', 'Capitec Bank Limited', 'China Construction Bank Corporation',
  'Citibank', 'Commerzbank AG', 'Deutsche Bank (Suisse) SA', 'Deutsche Bank AG', 'Discovery Bank Limited',
  'Ditsobotla Primary Savings and Credit Co-operative Bank', 'Doha Bank', 'Ecobank', 'Export Import Bank of India',
  'First National Bank', 'FirstRand Limited', 'GBS Mutual Bank', 'GIG Co-operative Bank', 'GoTyme Bank Limited',
  'Goldman Sachs International Bank', 'HBZ Bank Limited', 'HSBC Bank Plc', 'Industrial and Commercial Bank of China',
  'Investec Bank', 'Investec Bank Limited', 'KSK Kooperatiewe Bank Beperk', 'KfW IPEX-Bank GmbH', 'Macquarie Bank Limited',
  'Metbank Limited', 'Mitsubishi UFJ Financial Group Bank, Ltd.', 'Mizuho Bank Ltd', 'Nedbank', 'OM Bank Limited',
  'OSK Kooperatiewe Bank Beperk', 'Sasfin Bank Limited', 'Societe Generale', 'Standard Bank', 'Standard Bank South Africa',
  'State Bank of India', 'Sumitomo Mitsui Banking', 'The Export & Import Bank of China', 'The Mauritius Commercial Bank Limited',
  'The Standard Bank of South Africa Limited', 'Ubank (under curatorship)', 'Union Bancaire Privee, UBP SA',
  'Ziphakamise Savings and Credit Co-operative Bank', 'eNL Mutual Bank',
];

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

export const MEMBER_TABS = [
  { id: 'personal', label: 'Personal Information' },
  { id: 'employment', label: 'Employment & Bank' },
  { id: 'membership', label: 'Membership & Subscriptions' },
  { id: 'representatives', label: 'Recruitment Channel' },
  { id: 'history', label: 'History & Remarks' },
];

export const MEMBER_FIELD_LABEL_MAP = {
  title: 'Title',
  initials: 'Initials',
  firstNames: 'First Names',
  surname: 'Surname',
  identityNumber: 'I.D. Number',
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
  workIbtNo: 'Work IBT No.',
  paymentType: 'Payment Type',
  debitDay: 'Day to be debited',
  bankAddress: 'Bank Address',
  workBankAddress: 'Work Bank Address',
  recruitmentRep: 'Recruitment Rep',
  areasRep: "Area's Rep",
  repElectionDay: 'Sasbo Rep Election Day',
  repElectionMonth: 'Sasbo Rep Election Month',
  repElectionYear: 'Sasbo Rep Election Year',
  electedRep: 'Elected Sasbo Representative (Y/N)',
  remarks: 'Remarks / Comments',
  remarks2: '2nd Remarks Field',
  remarks3: '3rd Remarks Field',
  remarks4: '4th Remarks Field',
  managersCode: 'Managers Code',
  memnetMember: 'MEMNET Member (Y/N)',
  printLabelForPostage: 'Print Label for Postage (Y/N)',
  suspensionCode: 'Suspension Code',
  useAltAddress: 'Use Alternate Address (Y/N)',
  deductACB: 'Deduct Subs through ACB (Y/N)',
  printMembershipCards: 'Print Membership Cards (Y/N)',
  homeLoanReducedRateOption: 'Home Loan Reduced Interest Rate Option (Y/N)',
};
