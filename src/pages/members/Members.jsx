import {useEffect, useMemo, useState, useRef} from "react";
import {useNavigate, useLocation} from "react-router-dom";
import {LucideUserRoundPlus, Plus, CheckCircle2} from "lucide-react";
import {memberService} from "../../services/memberService.js";

// Hoist constants to the module scope so their identity is stable across renders.
// This preserves memoization semantics for `useMemo` below.
const PAGE_SIZE = memberService.getPageSize();
const SearchMembersData = memberService.getMembers();

export default function Members() {
    const navigate = useNavigate();
    const location = useLocation();
    const [filters, setFilters] = useState({
        title: "",
        employeeNumber: "",
        membershipNumber: "",
        initials: "",
        surname: "",
        idNumber: "",
        bankName: location.state?.filters?.bankName || "",
        branch: location.state?.filters?.branch || "",
        bankAccountNumber: "",
        phone: "",
        email: "",
        status: "",
        race: "",
    });

    const [page, setPage] = useState(1);
    // Keep expandedId for backward compatibility (unused for inline view now)
    const [expandedId, setExpandedId] = useState(null);
    // Modal state: which member is currently shown in the modal
    const [selectedMember, setSelectedMember] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [lastSearchTime, setLastSearchTime] = useState(0);
    const [activeTab, setActiveTab] = useState("personal");
    const [showSavedNotification, setShowSavedNotification] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const prevMemberIdRef = useRef(null);

    const tabs = [
        {id: "personal", label: "Personal Information"},
        {id: "membership", label: "Membership & Subs"},
        {id: "employment", label: "Employment & Bank"},
        {id: "representatives", label: "Representatives"},
        {id: "history", label: "History & Remarks"},
    ];

    const frequencyOptions = ["Monthly", "Quarterly", "Bi-annually", "Annually"];
    const titleOptions = ["Mr", "Ms", "Mrs", "Dr", "Prof"];
    const raceOptions = ["African", "White", "Coloured", "Indian", "Other"];
    const paymentTypeOptions = ["Debit Order", "Payroll Deduction", "Cash"];
    const statusOptions = ["Active", "Pending", "Suspended", "Resigned", "Retired"];
    const yesNoOptions = ["Y", "N"];
    const suspensionCodeOptions = ["", "NON-PAY", "RESIGN"];
    const bankOptions = [
        "Absa Bank", "Absa Bank Limited", "Access Bank (South Africa) Limited", "AfrAsia Bank Limited", "African Bank Limited",
        "Albaraka Bank Limited", "Banco Internacional de Credito", "Bank Julius Baer & Co. Ltd", "Bank Lombard Odier & Co Limited",
        "Bank Of China Limited", "Bank Of Communication Co., Ltd", "Bank Vontobel AG", "Bank Zero Mutual Bank", "Bank of America N.A.",
        "Bank of Taiwan", "Banque SYZ SA", "Barclays Bank PLC", "Bidvest Bank Limited", "CBZ Bank Limited", "Caixa Geral de Depositos",
        "CaixaBank", "Capital International Bank Limited", "Capitec Bank", "Capitec Bank Limited", "China Construction Bank Corporation",
        "Citibank", "Commerzbank AG", "Deutsche Bank (Suisse) SA", "Deutsche Bank AG", "Discovery Bank Limited",
        "Ditsobotla Primary Savings and Credit Co-operative Bank", "Doha Bank", "Ecobank", "Export Import Bank of India",
        "First National Bank", "FirstRand Limited", "GBS Mutual Bank", "GIG Co-operative Bank", "GoTyme Bank Limited",
        "Goldman Sachs International Bank", "HBZ Bank Limited", "HSBC Bank Plc", "Industrial and Commercial Bank of China",
        "Investec Bank", "Investec Bank Limited", "KSK Kooperatiewe Bank Beperk", "KfW IPEX-Bank GmbH", "Macquarie Bank Limited",
        "Metbank Limited", "Mitsubishi UFJ Financial Group Bank, Ltd.", "Mizuho Bank Ltd", "Nedbank", "OM Bank Limited",
        "OSK Kooperatiewe Bank Beperk", "Sasfin Bank Limited", "Societe Generale", "Standard Bank", "Standard Bank South Africa",
        "State Bank of India", "Sumitomo Mitsui Banking", "The Export & Import Bank of China", "The Mauritius Commercial Bank Limited",
        "The Standard Bank of South Africa Limited", "Ubank (under curatorship)", "Union Bancaire Privee, UBP SA",
        "Ziphakamise Savings and Credit Co-operative Bank", "eNL Mutual Bank"
    ];
    const branchOptions = [
        "Cape Town", "Durban", "Head Office", "Johannesburg", "Johannesburg Branch", "Midrand", "Pretoria",
        "Representative Office", "Rivonia", "Rosebank", "Sandton", "South Africa Branch", "Soweto", "Stellenbosch"
    ];
    const jobGradeOptions = Array.from({length: 12}, (_, i) => (i + 1).toString());
    const managerOptions = ["MGR-001"];
    const repOptions = [
        "Self", "System", "Achmat Adams", "Alvaro Legoinha", "Amanda Hlatshwayo", "Amol Prabhu", "Annerie Visser",
        "Ashley Cameron", "Ashutosh Kumar", "Benjamin Davis", "Bob Jones", "Chaoyang Zhang", "Charles van Staden",
        "Cheslyn Jacobs", "Cumesh Moodliar", "Dale Wood", "David Hodnett", "David Kasinamunda", "Dean Radbourne",
        "Graham Lee", "Hannah Sadiki", "Hanri Maritz", "Hylton Kallner", "J Wang", "John Doe", "Jonathan Fincham",
        "Karen Black", "Kathryn Quayle", "Kennedy Bungane", "Kenny Fihla", "Li Li", "Lungisa Fuzile", "M Luo",
        "Mark Selcraig", "Mark Sherratt", "Marna Sabrina Pfranger", "Mary Vilakazi", "Mauro Rogerio", "Michael Shirley",
        "Micheal Sassoon", "Nathalie Villette Py", "Nthabeleng Likotsi", "Paul Sayers", "Peter Liu", "Peter Taylor",
        "Phibeon Mutibura", "Ramiro Sebastiao", "Raphael Marlio-Marette", "Saloshni Pillay", "Sandile Shabalala",
        "Shabir Chohan", "Shugo Suzuki", "Shyamasish Acharya", "Sidhambaram Perumal Pillay", "Simon Denny",
        "Stefano Rausch", "Thorsten Metz", "Tinus Myburgh", "Tsakani Clarence Nethengwe", "Veronica Padi",
        "Viviana van Agtmaal", "Yatin Narsai", "Yongzhi Ban", "Yvonne Holenstein"
    ];
    const dayOptions = Array.from({length: 31}, (_, i) => (i + 1).toString().padStart(2, '0'));
    const monthOptions = Array.from({length: 12}, (_, i) => (i + 1).toString().padStart(2, '0'));
    const yearOptions = Array.from({length: 21}, (_, i) => (new Date().getFullYear() - 10 + i).toString());

    // Close modal on an Escape key
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                setSelectedMember(null);
                setIsEditing(false);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    useEffect(() => {
        if (selectedMember) {
            setEditForm({...selectedMember});
            // Only reset to personal tab if we've switched to a DIFFERENT member
            if (prevMemberIdRef.current !== selectedMember.membershipNumber) {
                setActiveTab("personal");
            }
            prevMemberIdRef.current = selectedMember.membershipNumber;
        } else {
            setIsEditing(false);
            setEditForm({});
            prevMemberIdRef.current = null;
        }
    }, [selectedMember]);

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
        if (!isEditing) {
            setEditForm({...selectedMember});
        }
    };

    const validateSAID = (id) => {
        if (!id) return null;
        // Check length and numeric only
        if (id.length !== 13 || !/^\d+$/.test(id)) {
            return "ID must be exactly 13 digits";
        }

        // Extract date parts
        const year = parseInt(id.substring(0, 2), 10);
        const month = parseInt(id.substring(2, 4), 10);
        const day = parseInt(id.substring(4, 6), 10);

        if (month < 1 || month > 12) return "Invalid birth month";
        if (day < 1 || day > 31) return "Invalid birth day";
        // Simple leap year and month length check could be added here, but the Luhn check is more critical

        // Luhn Algorithm (Check digit)
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            let digit = parseInt(id[i], 10);
            if (i % 2 !== 0) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        if (checkDigit !== parseInt(id[12], 10)) {
            return "Invalid South African ID (Check digit failure)";
        }

        return null;
    };

    const handleEditChange = (field) => (event) => {
        const value = event.target.value;
        setEditForm((prev) => ({...prev, [field]: value}));

        // Clear existing error for this field
        setFieldErrors(prev => {
            const newErrors = {...prev};
            delete newErrors[field];
            return newErrors;
        });

        // Perform validation for specific fields
        if (field === "idNumber") {
            const error = validateSAID(value);
            if (error) {
                setFieldErrors(prev => ({...prev, [field]: error}));
            }
        }
    };

    const handleSaveChanges = () => {
        // Prevent saving if there are validation errors
        if (Object.keys(fieldErrors).length > 0) {
            alert("Please fix the errors before saving.");
            return;
        }

        // Identify changed fields and their new values
        const changes = [];
        const ignoredFields = ["id", "membershipNumber", "memberId"]; // Internal IDs that shouldn't be listed as changes
        
        Object.keys(editForm).forEach(key => {
            if (!ignoredFields.includes(key) && editForm[key] !== selectedMember[key]) {
                // Convert camelCase key to readable label if needed, 
                // but let's try to map them to the labels used in the UI
                const labelMap = {
                    title: "Title",
                    initials: "Initials",
                    firstNames: "First Names",
                    firstName: "First Names",
                    surname: "Surname",
                    idNumber: "I.D. Number",
                    race: "Race",
                    email: "Email Address",
                    phone: "Cell Tel",
                    cellTel: "Cell Tel",
                    workTel: "Work Tel",
                    homeTel: "Home Tel",
                    faxNumber: "Fax Number",
                    address: "Address",
                    joinDate: "Date Joined",
                    status: "Status",
                    monthlySubscription: "Monthly Sasbo Subscription",
                    subscriptionFrequency: "Frequency of Sasbo Subscription",
                    deathBenefitSubs: "Death Benefit Fund Subs",
                    deathBenefitFrequency: "Frequency of death benefit fund",
                    deathBenefitPolicyNo: "Death Benefit Fund Policy Number",
                    endowmentSubs: "Endowment Fund Subs",
                    endowmentFrequency: "Frequency of Endowment Fund",
                    endowmentPolicyNo: "Endowment Fund Policy Number",
                    benevolentSubs: "Benevolent Fund Subs",
                    benevolentFrequency: "Frequency of Benevolent Fund",
                    benevolentPolicyNo: "Benevolent Fund Policy Number",
                    lastMonthBalance: "Last Months Balance",
                    currentBalance: "Current Balance",
                    arrearsBalance: "Arrears Balance",
                    dateLastChanged: "Date Last Changed",
                    employeeNumber: "Employee Number",
                    jobGrade: "Job Grade",
                    bankName: "Bank Where Member Is Employed",
                    bankAccountNumber: "Bank Account Number",
                    branch: "Bank Branch Where Member Works",
                    ibtNo: "IBT No.",
                    workIbtNo: "Work IBT No.",
                    paymentType: "Payment Type",
                    debitDay: "Day to be debited",
                    bankAddress: "Bank Address",
                    workBankAddress: "Work Bank Address",
                    recruitmentRep: "Recruitment Rep",
                    areasRep: "Area's Rep",
                    repElectionDay: "Sasbo Rep Election Day",
                    repElectionMonth: "Sasbo Rep Election Month",
                    repElectionYear: "Sasbo Rep Election Year",
                    electedRep: "Elected Sasbo Representative (Y/N)",
                    nationalCouncillor: "National Councillor (Y/N)",
                    branchCommitteeMember: "Branch Committee Member (Y/N)",
                    remarks: "Remarks / Comments",
                    remarks2: "2nd Remarks Field",
                    remarks3: "3rd Remarks Field",
                    remarks4: "4th Remarks Field",
                    managersCode: "Managers Code",
                    memnetMember: "MEMNET Member (Y/N)",
                    printLabelForPostage: "Print Label for Postage (Y/N)",
                    suspensionCode: "Suspension Code",
                    useAltAddress: "Use Alternate Address (Y/N)",
                    deductACB: "Deduct Subs through ACB (Y/N)",
                    printMembershipCards: "Print Membership Cards (Y/N)",
                    homeLoanReducedRateOption: "Home Loan Reduced Interest Rate Option (Y/N)"
                };
                
                const label = labelMap[key] || key;
                const oldValue = selectedMember[key] || "-";
                const newValue = editForm[key] || "-";
                changes.push(`${label}: ${oldValue} → ${newValue}`);
            }
        });

        if (changes.length === 0) {
            alert("No changes detected.");
            setIsEditing(false);
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to save the following changes?\n\n" + 
            changes.join("\n")
        );
        if (!confirmed) return;

        memberService.updateMember(editForm);
        setMembersList([...memberService.getMembers()]);
        setSelectedMember({...editForm});
        setIsEditing(false);
        
        setShowSavedNotification(true);
        setTimeout(() => setShowSavedNotification(false), 3000);
    };

    const handleInputChange = (field) => (event) => {
        setFilters((prev) => ({...prev, [field]: event.target.value}));
        setPage(1);
    };

    const [membersList, setMembersList] = useState(memberService.getMembers());

    const filteredMembers = useMemo(() => {
        const titleQ = filters.title.trim().toLowerCase();
        const empNoQ = filters.employeeNumber.trim().toLowerCase();
        const memNoQ = filters.membershipNumber.trim().toLowerCase();
        const initialsQ = filters.initials.trim().toLowerCase();
        const surnameQ = filters.surname.trim().toLowerCase();
        const idNoQ = filters.idNumber.trim().toLowerCase();
        const bankQ = filters.bankName.trim().toLowerCase();
        const branchQ = filters.branch.trim().toLowerCase();
        const bankAccQ = filters.bankAccountNumber.trim().toLowerCase();
        const phoneQ = filters.phone.trim().toLowerCase();
        const emailQ = filters.email.trim().toLowerCase();
        const statusQ = filters.status.trim().toLowerCase();
        const raceQ = filters.race.trim().toLowerCase();

        // Trigger loading simulation if filters changed
        const hasFilters = Object.values(filters).some(v => v.trim() !== "");
        if (hasFilters) {
            setLastSearchTime(Date.now());
        }

        return membersList.filter((m) => {
            if (titleQ && !(m.title ?? "").toLowerCase().includes(titleQ)) return false;
            if (empNoQ && !m.employeeNumber.toLowerCase().includes(empNoQ)) return false;
            if (memNoQ && !m.membershipNumber.toLowerCase().includes(memNoQ)) return false;
            if (initialsQ && !m.initials.toLowerCase().includes(initialsQ)) return false;
            if (surnameQ && !m.surname.toLowerCase().includes(surnameQ)) return false;
            if (idNoQ && !m.idNumber.toLowerCase().includes(idNoQ)) return false;
            if (bankQ && !m.bankName.toLowerCase().includes(bankQ)) return false;
            if (branchQ && !(m.branch ?? "").toLowerCase().includes(branchQ)) return false;
            if (bankAccQ && !(m.bankAccountNumber ?? "").toLowerCase().includes(bankAccQ)) return false;
            if (phoneQ && !(m.phone ?? "").toLowerCase().includes(phoneQ)) return false;
            if (emailQ && !(m.email ?? "").toLowerCase().includes(emailQ)) return false;
            if (raceQ && !(m.race ?? "").toLowerCase().includes(raceQ)) return false;
            return !(statusQ && !(m.status ?? "").toLowerCase().includes(statusQ));
        });
    }, [filters, membersList]);

    useEffect(() => {
        if (lastSearchTime > 0) {
            setIsLoading(true);
            const timer = setTimeout(() => {
                setIsLoading(false);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [lastSearchTime]);

    const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
    const startIndex = (page - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, filteredMembers.length);
    const visibleMembers = filteredMembers.slice(startIndex, endIndex);

    const handleClear = () => {
        setFilters({
            title: "",
            employeeNumber: "",
            membershipNumber: "",
            initials: "",
            surname: "",
            idNumber: "",
            bankName: "",
            branch: "",
            bankAccountNumber: "",
            phone: "",
            email: "",
            status: "",
            race: "",
        });
        setPage(1);
        setExpandedId(null);
    };

    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <h2 className="text-3xl text-center mb-2 text-cyan-700 dark:text-cyan-400">
                Members
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-2">
                Search and manage Sasbo member records across all major financial institutions
            </p>

            <div className="max-w-6xl mx-auto p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <label className="flex flex-col gap-2 text-sm">
                        Title
                        <select
                            value={filters.title}
                            onChange={handleInputChange("title")}
                            className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        >
                            <option value="">Select Title</option>
                            {titleOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                        Employee number
                        <input
                            type="text"
                            placeholder="Search by employee Number"
                            value={filters.employeeNumber}
                            onChange={handleInputChange("employeeNumber")}
                            className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                        Membership number
                        <input
                            type="text"
                            placeholder="Search by membership number"
                            value={filters.membershipNumber}
                            onChange={handleInputChange("membershipNumber")}
                            className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                        Initials
                        <input
                            type="text"
                            placeholder="Search by initials"
                            value={filters.initials}
                            onChange={handleInputChange("initials")}
                            className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                        Surname
                        <input
                            type="text"
                            placeholder="Search by surname"
                            value={filters.surname}
                            onChange={handleInputChange("surname")}
                            className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                        Identity Number
                        <input
                            type="text"
                            placeholder="Search by identity number"
                            value={filters.idNumber}
                            onChange={handleInputChange("idNumber")}
                            className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                        Bank Name
                        <input
                            type="text"
                            placeholder="Search by bank name"
                            value={filters.bankName}
                            onChange={handleInputChange("bankName")}
                            className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                        Branch
                        <input
                            type="text"
                            placeholder="Search by branch"
                            value={filters.branch}
                            onChange={handleInputChange("branch")}
                            className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                        Bank Account Number
                        <input
                            type="text"
                            placeholder="Search by bank account number"
                            value={filters.bankAccountNumber}
                            onChange={handleInputChange("bankAccountNumber")}
                            className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                        Cellphone Number
                        <input
                            type="text"
                            placeholder="Search by cellphone number"
                            value={filters.phone}
                            onChange={handleInputChange("phone")}
                            className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                        Email Address
                        <input
                            type="text"
                            placeholder="Search by email address"
                            value={filters.email}
                            onChange={handleInputChange("email")}
                            className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        />
                    </label>
                    <label className="flex flex-col gap-2 text-sm">
                        Status
                        <select
                            value={filters.status}
                            onChange={handleInputChange("status")}
                            className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        >
                            <option value="">Select Status</option>
                            {statusOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-2 text-sm">
                        Race
                        <select
                            value={filters.race || ""}
                            onChange={handleInputChange("race")}
                            className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                        >
                            <option value="">Select Race</option>
                            {raceOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </label>

                    <div className="flex items-end mb-1">
                        <button
                            onClick={handleClear}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800 transition shadow-sm"
                        >
                            Clear Filters
                        </button>
                    </div>

                </div>

                <div className="flex items-end justify-end mt-4">
                    <button
                        onClick={() => navigate("/members/apply")}
                        className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition text-sm shadow-sm"
                    >
                        <LucideUserRoundPlus size={16} strokeWidth={2}/>
                         Member Application
                    </button>
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div className="text-gray-600 dark:text-gray-300">
                        Showing {filteredMembers.length === 0 ? 0 : startIndex + 1}-{endIndex} of {filteredMembers.length} members
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            disabled={page === 1}
                            className={`px-3 py-1.5 rounded-full text-xs border transition ${
                                page === 1
                                    ? "cursor-not-allowed opacity-50"
                                    : "border-gray-200 bg-white hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700"
                            }`}
                        >
                            Prev
                        </button>
                        <span className="text-gray-600 dark:text-gray-300">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={page === totalPages}
                            className={`px-3 py-1.5 rounded-full text-xs border transition ${
                                page === totalPages
                                    ? "cursor-not-allowed opacity-50"
                                    : "border-gray-200 bg-white hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700"
                            }`}
                        >
                            Next
                        </button>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="ml-2 px-3 py-1.5 rounded-full text-xs border border-gray-200 bg-white hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-transparent max-h-[60vh] overflow-y-auto relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-gray-800/60 z-20 flex items-center justify-center backdrop-blur-[1px]">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm font-medium text-cyan-700 dark:text-cyan-400">Retrieving members...</p>
                            </div>
                        </div>
                    )}
                    {/* Results header aligned to the requested order */}
                    <div
                        className="grid grid-cols-8 gap-4 px-4 py-3 text-xs uppercase tracking-wide bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300 sticky top-0 z-10">
                        <div>Membership Number</div>
                        <div>Member (Title, Initials, Surname)</div>
                        <div>Member Email</div>
                        <div>Cellphone Number</div>
                        <div>ID Number</div>
                        <div>Bank</div>
                        <div>Employee Number</div>
                        <div>Status</div>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {visibleMembers.length === 0 ? (
                            <div className="px-4 py-6 text-sm text-gray-600 dark:text-gray-300">
                                No members match your search.
                            </div>
                        ) : (
                            visibleMembers.map((m) => (
                                <div key={m.id} className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">
                                    <div
                                        onClick={() => setSelectedMember(m)}
                                        className="grid grid-cols-8 gap-4 px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                    >
                                        <div className="font-medium">{m.membershipNumber}</div>
                                        <div className="truncate"
                                             title={`${m.title ? m.title + " " : ""}${m.initials} ${m.surname}`}>
                                            {m.title ? `${m.title} ` : ""}{m.initials} {m.surname}
                                        </div>
                                        <div className="truncate" title={m.email}>{m.email}</div>
                                        <div className="truncate" title={m.phone}>{m.phone}</div>
                                        <div className="truncate" title={m.idNumber}>{m.idNumber}</div>
                                        <div>{m.bankName}</div>
                                        <div className="truncate" title={m.employeeNumber}>{m.employeeNumber}</div>
                                        <div>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                m.status === "Active"
                                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                                    : m.status === "Pending"
                                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                                        : m.status === "Suspended"
                                                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                                            : "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300"
                                            }`}>{m.status}</span>
                                        </div>
                                    </div>
                                    {/* Details moved to modal */}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Modal: Member Details */}
            {selectedMember && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Member Details"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setSelectedMember(null)}
                    />

                    {/* Dialog */}
                    <div
                        className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        
                        {/* Saved Notification Toast */}
                        {showSavedNotification && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
                                <CheckCircle2 size={18} />
                                <span className="text-sm font-medium">Changes saved successfully!</span>
                            </div>
                        )}

                        {/* Header */}
                        <div
                            className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold">Member
                                    Details</p>
                                <div
                                    className="mt-1 flex flex-wrap items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                                    <span>{`${selectedMember.title ? selectedMember.title + " " : ""}${[selectedMember.initials, selectedMember.surname].filter(Boolean).join(" ") || "-"}`}</span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-gray-600 dark:text-gray-300">
                                        {selectedMember.bankName || "-"}
                                    </span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-gray-600 dark:text-gray-300">
                                        {selectedMember.branch || "-"}
                                    </span>
                                    <span className="text-gray-400">•</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                        selectedMember.status === "Active"
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                            : selectedMember.status === "Pending"
                                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                                : selectedMember.status === "Suspended"
                                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                                    : "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300"
                                    }`}>{selectedMember.status}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedMember(null)}
                                className="shrink-0 rounded-md p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
                                aria-label="Close"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                                     className="h-5 w-5">
                                    <path fillRule="evenodd"
                                          d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 11-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
                                          clipRule="evenodd"/>
                                </svg>
                            </button>
                        </div>

                        {/* Breadcrumbs */}
                        <div
                            className="px-6 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                <span>Search Members</span>
                                <span className="text-gray-400">›</span>
                                <span
                                    className="font-medium text-gray-900 dark:text-gray-100">{selectedMember.membershipNumber}</span>
                            </div>
                        </div>

                        {/* Tab Navigation */}
                        <div className="px-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <div className="flex flex-wrap -mb-px">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`mr-4 inline-block p-4 border-b-2 font-medium text-sm transition-colors ${
                                            activeTab === tab.id
                                                ? "border-cyan-600 text-cyan-600 dark:border-cyan-400 dark:text-cyan-400"
                                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Body */}
                        <div
                            className="px-6 py-5 overflow-y-auto max-h-[70vh] text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/40">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {activeTab === "personal" && (
                                    <>
                                        <Detail label="Title" value={isEditing ? editForm.title : (selectedMember.title || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("title")}
                                                options={titleOptions}
                                        />
                                        <Detail label="Initials" value={isEditing ? editForm.initials : (selectedMember.initials || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("initials")}
                                        />
                                        <Detail label="First Names"
                                                value={isEditing ? editForm.firstNames || editForm.firstName : (selectedMember.firstNames || selectedMember.firstName || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange(selectedMember.firstNames ? "firstNames" : "firstName")}
                                        />
                                        <Detail label="Surname" value={isEditing ? editForm.surname : (selectedMember.surname || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("surname")}
                                        />
                                        <Detail label="I.D. Number" value={isEditing ? editForm.idNumber : (selectedMember.idNumber || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("idNumber")}
                                                error={fieldErrors.idNumber}
                                        />
                                        <Detail label="Race" value={isEditing ? editForm.race : (selectedMember.race || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("race")}
                                                options={raceOptions}
                                        />
                                        <Detail label="Email Address" value={isEditing ? editForm.email : (selectedMember.email || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("email")}
                                                className="break-all text-cyan-600 dark:text-cyan-400"/>
                                        <Detail label="Cell Tel" value={isEditing ? (editForm.phone || editForm.cellTel) : (selectedMember.phone || selectedMember.cellTel || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange(selectedMember.phone ? "phone" : "cellTel")}
                                        />
                                        <Detail label="Work Tel" value={isEditing ? editForm.workTel : (selectedMember.workTel || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("workTel")}
                                        />
                                        <Detail label="Home Tel" value={isEditing ? editForm.homeTel : (selectedMember.homeTel || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("homeTel")}
                                        />
                                        <Detail label="Fax Number" value={isEditing ? editForm.faxNumber : (selectedMember.faxNumber || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("faxNumber")}
                                        />
                                        <Detail label="Address" value={isEditing ? editForm.address : (selectedMember.address || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("address")}
                                                className="md:col-span-2"
                                        />
                                    </>
                                )}

                                {activeTab === "membership" && (
                                    <>
                                        <Detail label="Membership Number" value={selectedMember.membershipNumber} isEditing={false} />
                                        <Detail label="Member ID" value={selectedMember.id} isEditing={false} />
                                        <Detail label="Date Joined"
                                                value={isEditing ? editForm.joinDate : (selectedMember.joinDate || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("joinDate")}
                                                type="date"
                                        />
                                        <Detail label="Status" value={isEditing ? editForm.status : (selectedMember.status || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("status")}
                                                options={statusOptions}
                                        />

                                        <div className="md:col-span-2 mt-4 border-b pb-1 font-semibold text-cyan-700 dark:text-cyan-400">Sasbo Subscription</div>
                                        <Detail label="Monthly Sasbo Subscription"
                                                value={isEditing ? editForm.monthlySubscription : (selectedMember.monthlySubscription ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("monthlySubscription")}
                                        />
                                        <Detail label="Frequency of Sasbo Subscription"
                                                value={isEditing ? editForm.subscriptionFrequency : (selectedMember.subscriptionFrequency ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("subscriptionFrequency")}
                                                options={frequencyOptions}
                                        />

                                        <div className="md:col-span-2 mt-4 border-b pb-1 font-semibold text-cyan-700 dark:text-cyan-400">Death Benefit Fund</div>
                                        <Detail label="Death Benefit Fund Subs" value={isEditing ? editForm.deathBenefitSubs : (selectedMember.deathBenefitSubs ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("deathBenefitSubs")}
                                        />
                                        <Detail label="Frequency of death benefit fund"
                                                value={isEditing ? editForm.deathBenefitFrequency : (selectedMember.deathBenefitFrequency ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("deathBenefitFrequency")}
                                                options={frequencyOptions}
                                        />
                                        <Detail label="Death Benefit Fund Policy Number"
                                                value={isEditing ? editForm.deathBenefitPolicyNo : (selectedMember.deathBenefitPolicyNo || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("deathBenefitPolicyNo")}
                                                className="md:col-span-2"
                                        />

                                        <div className="md:col-span-2 mt-4 border-b pb-1 font-semibold text-cyan-700 dark:text-cyan-400">Endowment Fund</div>
                                        <Detail label="Endowment Fund Subs" value={isEditing ? editForm.endowmentSubs : (selectedMember.endowmentSubs ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("endowmentSubs")}
                                        />
                                        <Detail label="Frequency of Endowment Fund"
                                                value={isEditing ? editForm.endowmentFrequency : (selectedMember.endowmentFrequency ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("endowmentFrequency")}
                                                options={frequencyOptions}
                                        />
                                        <Detail label="Endowment Fund Policy Number"
                                                value={isEditing ? editForm.endowmentPolicyNo : (selectedMember.endowmentPolicyNo || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("endowmentPolicyNo")}
                                                className="md:col-span-2"
                                        />

                                        <div className="md:col-span-2 mt-4 border-b pb-1 font-semibold text-cyan-700 dark:text-cyan-400">Benevolent Fund</div>
                                        <Detail label="Benevolent Fund Subs" value={isEditing ? editForm.benevolentSubs : (selectedMember.benevolentSubs ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("benevolentSubs")}
                                        />
                                        <Detail label="Frequency of Benevolent Fund"
                                                value={isEditing ? editForm.benevolentFrequency : (selectedMember.benevolentFrequency ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("benevolentFrequency")}
                                                options={frequencyOptions}
                                        />
                                        <Detail label="Benevolent Fund Policy Number"
                                                value={isEditing ? editForm.benevolentPolicyNo : (selectedMember.benevolentPolicyNo || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("benevolentPolicyNo")}
                                                className="md:col-span-2"
                                        />

                                        <div className="md:col-span-2 mt-4 border-b pb-1 font-semibold text-cyan-700 dark:text-cyan-400">Balances</div>
                                        <Detail label="Last Months Balance" value={isEditing ? editForm.lastMonthBalance : (selectedMember.lastMonthBalance ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("lastMonthBalance")}
                                        />
                                        <Detail label="Current Balance" value={isEditing ? editForm.currentBalance : (selectedMember.currentBalance ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("currentBalance")}
                                        />
                                        <Detail label="Arrears Balance" value={isEditing ? editForm.arrearsBalance : (selectedMember.arrearsBalance ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("arrearsBalance")}
                                        />
                                        <Detail label="Date Last Changed" value={isEditing ? editForm.dateLastChanged : (selectedMember.dateLastChanged || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("dateLastChanged")}
                                        />
                                    </>
                                )}

                                {activeTab === "employment" && (
                                    <>
                                        <Detail label="Employee Number" value={isEditing ? editForm.employeeNumber : (selectedMember.employeeNumber || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("employeeNumber")}
                                        />
                                        <Detail label="Job Grade" value={isEditing ? editForm.jobGrade : (selectedMember.jobGrade ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("jobGrade")}
                                                options={jobGradeOptions}
                                        />
                                        <Detail label="Bank Where Member Is Employed" value={isEditing ? editForm.bankName : (selectedMember.bankName || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("bankName")}
                                                options={bankOptions}
                                        />
                                        <Detail label="Bank Account Number" value={isEditing ? editForm.bankAccountNumber : (selectedMember.bankAccountNumber || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("bankAccountNumber")}
                                        />
                                        <Detail label="Bank Branch Where Member Works" value={isEditing ? editForm.branch : (selectedMember.branch || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("branch")}
                                                options={branchOptions}
                                        />
                                        <Detail label="IBT No." value={isEditing ? editForm.ibtNo : (selectedMember.ibtNo || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("ibtNo")}
                                        />
                                        <Detail label="Work IBT No." value={isEditing ? editForm.workIbtNo : (selectedMember.workIbtNo || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("workIbtNo")}
                                        />
                                        <Detail label="Payment Type" value={isEditing ? editForm.paymentType : (selectedMember.paymentType || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("paymentType")}
                                                options={paymentTypeOptions}
                                        />
                                        <Detail label="Day to be debited" value={isEditing ? editForm.debitDay?.toString().padStart(2, '0') : (selectedMember.debitDay?.toString().padStart(2, '0') || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("debitDay")}
                                                options={dayOptions}
                                        />
                                        <Detail label="Bank Address" value={isEditing ? editForm.bankAddress : (selectedMember.bankAddress || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("bankAddress")}
                                                className="md:col-span-2"/>
                                        <Detail label="Work Bank Address"
                                                value={isEditing ? editForm.workBankAddress : (selectedMember.workBankAddress || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("workBankAddress")}
                                                className="md:col-span-2"/>
                                    </>
                                )}

                                {activeTab === "representatives" && (
                                    <>
                                        <Detail label="Recruitment Rep" value={isEditing ? editForm.recruitmentRep : (selectedMember.recruitmentRep || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("recruitmentRep")}
                                                options={repOptions}
                                                className="md:col-span-2"/>
                                        <Detail label="Area's Rep" value={isEditing ? editForm.areasRep : (selectedMember.areasRep || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("areasRep")}
                                                options={repOptions}
                                                className="md:col-span-2"/>
                                        <Detail label="Sasbo Rep Election Day" value={isEditing ? editForm.repElectionDay : (selectedMember.repElectionDay ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("repElectionDay")}
                                                options={dayOptions}
                                        />
                                        <Detail label="Sasbo Rep Election Month"
                                                value={isEditing ? editForm.repElectionMonth : (selectedMember.repElectionMonth ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("repElectionMonth")}
                                                options={monthOptions}
                                        />
                                        <Detail label="Sasbo Rep Election Year" value={isEditing ? editForm.repElectionYear : (selectedMember.repElectionYear ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("repElectionYear")}
                                                options={yearOptions}
                                        />
                                        <Detail label="Elected Sasbo Representative (Y/N)"
                                                value={isEditing ? editForm.electedRep : (selectedMember.electedRep ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("electedRep")}
                                                options={yesNoOptions}
                                        />
                                        <Detail label="National Councillor (Y/N)"
                                                value={isEditing ? editForm.nationalCouncillor : (selectedMember.nationalCouncillor ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("nationalCouncillor")}
                                                options={yesNoOptions}
                                        />
                                        <Detail label="Branch Committee Member (Y/N)"
                                                value={isEditing ? editForm.branchCommitteeMember : (selectedMember.branchCommitteeMember ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("branchCommitteeMember")}
                                                options={yesNoOptions}
                                        />
                                    </>
                                )}

                                {activeTab === "history" && (
                                    <>
                                        <Detail label="Remarks / Comments" value={isEditing ? editForm.remarks : (selectedMember.remarks || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("remarks")}
                                                className="md:col-span-2"/>
                                        <Detail label="2nd Remarks Field" value={isEditing ? editForm.remarks2 : (selectedMember.remarks2 || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("remarks2")}
                                                className="md:col-span-2"/>
                                        <Detail label="3rd Remarks Field" value={isEditing ? editForm.remarks3 : (selectedMember.remarks3 || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("remarks3")}
                                                className="md:col-span-2"/>
                                        <Detail label="4th Remarks Field" value={isEditing ? editForm.remarks4 : (selectedMember.remarks4 || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("remarks4")}
                                                className="md:col-span-2"/>

                                        <div className="md:col-span-2 mt-4 border-b pb-1 font-semibold text-cyan-700 dark:text-cyan-400">Other Information</div>
                                        <Detail label="Managers Code" value={isEditing ? editForm.managersCode : (selectedMember.managersCode ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("managersCode")}
                                                options={managerOptions}
                                        />
                                        <Detail label="MEMNET Member (Y/N)" value={isEditing ? editForm.memnetMember : (selectedMember.memnetMember ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("memnetMember")}
                                                options={yesNoOptions}
                                        />
                                        <Detail label="Print Label for Postage (Y/N)"
                                                value={isEditing ? editForm.printLabelForPostage : (selectedMember.printLabelForPostage ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("printLabelForPostage")}
                                                options={yesNoOptions}
                                        />
                                        <Detail label="Suspension Code" value={isEditing ? editForm.suspensionCode : (selectedMember.suspensionCode ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("suspensionCode")}
                                                options={suspensionCodeOptions}
                                        />
                                        <Detail label="Use Alternate Address (Y/N)"
                                                value={isEditing ? editForm.useAltAddress : (selectedMember.useAltAddress ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("useAltAddress")}
                                                options={yesNoOptions}
                                        />
                                        <Detail label="Deduct Subs through ACB (Y/N)" value={isEditing ? editForm.deductACB : (selectedMember.deductACB ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("deductACB")}
                                                options={yesNoOptions}
                                        />
                                        <Detail label="Print Membership Cards (Y/N)"
                                                value={isEditing ? editForm.printMembershipCards : (selectedMember.printMembershipCards ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("printMembershipCards")}
                                                options={yesNoOptions}
                                        />
                                        <Detail label="Home Loan Reduced Interest Rate Option (Y/N)"
                                                value={isEditing ? editForm.homeLoanReducedRateOption : (selectedMember.homeLoanReducedRateOption ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("homeLoanReducedRateOption")}
                                                options={yesNoOptions}
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div
                            className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            {isEditing ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleSaveChanges}
                                        className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition"
                                    >
                                        Save Changes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleEditToggle}
                                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm"
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleEditToggle}
                                        className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition"
                                    >
                                        Edit Member
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMember(null)}
                                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm"
                                    >
                                        Close
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Detail({label, value, isEditing, onChange, className = "", options = null, type = "text", error = null}) {
    return (
        <div className={className}>
            <label className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">
                {label}
            </label>
            {isEditing ? (
                options ? (
                    <div className="mt-1">
                        <select
                            value={value || ""}
                            onChange={onChange}
                            className={`block w-full rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm px-3 py-1.5 border ${
                                error ? "border-red-500 dark:border-red-400" : "border-gray-300 dark:border-gray-600"
                            }`}
                        >
                            <option value="">Select...</option>
                            {options.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                        {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>}
                    </div>
                ) : (
                    <div className="mt-1">
                        <input
                            type={type}
                            value={value || ""}
                            onChange={onChange}
                            className={`block w-full rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm px-3 py-1.5 border ${
                                error ? "border-red-500 dark:border-red-400" : "border-gray-300 dark:border-gray-600"
                            }`}
                        />
                        {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>}
                    </div>
                )
            ) : (
                <p className="font-semibold text-gray-800 dark:text-gray-200">{value}</p>
            )}
        </div>
    );
}

