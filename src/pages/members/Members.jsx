import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LucideUserRoundPlus, CheckCircle2, Printer } from "lucide-react";
import { memberService } from "../../services/memberService.js";
import { recruiterService } from "../../services/recruiterService.js";
import { jobGradeService } from "../../services/jobGradeService.js";
import { bankService } from "../../services/bankService.js";
import { TextInput, SearchableSelect, Button } from "../../components/form";
import {
    TITLE_OPTIONS, RACE_OPTIONS, PAYMENT_TYPE_OPTIONS,
    STATUS_OPTIONS, YES_NO_OPTIONS, IDENTITY_TYPE_OPTIONS, GENDER_OPTIONS,
    JOB_GRADE_OPTIONS,
    BRANCH_OPTIONS, MEMBER_FIELD_LABEL_MAP, EMPLOYMENT_TYPE_OPTIONS,
} from "../../config/memberConstants.js";
import {
    validateSAID, validateEmail, formatDate, extractDateOfBirthFromSAID, extractGenderFromSAID
} from "../../utils/validateSAID.js";
import PageTitle from "../../components/common/PageTitle.jsx";
import AddressAutocomplete from "../../components/form/AddressAutocomplete";

const PAGE_SIZE = memberService.getPageSize();
const EMPTY_FILTERS = {
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
    recruitmentRepId: "",
    isRepresentative: "",
};

const FILTER_FIELDS = [
    "title", "employeeNumber", "membershipNumber", "initials", "surname",
    "identityType", "identityNumber", "bankName", "branch", "bankAccountNumber",
    "phone", "personalEmail", "workEmail", "status", "race",
];

const TABS = [
    { id: "personal", label: "Personal Information" },
    { id: "employment", label: "Employment & Bank" },
    { id: "membership", label: "Membership & Subscriptions" },
    { id: "representatives", label: "Recruitment Channel" },
    { id: "structures", label: "Sasbo Structures" },
];

const FIELD_TO_TAB_MAP = {
    title: "personal",
    initials: "personal",
    firstNames: "personal",
    surname: "personal",
    identityType: "personal",
    identityNumber: "personal",
    dateOfBirth: "personal",
    personalEmail: "personal",
    workEmail: "personal",
    phone: "personal",
    employeeNumber: "employment",
    employmentType: "employment",
    jobGrade: "employment",
    bankName: "employment",
    branch: "employment",
    paymentType: "employment",
    bankAccountNumber: "employment",
    debitDay: "employment",
    shopStewardElectionDate: "structures",
    becCommitteeId: "structures",
    becExecutivePosition: "structures"
};

export const SASBO_BEC_BRANCHES = [
    { id: "bec-01", name: "Tshwane CBD Regional Branch", region: "Gauteng North" },
    { id: "bec-02", name: "Centurion Financial Hub Committee", region: "Gauteng North" },
    { id: "bec-03", name: "Pretoria East Banking Cluster", region: "Gauteng North" },
    { id: "bec-04", name: "Hatfield & Menlyn Corporate Branch", region: "Gauteng North" },
    { id: "bec-05", name: "Soshanguve & Garankuwa Local Committee", region: "Gauteng North" },
    { id: "bec-06", name: "Johannesburg Central Regional Branch", region: "Gauteng South" },
    { id: "bec-07", name: "Braamfontein & Parktown Hub", region: "Gauteng South" },
    { id: "bec-08", name: "Rosebank Financial Cluster", region: "Gauteng South" },
    { id: "bec-09", name: "Sandton Central Banking Hub", region: "Gauteng South" },
    { id: "bec-10", name: "Soweto Local Branches Committee", region: "Gauteng South" },
    { id: "bec-11", name: "Ekurhuleni East Regional Branch", region: "Gauteng East" },
    { id: "bec-12", name: "Kempton Park & OR Tambo Cluster", region: "Gauteng East" },
    { id: "bec-13", name: "West Rand & Krugersdorp Committee", region: "Gauteng West" },
    { id: "bec-14", name: "Vaal Triangle & Vereeniging Branch", region: "Gauteng South" },
    { id: "bec-15", name: "Cape Town CBD Regional Branch", region: "Western Cape" },
    { id: "bec-16", name: "Bellville & Tyger Valley Corporate Hub", region: "Western Cape" },
    { id: "bec-17", name: "Century City Banking Cluster", region: "Western Cape" },
    { id: "bec-18", name: "Southern Suburbs Local Committee", region: "Western Cape" },
    { id: "bec-19", name: "Boland & Winelands Regional Branch", region: "Western Cape" },
    { id: "bec-20", name: "Garden Route & George Branch", region: "Western Cape" },
    { id: "bec-21", name: "Durban Central Regional Branch", region: "KwaZulu-Natal" },
    { id: "bec-22", name: "Umhlanga Financial Ridge Committee", region: "KwaZulu-Natal" },
    { id: "bec-23", name: "Westville Corporate Hub Cluster", region: "KwaZulu-Natal" },
    { id: "bec-24", name: "Pietermaritzburg & Midlands Branch", region: "KwaZulu-Natal" },
    { id: "bec-25", name: "KZN North Coast & Richards Bay Committee", region: "KwaZulu-Natal" },
    { id: "bec-26", name: "KZN South Coast Local Branch", region: "KwaZulu-Natal" },
    { id: "bec-27", name: "Gqeberha (Port Elizabeth) Regional Branch", region: "Eastern Cape" },
    { id: "bec-28", name: "East London Central Branch", region: "Eastern Cape" },
    { id: "bec-29", name: "Karoo & Inland Local Committee", region: "Eastern Cape" },
    { id: "bec-30", name: "Mthatha Regional Committee", region: "Eastern Cape" },
    { id: "bec-31", name: "Bloemfontein Central Regional Branch", region: "Free State" },
    { id: "bec-32", name: "Welkom & Goldfields Committee", region: "Free State" },
    { id: "bec-33", name: "Kimberley & Northern Cape West Branch", region: "Northern Cape" },
    { id: "bec-34", name: "Upington Local Hub Committee", region: "Northern Cape" },
    { id: "bec-35", name: "Mbombela (Nelspruit) Regional Branch", region: "Mpumalanga" },
    { id: "bec-36", name: "Emalahleni (Witbank) Mining & Finance Cluster", region: "Mpumalanga" },
    { id: "bec-37", name: "Secunda & Highveld Local Committee", region: "Mpumalanga" },
    { id: "bec-38", name: "Polokwane Central Regional Branch", region: "Limpopo" },
    { id: "bec-39", name: "Thohoyandou & Vhembe Hub Committee", region: "Limpopo" },
    { id: "bec-40", name: "Tzaneen & Mopani Local Committee", region: "Limpopo" },
    { id: "bec-41", name: "Rustenburg Mining Belt Committee", region: "North West" },
    { id: "bec-42", name: "Potchefstroom & Klerksdorp Cluster", region: "North West" },
    { id: "bec-43", name: "South African Reserve Bank (SARB) Dedicated Branch", region: "Corporate National" },
    { id: "bec-44", name: "BankservAfrica & Financial Infrastructure Committee", region: "Corporate National" }
];

const normalizePaymentType = (paymentType) => paymentType === "Payroll Deduction" ? "Payroll" : paymentType;

const getInitialFilters = (locationState) => ({
    ...EMPTY_FILTERS,
    bankName: locationState?.filters?.bankName || "",
    branch: locationState?.filters?.branch || "",
});

const getChangedFields = (draft, original) => Object.keys(draft)
    .filter((key) => !["id", "membershipNumber", "memberId"].includes(key))
    .filter((key) => {
        const draftValue = key === "paymentType" ? normalizePaymentType(draft[key]) : draft[key];
        const originalValue = key === "paymentType" ? normalizePaymentType(original[key]) : original[key];
        return draftValue !== originalValue;
    })
    .map((key) => `${MEMBER_FIELD_LABEL_MAP[key] || key}: ${original[key] || "-"} → ${draft[key] || "-"}`);

export default function Members() {
    const navigate = useNavigate();
    const location = useLocation();
    const [filters, setFilters] = useState(() => getInitialFilters(location.state));
    const [page, setPage] = useState(1);
    const [selectedMember, setSelectedMember] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [activeTab, setActiveTab] = useState("personal");
    const [showSavedNotification, setShowSavedNotification] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const prevMemberIdRef = useRef(null);
    const [roles, setRoles] = useState([]);
    const [membersList, setMembersList] = useState([]);
    const [bankNames, setBankNames] = useState([]);

    useEffect(() => {
        recruiterService.getRoles().then(setRoles).catch(err => console.error("Failed to load roles", err));
        memberService.getMembers().then(res => {
            const list = Array.isArray(res) ? res : (res.data || res.members || []);
            setMembersList(list);
        }).catch(err => console.error("Failed fetching records array", err));
        bankService.getBankNames().then(setBankNames).catch(err => console.error("Failed to load banks", err));
    }, []);

    const tabsWithErrors = useMemo(() => {
        const errorTabs = new Set();
        Object.keys(fieldErrors).forEach((field) => {
            const mappedTab = FIELD_TO_TAB_MAP[field];
            if (mappedTab) errorTabs.add(mappedTab);
        });
        return errorTabs;
    }, [fieldErrors]);

    const titleOptions = TITLE_OPTIONS;
    const idTypeOptions = IDENTITY_TYPE_OPTIONS;
    const raceOptions = RACE_OPTIONS;
    const paymentTypeOptions = PAYMENT_TYPE_OPTIONS;
    const statusOptions = STATUS_OPTIONS;
    const yesNoOptions = YES_NO_OPTIONS;
    const bankOptions = bankNames;
    const branchOptions = BRANCH_OPTIONS;
    const genderOptions = GENDER_OPTIONS;
    const [jobGradeOptions, setJobGradeOptions] = useState(JOB_GRADE_OPTIONS);
    const jobGrade = jobGradeOptions;

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
            const normalized = { ...selectedMember, paymentType: normalizePaymentType(selectedMember.paymentType) };
            if (typeof normalized.cosatuPositions === "string" && normalized.cosatuPositions) {
                normalized.cosatuPositions = normalized.cosatuPositions.split(",").map(s => s.trim()).filter(Boolean);
            } else if (!Array.isArray(normalized.cosatuPositions)) {
                normalized.cosatuPositions = [];
            }
            setEditForm(normalized);
            if (prevMemberIdRef.current !== selectedMember.membershipNumber) {
                setActiveTab("personal");
            }
            prevMemberIdRef.current = selectedMember.membershipNumber;
            setFieldErrors({});
        } else {
            setIsEditing(false);
            setEditForm({});
            prevMemberIdRef.current = null;
            setFieldErrors({});
        }
    }, [selectedMember]);

    useEffect(() => {
        if (!editForm.bankName) {
            setJobGradeOptions(JOB_GRADE_OPTIONS);
            setEditForm(prev => ({ ...prev, jobGrade: "" }));
            return;
        }

        jobGradeService.getByBank(editForm.bankName)
            .then((grades) => setJobGradeOptions(Array.isArray(grades) && grades.length ? grades : JOB_GRADE_OPTIONS))
            .catch(() => setJobGradeOptions(JOB_GRADE_OPTIONS));
    }, [editForm.bankName]);

    const handleEditToggle = () => {
        setIsEditing((editing) => {
            if (!editing) {
                setEditForm({ ...selectedMember, paymentType: normalizePaymentType(selectedMember?.paymentType) });
                setFieldErrors({});
            }
            return !editing;
        });
    };

    const handleEditChange = useCallback((field) => (event) => {
        let rawValue = event && event.target ? event.target.value : event;

        if (field === "identityNumber" && editForm.identityType === "I.D. Number" && rawValue.length > 13) {
            rawValue = rawValue.substring(0, 13);
        }

        const hasNonNumericInput =
            field === "identityNumber" && editForm.identityType === "I.D. Number" &&
            /\D/.test(rawValue);
        const value =
            field === "identityNumber" && editForm.identityType === "I.D. Number"
                ? rawValue.replace(/\D/g, "")
                : rawValue;

        setEditForm((prev) => {
            const next = { ...prev, [field]: value };

            if (field === "firstNames") {
                next.initials = value
                    .trim()
                    .split(/\s+/)
                    .map(name => name.charAt(0).toUpperCase())
                    .join("");
            }
            if (field === "identityNumber" && value.length === 13 && prev.identityType === "I.D. Number") {
                next.dateOfBirth = extractDateOfBirthFromSAID(value) || next.dateOfBirth;
                next.gender = extractGenderFromSAID(value) || next.gender;
            }
            if (field === "identityType") {
                next.dateOfBirth = "";
                next.gender = "";
            }
            return next;
        });

        setFieldErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];

            if (field === "identityType") {
                delete newErrors.identityNumber;
                delete newErrors.dateOfBirth;
            }
            if (field === "paymentType" && value !== "Debit Order") {
                delete newErrors.bankAccountNumber;
                delete newErrors.bankName;
                delete newErrors.branch;
            }
            if (field === "identityNumber" && editForm.identityType === "I.D. Number") {
                const error = hasNonNumericInput ? "Only numbers are allowed for I.D. Number" : validateSAID(value);
                if (error) newErrors[field] = error;
            }
            if (field === "personalEmail" || field === "workEmail") {
                const error = validateEmail(value);
                if (error) newErrors[field] = error;
            }
            return newErrors;
        });
    }, [editForm.identityType]);

    const validateEditForm = () => {
        const errors = {};
        if (!editForm.firstNames?.trim()) errors.firstNames = "First Name(s) field is required";
        if (!editForm.surname?.trim()) errors.surname = "Surname field is required";
        if (!editForm.identityType) errors.identityType = "Identity Type selection is required";

        if (!editForm.identityNumber?.trim()) {
            errors.identityNumber = "Identity Number field is required";
        } else if (editForm.identityType === "I.D. Number" && editForm.identityNumber.trim().length !== 13) {
            errors.identityNumber = "Identity Number must be exactly 13 digits when I.D. Number is selected";
        }

        if (editForm.identityType === "Passport" && !editForm.dateOfBirth) {
            errors.dateOfBirth = "Date of Birth is strictly required when Passport is selected";
        }

        if (editForm.paymentType === "Debit Order") {
            if (!editForm.bankAccountNumber?.trim()) errors.bankAccountNumber = "Bank Account Number is required for Debit Orders";
            if (!editForm.bankName?.trim()) errors.bankName = "Bank Employer alignment name is required for Debit Orders";
            if (!editForm.branch?.trim()) errors.branch = "Bank Branch selection is required for Debit Orders";
        }

        if (editForm.isShopSteward && !editForm.shopStewardElectionDate) {
            errors.shopStewardElectionDate = "Shop Stewards must have an Election Date specified.";
        }
        if (editForm.isBec && !editForm.becCommitteeId) {
            errors.becCommitteeId = "Please select an active primary BEC Committee before continuing.";
        }
        return errors;
    };

    const handleSaveChanges = async () => {
        const clientSideErrors = validateEditForm();
        const mergedErrors = { ...fieldErrors, ...clientSideErrors };

        if (Object.keys(mergedErrors).length > 0) {
            setFieldErrors(mergedErrors);
            const dynamicFields = Object.keys(mergedErrors);
            setActiveTab(FIELD_TO_TAB_MAP[dynamicFields[0]] || "personal");

            const summary = Object.values(mergedErrors).map(msg => `• ${msg}`).join("");
            alert(`Please fix the following validation errors before saving:

${summary}`);
            return;
        }

        const changes = getChangedFields(editForm, selectedMember);
        if (changes.length === 0) {
            alert("No changes detected.");
            setIsEditing(false);
            return;
        }

        const confirmed = window.confirm("Are you sure you want to save the following changes?" + changes.join(""));
        if (!confirmed) return;

        try {
            await memberService.updateMember(editForm);
            const refreshed = await memberService.getMembers();
            const list = Array.isArray(refreshed) ? refreshed : (refreshed.data || refreshed.members || []);
            setMembersList(list);
            setSelectedMember({ ...editForm });
            setIsEditing(false);
            setShowSavedNotification(true);
            window.setTimeout(() => setShowSavedNotification(false), 3000);
        } catch (error) {
            console.error("Unable to save member changes", error);
            alert("Unable to save changes. Please try again.");
        }
    };

    const handleInputChange = useCallback((field) => (event) => {
        const value = event && event.target ? event.target.value : event;
        setFilters((prev) => ({ ...prev, [field]: value }));
        setPage(1);
    }, []);

    const filteredMembers = useMemo(() => {
        const activeFilters = FILTER_FIELDS
            .map((field) => [field, filters[field] ? String(filters[field]).trim().toLowerCase() : ""])
            .filter(([, value]) => value);
        return membersList.filter((member) => activeFilters.every(([field, value]) =>
            String(member[field] ?? "").trim().toLowerCase().includes(value)
        ));
    }, [filters, membersList]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE)), [filteredMembers]);
    useEffect(() => {
        setPage((currentPage) => Math.min(currentPage, totalPages));
    }, [totalPages]);

    const startIndex = (page - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, filteredMembers.length);
    const visibleMembers = useMemo(() => filteredMembers.slice(startIndex, endIndex), [filteredMembers, startIndex, endIndex]);

    const handleClear = () => {
        setFilters({ ...EMPTY_FILTERS });
        setPage(1);
    };

    const formatBackendDate = (dateVal) => {
        if (!dateVal) return "-";
        if (Array.isArray(dateVal)) {
            const [year, month, day] = dateVal;
            return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        }
        return String(dateVal).split("T")[0];
    };

    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <PageTitle title="Members" subtitle="Search and manage Sasbo member records across all major financial institutions" />
            <div className="max-w-6xl mx-auto p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <SearchableSelect label="Title" value={filters.title} onChange={handleInputChange("title")} placeholder="All Titles" options={[{ value: "", label: "All Titles" }, ...titleOptions.map(o => ({ value: o, label: o }))]} />
                    <TextInput label="Employee Number" value={filters.employeeNumber} onChange={handleInputChange("employeeNumber")} placeholder="Search by employee number" />
                    <TextInput label="Membership Number" value={filters.membershipNumber} onChange={handleInputChange("membershipNumber")} placeholder="Search by membership number" />
                    <TextInput label="Initials" value={filters.initials} onChange={handleInputChange("initials")} placeholder="Search by initials" />
                    <TextInput label="Surname" value={filters.surname} onChange={handleInputChange("surname")} placeholder="Search by surname" />
                    <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <span>Identity Type</span>
                        <select value={filters.identityType} onChange={handleInputChange("identityType")} className="rounded-lg px-3 py-2 text-sm font-normal normal-case tracking-normal border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
                            <option value="">All Types</option>
                            {idTypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <TextInput label="Identity Number" value={filters.identityNumber} onChange={handleInputChange("identityNumber")} placeholder="Search by identity number" />
                    <SearchableSelect label="Bank Name" value={filters.bankName} onChange={handleInputChange("bankName")} placeholder="All Banks" options={[{ value: '', label: 'All BankBranch' }, ...bankOptions.map(b => ({ value: b, label: b }))]} />
                    <TextInput label="Branch" value={filters.branch} onChange={handleInputChange("branch")} placeholder="Search by branch" />
                    <TextInput label="Bank Account Number" value={filters.bankAccountNumber} onChange={handleInputChange("bankAccountNumber")} placeholder="Search by bank account number" />
                    <TextInput label="Cellphone Number" value={filters.phone} onChange={handleInputChange("phone")} placeholder="Search by cellphone number" />
                    <TextInput label="Personal Email" value={filters.personalEmail} onChange={handleInputChange("personalEmail")} placeholder="Search by personal email" />
                    <TextInput label="Work Email" value={filters.workEmail} onChange={handleInputChange("workEmail")} placeholder="Search by work email" />
                    <SearchableSelect label="Status" value={filters.status} onChange={handleInputChange("status")} placeholder="All Statuses" options={[{ value: "", label: "All Statuses" }, ...statusOptions.map(o => ({ value: o, label: o }))]} />
                    <SearchableSelect label="Race" value={filters.race || ""} onChange={handleInputChange("race")} placeholder="All Races" options={[{ value: "", label: "All Races" }, ...raceOptions.map(o => ({ value: o, label: o }))]} />
                    <div className="flex items-end">
                        <Button onClick={handleClear}>Clear Filters</Button>
                    </div>
                </div>
                <div className="flex items-end justify-end mt-4 gap-3">
                    <Button variant="primary" onClick={() => navigate("/members/capture")}>
                        <LucideUserRoundPlus size={16} strokeWidth={2} /> Capture Member
                    </Button>
                </div>

                <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 font-bold bg-gray-50 dark:bg-gray-900/20">
                            <th className="p-3">Membership No</th>
                            <th className="p-3">Employee No</th>
                            <th className="p-3">Full Names & Surname</th>
                            <th className="p-3">Bank Institution</th>
                            <th className="p-3">Branch Location</th>
                            <th className="p-3">Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {visibleMembers.length > 0 ? (
                            visibleMembers.map((member) => (
                                <tr
                                    key={member.id}
                                    onClick={() => setSelectedMember(member)}
                                    className="border-b border-gray-100 dark:border-gray-800/60 hover:bg-cyan-50/40 dark:hover:bg-cyan-950/20 cursor-pointer transition-colors"
                                >
                                    <td className="p-3 font-semibold text-cyan-600 dark:text-cyan-400">{member.membershipNumber || "-"}</td>
                                    <td className="p-3 font-medium text-gray-600 dark:text-gray-400">{member.employeeNumber || "-"}</td>
                                    <td className="p-3 font-medium">{`${member.title || ""} ${member.initials || ""} ${member.surname || ""}`}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{member.bankName || "-"}</td>
                                    <td className="p-3 text-gray-500">{member.branch || "-"}</td>
                                    <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${member.status === "Active" ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"}`}>
                                                {member.status || "Unknown"}
                                            </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center py-12 text-gray-400 font-medium">
                                    No Sasbo members match the specified query definitions.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm no-print">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-medium">
                        Showing {filteredMembers.length === 0 ? 0 : startIndex + 1}-{endIndex} of {filteredMembers.length} members
                        {filteredMembers.length > 0 && (
                            <button onClick={() => window.print()} title="Print results" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition">
                                <Printer size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="pagination" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                        <span className="text-gray-600 dark:text-gray-300 text-sm font-semibold">Page {page} of {totalPages}</span>
                        <Button variant="pagination" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                        <Button onClick={handleClear}>Clear</Button>
                    </div>
                </div>
            </div>

            {selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs" role="dialog" aria-modal="true" aria-label="Member Details">
                    <div className="absolute inset-0" onClick={() => setSelectedMember(null)} />
                    <div className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 animate-in fade-in zoom-in-95 duration-200">
                        {showSavedNotification && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg">
                                <CheckCircle2 size={18} />
                                <span className="text-sm font-medium">Changes saved successfully!</span>
                            </div>
                        )}

                        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-gray-400 font-bold">Sasbo Member Dashboard Profile</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-100">
                                    <span>{`${editForm.title ? editForm.title + " " : ""}${[editForm.initials, editForm.surname].filter(Boolean).join(" ") || "-"}`}</span>
                                    <span className="text-gray-300 dark:text-gray-600">•</span>
                                    <span className="text-gray-600 dark:text-gray-400 text-sm font-semibold">{editForm.membershipNumber || "No Account ID"}</span>
                                    <span className="text-gray-300 dark:text-gray-600">•</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${editForm.status === "Active" ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300" : "bg-gray-100 text-gray-600 dark:bg-gray-900/40"}`}>{editForm.status}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedMember(null)} className="shrink-0 rounded-md p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-gray-700 transition">
                                <span className="text-lg">✕</span>
                            </button>
                        </div>

                        <div className="px-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <div className="flex -mb-px overflow-x-auto whitespace-nowrap">
                                {TABS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`mr-4 inline-flex items-center gap-1 p-4 border-b-2 font-bold text-sm transition-colors ${activeTab === tab.id ? "border-cyan-600 text-cyan-600 dark:border-cyan-400 dark:text-cyan-400" : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
                                    >
                                        <span>{tab.label}</span>
                                        {isEditing && tabsWithErrors.has(tab.id) && (
                                            <span className="text-red-500 font-extrabold text-sm animate-pulse">*</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="px-6 py-5 overflow-y-auto max-h-[65vh] text-sm bg-gray-50 dark:bg-gray-900/20">
                            {activeTab === "personal" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-xs">
                                    <Detail label="Title" value={editForm.title} isEditing={isEditing} options={titleOptions} onChange={handleEditChange("title")} />
                                    <Detail label="Initials" value={editForm.initials} isEditing={isEditing} onChange={handleEditChange("initials")} />
                                    <Detail label="First Name(s)" value={editForm.firstNames} isEditing={isEditing} onChange={handleEditChange("firstNames")} error={fieldErrors.firstNames} required />
                                    <Detail label="Surname" value={editForm.surname} isEditing={isEditing} onChange={handleEditChange("surname")} error={fieldErrors.surname} required />
                                    <Detail label="Identity Type" value={editForm.identityType} isEditing={isEditing} options={idTypeOptions} onChange={handleEditChange("identityType")} error={fieldErrors.identityType} required />
                                    <Detail
                                        label={editForm.identityType || "Identity Number"}
                                        value={editForm.identityNumber}
                                        isEditing={isEditing}
                                        onChange={handleEditChange("identityNumber")}
                                        error={fieldErrors.identityNumber}
                                        disabled={!editForm.identityType}
                                        required
                                    />
                                    <Detail
                                        label="Date of Birth"
                                        value={editForm.identityType === "I.D. Number" ? formatDate(editForm.dateOfBirth) : editForm.dateOfBirth}
                                        isEditing={isEditing}
                                        type={editForm.identityType === "I.D. Number" ? "text" : "date"}
                                        onChange={handleEditChange("dateOfBirth")}
                                        disabled={editForm.identityType === "I.D. Number"}
                                        error={fieldErrors.dateOfBirth}
                                        required={editForm.identityType === "Passport"}
                                    />
                                    <Detail label="Gender" value={editForm.gender} isEditing={isEditing} options={editForm.identityType === "I.D. Number" ? null : genderOptions} onChange={handleEditChange("gender")} disabled={editForm.identityType === "I.D. Number"} />
                                    <Detail label="Race" value={editForm.race} isEditing={isEditing} options={raceOptions} onChange={handleEditChange("race")} />
                                    <Detail label="Cellphone Number" value={editForm.phone} isEditing={isEditing} onChange={handleEditChange("phone")} />
                                    <Detail label="Work Tel" value={editForm.workTel} isEditing={isEditing} onChange={handleEditChange("workTel")} />
                                    <Detail label="Home Tel" value={editForm.homeTel} isEditing={isEditing} onChange={handleEditChange("homeTel")} />
                                    <div className="md:col-span-2">
                                        {isEditing ? (
                                            <AddressAutocomplete label="Residential Address" value={editForm.address} onChange={handleEditChange("address")} placeholder="Update residential location address strings..." />
                                        ) : (
                                            <Detail label="Residential Address" value={selectedMember.address} isEditing={false} />
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === "employment" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-xs">
                                    <Detail label="Employee Number" value={editForm.employeeNumber} isEditing={isEditing} onChange={handleEditChange("employeeNumber")} />
                                    <Detail label="Bank Where Employed" value={editForm.bankName} isEditing={isEditing} options={bankOptions} error={fieldErrors.bankName} required={editForm.paymentType === "Debit Order"} onChange={handleEditChange("bankName")} />
                                    <Detail label="Employment Type" value={editForm.employmentType} isEditing={isEditing} options={EMPLOYMENT_TYPE_OPTIONS} onChange={handleEditChange("employmentType")} />
                                    <Detail label="Job Grade" value={editForm.jobGrade} isEditing={isEditing} options={jobGrade} onChange={handleEditChange("jobGrade")} disabled={!editForm.bankName} />
                                    <Detail label="Bank Branch" value={editForm.branch} isEditing={isEditing} options={branchOptions} error={fieldErrors.branch} required={editForm.paymentType === "Debit Order"} onChange={handleEditChange("branch")} />
                                    <Detail label="Payment Type" value={editForm.paymentType} isEditing={isEditing} options={paymentTypeOptions} onChange={handleEditChange("paymentType")} />

                                    {editForm.paymentType === "Debit Order" && (
                                        <>
                                            <Detail label="Bank Account Number" value={editForm.bankAccountNumber} isEditing={isEditing} error={fieldErrors.bankAccountNumber} required onChange={handleEditChange("bankAccountNumber")} />
                                            <Detail
                                                label="Debit Day"
                                                value={editForm.debitDay}
                                                isEditing={isEditing}
                                                options={["20", "25", "31"]}
                                                error={fieldErrors.debitDay}
                                                onChange={handleEditChange("debitDay")}
                                            />
                                        </>
                                    )}
                                    <Detail label="IBT No." value={editForm.ibtNo} isEditing={isEditing} onChange={handleEditChange("ibtNo")} />
                                    {/*<Detail label="Work IBT No." value={editForm.workIbtNo} isEditing={isEditing} onChange={handleEditChange("workIbtNo")} />*/}
                                    <div className="md:col-span-2">
                                        {isEditing ? (
                                            <AddressAutocomplete label="Bank Work Address" value={editForm.bankAddress} onChange={handleEditChange("bankAddress")} placeholder="Search coordinates..." />
                                        ) : (
                                            <Detail label="Bank Address" value={selectedMember.bankAddress} isEditing={false} />
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === "membership" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-xs">
                                    <Detail label="Date Joined Sasbo" value={formatBackendDate(selectedMember.joinDate)} isEditing={false} />
                                    <Detail label="Account Membership Status" value={editForm.status} isEditing={isEditing} options={statusOptions} onChange={handleEditChange("status")} />
                                    <div className="md:col-span-2 border-t pt-3 font-semibold text-cyan-700 dark:text-cyan-400">Sasbo Subscription Fee Details</div>
                                    <Detail label="Monthly Subscription (ZAR)" value={selectedMember.monthlySubscription || "182.77"} isEditing={false} />
                                    <Detail label="Billing Frequency" value={selectedMember.subscriptionFrequency || "Monthly"} isEditing={false} />
                                </div>
                            )}

                            {activeTab === "representatives" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-xs">
                                    <Detail label="Recruiter" value={editForm.recruitmentRepresentativeName} isEditing={isEditing} disabled={true} />
                                    <Detail label="Area's Recruiter" value={editForm.areasRep} isEditing={isEditing} disabled={true} />
                                </div>
                            )}

                            {activeTab === "structures" && (
                                <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                                        <h3 className="text-sm font-bold uppercase tracking-wide text-cyan-700 dark:text-cyan-400">SASBO Structural Configuration Matrix</h3>
                                    </div>

                                    {isEditing ? (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Detail label="Shop Steward?" value={editForm.isShopSteward ? "Yes" : "No"} isEditing={true} options={["Yes", "No"]} onChange={(e) => {
                                                    const isYes = e.target.value === "Yes";
                                                    setEditForm(prev => ({ ...prev, isShopSteward: isYes, ...(!isYes ? { shopStewardElectionDate: "" } : {}) }));
                                                }} />
                                                {editForm.isShopSteward && (
                                                    <div className="animate-slideDown">
                                                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">Shop Steward Election Date *</label>
                                                        <input type="date" value={editForm.shopStewardElectionDate || ""} className={fieldCls(fieldErrors.shopStewardElectionDate)} onChange={(e) => setEditForm(prev => ({ ...prev, shopStewardElectionDate: e.target.value }))} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                                <Detail label="BEC (Branch Executive Committee) Member?" value={editForm.isBec ? "Yes" : "No"} isEditing={true} options={["Yes", "No"]} onChange={(e) => {
                                                    const isYes = e.target.value === "Yes";
                                                    setEditForm(prev => ({
                                                        ...prev,
                                                        isBec: isYes,
                                                        ...(!isYes ? { becCommitteeId: "", isBecRecruiter: false, becRecruiterRole: "", isBecStructureRep: false, becStructures: [], isBecExecutive: false, becExecutivePosition: "" } : {})
                                                    }));
                                                }} />
                                            </div>

                                            {editForm.isBec && (
                                                <div className="pl-4 border-l-2 border-cyan-500 dark:border-cyan-600 space-y-6 mt-4 animate-slideDown">
                                                    <div>
                                                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">Select BEC Committee (Single Selection — 44 Available) *</label>
                                                        <select value={editForm.becCommitteeId || ""} className={fieldCls(fieldErrors.becCommitteeId)} onChange={(e) => {
                                                            const selectedId = e.target.value;
                                                            const foundBranch = SASBO_BEC_BRANCHES.find(b => b.id === selectedId);
                                                            setEditForm(prev => ({ ...prev, becCommitteeId: selectedId, becCommitteeName: foundBranch ? foundBranch.name : "" }));
                                                        }}>
                                                            <option value="">Select Committee...</option>
                                                            {Object.entries(SASBO_BEC_BRANCHES.reduce((acc, branch) => {
                                                                (acc[branch.region] = acc[branch.region] || []).push(branch);
                                                                return acc;
                                                            }, {})).map(([regionName, branchesInRegion]) => (
                                                                <optgroup key={regionName} label={regionName.toUpperCase()} className="text-cyan-700 dark:text-cyan-400 font-bold bg-white dark:bg-gray-900">
                                                                    {branchesInRegion.map(b => (
                                                                        <option key={b.id} value={b.id} className="text-gray-900 dark:text-gray-100 font-normal">{b.name}</option>
                                                                    ))}
                                                                </optgroup>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <Detail label="BEC Recruiter?" value={editForm.isBecRecruiter ? "Yes" : "No"} isEditing={true} options={["Yes", "No"]} onChange={(e) => {
                                                            const isYes = e.target.value === "Yes";
                                                            setEditForm(prev => ({ ...prev, isBecRecruiter: isYes, ...(!isYes ? { becRecruiterRole: "" } : {}) }));
                                                        }} />
                                                        {editForm.isBecRecruiter && (
                                                            <Detail label="BEC Recruiter Role" value={editForm.becRecruiterRole} isEditing={true} options={roles?.map(r => r.name) || ["Standard Recruiter", "Lead Recruiter"]} onChange={(e) => setEditForm(prev => ({ ...prev, becRecruiterRole: e.target.value }))} />
                                                        )}
                                                    </div>

                                                    <div className="space-y-3">
                                                        <Detail label="BEC Structure Representative?" value={editForm.isBecStructureRep ? "Yes" : "No"} isEditing={true} options={["Yes", "No"]} onChange={(e) => {
                                                            const isYes = e.target.value === "Yes";
                                                            setEditForm(prev => ({ ...prev, isBecStructureRep: isYes, ...(!isYes ? { becStructures: [] } : {}) }));
                                                        }} />
                                                        {editForm.isBecStructureRep && (
                                                            <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
                                                                {["INC / IC", "NCF / SJC", "Vice President (VP)", "President", "MANCOM", "Resolutions Committee"].map((struct) => {
                                                                    const currentSelected = editForm.becStructures || [];
                                                                    const isChecked = currentSelected.includes(struct);
                                                                    return (
                                                                        <label key={struct} className="flex items-center gap-3 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm">
                                                                            <input type="checkbox" checked={isChecked} className="accent-cyan-600 rounded text-cyan-600 focus:ring-cyan-500 h-4 w-4" onChange={() => {
                                                                                const nextSelected = isChecked ? currentSelected.filter(item => item !== struct) : [...currentSelected, struct];
                                                                                setEditForm(prev => ({ ...prev, becStructures: nextSelected }));
                                                                            }} />
                                                                            <span className="text-gray-800 dark:text-gray-200">{struct}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <Detail label="BEC Executive?" value={editForm.isBecExecutive ? "Yes" : "No"} isEditing={true} options={["Yes", "No"]} onChange={(e) => {
                                                            const isYes = e.target.value === "Yes";
                                                            setEditForm(prev => ({ ...prev, isBecExecutive: isYes, ...(!isYes ? { becExecutivePosition: "" } : {}) }));
                                                        }} />
                                                        {editForm.isBecExecutive && (
                                                            <Detail label="Select Executive Position" value={editForm.becExecutivePosition} isEditing={true} options={["Chairperson", "Deputy Chairperson", "Secretary", "Deputy Secretary", "Treasurer"]} onChange={(e) => setEditForm(prev => ({ ...prev, becExecutivePosition: e.target.value }))} />
                                                        )}
                                                    </div>

                                                    <div className="border-t border-cyan-200 dark:border-cyan-800 pt-4 mt-4">
                                                        <Detail label="COSATU Member (within this BEC Committee)?" value={editForm.isCosatu === "Y" || editForm.isCosatu === true ? "Yes" : "No"} isEditing={true} options={["Yes", "No"]} onChange={(e) => {
                                                            const isYes = e.target.value === "Yes";
                                                            setEditForm(prev => ({
                                                                ...prev,
                                                                isCosatu: isYes ? "Y" : "N",
                                                                ...(!isYes ? { cosatuLocal: "", cosatuRegion: "", cosatuPositions: [] } : {})
                                                            }));
                                                        }} />
                                                        {(editForm.isCosatu === "Y" || editForm.isCosatu === true) && (
                                                            <div className="mt-4 pl-4 border-l-2 border-orange-400 space-y-4 animate-slideDown">
                                                                <p className="text-xs font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400">COSATU Structure within BEC Committee</p>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    {["COSATU Local", "Region within Local"].map((pos) => {
                                                                        const current = editForm.cosatuPositions || [];
                                                                        return (
                                                                            <label key={pos} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                                                                <input type="checkbox" checked={current.includes(pos)} className="accent-orange-500 rounded h-4 w-4" onChange={() => {
                                                                                    const next = current.includes(pos) ? current.filter(p => p !== pos) : [...current, pos];
                                                                                    setEditForm(prev => ({ ...prev, cosatuPositions: next }));
                                                                                }} />
                                                                            </label>
                                                                        );
                                                                    })}
                                                                </div>
                                                                {/*<div className="grid grid-cols-1 md:grid-cols-2 gap-4">*/}
                                                                {/*    <Detail label="COSATU Local" value={editForm.cosatuLocal || ""} isEditing={true} onChange={(e) => setEditForm(prev => ({ ...prev, cosatuLocal: e.target.value }))} />*/}
                                                                {/*    <Detail label="Region within Local" value={editForm.cosatuRegion || ""} isEditing={true} onChange={(e) => setEditForm(prev => ({ ...prev, cosatuRegion: e.target.value }))} />*/}
                                                                {/*</div>*/}
                                                                <div className="p-4 bg-orange-50/50 dark:bg-orange-950/10 border border-orange-200 dark:border-orange-800 rounded-lg">
                                                                    <label className="block text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-400 mb-2">COSATU Positions — Multiple Allowed</label>
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        {["PEC", "CEC", "Treasurer", "Chairperson", "Secretary"].map((pos) => {
                                                                            const current = editForm.cosatuPositions || [];
                                                                            return (
                                                                                <label key={pos} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                                                                    <input type="checkbox" checked={current.includes(pos)} className="accent-orange-500 rounded h-4 w-4" onChange={() => {
                                                                                        const next = current.includes(pos) ? current.filter(p => p !== pos) : [...current, pos];
                                                                                        setEditForm(prev => ({ ...prev, cosatuPositions: next }));
                                                                                    }} />
                                                                                    {pos === "PEC" ? "PEC (Provincial Executive Committee)" :
                                                                                     pos === "CEC" ? "CEC (Central Executive Committee)" : pos}
                                                                                </label>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 divide-gray-100 dark:divide-gray-800">
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Core Appointments</h4>
                                                <Detail label="Shop Steward status" value={selectedMember.isShopSteward ? "Yes" : "No"} isEditing={false} />
                                                {selectedMember.isShopSteward && <Detail label="Election Date" value={selectedMember.shopStewardElectionDate || "-"} isEditing={false} />}
                                                <Detail label="BEC Member status" value={selectedMember.isBec ? "Yes" : "No"} isEditing={false} />
                                                {selectedMember.isBec && <Detail label="Assigned BEC Committee" value={SASBO_BEC_BRANCHES.find(b => b.id === selectedMember.becCommitteeId)?.name || selectedMember.becCommitteeName || "-"} isEditing={false} />}
                                            </div>
                                            <div className="space-y-3 pt-4 md:pt-0">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Specialized Assignments</h4>
                                                {selectedMember.isBec && (
                                                    <>
                                                        <Detail label="BEC Recruiter" value={selectedMember.isBecRecruiter ? `Yes (${selectedMember.becRecruiterRole || 'Standard'})` : "No"} isEditing={false} />
                                                        <Detail label="Structure Representative Roles" value={selectedMember.isBecStructureRep && selectedMember.becStructures?.length > 0 ? selectedMember.becStructures.join(", ") : "None Assigned"} isEditing={false} />
                                                        <Detail label="BEC Executive Position" value={selectedMember.isBecExecutive ? selectedMember.becExecutivePosition : "None"} isEditing={false} />
                                                        
                                                        <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                                                            <h5 className="text-xs font-bold uppercase tracking-wider text-orange-500 mb-2">COSATU Structure (within BEC)</h5>
                                                            <Detail label="COSATU Member" value={selectedMember.isCosatu === "Y" || selectedMember.isCosatu === true ? "Yes" : "No"} isEditing={false} />
                                                            {(selectedMember.isCosatu === "Y" || selectedMember.isCosatu === true) && (
                                                                <div className="grid grid-cols-1 gap-3 mt-2">
                                                                    <Detail label="COSATU Local" value={selectedMember.cosatuLocal || "-"} isEditing={false} />
                                                                    <Detail label="Region within Local" value={selectedMember.cosatuRegion || "-"} isEditing={false} />
                                                                    <Detail label="Positions Held" value={selectedMember.cosatuPositions?.length > 0 ? selectedMember.cosatuPositions.join(", ") : "None"} isEditing={false} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === "history" && (
                                <div className="grid grid-cols-1 gap-5 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-xs">
                                    <Detail label="Primary Remarks / Audit Comments" value={editForm.remarks} isEditing={isEditing} onChange={handleEditChange("remarks")} />
                                    <Detail label="Secondary Comments Logging Sub-Field" value={editForm.remarks2} isEditing={isEditing} onChange={handleEditChange("remarks2")} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
                                        <Detail label="Record Created Timestamp" value={formatBackendDate(selectedMember.createdAt)} isEditing={false} />
                                        <Detail label="Last Account Modification" value={formatBackendDate(selectedMember.updatedAt)} isEditing={false} />
                                    </div>
                                </div>
                            )}
                        </div>

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
    `w-full rounded-lg px-4 py-2.5 text-sm border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 ${
        disabled ? "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed" : "bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white"} ${error ? "border-red-500 dark:border-red-400" : "border-gray-200 dark:border-gray-700"}`;

function Detail({ label, value, isEditing, onChange, className = "", options = null, type = "text", error = null, disabled = false, required = false }) {
    const detailId = `detail-${label.toLowerCase().replace(/\s+/g, "-")}`;
    return (
        <div className={className}>
            <label htmlFor={detailId} className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                {label} {isEditing && required && <span className="text-red-500 font-bold">*</span>}
            </label>
            {isEditing ? (
                <div className="relative">
                    {options ? (
                        <select id={detailId} value={value || ""} onChange={onChange} className={fieldCls(error, disabled)} disabled={disabled}>
                            <option value="">Select...</option>
                            {options.map(opt => (
                                <option key={opt.value !== undefined ? opt.value : opt} value={opt.value !== undefined ? opt.value : opt}>
                                    {opt.label !== undefined ? opt.label : opt}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input id={detailId} type={type} value={value || ""} onChange={onChange} className={fieldCls(error, disabled)} disabled={disabled} />
                    )}
                    {error && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400 font-medium">{error}</p>}
                </div>
            ) : (
                <p className="mt-0.5 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-gray-50/50 dark:bg-gray-800/40 p-2 rounded-lg border border-gray-100/70 dark:border-gray-700/30">{value || "-"}</p>
            )}
        </div>
    );
}
