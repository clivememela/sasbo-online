import { useDeferredValue, useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { ChevronRight, UserPlus, Trash2, UserMinus, Eye } from 'lucide-react';
import PageTitle from '../../components/common/PageTitle';
import Criteria, { CRITERION, CRITERION_WIDE } from '../../components/common/Criteria.jsx';
import Pager from '../../components/common/Pager.jsx';
import Sheet, { Page } from '../../components/common/Sheet.jsx';
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
import DataState from '../../components/common/DataState.jsx';
import DialogNotice, { PageNotice } from '../../components/common/DialogNotice.jsx';
import useReferenceData from '../../hooks/useReferenceData.js';
import reportError from '../../lib/reportError.js';
import { cn } from '../../lib/utils';
import { formalName } from '../../lib/names.js';
import { formatDate, formatZar } from '../../lib/format.js';
import { writeFailure } from '../../services/parseApiError.js';
import useFocusOn from '../../hooks/useFocusOn.js';

const PAGE_SIZE = 20;

/**
 * THE FIVE REFERENCE LISTS THIS SCREEN NEEDS, AND WHAT EACH ONE FEEDS. `06.1b`, EH-D9.
 *
 * 🔴 ALL FIVE USED TO LOAD WITH `.catch(err => console.error(err))`. A bad deploy could
 * empty the bank, province, area, branch, structure, role and channel selectors at once and
 * the screen would say NOTHING -- the dropdowns would simply be empty, which an administrator
 * reads as "this data does not exist" rather than "the server did not answer". Worse, it does
 * not block them: they pick the closest option they can see, and the silent failure becomes a
 * wrong record rather than a stopped task.
 *
 * 🔑 AT MODULE SCOPE BECAUSE `useReferenceData` REQUIRES A STABLE OBJECT. Rebuilt each
 * render, it would re-fetch forever -- which on screen is indistinguishable from a slow
 * backend, and is the failure this codebase already met once in `useAsyncOptions`.
 *
 * ⚠️ The KEYS are user-facing: they are what the partial banner names when a list is
 * missing. "roles" is what an administrator would call it; the service method is not.
 */
const REFERENCE_LOADERS = {
    banks: () => bankService.getBanks(),
    provinces: () => locationService.getProvinces(),
    structures: () => recruiterService.getStructures(),
    roles: () => recruiterService.getRoles(),
    'recruitment channels': () => recruitmentChannelService.getAll(),
};

/**
 * A date as this screen's dialogs print it (R3-OBS-3, taken 2026-09-18). The server sends `[y, m, d]`, and React
 * renders an array by concatenating it -- so Date Joined read `201941` for a member who joined on 1 April 2019, and
 * a recruiter's Election Date did the same. It is R3-F1's defect, one dialog away from where batch 5 fixed it.
 *
 * EMPTY STAYS EMPTY, because `DRow` prints its own em dash for a value that is not there; `formatDate` would print a
 * second one. Same rule, same shape, as `Members.jsx`'s `recordDate`.
 */
const recordDate = (value) => (value ? formatDate(value) : '');

/**
 * The Add Recruiter dialog's empty form, at module scope so the two places that need it --
 * the initial state and `handleCloseAddRep` -- cannot drift apart. `10.4`.
 *
 * 🔑 IT IS ALSO WHY THE DECLARATION MOVED. `react-hooks/immutability` reported
 * *"`setNewRepDetails` is accessed before it is declared"*: the `useState` sat about 150
 * lines BELOW the callback that uses it, between two unrelated handlers. The code was
 * correct -- a setter is referentially stable, so the closure always saw it -- but the
 * compiler cannot track a binding used above its declaration, and this arc's rule is to fix
 * the fact rather than silence the reporter. The declaration now sits with the other
 * `newRep*` state, and the literal it was duplicating is this constant.
 */
const EMPTY_REP_DETAILS = { roleId: null, recruiterTypeId: null, isElectedRep: false, electionDate: '', structureIds: [] };

export function Recruiters() {
    const [members, setMembers] = useState([]);
    const [reps, setReps] = useState([]);
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
    const [newRepDetails, setNewRepDetails] = useState(EMPTY_REP_DETAILS);

    /*
     * 🔴 THE TWO SEARCH DIALOGS OPEN ONTO THEIR SEARCH FIELD, AND IT USED TO BE `autoFocus` (`10.4`).
     *
     * ⚠️ REMOVING THE ATTRIBUTE WITHOUT REPLACING IT IS A REAL REGRESSION, NOT A NEUTRAL TIDY-UP. `autoFocus`
     * worked here by a timing accident: React focuses during COMMIT, Radix's focus scope runs in a PASSIVE
     * effect afterwards and only acts if it finds no focus inside the content -- so it found the search field
     * already focused and left it. Delete the attribute and Radix focuses the first tabbable thing instead,
     * which is the header's Close button, because the header renders before the children. You would open a
     * search dialog and your first keystroke would go nowhere.
     *
     * So the decision moves into the primitive: `Modal`'s `initialFocusRef`, which says out loud what the
     * attribute was achieving by accident. `Modal.initialFocus.test.jsx` holds the primitive; the pair in
     * `Recruiters.focus.test.jsx` holds these two call sites.
     */
    const addMemberSearchRef = useRef(null);
    const addRepSearchRef = useRef(null);
    const [selectedRepDetail, setSelectedRepDetail] = useState(null);
    const [editingRep, setEditingRep] = useState(false);
    const [editRepFields, setEditRepFields] = useState({ name: '', email: '', phone: '' });
    const [editRepErrors, setEditRepErrors] = useState({});
    const [repSearch, setRepSearch] = useState({ membershipNumber: '', name: '', bank: '', branch: '', status: '' });
    const [listState, setListState] = useState('loading');

    /*
     * ✅ THE FIVE SILENT `.catch(console.error)` LOADS, REPLACED BY ONE SET (EH-D9).
     *
     * `banksData`, `provincesData`, `structures`, `roles` and `recruitmentChannels` were five
     * separate `useState([])`s filled by five separate swallowing catches. They are one call
     * now, and the reason is the fourth state: "three of five answered" is not a fact any
     * individual fetch knows, so five booleans have nowhere to put it. `refs.state` is
     * `partial` when some arrived and `error` only when none did.
     */
    const refs = useReferenceData(REFERENCE_LOADERS);
    const banksData = refs.data.banks;
    const provincesData = refs.data.provinces;
    const structures = refs.data.structures;
    const roles = refs.data.roles;
    const recruitmentChannels = refs.data['recruitment channels'];

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
    const fail = useCallback((message) => setNotice({ tone: 'error', message }), []);
    // 🔴 `06.5`: AN ACTION THAT WORKED SAID NOTHING. A member added or removed, a recruiter created, its details saved --
    // each changed a list, often one behind the dialog, without a word. The same notice says so, as a status.
    const succeed = useCallback((message) => setNotice({ tone: 'ok', message }), []);

    /*
     * 🔴 EVERY `fail()` ON THIS SCREEN HAPPENS WITH A DIALOG OPEN (`06.4`), and the notice rendered on the
     * page -- under the dialog's scrim. A recruiter that could not be created, a member that could not be
     * assigned, details that could not be saved: each was announced where nobody could see it, and the
     * dialog looked exactly as if nothing had been tried. While a dialog is open the notice is the
     * dialog's (`DialogNotice`); when it closes, an unresolved notice is still on the page.
     */
    const dialogOpen = Boolean(selectedRep || selectedRepDetail || showAddRep || selectedMember);

    // Focus it once it EXISTS -- the same shape as `Auth` and `Members`, and for the same
    // reason: the element is not in the document at the moment the handler sets the state.
    // Also when a dialog closes over an unresolved notice, which is the moment it mounts here.
    // A failure takes focus; a confirmation is announced where it appears and leaves focus where the user is.
    const noticeRef = useFocusOn(notice, notice?.tone === 'error' && !dialogOpen);

    /*
     * 🔴 THE LOADING RESET MOVED TO THE RETRY PATH (`10.4`), AND THIS ONE HAD SEVEN CALLERS.
     *
     * `refreshAll` is called on mount, by Try again, and by five write handlers that reload the
     * lists after a save. The line that `react-hooks/set-state-in-effect` flagged was already
     * written defensively -- `current === 'ready' ? 'ready' : 'loading'` -- and that guard is
     * the proof this change is behaviour-preserving rather than a judgement:
     *
     *   on mount          `listState` is already 'loading'        -> no-op
     *   after a write     the table is 'ready', so the guard holds -> no-op. That is structural, not luck:
     *                     every write needs a ROW or a MEMBER from this same load, so no write can start
     *                     from a failed one. A write reachable from the error screen would break this.
     *   on Try again      'error' -> 'loading'                     -> THE ONLY REAL CASE
     *
     * So the five write handlers keep calling `refreshAll` unchanged, and the one case that
     * mattered is now stated plainly at the place it happens, in `retryAll`.
     */
    const refreshAll = useCallback(() => {
        return Promise.all([
            memberService.getMembers(),
            recruitmentChannelService.getAll(),
        ]).then(([m, r]) => {
            setMembers(m);
            setReps(r);
            setListState('ready');
        }).catch(err => {
            reportError('Recruiters.refreshAll', err);
            setListState('error');
        });
    }, []);

    // The reference lists are `useReferenceData`'s now; this effect owns only the two lists
    // the TABLE renders, whose failure is already a first-class `listState`.
    useEffect(() => {
        refreshAll();
    }, [refreshAll]);

    const retryAll = useCallback(() => { setListState('loading'); refreshAll(); }, [refreshAll]);

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
            // Numeric collation, so "Synthetic Channel 2" comes before "Synthetic Channel 10" (`06.3` critique).
            return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' })
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
    const handleCloseAddRep = useCallback(() => { setShowAddRep(false); setNewRepDetails(EMPTY_REP_DETAILS); }, []);
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
            // 🔁 03.4: NO `status`. A status is changed with *Change status*, with SASBO's code, and the PUT refuses one
            // that differs from the member's (STATUS_VIA_CHANGE_STATUS) -- so `member.status || 'Active'` would have had
            // every assign and remove on this screen refused for a member with no status on record. An omitted key
            // keeps the stored value (decision ⑨, server 0cf00e1).
            /*
             * 🔴 ONE LINE IS DELIBERATELY ABSENT HERE, AND TWO ARE DELIBERATELY STILL PRESENT.
             *
             * GONE: `recruitmentRep: member.recruitmentRep || ''`.
             *
             * ⚠️ `recruitmentRep` IS NOT A FIELD ON THE MEMBER DTO -- its wire name is
             * `recruitmentRepresentativeName`. So `member.recruitmentRep` was ALWAYS
             * undefined, the `|| ''` always fired, and the PUT always carried an empty
             * recruiter name. Where the server reads that key, a blank name means CLEAR:
             * every assign, every remove and every bulk deactivation on this screen wiped
             * the member's captured recruiter -- the exact field this screen exists to
             * manage. Reported by the Capture Member arc (findings.md R7-F1, hardening.md
             * H8), who own the DTO and could see the name mismatch from the other side.
             *
             * It survived this arc's own P4 rewrite because nothing here is wrong to READ:
             * every line looks like careful defensive defaulting, and a field that does not
             * exist looks exactly like the fields that do.
             *
             * 🔴 STILL PRESENT, AND ON PURPOSE: `currentBalance` and `arrearsBalance`.
             *
             * The same report flagged their `|| 0` -- correctly: it cannot tell "no balance
             * recorded" from "a balance of zero", so a member who had never been billed is
             * written back with a real zero. The obvious fix is to drop them the way
             * `recruitmentRep` was dropped, AND THAT WOULD BE WORSE. `MemberMapper` has no
             * `nullValuePropertyMappingStrategy`, so `updateFromMember` copies nulls: a PUT
             * that OMITS a field ERASES it. Dropping two real DTO fields would trade a
             * wrong zero for a null.
             *
             * 🔑 WHICH IS WHY `recruitmentRep` COULD GO AND THESE CANNOT. It is not a
             * property on the DTO at all, so its absence cannot null anything; these two
             * are, so their absence would. The standing rule: THIS BUILDER SENDS THE WHOLE
             * DTO. A key that is not on the DTO is removed; a key that is on it stays, even
             * when its default is imperfect.
             *
             * ✅ AND THE HOLD NOW HAS AN EXPIRY. The owner took decision ⑤ on 2026-09-10 as
             * ABSENT-KEEPS / BLANK-CLEARS: `updateFromMember` gets
             * `NullValuePropertyMappingStrategy.IGNORE`, so an omitted key keeps the stored
             * value and an explicit `''` clears it. Once that is COMMITTED on
             * `phase/capture-member`, these two lines should be deleted rather than fixed --
             * omitting them will then preserve whatever the member actually has, which is
             * the honest answer that neither `|| 0` nor a null can give.
             *
             * ⚠️ NOT YET. The decision is taken and the mapper change has not landed; until
             * it does, the current behaviour still erases an omitted field. The Capture
             * Member arc will say when it is committed.
             */
            // 📨 2026-09-10, from the server arc: decision ⑨ (absent keeps, blank clears) is on
            // the server at 0cf00e1 -- but the stack THIS branch runs against is the
            // phase-07-orchestration jar, whose mapper still copies nulls. These two lines
            // become removable when the server this client is pointed at carries 0cf00e1,
            // not because the decision exists. Delete them on the strength of the decision
            // alone and every recruiter action erases both balances again.
            // ✅ 2026-09-21 (ACB 00.2): `monthlySubscription`, `currentBalance` and `arrearsBalance` are GONE from
            // this builder, as the note above said they would be. Server `0cf00e1` -- `updateFromMember` with
            // `NullValuePropertyMappingStrategy.IGNORE` -- is on `origin/main`, measured with `git merge-base`: an
            // omitted key now KEEPS the stored value, where `|| 0` wrote a member with nothing on file back as R 0,00.
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
            succeed(`${formalName(member) || 'That member'} was added to ${selectedRep?.name ?? 'this recruiter'}.`);
        } catch (err) {
            fail(`That member could not be assigned to ${selectedRep?.name ?? 'this recruiter'}. ${err?.message || ''}`.trim());
        } finally {
            setSaving(false);
        }
    }, [selectedRep, refreshAll, fail, succeed]);

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
            succeed(`${formalName(member) || 'That member'} was removed from ${selectedRep?.name ?? 'the recruiter'}.`);
        } catch (err) {
            fail(writeFailure(err, `${formalName(member) || 'That member'}'s removal from the recruiter`, 'the recruiter'));
        } finally {
            setSaving(false);
        }
    };

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
            setNewRepDetails(EMPTY_REP_DETAILS);
            setSelectedRep({ id: createdRep?.id, name: repName });
            succeed(`${repName} is a recruiter now.`);
        } catch (err) {
            fail(writeFailure(err, 'That recruiter', 'the list'));
        } finally {
            setSaving(false);
        }
    };

    /**
     * The members a channel's removal touches: those recruited through it. The wire carries the channel by NAME
     * (`recruitedHow`, `MemberMapper`), and the server clears exactly these.
     */
    const channelMembers = useCallback((rep) => members.filter(m => m.recruitedHow === rep.name), [members]);

    /**
     * 🔒 A49, corrected on the owner's decision of 2026-10-01 (MO21): *Remove recruiter* removes the recruitment channel
     * this screen listed, and its members KEEP THEIR STATUS, with only their channel cleared.
     *
     * One request: the server clears the channel from its members and deletes it in one transaction, so a removal is
     * whole or nothing and no member is written from here. It used to PUT every member it guessed at -- by a
     * representative's id, compared with a channel's -- as `Inactive`, a status no list knows, and then DELETE the
     * representative that happened to share the channel's number, after the members had been changed.
     */
    const handleRemoveRep = async () => {
        const rep = pendingRemoveRep;
        if (!rep) return;
        setPendingRemoveRep(null);
        try {
            setSaving(true);
            await recruitmentChannelService.remove(rep.id);
            if (selectedRep?.id === rep.id) setSelectedRep(null);
            await refreshAll();
            succeed(`${rep.name} was removed. Its members keep their status; only their recruitment channel was cleared.`);
        } catch (err) {
            fail(writeFailure(err, `${rep.name}'s removal`, 'the list'));
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
        { key: 'banks', header: 'Bank(s)', priority: 'secondary', truncate: true, cell: (r) => r.banks || <span className="text-ink-muted">—</span> },
        { key: 'branches', header: 'Branch(es)', priority: 'secondary', truncate: true, cell: (r) => r.branches || <span className="text-ink-muted">—</span> },
        { key: 'provinces', header: 'Province', priority: 'secondary', truncate: true, cell: (r) => r.provinces || <span className="text-ink-muted">—</span> },
        { key: 'areas', header: 'Area', priority: 'secondary', truncate: true, cell: (r) => r.areas || <span className="text-ink-muted">—</span> },
        {
            key: 'count',
            header: 'Members',
            priority: 'essential',
            align: 'right',
            cell: (rep) => (
                <span className={cn('tabular-nums', rep.count ? 'font-semibold text-ink' : 'text-ink-muted')}>
                    {rep.count ?? 0}
                </span>
            ),
        },
        // Removal lives in the recruiter's record (the modal's foot), not in the register:
        // the world holds actions in the record, and status red is a status colour, not
        // an action colour. The finish review of 2026-09-10 named the red column in every
        // row as the one thing on this screen the Card world does not do.
        //
        // ♻️ `saving` left this memo with that column: no cell reads it any more, and a
        // dependency nothing depends on is a re-render nobody asked for.
    ], []);

    /** A member as it appears on a recruiter's list. */
    const memberColumn = useCallback((onOpen) => ({
        key: 'membershipNumber',
        header: 'Membership No.',
        priority: 'essential',
        cell: (m) => (
            <button
                type="button"
                onClick={() => onOpen(m)}
                aria-label={`${m.membershipNumber || 'This member'} — open the record for ${formalName(m) || 'this member'}`}
                className="touch-target rounded-sm font-medium text-brand-ink underline-offset-2 hover-hover:hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
            >
                {m.membershipNumber}
            </button>
        ),
    }), []);

    const fullName = (m) => formalName(m) || '—';

    const repMemberColumns = useMemo(() => [
        memberColumn(setSelectedMember),
        // Capped so the list fits its xl dialog whatever the names: 142 + 192 + 160 + 160 + 108 + 82 = 844px of
        // the dialog's ~894. Truncated in the cell, whole in its title.
        { key: 'name', header: 'Name', priority: 'essential', truncate: true, className: 'max-w-[12rem]', cell: fullName },
        { key: 'bankName', header: 'Bank', priority: 'secondary', truncate: true, className: 'max-w-[10rem]', cell: (m) => m.bankName || '—' },
        { key: 'branch', header: 'Branch', priority: 'secondary', truncate: true, className: 'max-w-[10rem]', cell: (m) => m.branch || '—' },
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
                    // Quiet until meant: the red is a status colour in this world, so it
                    // appears only under the pointer that is about to act.
                    className="text-ink-muted hover-hover:hover:text-status-suspended"
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
        <Page>
            <PageTitle
                title="Recruiters"
                subtitle="Browse Sasbo recruiters and the members they recruit."
                actions={
                    <Button variant="primary" onClick={handleOpenAddRep}>
                        <UserPlus size={16} strokeWidth={1.75} aria-hidden="true" /> Add Recruiter
                    </Button>
                }
            />

            {/* 🔴 WHAT SIX `alert()` CALLS BECAME. Focused rather than `role="alert"`:
                the primitives already give inline field errors that role, and stacking a
                page-level live region on top means two announcements for one failure.
                Dismissible, because unlike a validation summary this describes something
                that already happened and the member may simply want it out of the way. */}
            {notice && !dialogOpen && (
                <PageNotice ref={noticeRef} id="recruiters-notice-title" tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.message}</PageNotice>
            )}

            {/* ✅ THE FOURTH STATE, ON THE SCREEN THAT NEEDED IT MOST (EH-D9).

                Five reference lists feed the filters, the assign dialog and the recruiter
                form. When some of them fail this says WHICH -- because "some options are
                missing" that does not name them leaves an administrator checking every
                dropdown, and because the ones that DID arrive are still correct and still
                worth using.

                🔴 IT IS NOT AN ERROR STATE AND IT DOES NOT BLANK THE PAGE. The recruiter
                table below is fed by `listState`, which is a different fetch with its own
                error state. A missing province list must not hide a recruiter list that
                loaded perfectly well -- that over-correction is the reason this unit
                distinguishes `partial` from `error` at all. */}
            {(refs.state === 'partial' || refs.state === 'error') && (
                <div className="mt-4 rounded-lg bg-surface shadow-(--shadow-1)">
                    <DataState
                        state={refs.state}
                        layout="row"
                        compact
                        onRetry={refs.retry}
                        title={
                            refs.state === 'error'
                                ? 'None of this page’s reference lists could be loaded.'
                                : 'Some option lists are missing.'
                        }
                        message={
                            refs.state === 'error'
                                ? 'The filters and forms below have no options to offer until this succeeds.'
                                // 🔴 "EVERYTHING ELSE ON THIS PAGE IS UP TO DATE" WAS SAID WHATEVER THE RECRUITER LIST HAD DONE (`06.4`)
                                // -- while it was loading, and when it had failed as well. It is said once the list has loaded.
                                : `${refs.failed.join(', ').replace(/^./, (c) => c.toUpperCase())} did not load.${listState === 'ready' ? ' The recruiter list below is complete.' : ''}`
                        }
                    />
                </div>
            )}
            {/* card.html's arrangement, applied by rule: the criteria printed on the page,
                the register as the sheet beneath them with its pager at the foot. */}
            <Criteria className="mt-5">
                <TextInput className={CRITERION_WIDE} label="Recruiter Name" value={filters.repName} onChange={handleFilter('repName')} placeholder="Any" />
                <SearchableSelect className={CRITERION} label="Bank" value={filters.bankName} onChange={handleFilter('bankName')} placeholder="All banks" {...refs.field('banks')}
                                  options={[{ value: '', label: 'All banks' }, ...BANK_NAMES.map(b => ({ value: b, label: b }))]} />
                <SearchableSelect className={CRITERION} label="Branch" value={filters.branch} onChange={handleFilter('branch')} placeholder="Any" {...refs.field('banks')}
                                  options={[{ value: '', label: 'All branches' }, ...BRANCHES.map(b => ({ value: b, label: b }))]} />
                <SearchableSelect className={CRITERION} label="Province" value={filters.province} onChange={handleFilter('province')} placeholder="Any" {...refs.field('provinces')}
                                  options={[{ value: '', label: 'All provinces' }, ...PROVINCES.map(p => ({ value: p, label: p }))]} />
                <SearchableSelect className={CRITERION} label="Area" value={filters.area} onChange={handleFilter('area')} placeholder="Any" {...refs.field('banks')}
                                  options={[{ value: '', label: 'All areas' }, ...AREAS.map(a => ({ value: a, label: a }))]} />
                <Button variant="ghost" onClick={handleClear}>Clear</Button>
            </Criteria>

            <Sheet className="mt-4">
                {/* 🔴 WAS A `grid-cols-7` PSEUDO-TABLE WITH `<div onClick>` ROWS. No header
                    relationship for a screen reader, no tab stop on the row, and the
                    "Remove" control lived inside a clickable row with
                    `onClick={e => e.stopPropagation()}` wrapped around it -- which works
                    for a mouse and does nothing for a keyboard. */}
                <div>
                    <Table
                        caption="Recruitment channels and the members they recruit"
                        columns={recruiterColumns}
                        rows={visible}
                        rowKey="id"
                        loading={listState === 'loading'}
                        error={listState === 'error' ? 'We could not load the recruiters.' : null}
                        onRetry={retryAll}
                        emptyTitle="No recruiters match these criteria"
                        emptyMessage="Clear the criteria to see every recruiter, or add a new one."
                        emptyAction={<Button onClick={handleClear}>Clear</Button>}
                    />
                </div>
                <Pager
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    count={filtered.length}
                    error={listState === 'error'}
                    start={(page - 1) * PAGE_SIZE + 1}
                    end={Math.min(page * PAGE_SIZE, filtered.length)}
                    noun="recruiters"
                    loading={listState === 'loading'}
                />
            </Sheet>

            {/* THE RECRUITER'S RECORD IS A DIALOG, AND THAT IS A DECISION, NOT AN OVERSIGHT.
                🗣️ The direction contract refuses "a modal for tasks that need neither
                interruption nor protected focus: the record edits in place", and the member
                record obeys it — it is the docked third column. This surface is a different
                shape: it is not a record you read and edit in place, it is a LIST you work
                on — filter this channel's members, add one, remove one — and the panel it
                would dock into is `clamp(424px, 32vw, 448px)`. A five-column members table
                with its own criteria row does not fit in 448px; forcing it there would
                trade a correct pattern for a cramped one and lose the task.
                The dialog is the world's own surface: same radius, same shadow-2, same
                buttons, same chips, the primary action last and the destructive one apart. */}
            {selectedRep && !selectedMember && (
                <Modal
                    open
                    onOpenChange={closeOn(handleCloseRepModal)}
                    title={selectedRep.name}
                    description="Recruitment channel"
                    // xl, with the member list's text columns capped below: at lg (672px) its six columns
                    // needed 858px and put Status and Remove off the right edge (the `06.3` critique).
                    size="xl"
                    footer={
                        <>
                            <Button
                                variant="danger"
                                onClick={() => setPendingRemoveRep(selectedRep)}
                                disabled={saving}
                                className="mr-auto"
                            >
                                <UserMinus size={16} strokeWidth={1.75} aria-hidden="true" /> Remove recruiter
                            </Button>
                            <Button onClick={handleCloseRepModal}>Close</Button>
                            <Button variant="primary" onClick={handleOpenAddMember}>
                                <UserPlus size={16} strokeWidth={1.75} aria-hidden="true" /> Add Member
                            </Button>
                        </>
                    }
                >
                        <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
                        <div className="flex items-center justify-between pb-4">
                            <div>
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
                        </div>
                        <div>
                            {/* A section head in this world is small capitals in muted ink,
                                left, over a hairline -- card.css `.fieldgroup__title`. It was
                                centred and set in the brand's ink, which is the one weight
                                nothing but a page title and a primary action carries. */}
                            <h3 className="border-b border-line pb-2.5 pt-4 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
                                Members ({repMembers.length})
                            </h3>
                            {/* 🔴 FIVE RAW `<input>` TAGS WITH `aria-label` AND NO VISIBLE
                                LABEL. They read as a header row of search boxes, which is
                                the intent -- but a placeholder is not a label: it vanishes
                                the moment anything is typed, so a member who looks away
                                has no way to tell which column each box filters.
                                `TextInput` carries a real one.

                                🔴 AND THEY ARE NO LONGER COLUMN-ALIGNED. Five labelled
                                fields in a five-column grid, sitting directly on a
                                six-column table head, rendered as TWO header rows that did
                                not line up: NAME at x=534 against the head's 611. They are
                                the register's criteria, so they read as criteria -- on the
                                dialog's own ground, above a table that carries its own
                                head inside a hairline. */}
                            <Criteria label="Filter this recruiter's members" className="py-3">
                                <TextInput className={CRITERION} label="Membership no." kind="search" value={repSearch.membershipNumber || ''} onChange={handleRepSearchChange('membershipNumber')} placeholder="Any" />
                                <TextInput className={CRITERION} label="Name" kind="search" value={repSearch.name || ''} onChange={handleRepSearchChange('name')} placeholder="Any" />
                                <TextInput className={CRITERION} label="Bank" kind="search" value={repSearch.bank || ''} onChange={handleRepSearchChange('bank')} placeholder="Any" />
                                <TextInput className={CRITERION} label="Branch" kind="search" value={repSearch.branch || ''} onChange={handleRepSearchChange('branch')} placeholder="Any" />
                                <TextInput className={CRITERION} label="Status" kind="search" value={repSearch.status || ''} onChange={handleRepSearchChange('status')} placeholder="Any" />
                            </Criteria>
                            <div className="overflow-hidden rounded-lg border border-line">
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
                    initialFocusRef={addMemberSearchRef}
                    footer={<Button onClick={handleCloseAddMember}>Cancel</Button>}
                >
                        <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
                        <div className="pb-3">
                            <TextInput
                                label="Search members"
                                kind="search"
                                ref={addMemberSearchRef}
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
                        <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
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
                                    {...refs.field('recruitment channels')}
                                    placeholder="Select recruitment channel..."
                                    options={RECRUITMENT_CHANNELS.map(rt => ({ value: rt.id, label: rt.name }))}
                                    onChange={(next) => setEditRepFields(p => ({ ...p, recruiterTypeId: next ? Number(next) : null }))}
                                />
                                <SelectInput
                                    label="Role"
                                    value={editRepFields.roleId ?? ''}
                                    {...refs.field('roles')}
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
                                    {...refs.field('structures')}
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
                                {selectedRepDetail.isElectedRep && <DRow label="Election Date" value={recordDate(selectedRepDetail.electionDate)} />}
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
                                                    succeed('Those recruiter details are saved.');
                                                } catch (err) {
                                                    fail(writeFailure(err, 'Those recruiter details', 'the recruiter'));
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
                    initialFocusRef={addRepSearchRef}
                    footer={
                        <>
                            <Button onClick={handleCloseAddRep}>Cancel</Button>
                            <Button variant="primary" onClick={handleAddRep} disabled={!newRepMember} loading={saving}>
                                <UserPlus size={14} /> Make Recruiter
                            </Button>
                        </>
                    }
                >
                        <DialogNotice notice={notice} onDismiss={() => setNotice(null)} />
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
                                ref={addRepSearchRef}
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
                                    {...refs.field('recruitment channels')}
                                    placeholder="Select recruiter type..."
                                    options={RECRUITMENT_CHANNELS.map(rt => ({ value: rt.id, label: rt.name }))}
                                    onChange={(next) => setNewRepDetails(p => ({ ...p, recruiterTypeId: next ? Number(next) : null }))}
                                />
                                <SelectInput
                                    label="Role"
                                    value={newRepDetails.roleId ?? ''}
                                    {...refs.field('roles')}
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
                                    {...refs.field('structures')}
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
                                    <DRow label="Date Joined" value={recordDate(selectedMember.joinDate)} />
                                    <DRow label="Status" value={selectedMember.status} />
                                    <DRow label="Monthly Subs" value={formatZar(selectedMember.monthlySubscription)} />
                                    <DRow label="Current Balance" value={selectedMember.currentBalance} />
                                    <DRow label="Arrears Balance" value={selectedMember.arrearsBalance} />
                                </Section>
                                <Section title="Recruiters">
                                    <DRow label="Area's Rep" value={selectedMember.areasRep} />
                                    {/* 🔴 IT READ `recruitmentRep`, WHICH THE API DOES NOT SEND (`06.4`): `MemberDto` carries
                                        `recruitmentRepresentativeId` and `recruitmentRepresentativeName`, so this row was a dash for
                                        every member -- on the screen whose subject is who recruited whom. */}
                                    <DRow label="Recruitment Rep" value={selectedMember.recruitmentRepresentativeName} />
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
                onConfirm={handleRemove}
            />

            <ConfirmDialog
                open={Boolean(pendingRemoveRep)}
                onOpenChange={closeOn(() => setPendingRemoveRep(null))}
                title="Remove this recruiter?"
                confirmLabel="Remove recruiter"
                onConfirm={handleRemoveRep}
            >
                {/* 🔑 The consequence is SPELLED OUT, as it always was here -- now the true one (A49, MO21): the
                    channel goes, and the members recruited through it keep their status. */}
                {pendingRemoveRep && (
                    <p className="text-sm text-ink">
                        <strong className="font-medium">{pendingRemoveRep.name}</strong> will be removed.{' '}
                        <strong className="font-medium">{channelMembers(pendingRemoveRep).length}</strong>{' '}
                        member(s) recruited through it keep their status; only their recruitment channel is cleared.
                    </p>
                )}
            </ConfirmDialog>
        </Page>
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
            <p className={`text-sm font-semibold text-ink ${className}`}>{value === 0 ? '0' : value || '—'}</p>
        </div>
    );
}
