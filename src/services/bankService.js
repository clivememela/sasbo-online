const PAGE_SIZE = 100;

const SearchBanksData = Array.from({ length: 250 }, (_, index) => {
  const id = index + 1;
  const nameSeed = id % 5;
  const branchSeed = id % 7;
  const areaSeed = id % 6;
  const name = ["SASBO Bank", "Unity Trust", "Heritage Mutual", "Civic Bank", "Northern Savings"][nameSeed];
  const abbreviation = ["SB", "UT", "HM", "CB", "NS"][nameSeed];
  const branch = ["Central", "Riverside", "Hillcrest", "Lakeside", "Midtown", "West End", "East Gate"][branchSeed];
  const area = ["North Zone", "South Zone", "East Zone", "West Zone", "CBD", "Industrial Park"][areaSeed];
  const managerFirst = ["Aisha", "Brandon", "Carlos", "Dineo", "Elias", "Farah", "Grace"][id % 7];
  const managerLast = ["Ndlovu", "Patel", "Mokoena", "Smith", "Khumalo", "Naidoo", "Jacobs"][id % 7];

  return {
    id,
    bankName: name,
    bankAbbreviation: abbreviation,
    branch,
    area,
    randomAccessNumber: `RAN-${String(id).padStart(5, "0")}`,
    phoneNumber: `+27 11 555 ${String(1000 + id).slice(-4)}`,
    fax: `+27 11 556 ${String(2000 + id).slice(-4)}`,
    email: `branch${id}@${name.toLowerCase().replace(/\s+/g, "")}.co.za`,
    managerName: `${managerFirst} ${managerLast}`,
    physicalAddress: `${100 + id} Main Street, ${branch}, ${area}`,
    postalAddress: `P.O. Box ${5000 + id}, ${area}, 2000`,
    repsCount: id % 10 + 1,
    membersCount: (id % 50 + 10) * 5,
    insertsCount: (id % 20 + 5),
    branchStaffComplement: (id % 15 + 5) * 2,
    branchMemberComplement: (id % 10 + 5),
    lastVisitedDate: `2024-0${(id % 9) + 1}-15`,
    sasboAreaCode: id % 2 === 0 ? "Y" : "N",
    bulkMail: id % 3 === 0 ? "Y" : "N",
    provinceCommitteeCode: `PRV-${10 + (id % 5)}`,
    provinceCommitteeName: ["Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape", "Free State"][id % 5],
    bankDepartmentCode: `DEPT-${100 + (id % 10)}`,
    subsValueBranch: (id % 100 + 50) * 10,
    tableCode: (id % 50 + 1),
  };
});

export const bankService = {
  getBanks: () => SearchBanksData,
  getPageSize: () => PAGE_SIZE
};
