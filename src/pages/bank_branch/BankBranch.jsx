import { useMemo, useState, useEffect } from "react";
import { Printer } from "lucide-react";
import { bankService } from "../../services/bankService.js";
import { TextInput, SearchableSelect, Button } from "../../components/form";
import BankBranchModal from "./BankBranchModal.jsx";
import PageTitle from '../../components/common/PageTitle';
import Table from '../../components/table/Table.jsx';

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

  /**
   * 🔴 NINE COLUMNS, IN A `grid-cols-9`, WITH `<div onClick>` ROWS. The header was nine
   * `<div>`s with no relationship to the cells beneath them, so a screen-reader user got
   * eighty-one unlabelled values in a row; and opening a branch to edit it was mouse-only.
   *
   * 📱 R-RESP-K IS DOING REAL WORK HERE. Nine columns at 390px is roughly 40px each --
   * every value truncated to nothing. Two are essential and the other seven drop into the
   * row's detail panel, so a phone shows a usable list instead of a wall of ellipses.
   */
  const bankColumns = useMemo(() => [
    {
      key: 'bankName',
      header: 'Bank Name',
      priority: 'essential',
      truncate: true,
      cell: (bank) => (
        <button
          type="button"
          onClick={() => setSelectedBank(bank)}
          aria-label={`${bank.bankName || 'This bank'} \u2014 open the ${bank.branchName || 'branch'} record`}
          className="touch-target rounded-sm text-left font-medium text-brand-ink underline-offset-2 hover-hover:hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
        >
          {bank.bankName}
        </button>
      ),
    },
    { key: 'bankAbbreviation', header: 'Abbreviation', priority: 'essential', cell: (b) => b.bankAbbreviation || '\u2014' },
    { key: 'branchName', header: 'Branch', priority: 'secondary', truncate: true, cell: (b) => b.branchName || '\u2014' },
    { key: 'area', header: 'Area', priority: 'secondary', truncate: true, cell: (b) => b.area || '\u2014' },
    { key: 'randomAccessNumber', header: 'Random Access Number', priority: 'detail', cell: (b) => b.randomAccessNumber || '\u2014' },
    { key: 'phoneNumber', header: 'Phone', priority: 'detail', cell: (b) => b.phoneNumber || '\u2014' },
    { key: 'managerName', header: 'Manager', priority: 'detail', cell: (b) => b.managerName || '\u2014' },
    { key: 'fax', header: 'Fax', priority: 'detail', cell: (b) => b.fax || '\u2014' },
    { key: 'email', header: 'Email', priority: 'detail', truncate: true, cell: (b) => b.email || '\u2014' },
  ], []);

  return (
    <div className="p-6 text-ink">
      <PageTitle
        title="Bank/Branch"
        subtitle="Access, manage, and track Sasbo member records across South Africa's leading financial institutions and branch networks."
      />

      <div className="max-w-6xl mx-auto p-6 rounded-2xl shadow-lg bg-surface">
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
          <div className="flex items-center gap-2 text-ink-muted">
            Showing {filteredBanks.length === 0 ? 0 : startIndex + 1}-{endIndex} of {filteredBanks.length} banks
            {filteredBanks.length > 0 && (
              <button
                type="button"
                onClick={() => globalThis.print()}
                aria-label="Print this bank branch listing"
                className="touch-target p-1 rounded hover-hover:hover:bg-surface-2 text-ink-muted transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
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
            <span className="text-ink-muted">
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
          <Table
            caption="Bank branches"
            columns={bankColumns}
            rows={visibleBanks}
            rowKey="id"
            emptyTitle="No banks match your search."
            emptyMessage="Try a different bank name, branch or area."
            dense
          />
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
