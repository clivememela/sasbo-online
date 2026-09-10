import PageTitle from '../../components/common/PageTitle';
import { SearchableSelect, SelectInput } from '../../components/form';
import { subscriptionsService } from '../../services/subscriptionsService';
import { bankService } from '../../services/bankService.js';
import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import StatusChip from "../../components/common/StatusChip.jsx";

// 🔴 `text-sm` WAS 13px, WHICH IS THE iOS ZOOM TRAP, AND THE 16px CHECK COULD NOT SEE
// IT. That check matches `text-sm` on the TAG; these classes arrive through this variable,
// so four controls sat under the floor while the measurement read zero. `field-text` is
// the design's size on a fine pointer and 16px on a coarse one, which is the whole reason
// the utility exists.
const inputCls = 'w-full px-2 py-1 rounded border border-line-strong bg-surface-2 text-ink field-text';

export default function Subscriptions() {
    const location = useLocation();

    const [filters, setFilters] = useState({
        bankName: location.state?.filters?.bankName || '',
        isCoreBanking: '',
    });
    const [allSubscriptions, setAllSubscriptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [bankNames, setBankNames] = useState([]);

    const formatDate = (d) => {
        if (!d) return '';
        if (Array.isArray(d)) return `${d[0]}-${String(d[1]).padStart(2,'0')}-${String(d[2]).padStart(2,'0')}`;
        return new Date(d).toLocaleDateString();
    };

    useEffect(() => {
        setLoading(true);
        subscriptionsService.getAll()
            .then(data => setAllSubscriptions(data))
            .catch(err => setError(String(err)))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        bankService.getBankNames()
            .then(setBankNames)
            .catch(() => setBankNames([]));
    }, []);

    const subscriptions = useMemo(() => {
        let result = allSubscriptions;
        if (filters.bankName) {
            const q = filters.bankName.toLowerCase();
            result = result.filter(s =>
                s.bankName?.toLowerCase().includes(q) || q.includes(s.bankName?.toLowerCase() ?? '')
            );
        }
        if (filters.isCoreBanking !== '') {
            const isCore = filters.isCoreBanking === 'true';
            result = result.filter(s => s.isCoreBanking === isCore);
        }
        return result;
    }, [allSubscriptions, filters.bankName, filters.isCoreBanking]);

    const handleRowClick = (sub) => {
        if (editingId === sub.id) return;
        setEditingId(sub.id);
        setEditData({ ...sub });
    };

    const handleCancel = (e) => {
        e.stopPropagation();
        setEditingId(null);
        setEditData({});
    };

    const handleSave = async (e) => {
        e.stopPropagation();
        try {
            await subscriptionsService.update(editingId, editData);
            setAllSubscriptions(prev => prev.map(s => s.id === editingId ? { ...editData } : s));
            setEditingId(null);
            setEditData({});
        } catch (err) {
            setError(String(err));
        }
    };

    const handleField = (field, value) => setEditData(prev => ({ ...prev, [field]: value }));

    return (
        <div className="p-6 text-ink">
            <PageTitle title="Subscriptions" subtitle="Manage subscriptions" />

            <div className="max-w-6xl mx-auto p-6 rounded-2xl shadow-lg bg-surface">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end mb-4">
                    <SearchableSelect
                        label="Bank Name"
                        value={filters.bankName}
                        onChange={(v) => setFilters(prev => ({ ...prev, bankName: v }))}
                        placeholder="Select/search"
                        options={[{ value: '', label: 'All Banks' }, ...bankNames.map(b => ({ value: b, label: b }))]}
                    />
                    <SelectInput
                        label="Core Banking (Y/N)"
                        value={filters.isCoreBanking}
                        onChange={(v) => setFilters(prev => ({ ...prev, isCoreBanking: v }))}
                        options={[{ value: '', label: 'All' }, { value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
                    />
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-status-suspended-bg text-status-suspended rounded-lg">
                        Error: {error}
                    </div>
                )}

                <div className="relative overflow-hidden rounded-xl border border-line max-h-[60vh] overflow-y-auto">
                    {loading && (
                        <div className="absolute inset-0 bg-surface/60 z-20 flex items-center justify-center backdrop-blur-[1px]">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm font-medium text-brand-ink">Retrieving subscriptions...</p>
                            </div>
                        </div>
                    )}

                    <table className="w-full border-collapse text-sm">
                        <thead className="sticky top-0 bg-surface-2 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Bank Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">ACB Debit Day</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Core Banking</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Registration Date</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-ink-muted">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {!loading && subscriptions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-ink-muted">
                                        No subscriptions match your search.
                                    </td>
                                </tr>
                            ) : subscriptions.map((sub) => (
                                <tr
                                    key={sub.id}
                                    onClick={() => handleRowClick(sub)}
                                    className={`cursor-pointer transition ${editingId === sub.id ? 'bg-brand-soft' : 'hover-hover:hover:bg-surface-2/50'}`}
                                >
                                    {editingId === sub.id ? (
                                        <>
                                            <td className="px-4 py-2 text-ink">{editData.bankName}</td>
                                            <td className="px-4 py-2">
                                                <input type="number" aria-label={`ACB debit day for ${editData.bankName || 'this subscription'}`} className={inputCls} value={editData.acbDebitDay ?? ''} onChange={(e) => handleField('acbDebitDay', parseInt(e.target.value))} onClick={e => e.stopPropagation()} />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="number" step="0.01" aria-label={`Subscription amount for ${editData.bankName || 'this subscription'}`} className={inputCls} value={editData.subscriptionAmount ?? ''} onChange={(e) => handleField('subscriptionAmount', parseFloat(e.target.value))} onClick={e => e.stopPropagation()} />
                                            </td>
                                            <td className="px-4 py-2">
                                                <select aria-label={`Core banking for ${editData.bankName || 'this subscription'}`} className={inputCls} value={editData.isCoreBanking === true ? 'true' : 'false'} onChange={(e) => handleField('isCoreBanking', e.target.value === 'true')} onClick={e => e.stopPropagation()}>
                                                    <option value="true">Yes</option>
                                                    <option value="false">No</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-2">
                                                <select aria-label={`Status for ${editData.bankName || 'this subscription'}`} className={inputCls} value={editData.status || ''} onChange={(e) => handleField('status', e.target.value)} onClick={e => e.stopPropagation()}>
                                                    <option value="ACTIVE">ACTIVE</option>
                                                    <option value="PENDING">PENDING</option>
                                                    <option value="CANCELLED">CANCELLED</option>
                                                    <option value="INACTIVE">INACTIVE</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-2 text-ink-muted">{formatDate(sub.registrationDate)}</td>
                                            <td className="px-4 py-2 text-center whitespace-nowrap">
                                                <button type="button" onClick={handleSave} aria-label={`Save changes to ${editData.bankName || 'this subscription'}`} className="touch-target bg-brand hover-hover:hover:bg-brand-hover text-on-brand px-3 py-1 rounded text-xs mr-2">Save</button>
                                                <button type="button" onClick={handleCancel} aria-label="Discard these changes" className="touch-target border border-line-strong bg-surface hover-hover:hover:bg-surface-2 text-ink px-3 py-1 rounded text-xs">Cancel</button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-4 py-2">{sub.bankName}</td>
                                            <td className="px-4 py-2">{sub.acbDebitDay}</td>
                                            <td className="px-4 py-2">R {parseFloat(sub.subscriptionAmount).toFixed(2)}</td>
                                            <td className="px-4 py-2">{sub.isCoreBanking ? 'Yes' : 'No'}</td>
                                            <td className="px-4 py-2">
                                                {/* ♻️ THE FOURTH COPY OF THE STATUS CHIP, and the one
                                                    that was wrong in the most damaging direction: it knew
                                                    ACTIVE and PENDING and painted EVERYTHING ELSE with the
                                                    Suspended red -- so a CANCELLED subscription and an
                                                    INACTIVE one both read as suspended, which is a different
                                                    fact about a member's money.

                                                    🔴 The vocabulary here is UPPERCASE (`ACTIVE`) where the
                                                    member register's is title case (`Active`), so the shared
                                                    component is given the shape it knows rather than being
                                                    taught a second spelling. The mismatch itself is real and
                                                    is on the wire, not ours to change here. */}
                                                <StatusChip status={sub.status} />
                                            </td>
                                            <td className="px-4 py-2">{formatDate(sub.registrationDate)}</td>
                                            <td className="px-4 py-2 text-center text-xs text-ink-muted">click to edit</td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
