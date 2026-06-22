import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { bankService } from "../../services/bankService.js";
import { TextInput, Button } from "../../components/form";

const PAGE_SIZE = bankService.getPageSize();

export default function BankListing() {
  const [banks, setBanks] = useState([]);
  const [filters, setFilters] = useState({
    bankName: "",
    abbreviation: "",
    universalBranchCode: "",
  });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizeBankResponse = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.content)) return payload.content;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  };

  useEffect(() => {
    setIsLoading(true);
    setError("");

    bankService
      .getBankListing()
      .then((data) => {
        setBanks(normalizeBankResponse(data));
      })
      .catch(() => {
        setError("Unable to load bank listing at the moment.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const listingRows = useMemo(() => {
    return banks.map((bank) => ({
      id: bank.id,
      bankName: bank.bankName ?? bank.name ?? "-",
      abbreviation: bank.bankAbbreviation ?? bank.abbreviation ?? "-",
      universalBranchCode:
        bank.universalBranchCode
        ?? bank.universal_branch_code
        ?? bank.bank?.universalBranchCode
        ?? bank.bank?.universal_branch_code
        ?? "-",
    }));
  }, [banks]);

  const filteredRows = useMemo(() => {
    const bankNameQuery = filters.bankName.trim().toLowerCase();
    const abbreviationQuery = filters.abbreviation.trim().toLowerCase();
    const branchCodeQuery = filters.universalBranchCode.trim().toLowerCase();

    return listingRows.filter((bank) => {
      if (bankNameQuery && !bank.bankName.toLowerCase().includes(bankNameQuery)) return false;
      if (abbreviationQuery && !bank.abbreviation.toLowerCase().includes(abbreviationQuery)) return false;
      return !(branchCodeQuery && !bank.universalBranchCode.toLowerCase().includes(branchCodeQuery));
    });
  }, [filters, listingRows]);

  const handleInputChange = (field) => (event) => {
    setFilters((prev) => ({ ...prev, [field]: event.target.value }));
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredRows.length);
  const visibleRows = filteredRows.slice(startIndex, endIndex);

  return (
    <div className="p-6 text-gray-900 dark:text-gray-100">
      <h2 className="text-3xl text-center mb-8 text-cyan-700 dark:text-cyan-400">Bank Listing</h2>
      <p className="max-w-3xl mx-auto text-center text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
        Comprehensive listing of all banks with abbreviations and universal branch codes for reference.
      </p>

      <div className="max-w-6xl mx-auto p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end no-print">
          <TextInput
            label="Bank Name"
            value={filters.bankName}
            onChange={handleInputChange("bankName")}
            placeholder="Search bank name"
          />
          <TextInput
            label="Abbreviation"
            value={filters.abbreviation}
            onChange={handleInputChange("abbreviation")}
            placeholder="Search abbreviation"
          />
          <TextInput
            label="Universal Branch Code"
            value={filters.universalBranchCode}
            onChange={handleInputChange("universalBranchCode")}
            placeholder="Search branch code"
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm no-print">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            Showing {filteredRows.length === 0 ? 0 : startIndex + 1}-{endIndex} of {filteredRows.length} banks
            {filteredRows.length > 0 && (
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
            <Button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage === 1 || isLoading || filteredRows.length === 0}
              variant="pagination"
              className="rounded-full"
            >
              Prev
            </Button>
            <span className="text-gray-600 dark:text-gray-300">
              Page {safePage} of {totalPages}
            </span>
            <Button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safePage === totalPages || isLoading || filteredRows.length === 0}
              variant="pagination"
              className="rounded-full"
            >
              Next
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-transparent print-area">
          <div className="grid grid-cols-3 gap-4 px-4 py-3 text-xs uppercase tracking-wide bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
            <div>Bank Name</div>
            <div>Abbreviation</div>
            <div>Universal Branch Code</div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              <div className="px-4 py-6 text-sm text-gray-600 dark:text-gray-300">Loading banks...</div>
            ) : error ? (
              <div className="px-4 py-6 text-sm text-red-600 dark:text-red-400">{error}</div>
            ) : visibleRows.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-600 dark:text-gray-300">No banks found.</div>
            ) : (
              visibleRows.map((bank) => (
                <div
                  key={bank.id}
                  className="grid grid-cols-3 gap-4 px-4 py-3 text-sm bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                >
                  <div>{bank.bankName}</div>
                  <div className="font-semibold text-cyan-600 dark:text-cyan-400">{bank.abbreviation}</div>
                  <div>{bank.universalBranchCode}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}