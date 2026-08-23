import { useState, useMemo, useCallback, useEffect } from 'react';

/**
 * Cascading dropdown selects for hierarchical position/structure selection.
 *
 * Renders one <select> per hierarchy level. Selecting a parent at level N
 * populates the children at level N+1.
 *
 * Props:
 *   structures   – tree array from /api/members/structures/tree (nodes have { id, name, children })
 *   selectedIds  – array of currently-selected IDs (all levels combined)
 *   onChange     – callback(selectedIds: number[])
 *   label        – field label
 *   placeholder  – placeholder text for empty selects
 */
export default function PositionTreeSelect({
    structures = [],
    selectedIds = [],
    onChange,
    label,
    placeholder = 'Select...',
}) {
    // Build a lookup: id → { node, parentChain } for resolving pre-selections
    const nodeMap = useMemo(() => {
        const map = new Map();
        const walk = (nodes, ancestors) => {
            nodes.forEach(node => {
                map.set(node.id, { node, ancestors });
                if (node.children?.length) walk(node.children, [...ancestors, node.id]);
            });
        };
        walk(structures, []);
        return map;
    }, [structures]);

    // Derive level selections from selectedIds (supports pre-selection / edit mode)
    const initialSelections = useMemo(() => {
        if (!selectedIds.length || !structures.length) return {};
        // Use the deepest (last) selected ID to reconstruct the cascade
        const deepestId = selectedIds[selectedIds.length - 1];
        const entry = nodeMap.get(deepestId);
        if (!entry) return {};

        const sel = {};
        entry.ancestors.forEach((id, level) => { sel[level] = id; });
        sel[entry.ancestors.length] = deepestId;
        return sel;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Track the selected ID at each depth level: { 0: id, 1: id, 2: id, ... }
    const [selectionsByLevel, setSelectionsByLevel] = useState(initialSelections);

    // Sync external selectedIds changes (e.g. reset when electedRep toggled to N)
    useEffect(() => {
        if (selectedIds.length === 0) {
            setSelectionsByLevel({});
        }
    }, [selectedIds]);

    // Determine the options available at each level based on the tree
    const levels = useMemo(() => {
        const result = [];

        // Level 0: root nodes
        result.push(structures);

        // Subsequent levels: children of the selected node at the previous level
        let currentLevelNodes = structures;
        let level = 0;
        while (true) {
            const selectedId = selectionsByLevel[level];
            if (selectedId == null) break;

            const selectedNode = currentLevelNodes.find(n => n.id === selectedId);
            if (!selectedNode || !selectedNode.children || selectedNode.children.length === 0) break;

            result.push(selectedNode.children);
            currentLevelNodes = selectedNode.children;
            level++;
        }

        return result;
    }, [structures, selectionsByLevel]);

    const handleSelect = useCallback((level, id) => {
        const newSelections = { ...selectionsByLevel };

        if (id === '' || id == null) {
            // Clear this level and all below
            delete newSelections[level];
            Object.keys(newSelections).forEach(key => {
                if (Number(key) > level) delete newSelections[key];
            });
        } else {
            // Set this level, clear all below
            newSelections[level] = Number(id);
            Object.keys(newSelections).forEach(key => {
                if (Number(key) > level) delete newSelections[key];
            });
        }

        setSelectionsByLevel(newSelections);

        // Collect all selected IDs across all levels
        const allIds = Object.values(newSelections).map(Number);
        onChange(allIds);
    }, [selectionsByLevel, onChange]);

    // Don't render if no structures available
    if (structures.length === 0) return null;

    const selectCls =
        'w-full rounded-lg px-4 py-2.5 text-sm border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white border-gray-200 dark:border-gray-700';

    return (
        <div className="flex flex-col gap-2">
            {label && (
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {label}
                </span>
            )}

            {levels.map((options, level) => (
                <div key={level} className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        {level === 0 ? 'Level 1' : `Level ${level + 1}`}
                    </label>
                    <select
                        value={selectionsByLevel[level] ?? ''}
                        onChange={(e) => handleSelect(level, e.target.value)}
                        className={selectCls}
                    >
                        <option value="">{placeholder}</option>
                        {options.map(node => (
                            <option key={node.id} value={node.id}>{node.name}</option>
                        ))}
                    </select>
                </div>
            ))}
        </div>
    );
}
