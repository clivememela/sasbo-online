import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, Search } from "lucide-react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Criteria, { CRITERION, CRITERION_WIDE } from "../../components/common/Criteria.jsx";
import { TextInput, Button } from "../../components/form";
import Modal from "../../components/overlay/Modal.jsx";
import { memberService } from "../../services/memberService.js";
import { validateSAID } from "../../utils/validateSAID.js";
import Table from '../../components/table/Table.jsx';
import Sheet, { Page } from '../../components/common/Sheet.jsx';
import StatusChip from '../../components/common/StatusChip.jsx';
import reportError from '../../lib/reportError.js';
import { formalName } from '../../lib/names.js';
import DialogNotice from '../../components/common/DialogNotice.jsx';
import { messageOf, writeMayHaveLanded } from '../../services/parseApiError.js';

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
    // A failed update is said in the dialog, which stays open on a failure (R4-F1): the page notice renders under its scrim.
    const [bankingNotice, setBankingNotice] = useState(null);

    /**
     * 🔴 SAME SHAPE, SAME MISSING `.catch`. And it matters more here than on a listing:
     * this screen is how a member's debit-order banking gets changed, so "no members match
     * your search" against a down backend invites somebody to conclude the member is not
     * on file.
     *
     * The table's states are gated on `searched` as well, because an untouched search box
     * is not an empty result -- it is a question nobody has asked yet.
     */
    const [listState, setListState] = useState('loading');

    /*
     * 🔴 THE LOADING RESET LIVES ON THE RETRY PATH, NOT INSIDE THE FETCH (`10.4`).
     *
     * `react-hooks/set-state-in-effect` is an error as of this phase, and it was right: the effect
     * below called a function whose FIRST statement set state synchronously, so every mount paid a
     * cascading render for a transition that had already happened.
     *
     * 🔑 IT WAS A NO-OP ON MOUNT ANYWAY, which is what makes this behaviour-preserving rather than a
     * judgement call: `listState` already INITIALISES to 'loading', so setting it to 'loading' again
     * on the way in changed nothing anybody could see. What the line genuinely does is on the RETRY
     * path -- press Try again after a failure and the screen must go back to loading rather than sit
     * on the error until the answer lands. That is exactly where it now is.
     *
     * So the fetch owns its own outcome (ready or error) and the caller owns the intent to reload.
     * `retryMembers` is the retry; the effect calls the plain fetch and sets nothing.
     */
    const loadMembers = useCallback(() => memberService.getMembers()
        .then((data) => { setMembersList(data ?? []); setListState('ready'); })
        .catch((err) => { reportError('AcbDebits.loadMembers', err); setListState('error'); }), []);

    const retryMembers = useCallback(() => { setListState('loading'); loadMembers(); }, [loadMembers]);

    useEffect(() => { loadMembers(); }, [loadMembers]);

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
        setBankingNotice(null);
        setEditing(true);
    };

    const handleBankChange = (field) => (e) => setBankForm(f => ({ ...f, [field]: e.target.value }));

    const saveBanking = async () => {
        if (!selectedMember) return;
        setSaving(true);
        setBankingNotice(null);
        try {
            const updated = await memberService.updateBanking(selectedMember.id, bankForm);
            setSelectedMember(updated);
            setEditing(false);
        } catch (err) {
            reportError('AcbDebits.updateBanking', err);
            // 🔴 A BANKING CHANGE THAT FAILED, ANNOUNCED IN A DIALOG THE USER DISMISSES.
            // This screen writes a member's debit-order details; "Failed to update banking
            // details" arriving as a native modal, and leaving no trace once dismissed, is
            // the worst place in the application for that pattern.
            // R3-F2: and "Nothing was written" is true only of a refusal. After a timeout, a lost connection or a 5xx
            // the change may have landed, and re-submitting a debit-order change whose outcome is unknown is the harm.
            setBankingNotice({
                message: writeMayHaveLanded(err)
                    ? 'This banking change could not be confirmed. It may have been saved \u2014 reload the member and check their details before trying again.'
                    : `Those banking details were not saved. Nothing was written \u2014 ${messageOf(err)}`,
            });
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
            .then(full => { setSelectedMember(full); setNotice(null); })
            // 🔴 A FAILED RECORD FETCH USED TO OPEN THE REGISTER ROW AS IF IT WERE THE RECORD (`06.4`). The row
            // is the list's summary: a banking field it does not carry printed "-", Confirm Details confirmed
            // details nobody had loaded, and Edit Details seeded its form with blanks that Update would write.
            // Now nothing is opened -- not this member, and not the one open before -- and the page says why.
            .catch((err) => {
                reportError('AcbDebits.loadMember', err);
                setSelectedMember(null);
                setNotice(`The banking details for ${m.membershipNumber || 'that member'} could not be loaded, so nothing is shown for them. Select the member again to try again.`);
            })
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
                    aria-label={`${m.membershipNumber || 'This member'} \u2014 load banking details for ${formalName(m) || 'this member'}`}
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
        <Page>
            <PageTitle title="Manage Debits" subtitle="Capture Resubmission Debits" />

            {/* 🔴 WHAT THE `alert()` BECAME. Focused rather than `role="alert"`: the
                form primitives already give inline messages that role, and stacking a
                page-level live region on top is two announcements for one failure. */}
            {notice && (
                <div
                    ref={noticeRef}
                    tabIndex={-1}
                    aria-labelledby="acb-notice-title"
                    className="mt-4 flex items-start gap-2 rounded-lg border border-status-suspended-dot bg-status-suspended-bg p-3 text-sm text-status-suspended focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
                >
                    <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <p id="acb-notice-title" className="flex-1">{notice}</p>
                    <Button size="sm" variant="ghost" onClick={() => setNotice(null)}>Dismiss</Button>
                </div>
            )}

            <div className="mt-5 max-w-4xl">
                {/* The member search -- card.html's criteria row, printed on the page. */}
                <Criteria label="Member search">
                    <TextInput className={CRITERION_WIDE} label="Surname" kind="name" value={filters.surname} onChange={handleChange("surname")} placeholder="Any" />
                    <TextInput className={CRITERION} label="Membership number" kind="identifier" value={filters.membershipNumber} onChange={handleChange("membershipNumber")} placeholder="Any" />
                    <TextInput className={CRITERION_WIDE} label="Identity number" kind="identifier" value={filters.identityNumber} onChange={handleChange("identityNumber")} placeholder="Any" error={idError || undefined} />
                    <Button variant="primary" onClick={handleSearch}>
                        <Search size={16} strokeWidth={1.75} aria-hidden="true" /> Search
                    </Button>
                    <Button variant="ghost" onClick={handleClear}>Clear</Button>
                </Criteria>

                {/* Results */}
                {searched && (
                    <Sheet className="mt-6">
                        {/* 🔴 A COUNT IS A FACT ABOUT DATA THAT ARRIVED, and this one used to be
                            stated whatever happened. On a failed load the table below said "We
                            could not load the member list." while this line above it asserted
                            "0 members found" -- so the screen that changes a member's debit order
                            told an administrator both that something had gone wrong and that
                            their search was simply too narrow, and the second sentence is the one
                            that invites them to widen it and try again forever. While loading it
                            was worse: a confident zero under a spinner. conventions §8 -- the
                            count and the empty copy render ONLY when the data genuinely
                            resolved. The state's own words are the table's job. */}
                        {listState === 'ready' && (
                            <div className="px-6 py-3 border-b border-line text-sm text-ink-muted">
                                {results.length} member{results.length !== 1 ? "s" : ""} found
                            </div>
                        )}
                        <Table
                            caption="Members matching the ACB search"
                            columns={memberColumns}
                            rows={results}
                            rowKey="id"
                            loading={listState === 'loading'}
                            error={listState === 'error' ? 'We could not load the member list.' : null}
                            onRetry={retryMembers}
                            emptyTitle="No members match your search."
                            emptyMessage="Try a different membership or identity number."
                            dense
                        />
                    </Sheet>
                )}

                {/* Banking Details & Confirmation */}
                {selectedMember && (
                    <Sheet className="mt-4">
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
                            busy={saving}
                            footer={
                                <>
                                    <Button onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
                                    <Button variant="primary" onClick={saveBanking} loading={saving}>Update</Button>
                                </>
                            }
                        >
                            <DialogNotice notice={bankingNotice} onDismiss={() => setBankingNotice(null)} />
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
                    </Sheet>
                )}
            </div>
        </Page>
    );
}