import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

/**
 * Multi-select tree dropdown for hierarchical positions/structures.
 *
 * Props:
 *   label        – field label
 *   structures   – flat array of { id, name, parentId }
 *   selectedIds  – array of currently-selected IDs
 *   onChange     – callback(selectedIds: number[])
 *   placeholder  – placeholder text when nothing selected
 */
export default function PositionTreeSelect({
    label,
    structures = [],
    selectedIds = [],
    onChange,
    placeholder = 'Select positions...',
}) {
    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState(new Set());
    const containerRef = useRef(null);

    // Build tree from flat list
    const tree = useMemo(() => {
        const map = new Map();
        structures.forEach(s => map.set(s.id, { ...s, children: [] }));
        const roots = [];
        map.forEach(node => {
            if (node.parentId && map.has(node.parentId)) {
                map.get(node.parentId).children.push(node);
            } else {
                roots.push(node);
            }
        });
        return roots;
    }, [structures]);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggleExpand = useCallback((id) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleCheck = useCallback((id) => {
        onChange(
            selectedIds.includes(id)
                ? selectedIds.filter(x => x !== id)
                : [...selectedIds, id]
        );
    }, [selectedIds, onChange]);

    // Collect all descendant IDs (including self)
    const getDescendantIds = useCallback((node) => {
        const ids = [node.id];
        node.children.forEach(child => {
            ids.push(...getDescendantIds(child));
        });
        return ids;
    }, []);

    // Check if all descendants are selected
    const areAllDescendantsSelected = useCallback((node) => {
        const ids = getDescendantIds(node);
        return ids.every(id => selectedIds.includes(id));
    }, [selectedIds, getDescendantIds]);

    // Check if some (but not all) descendants are selected
    const areSomeDescendantsSelected = useCallback((node) => {
        const ids = getDescendantIds(node);
        const count = ids.filter(id => selectedIds.includes(id)).length;
        return count > 0 && count < ids.length;
    }, [selectedIds, getDescendantIds]);

    const toggleParentCheck = useCallback((node) => {
        const descendantIds = getDescendantIds(node);
        const allSelected = descendantIds.every(id => selectedIds.includes(id));
        if (allSelected) {
            // Deselect all descendants
            onChange(selectedIds.filter(id => !descendantIds.includes(id)));
        } else {
            // Select all descendants
            const newIds = [...new Set([...selectedIds, ...descendantIds])];
            onChange(newIds);
        }
    }, [selectedIds, onChange, getDescendantIds]);

    const handleClear = useCallback((e) => {
        e.stopPropagation();
        onChange([]);
    }, [onChange]);

    // Build display text for selected items
    const displayText = useMemo(() => {
        if (selectedIds.length === 0) return null;
        return selectedIds
            .map(id => structures.find(s => s.id === id)?.name)
            .filter(Boolean)
            .join(', ');
    }, [selectedIds, structures]);

    // Recursive tree node renderer
    const renderNode = (node, depth = 0) => {
        const hasChildren = node.children.length > 0;
        const isExpanded = expanded.has(node.id);
        const isChecked = selectedIds.includes(node.id);
        const allChildrenChecked = hasChildren && areAllDescendantsSelected(node);
        const someChildrenChecked = hasChildren && areSomeDescendantsSelected(node);
        const indent = depth * 16;

        return (
            <li key={node.id}>
                <div
                    className={`flex items-center gap-1 py-1.5 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 cursor-pointer`}
                    style={{ paddingLeft: `${8 + indent}px`, paddingRight: '8px' }}
                >
                    {/* Expand/collapse toggle */}
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
                            className="shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                            {isExpanded
                                ? <ChevronDown size={14} className="text-gray-500 dark:text-gray-400" />
                                : <ChevronRight size={14} className="text-gray-500 dark:text-gray-400" />}
                        </button>
                    ) : (
                        <span className="w-5 shrink-0" />
                    )}

                    {/* Checkbox */}
                    <input
                        type="checkbox"
                        checked={allChildrenChecked || isChecked}
                        ref={el => { if (el) el.indeterminate = someChildrenChecked && !allChildrenChecked; }}
                        onChange={() => hasChildren ? toggleParentCheck(node) : toggleCheck(node.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 shrink-0"
                    />

                    {/* Label */}
                    <span
                        className={`text-sm select-none ${
                            isChecked || allChildrenChecked
                                ? 'text-cyan-700 dark:text-cyan-300 font-medium'
                                : 'text-gray-800 dark:text-gray-200'
                        }`}
                        onClick={() => hasChildren ? toggleParentCheck(node) : toggleCheck(node.id)}
                    >
                        {node.name}
                    </span>
                </div>

                {/* Children */}
                {hasChildren && isExpanded && (
                    <ul>{node.children.map(child => renderNode(child, depth + 1))}</ul>
                )}
            </li>
        );
    };

    return (
        <div ref={containerRef} className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {label && <span>{label}</span>}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-normal normal-case tracking-normal border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
                >
                    <span className={`truncate ${!displayText ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                        {displayText || placeholder}
                    </span>
                    <span className="flex items-center gap-1 shrink-0 ml-2">
                        {selectedIds.length > 0 && (
                            <X
                                size={12}
                                onClick={handleClear}
                                aria-label="Clear all"
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            />
                        )}
                        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                    </span>
                </button>

                {open && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg max-h-64 overflow-y-auto">
                        {tree.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-400">No positions available</div>
                        ) : (
                            <ul className="py-1">{tree.map(node => renderNode(node))}</ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
