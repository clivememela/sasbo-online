import { useMemo, useState, useEffect } from 'react';
import { ChevronRight, UserPlus, Trash2, UserMinus } from 'lucide-react';
import PageTitle from '../../components/common/PageTitle';
import { TextInput, SelectInput, Button } from '../../components/form';
import { memberService } from '../../services/memberService.js';
import banksData from '../../data/banks.json';

const PAGE_SIZE = 20;

const PROVINCES  = [...new Set(banksData.map(b => b.provinceCommitteeName).filter(Boolean))].sort();
const AREAS      = [...new Set(banksData.map(b => b.area).filter(Boolean))].sort();
const BRANCHES   = [...new Set(banksData.map(b => b.branch).filter(Boolean))].sort();
const BANK_NAMES = [...new Set(banksData.map(b => b.bankName).filter(Boolean))].sort();

// bankName -> { province, area }
const BANK_META = {};
banksData.forEach(b => { BANK_META[b.bankName] = { province: b.provinceCommitteeName, area: b.area }; });

export default function Representatives() {
    const [members, setMembers] = useState([]);
    const [filters, setFilters] = useState({ repName: '', bankName: '', branch: '', province: '', area: '' });
    const [page, setPage] = useState(1);
    const [selectedRep, setSelectedRep] = useState(null);   // rep name string
    const [selectedMember, setSelectedMember] = useState(null); // full member object
    const [showAddMember, setShowAddMember] = useState(false);
    const [addSearch, setAddSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [showAddRep, setShowAddRep] = useState(false);
    const [newRepName, setNewRepName] = useState('');

    useEffect(() => { memberService.getMembers().then(setMembers); }, []);

    // Build unique rep list: { name, banks, branches, provinces, areas, memberCount }
    const repList = useMemo(() => {
        const map = {};
        members.forEach(m => {
            const name = m.areasRep?.trim();
            if (!name) return;
            if (!map[name]) map[name] = { name, bankSet: new Set(), branchSet: new Set(), provinceSet: new Set(), areaSet: new Set(), count: 0 };
            map[name].bankSet.add(m.bankName ?? '');
            map[name].branchSet.add(m.branch ?? '');
            const meta = BANK_META[m.bankName] || {};
            if (meta.province) map[name].provinceSet.add(meta.province);
            if (meta.area)     map[name].areaSet.add(meta.area);
            map[name].count++;
        });
        return Object.values(map).map(r => ({
            name: r.name,
            banks: [...r.bankSet].filter(Boolean).join(', '),
            branches: [...r.branchSet].filter(Boolean).join(', '),
            provinces: [...r.provinceSet].join(', '),
            areas: [...r.areaSet].join(', '),
            count: r.count,
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [members]);

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
            if (ar && !r.areas.toLowerCase().includes(ar)) return false;
            return true;
        });
    }, [filters, repList]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleFilter = field => e => { setFilters(p => ({ ...p, [field]: e.target.value })); setPage(1); };
    const handleClear  = () => { setFilters({ repName: '', bankName: '', branch: '', province: '', area: '' }); setPage(1); };

    // Members represented by the selected rep
    const repMembers = useMemo(() =>
        selectedRep ? members.filter(m => m.areasRep?.trim() === selectedRep) : [],
    [selectedRep, members]);

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

    const handleAssign = async (member) => {
        setSaving(true);
        const updated = { ...member, areasRep: selectedRep };
        await memberService.updateMember(updated);
        const fresh = await memberService.getMembers();
        setMembers(fresh);
        setSaving(false);
    };

    const handleRemove = async (member) => {
        if (!window.confirm(`Remove ${member.initials} ${member.surname} from ${selectedRep}'s list?`)) return;
        setSaving(true);
        const updated = { ...member, areasRep: '' };
        await memberService.updateMember(updated);
        const fresh = await memberService.getMembers();
        setMembers(fresh);
        setSaving(false);
    };

    const handleAddRep = async () => {
        const name = newRepName.trim();
        if (!name) return;
        if (repList.some(r => r.name.toLowerCase() === name.toLowerCase())) {
            alert('A representative with that name already exists.');
            return;
        }
        // Create a placeholder member record that establishes the rep
        // Instead, just close and let user assign members — reps are derived from members.
        // We store the new rep name as a pending rep by assigning it to no members yet;
        // the rep only appears once a member is assigned. So we open the rep modal directly.
        setShowAddRep(false);
        setNewRepName('');
        setSelectedRep(name);
        setShowAddMember(true);
        setAddSearch('');
    };

    const handleRemoveRep = async (repName) => {
        const repMems = members.filter(m => m.areasRep?.trim() === repName);
        if (!window.confirm(`Remove representative "${repName}"? This will set ${repMems.length} member(s) to Inactive and clear their rep assignment.`)) return;
        setSaving(true);
        await Promise.all(repMems.map(m =>
            memberService.updateMember({ ...m, areasRep: '', status: 'Inactive' })
        ));
        const fresh = await memberService.getMembers();
        setMembers(fresh);
        setSaving(false);
    };

    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <PageTitle title="Representatives" />
            <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
                Browse Sasbo representatives and the members they represent
            </p>

            <div className="max-w-6xl mx-auto p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <TextInput label="Rep Name" value={filters.repName} onChange={handleFilter('repName')} placeholder="Search rep name" />
                    <SelectInput label="Bank Name" value={filters.bankName} onChange={handleFilter('bankName')}
                        options={[{ value: '', label: 'All Banks' }, ...BANK_NAMES.map(b => ({ value: b, label: b }))]} />
                    <SelectInput label="Branch" value={filters.branch} onChange={handleFilter('branch')}
                        options={[{ value: '', label: 'All Branches' }, ...BRANCHES.map(b => ({ value: b, label: b }))]} />
                    <SelectInput label="Province" value={filters.province} onChange={handleFilter('province')}
                        options={[{ value: '', label: 'All Provinces' }, ...PROVINCES.map(p => ({ value: p, label: p }))]} />
                    <SelectInput label="Area" value={filters.area} onChange={handleFilter('area')}
                        options={[{ value: '', label: 'All Areas' }, ...AREAS.map(a => ({ value: a, label: a }))]} />
                </div>

                {/* Toolbar */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="text-gray-600 dark:text-gray-300">
                        {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} representatives
                    </span>
                    <div className="flex items-center gap-2">
                        <Button variant="pagination" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                        <span className="text-gray-600 dark:text-gray-300">Page {page} of {totalPages}</span>
                        <Button variant="pagination" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                        <Button onClick={handleClear}>Clear</Button>
                        <Button variant="primary" onClick={() => { setShowAddRep(true); setNewRepName(''); }}>
                            <UserPlus size={14} /> Add Rep
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="mt-4 rounded-xl overflow-hidden border border-transparent max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-7 gap-3 px-4 py-3 text-xs uppercase tracking-wide bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300 sticky top-0 z-10">
                        <div>Representative</div>
                        <div>Bank(s)</div>
                        <div>Branch(es)</div>
                        <div>Province</div>
                        <div>Area</div>
                        <div>Members</div>
                        <div></div>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {visible.length === 0 ? (
                            <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">No representatives match your search.</div>
                        ) : visible.map(r => (
                            <div key={r.name}
                                onClick={() => setSelectedRep(r.name)}
                                className="grid grid-cols-7 gap-3 px-4 py-3 text-sm bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition items-center">
                                <div className="font-medium flex items-center gap-1">
                                    {r.name}
                                    <ChevronRight size={14} className="text-gray-400 shrink-0" />
                                </div>
                                <div className="truncate text-xs text-gray-600 dark:text-gray-400" title={r.banks}>{r.banks || '—'}</div>
                                <div className="truncate text-xs text-gray-600 dark:text-gray-400" title={r.branches}>{r.branches || '—'}</div>
                                <div className="truncate text-xs text-gray-600 dark:text-gray-400">{r.provinces || '—'}</div>
                                <div className="truncate text-xs text-gray-600 dark:text-gray-400">{r.areas || '—'}</div>
                                <div>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                                        {r.count}
                                    </span>
                                </div>
                                <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => handleRemoveRep(r.name)}
                                        disabled={saving}
                                        title="Remove representative"
                                        className="p-1.5 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition disabled:opacity-40">
                                        <UserMinus size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Rep Members Modal */}
            {selectedRep && !selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedRep(null)} />
                    <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <div>
                                <p className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Representative</p>
                                <h3 className="text-lg font-semibold text-cyan-700 dark:text-cyan-400">{selectedRep}</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{repMembers.length} member{repMembers.length !== 1 ? 's' : ''}</span>
                                <CloseBtn onClick={() => setSelectedRep(null)} />
                            </div>
                        </div>

                        {/* Members list */}
                        <div className="overflow-y-auto flex-1">
                            <div className="grid grid-cols-6 gap-3 px-4 py-2 text-xs uppercase tracking-wide bg-gray-50 text-gray-500 dark:bg-gray-900/50 dark:text-gray-400 sticky top-0">
                                <div>Membership No.</div>
                                <div>Name</div>
                                <div>Bank</div>
                                <div>Branch</div>
                                <div>Status</div>
                                <div></div>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {repMembers.length === 0 ? (
                                    <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">No members assigned yet.</div>
                                ) : repMembers.map(m => (
                                    <div key={m.id} className="grid grid-cols-6 gap-3 px-4 py-3 text-sm items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition">
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
                                        <div className="truncate text-xs text-gray-600 dark:text-gray-400">{m.bankName}</div>
                                        <div className="truncate text-xs text-gray-600 dark:text-gray-400">{m.branch}</div>
                                        <div><StatusBadge status={m.status} /></div>
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => handleRemove(m)}
                                                disabled={saving}
                                                title="Remove from rep"
                                                className="p-1.5 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition disabled:opacity-40">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
                            <Button variant="primary" onClick={() => { setShowAddMember(true); setAddSearch(''); }}>
                                <UserPlus size={14} /> Add Member
                            </Button>
                            <Button onClick={() => setSelectedRep(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Member Picker */}
            {showAddMember && selectedRep && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddMember(false)} />
                    <div className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <div>
                                <p className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Add member to</p>
                                <h3 className="text-base font-semibold text-cyan-700 dark:text-cyan-400">{selectedRep}</h3>
                            </div>
                            <CloseBtn onClick={() => setShowAddMember(false)} />
                        </div>
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <input
                                autoFocus
                                value={addSearch}
                                onChange={e => setAddSearch(e.target.value)}
                                placeholder="Search by name, membership no. or bank…"
                                className="w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                        <div className="overflow-y-auto flex-1">
                            <div className="grid grid-cols-4 gap-3 px-4 py-2 text-xs uppercase tracking-wide bg-gray-50 text-gray-500 dark:bg-gray-900/50 dark:text-gray-400 sticky top-0">
                                <div>Membership No.</div>
                                <div>Name</div>
                                <div>Bank</div>
                                <div></div>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {candidateMembers.length === 0 ? (
                                    <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">No members found.</div>
                                ) : candidateMembers.slice(0, 50).map(m => (
                                    <div key={m.id} className="grid grid-cols-4 gap-3 px-4 py-3 text-sm items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                        <div className="font-medium text-cyan-700 dark:text-cyan-400">{m.membershipNumber}</div>
                                        <div className="truncate">{m.title ? `${m.title} ` : ''}{m.initials} {m.surname}</div>
                                        <div className="truncate text-xs text-gray-600 dark:text-gray-400">{m.bankName}</div>
                                        <div className="flex justify-end">
                                            <button
                                                onClick={async () => { await handleAssign(m); setShowAddMember(false); }}
                                                disabled={saving}
                                                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-40 transition">
                                                <UserPlus size={12} /> Add
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end shrink-0">
                            <Button onClick={() => setShowAddMember(false)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Representative Modal */}
            {showAddRep && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddRep(false)} />
                    <div className="relative w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Add Representative</h3>
                            <CloseBtn onClick={() => setShowAddRep(false)} />
                        </div>
                        <input
                            autoFocus
                            value={newRepName}
                            onChange={e => setNewRepName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddRep()}
                            placeholder="Representative full name"
                            className="w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-4"
                        />
                        <div className="flex justify-end gap-2">
                            <Button onClick={() => setShowAddRep(false)}>Cancel</Button>
                            <Button variant="primary" onClick={handleAddRep} disabled={!newRepName.trim()}>
                                <UserPlus size={14} /> Continue
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Member Detail Modal */}
            {selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/60"
                        onClick={() => setSelectedMember(null)} />
                    <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        {/* Header */}
                        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <div>
                                <p className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Member Details</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                                    <span>{selectedMember.title ? `${selectedMember.title} ` : ''}{selectedMember.initials} {selectedMember.surname}</span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-sm font-normal text-gray-600 dark:text-gray-300">{selectedMember.membershipNumber}</span>
                                    <span className="text-gray-400">•</span>
                                    <StatusBadge status={selectedMember.status} />
                                </div>
                            </div>
                            <CloseBtn onClick={() => setSelectedMember(null)} />
                        </div>

                        {/* Breadcrumb */}
                        <div className="px-6 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 shrink-0 flex items-center gap-1">
                            <button onClick={() => setSelectedMember(null)} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition">
                                {selectedRep}
                            </button>
                            <ChevronRight size={12} />
                            <span className="font-medium text-gray-700 dark:text-gray-200">{selectedMember.membershipNumber}</span>
                        </div>

                        {/* Body */}
                        <div className="overflow-y-auto flex-1 px-6 py-5 bg-gray-50 dark:bg-gray-900/40">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Section title="Personal">
                                    <DRow label="First Names"      value={selectedMember.firstNames || selectedMember.firstName} />
                                    <DRow label="Surname"          value={selectedMember.surname} />
                                    <DRow label="ID Number"        value={selectedMember.identityNumber} />
                                    <DRow label="Race"             value={selectedMember.race} />
                                    <DRow label="Email"            value={selectedMember.email} className="break-all text-cyan-600 dark:text-cyan-400" />
                                    <DRow label="Cell"             value={selectedMember.phone || selectedMember.cellTel} />
                                    <DRow label="Work Tel"         value={selectedMember.workTel} />
                                    <DRow label="Home Tel"         value={selectedMember.homeTel} />
                                    <DRow label="Address"          value={selectedMember.address} />
                                </Section>
                                <Section title="Employment & Bank">
                                    <DRow label="Employee Number"  value={selectedMember.employeeNumber} />
                                    <DRow label="Job Grade"        value={selectedMember.jobGrade} />
                                    <DRow label="Bank"             value={selectedMember.bankName} />
                                    <DRow label="Branch"           value={selectedMember.branch} />
                                    <DRow label="Account Number"   value={selectedMember.bankAccountNumber} />
                                    <DRow label="IBT No."          value={selectedMember.ibtNo} />
                                    <DRow label="Work IBT No."     value={selectedMember.workIbtNo} />
                                    <DRow label="Payment Type"     value={selectedMember.paymentType} />
                                    <DRow label="Work Address"     value={selectedMember.workBankAddress} />
                                </Section>
                                <Section title="Membership">
                                    <DRow label="Membership No."   value={selectedMember.membershipNumber} />
                                    <DRow label="Date Joined"      value={selectedMember.joinDate} />
                                    <DRow label="Status"           value={selectedMember.status} />
                                    <DRow label="Monthly Subs"     value={selectedMember.monthlySubscription} />
                                    <DRow label="Current Balance"  value={selectedMember.currentBalance} />
                                    <DRow label="Arrears Balance"  value={selectedMember.arrearsBalance} />
                                </Section>
                                <Section title="Representatives">
                                    <DRow label="Area's Rep"       value={selectedMember.areasRep} />
                                    <DRow label="Recruitment Rep"  value={selectedMember.recruitmentRep} />
                                    <DRow label="Elected Rep"      value={selectedMember.electedRep} />
                                    <DRow label="National Councillor" value={selectedMember.nationalCouncillor} />
                                    <DRow label="Branch Committee" value={selectedMember.branchCommitteeMember} />
                                    <DRow label="Election Date"    value={
                                        [selectedMember.repElectionDay, selectedMember.repElectionMonth, selectedMember.repElectionYear]
                                            .filter(Boolean).join('/') || '—'
                                    } />
                                    <DRow label="Remarks"          value={selectedMember.remarks} />
                                </Section>
                            </div>
                        </div>

                        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end shrink-0">
                            <Button onClick={() => setSelectedMember(null)}>Close</Button>
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
