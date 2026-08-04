import PageTitle from '../../components/common/PageTitle';
import { SearchableSelect, SelectInput } from '../../components/form';
import { subscriptionsService } from '../../services/subscriptionsService';
import { useState, useEffect, useMemo } from 'react';
import { BANK_OPTIONS } from '../../config/memberConstants.js';
import { useLocation } from 'react-router-dom';

const inputCls = 'w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm';

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
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <PageTitle title="Subscriptions" subtitle="Manage subscriptions" />

            <div className="max-w-6xl mx-auto p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end mb-4">
                    <SearchableSelect
                        label="Bank Name"
                        value={filters.bankName}
                        onChange={(v) => setFilters(prev => ({ ...prev, bankName: v }))}
                        placeholder="Select/search"
                        options={[{ value: '', label: 'All Banks' }, ...BANK_OPTIONS.map(b => ({ value: b, label: b }))]}
                    />
                    <SelectInput
                        label="Core Banking (Y/N)"
                        value={filters.isCoreBanking}
                        onChange={(v) => setFilters(prev => ({ ...prev, isCoreBanking: v }))}
                        options={[{ value: '', label: 'All' }, { value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
                    />
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg">
                        Error: {error}
                    </div>
                )}

                <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 max-h-[60vh] overflow-y-auto">
                    {loading && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-gray-800/60 z-20 flex items-center justify-center backdrop-blur-[1px]">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm font-medium text-cyan-700 dark:text-cyan-400">Retrieving subscriptions...</p>
                            </div>
                        </div>
                    )}

                    <table className="w-full border-collapse text-sm">
                        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Bank Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">ACB Debit Day</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Core Banking</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Registration Date</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {!loading && subscriptions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No subscriptions match your search.
                                    </td>
                                </tr>
                            ) : subscriptions.map((sub) => (
                                <tr
                                    key={sub.id}
                                    onClick={() => handleRowClick(sub)}
                                    className={`cursor-pointer transition ${editingId === sub.id ? 'bg-cyan-50 dark:bg-cyan-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                >
                                    {editingId === sub.id ? (
                                        <>
                                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{editData.bankName}</td>
                                            <td className="px-4 py-2">
                                                <input type="number" className={inputCls} value={editData.acbDebitDay ?? ''} onChange={(e) => handleField('acbDebitDay', parseInt(e.target.value))} onClick={e => e.stopPropagation()} />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="number" step="0.01" className={inputCls} value={editData.subscriptionAmount ?? ''} onChange={(e) => handleField('subscriptionAmount', parseFloat(e.target.value))} onClick={e => e.stopPropagation()} />
                                            </td>
                                            <td className="px-4 py-2">
                                                <select className={inputCls} value={editData.isCoreBanking === true ? 'true' : 'false'} onChange={(e) => handleField('isCoreBanking', e.target.value === 'true')} onClick={e => e.stopPropagation()}>
                                                    <option value="true">Yes</option>
                                                    <option value="false">No</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-2">
                                                <select className={inputCls} value={editData.status || ''} onChange={(e) => handleField('status', e.target.value)} onClick={e => e.stopPropagation()}>
                                                    <option value="ACTIVE">ACTIVE</option>
                                                    <option value="PENDING">PENDING</option>
                                                    <option value="CANCELLED">CANCELLED</option>
                                                    <option value="INACTIVE">INACTIVE</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{formatDate(sub.registrationDate)}</td>
                                            <td className="px-4 py-2 text-center whitespace-nowrap">
                                                <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs mr-2">Save</button>
                                                <button onClick={handleCancel} className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs">Cancel</button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-4 py-2">{sub.bankName}</td>
                                            <td className="px-4 py-2">{sub.acbDebitDay}</td>
                                            <td className="px-4 py-2">R {parseFloat(sub.subscriptionAmount).toFixed(2)}</td>
                                            <td className="px-4 py-2">{sub.isCoreBanking ? 'Yes' : 'No'}</td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${sub.status === 'ACTIVE' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : sub.status === 'PENDING' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'}`}>
                                                    {sub.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">{formatDate(sub.registrationDate)}</td>
                                            <td className="px-4 py-2 text-center text-xs text-gray-400 dark:text-gray-500">click to edit</td>
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
