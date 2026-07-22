import { useState, useMemo, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import PageTitle from "../../components/common/PageTitle.jsx";
import { TextInput, Button } from "../../components/form";
import { memberService } from "../../services/memberService.js";
import { validateSAID } from "../../utils/validateSAID.js";

export default function ACBDebits() {
    const [membersList, setMembersList] = useState([]);
    const [filters, setFilters] = useState({ surname: "", membershipNumber: "", identityNumber: "" });
    const [idError, setIdError] = useState(null);
    const [searched, setSearched] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [loadingId, setLoadingId] = useState(null);
    const [confirmed, setConfirmed] = useState(false);

    useEffect(() => { memberService.getMembers().then(setMembersList); }, []);

    const results = useMemo(() => {
        if (!searched) return [];
        const s = filters.surname.trim().toLowerCase();
        const m = filters.membershipNumber.trim().toLowerCase();
        const id = filters.identityNumber.trim().toLowerCase();
        if (!s && !m && !id) return [];
        return membersList.filter(mem =>
            (!s || mem.surname.toLowerCase().includes(s)) &&
            (!m || mem.membershipNumber.toLowerCase().includes(m)) &&
            (!id || mem.identityNumber.toLowerCase().includes(id))
        );
    }, [searched, filters, membersList]);

    const handleSearch = () => { if (!idError) setSearched(true); };
    const handleClear = () => {
        setFilters({ surname: "", membershipNumber: "", identityNumber: "" });
        setIdError(null); setSearched(false); setSelectedMember(null); setConfirmed(false);
    };
    const handleChange = (field) => (e) => {
        const val = e.target.value;
        setFilters(p => ({ ...p, [field]: val }));
        setSearched(false);
        if (field === "identityNumber") setIdError(val ? validateSAID(val) : null);
    };

    const handleSelectMember = (m) => {
        if (selectedMember?.id === m.id) { setSelectedMember(null); setConfirmed(false); return; }
        setConfirmed(false);
        setLoadingId(m.id);
        memberService.getMemberById(m.id)
            .then(full => { setSelectedMember(full); })
            .catch(() => { setSelectedMember(m); })
            .finally(() => setLoadingId(null));
    };

    const statusBadge = (status) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            status === "Active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
            : status === "Pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            : status === "Suspended" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            : "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300"
        }`}>{status}</span>
    );

    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <PageTitle title="Manage Re-Debits" subtitle="Capture Resubmission Debits" />

            <div className="max-w-4xl mx-auto">
                {/* Search */}
                <div className="p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-4">Member Search</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <TextInput label="Surname" value={filters.surname} onChange={handleChange("surname")} placeholder="Search by surname" />
                        <TextInput label="Membership Number" value={filters.membershipNumber} onChange={handleChange("membershipNumber")} placeholder="Search by membership number" />
                        <div className="flex flex-col gap-1">
                            <TextInput label="Identity Number" value={filters.identityNumber} onChange={handleChange("identityNumber")} placeholder="Search by ID number" />
                            {idError && <p className="text-xs text-red-500 dark:text-red-400">{idError}</p>}
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <Button variant="primary" onClick={handleSearch}>Search</Button>
                        <Button onClick={handleClear}>Clear</Button>
                    </div>
                </div>

                {/* Results */}
                {searched && (
                    <div className="mt-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800 overflow-hidden">
                        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                            {results.length} member{results.length !== 1 ? "s" : ""} found
                        </div>
                        {results.length === 0 ? (
                            <p className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">No members match your search.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <div className="grid grid-cols-5 gap-4 px-6 py-3 text-xs uppercase tracking-wide bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                                    <div>Membership No.</div>
                                    <div>Name</div>
                                    <div>ID Number</div>
                                    <div>Bank</div>
                                    <div>Status</div>
                                </div>
                                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {results.map(m => (
                                        <div
                                            key={m.id}
                                            onClick={() => handleSelectMember(m)}
                                            className={`grid grid-cols-5 gap-4 px-6 py-3 text-sm cursor-pointer transition ${
                                                selectedMember?.id === m.id
                                                    ? "bg-cyan-50 dark:bg-cyan-900/20"
                                                    : "hover:bg-gray-50 dark:hover:bg-gray-700"
                                            }`}
                                        >
                                            <div className="font-medium flex items-center gap-2">
                                                {m.membershipNumber}
                                                {loadingId === m.id && (
                                                    <span className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin inline-block" />
                                                )}
                                            </div>
                                            <div className="truncate">{m.title ? `${m.title} ` : ""}{m.initials} {m.surname}</div>
                                            <div className="truncate">{m.identityNumber}</div>
                                            <div className="truncate">{m.bankName}</div>
                                            <div>{statusBadge(m.status)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Banking Details & Confirmation */}
                {selectedMember && (
                    <div className="mt-4 rounded-2xl shadow-lg bg-white dark:bg-gray-800 overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Banking Details</p>
                                <p className="mt-0.5 font-semibold text-gray-900 dark:text-gray-100">
                                    {selectedMember.title ? `${selectedMember.title} ` : ""}{selectedMember.initials} {selectedMember.surname}
                                    <span className="ml-2 text-gray-400 font-normal text-sm">· {selectedMember.membershipNumber}</span>
                                </p>
                            </div>
                            {statusBadge(selectedMember.status)}
                        </div>

                        {/* Details grid */}
                        <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-3 gap-5 text-sm">
                            {[
                                ["Bank", selectedMember.bankName],
                                ["Branch", selectedMember.branch],
                                ["Bank Account Number", selectedMember.bankAccountNumber],
                                ["IBT No.", selectedMember.ibtNo],
                                ["Payment Type", selectedMember.paymentType],
                                ["Debit Day", selectedMember.debitDay],
                                ["Monthly Subscription", selectedMember.monthlySubscription ? `R ${selectedMember.monthlySubscription}` : null],
                                ["Subscription Frequency", selectedMember.subscriptionFrequency],
                                ["Deduct via ACB", selectedMember.deductACB],
                            ].map(([label, val]) => (
                                <div key={label}>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
                                    <p className="mt-0.5 font-semibold text-gray-800 dark:text-gray-200">{val || "-"}</p>
                                </div>
                            ))}
                        </div>

                        {/* Confirmation footer */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                            {confirmed ? (
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-semibold">
                                    <CheckCircle2 size={18} />
                                    Banking details confirmed for {selectedMember.initials} {selectedMember.surname}
                                </div>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                                        Please verify the banking details above are correct before confirming the re-debit.
                                    </p>
                                    <Button variant="primary" onClick={() => setConfirmed(true)}>Confirm Details</Button>
                                    <Button onClick={() => { setSelectedMember(null); setConfirmed(false); }}>Cancel</Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}