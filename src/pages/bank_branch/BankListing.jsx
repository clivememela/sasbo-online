import { useCallback, useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { bankService } from "../../services/bankService.js";
import { TextInput, Button } from "../../components/form";
import PageTitle from '../../components/common/PageTitle';
import Criteria, { CRITERION, CRITERION_WIDE } from '../../components/common/Criteria.jsx';
import Pager from '../../components/common/Pager.jsx';
import Sheet, { Page } from '../../components/common/Sheet.jsx';
import Table from "../../components/table/Table.jsx";

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

  // Named, so the table's retry can re-run exactly what the mount ran. An error state
  // whose button cannot repeat the request is an error state with a dead end in it.
  const loadBanks = useCallback(() => {
    setIsLoading(true);
    setError("");

    return bankService
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

  useEffect(() => {
    loadBanks();
  }, [loadBanks]);

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

  const bankColumns = useMemo(() => [
    { key: 'bankName', header: 'Bank Name', priority: 'essential', truncate: true, cell: (b) => b.bankName || '\u2014' },
    {
      key: 'abbreviation',
      header: 'Abbreviation',
      priority: 'essential',
      cell: (b) => <span className="font-semibold text-brand-ink">{b.abbreviation || '\u2014'}</span>,
    },
    { key: 'universalBranchCode', header: 'Universal Branch Code', priority: 'essential', cell: (b) => b.universalBranchCode || '\u2014' },
  ], []);

  return (
    <Page>
      <PageTitle
        title="Bank Listing"
        subtitle="Every bank, with its abbreviation and universal branch code, for reference."
        actions={
          <Button onClick={() => globalThis.print()} title="Print the listing, or save it as a PDF">
            <Printer size={16} strokeWidth={1.75} aria-hidden="true" /> Print
          </Button>
        }
      />

      <Criteria className="mt-5">
        <TextInput
          className={CRITERION_WIDE}
          label="Bank"
          value={filters.bankName}
          onChange={handleInputChange("bankName")}
          placeholder="Any"
        />
        <TextInput
          className={CRITERION}
          label="Abbreviation"
          value={filters.abbreviation}
          onChange={handleInputChange("abbreviation")}
          placeholder="Any"
        />
        <TextInput
          className={CRITERION}
          label="Universal branch code"
          kind="identifier"
          value={filters.universalBranchCode}
          onChange={handleInputChange("universalBranchCode")}
          placeholder="Any"
        />
      </Criteria>

      <Sheet className="mt-4">
        {/* 🔴 A `grid-cols-3` PSEUDO-TABLE, AND THE LAST OF THE SEVEN run 7 counted.
            Its header was three `<div>`s with no relationship to the cells beneath, so a
            screen-reader user met a stream of values with no column names -- and this is a
            reference table whose entire job is "which code belongs to which bank".

            🔑 IT ALREADY HAD ALL THREE STATES, hand-rolled, and they were CORRECT --
            loading, error and empty as separate branches with error never rendering as
            empty. That is rarer than it sounds (A27 is the same page one module over
            getting it wrong), so this is not a fix, it is the same three states expressed
            through the primitive that now owns them. The retry is new: the hand-rolled
            error branch printed the message and offered no way out. */}
        <div className="print-area">
          <Table
            caption="Banks, with their abbreviations and universal branch codes"
            columns={bankColumns}
            rows={visibleRows}
            rowKey="id"
            loading={isLoading}
            error={error || null}
            onRetry={loadBanks}
            emptyTitle="No banks match these criteria"
            emptyMessage="Try a different bank name, abbreviation or branch code."
          />
        </div>
        <Pager
          page={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
          count={filteredRows.length}
          error={Boolean(error)}
          start={startIndex + 1}
          end={endIndex}
          noun="banks"
          loading={isLoading}
        />
      </Sheet>
    </Page>
  );
}