import { useCallback, useEffect, useMemo, useState } from 'react';

import SelectInput from './SelectInput';

/**
 * Cascading selects for a position in the structure tree. `03.2a`.
 *
 * ⚠️ **RESTYLED, NOT REBUILT -- and that was a decision the plan asked for explicitly.**
 * `PositionTreeSelect` has no shadcn equivalent, so `03.2` had to settle restyle-vs-rebuild
 * here rather than mid-P4. It is restyled: the cascade logic is the incumbent's and it is
 * correct, the one thing genuinely wrong with it was presentational and accessible, and a
 * rebuild would have put a behaviour change into the phase that is supposed to be building
 * the layer the rebuild would land on.
 *
 * 🔴 WHAT WAS ACTUALLY BROKEN: **every level's `<select>` had no accessible name.** The
 * level caption was a bare `<label>` with no `htmlFor` and no wrapping -- so, exactly like
 * [A28](../../../planning/testing/defectRegister.md) one file over, a sighted user saw
 * "Level 2" and a screen-reader user reached an unnamed combo box. Routing each level
 * through `SelectInput` fixes that structurally, and brings the 16px rule, the tokens and
 * the loading/empty states with it (contract ⑮).
 *
 * 🔑 AND THE LEVELS ARE NAMED NOW. "Level 1 / Level 2 / Level 3" describes the widget, not
 * the choice. A cascade whose captions come from the parent's own name -- *Region*, then
 * the region's children -- tells you what you are choosing. `levelLabels` lets a caller
 * supply the real vocabulary; the numbered fallback stays for callers that have none.
 *
 * Props:
 *   structures   tree from /api/members/structures/tree; nodes are { id, name, children }
 *   selectedIds  currently-selected ids, all levels
 *   onChange     callback(selectedIds: number[])
 *   levelLabels  optional captions, one per depth
 */
export default function PositionTreeSelect({
  structures = [],
  selectedIds = [],
  onChange,
  label,
  placeholder = 'Select...',
  levelLabels,
  loading = false,
  disabled = false,
}) {
  // id -> { node, ancestors }, for resolving a pre-selection back into a cascade.
  const nodeMap = useMemo(() => {
    const map = new Map();
    const walk = (nodes, ancestors) => {
      nodes.forEach((node) => {
        map.set(node.id, { node, ancestors });
        if (node.children?.length) walk(node.children, [...ancestors, node.id]);
      });
    };
    walk(structures, []);
    return map;
  }, [structures]);

  // A pre-selection, resolved back into a cascade -- ONCE, as the initial state. It was a
  // `useMemo(…, [])` whose only consumer was the `useState` on the next line, which is a
  // lazy initialiser written as a memo and needing an `exhaustive-deps` disable to survive.
  // `useState(fn)` is what that is, and the disable goes with it.
  const [selectionsByLevel, setSelectionsByLevel] = useState(() => {
    if (!selectedIds.length || !structures.length) return {};
    const deepestId = selectedIds[selectedIds.length - 1];
    const entry = nodeMap.get(deepestId);
    if (!entry) return {};

    const selection = {};
    entry.ancestors.forEach((id, level) => {
      selection[level] = id;
    });
    selection[entry.ancestors.length] = deepestId;
    return selection;
  });

  // Reset when the caller clears the selection (e.g. electedRep toggled back to N).
  //
  // 🔑 THE BAIL MATTERS MORE THAN IT LOOKS. `selectedIds` defaults to a new `[]` and call
  // sites pass computed arrays, so this effect runs on EVERY parent render. Setting a fresh
  // `{}` each time is never state-equal, so each parent render cost a second full render of
  // this component -- which invalidated the `levels` memo, produced new `options` identities,
  // and so defeated the `normaliseOptions` memo inside every `SelectInput` in the cascade.
  // Returning `previous` when it is already empty stops the whole chain.
  useEffect(() => {
    if (selectedIds.length !== 0) return;
    setSelectionsByLevel((previous) => (Object.keys(previous).length === 0 ? previous : {}));
  }, [selectedIds]);

  // One entry per visible level: the options at that depth.
  const levels = useMemo(() => {
    const result = [structures];
    let currentLevelNodes = structures;
    let level = 0;

    for (;;) {
      const selectedId = selectionsByLevel[level];
      if (selectedId == null) break;

      const selectedNode = currentLevelNodes.find((node) => node.id === selectedId);
      if (!selectedNode?.children?.length) break;

      result.push(selectedNode.children);
      currentLevelNodes = selectedNode.children;
      level += 1;
    }

    return result;
  }, [structures, selectionsByLevel]);

  const handleSelect = useCallback(
    (level, id) => {
      const next = { ...selectionsByLevel };

      // Either way, everything BELOW this level is now stale and goes.
      Object.keys(next).forEach((key) => {
        if (Number(key) > level) delete next[key];
      });

      if (id === '' || id == null) delete next[level];
      else next[level] = Number(id);

      setSelectionsByLevel(next);
      onChange(Object.values(next).map(Number));
    },
    [selectionsByLevel, onChange],
  );

  if (structures.length === 0 && !loading) return null;

  /** The caption for a depth: the caller's vocabulary, then the parent's name, then a number. */
  const captionFor = (level) => {
    if (levelLabels?.[level]) return levelLabels[level];
    if (level === 0) return label || 'Level 1';
    const parentId = selectionsByLevel[level - 1];
    const parentName = parentId == null ? null : nodeMap.get(parentId)?.node?.name;
    return parentName ? `Within ${parentName}` : `Level ${level + 1}`;
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
      )}

      {levels.map((options, level) => (
        <SelectInput
          key={level}
          label={captionFor(level)}
          value={selectionsByLevel[level] ?? ''}
          onChange={(next) => handleSelect(level, next)}
          options={options}
          optionValue="id"
          optionLabel="name"
          placeholder={placeholder}
          loading={loading && level === 0}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
