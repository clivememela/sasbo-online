import { useMemo, useState, useEffect, useCallback } from 'react';
import { ChevronRight, UserPlus, Trash2, UserMinus, Eye } from 'lucide-react';
import PageTitle from '../../components/common/PageTitle';
import { TextInput, SearchableSelect, Button, PositionTreeSelect } from '../../components/form';
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

    const refreshAll = useCallback(() => Promise.all([
        memberService.getMembers(),
        recruitmentChannelService.getAll(),
    ]).then(([m, r]) => {
        setMembers(m);
        setReps(r);
    }).catch(err => console.error("Error fetching dependencies:", err)), []);

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

    const candidateMembers = useMemo(() => {
        const q = addSearch.trim().toLowerCase();
        return members.filter(m => {
            if (m.recruitmentRepresentativeId === selectedRep?.id) return false;
            if (!q) return true;
            return (
                (m.membershipNumber ?? '').toLowerCase().includes(q) ||
                `${m.initials || ''} ${m.surname || ''}`.toLowerCase().includes(q) ||
                (m.firstNames ?? '').toLowerCase().includes(q) ||
                (m.bankName ?? '').toLowerCase().includes(q)
            );
        });
    }, [members, selectedRep, addSearch]);

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
            /*workIbtNo: member.workIbtNo || '',*/
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

    const handleAssign = async (member) => {
        try {
            setSaving(true);
            const cleanData = sanitizeMemberPayload(member, { areasRep: selectedRep.name });
            await memberService.updateMember(cleanData);
            await refreshAll();
        } catch (err) {
            alert(`Assignment Failed: ${err.message || err}`);
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async (member) => {
        if (!window.confirm(`Remove ${member.initials || ''} ${member.surname || ''} from ${selectedRep.name}'s list?`)) return;
        try {
            setSaving(true);
            const cleanData = sanitizeMemberPayload(member, { areasRep: '' });
            await memberService.updateMember(cleanData);
            await refreshAll();
        } catch (err) {
            alert(`Removal Failed: ${err.message || err}`);
        } finally {
            setSaving(false);
        }
    };

    const [newRepDetails, setNewRepDetails] = useState({ roleId: null, recruiterTypeId: null, isElectedRep: false, electionDate: '', structureIds: [] });

    const handleAddRep = async () => {
        if (!newRepMember) return;
        if (!newRepDetails.recruiterTypeId) {
            alert('Please select a recruiter type.');
            return;
        }
        if (repList.some(r => r.memberId === newRepMember.id)) {
            alert('This member is already a recruiter.');
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
        } catch (err) {
            alert(err);
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveRep = async (rep) => {
        const repMems = members.filter(m => m.recruitmentRepresentativeId === rep.id);
        if (!window.confirm(`Remove recruiter "${rep.name}"? This will set ${repMems.length} member(s) to Inactive and clear their recruiter assignment.`)) return;
        try {
            setSaving(true);
            await Promise.all(repMems.map(m => {
                const cleanData = sanitizeMemberPayload(m, { areasRep: '', status: 'Inactive' });
                return memberService.updateMember(cleanData);
            }));
            await recruiterService.remove(rep.id);
            await refreshAll();
        } catch (err) {
            alert(`Could not remove recruiter context completely: ${err.message || err}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <PageTitle title="Recruiters" />
            <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
                Browse Sasbo recruiters and the members they recruit
            </p>
            <div className="max-w-6xl mx-auto p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
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
          <span className="text-gray-600 dark:text-gray-300">
            {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} recruiters
          </span>
                    <div className="flex items-center gap-2">
                        <Button variant="pagination" onClick={handlePrevPage} disabled={page === 1}>Prev</Button>
                        <span className="text-gray-600 dark:text-gray-300">Page {page} of {totalPages}</span>
                        <Button variant="pagination" onClick={handleNextPage} disabled={page === totalPages}>Next</Button>
                        <Button onClick={handleClear}>Clear</Button>
                        <Button variant="primary" onClick={handleOpenAddRep}>
                            <UserPlus size={14} /> Add Recruiter
                        </Button>
                    </div>
                </div>
                <div className="mt-4 rounded-xl overflow-hidden border border-transparent max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-7 gap-3 px-4 py-3 text-xs uppercase tracking-wide bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300 sticky top-0 z-10">
                        <div>Recruitment Channel</div>
                        <div>Bank(s)</div>
                        <div>Branch(es)</div>
                        <div>Province</div>
                        <div>Area</div>
                        <div>Members</div>
                        <div className="flex justify-end">Remove</div>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {visible.length === 0 ? (
                            <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">No recruiters match your search.</div>
                        ) : visible.map(repMembers => (
                            <div key={repMembers.id} onClick={() => setSelectedRep({ id: repMembers.id, name: repMembers.name })}
                                 className="grid grid-cols-7 gap-3 px-4 py-3 text-sm bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition items-center">
                                <div className="font-medium flex items-center gap-1">
                                    {repMembers.name}
                                    <ChevronRight size={14} className="text-gray-400 shrink-0" />
                                </div>
                                <div className="truncate text-xs text-gray-600 dark:text-gray-400" title={repMembers.banks}>{repMembers.banks || '—'}</div>
                                <div className="truncate text-xs text-gray-600 dark:text-gray-400" title={repMembers.branches}>{repMembers.branches || '—'}</div>
                                <div className="truncate text-xs text-gray-600 dark:text-gray-400">{repMembers.provinces || '—'}</div>
                                <div className="truncate text-xs text-gray-600 dark:text-gray-400">{repMembers.areas || '—'}</div>
                                <div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                    {repMembers.count}
                  </span>
                                </div>
                                <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => handleRemoveRep(repMembers)} disabled={saving} title="Remove recruiter"
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
                    <div className="absolute inset-0 bg-black/50" onClick={handleCloseRepModal} />
                    <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <div>
                                <p className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Recruitment Channel</p>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold text-cyan-700 dark:text-cyan-400">{selectedRep.name}</h3>
                                    <div className="relative group">
                                        <Button onClick={() => {
                                            const rep = repList.find(r => r.id === selectedRep.id);
                                            setSelectedRepDetail(rep);
                                            setEditingRep(false);
                                            setEditRepFields({ name: rep?.name || '', email: rep?.email || '', phone: rep?.phone || '' });
                                            setEditRepErrors({});
                                        }} className="p-1 rounded-md text-cyan-500 hover:bg-cyan-50 hover:text-cyan-700 dark:hover:bg-cyan-900/20 transition">
                                            <Eye size={14} />
                                        </Button>
                                        <span className="absolute left-1/2 -translate-x-1/2 top-7 z-50 whitespace-nowrap rounded-md bg-gray-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      View recruiter details
                    </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{repMembers.length} member{repMembers.length !== 1 ? 's' : ''}</span>
                                <CloseBtn onClick={handleCloseRepModal} />
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-center">
                                <h4 className="text-sm font-semibold text-cyan-700 dark:text-cyan-400">Members ({repMembers.length})</h4>
                            </div>
                            <div className="grid grid-cols-5 gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                                <input value={repSearch.membershipNumber || ''} onChange={handleRepSearchChange('membershipNumber')} placeholder="Membership No." aria-label="Filter by membership number"
                                       className="rounded-lg px-3 py-1.5 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                <input value={repSearch.name || ''} onChange={handleRepSearchChange('name')} placeholder="Name" aria-label="Filter by name"
                                       className="rounded-lg px-3 py-1.5 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                <input value={repSearch.bank || ''} onChange={handleRepSearchChange('bank')} placeholder="Bank" aria-label="Filter by bank"
                                       className="rounded-lg px-3 py-1.5 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                <input value={repSearch.branch || ''} onChange={handleRepSearchChange('branch')} placeholder="Branch" aria-label="Filter by branch"
                                       className="rounded-lg px-3 py-1.5 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                <input value={repSearch.status || ''} onChange={handleRepSearchChange('status')} placeholder="Status" aria-label="Filter by status"
                                       className="rounded-lg px-3 py-1.5 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                            </div>
                            <div className="grid grid-cols-6 gap-3 px-4 py-2 text-xs uppercase tracking-wide bg-gray-50 text-gray-500 dark:bg-gray-900/50 dark:text-gray-400 sticky top-0">
                                <div>Membership No.</div>
                                <div>Name</div>
                                <div>Bank</div>
                                <div>Branch</div>
                                <div>Status</div>
                                <div></div>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredRepMembers.length === 0 ? (
                                    <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">No members found.</div>
                                ) : filteredRepMembers.map(m => (
                                    <div key={m.id} className="grid grid-cols-6 gap-3 px-4 py-3 text-sm items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                        <div className="font-medium text-cyan-700 dark:text-cyan-400 cursor-pointer hover:underline" onClick={() => setSelectedMember(m)}>
                                            {m.membershipNumber}
                                        </div>
                                        <div className="truncate cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400" onClick={() => setSelectedMember(m)}>
                                            {m.title ? `${m.title} ` : ''}{m.initials} {m.surname}
                                        </div>
                                        <div className="truncate text-xs text-gray-600 dark:text-gray-400">{m.bankName}</div>
                                        <div className="truncate text-xs text-gray-600 dark:text-gray-400">{m.branch}</div>
                                        <div><StatusBadge status={m.status} /></div>
                                        <div className="flex justify-end">
                                            <button onClick={() => handleRemove(m)} disabled={saving} title="Remove from rep"
                                                    className="p-1.5 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition disabled:opacity-40">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
                            <Button variant="primary" onClick={handleOpenAddMember}>
                                <UserPlus size={14} /> Add Member
                            </Button>
                            <Button onClick={handleCloseRepModal}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Member Picker */}
            {showAddMember && selectedRep && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/60" onClick={handleCloseAddMember} />
                    <div className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <div>
                                <p className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Add member to recruiter :</p>
                                <h3 className="text-base font-semibold text-cyan-700 dark:text-cyan-400">{selectedRep.name}</h3>
                            </div>
                            <CloseBtn onClick={handleCloseAddMember} />
                        </div>
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <input autoFocus value={addSearch} onChange={e => { const val = e.target.value; setAddSearch(val); }} placeholder="Search by name, membership no. or bank…" aria-label="Search members to add"
                                   className="w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
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
                                            <button onClick={async () => { await handleAssign(m); setShowAddMember(false); }} disabled={saving}
                                                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-40 transition">
                                                <UserPlus size={12} /> Add
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end shrink-0">
                            <Button onClick={handleCloseAddMember}>Cancel</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rep Detail Modal */}
            {selectedRepDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/60" onClick={handleCloseRepDetail} />
                    <div className="relative w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <p className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Recruiter Details</p>
                                <h3 className="text-base font-semibold text-cyan-700 dark:text-cyan-400">{selectedRepDetail.name}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {!editingRep && (
                                    <button className="px-3 py-1 rounded-md text-xs font-medium bg-cyan-600 text-white hover:bg-cyan-700 transition"
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
                                    </button>
                                )}
                                <CloseBtn onClick={handleCloseRepDetail} />
                            </div>
                        </div>
                        {editingRep ? (
                            <div className="px-6 py-5 space-y-4">
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">Full Name *</label>
                                    <input value={editRepFields.name} onChange={e => { const val = e.target.value; setEditRepFields(p => ({ ...p, name: val })); }}
                                           className="mt-1 w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">Email</label>
                                    <input value={editRepFields.email} type="email" onChange={e => {
                                        const val = e.target.value;
                                        setEditRepFields(p => ({ ...p, email: val }));
                                        setEditRepErrors(p => ({ ...p, email: validateEmail(val) || undefined }));
                                    }} className={`mt-1 w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 ${editRepErrors.email ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-700'}`} />
                                    {editRepErrors.email && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{editRepErrors.email}</p>}
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">Phone</label>
                                    <input value={editRepFields.phone} type="tel" onChange={e => { const val = e.target.value; setEditRepFields(p => ({ ...p, phone: val })); }}
                                           className="mt-1 w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">Recruiter Type</label>
                                    <select value={editRepFields.recruiterTypeId || ''} onChange={e => setEditRepFields(p => ({ ...p, recruiterTypeId: e.target.value ? Number(e.target.value) : null }))}
                                            className="mt-1 w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                        <option value="">Select recruitment channel...</option>
                                        {RECRUITMENT_CHANNELS.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">Role</label>
                                    <select value={editRepFields.roleId || ''} onChange={e => setEditRepFields(p => ({ ...p, roleId: e.target.value ? Number(e.target.value) : null }))}
                                            className="mt-1 w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                        <option value="">Select role...</option>
                                        {ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">Elected Recruiter</label>
                                    <div className="mt-1 flex items-center gap-3">
                                        <button type="button" onClick={() => setEditRepFields(p => ({ ...p, isElectedRep: true }))}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${editRepFields.isElectedRep ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>Yes</button>
                                        <button type="button" onClick={() => setEditRepFields(p => ({ ...p, isElectedRep: false, electionDate: '' }))}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${!editRepFields.isElectedRep ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>No</button>
                                    </div>
                                </div>
                                {editRepFields.isElectedRep && (
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">Election Date</label>
                                        <input type="date" value={editRepFields.electionDate || ''} onChange={e => setEditRepFields(p => ({ ...p, electionDate: e.target.value }))}
                                               className="mt-1 w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                    </div>
                                )}
                                <div className="md:col-span-2">
                                    <PositionTreeSelect
                                        label="Structures / Positions"
                                        structures={STRUCTURES_TREE}
                                        selectedIds={editRepFields.structureIds || []}
                                        onChange={(ids) => setEditRepFields(p => ({ ...p, structureIds: ids }))}
                                        placeholder="Select positions..."
                                    />
                                </div>
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
                        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
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

            {/* Add Recruiter Modal */}
            {showAddRep && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/60" onClick={handleCloseAddRep} />
                    <div className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Add Recruiter</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">A recruiter must be an existing member</p>
                            </div>
                            <CloseBtn onClick={handleCloseAddRep} />
                        </div>
                        {newRepMember && (
                            <div className="mx-4 mt-3 px-4 py-3 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-700 flex items-center justify-between shrink-0">
                                <div>
                                    <p className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">Selected Member</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {newRepMember.title ? `${newRepMember.title} ` : ''}{newRepMember.initials} {newRepMember.surname}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{newRepMember.membershipNumber} · {newRepMember.bankName}</p>
                                </div>
                                <button onClick={() => setNewRepMember(null)} className="text-xs text-red-400 hover:text-red-600 dark:hover:text-red-300 transition">✕ Clear</button>
                            </div>
                        )}
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
                            <input autoFocus value={newRepSearch} onChange={e => { const val = e.target.value; setNewRepSearch(val); }} placeholder="Search by name, membership no. or bank…"
                                   className="w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                        </div>
                        <div className="overflow-y-auto flex-1">
                            <div className="grid grid-cols-4 gap-3 px-4 py-2 text-xs uppercase tracking-wide bg-gray-50 text-gray-500 dark:bg-gray-900/50 dark:text-gray-400 sticky top-0">
                                <div>Membership No.</div>
                                <div>Name</div>
                                <div>Bank</div>
                                <div>Status</div>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {members
                                    .filter(m => {
                                        if (repList.some(r => r.memberId === m.id)) return false;
                                        const q = newRepSearch.trim().toLowerCase();
                                        if (!q) return true;
                                        return (
                                            (m.membershipNumber ?? '').toLowerCase().includes(q) ||
                                            `${m.initials || ''} ${m.surname || ''}`.toLowerCase().includes(q) ||
                                            (m.firstNames ?? '').toLowerCase().includes(q) ||
                                            (m.bankName ?? '').toLowerCase().includes(q)
                                        );
                                    })
                                    .slice(0, 50)
                                    .map(m => (
                                        <div key={m.id} onClick={() => setNewRepMember(m)}
                                             className={`grid grid-cols-4 gap-3 px-4 py-3 text-sm cursor-pointer transition ${newRepMember?.id === m.id ? 'bg-cyan-50 dark:bg-cyan-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                            <div className="font-medium text-cyan-700 dark:text-cyan-400">{m.membershipNumber}</div>
                                            <div className="truncate">{m.title ? `${m.title} ` : ''}{m.initials} {m.surname}</div>
                                            <div className="truncate text-xs text-gray-600 dark:text-gray-400">{m.bankName}</div>
                                            <div><StatusBadge status={m.status} /></div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                        {newRepMember && (
                            <div className="px-6 py-4 space-y-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
                                <p className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Recruiter Details</p>
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">Recruiter Type *</label>
                                    <select value={newRepDetails.recruiterTypeId || ''} onChange={e => setNewRepDetails(p => ({ ...p, recruiterTypeId: e.target.value ? Number(e.target.value) : null }))}
                                            className="mt-1 w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                        <option value="">Select recruiter type...</option>
                                        {RECRUITMENT_CHANNELS.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">Role</label>
                                    <select value={newRepDetails.roleId || ''} onChange={e => setNewRepDetails(p => ({ ...p, roleId: e.target.value ? Number(e.target.value) : null }))}
                                            className="mt-1 w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                        <option value="">Select role...</option>
                                        {ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">Elected Recruiter</label>
                                    <div className="mt-1 flex items-center gap-3">
                                        <button type="button" onClick={() => setNewRepDetails(p => ({ ...p, isElectedRep: true }))}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${newRepDetails.isElectedRep ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>Yes</button>
                                        <button type="button" onClick={() => setNewRepDetails(p => ({ ...p, isElectedRep: false, electionDate: '' }))}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${!newRepDetails.isElectedRep ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>No</button>
                                    </div>
                                </div>
                                {newRepDetails.isElectedRep && (
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500">Election Date</label>
                                        <input type="date" value={newRepDetails.electionDate || ''} onChange={e => setNewRepDetails(p => ({ ...p, electionDate: e.target.value }))}
                                               className="mt-1 w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                    </div>
                                )}
                                <div>
                                    <PositionTreeSelect
                                        label="Structures / Positions"
                                        structures={STRUCTURES_TREE}
                                        selectedIds={newRepDetails.structureIds}
                                        onChange={(ids) => setNewRepDetails(p => ({ ...p, structureIds: ids }))}
                                        placeholder="Select positions..."
                                    />
                                </div>
                            </div>
                        )}
                        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 shrink-0">
                            <Button onClick={handleCloseAddRep}>Cancel</Button>
                            <Button variant="primary" onClick={handleAddRep} disabled={!newRepMember || saving}>
                                <UserPlus size={14} /> Make Recruiter
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Member Detail Modal */}
            {selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/60" onClick={handleCloseMemberModal} />
                    <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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
                            <CloseBtn onClick={handleCloseMemberModal} />
                        </div>
                        <div className="px-6 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 shrink-0 flex items-center gap-1">
                            <button onClick={() => setSelectedMember(null)} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition">{selectedRep?.name}</button>
                            <ChevronRight size={12} />
                            <span className="font-medium text-gray-700 dark:text-gray-200">{selectedMember.membershipNumber}</span>
                        </div>
                        <div className="overflow-y-auto flex-1 px-6 py-5 bg-gray-50 dark:bg-gray-900/40">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Section title="Personal">
                                    <DRow label="First Names" value={selectedMember.firstNames || selectedMember.firstName} />
                                    <DRow label="Surname" value={selectedMember.surname} />
                                    <DRow label="ID Number" value={selectedMember.identityNumber} />
                                    <DRow label="Race" value={selectedMember.race} />
                                    <DRow label="Email" value={selectedMember.preferredEmail === "both" ? [selectedMember.personalEmail, selectedMember.workEmail].filter(Boolean).join(', ') || '—' : ((selectedMember.preferredEmail === "work" ? selectedMember.workEmail : selectedMember.personalEmail) || '—')} className="break-all text-cyan-600 dark:text-cyan-400" />
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
                                    {/*<DRow label="Work IBT No." value={selectedMember.workIbtNo} />*/}
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
                        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end shrink-0">
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
    const cls = status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
        : status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
            : status === 'Suspended' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{status || 'Unknown'}</span>;
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
