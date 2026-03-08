import { useMemo, useState } from "react";
import { bankService } from "../../services/bankService.js";

const PAGE_SIZE = bankService.getPageSize();
const SearchBanksData = bankService.getBanks();

export default function BankSearch() {
  const [filters, setFilters] = useState({
    bankName: "",
    branch: "",
    area: "",
    randomAccessNumber: "",
  });
  const [page, setPage] = useState(1);
  const [selectedBank, setSelectedBank] = useState(null);
  const [addressType, setAddressType] = useState("physical");
  const [showAbbrev, setShowAbbrev] = useState(false);
  const [showTableCode, setShowTableCode] = useState(false);

  const filteredBanks = useMemo(() => {
    const bankNameQuery = filters.bankName.trim().toLowerCase();
    const branchQuery = filters.branch.trim().toLowerCase();
    const areaQuery = filters.area.trim().toLowerCase();
    const ranQuery = filters.randomAccessNumber.trim().toLowerCase();

    return SearchBanksData.filter((bank) => {
      if (bankNameQuery && !bank.bankName.toLowerCase().includes(bankNameQuery)) return false;
      if (branchQuery && !bank.branch.toLowerCase().includes(branchQuery)) return false;
      if (areaQuery && !bank.area.toLowerCase().includes(areaQuery)) return false;
      return !(ranQuery && !bank.randomAccessNumber.toLowerCase().includes(ranQuery));

    });
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(filteredBanks.length / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredBanks.length);
  const visibleBanks = filteredBanks.slice(startIndex, endIndex);

  const handleInputChange = (field) => (event) => {
    setFilters((prev) => ({ ...prev, [field]: event.target.value }));
    setPage(1);
  };

  // Compute abbreviation-level aggregates for the selected bank
  const abbrevStats = useMemo(() => {
    if (!selectedBank) return null;
    const abbrev = selectedBank.bankAbbreviation;
    const all = SearchBanksData.filter(b => b.bankAbbreviation === abbrev);
    const sum = (arr, getter) => arr.reduce((acc, x) => acc + getter(x), 0);

    const staffComplement = sum(all, b => Number(b.branchStaffComplement || 0));
    const bankMembers = sum(all, b => Number(b.membersCount || 0));
    const newMembers = sum(all, b => Number(b.insertsCount || 0));
    const payrollValue = sum(all, b => Number(b.subsValueBranch || 0));
    const totalSubs = 0; // Not available in dataset
    const suspensions = 0; // Not available in dataset
    const deletedMembers = 0; // Not available in dataset
    const acbValue = 0; // Not available in dataset
    const acbMembers = 0; // Not available in dataset
    const groupNumber = new Set(all.map(b => b.branch)).size; // proxy: unique branches

    return {
      abbreviation: abbrev,
      staffComplement,
      bankMembers,
      suspensions,
      newMembers,
      totalSubs,
      payrollValue,
      deletedMembers,
      acbValue,
      acbMembers,
      groupNumber,
    };
  }, [selectedBank]);

  return (
    <div className="p-6 text-gray-900 dark:text-gray-100">
      <h2 className="text-3xl text-center mb-8 text-cyan-700 dark:text-cyan-400">
        Search Banks
      </h2>

      <div className="max-w-6xl mx-auto p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="flex flex-col gap-2 text-sm">
            Bank Name
            <input
              type="text"
              value={filters.bankName}
              onChange={handleInputChange("bankName")}
              placeholder="Search bank name"
              className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Branch
            <input
              type="text"
              value={filters.branch}
              onChange={handleInputChange("branch")}
              placeholder="Search branch"
              className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Area
            <input
              type="text"
              value={filters.area}
              onChange={handleInputChange("area")}
              placeholder="Search area"
              className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Random Access Number
            <input
              type="text"
              value={filters.randomAccessNumber}
              onChange={handleInputChange("randomAccessNumber")}
              placeholder="Search RAN"
              className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-gray-600 dark:text-gray-300">
            Showing {filteredBanks.length === 0 ? 0 : startIndex + 1}-{endIndex} of {filteredBanks.length} banks
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className={`px-3 py-1.5 rounded-full text-xs border transition ${
                page === 1
                  ? "cursor-not-allowed opacity-50"
                  : "border-gray-200 bg-white hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700"
              }`}
            >
              Prev
            </button>
            <span className="text-gray-600 dark:text-gray-300">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className={`px-3 py-1.5 rounded-full text-xs border transition ${
                page === totalPages
                  ? "cursor-not-allowed opacity-50"
                  : "border-gray-200 bg-white hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700"
              }`}
            >
              Next
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-transparent">
          <div className="grid grid-cols-9 gap-4 px-4 py-3 text-xs uppercase tracking-wide bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
            <div>Bank Name</div>
            <div>Abbreviation</div>
            <div>Branch</div>
            <div>Area</div>
            <div>Random Access Number</div>
            <div>Phone</div>
            <div>Manager</div>
            <div>Fax</div>
            <div>Email</div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {visibleBanks.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-600 dark:text-gray-300">
                No banks match your search.
              </div>
            ) : (
              visibleBanks.map((bank) => (
                <div
                  key={bank.id}
                  onClick={() => setSelectedBank(bank)}
                  className="grid grid-cols-9 gap-4 px-4 py-3 text-sm bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <div className="">{bank.bankName}</div>
                  <div className="font-semibold text-cyan-600 dark:text-cyan-400">{bank.bankAbbreviation}</div>
                  <div>{bank.branch}</div>
                  <div>{bank.area}</div>
                  <div>{bank.randomAccessNumber}</div>
                  <div>{bank.phoneNumber}</div>
                  <div>{bank.managerName}</div>
                  <div>{bank.fax}</div>
                  <div className="truncate" title={bank.email}>{bank.email}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedBank && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
              <h3 className="text-2xl font-bold text-cyan-700 dark:text-cyan-400 flex items-center gap-4">
                {showAbbrev
                  ? "Abbreviation Details"
                  : showTableCode
                    ? "Table Code Details"
                    : "Bank Details"}
                {selectedBank?.bankName && (
                  <span className="text-base font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">Bank Name</span>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 text-sm">
                      {selectedBank.bankName}
                    </span>
                  </span>
                )}
              </h3>
              <button
                onClick={() => { setSelectedBank(null); setShowAbbrev(false); setShowTableCode(false); }}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition text-gray-500 dark:text-gray-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {!showAbbrev && !showTableCode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* General Information */}
                <section className="space-y-6">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-500 border-l-4 border-cyan-600 pl-3">
                    General info
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">
                        Bank Abbreviation
                      </label>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{selectedBank.bankAbbreviation}</p>
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); setShowAbbrev(true); setShowTableCode(false); }}
                          className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors bg-cyan-50 dark:bg-cyan-900/30 px-2 py-1 rounded-md"
                        >
                          Click here to view Abbreviation Details
                        </a>
                      </div>
                    </div>
                    <DetailItem label="Branch" value={selectedBank.branch} />
                    <DetailItem label="Area" value={selectedBank.area} />
                    <DetailItem label="Random Access Number" value={selectedBank.randomAccessNumber} />
                    
                    <div className="pt-2">
                      <div className="flex items-center gap-2 mb-3 bg-gray-100 dark:bg-gray-900/50 p-1 rounded-lg w-fit border border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => setAddressType("physical")}
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${
                            addressType === "physical"
                              ? "bg-white dark:bg-gray-800 text-cyan-700 dark:text-cyan-400 shadow-sm"
                              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          }`}
                        >
                          Physical
                        </button>
                        <button
                          onClick={() => setAddressType("postal")}
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${
                            addressType === "postal"
                              ? "bg-white dark:bg-gray-800 text-cyan-700 dark:text-cyan-400 shadow-sm"
                              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          }`}
                        >
                          Postal
                        </button>
                      </div>
                      <DetailItem 
                        label={addressType === "physical" ? "Physical Address" : "Postal Address"} 
                        value={addressType === "physical" ? selectedBank.physicalAddress : selectedBank.postalAddress}
                        className="text-sm border-l-2 border-cyan-100 dark:border-cyan-900/50 pl-3 py-1"
                      />
                    </div>
                  </div>
                </section>

                {/* Contact & Management */}
                <section className="space-y-6">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-500 border-l-4 border-cyan-600 pl-3">
                    Contact & Management
                  </h4>
                  <div className="space-y-4">
                    <DetailItem label="Phone Number" value={selectedBank.phoneNumber} />
                    <DetailItem label="Fax" value={selectedBank.fax || "N/A"} />
                    <DetailItem label="Email" value={selectedBank.email} className="text-cyan-600 dark:text-cyan-400 break-all" />
                    <DetailItem label="Manager Name" value={selectedBank.managerName} />
                    <div className="grid grid-cols-2 gap-4 pt-2">
                       <DetailItem label="Reps" value={selectedBank.repsCount} size="sm" />
                       <DetailItem label="Members" value={selectedBank.membersCount} size="sm" />
                       <DetailItem label="Inserts" value={selectedBank.insertsCount} size="sm" />
                       <DetailItem label="Last Visited" value={selectedBank.lastVisitedDate} size="sm" />
                    </div>
                  </div>
                </section>

                {/* Operations & Codes */}
                <section className="space-y-6">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-500 border-l-4 border-cyan-600 pl-3">
                    Operations & Codes
                  </h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                       <DetailItem label="Staff Complement" value={selectedBank.branchStaffComplement} size="sm" />
                       <DetailItem label="Member Complement" value={selectedBank.branchMemberComplement} size="sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <DetailItem label="SASBO Area Code" value={selectedBank.sasboAreaCode} size="sm" />
                       <DetailItem label="Bulk Mail" value={selectedBank.bulkMail} size="sm" />
                    </div>
                    <DetailItem label="Province/Committee" value={`${selectedBank.provinceCommitteeCode} - ${selectedBank.provinceCommitteeName}`} />
                    <DetailItem label="Bank Department Code" value={selectedBank.bankDepartmentCode} />
                    <DetailItem label="Subs Value Branch" value={selectedBank.subsValueBranch} />
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">Table Code</label>
                      <div className="flex items-center gap-3">
                         <p className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{selectedBank.tableCode}</p>
                         <a
                           href="#"
                           onClick={(e) => { e.preventDefault(); setShowTableCode(true); setShowAbbrev(false); }}
                           className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors bg-cyan-50 dark:bg-cyan-900/30 px-2 py-1 rounded-md"
                         >
                           Click here to view Table Code Details
                         </a>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
              ) : showAbbrev ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">Abbreviation</p>
                      <p className="text-xl font-bold text-cyan-700 dark:text-cyan-400">{abbrevStats?.abbreviation}</p>
                    </div>
                    <button
                      onClick={() => setShowAbbrev(false)}
                      className="px-4 py-2 text-xs font-bold uppercase rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Back to Bank
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DetailItem label="Bank Compliment" value={abbrevStats?.staffComplement} />
                    <DetailItem label="Bank Members" value={abbrevStats?.bankMembers} />
                    <DetailItem label="Bank Suspensions" value={abbrevStats?.suspensions} />
                    <DetailItem label="Bank New Members" value={abbrevStats?.newMembers} />
                    <DetailItem label="Bank Total Subs" value={abbrevStats?.totalSubs} />
                    <DetailItem label="Payroll Value" value={abbrevStats?.payrollValue} />
                    <DetailItem label="Bank Deleted Members" value={abbrevStats?.deletedMembers} />
                    <DetailItem label="ACB Value" value={abbrevStats?.acbValue} />
                    <DetailItem label="ACB Members" value={abbrevStats?.acbMembers} />
                    <DetailItem label="Group Number" value={abbrevStats?.groupNumber} />
                  </div>
                  <div className="pt-2">
                    <label className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">
                      Key for Abbreviation Extract
                    </label>
                    <div className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                      {abbrevStats?.abbreviation}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">Table Code</p>
                      <p className="text-xl font-bold text-cyan-700 dark:text-cyan-400">{selectedBank.tableCode}</p>
                    </div>
                    <button
                      onClick={() => setShowTableCode(false)}
                      className="px-4 py-2 text-xs font-bold uppercase rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Back to Bank
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DetailItem label="From Clearing Code 1" value={1000} />
                    <DetailItem label="To Clearing Code 1" value={6066600} />
                    <DetailItem label="From Clearing Code 2" value={6096800} />
                    <DetailItem label="To Clearing Code 2" value={9999900} />
                    <DetailItem label="From Clearing Code 3" value={0} />
                    <DetailItem label="To Clearing Code 3" value={0} />
                    <DetailItem label="From Clearing Code 4" value={0} />
                    <DetailItem label="To Clearing Code 4" value={0} />
                    <DetailItem label="Status 1 Subs" value={0} />
                    <DetailItem label="Status 2 Subs" value={0} />
                    <DetailItem label="Status 3 Subs" value={0} />
                    <DetailItem label="Status 4 Subs" value={0} />
                    <DetailItem label="Status 5 Subs" value={0} />
                    <DetailItem label="Status 6 Subs" value={0} />
                    <DetailItem label="Status 7 Subs" value={0} />
                    <DetailItem label="Status 8 Subs" value={0} />
                    <DetailItem label="Status 9 Subs" value={0} />
                    <DetailItem label="Debit Order Debit Day" value={20} />
                    <DetailItem label="Core Bank (Y / N)" value={"Y"} />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end bg-gray-50/50 dark:bg-gray-900/50">
              <button
                onClick={() => { setSelectedBank(null); setShowAbbrev(false); setShowTableCode(false); }}
                className="px-8 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-all font-bold shadow-lg shadow-cyan-600/20 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, className = "", size = "md" }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">
        {label}
      </label>
      <p className={`font-semibold text-gray-800 dark:text-gray-200 ${size === "sm" ? "text-sm" : "text-lg"} ${className}`}>
        {value}
      </p>
    </div>
  );
}
