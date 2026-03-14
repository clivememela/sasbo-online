const locations = [
    {
        bank: "ABSA BANK", ibtNo: "33411143", raNo: "94", costCode: "00012643",
        telNo: "0227074211", faxNo: "27224332763", branch: "MOORREESBURG", area: "WESTERN CAPE",
        address: "GRD FLR ABSA BUILDING, MAIN STREET, MOORREESBURG, 7310",
        areaRepName: "VIWE BOKVELDT", becMembers: "", memnetMembers: "",
        bankManager: "LIZZIE NELL", bankManagerEmail: "lizzie.nell@absa.africa",
        alternativeContact: "", alternativeContactEmail: "",
        compliments: "4", membership: "4",
        lastVisited: "March 2025 , Oct 2024 , Nov 2023",
        members: [
            { memNo: "5339545", name: "ADAMS ,J, MS", bankAt: "ABSA BANK,ABSA CASH", subscr: "174", empNum: "55041458", email: "Y", id: "Y", cell: "Y", joined: "Dec 2024", susp: "0", label: "Y", alternateAddress: ", , ," },
            { memNo: "3611116", name: "ADONIS ,M, MRS", bankAt: "ABSA BANK,ABSA CASH", subscr: "174", empNum: "16123932", email: "Y", id: "Y", cell: "Y", joined: "May 2010", susp: "0", label: "Y", alternateAddress: "MAIN STREET , GRD FLR ABSA BUILDING , , 7310" },
            { memNo: "4552563", name: "KAHUNGU ,V, MS", bankAt: "ABSA BANK,ABSA CASH", subscr: "174", empNum: "16189092", email: "Y", id: "Y", cell: "Y", joined: "Apr 2017", susp: "0", label: "Y", alternateAddress: "46 NIKKEL STREET , ONGEGUND , VREDENBURG , 7380" },
            { memNo: "5269121", name: "LAMBRECHTS ,C, MRS", bankAt: "ABSA BANK,ABSA CASH", subscr: "174", empNum: "16151552", email: "Y", id: "Y", cell: "Y", joined: "March 2024", susp: "0", label: "Y", alternateAddress: ", , ," },
        ],
    },
    {
        bank: "ABSA BANK", ibtNo: "33411200", raNo: "102", costCode: "00013001",
        telNo: "0214876500", faxNo: "27214876501", branch: "BELLVILLE", area: "WESTERN CAPE",
        address: "1ST FLR ABSA CENTRE, VOORTREKKER ROAD, BELLVILLE, 7530",
        areaRepName: "NADIA PETERSEN", becMembers: "", memnetMembers: "",
        bankManager: "JOHN SMITH", bankManagerEmail: "john.smith@absa.africa",
        alternativeContact: "", alternativeContactEmail: "",
        compliments: "6", membership: "6",
        lastVisited: "Feb 2025 , Sep 2024",
        members: [
            { memNo: "6112301", name: "BOTHA ,P, MR", bankAt: "ABSA BANK,ABSA CASH", subscr: "174", empNum: "16200011", email: "Y", id: "Y", cell: "Y", joined: "Jan 2019", susp: "0", label: "Y", alternateAddress: ", , ," },
            { memNo: "6112302", name: "DAVIDS ,R, MS", bankAt: "ABSA BANK,ABSA CASH", subscr: "174", empNum: "16200022", email: "Y", id: "N", cell: "Y", joined: "Mar 2021", susp: "0", label: "Y", alternateAddress: "12 OAK AVE , BELLVILLE , , 7530" },
        ],
    },
    {
        bank: "STANDARD BANK", ibtNo: "44522100", raNo: "210", costCode: "00021001",
        telNo: "0117005000", faxNo: "27117005001", branch: "SANDTON", area: "GAUTENG",
        address: "3RD FLR STANDARD BANK CENTRE, 5 SIMMONDS ST, SANDTON, 2196",
        areaRepName: "THABO NKOSI", becMembers: "", memnetMembers: "",
        bankManager: "SARAH JONES", bankManagerEmail: "sarah.jones@standardbank.co.za",
        alternativeContact: "", alternativeContactEmail: "",
        compliments: "8", membership: "8",
        lastVisited: "Jan 2025 , Aug 2024 , May 2024",
        members: [
            { memNo: "7001001", name: "DLAMINI ,S, MR", bankAt: "STANDARD BANK", subscr: "174", empNum: "20100101", email: "Y", id: "Y", cell: "Y", joined: "Jun 2018", susp: "0", label: "Y", alternateAddress: ", , ," },
            { memNo: "7001002", name: "KHUMALO ,T, MRS", bankAt: "STANDARD BANK", subscr: "174", empNum: "20100102", email: "Y", id: "Y", cell: "Y", joined: "Nov 2020", susp: "0", label: "Y", alternateAddress: "45 RIVONIA RD , SANDTON , , 2196" },
            { memNo: "7001003", name: "MOKOENA ,L, MS", bankAt: "STANDARD BANK", subscr: "174", empNum: "20100103", email: "N", id: "Y", cell: "Y", joined: "Feb 2022", susp: "0", label: "N", alternateAddress: ", , ," },
        ],
    },
    {
        bank: "NEDBANK", ibtNo: "55633200", raNo: "315", costCode: "00031501",
        telNo: "0312045000", faxNo: "27312045001", branch: "DURBAN CENTRAL", area: "KWAZULU-NATAL",
        address: "2ND FLR NEDBANK BUILDING, SMITH STREET, DURBAN, 4001",
        areaRepName: "PRIYA NAIDOO", becMembers: "", memnetMembers: "",
        bankManager: "MIKE VAN DER BERG", bankManagerEmail: "mike.vanderberg@nedbank.co.za",
        alternativeContact: "", alternativeContactEmail: "",
        compliments: "3", membership: "3",
        lastVisited: "Apr 2025 , Dec 2024",
        members: [
            { memNo: "8002001", name: "PILLAY ,V, MR", bankAt: "NEDBANK", subscr: "174", empNum: "30200201", email: "Y", id: "Y", cell: "Y", joined: "Sep 2017", susp: "0", label: "Y", alternateAddress: ", , ," },
            { memNo: "8002002", name: "REDDY ,A, MRS", bankAt: "NEDBANK", subscr: "174", empNum: "30200202", email: "Y", id: "Y", cell: "N", joined: "Jul 2023", susp: "0", label: "Y", alternateAddress: "88 BEREA RD , DURBAN , , 4001" },
        ],
    },
    {
        bank: "FNB", ibtNo: "66744300", raNo: "420", costCode: "00042001",
        telNo: "0124265000", faxNo: "27124265001", branch: "PRETORIA CENTRAL", area: "GAUTENG",
        address: "1ST FLR FNB TOWERS, CHURCH STREET, PRETORIA, 0002",
        areaRepName: "ANDILE ZULU", becMembers: "", memnetMembers: "",
        bankManager: "CAROL PRETORIUS", bankManagerEmail: "carol.pretorius@fnb.co.za",
        alternativeContact: "", alternativeContactEmail: "",
        compliments: "5", membership: "5",
        lastVisited: "Mar 2025 , Nov 2024 , Jul 2024",
        members: [
            { memNo: "9003001", name: "ERASMUS ,C, MR", bankAt: "FNB", subscr: "174", empNum: "40300301", email: "Y", id: "Y", cell: "Y", joined: "Oct 2016", susp: "0", label: "Y", alternateAddress: ", , ," },
            { memNo: "9003002", name: "FOURIE ,M, MS", bankAt: "FNB", subscr: "174", empNum: "40300302", email: "Y", id: "N", cell: "Y", joined: "Apr 2019", susp: "0", label: "Y", alternateAddress: "22 PAUL KRUGER ST , PRETORIA , , 0002" },
            { memNo: "9003003", name: "GROBLER ,H, MRS", bankAt: "FNB", subscr: "174", empNum: "40300303", email: "N", id: "Y", cell: "Y", joined: "Jan 2021", susp: "0", label: "Y", alternateAddress: ", , ," },
        ],
    },
];

export const locationService = {
    search: ({ bankName = "", branch = "", area = "", randomAccessNumber = "" } = {}) => {
        const bankQ = bankName.trim().toLowerCase();
        const branchQ = branch.trim().toLowerCase();
        const areaQ = area.trim().toLowerCase();
        const ranQ = randomAccessNumber.trim().toLowerCase();

        return locations.filter((loc) => {
            if (bankQ && !loc.bank.toLowerCase().includes(bankQ)) return false;
            if (branchQ && !loc.branch.toLowerCase().includes(branchQ)) return false;
            if (areaQ && !loc.area.toLowerCase().includes(areaQ)) return false;
            if (ranQ && !loc.raNo.toLowerCase().includes(ranQ)) return false;
            return true;
        });
    },
};
