const PAGE_SIZE = 100;

// Generate mock members data. This can be replaced with a real API later.
const SearchMembersData = Array.from({ length: 420 }, (_, i) => {
  const id = i + 1;
  const banks = ["ABSA", "Standard Bank", "FNB", "Nedbank", "Capitec", "Investec"];
  const titles = ["Mr", "Ms", "Mrs", "Dr", "Miss", "Prof", "Rev", "Mx", "Sir"];
  const surnames = ["Ndlovu", "Naidoo", "Smith", "Mokoena", "Botha", "Khumalo", "Pillay", "Molefe"];
  const initials = ["TN", "BK", "AS", "DM", "RJ", "LP", "CG", "XZ"];
  const statuses = ["Active", "Pending", "Suspended", "Resigned"];

  const bankName = banks[id % banks.length];
  const surname = surnames[id % surnames.length];
  const init = initials[id % initials.length];
  const status = statuses[id % statuses.length];
  const title = titles[id % titles.length];
  const membershipNumber = `M-${String(100000 + id)}`;
  const employeeNumber = `EMP-${String(10000 + (id * 7) % 90000)}`;
  const idNumber = `${800101 + (id % 500)}${String(1000 + (id % 900)).padStart(4, "0")}0${id % 2}`;
  const bankAccountNumber = `${String(6000000000 + (id * 12345) % 3999999999)}`; // pseudo account no.

  return {
    id,
    memberId: id,
    membershipNumber,
    employeeNumber,
    title,
    initials: init,
    surname,
    idNumber,
    bankName,
    bankAccountNumber,
    status,
    joinDate: `20${10 + (id % 15)}-${String((id % 12) + 1).padStart(2, "0")}-${String((id % 28) + 1).padStart(2, "0")}`,
    email: `${init.toLowerCase()}.${surname.toLowerCase()}@${bankName.toLowerCase().replace(/\s+/g, "")}bank.co.za`,
    phone: `+27 82 ${String(1000000 + id).slice(-7)}`,
    branch: ["Central", "Midrand", "CBD", "Waterfront", "Umhlanga"][id % 5],
    address: `${10 + (id % 90)} Union Ave, ${bankName} ${id % 2 === 0 ? "Campus" : "House"}`,
  };
});

export const memberService = {
  getMembers: () => SearchMembersData,
  getPageSize: () => PAGE_SIZE,
};
