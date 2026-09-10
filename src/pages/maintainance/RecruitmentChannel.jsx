import { useState, useEffect, useMemo, useRef } from 'react';
import { AlertCircle, Pencil, Trash2, UserPlus, Check, X } from 'lucide-react';
import PageTitle from '../../components/common/PageTitle';
import { Button } from '../../components/form';
import { ConfirmDialog, closeOn } from '../../components/overlay/Modal.jsx';
import { recruitmentChannelService } from '../../services/recruitmentChannelService.js';

export default function RecruitmentChannel() {
    const [notice, setNotice] = useState(null);
    const noticeRef = useRef(null);

    useEffect(() => {
        if (notice) noticeRef.current?.focus();
    }, [notice]);

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
            setNotice(`That change could not be saved. ${err?.message || ''}`.trim());
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
            setNotice(`That change could not be saved. ${err?.message || ''}`.trim());
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
            setNotice(`That change could not be saved. ${err?.message || ''}`.trim());
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
            setNotice(`That change could not be saved. ${err?.message || ''}`.trim());
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 text-ink">
            <PageTitle title="Recruitment Channel Maintenance" />

            {/* 🔴 WHAT FOUR `alert(err)` CALLS BECAME. Each passed a raw Error object, which
                prints "[object Error]" in some browsers -- so the member was shown a dialog
                that told them nothing, and told them it modally. */}
            {notice && (
                <div
                    ref={noticeRef}
                    tabIndex={-1}
                    aria-labelledby="channel-notice-title"
                    className="mx-auto mb-4 flex max-w-4xl items-start gap-2 rounded-lg border border-status-suspended-dot bg-status-suspended-bg p-3 text-sm text-status-suspended focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
                >
                    <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <p id="channel-notice-title" className="flex-1">{notice}</p>
                    <Button size="sm" variant="ghost" onClick={() => setNotice(null)}>Dismiss</Button>
                </div>
            )}

            <div className="max-w-2xl mx-auto mt-4 rounded-2xl shadow-lg bg-surface p-6">
                {/* Toolbar */}
                <div className="flex items-center gap-3 mb-4">
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        aria-label="Search recruitment channels"
                        placeholder="Search Recruitment Channels…"
                        className="flex-1 rounded-lg px-3 py-2 field-text border bg-surface-2 border-line text-ink focus:outline-none focus:ring-2 focus:ring-brand-ring"
                    />
                    <Button variant="primary" onClick={() => { setShowAdd(true); setNewName(''); }}>
                        <UserPlus size={14} /> Add
                    </Button>
                </div>

                {/* Add row */}
                {showAdd && (
                    <div className="flex items-center gap-2 mb-3 p-3 rounded-xl bg-brand-soft border border-brand-ring">
                        <input
                            autoFocus
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            aria-label="New recruitment channel name"
                            placeholder="Recruitment Channel name"
                            className="flex-1 rounded-lg px-3 py-1.5 field-text border bg-surface border-line text-ink focus:outline-none focus:ring-2 focus:ring-brand-ring"
                        />
                        <button
                            type="button"
                            onClick={handleAdd}
                            disabled={!newName.trim() || saving}
                            aria-label="Add this recruitment channel"
                            className="touch-target p-1.5 rounded-md text-status-active hover-hover:hover:bg-status-active-bg disabled:opacity-40 transition">
                            <Check size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowAdd(false)}
                            aria-label="Cancel adding a recruitment channel"
                            className="touch-target p-1.5 rounded-md text-ink-muted hover-hover:hover:bg-surface-2 transition">
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* Header */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2 text-xs uppercase tracking-wide bg-surface-2 text-ink-muted rounded-t-xl">
                    <div>Channel Name</div>
                    <div>Status</div>
                    <div>Edit</div>
                    <div>Delete</div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-line border border-t-0 border-line rounded-b-xl">
                    {filtered.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-ink-muted">No recruiter types found.</div>
                    ) : filtered.map(r => (
                        <div key={r.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-3 items-center text-sm hover-hover:hover:bg-surface-2/40 transition">
                            {editingId === r.id ? (
                                <input
                                    autoFocus
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    aria-label={`Rename ${r.name}`}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleEdit(r);
                                        if (e.key === 'Escape') setEditingId(null);
                                    }}
                                    className="rounded-lg px-3 py-1 field-text border bg-surface-2 border-line text-ink focus:outline-none focus:ring-2 focus:ring-brand-ring"
                                />
                            ) : (
                                <span className={r.enabled ? '' : 'line-through text-ink-muted'}>{r.name}</span>
                            )}

                            <button
                                type="button"
                                onClick={() => handleToggleEnabled(r)}
                                disabled={saving}
                                aria-pressed={r.enabled}
                                aria-label={`${r.name} is ${r.enabled ? 'active' : 'inactive'} — press to ${r.enabled ? 'disable' : 'enable'} it`}
                                className={`touch-target px-2 py-0.5 rounded-full text-xs font-semibold transition disabled:opacity-40 ${
                                    r.enabled
                                        ? 'bg-status-active-bg text-status-active hover-hover:hover:bg-status-active-dot hover-hover:hover:text-on-brand'
                                        : 'bg-surface-2 text-ink-muted hover-hover:hover:bg-surface'
                                }`}>
                                {r.enabled ? 'Active' : 'Inactive'}
                            </button>

                            {editingId === r.id ? (
                                <div className="flex items-center gap-1">
                                    <button type="button" onClick={() => handleEdit(r)} disabled={!editName.trim() || saving}
                                        aria-label={`Save the new name for ${r.name}`}
                                        className="touch-target p-1.5 rounded-md text-status-active hover-hover:hover:bg-status-active-bg disabled:opacity-40 transition">
                                        <Check size={14} />
                                    </button>
                                    <button type="button" onClick={() => setEditingId(null)}
                                        aria-label="Stop renaming and keep the current name"
                                        className="touch-target p-1.5 rounded-md text-ink-muted hover-hover:hover:bg-surface-2 transition">
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => { setEditingId(r.id); setEditName(r.name); }}
                                    disabled={saving}
                                    aria-label={`Rename ${r.name}`}
                                    className="touch-target p-1.5 rounded-md text-brand-ink hover:bg-brand-soft hover:text-brand-ink disabled:opacity-40 transition">
                                    <Pencil size={14} />
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setPendingDelete(r)}
                                disabled={saving}
                                aria-label={`Delete ${r.name}`}
                                className="touch-target p-1.5 rounded-md text-status-suspended hover:bg-status-suspended-bg hover:text-status-suspended disabled:opacity-40 transition">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                <p className="mt-3 text-xs text-ink-muted text-right">
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
