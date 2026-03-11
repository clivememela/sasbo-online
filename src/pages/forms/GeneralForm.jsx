import React, { useState } from 'react';

export default function GeneralForm() {
    // Generate 54 fields for non-members
    const [nonMembers, setNonMembers] = useState(
        Array.from({ length: 54 }, (_, i) => ({
            id: i + 1,
            name: '',
            indicator: ''
        }))
    );

    const [bankDetails, setBankDetails] = useState({
        bank: 'ABSA BANK',
        ibtNo: '33411143',
        raNo: '94',
        costCode: '00012643',
        telNo: '0227074211'
    });

    const handleNonMemberChange = (index, field, value) => {
        const updated = [...nonMembers];
        updated[index][field] = value;
        setNonMembers(updated);
    };

    const handleBankDetailChange = (field, value) => {
        setBankDetails(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="max-w-6xl mx-auto p-8 bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
            {/* Header */}
            <div className="text-center mb-8 border-b-2 border-cyan-600 pb-4">
                <h1 className="text-2xl font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">
                    SASBO - THE FINANCE UNION - GENERAL FORM
                </h1>
            </div>

            {/* Instructions */}
            <div className="mb-8 p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border-l-4 border-cyan-500 text-sm leading-relaxed italic">
                PLEASE INDICATE BELOW THE TITLE, INITIALS AND SURNAME OF EVERY NON-MEMBER OF SASBO AT THE BRANCH / DEPARTMENT, AS WELL AS, AFTER ATTEMPTING TO RECRUIT THE INDIVIDUAL, PROVIDE ONE OF THE FOLLOWING INDICATORS IN THE APPLICATION COLUMN, I.E., 
                <span className="font-bold ml-1 text-cyan-700 dark:text-cyan-300">
                    'J' = JOINED, 'NI' = NOT INTERESTED, 'NA' = NOT AVAILABLE, 'NT' = NO TIME TO SEE.
                </span>
            </div>

            {/* Bank Details */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase text-gray-500">Bank</label>
                    <input 
                        className="bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-cyan-500 outline-none py-1" 
                        value={bankDetails.bank} 
                        onChange={(e) => handleBankDetailChange('bank', e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase text-gray-500">IBT No</label>
                    <input 
                        className="bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-cyan-500 outline-none py-1" 
                        value={bankDetails.ibtNo} 
                        onChange={(e) => handleBankDetailChange('ibtNo', e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase text-gray-500">R/A No</label>
                    <input 
                        className="bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-cyan-500 outline-none py-1" 
                        value={bankDetails.raNo} 
                        onChange={(e) => handleBankDetailChange('raNo', e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase text-gray-500">Cost Code</label>
                    <input 
                        className="bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-cyan-500 outline-none py-1" 
                        value={bankDetails.costCode} 
                        onChange={(e) => handleBankDetailChange('costCode', e.target.value)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase text-gray-500">Tel No</label>
                    <input 
                        className="bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-cyan-500 outline-none py-1" 
                        value={bankDetails.telNo} 
                        onChange={(e) => handleBankDetailChange('telNo', e.target.value)}
                    />
                </div>
            </div>

            {/* Table Header */}
            <div className="hidden lg:grid lg:grid-cols-3 gap-8 mb-4 px-2 font-bold text-xs uppercase text-gray-500 tracking-wider">
                <div className="flex gap-4">
                    <span className="w-8">#</span>
                    <span className="flex-1">Name of Non-Member</span>
                    <span className="w-20">Indicator</span>
                </div>
                <div className="flex gap-4 border-l border-gray-300 dark:border-gray-600 pl-4">
                    <span className="w-8">#</span>
                    <span className="flex-1">Name of Non-Member</span>
                    <span className="w-20">Indicator</span>
                </div>
                <div className="flex gap-4 border-l border-gray-300 dark:border-gray-600 pl-4">
                    <span className="w-8">#</span>
                    <span className="flex-1">Name of Non-Member</span>
                    <span className="w-20">Indicator</span>
                </div>
            </div>

            {/* Non-Members List - 3 Columns on Large Screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                {nonMembers.map((member, idx) => (
                    <div key={member.id} className="flex items-center gap-2 p-1 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <span className="w-8 text-xs font-medium text-gray-400">{member.id}.</span>
                        <input
                            type="text"
                            placeholder="______________________________"
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-1 placeholder-gray-300 dark:placeholder-gray-600"
                            value={member.name}
                            onChange={(e) => handleNonMemberChange(idx, 'name', e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="__________"
                            maxLength={2}
                            className="w-16 bg-transparent border-none focus:ring-0 text-sm py-1 text-center placeholder-gray-300 dark:placeholder-gray-600 uppercase"
                            value={member.indicator}
                            onChange={(e) => handleNonMemberChange(idx, 'indicator', e.target.value)}
                        />
                    </div>
                ))}
            </div>

            <div className="mt-12 flex justify-end gap-4">
                <button className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    Save Draft
                </button>
                <button className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm shadow-md transition">
                    Submit Form
                </button>
            </div>
        </div>
    );
}
