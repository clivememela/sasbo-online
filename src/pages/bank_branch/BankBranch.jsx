import { useMemo, useState, useEffect } from "react";
import { Printer } from "lucide-react";
import { bankService } from "../../services/bankService.js";
import { TextInput, SearchableSelect, Button } from "../../components/form";
import BankBranchModal from "./BankBranchModal.jsx";

const PAGE_SIZE = bankService.getPageSize();

export default function BankBranch() {
  const [banks, setBanks] = useState([]);
  useEffect(() => { bankService.getBanks().then(setBanks); }, []);
  const [filters, setFilters] = useState({
    bankName: "",
    branch: "",
    area: "",
    randomAccessNumber: "",
  });
  const [page, setPage] = useState(1);
  const [selectedBank, setSelectedBank] = useState(null);
  const [showAddBank, setShowAddBank] = useState(false);

  const filteredBanks = useMemo(() => {
    const bankNameQuery = filters.bankName.trim().toLowerCase();
    const branchQuery = filters.branch.trim().toLowerCase();
    const areaQuery = filters.area.trim().toLowerCase();
    const ranQuery = filters.randomAccessNumber.trim().toLowerCase();

    return banks.filter((bank) => {
      if (bankNameQuery && !bank.bankName?.toLowerCase().includes(bankNameQuery)) return false;
      if (branchQuery && !bank.branchName?.toLowerCase().includes(branchQuery)) return false;
      if (areaQuery && !bank.area?.toLowerCase().includes(areaQuery)) return false;
      return !(ranQuery && !bank.randomAccessNumber?.toLowerCase().includes(ranQuery));
    });
  }, [filters, banks]);

  const totalPages = Math.max(1, Math.ceil(filteredBanks.length / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredBanks.length);
  const visibleBanks = filteredBanks.slice(startIndex, endIndex);

  const handleInputChange = (field) => (event) => {
    setFilters((prev) => ({ ...prev, [field]: event.target.value }));
    setPage(1);
  };

  return (
    <div className="p-6 text-gray-900 dark:text-gray-100">
      <h2 className="text-3xl text-center mb-8 text-cyan-700 dark:text-cyan-400">Bank/Branch</h2>
      <p className="max-w-3xl mx-auto text-center text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
        Access, manage, and track Sasbo member records across South Africa's leading financial institutions and branch networks.
      </p>

      <div className="max-w-6xl mx-auto p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <SearchableSelect
            label="Bank Name"
            value={filters.bankName}
            onChange={handleInputChange("bankName")}
            placeholder="All Banks"
            options={[{ value: '', label: 'All Bank Branch' }, ...([...new Set(banks.map(b => b.bankName).filter(Boolean))].sort().map(b => ({ value: b, label: b })))]}
          />
          <TextInput
            label="Branch"
            value={filters.branch}
            onChange={handleInputChange("branch")}
            placeholder="Search branch"
          />
          <TextInput
            label="Area"
            value={filters.area}
            onChange={handleInputChange("area")}
            placeholder="Search area"
          />
          <TextInput
            label="Random Access Number"
            value={filters.randomAccessNumber}
            onChange={handleInputChange("randomAccessNumber")}
            placeholder="Search RAN"
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm no-print">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            Showing {filteredBanks.length === 0 ? 0 : startIndex + 1}-{endIndex} of {filteredBanks.length} banks
            {filteredBanks.length > 0 && (
              <button
                onClick={() => globalThis.print()}
                title="Print results"
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"
              >
                <Printer size={16} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={() => setShowAddBank(true)}>+ Add Bank/Branch</Button>
            <Button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              variant="pagination"
              className="rounded-full"
            >
              Prev
            </Button>
            <span className="text-gray-600 dark:text-gray-300">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              variant="pagination"
              className="rounded-full"
            >
              Next
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-transparent print-area">
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
                  <div>{bank.branchName}</div>
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
        <BankBranchModal
          selectedBank={selectedBank}
          onClose={() => setSelectedBank(null)}
          onUpdated={(updatedBank) => {
            setBanks((prev) => prev.map((bank) => (bank.id === updatedBank.id ? updatedBank : bank)));
            setSelectedBank(updatedBank);
          }}
        />
      )}

      {showAddBank && (
        <BankBranchModal
          onClose={() => setShowAddBank(false)}
          onCreated={(newBank) => { setBanks((prev) => [...prev, newBank]); setShowAddBank(false); }}
        />
      )}

    </div>
  );
}
