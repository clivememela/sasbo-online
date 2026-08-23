import {useEffect, useMemo, useState, useRef, useCallback} from "react";
import {useNavigate, useLocation} from "react-router-dom";
import {LucideUserRoundPlus, CheckCircle2, Printer} from "lucide-react";
import {memberService} from "../../services/memberService.js";
import { TextInput, SearchableSelect, Button } from "../../components/form";
import {
    FREQUENCY_OPTIONS, TITLE_OPTIONS, RACE_OPTIONS, PAYMENT_TYPE_OPTIONS,
    STATUS_OPTIONS, YES_NO_OPTIONS, IDENTITY_TYPE_OPTIONS, GENDER_OPTIONS, SUSPENSION_CODE_OPTIONS, JOB_GRADE_OPTIONS,
    DAY_OPTIONS, MONTH_OPTIONS, YEAR_OPTIONS,
    BANK_OPTIONS, BRANCH_OPTIONS, REP_OPTIONS, MEMBER_FIELD_LABEL_MAP, EMPLOYMENT_TYPE_OPTIONS, DEBIT_DAY_OPTIONS,
} from "../../config/memberConstants.js";
import { validateSAID, validateEmail, formatDate, extractDateOfBirthFromSAID, extractGenderFromSAID } from "../../utils/validateSAID.js";
import PageTitle from "../../components/common/PageTitle.jsx";
import AddressAutocomplete from "../../components/form/AddressAutocomplete";

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
        identityType: "",
        identityNumber: "",
        bankName: location.state?.filters?.bankName || "",
        branch: location.state?.filters?.branch || "",
        bankAccountNumber: "",
        phone: "",
        personalEmail: "",
        workEmail: "",
        status: "",
        race: "",
        recruitmentRepId:"",
        isRepresentative:"",
    });

    const [page, setPage] = useState(1);
    // Modal state: which member is currently shown in the modal
    const [selectedMember, setSelectedMember] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [activeTab, setActiveTab] = useState("personal");
    const [showSavedNotification, setShowSavedNotification] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const prevMemberIdRef = useRef(null);

    const tabs = [
        { id: 'personal', label: 'Personal Information' },
        { id: 'employment', label: 'Employment & Bank' },
        { id: 'membership', label: 'Membership & Subscriptions' },
        { id: 'representatives', label: 'Recruitment Channel' },
        { id: 'structures', label: 'Sasbo Structures' },
        { id: 'history', label: 'History & Remarks' },
    ];

    const normalizePaymentType = useCallback((paymentType) => {
        if (paymentType === "Payroll Deduction") {
            return "Payroll";
        }
        return paymentType;
    }, []);

    const frequencyOptions = FREQUENCY_OPTIONS;
    const titleOptions = TITLE_OPTIONS;
    const idTypeOptions = IDENTITY_TYPE_OPTIONS;
    const raceOptions = RACE_OPTIONS;
    const paymentTypeOptions = PAYMENT_TYPE_OPTIONS;
    const statusOptions = STATUS_OPTIONS;
    const yesNoOptions = YES_NO_OPTIONS;
    const suspensionCodeOptions = SUSPENSION_CODE_OPTIONS;
    const bankOptions = BANK_OPTIONS;
    const branchOptions = BRANCH_OPTIONS;
    const jobGradeOptions = JOB_GRADE_OPTIONS;
    const identityTypeOptions = IDENTITY_TYPE_OPTIONS;
    const genderOptions = GENDER_OPTIONS;
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
            setEditForm({...selectedMember, paymentType: normalizePaymentType(selectedMember.paymentType)});
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
    }, [selectedMember, normalizePaymentType]);

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
        if (!isEditing) {
            setEditForm({...selectedMember, paymentType: normalizePaymentType(selectedMember?.paymentType)});
        }
    };

    const handleEditChange = useCallback((field) => (event) => {
        const value = event && event.target ? event.target.value : event;
        setEditForm((prev) => ({...prev, [field]: value}));
        setFieldErrors(prev => {
            const newErrors = {...prev};
            delete newErrors[field];
            if (field === "identityNumber") {
                const error = validateSAID(value);
                if (error) newErrors[field] = error;
            }
            if (field === "personalEmail" || field === "workEmail") {
                const error = validateEmail(value);
                if (error) newErrors[field] = error;
            }
            return newErrors;
        });
        // Auto-populate DOB and gender from SA ID number
        if (field === "identityNumber" && value.length === 13) {
            const dob = extractDateOfBirthFromSAID(value);
            const gender = extractGenderFromSAID(value);
            if (dob) setEditForm(prev => ({ ...prev, dateOfBirth: dob }));
            if (gender) setEditForm(prev => ({ ...prev, gender }));
        }
        if (field === "identityType") {
            setEditForm(prev => ({ ...prev, dateOfBirth: "", gender: "" }));
        }
    }, []);

    const handleSaveChanges = () => {
        // Prevent saving if there are validation errors
        if (Object.keys(fieldErrors).length > 0) {
            alert("Please fix the errors before saving.");
            return;
        }

        // Identify changed fields and their new values
        const changes = [];
        const ignoredFields = new Set(["id", "membershipNumber", "memberId"]);

        Object.keys(editForm).forEach(key => {
            if (!ignoredFields.has(key) && editForm[key] !== selectedMember[key]) {
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

    const handleInputChange = useCallback((field) => (event) => {
        const value = event && event.target ? event.target.value : event;
        setFilters((prev) => ({...prev, [field]: value}));
        setPage(1);
    }, []);

    const [membersList, setMembersList] = useState([]);

    useEffect(() => {
        memberService.getMembers().then(setMembersList);
    }, []);

    const filteredMembers = useMemo(() => {
        const q = (s) => (s || "").trim().toLowerCase();
        const predicates = [];
        const titleQ = q(filters.title); if (titleQ) predicates.push(m => (m.title ?? "").toLowerCase().includes(titleQ));
        const empNoQ = q(filters.employeeNumber); if (empNoQ) predicates.push(m => (m.employeeNumber ?? "").toLowerCase().includes(empNoQ));
        const memNoQ = q(filters.membershipNumber); if (memNoQ) predicates.push(m => (m.membershipNumber ?? "").toLowerCase().includes(memNoQ));
        const initialsQ = q(filters.initials); if (initialsQ) predicates.push(m => (m.initials ?? "").toLowerCase().includes(initialsQ));
        const surnameQ = q(filters.surname); if (surnameQ) predicates.push(m => (m.surname ?? "").toLowerCase().includes(surnameQ));
        const idTypeQ = q(filters.identityType); if (idTypeQ) predicates.push(m => (m.identityType ?? "").toLowerCase().includes(idTypeQ));
        const idNoQ = q(filters.identityNumber); if (idNoQ) predicates.push(m => (m.identityNumber ?? "").toLowerCase().includes(idNoQ));
        const bankQ = q(filters.bankName); if (bankQ) predicates.push(m => (m.bankName ?? "").toLowerCase().includes(bankQ));
        const branchQ = q(filters.branch); if (branchQ) predicates.push(m => (m.branch ?? "").toLowerCase().includes(branchQ));
        const bankAccQ = q(filters.bankAccountNumber); if (bankAccQ) predicates.push(m => (m.bankAccountNumber ?? "").toLowerCase().includes(bankAccQ));
        const phoneQ = q(filters.phone); if (phoneQ) predicates.push(m => (m.phone ?? "").toLowerCase().includes(phoneQ));
        const personalEmailQ = q(filters.personalEmail); if (personalEmailQ) predicates.push(m => (m.personalEmail ?? "").toLowerCase().includes(personalEmailQ));
        const workEmailQ = q(filters.workEmail); if (workEmailQ) predicates.push(m => (m.workEmail ?? "").toLowerCase().includes(workEmailQ));
        const raceQ = q(filters.race); if (raceQ) predicates.push(m => (m.race ?? "").toLowerCase().includes(raceQ));
        const statusQ = q(filters.status); if (statusQ) predicates.push(m => (m.status ?? "").toLowerCase().includes(statusQ));
        if (predicates.length === 0) return membersList;
        return membersList.filter(m => predicates.every(pred => pred(m)));
    }, [filters, membersList]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE)), [filteredMembers]);
    const startIndex = (page - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, filteredMembers.length);
    const visibleMembers = useMemo(() => filteredMembers.slice(startIndex, endIndex), [filteredMembers, startIndex, endIndex]);

    const handleClear = () => {
        setFilters({
            title: "",
            employeeNumber: "",
            membershipNumber: "",
            initials: "",
            surname: "",
            identityType: "",
            identityNumber: "",
            bankName: "",
            branch: "",
            bankAccountNumber: "",
            phone: "",
            personalEmail: "",
            workEmail: "",
            status: "",
            race: "",
        });
        setPage(1);
    };

    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">

            <PageTitle title="Members" subtitle="Search and manage Sasbo member records across all major financial institutions" />

            <div className="max-w-6xl mx-auto p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <SearchableSelect label="Title" value={filters.title} onChange={handleInputChange("title")} placeholder="All Titles"
                        options={[{value:"",label:"All Titles"}, ...titleOptions.map(o=>({value:o,label:o}))]} />
                    <TextInput label="Employee Number" value={filters.employeeNumber} onChange={handleInputChange("employeeNumber")} placeholder="Search by employee number" />
                    <TextInput label="Membership Number" value={filters.membershipNumber} onChange={handleInputChange("membershipNumber")} placeholder="Search by membership number" />
                    <TextInput label="Initials" value={filters.initials} onChange={handleInputChange("initials")} placeholder="Search by initials" />
                    <TextInput label="Surname" value={filters.surname} onChange={handleInputChange("surname")} placeholder="Search by surname" />
                    <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <span>Identity Type</span>
                        <select value={filters.identityType} onChange={handleInputChange("identityType")}
                            className="rounded-lg px-3 py-2 text-sm font-normal normal-case tracking-normal border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
                            <option value="">All Types</option>
                            {identityTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <TextInput label="Identity Number" value={filters.identityNumber} onChange={handleInputChange("identityNumber")} placeholder="Search by identity number" />
                    <SearchableSelect label="Bank Name" value={filters.bankName} onChange={handleInputChange("bankName")} placeholder="All Banks"
                        options={[{ value: '', label: 'All BankBranch' }, ...bankOptions.map(b => ({ value: b, label: b }))]} />
                    <TextInput label="Branch" value={filters.branch} onChange={handleInputChange("branch")} placeholder="Search by branch" />
                    <TextInput label="Bank Account Number" value={filters.bankAccountNumber} onChange={handleInputChange("bankAccountNumber")} placeholder="Search by bank account number" />
                    <TextInput label="Cellphone Number" value={filters.phone} onChange={handleInputChange("phone")} placeholder="Search by cellphone number" />
                    <TextInput label="Personal Email" value={filters.personalEmail} onChange={handleInputChange("personalEmail")} placeholder="Search by personal email" />
                    <TextInput label="Work Email" value={filters.workEmail} onChange={handleInputChange("workEmail")} placeholder="Search by work email" />
                    <SearchableSelect label="Status" value={filters.status} onChange={handleInputChange("status")} placeholder="All Statuses"
                        options={[{value:"",label:"All Statuses"}, ...statusOptions.map(o=>({value:o,label:o}))]} />
                    <SearchableSelect label="Race" value={filters.race || ""} onChange={handleInputChange("race")} placeholder="All Races"
                        options={[{value:"",label:"All Races"}, ...raceOptions.map(o=>({value:o,label:o}))]} />
                    <div className="flex items-end">
                        <Button onClick={handleClear}>Clear Filters</Button>
                    </div>
                </div>

                <div className="flex items-end justify-end mt-4 gap-3">
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
                    {/* Results header aligned to the requested order */}
                    <div
                        className="grid grid-cols-8 gap-4 px-4 py-3 text-xs uppercase tracking-wide bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300 sticky top-0 z-10">
                        <div>Membership Number</div>
                        <div>Member (Title, Initials, Surname)</div>
                        <div>Preferred Email</div>
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
                                        <div className="truncate" title={m.preferredEmail === "both" ? `${m.personalEmail || ''}, ${m.workEmail || ''}` : (m.preferredEmail === "work" ? m.workEmail : m.personalEmail)}>
                                            {m.preferredEmail === "both" ? (<><span className="text-cyan-600 dark:text-cyan-400">{m.personalEmail || '-'}</span><span className="text-gray-400">, </span><span className="text-cyan-600 dark:text-cyan-400">{m.workEmail || '-'}</span></>) : (m.preferredEmail === "work" ? m.workEmail : m.personalEmail)}
                                        </div>
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
                                        <Detail label="Identity Type" value={isEditing ? editForm.identityType : (selectedMember.identityType || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("identityType")}
                                                options={idTypeOptions}
                                        />
                                        <Detail label={isEditing && !editForm.identityType ? "Select Identity Type before entering" : (editForm.identityType || "Identity Number")} value={isEditing ? editForm.identityNumber : (selectedMember.identityNumber || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("identityNumber")}
                                                error={fieldErrors.identityNumber}
                                                disabled={isEditing && !editForm.identityType}
                                        />
                                        <Detail
                                            label="Date of Birth"
                                            value={getDobDisplayValue(isEditing, editForm, selectedMember)}
                                            isEditing={isEditing && editForm.identityType !== "I.D. Number"}
                                            onChange={handleEditChange("dateOfBirth")}
                                            type={editForm.identityType === "I.D. Number" ? "text" : "date"}
                                            disabled={editForm.identityType === "I.D. Number"}
                                        />
                                        <Detail
                                            label="Gender"
                                            value={isEditing ? editForm.gender : (selectedMember.gender || "-")}
                                            isEditing={isEditing && editForm.identityType !== "I.D. Number"}
                                            onChange={handleEditChange("gender")}
                                            options={editForm.identityType === "I.D. Number" ? null : genderOptions}
                                            disabled={editForm.identityType === "I.D. Number"}
                                        />
                                        <Detail label="Race" value={isEditing ? editForm.race : (selectedMember.race || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("race")}
                                                options={raceOptions}
                                        />
                                        <div>
                                            <label htmlFor="edit-personal-email" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">Personal Email</label>
                                            {isEditing ? (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <input id="edit-personal-email" type="email" value={editForm.personalEmail || ""} onChange={handleEditChange("personalEmail")}
                                                            className={fieldCls(fieldErrors.personalEmail)} />
                                                        <label htmlFor="edit-pref-personal" className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap cursor-pointer">
                                                            <input id="edit-pref-personal" type="checkbox" checked={editForm.preferredEmail === "personal" || editForm.preferredEmail === "both"}
                                                                onChange={() => toggleEditPersonalPreferred(setEditForm)}
                                                                className="accent-cyan-600 w-4 h-4" />
                                                            Preferred
                                                        </label>
                                                    </div>
                                                    {fieldErrors.personalEmail && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{fieldErrors.personalEmail}</p>}
                                                </>
                                            ) : (
                                                <p className={`mt-0.5 text-sm font-semibold break-all ${(selectedMember.preferredEmail === "personal" || selectedMember.preferredEmail === "both") ? "text-cyan-600 dark:text-cyan-400" : "text-gray-800 dark:text-gray-200"}`}>
                                                    {selectedMember.personalEmail || "-"}{(selectedMember.preferredEmail === "personal" || selectedMember.preferredEmail === "both") && <span className="ml-1 text-xs text-green-600 dark:text-green-400">(preferred)</span>}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label htmlFor="edit-work-email" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">Work Email</label>
                                            {isEditing ? (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <input id="edit-work-email" type="email" value={editForm.workEmail || ""} onChange={handleEditChange("workEmail")}
                                                            className={fieldCls(fieldErrors.workEmail)} />
                                                        <label htmlFor="edit-pref-work" className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap cursor-pointer">
                                                            <input id="edit-pref-work" type="checkbox" checked={editForm.preferredEmail === "work" || editForm.preferredEmail === "both"}
                                                                onChange={() => toggleEditWorkPreferred(setEditForm)}
                                                                className="accent-cyan-600 w-4 h-4" />
                                                            Preferred
                                                        </label>
                                                    </div>
                                                    {fieldErrors.workEmail && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{fieldErrors.workEmail}</p>}
                                                </>
                                            ) : (
                                                <p className={`mt-0.5 text-sm font-semibold break-all ${(selectedMember.preferredEmail === "work" || selectedMember.preferredEmail === "both") ? "text-cyan-600 dark:text-cyan-400" : "text-gray-800 dark:text-gray-200"}`}>
                                                    {selectedMember.workEmail || "-"}{(selectedMember.preferredEmail === "work" || selectedMember.preferredEmail === "both") && <span className="ml-1 text-xs text-green-600 dark:text-green-400">(preferred)</span>}
                                                </p>
                                            )}
                                        </div>
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
                                        {isEditing ? (
                                            <AddressAutocomplete label="Address" value={editForm.address || ""} onChange={handleEditChange("address")} placeholder="Start typing an address..." className="md:col-span-2" />
                                        ) : (
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">Address</label>
                                                <p className="mt-0.5 text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedMember.address || "-"}</p>
                                            </div>
                                        )}
                                    </>
                                )}

                                {activeTab === "membership" && (
                                    <>
                                        <Detail label="Membership Number" value={selectedMember.membershipNumber} isEditing={false} />
                                        <Detail label="Member ID" value={selectedMember.id} isEditing={false} />
                                        <Detail label="Date Joined" value={formatDate(selectedMember.joinDate)} isEditing={false} />
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
                                        <Detail label="Sasbo Subscription"
                                                value={isEditing ? editForm.subscriptionFrequency : (selectedMember.subscriptionFrequency ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("subscriptionFrequency")}
                                                options={frequencyOptions}
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
                                        <Detail label="Date Last Changed" value={formatDate(selectedMember.dateLastChanged)} isEditing={false} />
                                    </>
                                )}

                                {activeTab === "employment" && (
                                    <>
                                        <Detail label="Employee Number" value={isEditing ? editForm.employeeNumber : (selectedMember.employeeNumber || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("employeeNumber")}
                                        />
                                        <Detail label="Employment Type" value={isEditing ? editForm.employmentType : (selectedMember.employmentType || "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("employmentType")}
                                                options={EMPLOYMENT_TYPE_OPTIONS}
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
                                        
                                        {/* Bank Account Number - Only show for Debit Order */}
                                        {(!isEditing || editForm.paymentType === "Debit Order") && (
                                            <Detail label="Bank Account Number" 
                                                    value={isEditing ? editForm.bankAccountNumber : (selectedMember.bankAccountNumber || "-")}
                                                    isEditing={isEditing && editForm.paymentType === "Debit Order"}
                                                    onChange={handleEditChange("bankAccountNumber")}
                                                    required={isEditing && editForm.paymentType === "Debit Order"}
                                            />
                                        )}
                                        
                                        {/* Debit Day - Only for Debit Order */}
                                        {(!isEditing || editForm.paymentType === "Debit Order") && (
                                            <Detail label="Day to be debited" 
                                                    value={isEditing ? editForm.debitDay?.toString().padStart(2, '0') : (selectedMember.debitDay?.toString().padStart(2, '0') || "-")}
                                                    isEditing={isEditing && editForm.paymentType === "Debit Order"}
                                                    onChange={handleEditChange("debitDay")}
                                                    options={DEBIT_DAY_OPTIONS}
                                            />
                                        )}
                                        
                                        {/* Info message for Payroll */}
                                        {isEditing && editForm.paymentType === "Payroll" && (
                                            <div className="md:col-span-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-700 dark:text-blue-300">
                                                ℹ️ Bank account details and debit day are not required for Payroll
                                            </div>
                                        )}
                                        
                                        {isEditing ? (
                                            <AddressAutocomplete label="Bank Address" value={editForm.bankAddress || ""} onChange={handleEditChange("bankAddress")} placeholder="Start typing a bank address..." className="md:col-span-2" />
                                        ) : (
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">Bank Address</label>
                                                <p className="mt-0.5 text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedMember.bankAddress || "-"}</p>
                                            </div>
                                        )}
                                        {isEditing ? (
                                            <AddressAutocomplete label="Work Bank Address" value={editForm.workBankAddress || ""} onChange={handleEditChange("workBankAddress")} placeholder="Start typing a work bank address..." className="md:col-span-2" />
                                        ) : (
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">Work Bank Address</label>
                                                <p className="mt-0.5 text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedMember.workBankAddress || "-"}</p>
                                            </div>
                                        )}
                                    </>
                                )}

                                {activeTab === "representatives" && (
                                    <>
                                        <Detail label="Recruitment Channel" value={isEditing ? editForm.recruitmentRep : (selectedMember.recruitmentRep || "-")}
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
                                        <Detail label="Elected Sasbo Recruiter (Y/N)"
                                                value={isEditing ? editForm.electedRep : (selectedMember.electedRep ?? "-")}
                                                isEditing={isEditing}
                                                onChange={handleEditChange("electedRep")}
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

const fieldCls = (error, disabled = false) =>
    `w-full rounded-lg px-4 py-2.5 text-sm border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400
    ${disabled ? "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed" : "bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white"}
    ${error ? "border-red-500 dark:border-red-400" : "border-gray-200 dark:border-gray-700"}`;

function DetailSearchableSelect({ value, onChange, options, error, disabled }) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

    const handleSelect = (opt) => {
        onChange({ target: { value: opt } });
        setQuery("");
        setOpen(false);
    };

    const handleClear = () => {
        onChange({ target: { value: "" } });
        setQuery("");
    };

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <input
                type="text"
                value={open ? query : value || ""}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                placeholder="Search..."
                disabled={disabled}
                className={fieldCls(error, disabled)}
            />
            {value && !open && (
                <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs">✕</button>
            )}
            {open && filtered.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg text-sm">
                    {filtered.map(opt => (
                        <li key={opt} role="option" aria-selected={false} onClick={() => handleSelect(opt)}
                            className="px-4 py-2 cursor-pointer hover:bg-cyan-50 dark:hover:bg-cyan-900/30 text-gray-900 dark:text-white">
                            {opt}
                        </li>
                    ))}
                </ul>
            )}
            {error && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>}
        </div>
    );
}

function getDobDisplayValue(isEditing, editForm, selectedMember) {
    if (isEditing) {
        if (editForm.identityType === "I.D. Number") {
            return formatDate(editForm.dateOfBirth);
        }
        return editForm.dateOfBirth;
    }
    return selectedMember.dateOfBirth ? formatDate(selectedMember.dateOfBirth) : "-";
}

function toggleEditPersonalPreferred(setEditForm) {
    setEditForm(prev => {
        const hasPersonal = prev.preferredEmail === "personal" || prev.preferredEmail === "both";
        const hasWork = prev.preferredEmail === "work" || prev.preferredEmail === "both";
        if (hasPersonal && hasWork) return { ...prev, preferredEmail: "work" };
        if (hasPersonal) return { ...prev, preferredEmail: "" };
        if (hasWork) return { ...prev, preferredEmail: "both" };
        return { ...prev, preferredEmail: "personal" };
    });
}

function toggleEditWorkPreferred(setEditForm) {
    setEditForm(prev => {
        const hasPersonal = prev.preferredEmail === "personal" || prev.preferredEmail === "both";
        const hasWork = prev.preferredEmail === "work" || prev.preferredEmail === "both";
        if (hasWork && hasPersonal) return { ...prev, preferredEmail: "personal" };
        if (hasWork) return { ...prev, preferredEmail: "" };
        if (hasPersonal) return { ...prev, preferredEmail: "both" };
        return { ...prev, preferredEmail: "work" };
    });
}

function Detail({label, value, isEditing, onChange, className = "", options = null, type = "text", error = null, searchable = false, disabled = false, note = null}) {
    const detailId = `detail-${label.toLowerCase().replace(/\s+/g, "-")}`;
    return (
        <div className={className}>
            <label htmlFor={detailId} className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                {label}
            </label>
            {note && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{note}</p>}
            {isEditing ? (
                <div className="relative">
                    {options && searchable ? (
                        <DetailSearchableSelect value={value} onChange={onChange} options={options} error={error} disabled={disabled} />
                    ) : options ? (
                        <select id={detailId} value={value || ""} onChange={onChange} className={fieldCls(error, disabled)} disabled={disabled}>
                            <option value="">Select...</option>
                            {options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    ) : (
                        <input id={detailId} type={type} value={value || ""} onChange={onChange} className={fieldCls(error, disabled)} disabled={disabled} />
                    )}
                    {error && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>}
                </div>
            ) : (
                <p className="mt-0.5 text-sm font-semibold text-gray-800 dark:text-gray-200">{value}</p>
            )}
        </div>
    );
}

