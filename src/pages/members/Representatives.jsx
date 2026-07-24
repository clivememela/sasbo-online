import { useMemo, useState, useEffect, useCallback } from 'react';
import { ChevronRight, UserPlus, Trash2, UserMinus, Eye } from 'lucide-react';
import PageTitle from '../../components/common/PageTitle';
import { TextInput, SearchableSelect, Button } from '../../components/form';
import { memberService } from '../../services/memberService.js';
import { representativeService } from '../../services/representativeService.js';
import { bankService } from '../../services/bankService.js';
import { locationService } from '../../services/locationService.js';

const PAGE_SIZE = 20;

export function Representatives() {
    const [members, setMembers] = useState([]);
    const [reps, setReps] = useState([]);   // [{id, name}, ...] from API
    const [banksData, setBanksData] = useState([]);
    const [provincesData, setProvincesData] = useState([]);
    const [filters, setFilters] = useState({repName: '', bankName: '', branch: '', province: '', area: ''});
    const [page, setPage] = useState(1);
    const [selectedRep, setSelectedRep] = useState(null);   // rep name string
    const [selectedMember, setSelectedMember] = useState(null); // full member object
    const [showAddMember, setShowAddMember] = useState(false);
    const [addSearch, setAddSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [showAddRep, setShowAddRep] = useState(false);
    const [newRepName, setNewRepName] = useState('');
    const [newRepFields, setNewRepFields] = useState({bank: '', branch: '', province: '', area: ''});
    const [selectedRepDetail, setSelectedRepDetail] = useState(null);
    const [editingRep, setEditingRep] = useState(false);
    const [editRepFields, setEditRepFields] = useState({name: '', email: '', phone: ''});
    const [repSearch, setRepSearch] = useState({membershipNumber: '', name: '', bank: '', branch: '', status: ''});

    const refreshAll = useCallback(() => Promise.all([
        memberService.getMembers(),
        representativeService.getAll(),
    ]).then(([m, r]) => {
        setMembers(m);
        setReps(r);
    }), []);

    useEffect(() => {
        refreshAll();
        bankService.getBanks().then(setBanksData);
        locationService.getProvinces().then(setProvincesData);
    }, [refreshAll]);

    const BANK_NAMES = useMemo(() => [...new Set(banksData.map(b => b.bankName).filter(Boolean))].sort(), [banksData]);
    const PROVINCES = useMemo(() => provincesData.map(p => p.name).filter(Boolean).sort(), [provincesData]);
    const AREAS = useMemo(() => [...new Set(banksData.map(b => b.area).filter(Boolean))].sort(), [banksData]);
    const BRANCHES = useMemo(() => [...new Set(banksData.map(b => b.branchName).filter(Boolean))].sort(), [banksData]);

    // Derived dropdowns for Add Rep modal (cascade from selected bank)
    const modalBranches = useMemo(() => {
        const rows = newRepFields.bank ? banksData.filter(b => b.bankName === newRepFields.bank) : banksData;
        return [...new Set(rows.map(b => b.branchName).filter(Boolean))].sort();
    }, [banksData, newRepFields.bank]);

    const modalProvinces = useMemo(() => provincesData.map(p => p.name).filter(Boolean).sort(), [provincesData]);

    const modalAreas = useMemo(() => {
        let rows = banksData;
        if (newRepFields.branch) {
            rows = banksData.filter(b => b.branchName === newRepFields.branch);
        } else if (newRepFields.bank) {
            rows = banksData.filter(b => b.bankName === newRepFields.bank);
        }
        return [...new Set(rows.map(b => b.area).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));
    }, [banksData, newRepFields.bank, newRepFields.branch]);

    // bankName -> { province, area }
    const BANK_META = useMemo(() => {
        const meta = {};
        banksData.forEach(b => {
            meta[b.bankName] = {province: b.provinceCommitteeName, area: b.area};
        });
        return meta;
    }, [banksData]);

    // Build rep list from API reps, enriched with derived member data
    const repList = useMemo(() => {
        const memberMap = {};
        members.forEach(m => {
            const name = m.areasRep?.trim();
            if (!name) return;
            if (!memberMap[name]) memberMap[name] = {
                bankSet: new Set(),
                branchSet: new Set(),
                provinceSet: new Set(),
                areaSet: new Set(),
                count: 0
            };
            memberMap[name].bankSet.add(m.bankName ?? '');
            memberMap[name].branchSet.add(m.branch ?? '');
            const meta = BANK_META[m.bankName] || {};
            if (meta.province) memberMap[name].provinceSet.add(meta.province);
            if (meta.area) memberMap[name].areaSet.add(meta.area);
            memberMap[name].count++;
        });
        return reps.map(r => {
            const d = memberMap[r.name] || {
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
                banks: [...d.bankSet].filter(Boolean).join(', '),
                branches: [...d.branchSet].filter(Boolean).join(', '),
                provinces: [...d.provinceSet].join(', '),
                areas: [...d.areaSet].join(', '),
                count: d.count,
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [members, reps, BANK_META]);

    const filtered = useMemo(() => {
        const q = v => v.trim().toLowerCase();
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
        setFilters(p => ({...p, [field]: e.target.value}));
        setPage(1);
    }, []);
    const handleClear = useCallback(() => {
        setFilters({repName: '', bankName: '', branch: '', province: '', area: ''});
        setPage(1);
    }, []);

    // Members represented by the selected rep
    const repMembers = useMemo(() =>
            selectedRep ? members.filter(m => m.areasRep?.trim() === selectedRep) : [],
        [selectedRep, members]);

    const filteredRepMembers = useMemo(() => {
        const {membershipNumber, name, bank, branch, status} = repSearch;
        return repMembers.filter(m =>
            (!membershipNumber || m.membershipNumber.toLowerCase().includes(membershipNumber.toLowerCase())) &&
            (!name || `${m.initials} ${m.surname}`.toLowerCase().includes(name.toLowerCase())) &&
            (!bank || (m.bankName ?? '').toLowerCase().includes(bank.toLowerCase())) &&
            (!branch || (m.branch ?? '').toLowerCase().includes(branch.toLowerCase())) &&
            (!status || (m.status ?? '').toLowerCase().includes(status.toLowerCase()))
        );
    }, [repMembers, repSearch]);

    // Members NOT yet assigned to this rep (candidates to add)
    const candidateMembers = useMemo(() => {
        const q = addSearch.trim().toLowerCase();
        return members.filter(m => {
            if (m.areasRep?.trim() === selectedRep) return false;
            if (!q) return true;
            return (
                m.membershipNumber.toLowerCase().includes(q) ||
                `${m.initials} ${m.surname}`.toLowerCase().includes(q) ||
                (m.firstNames ?? '').toLowerCase().includes(q) ||
                (m.bankName ?? '').toLowerCase().includes(q)
            );
        });
    }, [members, selectedRep, addSearch]);

    const handleCloseRepModal = useCallback(() => {
        setSelectedRep(null);
        setRepSearch({membershipNumber: '', name: '', bank: '', branch: '', status: ''});
    }, []);
    const handleCloseMemberModal = useCallback(() => setSelectedMember(null), []);
    const handleCloseAddMember = useCallback(() => setShowAddMember(false), []);
    const handleCloseAddRep = useCallback(() => setShowAddRep(false), []);
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
        setNewRepName('');
        setNewRepFields({bank: '', branch: '', province: '', area: ''});
    }, []);
    const handlePrevPage = useCallback(() => setPage(p => Math.max(1, p - 1)), []);
    const handleNextPage = useCallback(() => setPage(p => Math.min(totalPages, p + 1)), [totalPages]);

    const handleAssign = async (member) => {
        setSaving(true);
        await memberService.updateMember({...member, areasRep: selectedRep});
        await refreshAll();
        setSaving(false);
    };

    const handleRemove = async (member) => {
        if (!window.confirm(`Remove ${member.initials} ${member.surname} from ${selectedRep}'s list?`)) return;
        setSaving(true);
        await memberService.updateMember({...member, areasRep: ''});
        await refreshAll();
        setSaving(false);
    };

    const handleAddRep = async () => {
        const name = newRepName.trim();
        if (!name) return;
        if (repList.some(r => r.name.toLowerCase() === name.toLowerCase())) {
            alert('A representative with that name already exists.');
            return;
        }
        setShowAddRep(false);
        setNewRepName('');
        setNewRepFields({bank: '', branch: '', province: '', area: ''});
        setSelectedRep(name);
        setShowAddMember(true);
        setAddSearch('');
    };

    const handleRemoveRep = async (rep) => {
        const repMems = members.filter(m => m.areasRep?.trim() === rep.name);
        if (!window.confirm(`Remove representative "${rep.name}"? This will set ${repMems.length} member(s) to Inactive and clear their rep assignment.`)) return;
        setSaving(true);
        await Promise.all(repMems.map(m =>
            memberService.updateMember({...m, areasRep: '', status: 'Inactive'})
        ));
        await representativeService.remove(rep.id);
        await refreshAll();
        setSaving(false);
    };

    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <PageTitle title="Representatives"/>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
                Browse Sasbo representatives and the members they represent
            </p>

            <div className="max-w-6xl mx-auto p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <TextInput label="Rep Name" value={filters.repName} onChange={handleFilter('repName')}
                               placeholder="Search rep name"/>
                    <SearchableSelect label="Bank Name" value={filters.bankName} onChange={handleFilter('bankName')}
                                      placeholder="All Banks"
                                      options={[{value: '', label: 'All Banks'}, ...BANK_NAMES.map(b => ({
                                          value: b,
                                          label: b
                                      }))]}/>
                    <SearchableSelect label="Branch" value={filters.branch} onChange={handleFilter('branch')}
                                      options={[{value: '', label: 'All Branches'}, ...BRANCHES.map(b => ({
                                          value: b,
                                          label: b
                                      }))]}/>
                    <SearchableSelect label="Province" value={filters.province} onChange={handleFilter('province')}
                                      options={[{value: '', label: 'All Provinces'}, ...PROVINCES.map(p => ({
                                          value: p,
                                          label: p
                                      }))]}/>
                    <SearchableSelect label="Area" value={filters.area} onChange={handleFilter('area')}
                                      options={[{value: '', label: 'All Areas'}, ...AREAS.map(a => ({
                                          value: a,
                                          label: a
                                      }))]}/>
                </div>

                {/* Toolbar */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="text-gray-600 dark:text-gray-300">
                        {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} representatives
                    </span>
                    <div className="flex items-center gap-2">
                        <Button variant="pagination" onClick={handlePrevPage}
                                disabled={page === 1}>Prev</Button>
                        <span className="text-gray-600 dark:text-gray-300">Page {page} of {totalPages}</span>
                        <Button variant="pagination" onClick={handleNextPage}
                                disabled={page === totalPages}>Next</Button>
                        <Button onClick={handleClear}>Clear</Button>
                        <Button variant="primary" onClick={handleOpenAddRep}>
                            <UserPlus size={14}/> Add Rep
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="mt-4 rounded-xl overflow-hidden border border-transparent max-h-[60vh] overflow-y-auto">
                    <div
                        className="grid grid-cols-7 gap-3 px-4 py-3 text-xs uppercase tracking-wide bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300 sticky top-0 z-10">
                        <div>Representative</div>
                        <div>Bank(s)</div>
                        <div>Branch(es)</div>
                        <div>Province</div>
                        <div>Area</div>
                        <div>Members</div>
                        <div className="flex justify-end">Remove</div>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {visible.length === 0 ? (
                            <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">No representatives match
                                your search.</div>
                        ) : visible.map(r => (
                            <div key={r.name}
                                 onClick={() => setSelectedRep(r.name)}
                                 className="grid grid-cols-7 gap-3 px-4 py-3 text-sm bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition items-center">
                                <div className="font-medium flex items-center gap-1">
                                    {r.name}
                                    <ChevronRight size={14} className="text-gray-400 shrink-0"/>
                                </div>
                                <div className="truncate text-xs text-gray-600 dark:text-gray-400"
                                     title={r.banks}>{r.banks || '—'}</div>
                                <div className="truncate text-xs text-gray-600 dark:text-gray-400"
                                     title={r.branches}>{r.branches || '—'}</div>
                                <div
                                    className="truncate text-xs text-gray-600 dark:text-gray-400">{r.provinces || '—'}</div>
                                <div
                                    className="truncate text-xs text-gray-600 dark:text-gray-400">{r.areas || '—'}</div>
                                <div>
                                    <span
                                        className="px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                                        {r.count}
                                    </span>
                                </div>
                                <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => handleRemoveRep(r)}
                                        disabled={saving}
                                        title="Remove representative"
                                        className="p-1.5 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition disabled:opacity-40">
                                        <UserMinus size={14}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Rep Members Modal */}
            {selectedRep && !selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog"
                     aria-modal="true">
                    <div className="absolute inset-0 bg-black/50" onClick={handleCloseRepModal}/>
                    <div
                        className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        {/* Header */}
                        <div
                            className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <div>
                                <p className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Representative</p>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold text-cyan-700 dark:text-cyan-400">{selectedRep}</h3>
                                    <div className="relative group">
                                        <button
                                            onClick={() => {
                                                const rep = repList.find(r => r.name === selectedRep);
                                                setSelectedRepDetail(rep);
                                                setEditingRep(false);
                                                setEditRepFields({
                                                    name: rep?.name || '',
                                                    email: rep?.email || '',
                                                    phone: rep?.phone || ''
                                                });
                                            }}
                                            className="p-1 rounded-md text-cyan-500 hover:bg-cyan-50 hover:text-cyan-700 dark:hover:bg-cyan-900/20 transition">
                                            <Eye size={14}/>
                                        </button>
                                        <span
                                            className="absolute left-1/2 -translate-x-1/2 top-7 z-50 whitespace-nowrap rounded-md bg-gray-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                                            View representative details
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span
                                    className="text-sm text-gray-500 dark:text-gray-400">{repMembers.length} member{repMembers.length !== 1 ? 's' : ''}</span>
                                <CloseBtn onClick={handleCloseRepModal}/>
                            </div>
                        </div>

                        {/* Members list */}
                        <div className="overflow-y-auto flex-1">
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-center">
                                <h4 className="text-sm font-semibold text-cyan-700 dark:text-cyan-400">Members
                                    ({repMembers.length})</h4>
                            </div>
                            <div
                                className="grid grid-cols-5 gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                                <input value={repSearch.membershipNumber}
                                       onChange={e => setRepSearch(p => ({...p, membershipNumber: e.target.value}))}
                                       placeholder="Membership No."
                                       aria-label="Filter by membership number"
                                       className="rounded-lg px-3 py-1.5 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                                <input value={repSearch.name}
                                       onChange={e => setRepSearch(p => ({...p, name: e.target.value}))}
                                       placeholder="Name"
                                       aria-label="Filter by name"
                                       className="rounded-lg px-3 py-1.5 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                                <input value={repSearch.bank}
                                       onChange={e => setRepSearch(p => ({...p, bank: e.target.value}))}
                                       placeholder="Bank"
                                       aria-label="Filter by bank"
                                       className="rounded-lg px-3 py-1.5 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                                <input value={repSearch.branch}
                                       onChange={e => setRepSearch(p => ({...p, branch: e.target.value}))}
                                       placeholder="Branch"
                                       aria-label="Filter by branch"
                                       className="rounded-lg px-3 py-1.5 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                                <input value={repSearch.status}
                                       onChange={e => setRepSearch(p => ({...p, status: e.target.value}))}
                                       placeholder="Status"
                                       aria-label="Filter by status"
                                       className="rounded-lg px-3 py-1.5 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                            </div>
                            <div
                                className="grid grid-cols-6 gap-3 px-4 py-2 text-xs uppercase tracking-wide bg-gray-50 text-gray-500 dark:bg-gray-900/50 dark:text-gray-400 sticky top-0">
                                <div>Membership No.</div>
                                <div>Name</div>
                                <div>Bank</div>
                                <div>Branch</div>
                                <div>Status</div>
                                <div></div>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredRepMembers.length === 0 ? (
                                    <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">No members
                                        found.</div>
                                ) : filteredRepMembers.map(m => (
                                    <div key={m.id}
                                         className="grid grid-cols-6 gap-3 px-4 py-3 text-sm items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                        <div
                                            className="font-medium text-cyan-700 dark:text-cyan-400 cursor-pointer hover:underline"
                                            onClick={() => setSelectedMember(m)}>
                                            {m.membershipNumber}
                                        </div>
                                        <div
                                            className="truncate cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400"
                                            onClick={() => setSelectedMember(m)}>
                                            {m.title ? `${m.title} ` : ''}{m.initials} {m.surname}
                                        </div>
                                        <div
                                            className="truncate text-xs text-gray-600 dark:text-gray-400">{m.bankName}</div>
                                        <div
                                            className="truncate text-xs text-gray-600 dark:text-gray-400">{m.branch}</div>
                                        <div><StatusBadge status={m.status}/></div>
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => handleRemove(m)}
                                                disabled={saving}
                                                title="Remove from rep"
                                                className="p-1.5 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition disabled:opacity-40">
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div
                            className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
                            <Button variant="primary" onClick={handleOpenAddMember}>
                                <UserPlus size={14}/> Add Member
                            </Button>
                            <Button onClick={handleCloseRepModal}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Member Picker */}
            {showAddMember && selectedRep && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog"
                     aria-modal="true">
                    <div className="absolute inset-0 bg-black/60" onClick={handleCloseAddMember}/>
                    <div
                        className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div
                            className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <div>
                                <p className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Add
                                    member to</p>
                                <h3 className="text-base font-semibold text-cyan-700 dark:text-cyan-400">{selectedRep}</h3>
                            </div>
                            <CloseBtn onClick={handleCloseAddMember}/>
                        </div>
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <input
                                autoFocus
                                value={addSearch}
                                onChange={e => setAddSearch(e.target.value)}
                                placeholder="Search by name, membership no. or bank…"
                                aria-label="Search members to add"
                                className="w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                        <div className="overflow-y-auto flex-1">
                            <div
                                className="grid grid-cols-4 gap-3 px-4 py-2 text-xs uppercase tracking-wide bg-gray-50 text-gray-500 dark:bg-gray-900/50 dark:text-gray-400 sticky top-0">
                                <div>Membership No.</div>
                                <div>Name</div>
                                <div>Bank</div>
                                <div></div>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {candidateMembers.length === 0 ? (
                                    <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">No members
                                        found.</div>
                                ) : candidateMembers.slice(0, 50).map(m => (
                                    <div key={m.id}
                                         className="grid grid-cols-4 gap-3 px-4 py-3 text-sm items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                        <div
                                            className="font-medium text-cyan-700 dark:text-cyan-400">{m.membershipNumber}</div>
                                        <div
                                            className="truncate">{m.title ? `${m.title} ` : ''}{m.initials} {m.surname}</div>
                                        <div
                                            className="truncate text-xs text-gray-600 dark:text-gray-400">{m.bankName}</div>
                                        <div className="flex justify-end">
                                            <button
                                                onClick={async () => {
                                                    await handleAssign(m);
                                                    setShowAddMember(false);
                                                }}
                                                disabled={saving}
                                                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-40 transition">
                                                <UserPlus size={12}/> Add
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div
                            className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end shrink-0">
                            <Button onClick={handleCloseAddMember}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rep Detail Modal */}
            {selectedRepDetail && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog"
                     aria-modal="true">
                    <div className="absolute inset-0 bg-black/60" onClick={handleCloseRepDetail}/>
                    <div
                        className="relative w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div
                            className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <p className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Representative
                                    Details</p>
                                <h3 className="text-base font-semibold text-cyan-700 dark:text-cyan-400">{selectedRepDetail.name}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {!editingRep && (
                                    <button className="px-3 py-1 rounded-md text-xs font-medium bg-cyan-600 text-white hover:bg-cyan-700 transition"
                                        onClick={() => {
                                            setEditRepFields({
                                                name: selectedRepDetail.name,
                                                email: selectedRepDetail.email || '',
                                                phone: selectedRepDetail.phone || ''
                                            });
                                            setEditingRep(true);
                                        }}
                                        >
                                        Edit
                                    </button>
                                )}
                                <CloseBtn onClick={handleCloseRepDetail}/>
                            </div>
                        </div>
                        {editingRep ? (
                            <div className="px-6 py-5 space-y-4">
                                <div>
                                    <label
                                        className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">Full
                                        Name *</label>
                                    <input value={editRepFields.name}
                                           onChange={e => setEditRepFields(p => ({...p, name: e.target.value}))}
                                           className="mt-1 w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                                </div>
                                <div>
                                    <label
                                        className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">Email</label>
                                    <input value={editRepFields.email}
                                           onChange={e => setEditRepFields(p => ({...p, email: e.target.value}))}
                                           type="email"
                                           className="mt-1 w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                                </div>
                                <div>
                                    <label
                                        className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">Phone</label>
                                    <input value={editRepFields.phone}
                                           onChange={e => setEditRepFields(p => ({...p, phone: e.target.value}))}
                                           type="tel"
                                           className="mt-1 w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                                </div>
                            </div>
                        ) : (
                            <div className="px-6 py-5 space-y-4">
                                <DRow label="Name" value={selectedRepDetail.name}/>
                                <DRow label="Email" value={selectedRepDetail.email || '—'}/>
                                <DRow label="Phone" value={selectedRepDetail.phone || '—'}/>
                                <DRow label="Bank(s)" value={selectedRepDetail.banks || '—'}/>
                                <DRow label="Branch(es)" value={selectedRepDetail.branches || '—'}/>
                                <DRow label="Province" value={selectedRepDetail.provinces || '—'}/>
                                <DRow label="Area" value={selectedRepDetail.areas || '—'}/>
                                <DRow label="Members Represented" value={selectedRepDetail.count}/>
                            </div>
                        )}
                        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                            {editingRep ? (
                                <>
                                    <Button onClick={handleCancelEdit}>Cancel</Button>
                                    <Button variant="primary" disabled={!editRepFields.name.trim() || saving}
                                            onClick={async () => {
                                                setSaving(true);
                                                try {
                                                    await representativeService.update(selectedRepDetail.id, editRepFields);
                                                    await refreshAll();
                                                    setSelectedRepDetail(d => ({...d, ...editRepFields}));
                                                    if (selectedRep === selectedRepDetail.name) setSelectedRep(editRepFields.name);
                                                    setEditingRep(false);
                                                } catch (err) {
                                                    alert(err);
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
                    </div>
                </div>
            )}

            {/* Add Representative Modal */}
            {showAddRep && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog"
                     aria-modal="true">
                    <div className="absolute inset-0 bg-black/60" onClick={handleCloseAddRep}/>
                    <div
                        className="relative w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Add
                                Representative</h3>
                            <CloseBtn onClick={handleCloseAddRep}/>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label
                                    className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Full
                                    Name *</label>
                                <input autoFocus value={newRepName} onChange={e => setNewRepName(e.target.value)}
                                       onKeyDown={e => e.key === 'Enter' && handleAddRep()}
                                       placeholder="Representative full name"
                                       className="mt-1 w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                            </div>
                            <SearchableSelect label="Province"
                                              value={newRepFields.province}
                                              onChange={e => setNewRepFields(p => ({...p, province: e.target.value}))}
                                              options={[{
                                                  value: '',
                                                  label: 'Select province…'
                                              }, ...modalProvinces.map(p => ({value: p, label: p}))]}/>
                            <SearchableSelect label="Bank"
                                              value={newRepFields.bank}
                                              onChange={e => setNewRepFields(p => ({
                                                  ...p,
                                                  bank: e.target.value,
                                                  branch: '',
                                                  area: ''
                                              }))}
                                              options={[{
                                                  value: '',
                                                  label: 'Select bank…'
                                              }, ...BANK_NAMES.map(b => ({value: b, label: b}))]}/>
                            <SearchableSelect label="Branch"
                                              value={newRepFields.branch}
                                              onChange={e => setNewRepFields(p => ({
                                                  ...p,
                                                  branch: e.target.value,
                                                  area: ''
                                              }))}
                                              options={[{
                                                  value: '',
                                                  label: 'Select branch…'
                                              }, ...modalBranches.map(b => ({value: b, label: b}))]}/>
                            <SearchableSelect label="Area"
                                              value={newRepFields.area}
                                              onChange={e => setNewRepFields(p => ({...p, area: e.target.value}))}
                                              options={[{
                                                  value: '',
                                                  label: 'Select area…'
                                              }, ...modalAreas.map(a => ({value: a, label: a}))]}/>
                        </div>
                        <div className="flex justify-end gap-2 mt-5">
                            <Button onClick={handleCloseAddRep}>Cancel</Button>
                            <Button variant="primary" onClick={handleAddRep} disabled={!newRepName.trim()}>
                                <UserPlus size={14}/> Continue
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Member Detail Modal */}
            {selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog"
                     aria-modal="true">
                    <div className="absolute inset-0 bg-black/60"
                         onClick={handleCloseMemberModal}/>
                    <div
                        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        {/* Header */}
                        <div
                            className="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <div>
                                <p className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Member
                                    Details</p>
                                <div
                                    className="mt-1 flex flex-wrap items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                                    <span>{selectedMember.title ? `${selectedMember.title} ` : ''}{selectedMember.initials} {selectedMember.surname}</span>
                                    <span className="text-gray-400">•</span>
                                    <span
                                        className="text-sm font-normal text-gray-600 dark:text-gray-300">{selectedMember.membershipNumber}</span>
                                    <span className="text-gray-400">•</span>
                                    <StatusBadge status={selectedMember.status}/>
                                </div>
                            </div>
                            <CloseBtn onClick={handleCloseMemberModal}/>
                        </div>

                        {/* Breadcrumb */}
                        <div
                            className="px-6 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 shrink-0 flex items-center gap-1">
                            <button onClick={() => setSelectedMember(null)}
                                    className="hover:text-cyan-600 dark:hover:text-cyan-400 transition">
                                {selectedRep}
                            </button>
                            <ChevronRight size={12}/>
                            <span
                                className="font-medium text-gray-700 dark:text-gray-200">{selectedMember.membershipNumber}</span>
                        </div>

                        {/* Body */}
                        <div className="overflow-y-auto flex-1 px-6 py-5 bg-gray-50 dark:bg-gray-900/40">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Section title="Personal">
                                    <DRow label="First Names"
                                          value={selectedMember.firstNames || selectedMember.firstName}/>
                                    <DRow label="Surname" value={selectedMember.surname}/>
                                    <DRow label="ID Number" value={selectedMember.identityNumber}/>
                                    <DRow label="Race" value={selectedMember.race}/>
                                    <DRow label="Email" value={selectedMember.email}
                                          className="break-all text-cyan-600 dark:text-cyan-400"/>
                                    <DRow label="Cell" value={selectedMember.phone || selectedMember.cellTel}/>
                                    <DRow label="Work Tel" value={selectedMember.workTel}/>
                                    <DRow label="Home Tel" value={selectedMember.homeTel}/>
                                    <DRow label="Address" value={selectedMember.address}/>
                                </Section>
                                <Section title="Employment & Bank">
                                    <DRow label="Employee Number" value={selectedMember.employeeNumber}/>
                                    <DRow label="Job Grade" value={selectedMember.jobGrade}/>
                                    <DRow label="Bank" value={selectedMember.bankName}/>
                                    <DRow label="Branch" value={selectedMember.branch}/>
                                    <DRow label="Account Number" value={selectedMember.bankAccountNumber}/>
                                    <DRow label="IBT No." value={selectedMember.ibtNo}/>
                                    <DRow label="Work IBT No." value={selectedMember.workIbtNo}/>
                                    <DRow label="Payment Type" value={selectedMember.paymentType}/>
                                    <DRow label="Work Address" value={selectedMember.workBankAddress}/>
                                </Section>
                                <Section title="Membership">
                                    <DRow label="Membership No." value={selectedMember.membershipNumber}/>
                                    <DRow label="Date Joined" value={selectedMember.joinDate}/>
                                    <DRow label="Status" value={selectedMember.status}/>
                                    <DRow label="Monthly Subs" value={selectedMember.monthlySubscription}/>
                                    <DRow label="Current Balance" value={selectedMember.currentBalance}/>
                                    <DRow label="Arrears Balance" value={selectedMember.arrearsBalance}/>
                                </Section>
                                <Section title="Representatives">
                                    <DRow label="Area's Rep" value={selectedMember.areasRep}/>
                                    <DRow label="Recruitment Rep" value={selectedMember.recruitmentRep}/>
                                    <DRow label="Elected Rep" value={selectedMember.electedRep}/>
                                    <DRow label="National Councillor" value={selectedMember.nationalCouncillor}/>
                                    <DRow label="Branch Committee" value={selectedMember.branchCommitteeMember}/>
                                    <DRow label="Election Date" value={
                                        [selectedMember.repElectionDay, selectedMember.repElectionMonth, selectedMember.repElectionYear]
                                            .filter(Boolean).join('/') || '—'
                                    }/>
                                    <DRow label="Remarks" value={selectedMember.remarks}/>
                                </Section>
                            </div>
                        </div>

                        <div
                            className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end shrink-0">
                            <Button onClick={handleCloseMemberModal}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CloseBtn({ onClick }) {
    return (
        <button onClick={onClick} className="shrink-0 p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 11-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
        </button>
    );
}

function StatusBadge({ status }) {
    const cls = status === 'Active'    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : status === 'Pending'   ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
              : status === 'Suspended' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{status}</span>;
}

function Section({ title, children }) {
    return (
        <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-500 border-b border-gray-200 dark:border-gray-700 pb-1">{title}</h4>
            {children}
        </div>
    );
}

function DRow({ label, value, className = '' }) {
    return (
        <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">{label}</p>
            <p className={`text-sm font-semibold text-gray-800 dark:text-gray-200 ${className}`}>{value || '—'}</p>
        </div>
    );
}
