import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import PageTitle from "../../components/common/PageTitle.jsx";
import { TextInput, Button } from "../../components/form";
import Modal from "../../components/overlay/Modal.jsx";
import { memberService } from "../../services/memberService.js";
import { validateSAID } from "../../utils/validateSAID.js";
import Table from '../../components/table/Table.jsx';
import StatusChip from '../../components/common/StatusChip.jsx';

export default function AcbDebits() {
    const [membersList, setMembersList] = useState([]);
    const [filters, setFilters] = useState({ surname: "", membershipNumber: "", identityNumber: "" });
    const [idError, setIdError] = useState(null);
    const [searched, setSearched] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [loadingId, setLoadingId] = useState(null);
    const [notice, setNotice] = useState(null);
    const noticeRef = useRef(null);
    useEffect(() => {
        if (notice) noticeRef.current?.focus();
    }, [notice]);
    const [confirmed, setConfirmed] = useState(false);

    // Edit modal state
    const [editing, setEditing] = useState(false);
    const [bankForm, setBankForm] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => { memberService.getMembers().then(setMembersList); }, []);

    const openEdit = () => {
        if (!selectedMember) return;
        setBankForm({
            bankName: selectedMember.bankName || "",
            branch: selectedMember.branch || "",
            bankAccountNumber: selectedMember.bankAccountNumber || "",
            ibtNo: selectedMember.ibtNo || "",
            bankAddress: selectedMember.bankAddress || "",
            workBankAddress: selectedMember.workBankAddress || "",
            paymentType: selectedMember.paymentType || "",
            debitDay: selectedMember.debitDay || "",
        });
        setEditing(true);
    };

    const handleBankChange = (field) => (e) => setBankForm(f => ({ ...f, [field]: e.target.value }));

    const saveBanking = async () => {
        if (!selectedMember) return;
        setSaving(true);
        try {
            const updated = await memberService.updateBanking(selectedMember.id, bankForm);
            setSelectedMember(updated);
            setEditing(false);
        } catch (err) {
            console.error(err);
            // 🔴 A BANKING CHANGE THAT FAILED, ANNOUNCED IN A DIALOG THE USER DISMISSES.
            // This screen writes a member's debit-order details; "Failed to update banking
            // details" arriving as a native modal, and leaving no trace once dismissed, is
            // the worst place in the application for that pattern.
            setNotice('Those banking details were not saved. Nothing was written \u2014 check the values and try again.');
        } finally {
            setSaving(false);
        }
    };

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

    // Stable, because `memberColumns` closes over it: a callback rebuilt every render
    // rebuilds the column list every render, which rebuilds every cell.
    const handleSelectMember = useCallback((m) => {
        if (selectedMember?.id === m.id) { setSelectedMember(null); setConfirmed(false); return; }
        setConfirmed(false);
        setLoadingId(m.id);
        memberService.getMemberById(m.id)
            .then(full => { setSelectedMember(full); })
            .catch(() => { setSelectedMember(m); })
            .finally(() => setLoadingId(null));
    }, [selectedMember]);

    /**
     * 🔴 THE ROW WAS A `<div onClick>` INSIDE A `grid-cols-5`. Selecting a member for an
     * ACB banking change -- which is what this screen exists to do -- was mouse-only: no
     * tab stop, no accessible name, no Enter. `Table` offers no `onRowClick` at all, so
     * the action is a real button on the membership number.
     *
     * 📱 R-RESP-K: five columns do not fit at 390px. ID number and bank drop into the
     * row's detail panel rather than being crushed or hidden.
     */
    const memberColumns = useMemo(() => [
        {
            key: 'membershipNumber',
            header: 'Membership No.',
            priority: 'essential',
            cell: (m) => (
                <button
                    type="button"
                    onClick={() => handleSelectMember(m)}
                    aria-pressed={selectedMember?.id === m.id}
                    aria-label={`${m.membershipNumber || 'This member'} \u2014 load banking details for ${[m.title, m.initials, m.surname].filter(Boolean).join(' ') || 'this member'}`}
                    className="touch-target inline-flex items-center gap-2 rounded-sm font-medium text-brand-ink underline-offset-2 hover-hover:hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
                >
                    {m.membershipNumber}
                    {loadingId === m.id && (
                        <span
                            role="status"
                            aria-label="Loading banking details"
                            className="inline-block size-3 animate-spin rounded-full border-2 border-brand border-t-transparent motion-reduce:animate-none"
                        />
                    )}
                </button>
            ),
        },
        {
            key: 'name',
            header: 'Name',
            priority: 'essential',
            truncate: true,
            cell: (m) => `${m.title ? `${m.title} ` : ''}${m.initials || ''} ${m.surname || ''}`.trim() || '\u2014',
        },
        { key: 'identityNumber', header: 'ID Number', priority: 'secondary', truncate: true, cell: (m) => m.identityNumber || '\u2014' },
        { key: 'bankName', header: 'Bank', priority: 'secondary', truncate: true, cell: (m) => m.bankName || '\u2014' },
        { key: 'status', header: 'Status', priority: 'essential', cell: (m) => <StatusChip status={m.status} /> },
    ], [loadingId, selectedMember, handleSelectMember]);

    return (
        <div className="p-6 text-ink">
            <PageTitle title="Manage Debits" subtitle="Capture Resubmission Debits" />

            {/* 🔴 WHAT THE `alert()` BECAME. Focused rather than `role="alert"`: the
                form primitives already give inline messages that role, and stacking a
                page-level live region on top is two announcements for one failure. */}
            {notice && (
                <div
                    ref={noticeRef}
                    tabIndex={-1}
                    aria-labelledby="acb-notice-title"
                    className="mx-auto mb-4 flex max-w-4xl items-start gap-2 rounded-lg border border-status-suspended-dot bg-status-suspended-bg p-3 text-sm text-status-suspended focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
                >
                    <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <p id="acb-notice-title" className="flex-1">{notice}</p>
                    <Button size="sm" variant="ghost" onClick={() => setNotice(null)}>Dismiss</Button>
                </div>
            )}

            <div className="max-w-4xl mx-auto">
                {/* Search */}
                <div className="p-6 rounded-2xl shadow-lg bg-surface">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted mb-4">Member Search</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <TextInput label="Surname" value={filters.surname} onChange={handleChange("surname")} placeholder="Search by surname" />
                        <TextInput label="Membership Number" value={filters.membershipNumber} onChange={handleChange("membershipNumber")} placeholder="Search by membership number" />
                        <div className="flex flex-col gap-1">
                            <TextInput label="Identity Number" value={filters.identityNumber} onChange={handleChange("identityNumber")} placeholder="Search by ID number" />
                            {idError && <p className="text-xs text-status-suspended">{idError}</p>}
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <Button variant="primary" onClick={handleSearch}>Search</Button>
                        <Button onClick={handleClear}>Clear</Button>
                    </div>
                </div>

                {/* Results */}
                {searched && (
                    <div className="mt-6 rounded-2xl shadow-lg bg-surface overflow-hidden">
                        <div className="px-6 py-3 border-b border-line text-sm text-ink-muted">
                            {results.length} member{results.length !== 1 ? "s" : ""} found
                        </div>
                        <Table
                            caption="Members matching the ACB search"
                            columns={memberColumns}
                            rows={results}
                            rowKey="id"
                            emptyTitle="No members match your search."
                            emptyMessage="Try a different membership or identity number."
                            dense
                        />
                    </div>
                )}

                {/* Banking Details & Confirmation */}
                {selectedMember && (
                    <div className="mt-4 rounded-2xl shadow-lg bg-surface overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Banking Details</p>
                                <p className="mt-0.5 font-semibold text-ink">
                                    {selectedMember.title ? `${selectedMember.title} ` : ""}{selectedMember.initials} {selectedMember.surname}
                                    <span className="ml-2 text-ink-muted font-normal text-sm">· {selectedMember.membershipNumber}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button onClick={openEdit}>Edit Details</Button>
                                <StatusChip status={selectedMember.status} />
                            </div>
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
                                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
                                    <p className="mt-0.5 font-semibold text-ink">{val || "-"}</p>
                                </div>
                            ))}
                        </div>

                        {/* Confirmation footer */}
                        <div className="px-6 py-4 border-t border-line bg-surface-2">
                            {confirmed ? (
                                <div className="flex items-center gap-2 text-status-active text-sm font-semibold">
                                    <CheckCircle2 size={18} />
                                    Banking details confirmed for {selectedMember.initials} {selectedMember.surname}
                                </div>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <p className="text-sm text-ink-muted flex-1">
                                        Please verify the banking details above are correct before confirming the re-debit.
                                    </p>
                                    <Button variant="primary" onClick={() => setConfirmed(true)}>Confirm Details</Button>
                                    <Button onClick={() => { setSelectedMember(null); setConfirmed(false); }}>Cancel</Button>
                                </div>
                            )}
                        </div>

                        {/* 🔴 `03.4`: was a bare `fixed inset-0` div -- not portalled, no focus
                            trap, no Escape, no scroll lock. Tab walked straight out of it into the
                            page behind. `Modal` brings all four, and the dvh height cap with them. */}
                        <Modal
                            open={editing}
                            onOpenChange={setEditing}
                            title="Update Banking Details"
                            size="lg"
                            footer={
                                <>
                                    <Button onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
                                    <Button variant="primary" onClick={saveBanking} loading={saving}>Update</Button>
                                </>
                            }
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <TextInput label="Bank" value={bankForm.bankName} onChange={handleBankChange('bankName')} />
                                        <TextInput label="Branch" value={bankForm.branch} onChange={handleBankChange('branch')} />
                                        <TextInput label="Account Number" value={bankForm.bankAccountNumber} onChange={handleBankChange('bankAccountNumber')} />
                                        <TextInput label="IBT No." value={bankForm.ibtNo} onChange={handleBankChange('ibtNo')} />
                                        <TextInput label="Payment Type" value={bankForm.paymentType} onChange={handleBankChange('paymentType')} />
                                        <TextInput label="Debit Day" value={bankForm.debitDay} onChange={handleBankChange('debitDay')} />
                                        <TextInput label="Bank Address" value={bankForm.bankAddress} onChange={handleBankChange('bankAddress')} />
                                <TextInput label="Work Bank Address" value={bankForm.workBankAddress} onChange={handleBankChange('workBankAddress')} />
                            </div>
                        </Modal>
                    </div>
                )}
            </div>
        </div>
    );
}