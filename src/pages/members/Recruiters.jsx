import { useDeferredValue, useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { AlertCircle, ChevronRight, UserPlus, Trash2, UserMinus, Eye } from 'lucide-react';
import PageTitle from '../../components/common/PageTitle';
import { TextInput, SearchableSelect, SelectInput, Button, PositionTreeSelect, DateField } from '../../components/form';
import Table from '../../components/table/Table.jsx';
import StatusChip from '../../components/common/StatusChip.jsx';
import Modal, { ConfirmDialog, closeOn } from '../../components/overlay/Modal.jsx';
import { memberService } from '../../services/memberService.js';
import { recruiterService } from '../../services/recruiterService.js';
import { recruitmentChannelService } from '../../services/recruitmentChannelService.js';
import { bankService } from '../../services/bankService.js';
import { locationService } from '../../services/locationService.js';
import { validateEmail } from '../../utils/validateSAID.js';

const PAGE_SIZE = 20;

export function Recruiters() {
    const [members, setMembers] = useState([]);
    const [reps, setReps] = useState([]);
    const [banksData, setBanksData] = useState([]);
    const [provincesData, setProvincesData] = useState([]);
    const [filters, setFilters] = useState({ repName: '', bankName: '', branch: '', province: '', area: '' });
    const [page, setPage] = useState(1);
    const [selectedRep, setSelectedRep] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [showAddMember, setShowAddMember] = useState(false);
    const [addSearch, setAddSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [showAddRep, setShowAddRep] = useState(false);
    const [newRepSearch, setNewRepSearch] = useState('');
    const [newRepMember, setNewRepMember] = useState(null);
    const [selectedRepDetail, setSelectedRepDetail] = useState(null);
    const [editingRep, setEditingRep] = useState(false);
    const [editRepFields, setEditRepFields] = useState({ name: '', email: '', phone: '' });
    const [editRepErrors, setEditRepErrors] = useState({});
    const [repSearch, setRepSearch] = useState({ membershipNumber: '', name: '', bank: '', branch: '', status: '' });
    const [structures, setStructures] = useState([]);
    const [roles, setRoles] = useState([]);
    const [recruitmentChannels, setRecruitmentChannels] = useState([]);
    const [listState, setListState] = useState('loading');

    /**
     * What the last action said, when it did not simply work.
     *
     * 🔴 IT WAS SIX `alert()` CALLS -- assignment failed, removal failed, "please select a
     * recruiter type", "this member is already a recruiter", a bare `alert(err)` twice.
     * A native modal blocks the thread, cannot be styled, is suppressible, and -- worst
     * here -- ARRIVES AND LEAVES: dismissing "Assignment Failed" returned the member to a
     * screen that looked exactly as it had, with no record of what went wrong. Two of the
     * six were `alert(err)` with a raw Error object, which prints "[object Error]" in some
     * browsers.
     *
     * 06.1 owns the shared error CONTRACT. What this wave owes the screen is that a
     * failure is visible ON the screen.
     */
    const [notice, setNotice] = useState(null);
    const noticeRef = useRef(null);
    const fail = useCallback((message) => setNotice({ tone: 'error', message }), []);

    // Focus it once it EXISTS -- the same shape as `Auth` and `Members`, and for the same
    // reason: the element is not in the document at the moment the handler sets the state.
    useEffect(() => {
        if (notice) noticeRef.current?.focus();
    }, [notice]);

    const refreshAll = useCallback(() => {
        setListState((current) => (current === 'ready' ? 'ready' : 'loading'));
        return Promise.all([
            memberService.getMembers(),
            recruitmentChannelService.getAll(),
        ]).then(([m, r]) => {
            setMembers(m);
            setReps(r);
            setListState('ready');
        }).catch(err => {
            console.error("Error fetching dependencies:", err);
            setListState('error');
        });
    }, []);

    useEffect(() => {
        refreshAll();
        bankService.getBanks().then(setBanksData).catch(err => console.error(err));
        locationService.getProvinces().then(setProvincesData).catch(err => console.error(err));
        recruiterService.getStructures().then(setStructures).catch(err => console.error(err));
        recruiterService.getRoles().then(setRoles).catch(err => console.error(err));
        recruitmentChannelService.getAll().then(setRecruitmentChannels).catch(err => console.error(err));
    }, [refreshAll]);

    const BANK_NAMES = useMemo(() => [...new Set(banksData.map(b => b?.bankName).filter(Boolean))].sort(), [banksData]);
    const PROVINCES = useMemo(() => provincesData.map(p => p?.name).filter(Boolean).sort(), [provincesData]);
    const AREAS = useMemo(() => [...new Set(banksData.map(b => b?.area).filter(Boolean))].sort(), [banksData]);
    const BRANCHES = useMemo(() => [...new Set(banksData.map(b => b?.branchName).filter(Boolean))].sort(), [banksData]);

    const BANK_META = useMemo(() => {
        const meta = {};
        banksData.forEach(b => {
            if (b?.bankName) {
                meta[b.bankName] = { province: b.provinceCommitteeName, area: b.area };
            }
        });
        return meta;
    }, [banksData]);

    const ROLES = useMemo(() => roles.map(r => ({ ...r })), [roles]);
    const STRUCTURES_TREE = structures;
    const STRUCTURES = useMemo(() => {
        const flat = [];
        const walk = (nodes) => {
            nodes.forEach(n => {
                flat.push({ id: n.id, name: n.name, parentId: n.parentId });
                if (n.children?.length) walk(n.children);
            });
        };
        walk(structures);
        return flat;
    }, [structures]);
    const RECRUITMENT_CHANNELS = useMemo(() => recruitmentChannels.filter(r => r.enabled).sort((a, b) => a.name.localeCompare(b.name)), [recruitmentChannels]);

    const repList = useMemo(() => {
        const memberMap = {};
        members.forEach(m => {
            const repId = m.recruitmentRepresentativeId;
            if (repId == null) return;
            if (!memberMap[repId]) memberMap[repId] = {
                bankSet: new Set(),
                branchSet: new Set(),
                provinceSet: new Set(),
                areaSet: new Set(),
                count: 0
            };
            memberMap[repId].bankSet.add(m.bankName ?? '');
            memberMap[repId].branchSet.add(m.branch ?? '');
            const meta = BANK_META[m.bankName] || {};
            if (meta.province) memberMap[repId].provinceSet.add(meta.province);
            if (meta.area) memberMap[repId].areaSet.add(meta.area);
            memberMap[repId].count++;
        });

        return reps.map(r => {
            const d = memberMap[r.id] || {
                bankSet: new Set(),
                branchSet: new Set(),
                provinceSet: new Set(),
                areaSet: new Set(),
                count: 0
            };
            return {
                id: r.id,
                name: r.name,
                email: r.email || '',
                phone: r.phone || '',
                memberId: r.memberId || null,
                roleId: r.roleId || null,
                isElectedRep: r.isElectedRep || false,
                electionDate: r.electionDate || null,
                recruiterTypeId: r.recruiterTypeId || null,
                structureIds: r.structureIds || [],
                banks: [...d.bankSet].filter(Boolean).join(', '),
                branches: [...d.branchSet].filter(Boolean).join(', '),
                provinces: [...d.provinceSet].join(', '),
                areas: [...d.areaSet].join(', '),
                count: d.count,
            };
        }).sort((a, b) => {
            const nameA = a.name || "";
            const nameB = b.name || "";
            return nameA.localeCompare(nameB)
        });
    }, [members, reps, BANK_META]);

    const filtered = useMemo(() => {
        const q = v => (v || '').trim().toLowerCase();
        const rn = q(filters.repName);
        const bn = q(filters.bankName);
        const br = q(filters.branch);
        const pv = q(filters.province);
        const ar = q(filters.area);
        return repList.filter(r => {
            if (rn && !r.name.toLowerCase().includes(rn)) return false;
            if (bn && !r.banks.toLowerCase().includes(bn)) return false;
            if (br && !r.branches.toLowerCase().includes(br)) return false;
            if (pv && !r.provinces.toLowerCase().includes(pv)) return false;
            return !(ar && !r.areas.toLowerCase().includes(ar));
        });
    }, [filters, repList]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleFilter = useCallback((field) => (e) => {
        let val = '';
        if (e && typeof e === 'object' && 'target' in e) {
            val = e.target.value;
        } else if (typeof e === 'string' || typeof e === 'number') {
            val = e;
        } else if (e && typeof e === 'object' && 'value' in e) {
            val = e.value;
        }

        setFilters(p => ({ ...p, [field]: val }));
        setPage(1);
    }, []);

    const handleClear = useCallback(() => {
        setFilters({ repName: '', bankName: '', branch: '', province: '', area: '' });
        setPage(1);
    }, []);

    const repMembers = useMemo(() =>
            selectedRep ? members.filter(m => m.recruitmentRepresentativeId === selectedRep.id) : [],
        [selectedRep, members]);

    const filteredRepMembers = useMemo(() => {
        const { membershipNumber, name, bank, branch, status } = repSearch;
        return repMembers.filter(m =>
            (!membershipNumber || (m.membershipNumber ?? '').toLowerCase().includes(membershipNumber.toLowerCase())) &&
            (!name || `${m.initials || ''} ${m.surname || ''}`.toLowerCase().includes(name.toLowerCase())) &&
            (!bank || (m.bankName ?? '').toLowerCase().includes(bank.toLowerCase())) &&
            (!branch || (m.branch ?? '').toLowerCase().includes(branch.toLowerCase())) &&
            (!status || (m.status ?? '').toLowerCase().includes(status.toLowerCase()))
        );
    }, [repMembers, repSearch]);

    /**
     * R-PERF-J. Both member pickers filter the WHOLE member list on every keystroke.
     * `useDeferredValue` lets React paint the keystroke first and the filtered list a beat
     * later, so typing stays responsive however long the list is.
     *
     * ⚠️ NOT `useDebounce`, and R-PERF-E's premise is corrected rather than followed. That
     * hook delays a VALUE by a fixed time -- the right instrument when a keystroke costs a
     * REQUEST, and neither of these does: both filter an array already in memory. Adding a
     * debounce here would add latency for nothing. The one place in this application where
     * a keystroke does reach the network is `AddressAutocomplete`, and it already debounces
     * correctly, in the component that makes the call. findings.md, corrected premise ⑭.
     */
    const deferredAddSearch = useDeferredValue(addSearch);
    const deferredNewRepSearch = useDeferredValue(newRepSearch);

    /** How many rows a picker shows before it says "refine your search". */
    const PICKER_CAP = 50;

    const matchesQuery = (m, q) => !q || (
        (m.membershipNumber ?? '').toLowerCase().includes(q) ||
        `${m.initials || ''} ${m.surname || ''}`.toLowerCase().includes(q) ||
        (m.firstNames ?? '').toLowerCase().includes(q) ||
        (m.bankName ?? '').toLowerCase().includes(q)
    );

    const candidateMembers = useMemo(() => {
        const q = deferredAddSearch.trim().toLowerCase();
        return members.filter(m => m.recruitmentRepresentativeId !== selectedRep?.id && matchesQuery(m, q));
    }, [members, selectedRep, deferredAddSearch]);

    const visibleCandidates = useMemo(() => candidateMembers.slice(0, PICKER_CAP), [candidateMembers]);

    const newRepCandidates = useMemo(() => {
        const q = deferredNewRepSearch.trim().toLowerCase();
        return members.filter(m => !repList.some(r => r.memberId === m.id) && matchesQuery(m, q));
    }, [members, repList, deferredNewRepSearch]);

    const visibleNewRepCandidates = useMemo(() => newRepCandidates.slice(0, PICKER_CAP), [newRepCandidates]);

    const handleRepSearchChange = useCallback((field) => (e) => {
        const targetValue = e.target.value;
        setRepSearch(prevState => ({
            ...prevState,
            [field]: targetValue
        }));
    }, []);

    const handleCloseRepModal = useCallback(() => {
        setSelectedRep(null);
        setRepSearch({ membershipNumber: '', name: '', bank: '', branch: '', status: '' });
    }, []);

    const handleCloseMemberModal = useCallback(() => setSelectedMember(null), []);
    const handleCloseAddMember = useCallback(() => setShowAddMember(false), []);
    const handleCloseAddRep = useCallback(() => { setShowAddRep(false); setNewRepDetails({ roleId: null, recruiterTypeId: null, isElectedRep: false, electionDate: '', structureIds: [] }); }, []);
    const handleCloseRepDetail = useCallback(() => {
        setSelectedRepDetail(null);
        setEditingRep(false);
    }, []);
    const handleCancelEdit = useCallback(() => setEditingRep(false), []);
    const handleOpenAddMember = useCallback(() => {
        setShowAddMember(true);
        setAddSearch('');
    }, []);
    const handleOpenAddRep = useCallback(() => {
        setShowAddRep(true);
        setNewRepSearch('');
        setNewRepMember(null);
    }, []);

    const handlePrevPage = useCallback(() => setPage(p => Math.max(1, p - 1)), []);
    const handleNextPage = useCallback(() => setPage(p => Math.min(totalPages, p + 1)), [totalPages]);


    const sanitizeMemberPayload = (member, updateFields) => {
        return {
            id: member.id,
            membershipNumber: member.membershipNumber || '',
            title: member.title || '',
            initials: member.initials || '',
            surname: member.surname || '',
            firstNames: member.firstNames || '',
            identityNumber: member.identityNumber || '',
            race: member.race || '',
            preferredEmail: member.preferredEmail || 'work',
            workEmail: member.workEmail || '',
            personalEmail: member.personalEmail || '',
            phone: member.phone || '',
            cellTel: member.cellTel || '',
            workTel: member.workTel || '',
            homeTel: member.homeTel || '',
            address: member.address || '',
            employeeNumber: member.employeeNumber || '',
            jobGrade: member.jobGrade || '',
            bankName: member.bankName || '',
            branch: member.branch || '',
            bankAccountNumber: member.bankAccountNumber || '',
            ibtNo: member.ibtNo || '',
            paymentType: member.paymentType || '',
            workBankAddress: member.workBankAddress || '',
            joinDate: member.joinDate || '',
            status: member.status || 'Active',
            monthlySubscription: member.monthlySubscription || 0,
            currentBalance: member.currentBalance || 0,
            arrearsBalance: member.arrearsBalance || 0,
            recruitmentRep: member.recruitmentRep || '',
            electedRep: member.electedRep || '',
            repElectionDay: member.repElectionDay || '',
            repElectionMonth: member.repElectionMonth || '',
            repElectionYear: member.repElectionYear || '',
            remarks: member.remarks || '',
            ...updateFields
        };
    };

    const handleAssign = useCallback(async (member) => {
        try {
            setSaving(true);
            const cleanData = sanitizeMemberPayload(member, { areasRep: selectedRep.name });
            await memberService.updateMember(cleanData);
            await refreshAll();
        } catch (err) {
            fail(`That member could not be assigned to ${selectedRep?.name ?? 'this recruiter'}. ${err?.message || ''}`.trim());
        } finally {
            setSaving(false);
        }
    }, [selectedRep, refreshAll, fail]);

    // 🔴 `03.4`: both of this file's `window.confirm()` calls become ConfirmDialogs. The
    // second one is the reason it matters: it sets EVERY member of a recruiter to Inactive,
    // and `window.confirm` can only offer "OK".
    const [pendingRemoveMember, setPendingRemoveMember] = useState(null);
    const [pendingRemoveRep, setPendingRemoveRep] = useState(null);

    const handleRemove = async () => {
        const member = pendingRemoveMember;
        if (!member) return;
        setPendingRemoveMember(null);
        try {
            setSaving(true);
            const cleanData = sanitizeMemberPayload(member, { areasRep: '' });
            await memberService.updateMember(cleanData);
            await refreshAll();
        } catch (err) {
            fail(`That member could not be removed from the recruiter. ${err?.message || ''}`.trim());
        } finally {
            setSaving(false);
        }
    };

    const [newRepDetails, setNewRepDetails] = useState({ roleId: null, recruiterTypeId: null, isElectedRep: false, electionDate: '', structureIds: [] });

    const handleAddRep = async () => {
        if (!newRepMember) return;
        if (!newRepDetails.recruiterTypeId) {
            fail('Choose a recruiter type before making this member a recruiter.');
            return;
        }
        if (repList.some(r => r.memberId === newRepMember.id)) {
            fail('That member is already a recruiter.');
            return;
        }
        try {
            setSaving(true);
            const repName = [newRepMember.initials, newRepMember.surname].filter(Boolean).join(' ');
            const payload = {
                memberId: newRepMember.id,
                name: repName,
                roleId: newRepDetails.roleId,
                recruiterTypeId: newRepDetails.recruiterTypeId,
                isElectedRep: newRepDetails.isElectedRep,
                electionDate: newRepDetails.isElectedRep ? newRepDetails.electionDate || null : null,
                structureIds: newRepDetails.structureIds,
            };
            const createdRep = await recruiterService.create(payload);
            await refreshAll();
            setShowAddRep(false);
            setNewRepMember(null);
            setNewRepDetails({ roleId: null, recruiterTypeId: null, isElectedRep: false, electionDate: '', structureIds: [] });
            setSelectedRep({ id: createdRep?.id, name: repName });
            setNotice(null);
        } catch (err) {
            fail(`That recruiter could not be created. ${err?.message || ''}`.trim());
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveRep = async () => {
        const rep = pendingRemoveRep;
        if (!rep) return;
        const repMems = members.filter(m => m.recruitmentRepresentativeId === rep.id);
        setPendingRemoveRep(null);
        try {
            setSaving(true);
            await Promise.all(repMems.map(m => {
                const cleanData = sanitizeMemberPayload(m, { areasRep: '', status: 'Inactive' });
                return memberService.updateMember(cleanData);
            }));
            await recruiterService.remove(rep.id);
            await refreshAll();
        } catch (err) {
            // 🔴 THE HONEST WORDING MATTERS HERE. This action updates every one of the
            // recruiter's members and then deletes the recruiter, so a failure part-way
            // through leaves the data half-changed -- and the old message ("could not
            // remove recruiter context completely") said that without saying what to do.
            fail(`The recruiter may be only partly removed -- some members were updated before this failed. Reload and check before trying again. ${err?.message || ''}`.trim());
        } finally {
            setSaving(false);
        }
    };

    /**
     * The four tabular surfaces on this screen, as columns.
     *
     * 🔴 ALL FOUR WERE `grid-cols-N` PSEUDO-TABLES -- run 7 found seven of them across the
     * application and four are here. None of them was a `<table>`, so no `<table>` grep
     * could see them, none announced a header/cell relationship to a screen reader, and
     * three of the four had `<div onClick>` rows: click-only, no tab stop, no accessible
     * name, no Enter. `Table` makes the semantics structural and the row action a real
     * button.
     *
     * 📱 R-RESP-K: seven columns do not fit on a phone, so the ones that are context
     * rather than identity are `secondary` and drop into the row's detail panel.
     */
    const recruiterColumns = useMemo(() => [
        {
            key: 'name',
            header: 'Recruitment Channel',
            priority: 'essential',
            cell: (rep) => (
                <button
                    type="button"
                    onClick={() => setSelectedRep({ id: rep.id, name: rep.name })}
                    aria-label={`${rep.name} — show the members recruited by this channel`}
                    className="touch-target inline-flex items-center gap-1 rounded-sm font-medium text-brand-ink underline-offset-2 hover-hover:hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
                >
                    {rep.name}
                    <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-ink-faint" />
                </button>
            ),
        },
        { key: 'banks', header: 'Bank(s)', priority: 'secondary', truncate: true, cell: (r) => r.banks || '—' },
        { key: 'branches', header: 'Branch(es)', priority: 'secondary', truncate: true, cell: (r) => r.branches || '—' },
        { key: 'provinces', header: 'Province', priority: 'secondary', truncate: true, cell: (r) => r.provinces || '—' },
        { key: 'areas', header: 'Area', priority: 'secondary', truncate: true, cell: (r) => r.areas || '—' },
        {
            key: 'count',
            header: 'Members',
            priority: 'essential',
            cell: (rep) => (
                <span className="inline-block rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-ink">
                    {rep.count}
                </span>
            ),
        },
        {
            key: 'remove',
            header: 'Remove',
            priority: 'essential',
            align: 'right',
            cell: (rep) => (
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setPendingRemoveRep(rep)}
                    disabled={saving}
                    aria-label={`Remove recruiter ${rep.name}`}
                    className="text-status-suspended"
                >
                    <UserMinus size={14} aria-hidden="true" />
                </Button>
            ),
        },
    ], [saving]);

    /** A member as it appears on a recruiter's list. */
    const memberColumn = useCallback((onOpen) => ({
        key: 'membershipNumber',
        header: 'Membership No.',
        priority: 'essential',
        cell: (m) => (
            <button
                type="button"
                onClick={() => onOpen(m)}
                aria-label={`${m.membershipNumber || 'This member'} — open the record for ${[m.title, m.initials, m.surname].filter(Boolean).join(' ') || 'this member'}`}
                className="touch-target rounded-sm font-medium text-brand-ink underline-offset-2 hover-hover:hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
            >
                {m.membershipNumber}
            </button>
        ),
    }), []);

    const fullName = (m) => `${m.title ? `${m.title} ` : ''}${m.initials || ''} ${m.surname || ''}`.trim() || '—';

    const repMemberColumns = useMemo(() => [
        memberColumn(setSelectedMember),
        { key: 'name', header: 'Name', priority: 'essential', truncate: true, cell: fullName },
        { key: 'bankName', header: 'Bank', priority: 'secondary', truncate: true, cell: (m) => m.bankName || '—' },
        { key: 'branch', header: 'Branch', priority: 'secondary', truncate: true, cell: (m) => m.branch || '—' },
        { key: 'status', header: 'Status', priority: 'essential', cell: (m) => <StatusChip status={m.status} /> },
        {
            key: 'remove',
            header: 'Remove',
            priority: 'essential',
            align: 'right',
            cell: (m) => (
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setPendingRemoveMember(m)}
                    disabled={saving}
                    aria-label={`Remove ${fullName(m)} from this recruiter`}
                    className="text-status-suspended"
                >
                    <Trash2 size={14} aria-hidden="true" />
                </Button>
            ),
        },
    ], [memberColumn, saving]);

    const candidateColumns = useMemo(() => [
        { key: 'membershipNumber', header: 'Membership No.', priority: 'essential', cell: (m) => <span className="font-medium text-brand-ink">{m.membershipNumber}</span> },
        { key: 'name', header: 'Name', priority: 'essential', truncate: true, cell: fullName },
        { key: 'bankName', header: 'Bank', priority: 'secondary', truncate: true, cell: (m) => m.bankName || '—' },
        {
            key: 'add',
            header: 'Add',
            priority: 'essential',
            align: 'right',
            cell: (m) => (
                <Button
                    size="sm"
                    variant="primary"
                    disabled={saving}
                    aria-label={`Add ${fullName(m)} to this recruiter`}
                    onClick={async () => { await handleAssign(m); setShowAddMember(false); }}
                >
                    <UserPlus size={12} aria-hidden="true" /> Add
                </Button>
            ),
        },
    ], [saving, handleAssign]);

    const newRepColumns = useMemo(() => [
        { key: 'membershipNumber', header: 'Membership No.', priority: 'essential', cell: (m) => <span className="font-medium text-brand-ink">{m.membershipNumber}</span> },
        {
            key: 'name',
            header: 'Name',
            priority: 'essential',
            truncate: true,
            // 🔴 THE ROW WAS `<div onClick>` -- selecting the member who becomes a recruiter
            // was mouse-only. `aria-pressed` is what says which one is currently chosen,
            // which the old version conveyed with a background colour alone.
            cell: (m) => (
                <button
                    type="button"
                    onClick={() => setNewRepMember(m)}
                    aria-pressed={newRepMember?.id === m.id}
                    aria-label={`Choose ${fullName(m)} as the recruiter`}
                    className={`touch-target rounded-sm text-left underline-offset-2 hover-hover:hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring ${newRepMember?.id === m.id ? 'font-semibold text-brand-ink' : 'text-ink'}`}
                >
                    {fullName(m)}
                </button>
            ),
        },
        { key: 'bankName', header: 'Bank', priority: 'secondary', truncate: true, cell: (m) => m.bankName || '—' },
        { key: 'status', header: 'Status', priority: 'essential', cell: (m) => <StatusChip status={m.status} /> },
    ], [newRepMember]);

    return (
        <div className="p-6 text-ink">
            <PageTitle title="Recruiters" />
            <p className="text-center text-ink-muted mb-4">
                Browse Sasbo recruiters and the members they recruit
            </p>

            {/* 🔴 WHAT SIX `alert()` CALLS BECAME. Focused rather than `role="alert"`:
                the primitives already give inline field errors that role, and stacking a
                page-level live region on top means two announcements for one failure.
                Dismissible, because unlike a validation summary this describes something
                that already happened and the member may simply want it out of the way. */}
            {notice && (
                <div
                    ref={noticeRef}
                    tabIndex={-1}
                    aria-labelledby="recruiters-notice-title"
                    className="mx-auto mb-4 flex max-w-6xl items-start gap-2 rounded-lg border border-status-suspended-dot bg-status-suspended-bg p-3 text-sm text-status-suspended focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
                >
                    <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <p id="recruiters-notice-title" className="flex-1">{notice.message}</p>
                    <Button size="sm" variant="ghost" onClick={() => setNotice(null)}>Dismiss</Button>
                </div>
            )}
            <div className="max-w-6xl mx-auto p-6 rounded-card border border-line bg-surface shadow-(--shadow-1)">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <TextInput label="Recruiter Name" value={filters.repName} onChange={handleFilter('repName')} placeholder="Search recruiter name" />
                    <SearchableSelect label="Bank Name" value={filters.bankName} onChange={handleFilter('bankName')} placeholder="All Banks"
                                      options={[{ value: '', label: 'All Banks' }, ...BANK_NAMES.map(b => ({ value: b, label: b }))]} />
                    <SearchableSelect label="Branch" value={filters.branch} onChange={handleFilter('branch')}
                                      options={[{ value: '', label: 'All Branches' }, ...BRANCHES.map(b => ({ value: b, label: b }))]} />
                    <SearchableSelect label="Province" value={filters.province} onChange={handleFilter('province')}
                                      options={[{ value: '', label: 'All Provinces' }, ...PROVINCES.map(p => ({ value: p, label: p }))]} />
                    <SearchableSelect label="Area" value={filters.area} onChange={handleFilter('area')}
                                      options={[{ value: '', label: 'All Areas' }, ...AREAS.map(a => ({ value: a, label: a }))]} />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-ink-muted">
            {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} recruiters
          </span>
                    <div className="flex items-center gap-2">
                        <Button variant="pagination" onClick={handlePrevPage} disabled={page === 1}>Prev</Button>
                        <span className="text-ink-muted">Page {page} of {totalPages}</span>
                        <Button variant="pagination" onClick={handleNextPage} disabled={page === totalPages}>Next</Button>
                        <Button onClick={handleClear}>Clear</Button>
                        <Button variant="primary" onClick={handleOpenAddRep}>
                            <UserPlus size={14} /> Add Recruiter
                        </Button>
                    </div>
                </div>
                {/* 🔴 WAS A `grid-cols-7` PSEUDO-TABLE WITH `<div onClick>` ROWS. No header
                    relationship for a screen reader, no tab stop on the row, and the
                    "Remove" control lived inside a clickable row with
                    `onClick={e => e.stopPropagation()}` wrapped around it -- which works
                    for a mouse and does nothing for a keyboard. */}
                <div className="mt-4">
                    <Table
                        caption="Recruitment channels and the members they recruit"
                        columns={recruiterColumns}
                        rows={visible}
                        rowKey="id"
                        loading={listState === 'loading'}
                        error={listState === 'error' ? 'We could not load the recruiters.' : null}
                        onRetry={refreshAll}
                        emptyTitle="No recruiters match your search."
                        emptyMessage="Try clearing the filters above."
                    />
                </div>
            </div>

            {/* Rep Members Modal */}
            {selectedRep && !selectedMember && (
                <Modal
                    open
                    onOpenChange={closeOn(handleCloseRepModal)}
                    title={selectedRep.name}
                    description="Recruitment channel"
                    size="lg"
                    footer={
                        <>
                            <Button onClick={handleCloseRepModal}>Close</Button>
                            <Button variant="primary" onClick={handleOpenAddMember}>
                                <UserPlus size={14} /> Add Member
                            </Button>
                        </>
                    }
                >
                        <div className="flex items-center justify-between pb-4">
                            <div>
                                <p className="text-xs uppercase tracking-wider font-bold text-ink-muted">Recruitment Channel</p>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold text-brand-ink">{selectedRep.name}</h3>
                                    {/* 🔴 THE TOOLTIP WAS CSS-ONLY AND MOUSE-ONLY. A
                                        `group-hover:opacity-100` span is in the DOM at all
                                        times, merely transparent, so it announced itself to
                                        a screen reader whether or not anything was hovered
                                        -- and it was unreachable by keyboard. The button's
                                        own accessible name was an SVG, i.e. nothing. The
                                        name belongs on the control. */}
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        aria-label="View recruiter details"
                                        onClick={() => {
                                            const rep = repList.find(r => r.id === selectedRep.id);
                                            setSelectedRepDetail(rep);
                                            setEditingRep(false);
                                            setEditRepFields({ name: rep?.name || '', email: rep?.email || '', phone: rep?.phone || '' });
                                            setEditRepErrors({});
                                        }}
                                    >
                                        <Eye size={14} aria-hidden="true" />
                                    </Button>
                                </div>
                            </div>
                            <span className="text-sm text-ink-muted">{repMembers.length} member{repMembers.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div>
                            <h3 className="border-b border-line py-3 text-center text-sm font-semibold text-brand-ink">
                                Members ({repMembers.length})
                            </h3>
                            {/* 🔴 FIVE RAW `<input>` TAGS WITH `aria-label` AND NO VISIBLE
                                LABEL. They read as a header row of search boxes, which is
                                the intent -- but a placeholder is not a label: it vanishes
                                the moment anything is typed, so a member who looks away
                                has no way to tell which column each box filters.
                                `TextInput` carries a real one. */}
                            <div className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-2 lg:grid-cols-5">
                                <TextInput label="Membership No." kind="search" value={repSearch.membershipNumber || ''} onChange={handleRepSearchChange('membershipNumber')} placeholder="Filter…" />
                                <TextInput label="Name" kind="search" value={repSearch.name || ''} onChange={handleRepSearchChange('name')} placeholder="Filter…" />
                                <TextInput label="Bank" kind="search" value={repSearch.bank || ''} onChange={handleRepSearchChange('bank')} placeholder="Filter…" />
                                <TextInput label="Branch" kind="search" value={repSearch.branch || ''} onChange={handleRepSearchChange('branch')} placeholder="Filter…" />
                                <TextInput label="Status" kind="search" value={repSearch.status || ''} onChange={handleRepSearchChange('status')} placeholder="Filter…" />
                            </div>
                            <Table
                                caption={`Members recruited by ${selectedRep.name}`}
                                columns={repMemberColumns}
                                rows={filteredRepMembers}
                                rowKey="id"
                                emptyTitle="No members found."
                                emptyMessage="No member on this recruiter's list matches those filters."
                                dense
                            />
                        </div>
                </Modal>
            )}

            {/* Add Member Picker */}
            {showAddMember && selectedRep && (
                <Modal
                    open
                    onOpenChange={closeOn(handleCloseAddMember)}
                    title="Add member to recruiter"
                    description={selectedRep.name}
                    size="lg"
                    footer={<Button onClick={handleCloseAddMember}>Cancel</Button>}
                >
                        <div className="pb-3">
                            <TextInput
                                label="Search members"
                                kind="search"
                                autoFocus
                                value={addSearch}
                                onChange={e => setAddSearch(e.target.value)}
                                placeholder="Search by name, membership no. or bank…"
                            />
                        </div>
                        {/* 🔴 R-SCALE-E: `slice(0, 50)` USED TO LIE BY OMISSION. It rendered
                            the first fifty matches and said nothing, so a search returning
                            four hundred members looked like a search returning fifty --
                            and the member somebody was looking for was simply not there,
                            with no way to tell. `total` is what turns that into the
                            table's own "showing the first N of M -- refine your search". */}
                        <Table
                            caption="Members who can be added to this recruiter"
                            columns={candidateColumns}
                            rows={visibleCandidates}
                            total={candidateMembers.length}
                            rowKey="id"
                            emptyTitle="No members found."
                            emptyMessage="Every member matching that search is already on this recruiter's list."
                            dense
                        />
                </Modal>
            )}

            {/* Rep Detail Modal */}
            {selectedRepDetail && (
                <Modal
                    open
                    onOpenChange={closeOn(handleCloseRepDetail)}
                    title="Recruiter details"
                    description={selectedRepDetail.name}
                    size="md"
                >
                        <div className="flex items-center justify-end gap-2 pb-4">
                            <div className="flex items-center gap-2">
                                {!editingRep && (
                                    <Button variant="primary" size="sm"
                                            onClick={() => {
                                                setEditRepFields({
                                                    name: selectedRepDetail.name,
                                                    email: selectedRepDetail.email || '',
                                                    phone: selectedRepDetail.phone || '',
                                                    roleId: selectedRepDetail.roleId || null,
                                                    recruiterTypeId: selectedRepDetail.recruiterTypeId || null,
                                                    isElectedRep: selectedRepDetail.isElectedRep || false,
                                                    electionDate: selectedRepDetail.electionDate || '',
                                                    structureIds: selectedRepDetail.structureIds || [],
                                                });
                                                setEditRepErrors({});
                                                setEditingRep(true);
                                            }}>
                                        Edit
                                    </Button>
                                )}
                            </div>
                        </div>
                        {editingRep ? (
                            <div className="space-y-4 py-5">
                                {/* 🔴 SIX HAND-ROLLED CONTROLS, EACH WITH A `<label>` THAT NAMED
                                    NOTHING. Every one carried `className="text-[10px] …"` and
                                    no `htmlFor`, so a screen-reader user met six unnamed
                                    inputs -- the A28 shape, six times, in one dialog. The
                                    primitives carry the label, the error wiring and the
                                    16px-on-a-phone rule. */}
                                <TextInput
                                    label="Full Name"
                                    required
                                    kind="name"
                                    value={editRepFields.name}
                                    onChange={e => { const val = e.target.value; setEditRepFields(p => ({ ...p, name: val })); }}
                                />
                                <TextInput
                                    label="Email"
                                    kind="email"
                                    value={editRepFields.email}
                                    error={editRepErrors.email || undefined}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setEditRepFields(p => ({ ...p, email: val }));
                                        setEditRepErrors(p => ({ ...p, email: validateEmail(val) || undefined }));
                                    }}
                                />
                                <TextInput
                                    label="Phone"
                                    kind="tel"
                                    value={editRepFields.phone}
                                    onChange={e => { const val = e.target.value; setEditRepFields(p => ({ ...p, phone: val })); }}
                                />
                                <SelectInput
                                    label="Recruiter Type"
                                    value={editRepFields.recruiterTypeId ?? ''}
                                    placeholder="Select recruitment channel..."
                                    options={RECRUITMENT_CHANNELS.map(rt => ({ value: rt.id, label: rt.name }))}
                                    onChange={(next) => setEditRepFields(p => ({ ...p, recruiterTypeId: next ? Number(next) : null }))}
                                />
                                <SelectInput
                                    label="Role"
                                    value={editRepFields.roleId ?? ''}
                                    placeholder="Select role..."
                                    options={ROLES.map(r => ({ value: r.id, label: r.name }))}
                                    onChange={(next) => setEditRepFields(p => ({ ...p, roleId: next ? Number(next) : null }))}
                                />
                                <YesNo
                                    legend="Elected Recruiter"
                                    value={editRepFields.isElectedRep}
                                    onChange={(yes) => setEditRepFields(p => ({ ...p, isElectedRep: yes, ...(yes ? {} : { electionDate: '' }) }))}
                                />
                                {editRepFields.isElectedRep && (
                                    <DateField
                                        label="Election Date"
                                        value={editRepFields.electionDate || ''}
                                        max="today"
                                        hint="ago"
                                        onChange={e => setEditRepFields(p => ({ ...p, electionDate: e.target.value }))}
                                    />
                                )}
                                <PositionTreeSelect
                                    label="Structures / Positions"
                                    structures={STRUCTURES_TREE}
                                    selectedIds={editRepFields.structureIds || []}
                                    onChange={(ids) => setEditRepFields(p => ({ ...p, structureIds: ids }))}
                                    placeholder="Select positions..."
                                />
                            </div>
                        ) : (
                            <div className="px-6 py-5 space-y-4">
                                <DRow label="Name" value={selectedRepDetail.name} />
                                <DRow label="Email" value={selectedRepDetail.email || '—'} />
                                <DRow label="Phone" value={selectedRepDetail.phone || '—'} />
                                <DRow label="Bank(s)" value={selectedRepDetail.banks || '—'} />
                                <DRow label="Branch(es)" value={selectedRepDetail.branches || '—'} />
                                <DRow label="Province" value={selectedRepDetail.provinces || '—'} />
                                <DRow label="Area" value={selectedRepDetail.areas || '—'} />
                                <DRow label="Recruiter Type" value={RECRUITMENT_CHANNELS.find(rt => rt.id === selectedRepDetail.recruiterTypeId)?.name || '—'} />
                                <DRow label="Role" value={ROLES.find(r => r.id === selectedRepDetail.roleId)?.name || '—'} />
                                <DRow label="Elected Rep" value={selectedRepDetail.isElectedRep ? 'Yes' : 'No'} />
                                {selectedRepDetail.isElectedRep && <DRow label="Election Date" value={selectedRepDetail.electionDate || '—'} />}
                                <DRow label="Structures" value={(selectedRepDetail.structureIds || []).map(sid => STRUCTURES.find(s => s.id === sid)?.name).filter(Boolean).join(', ') || '—'} />
                                <DRow label="Members Recruited" value={selectedRepDetail.count} />
                            </div>
                        )}
                        <div className="py-3 border-t border-line flex justify-end gap-2">
                            {editingRep ? (
                                <>
                                    <Button onClick={handleCancelEdit}>Cancel</Button>
                                    <Button variant="primary" disabled={!editRepFields.name.trim() || saving || !!editRepErrors.email}
                                            onClick={async () => {
                                                setSaving(true);
                                                try {
                                                    const payload = {
                                                        ...editRepFields,
                                                        roleId: editRepFields.roleId,
                                                        recruiterTypeId: editRepFields.recruiterTypeId,
                                                        isElectedRep: editRepFields.isElectedRep,
                                                        electionDate: editRepFields.isElectedRep ? editRepFields.electionDate || null : null,
                                                        structureIds: editRepFields.structureIds || [],
                                                    };
                                                    await recruiterService.update(selectedRepDetail.id, payload);
                                                    await refreshAll();
                                                    setSelectedRepDetail(d => ({ ...d, ...editRepFields }));
                                                    if (selectedRep?.id === selectedRepDetail.id) setSelectedRep(r => ({ ...r, ...editRepFields }));
                                                    setEditingRep(false);
                                                } catch (err) {
                                                    fail(`Those recruiter details could not be saved. ${err?.message || ''}`.trim());
                                                } finally {
                                                    setSaving(false);
                                                }
                                            }}>
                                        Save
                                    </Button>
                                </>
                            ) : (
                                <Button onClick={handleCloseRepDetail}>Close</Button>
                            )}
                        </div>
                </Modal>
            )}

            {/* Add Recruiter Modal */}
            {showAddRep && (
                <Modal
                    open
                    onOpenChange={closeOn(handleCloseAddRep)}
                    title="Add Recruiter"
                    description="A recruiter must be an existing member"
                    size="md"
                    footer={
                        <>
                            <Button onClick={handleCloseAddRep}>Cancel</Button>
                            <Button variant="primary" onClick={handleAddRep} disabled={!newRepMember} loading={saving}>
                                <UserPlus size={14} /> Make Recruiter
                            </Button>
                        </>
                    }
                >
                        {newRepMember && (
                            <div className="mt-3 px-4 py-3 rounded-lg bg-brand-soft border border-brand-ring flex items-center justify-between shrink-0">
                                <div>
                                    <p className="text-xs font-bold text-brand-ink uppercase tracking-wider">Selected Member</p>
                                    <p className="text-sm font-semibold text-ink">
                                        {newRepMember.title ? `${newRepMember.title} ` : ''}{newRepMember.initials} {newRepMember.surname}
                                    </p>
                                    <p className="text-xs text-ink-muted">{newRepMember.membershipNumber} · {newRepMember.bankName}</p>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => setNewRepMember(null)}>Clear</Button>
                            </div>
                        )}
                        <div className="shrink-0 border-b border-line pb-3">
                            <TextInput
                                label="Search members"
                                kind="search"
                                autoFocus
                                value={newRepSearch}
                                onChange={e => setNewRepSearch(e.target.value)}
                                placeholder="Search by name, membership no. or bank…"
                            />
                        </div>
                        <Table
                            caption="Members who could become a recruiter"
                            columns={newRepColumns}
                            rows={visibleNewRepCandidates}
                            total={newRepCandidates.length}
                            rowKey="id"
                            emptyTitle="No members found."
                            emptyMessage="Every member matching that search is already a recruiter."
                            dense
                        />
                        {newRepMember && (
                            <div className="shrink-0 space-y-4 border-t border-line py-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Recruiter Details</p>
                                <SelectInput
                                    label="Recruiter Type"
                                    required
                                    value={newRepDetails.recruiterTypeId ?? ''}
                                    placeholder="Select recruiter type..."
                                    options={RECRUITMENT_CHANNELS.map(rt => ({ value: rt.id, label: rt.name }))}
                                    onChange={(next) => setNewRepDetails(p => ({ ...p, recruiterTypeId: next ? Number(next) : null }))}
                                />
                                <SelectInput
                                    label="Role"
                                    value={newRepDetails.roleId ?? ''}
                                    placeholder="Select role..."
                                    options={ROLES.map(r => ({ value: r.id, label: r.name }))}
                                    onChange={(next) => setNewRepDetails(p => ({ ...p, roleId: next ? Number(next) : null }))}
                                />
                                <YesNo
                                    legend="Elected Recruiter"
                                    value={newRepDetails.isElectedRep}
                                    onChange={(yes) => setNewRepDetails(p => ({ ...p, isElectedRep: yes, ...(yes ? {} : { electionDate: '' }) }))}
                                />
                                {newRepDetails.isElectedRep && (
                                    <DateField
                                        label="Election Date"
                                        value={newRepDetails.electionDate || ''}
                                        max="today"
                                        hint="ago"
                                        onChange={e => setNewRepDetails(p => ({ ...p, electionDate: e.target.value }))}
                                    />
                                )}
                                <PositionTreeSelect
                                    label="Structures / Positions"
                                    structures={STRUCTURES_TREE}
                                    selectedIds={newRepDetails.structureIds}
                                    onChange={(ids) => setNewRepDetails(p => ({ ...p, structureIds: ids }))}
                                    placeholder="Select positions..."
                                />
                            </div>
                        )}
                </Modal>
            )}

            {/* Member Detail Modal */}
            {selectedMember && (
                <Modal
                    open
                    onOpenChange={closeOn(handleCloseMemberModal)}
                    title="Member details"
                    size="lg"
                    footer={<Button onClick={handleCloseMemberModal}>Close</Button>}
                >
                        <div className="flex items-start justify-between pb-4">
                            <div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-base font-semibold text-ink">
                                    <span>{selectedMember.title ? `${selectedMember.title} ` : ''}{selectedMember.initials} {selectedMember.surname}</span>
                                    <span aria-hidden="true" className="text-ink-faint">•</span>
                                    <span className="text-sm font-normal text-ink-muted">{selectedMember.membershipNumber}</span>
                                    <span aria-hidden="true" className="text-ink-faint">•</span>
                                    <StatusChip status={selectedMember.status} />
                                </div>
                            </div>
                        </div>
                        <div className="py-2 text-xs text-ink-muted border-b border-line flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedMember(null)}>{selectedRep?.name}</Button>
                            <ChevronRight size={12} />
                            <span className="font-medium text-ink">{selectedMember.membershipNumber}</span>
                        </div>
                        <div className="overflow-y-auto flex-1 py-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Section title="Personal">
                                    <DRow label="First Names" value={selectedMember.firstNames || selectedMember.firstName} />
                                    <DRow label="Surname" value={selectedMember.surname} />
                                    <DRow label="ID Number" value={selectedMember.identityNumber} />
                                    <DRow label="Race" value={selectedMember.race} />
                                    <DRow label="Email" value={selectedMember.preferredEmail === "both" ? [selectedMember.personalEmail, selectedMember.workEmail].filter(Boolean).join(', ') || '—' : ((selectedMember.preferredEmail === "work" ? selectedMember.workEmail : selectedMember.personalEmail) || '—')} className="break-all text-brand-ink" />
                                    <DRow label="Cell" value={selectedMember.phone || selectedMember.cellTel} />
                                    <DRow label="Work Tel" value={selectedMember.workTel} />
                                    <DRow label="Home Tel" value={selectedMember.homeTel} />
                                    <DRow label="Address" value={selectedMember.address} />
                                </Section>
                                <Section title="Employment & Bank">
                                    <DRow label="Employee Number" value={selectedMember.employeeNumber} />
                                    <DRow label="Job Grade" value={selectedMember.jobGrade} />
                                    <DRow label="Bank" value={selectedMember.bankName} />
                                    <DRow label="Branch" value={selectedMember.branch} />
                                    <DRow label="Account Number" value={selectedMember.bankAccountNumber} />
                                    <DRow label="IBT No." value={selectedMember.ibtNo} />
                                    <DRow label="Payment Type" value={selectedMember.paymentType} />
                                    <DRow label="Work Address" value={selectedMember.workBankAddress} />
                                </Section>
                                <Section title="Membership">
                                    <DRow label="Membership No." value={selectedMember.membershipNumber} />
                                    <DRow label="Date Joined" value={selectedMember.joinDate} />
                                    <DRow label="Status" value={selectedMember.status} />
                                    <DRow label="Monthly Subs" value={selectedMember.monthlySubscription} />
                                    <DRow label="Current Balance" value={selectedMember.currentBalance} />
                                    <DRow label="Arrears Balance" value={selectedMember.arrearsBalance} />
                                </Section>
                                <Section title="Recruiters">
                                    <DRow label="Area's Rep" value={selectedMember.areasRep} />
                                    <DRow label="Recruitment Rep" value={selectedMember.recruitmentRep} />
                                    <DRow label="Elected Rep" value={selectedMember.electedRep} />
                                    <DRow label="Election Date" value={[selectedMember.repElectionDay, selectedMember.repElectionMonth, selectedMember.repElectionYear].filter(Boolean).join('/') || '—'} />
                                    <DRow label="Remarks" value={selectedMember.remarks} />
                                </Section>
                            </div>
                        </div>
                </Modal>
            )}

            <ConfirmDialog
                open={Boolean(pendingRemoveMember)}
                onOpenChange={closeOn(() => setPendingRemoveMember(null))}
                title="Remove this member from the recruiter?"
                description={pendingRemoveMember
                    ? `${[pendingRemoveMember.initials, pendingRemoveMember.surname].filter(Boolean).join(' ')} will no longer be on ${selectedRep?.name ?? 'this recruiter'}'s list.`
                    : undefined}
                confirmLabel="Remove from recruiter"
                loading={saving}
                onConfirm={handleRemove}
            />

            <ConfirmDialog
                open={Boolean(pendingRemoveRep)}
                onOpenChange={closeOn(() => setPendingRemoveRep(null))}
                title="Remove this recruiter?"
                confirmLabel="Remove recruiter"
                loading={saving}
                onConfirm={handleRemoveRep}
            >
                {/* 🔑 The consequence is SPELLED OUT, and it is the reason this one could
                    never have stayed a `window.confirm`: it sets every one of the
                    recruiter's members to Inactive. */}
                {pendingRemoveRep && (
                    <p className="text-sm text-ink">
                        <strong className="font-medium">{pendingRemoveRep.name}</strong> will be removed. This sets{' '}
                        <strong className="font-medium">
                            {members.filter(m => m.recruitmentRepresentativeId === pendingRemoveRep.id).length}
                        </strong>{' '}
                        member(s) to <strong className="font-medium">Inactive</strong> and clears their recruiter
                        assignment.
                    </p>
                )}
            </ConfirmDialog>
        </div>
    );
}


/**
 * A yes/no answer, as a pair of buttons.
 *
 * 🔴 THE TWO COPIES IT REPLACES WERE A `<label>` OVER TWO UNGROUPED `<button>`s. The label
 * named nothing -- no `htmlFor`, and there is no single control to point at anyway -- and
 * the SELECTED state was carried by a background colour and nothing else, so a
 * screen-reader user could not tell which of the two was the current answer. A
 * `<fieldset>` with a `<legend>` is what associates the question with the pair, and
 * `aria-pressed` is what says which one is the answer.
 */
function YesNo({ legend, value, onChange }) {
    return (
        <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{legend}</legend>
            <div className="mt-1 flex items-center gap-3">
                {[true, false].map((choice) => (
                    <Button
                        key={String(choice)}
                        variant={value === choice ? 'primary' : 'default'}
                        aria-pressed={value === choice}
                        onClick={() => onChange(choice)}
                    >
                        {choice ? 'Yes' : 'No'}
                    </Button>
                ))}
            </div>
        </fieldset>
    );
}

function Section({ title, children }) {
    return (
        <div className="space-y-3">
            <h4 className="border-b border-line pb-1 text-xs font-bold uppercase tracking-widest text-brand-ink">{title}</h4>
            {children}
        </div>
    );
}

function DRow({ label, value, className = '' }) {
    return (
        <div>
            <p className="text-2xs font-bold uppercase tracking-wider text-ink-muted">{label}</p>
            <p className={`text-sm font-semibold text-ink ${className}`}>{value || '—'}</p>
        </div>
    );
}
