import React from 'react';

const LocationListing = ({ data, filters }) => {
    // Default data if none provided (matching the issue description)
    const listingData = data || {
        bank: filters?.bankName || "ABSA BANK",
        ibtNo: "33411143",
        raNo: filters?.randomAccessNumber || "94",
        costCode: "00012643",
        telNo: "0227074211",
        faxNo: "27224332763",
        branch: filters?.branch || "MOORREESBURG",
        address: "GRD FLR ABSA BUILDING,MAIN STREET,MOORREESBURG,7310",
        members: [
            {
                memNo: "5339545",
                name: "ADAMS ,J, MS",
                bankAt: "ABSA BANK,ABSA CASH",
                subscr: "174",
                empNum: "55041458",
                email: "Y",
                id: "Y",
                cell: "Y",
                joined: "Dec 2024",
                susp: "0",
                label: "Y",
                alternateAddress: ", , ,"
            },
            {
                memNo: "3611116",
                name: "ADONIS ,M, MRS",
                bankAt: "ABSA BANK,ABSA CASH",
                subscr: "174",
                empNum: "16123932",
                email: "Y",
                id: "Y",
                cell: "Y",
                joined: "May 2010",
                susp: "0",
                label: "Y",
                alternateAddress: "MAIN STREET , GRD FLR ABSA BUILDING , , 7310"
            },
            {
                memNo: "4552563",
                name: "KAHUNGU ,V, MS",
                bankAt: "ABSA BANK,ABSA CASH",
                subscr: "174",
                empNum: "16189092",
                email: "Y",
                id: "Y",
                cell: "Y",
                joined: "Apr 2017",
                susp: "0",
                label: "Y",
                alternateAddress: "46 NIKKEL STREET , ONGEGUND , VREDENBURG , 7380"
            },
            {
                memNo: "5269121",
                name: "LAMBRECHTS ,C, MRS",
                bankAt: "ABSA BANK,ABSA CASH",
                subscr: "174",
                empNum: "16151552",
                email: "Y",
                id: "Y",
                cell: "Y",
                joined: "March 2024",
                susp: "0",
                label: "Y",
                alternateAddress: ", , ,"
            }
        ],
        areaRepName: "VIWE BOKVELDT",
        becMembers: "",
        memnetMembers: "",
        bankManager: "LIZZIE NELL",
        bankManagerEmail: "lizzie.nell@absa.africa",
        alternativeContact: "",
        alternativeContactEmail: "",
        compliments: "4",
        membership: "4",
        lastVisited: "March 2025 , Oct 2024 , Nov 2023 , Nov 2021 , Jul 2021 , Jan 2021 , Jul 2019 , Jun 2017 , Aug 2016 , Nov 2015"
    };

    // Update with filters if they change and data is not provided
    if (!data && filters) {
        if (filters.bankName) listingData.bank = filters.bankName;
        if (filters.branch) listingData.branch = filters.branch;
        if (filters.randomAccessNumber) listingData.raNo = filters.randomAccessNumber;
    }

    return (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md max-w-6xl mx-auto my-6 font-sans border border-gray-200 dark:border-gray-700">

            {/* Title */}
            <div className="text-center font-bold text-base tracking-wide mb-5 pb-3 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white uppercase">
                SASBO Finance Union — Location Listing
            </div>

            {/* Header info */}
            <div className="grid grid-cols-4 gap-x-6 gap-y-1.5 mb-5 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-sm">
                {[['Bank', listingData.bank], ['IBT No', listingData.ibtNo], ['R/A No', listingData.raNo], ['Cost Code', listingData.costCode],
                  ['Tel No', listingData.telNo], ['Fax No', listingData.faxNo, 3], ['Branch', listingData.branch], ['Address', listingData.address, 3]
                ].map(([label, value, span]) => (
                    <div key={label} className={`flex gap-1.5 text-gray-700 dark:text-gray-300${span ? ` col-span-${span}` : ''}`}>
                        <span className="font-semibold shrink-0 text-gray-900 dark:text-gray-100">{label}:</span>
                        <span>{value}</span>
                    </div>
                ))}
            </div>

            {/* Members table */}
            <div className="overflow-x-auto mb-5">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800 text-left text-xs uppercase tracking-wide text-gray-600 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">
                            <th className="py-2 px-2 whitespace-nowrap">Mem No</th>
                            <th className="py-2 px-2">Name of Member</th>
                            <th className="py-2 px-2">Bank At</th>
                            <th className="py-2 px-2 text-right">Subscr</th>
                            <th className="py-2 px-2">Emp Num</th>
                            <th className="py-2 px-2 text-center">Email</th>
                            <th className="py-2 px-2 text-center">ID</th>
                            <th className="py-2 px-2 text-center">Cell</th>
                            <th className="py-2 px-2 whitespace-nowrap">Joined</th>
                            <th className="py-2 px-2 text-center">Susp</th>
                            <th className="py-2 px-2 text-center">Label</th>
                        </tr>
                    </thead>
                    <tbody>
                        {listingData.members.map((member, index) => (
                            <React.Fragment key={index}>
                                <tr className={`text-sm text-gray-800 dark:text-gray-200 ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/60'}`}>
                                    <td className="py-1.5 px-2 whitespace-nowrap">{member.memNo}</td>
                                    <td className="py-1.5 px-2 font-semibold whitespace-nowrap">{member.name}</td>
                                    <td className="py-1.5 px-2">{member.bankAt}</td>
                                    <td className="py-1.5 px-2 text-right">{member.subscr}</td>
                                    <td className="py-1.5 px-2">{member.empNum}</td>
                                    <td className="py-1.5 px-2 text-center">{member.email}</td>
                                    <td className="py-1.5 px-2 text-center">{member.id}</td>
                                    <td className="py-1.5 px-2 text-center">{member.cell}</td>
                                    <td className="py-1.5 px-2 whitespace-nowrap">{member.joined}</td>
                                    <td className="py-1.5 px-2 text-center">{member.susp}</td>
                                    <td className="py-1.5 px-2 text-center">{member.label}</td>
                                </tr>
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <td />
                                    <td colSpan="10" className="pb-2 px-2 text-xs italic text-gray-400 dark:text-gray-500">
                                        Alt. Address: {member.alternateAddress}
                                    </td>
                                </tr>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer details */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
                {[
                    ['Area Rep Name', listingData.areaRepName],
                    ['BEC Members', listingData.becMembers],
                    ['Memnet Members', listingData.memnetMembers],
                    ['Bank Manager', listingData.bankManager],
                    ['Bank Manager Email', listingData.bankManagerEmail],
                    ['Alternative Contact', listingData.alternativeContact],
                    ['Alternative Contact Email', listingData.alternativeContactEmail],
                    ['Compliments', listingData.compliments],
                    ['Membership', listingData.membership],
                    ['Last Visited', listingData.lastVisited],
                ].map(([label, value]) => (
                    <div key={label} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-semibold min-w-[220px] shrink-0 text-gray-900 dark:text-gray-100">{label}:</span>
                        <span>{value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LocationListing;
