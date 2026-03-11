import React from 'react';

const LocationListing = ({ data }) => {
    // Default data if none provided (matching the issue description)
    const listingData = data || {
        bank: "ABSA BANK",
        ibtNo: "33411143",
        raNo: "94",
        costCode: "00012643",
        telNo: "0227074211",
        faxNo: "27224332763",
        branch: "MOORREESBURG",
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

    return (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md max-w-6xl mx-auto my-8 text-xs font-mono border border-gray-200 dark:border-gray-700">
            <div className="text-center font-bold text-lg mb-6 border-b pb-2 dark:text-white">
                SASBO FINANCE UNION - LOCATION LISTING
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4 text-[10px] uppercase dark:text-gray-300">
                <div className="flex gap-2"><span className="font-bold">Bank :</span> {listingData.bank}</div>
                <div className="flex gap-2"><span className="font-bold">IBT No :</span> {listingData.ibtNo}</div>
                <div className="flex gap-2"><span className="font-bold">R/A No :</span> {listingData.raNo}</div>
                <div className="flex gap-2"><span className="font-bold">Cost Code :</span> {listingData.costCode}</div>
                <div className="flex gap-2"><span className="font-bold">Tel No :</span> {listingData.telNo}</div>
                <div className="flex gap-2 col-span-3"><span className="font-bold">Fax No :</span> {listingData.faxNo}</div>
                <div className="flex gap-2"><span className="font-bold">Branch :</span> {listingData.branch}</div>
                <div className="flex gap-2 col-span-3"><span className="font-bold">Address :</span> {listingData.address}</div>
            </div>

            <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse text-[10px]">
                    <thead>
                        <tr className="border-b-2 border-gray-300 dark:border-gray-600 text-left dark:text-gray-200">
                            <th className="py-1 pr-2">MEM.NO</th>
                            <th className="py-1 pr-2">NAME OF MEMBER</th>
                            <th className="py-1 pr-2">BANK AT</th>
                            <th className="py-1 pr-2">SUBSCR</th>
                            <th className="py-1 pr-2">EMP.NUM</th>
                            <th className="py-1 pr-2 text-center">EMAIL</th>
                            <th className="py-1 pr-2 text-center">ID</th>
                            <th className="py-1 pr-2 text-center">CELL</th>
                            <th className="py-1 pr-2">JOINED</th>
                            <th className="py-1 pr-2 text-center">SUSP</th>
                            <th className="py-1 text-center">LABEL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {listingData.members.map((member, index) => (
                            <React.Fragment key={index}>
                                <tr className="dark:text-gray-300">
                                    <td className="py-1 pr-2">{member.memNo}</td>
                                    <td className="py-1 pr-2 font-bold">{member.name}</td>
                                    <td className="py-1 pr-2">{member.bankAt}</td>
                                    <td className="py-1 pr-2">{member.subscr}</td>
                                    <td className="py-1 pr-2">{member.empNum}</td>
                                    <td className="py-1 pr-2 text-center">{member.email}</td>
                                    <td className="py-1 pr-2 text-center">{member.id}</td>
                                    <td className="py-1 pr-2 text-center">{member.cell}</td>
                                    <td className="py-1 pr-2 whitespace-nowrap">{member.joined}</td>
                                    <td className="py-1 pr-2 text-center">{member.susp}</td>
                                    <td className="py-1 text-center">{member.label}</td>
                                </tr>
                                <tr className="border-b border-gray-100 dark:border-gray-800 italic text-gray-500 dark:text-gray-500">
                                    <td className="pb-2"></td>
                                    <td colSpan="10" className="pb-2">
                                        Alternate Address : {member.alternateAddress}
                                    </td>
                                </tr>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="space-y-1 text-[10px] dark:text-gray-300">
                <div className="flex gap-2"><span className="font-bold w-48 shrink-0">AREA REP NAME :</span> {listingData.areaRepName}</div>
                <div className="flex gap-2"><span className="font-bold w-48 shrink-0">BEC MEMBERS :</span> {listingData.becMembers}</div>
                <div className="flex gap-2"><span className="font-bold w-48 shrink-0">MEMNET MEMBERS :</span> {listingData.memnetMembers}</div>
                <div className="flex gap-2"><span className="font-bold w-48 shrink-0">BANK MANAGER :</span> {listingData.bankManager}</div>
                <div className="flex gap-2"><span className="font-bold w-48 shrink-0">BANK MANAGER EMAIL:</span> {listingData.bankManagerEmail}</div>
                <div className="flex gap-2"><span className="font-bold w-48 shrink-0">ALTERNATIVE CONTACT :</span> {listingData.alternativeContact}</div>
                <div className="flex gap-2"><span className="font-bold w-48 shrink-0">ALTERNATIVE CONTACT EMAIL :</span> {listingData.alternativeContactEmail}</div>
                <div className="flex gap-2"><span className="font-bold w-48 shrink-0">COMPLIMENTS :</span> {listingData.compliments}</div>
                <div className="flex gap-2"><span className="font-bold w-48 shrink-0">MEMBERSHIP :</span> {listingData.membership}</div>
                <div className="flex gap-2"><span className="font-bold w-48 shrink-0">LAST VISITED :</span> {listingData.lastVisited}</div>
            </div>
        </div>
    );
};

export default LocationListing;
