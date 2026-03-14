import { useState, useEffect } from 'react';
import TextInput from '../../components/form/TextInput';
import Button from '../../components/form/Button';

export default function GeneralForm({ filters }) {
    const [nonMembers, setNonMembers] = useState(
        Array.from({ length: 54 }, (_, i) => ({ id: i + 1, name: '', indicator: '' }))
    );

    const [bankDetails, setBankDetails] = useState({
        bank: filters?.bankName || 'ABSA BANK',
        ibtNo: '',
        raNo: filters?.randomAccessNumber || '94',
        costCode: '',
        telNo: ''
    });

    useEffect(() => {
        if (filters) {
            setBankDetails(prev => ({
                ...prev,
                bank: filters.bankName || prev.bank,
                raNo: filters.randomAccessNumber || prev.raNo,
            }));
        }
    }, [filters]);

    const handleNonMemberChange = (index, field, value) => {
        const updated = [...nonMembers];
        updated[index][field] = value;
        setNonMembers(updated);
    };

    return (
        <div className="max-w-6xl mx-auto p-8 bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
            <div className="text-center mb-8 border-b-2 border-cyan-600 pb-4">
                <h1 className="text-sm font-semibold text-cyan-700 dark:text-cyan-400 uppercase tracking-wide">
                    SASBO — The Finance Union — General Form
                </h1>
            </div>

            <div className="mb-8 p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border-l-4 border-cyan-500 text-sm leading-relaxed italic text-gray-700 dark:text-gray-300">
                Please indicate below the title, initials and surname of every non-member of SASBO at the branch / department, as well as, after attempting to recruit the individual, provide one of the following indicators in the application column:{' '}
                <span className="font-bold not-italic text-cyan-700 dark:text-cyan-300">
                    'J' = Joined, 'NI' = Not Interested, 'NA' = Not Available, 'NT' = No Time to See.
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                {[
                    { label: 'Bank',      field: 'bank' },
                    { label: 'IBT No',    field: 'ibtNo' },
                    { label: 'R/A No',    field: 'raNo' },
                    { label: 'Cost Code', field: 'costCode' },
                    { label: 'Tel No',    field: 'telNo' },
                ].map(({ label, field }) => (
                    <TextInput
                        key={field}
                        label={label}
                        value={bankDetails[field]}
                        onChange={(e) => setBankDetails(prev => ({ ...prev, [field]: e.target.value }))}
                    />
                ))}
            </div>

            <div className="hidden lg:grid lg:grid-cols-3 gap-8 mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {[0, 1, 2].map(i => (
                    <div key={i} className={`flex gap-4 ${i > 0 ? 'border-l border-gray-300 dark:border-gray-600 pl-4' : ''}`}>
                        <span className="w-8">#</span>
                        <span className="flex-1">Name of Non-Member</span>
                        <span className="w-20">Indicator</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
                {nonMembers.map((member, idx) => (
                    <div key={member.id} className="flex items-center gap-2 py-1 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <span className="w-8 text-xs font-medium text-gray-400 shrink-0">{member.id}.</span>
                        <input
                            type="text"
                            placeholder="Name"
                            className="flex-1 bg-transparent border-none focus:outline-none text-sm py-1 text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600"
                            value={member.name}
                            onChange={(e) => handleNonMemberChange(idx, 'name', e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Ind."
                            maxLength={2}
                            className="w-14 bg-transparent border-none focus:outline-none text-sm py-1 text-center text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 uppercase"
                            value={member.indicator}
                            onChange={(e) => handleNonMemberChange(idx, 'indicator', e.target.value)}
                        />
                    </div>
                ))}
            </div>

            <div className="mt-10 flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button variant="default">Save Draft</Button>
                <Button variant="primary">Submit Form</Button>
            </div>
        </div>
    );
}
