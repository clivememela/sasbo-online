import {useEffect, useMemo, useState} from "react";
import {useNavigate, useLocation} from "react-router-dom";
import {Plus} from "lucide-react";
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
        bankAccountNumber: "",
        phone: "",
        email: "",
        status: "",
    });

    const [page, setPage] = useState(1);
    // Keep expandedId for backward compatibility (unused for inline view now)
    const [expandedId, setExpandedId] = useState(null);
    // Modal state: which member is currently shown in the modal
    const [selectedMember, setSelectedMember] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastSearchTime, setLastSearchTime] = useState(0);

    // Close modal on an Escape key
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === "Escape") setSelectedMember(null);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const handleInputChange = (field) => (event) => {
        setFilters((prev) => ({...prev, [field]: event.target.value}));
        setPage(1);
    };

    const filteredMembers = useMemo(() => {
        const titleQ = filters.title.trim().toLowerCase();
        const empNoQ = filters.employeeNumber.trim().toLowerCase();
        const memNoQ = filters.membershipNumber.trim().toLowerCase();
        const initialsQ = filters.initials.trim().toLowerCase();
        const surnameQ = filters.surname.trim().toLowerCase();
        const idNoQ = filters.idNumber.trim().toLowerCase();
        const bankQ = filters.bankName.trim().toLowerCase();
        const bankAccQ = filters.bankAccountNumber.trim().toLowerCase();
        const phoneQ = filters.phone.trim().toLowerCase();
        const emailQ = filters.email.trim().toLowerCase();
        const statusQ = filters.status.trim().toLowerCase();

        // Trigger loading simulation if filters changed
        const hasFilters = Object.values(filters).some(v => v.trim() !== "");
        if (hasFilters) {
            setLastSearchTime(Date.now());
        }

        return SearchMembersData.filter((m) => {
            if (titleQ && !(m.title ?? "").toLowerCase().includes(titleQ)) return false;
            if (empNoQ && !m.employeeNumber.toLowerCase().includes(empNoQ)) return false;
            if (memNoQ && !m.membershipNumber.toLowerCase().includes(memNoQ)) return false;
            if (initialsQ && !m.initials.toLowerCase().includes(initialsQ)) return false;
            if (surnameQ && !m.surname.toLowerCase().includes(surnameQ)) return false;
            if (idNoQ && !m.idNumber.toLowerCase().includes(idNoQ)) return false;
            if (bankQ && !m.bankName.toLowerCase().includes(bankQ)) return false;
            if (bankAccQ && !(m.bankAccountNumber ?? "").toLowerCase().includes(bankAccQ)) return false;
            if (phoneQ && !(m.phone ?? "").toLowerCase().includes(phoneQ)) return false;
            if (emailQ && !(m.email ?? "").toLowerCase().includes(emailQ)) return false;
            return !(statusQ && !(m.status ?? "").toLowerCase().includes(statusQ));

        });
    }, [filters]);

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
            bankAccountNumber: "",
            phone: "",
            email: "",
            status: "",
        });
        setPage(1);
        setExpandedId(null);
    };

    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <h2 className="text-3xl text-center mb-2 text-cyan-700 dark:text-cyan-400">
                Search Members
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-2">
                Policies, salary agreements, and collective bargaining documents from major South African banks
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
                            <option value="Mr">Mr</option>
                            <option value="Ms">Ms</option>
                            <option value="Mrs">Mrs</option>
                            <option value="Dr">Dr</option>
                            <option value="Miss">Miss</option>
                            <option value="Prof">Prof</option>
                            <option value="Rev">Rev</option>
                            <option value="Mx">Mx</option>
                            <option value="Sir">Sir</option>
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
                            <option value="Active">Active</option>
                            <option value="Pending">Pending</option>
                            <option value="Suspended">Suspended</option>
                            <option value="Resigned">Resigned</option>
                        </select>
                    </label>

                </div>

                <div className="flex items-end justify-end mt-4">
                    <button
                        onClick={() => navigate("/members/apply")}
                        className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition text-sm shadow-sm"
                    >
                        <Plus size={16} strokeWidth={2}/>
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

                        {/* Body */}
                        <div
                            className="px-6 py-5 overflow-y-auto max-h-[70vh] text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/40">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                <Detail label="First Names"
                                        value={selectedMember.firstNames || selectedMember.firstName || "-"}/>
                                <Detail label="Surname" value={selectedMember.surname || "-"}/>

                                <Detail label="Date Joined" value={selectedMember.joinDate || "-"}/>
                                <Detail label="Monthly Sasbo Subscription"
                                        value={selectedMember.monthlySubscription ?? "-"}/>

                                <Detail label="Frequency of Sasbo Subscription"
                                        value={selectedMember.subscriptionFrequency ?? "-"}/>
                                <Detail label="Death Benefit Fund Subs" value={selectedMember.deathBenefitSubs ?? "-"}/>

                                <Detail label="Frequency of death benefit fund"
                                        value={selectedMember.deathBenefitFrequency ?? "-"}/>
                                <Detail label="Death Benefit Fund Policy Number"
                                        value={selectedMember.deathBenefitPolicyNo || "-"}/>

                                <Detail label="Bank Where Member Is Employed" value={selectedMember.bankName || "-"}/>
                                <Detail label="IBT No." value={selectedMember.ibtNo || "-"}/>

                                <Detail label="Bank Branch Where Member Works" value={selectedMember.branch || "-"}/>
                                <Detail label="Work IBT No." value={selectedMember.workIbtNo || "-"}/>

                                <Detail label="Bank Address" value={selectedMember.bankAddress || "-"}
                                        className="md:col-span-2"/>
                                <Detail label="Work Bank Address"
                                        value={selectedMember.workBankAddress || selectedMember.address || "-"}
                                        className="md:col-span-2"/>

                                <Detail label="I.D. Number" value={selectedMember.idNumber || "-"}/>
                                <Detail label="Race" value={selectedMember.race || "-"}/>

                                <Detail label="Email Address" value={selectedMember.email || "-"}
                                        className="break-all text-cyan-600 dark:text-cyan-400"/>
                                <Detail label="Sasbo Rep Election Day" value={selectedMember.repElectionDay ?? "-"}/>

                                <Detail label="Sasbo Rep Election Month"
                                        value={selectedMember.repElectionMonth ?? "-"}/>
                                <Detail label="Sasbo Rep Election Year" value={selectedMember.repElectionYear ?? "-"}/>

                                <Detail label="2nd Remarks Field" value={selectedMember.remarks2 || "-"}
                                        className="md:col-span-2"/>
                                <Detail label="Managers Code" value={selectedMember.managersCode ?? "-"}/>

                                <Detail label="Home Tel" value={selectedMember.homeTel || "-"}/>
                                <Detail label="Work Tel" value={selectedMember.workTel || "-"}/>

                                <Detail label="Cell Tel" value={selectedMember.phone || selectedMember.cellTel || "-"}/>
                                <Detail label="Fax Number" value={selectedMember.faxNumber || "-"}/>

                                <Detail label="MEMNET Member" value={selectedMember.memnetMember ?? "-"}/>
                                <Detail label="Employee Number" value={selectedMember.employeeNumber || "-"}/>

                                <Detail label="Endowment Fund Subs" value={selectedMember.endowmentSubs ?? "-"}/>
                                <Detail label="Frequency of Endowment Fund"
                                        value={selectedMember.endowmentFrequency ?? "-"}/>

                                <Detail label="Endowment Fund Policy Number"
                                        value={selectedMember.endowmentPolicyNo || "-"}/>
                                <Detail label="Benevolent Fund Subs" value={selectedMember.benevolentSubs ?? "-"}/>

                                <Detail label="Frequency of Benevolent Fund"
                                        value={selectedMember.benevolentFrequency ?? "-"}/>
                                <Detail label="Benevolent Fund Policy Number"
                                        value={selectedMember.benevolentPolicyNo || "-"}/>

                                <Detail label="Recruitment Rep" value={selectedMember.recruitmentRep || "-"}
                                        className="md:col-span-2"/>
                                <Detail label="Area's Rep" value={selectedMember.areasRep || "-"}
                                        className="md:col-span-2"/>

                                <Detail label="Payment Type" value={selectedMember.paymentType || "-"}/>
                                <Detail label="Last Months Balance" value={selectedMember.lastMonthBalance ?? "-"}/>

                                <Detail label="Current Balance" value={selectedMember.currentBalance ?? "-"}/>
                                <Detail label="Arrears Balance" value={selectedMember.arrearsBalance ?? "-"}/>

                                <Detail label="Day to be debited" value={selectedMember.debitDay ?? "-"}/>
                                <Detail label="Print Label for Postage"
                                        value={selectedMember.printLabelForPostage ?? "-"}/>

                                <Detail label="Remarks / Comments" value={selectedMember.remarks || "-"}
                                        className="md:col-span-2"/>
                                <Detail label="Date Last Changed" value={selectedMember.dateLastChanged || "-"}/>

                                <Detail label="Alternate Address 1" value={selectedMember.altAddress1 || "-"}/>
                                <Detail label="Previous Address Line 1" value={selectedMember.prevAddress1 || "-"}/>

                                <Detail label="Suspension Code" value={selectedMember.suspensionCode ?? "-"}/>
                                <Detail label="Alt Line 2" value={selectedMember.altAddress2 || "-"}/>

                                <Detail label="Prev Line 2" value={selectedMember.prevAddress2 || "-"}/>
                                <Detail label="Suspended From" value={selectedMember.suspendedFrom || "-"}/>

                                <Detail label="Alt Line 3" value={selectedMember.altAddress3 || "-"}/>
                                <Detail label="Prev Line 3" value={selectedMember.prevAddress3 || "-"}/>

                                <Detail label="Suspended To" value={selectedMember.suspendedTo || "-"}/>
                                <Detail label="Postal Code (Alt)" value={selectedMember.altPostalCode || "-"}/>

                                <Detail label="Postal Code (Prev)" value={selectedMember.prevPostalCode || "-"}/>
                                <Detail label="Suspension Reason" value={selectedMember.suspensionReason || "-"}
                                        className="md:col-span-2"/>

                                <Detail label="Month Debit Returned" value={selectedMember.monthDebitReturned ?? "-"}/>
                                <Detail label="Use Alternate Address (Y/N)"
                                        value={selectedMember.useAltAddress ?? "-"}/>

                                <Detail label="Year Debit Returned" value={selectedMember.yearDebitReturned ?? "-"}/>
                                <Detail label="Deduct Subs through ACB (Y/N)" value={selectedMember.deductACB ?? "-"}/>

                                <Detail label="Elected Sasbo Representative (Y/N)"
                                        value={selectedMember.electedRep ?? "-"}/>
                                <Detail label="Job Grade" value={selectedMember.jobGrade ?? "-"}/>

                                <Detail label="National Councillor (Y/N)"
                                        value={selectedMember.nationalCouncillor ?? "-"}/>
                                <Detail label="Branch Committee Member"
                                        value={selectedMember.branchCommitteeMember ?? "-"}/>

                                <Detail label="Print Membership Cards (Y/N)"
                                        value={selectedMember.printMembershipCards ?? "-"}/>
                                <Detail label="Home Loan Reduced Interest Rate Option"
                                        value={selectedMember.homeLoanReducedRateOption ?? "-"}/>

                                <Detail label="Previous Account Number"
                                        value={selectedMember.previousAccountNumber ?? "-"}/>
                                <Detail label="Previous Clearing Code"
                                        value={selectedMember.previousClearingCode ?? "-"}/>

                                <Detail label="Date Address Changed" value={selectedMember.dateAddressChanged || "-"}/>
                                <Detail label="Debit Returned Reason Codes 1"
                                        value={selectedMember.debitReturnReason1 ?? "-"}/>

                                <Detail label="Date 1 Debit Returned" value={selectedMember.date1DebitReturned || "-"}/>
                                <Detail label="Date Account Changed" value={selectedMember.dateAccountChanged || "-"}/>

                                <Detail label="Debit Returned Reason Codes 2"
                                        value={selectedMember.debitReturnReason2 ?? "-"}/>
                                <Detail label="Date 2 Debit Returned" value={selectedMember.date2DebitReturned || "-"}/>

                                <Detail label="PORT No. that Captured Member"
                                        value={selectedMember.portCaptured ?? "-"}/>
                                <Detail label="Debit Returned Reason Codes 3"
                                        value={selectedMember.debitReturnReason3 ?? "-"}/>

                                <Detail label="Date 3 Debit Returned" value={selectedMember.date3DebitReturned || "-"}/>
                                <Detail label="PORT No. that Changed Member" value={selectedMember.portChanged ?? "-"}/>

                                <Detail label="Frequency of Criticare Subs"
                                        value={selectedMember.criticareFrequency ?? "-"}/>
                                <Detail label="Criticare Date Joined" value={selectedMember.criticareJoinDate || "-"}/>

                                <Detail label="Criticare Subs" value={selectedMember.criticareSubs ?? "-"}/>
                                <Detail label="3rd Remarks Field" value={selectedMember.remarks3 || "-"}
                                        className="md:col-span-2"/>

                                <Detail label="4th Remarks Field" value={selectedMember.remarks4 || "-"}
                                        className="md:col-span-2"/>
                            </div>
                        </div>

                        {/* Footer */}
                        <div
                            className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <button
                                type="button"
                                onClick={() => setSelectedMember(null)}
                                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Detail({label, value, className = ""}) {
    return (
        <div className={className}>
            <label className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">
                {label}
            </label>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{value}</p>
        </div>
    );
}

