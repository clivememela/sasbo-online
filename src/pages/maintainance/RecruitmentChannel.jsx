import { useState, useEffect, useMemo } from 'react';
import { Pencil, Trash2, UserPlus, Check, X } from 'lucide-react';
import PageTitle from '../../components/common/PageTitle';
import { Button } from '../../components/form';
import { ConfirmDialog, closeOn } from '../../components/overlay/Modal.jsx';
import { recruitmentChannelService } from '../../services/recruitmentChannelService.js';

export default function RecruitmentChannel() {
    const [recruitmentChannels, setRecruipmentChannels] = useState([]);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');

    const refresh = () => recruitmentChannelService.getAll().then(setRecruipmentChannels);

    useEffect(() => { refresh(); }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return recruitmentChannels
            .filter(r => !q || r.name.toLowerCase().includes(q))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [recruitmentChannels, search]);

    const handleAdd = async () => {
        const name = newName.trim();
        if (!name) return;
        setSaving(true);
        try {
            await recruitmentChannelService.create(name);
            await refresh();
            setNewName('');
            setShowAdd(false);
        } catch (err) {
            alert(err);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = async (r) => {
        const name = editName.trim();
        if (!name) return;
        setSaving(true);
        try {
            await recruitmentChannelService.update(r.id, { name, enabled: r.enabled });
            await refresh();
            setEditingId(null);
        } catch (err) {
            alert(err);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleEnabled = async (r) => {
        setSaving(true);
        try {
            await recruitmentChannelService.update(r.id, { name: r.name, enabled: !r.enabled });
            await refresh();
        } catch (err) {
            alert(err);
        } finally {
            setSaving(false);
        }
    };

    // 🔴 `03.4`: was `window.confirm()`. That dialog is unstyleable, says only OK/Cancel
    // rather than naming what will happen, blocks the whole browser thread, and is
    // SUPPRESSIBLE -- a user who ticks "don't show me these again" silently loses every
    // confirmation in the application.
    const [pendingDelete, setPendingDelete] = useState(null);

    const handleDelete = async () => {
        const r = pendingDelete;
        if (!r) return;
        setSaving(true);
        try {
            await recruitmentChannelService.remove(r.id);
            setPendingDelete(null);
            await refresh();
        } catch (err) {
            alert(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <PageTitle title="Recruitment Channel Maintenance" />

            <div className="max-w-2xl mx-auto mt-4 rounded-2xl shadow-lg bg-white dark:bg-gray-800 p-6">
                {/* Toolbar */}
                <div className="flex items-center gap-3 mb-4">
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search Recruitment Channels…"
                        className="flex-1 rounded-lg px-3 py-2 field-text border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <Button variant="primary" onClick={() => { setShowAdd(true); setNewName(''); }}>
                        <UserPlus size={14} /> Add
                    </Button>
                </div>

                {/* Add row */}
                {showAdd && (
                    <div className="flex items-center gap-2 mb-3 p-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800">
                        <input
                            autoFocus
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            placeholder="Recruitment Channel name"
                            className="flex-1 rounded-lg px-3 py-1.5 field-text border bg-white border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!newName.trim() || saving}
                            className="p-1.5 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-40 transition">
                            <Check size={16} />
                        </button>
                        <button
                            onClick={() => setShowAdd(false)}
                            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* Header */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2 text-xs uppercase tracking-wide bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300 rounded-t-xl">
                    <div>Channel Name</div>
                    <div>Status</div>
                    <div>Edit</div>
                    <div>Delete</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700 border border-t-0 border-gray-100 dark:border-gray-700 rounded-b-xl">
                    {filtered.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">No recruiter types found.</div>
                    ) : filtered.map(r => (
                        <div key={r.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-3 items-center text-sm hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
                            {editingId === r.id ? (
                                <input
                                    autoFocus
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleEdit(r);
                                        if (e.key === 'Escape') setEditingId(null);
                                    }}
                                    className="rounded-lg px-3 py-1 field-text border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                            ) : (
                                <span className={r.enabled ? '' : 'line-through text-gray-400 dark:text-gray-500'}>{r.name}</span>
                            )}

                            <button
                                onClick={() => handleToggleEnabled(r)}
                                disabled={saving}
                                title={r.enabled ? 'Disable' : 'Enable'}
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold transition disabled:opacity-40 ${
                                    r.enabled
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200'
                                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200'
                                }`}>
                                {r.enabled ? 'Active' : 'Inactive'}
                            </button>

                            {editingId === r.id ? (
                                <div className="flex items-center gap-1">
                                    <button onClick={() => handleEdit(r)} disabled={!editName.trim() || saving}
                                        className="p-1.5 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-40 transition">
                                        <Check size={14} />
                                    </button>
                                    <button onClick={() => setEditingId(null)}
                                        className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => { setEditingId(r.id); setEditName(r.name); }}
                                    disabled={saving}
                                    title="Edit"
                                    className="p-1.5 rounded-md text-cyan-500 hover:bg-cyan-50 hover:text-cyan-700 dark:hover:bg-cyan-900/20 disabled:opacity-40 transition">
                                    <Pencil size={14} />
                                </button>
                            )}

                            <button
                                onClick={() => setPendingDelete(r)}
                                disabled={saving}
                                title="Delete"
                                className="p-1.5 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 disabled:opacity-40 transition">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-right">
                    {filtered.length} recruiter type{filtered.length !== 1 ? 's' : ''}
                </p>
            </div>

            <ConfirmDialog
                open={Boolean(pendingDelete)}
                onOpenChange={closeOn(() => setPendingDelete(null))}
                title="Delete recruiter type"
                description={pendingDelete ? `"${pendingDelete.name}" will be removed from the list of recruiter types.` : undefined}
                confirmLabel="Delete recruiter type"
                loading={saving}
                onConfirm={handleDelete}
            />
        </div>
    );
}
