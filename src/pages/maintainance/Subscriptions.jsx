import PageTitle from '../../components/common/PageTitle';
import {Button, SearchableSelect} from '../../components/form';
import { subscriptionsService } from '../../services/subscriptionsService';
import { useState, useEffect, useMemo } from 'react';
import {BANK_OPTIONS, YES_NO_OPTIONS} from "../../config/memberConstants.js";
import {useLocation} from "react-router-dom";


export default function Subscriptions() {
    const location = useLocation();

    const [filters, setFilters] = useState({
        bankName: location.state?.filters?.bankName || "",
        isCoreBanking: "",
    });
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const bankOptions = BANK_OPTIONS;
    const yesNoOptions = YES_NO_OPTIONS;

    // Format LocalDateTime array from backend to readable date string
    const formatDate = (dateArray) => {
        if (!dateArray) return '';
        if (Array.isArray(dateArray)) {
            const [year, month, day] = dateArray;
            return new Date(year, month - 1, day).toLocaleDateString();
        }
        return new Date(dateArray).toLocaleDateString();
    };

    const handleInputChange = (field) => (value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const fetchSubscriptions = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await subscriptionsService.getAll();
            let filtered = data.filter(sub => sub.bankName === filters.bankName);
            
            // Apply Core Banking filter if selected
            if (filters.isCoreBanking !== "") {
                const isCore = filters.isCoreBanking === "true";
                filtered = filtered.filter(sub => sub.isCoreBanking === isCore);
            }
            
            setSubscriptions(filtered);
        } catch (err) {
            setError(err);
            setSubscriptions([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch subscriptions when bankName or isCoreBanking filter changes
    useEffect(() => {
        if (filters.bankName) {
            fetchSubscriptions();
        } else {
            setSubscriptions([]);
        }
    }, [filters.bankName, filters.isCoreBanking]);

    const handleEdit = (subscription) => {
        setEditingId(subscription.id);
        setEditData(subscription);
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditData({});
    };

    const handleSave = async () => {
        try {
            await subscriptionsService.update(editingId, editData);
            setSubscriptions(prev => prev.map(s => s.id === editingId ? editData : s));
            setEditingId(null);
            setEditData({});
        } catch (err) {
            setError(err);
        }
    };

    const handleEditFieldChange = (field, value) => {
        setEditData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <PageTitle title="Subscriptions" subtitle="Manage subscriptions" />
            <div className="max-w-6xl mx-auto p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SearchableSelect label="Bank Name" value={filters.bankName} onChange={handleInputChange("bankName")} placeholder="All Banks"
                                      options={[{ value: '', label: 'All Banks' }, ...bankOptions.map(b => ({ value: b, label: b }))]} />
                    
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                            Core Banking (Y/N)
                        </label>
                        <select value={filters.isCoreBanking} onChange={(e) => handleInputChange("isCoreBanking")(e.target.value)} className="w-full rounded-lg px-4 py-2.5 text-sm border bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 transition-all border-gray-200 dark:border-gray-700">
                            <option value="">All</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg">
                        Error: {error}
                    </div>
                )}

                {loading && (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
                    </div>
                )}

                {!loading && subscriptions.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-700">
                                <tr>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold">Bank Name</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold">ACB Debit Day</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold">Subscription Amount</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold">Core Banking</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold">Status</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold">Registration Date</th>
                                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subscriptions.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                        {editingId === sub.id ? (
                                            <>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">{sub.bankName}</td>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                                                    <input type="number" value={editData.acbDebitDay || ''} onChange={(e) => handleEditFieldChange('acbDebitDay', parseInt(e.target.value))} className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
                                                </td>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                                                    <input type="number" step="0.01" value={editData.subscriptionAmount || ''} onChange={(e) => handleEditFieldChange('subscriptionAmount', parseFloat(e.target.value))} className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
                                                </td>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                                                    <select value={editData.isCoreBanking === true ? 'true' : editData.isCoreBanking === false ? 'false' : ''} onChange={(e) => handleEditFieldChange('isCoreBanking', e.target.value === 'true')} className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
                                                        <option value="">Select...</option>
                                                        <option value="true">Yes</option>
                                                        <option value="false">No</option>
                                                    </select>
                                                </td>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                                                    <select value={editData.status || ''} onChange={(e) => handleEditFieldChange('status', e.target.value)} className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
                                                        <option value="">Select...</option>
                                                        <option value="ACTIVE">ACTIVE</option>
                                                        <option value="PENDING">PENDING</option>
                                                        <option value="INACTIVE">INACTIVE</option>
                                                    </select>
                                                </td>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">{formatDate(editData.registrationDate)}</td>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                                                    <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs mr-2">Save</button>
                                                    <button onClick={handleCancel} className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs">Cancel</button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">{sub.bankName}</td>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">{sub.acbDebitDay}</td>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">R {parseFloat(sub.subscriptionAmount).toFixed(2)}</td>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">{sub.isCoreBanking ? 'Yes' : 'No'}</td>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${sub.status === 'ACTIVE' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : sub.status === 'PENDING' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'}`}>
                                                        {sub.status}
                                                    </span>
                                                </td>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">{formatDate(sub.registrationDate)}</td>
                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                                                    <button onClick={() => handleEdit(sub)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">Edit</button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && subscriptions.length === 0 && filters.bankName && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No subscriptions found for the selected bank.
                    </div>
                )}

                {!filters.bankName && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        Select a bank to view subscriptions.
                    </div>
                )}
            </div>
        </div>
    );
}

const fieldCls = (error) =>
    `w-full rounded-lg px-4 py-2.5 text-sm border bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 transition-all ${error ? "border-red-500 dark:border-red-400" : "border-gray-200 dark:border-gray-700"
    }`;

function Field({ label, value, onChange, className = "", options = null, type = "text", error = null, disabled = false, searchable = false }) {
    return (
        <div className={className}>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                {label}
            </label>
            <div className="relative">
                {options && searchable ? (
                    <select value={value || ""} onChange={onChange} className={fieldCls(error)} disabled={disabled}>
                        <option value="">Select...</option>
                        {options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                ) : options ? (
                    <select value={value || ""} onChange={onChange} className={fieldCls(error)} disabled={disabled}>
                        <option value="">Select...</option>
                        {options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                ) : (
                    <input type={type} value={value || ""} onChange={onChange} className={fieldCls(error)} disabled={disabled} />
                )}
                {error && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>}
            </div>
        </div>
    );
}