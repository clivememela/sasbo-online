import {useEffect, useMemo, useState, useRef} from "react";
import {useNavigate, useLocation} from "react-router-dom";
import {LucideUserRoundPlus, CheckCircle2, UsersRoundIcon, Printer} from "lucide-react";
import {memberService} from "../../services/memberService.js";
import { TextInput, SearchableSelect, Button } from "../../components/form";
import {
    FREQUENCY_OPTIONS, TITLE_OPTIONS, RACE_OPTIONS, PAYMENT_TYPE_OPTIONS,
    STATUS_OPTIONS, YES_NO_OPTIONS, SUSPENSION_CODE_OPTIONS, JOB_GRADE_OPTIONS,
    MANAGER_OPTIONS, DAY_OPTIONS, MONTH_OPTIONS, YEAR_OPTIONS,
    BANK_OPTIONS, BRANCH_OPTIONS, REP_OPTIONS, MEMBER_FIELD_LABEL_MAP,
} from "../../config/memberConstants.js";
import { validateSAID } from "../../utils/validateSAID.js";

const PAGE_SIZE = memberService.getPageSize();

export default function Members() {
    const navigate = useNavigate();
    const location = useLocation();
    const [filters, setFilters] = useState({
        title: "",
        employeeNumber: "",
        membershipNumber: "",
        initials: "",
        surname: "",
        identityNumber: "",
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

    const frequencyOptions = FREQUENCY_OPTIONS;
    const titleOptions = TITLE_OPTIONS;
    const raceOptions = RACE_OPTIONS;
    const paymentTypeOptions = PAYMENT_TYPE_OPTIONS;
    const statusOptions = STATUS_OPTIONS;
    const yesNoOptions = YES_NO_OPTIONS;
    const suspensionCodeOptions = SUSPENSION_CODE_OPTIONS;
    const bankOptions = BANK_OPTIONS;
    const branchOptions = BRANCH_OPTIONS;
    const jobGradeOptions = JOB_GRADE_OPTIONS;
    const managerOptions = MANAGER_OPTIONS;
    const repOptions = REP_OPTIONS;
    const dayOptions = DAY_OPTIONS;
    const monthOptions = MONTH_OPTIONS;
    const yearOptions = YEAR_OPTIONS;

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

    const handleEditChange = (field) => (event) => {
        const value = event.target.value;
        setEditForm((prev) => ({...prev, [field]: value}));

        setFieldErrors(prev => {
            const newErrors = {...prev};
            delete newErrors[field];
            return newErrors;
        });

        if (field === "identityNumber") {
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
        const ignoredFields = ["id", "membershipNumber", "memberId"];
        
        Object.keys(editForm).forEach(key => {
            if (!ignoredFields.includes(key) && editForm[key] !== selectedMember[key]) {
                const label = MEMBER_FIELD_LABEL_MAP[key] || key;
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

        memberService.updateMember(editForm).then(() =>
            memberService.getMembers().then(setMembersList)
        );
        setSelectedMember({...editForm});
        setIsEditing(false);
        
        setShowSavedNotification(true);
        setTimeout(() => setShowSavedNotification(false), 3000);
    };

    const handleInputChange = (field) => (event) => {
        setFilters((prev) => ({...prev, [field]: event.target.value}));
        setPage(1);
    };

    const [membersList, setMembersList] = useState([]);

    useEffect(() => {
        memberService.getMembers().then(setMembersList);
    }, []);

    const filteredMembers = useMemo(() => {
        const titleQ = filters.title.trim().toLowerCase();
        const empNoQ = filters.employeeNumber.trim().toLowerCase();
        const memNoQ = filters.membershipNumber.trim().toLowerCase();
        const initialsQ = filters.initials.trim().toLowerCase();
        const surnameQ = filters.surname.trim().toLowerCase();
        const idNoQ = filters.identityNumber.trim().toLowerCase();
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
            if (idNoQ && !m.identityNumber.toLowerCase().includes(idNoQ)) return false;
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
            identityNumber: "",
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
                    <SearchableSelect label="Title" value={filters.title} onChange={handleInputChange("title")} placeholder="All Titles"
                        options={[{value:"",label:"All Titles"}, ...titleOptions.map(o=>({value:o,label:o}))]} />
                    <TextInput label="Employee Number" value={filters.employeeNumber} onChange={handleInputChange("employeeNumber")} placeholder="Search by employee number" />
                    <TextInput label="Membership Number" value={filters.membershipNumber} onChange={handleInputChange("membershipNumber")} placeholder="Search by membership number" />
                    <TextInput label="Initials" value={filters.initials} onChange={handleInputChange("initials")} placeholder="Search by initials" />
                    <TextInput label="Surname" value={filters.surname} onChange={handleInputChange("surname")} placeholder="Search by surname" />
                    <TextInput label="Identity Number" value={filters.identityNumber} onChange={handleInputChange("identityNumber")} placeholder="Search by identity number" />
                    <SearchableSelect label="Bank Name" value={filters.bankName} onChange={handleInputChange("bankName")} placeholder="All Banks"
                        options={[{ value: '', label: 'All BankBranch' }, ...bankOptions.map(b => ({ value: b, label: b }))]} />
                    <TextInput label="Branch" value={filters.branch} onChange={handleInputChange("branch")} placeholder="Search by branch" />
                    <TextInput label="Bank Account Number" value={filters.bankAccountNumber} onChange={handleInputChange("bankAccountNumber")} placeholder="Search by bank account number" />
                    <TextInput label="Cellphone Number" value={filters.phone} onChange={handleInputChange("phone")} placeholder="Search by cellphone number" />
                    <TextInput label="Email Address" value={filters.email} onChange={handleInputChange("email")} placeholder="Search by email address" />
                    <SearchableSelect label="Status" value={filters.status} onChange={handleInputChange("status")} placeholder="All Statuses"
                        options={[{value:"",label:"All Statuses"}, ...statusOptions.map(o=>({value:o,label:o}))]} />
                    <SearchableSelect label="Race" value={filters.race || ""} onChange={handleInputChange("race")} placeholder="All Races"
                        options={[{value:"",label:"All Races"}, ...raceOptions.map(o=>({value:o,label:o}))]} />
                    <div className="flex items-end">
                        <Button onClick={handleClear}>Clear Filters</Button>
                    </div>
                </div>

                <div className="flex items-end justify-end mt-4 gap-3">
                    {/*<Button variant="primary" onClick={() => navigate("/members/apply")}>
                        <UsersRoundIcon size={16} strokeWidth={2} />
                        Member Application
                    </Button>*/}
                    <Button variant="primary" onClick={() => navigate("/members/capture")}>
                        <LucideUserRoundPlus size={16} strokeWidth={2} />
                        Capture Member
                    </Button>
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm no-print">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        Showing {filteredMembers.length === 0 ? 0 : startIndex + 1}-{endIndex} of {filteredMembers.length} members
                        {filteredMembers.length > 0 && (
                            <button
                                onClick={() => window.print()}
                                title="Print results"
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"
                            >
                                <Printer size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="pagination" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                        <span className="text-gray-600 dark:text-gray-300 text-sm">Page {page} of {totalPages}</span>
                        <Button variant="pagination" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                        <Button onClick={handleClear}>Clear</Button>
                    </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-transparent max-h-[60vh] overflow-y-auto relative print-area">
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
                                        <div className="truncate" title={m.identityNumber}>{m.identityNumber}</div>
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
                                        <Detail label="I.D. Number" value={isEditing ? editForm.identityNumber : (selectedMember.identityNumber || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("identityNumber")}
                                                error={fieldErrors.identityNumber}
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
                                                searchable
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
                        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            {isEditing ? (
                                <>
                                    <Button variant="primary" onClick={handleSaveChanges}>Save Changes</Button>
                                    <Button onClick={handleEditToggle}>Cancel</Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="primary" onClick={handleEditToggle}>Edit Member</Button>
                                    <Button onClick={() => setSelectedMember(null)}>Close</Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const fieldCls = (error) =>
    `w-full rounded-lg px-3 py-2 text-sm border bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 ${
        error ? "border-red-500 dark:border-red-400" : "border-gray-200 dark:border-gray-700"
    }`;

function Detail({label, value, isEditing, onChange, className = "", options = null, type = "text", error = null, searchable = false}) {
    return (
        <div className={className}>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {label}
            </label>
            {isEditing ? (
                <div className="mt-1">
                    {options && searchable ? (
                        <SearchableSelect
                            value={value || ''}
                            onChange={onChange}
                            options={[{ value: '', label: 'Select...' }, ...options.map(o => ({ value: o, label: o }))]}
                        />
                    ) : options ? (
                        <SearchableSelect
                            value={value || ''}
                            onChange={onChange}
                            options={[{ value: '', label: 'Select...' }, ...options.map(o => ({ value: o, label: o }))]}
                        />
                    ) : (
                        <input type={type} value={value || ""} onChange={onChange} className={fieldCls(error)} />
                    )}
                    {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>}
                </div>
            ) : (
                <p className="mt-0.5 text-sm font-semibold text-gray-800 dark:text-gray-200">{value}</p>
            )}
        </div>
    );
}

