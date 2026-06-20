import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

export default function SearchableSelect({ label, value, onChange, options, placeholder = 'Select…' }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    const selected = options.find(o => o.value === value);
    const filtered = options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        if (open) inputRef.current?.focus();
        else setSearch('');
    }, [open]);

    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = (opt) => {
        onChange({ target: { value: opt.value } });
        setOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange({ target: { value: '' } });
        setSearch('');
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
                    <span className={selected && selected.value ? '' : 'text-gray-400 dark:text-gray-500'}>
                        {selected && selected.value ? selected.label : placeholder}
                    </span>
                    <span className="flex items-center gap-1 shrink-0 ml-2">
                        {value && <X size={12} onClick={handleClear} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />}
                        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                    </span>
                </button>

                {open && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
                        <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                            <input
                                ref={inputRef}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search…"
                                className="w-full rounded-md px-2 py-1.5 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                        <ul className="max-h-48 overflow-y-auto py-1">
                            {filtered.length === 0 ? (
                                <li className="px-3 py-2 text-sm text-gray-400">No results</li>
                            ) : filtered.map(opt => (
                                <li
                                    key={opt.value}
                                    onClick={() => handleSelect(opt)}
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-cyan-700 dark:hover:text-cyan-300 font-normal normal-case tracking-normal
                                        ${opt.value === value ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 font-medium' : 'text-gray-800 dark:text-gray-200'}`}
                                >
                                    {opt.label}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
