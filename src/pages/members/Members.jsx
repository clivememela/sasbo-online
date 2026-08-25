import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LucideUserRoundPlus, CheckCircle2, Printer } from "lucide-react";
import { memberService } from "../../services/memberService.js";
import { recruiterService } from "../../services/recruiterService.js";
import { TextInput, SearchableSelect, Button } from "../../components/form";
import {
    FREQUENCY_OPTIONS, TITLE_OPTIONS, RACE_OPTIONS, PAYMENT_TYPE_OPTIONS,
    STATUS_OPTIONS, YES_NO_OPTIONS, IDENTITY_TYPE_OPTIONS, GENDER_OPTIONS, SUSPENSION_CODE_OPTIONS,
    JOB_GRADE_OPTIONS, DAY_OPTIONS, MONTH_OPTIONS, YEAR_OPTIONS,
    BANK_OPTIONS, BRANCH_OPTIONS, REP_OPTIONS, MEMBER_FIELD_LABEL_MAP, EMPLOYMENT_TYPE_OPTIONS,
    DEBIT_DAY_OPTIONS,
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
    { id: "history", label: "History & Remarks" },
];

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

const normalize = (value) => String(value ?? "").trim().toLowerCase();
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
    const [structuresTree, setStructuresTree] = useState([]);
    const [roles, setRoles] = useState([]);

    const flatStructures = useMemo(() => {
        const result = [];
        const traverse = (node, depth = 0) => {
            result.push({
                id: node.id,
                name: " ".repeat(depth) + node.name,
                requiresElectionDate: node.requiresElectionDate
            });
            if (node.children) {
                node.children.forEach(child => traverse(child, depth + 1));
            }
        };
        structuresTree.forEach(node => traverse(node));
        return result;
    }, [structuresTree]);

    useEffect(() => {
        recruiterService.getStructures().then(setStructuresTree).catch(err => console.error("Failed to load structures", err));
        recruiterService.getRoles().then(setRoles).catch(err => console.error("Failed to load roles", err));
    }, []);

    const titleOptions = TITLE_OPTIONS;
    const idTypeOptions = IDENTITY_TYPE_OPTIONS;
    const raceOptions = RACE_OPTIONS;
    const paymentTypeOptions = PAYMENT_TYPE_OPTIONS;
    const statusOptions = STATUS_OPTIONS;
    const yesNoOptions = YES_NO_OPTIONS;
    const bankOptions = BANK_OPTIONS;
    const branchOptions = BRANCH_OPTIONS;
    const genderOptions = GENDER_OPTIONS;

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
            setEditForm({ ...selectedMember, paymentType: normalizePaymentType(selectedMember.paymentType) });
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
        setIsEditing((editing) => {
            if (!editing) {
                setEditForm({ ...selectedMember, paymentType: normalizePaymentType(selectedMember?.paymentType) });
            }
            return !editing;
        });
    };

    const handleEditChange = useCallback((field) => (event) => {
        const value = event && event.target ? event.target.value : event;
        setEditForm((prev) => {
            const next = { ...prev, [field]: value };
            if (field === "identityNumber" && value.length === 13) {
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
    }, []);

    const handleSaveChanges = async () => {
        if (Object.keys(fieldErrors).length > 0) {
            alert("Please fix the errors before saving.");
            return;
        }

        if (editForm.isShopSteward && !editForm.shopStewardElectionDate) {
            alert("Shop Stewards must have an Election Date specified.");
            return;
        }
        if (editForm.isBec && !editForm.becCommitteeId) {
            alert("Please select an active primary BEC Committee before continuing.");
            return;
        }

        const changes = getChangedFields(editForm, selectedMember);
        if (changes.length === 0) {
            alert("No changes detected.");
            setIsEditing(false);
            return;
        }

        const confirmed = window.confirm("Are you sure you want to save the following changes?\n\n" + changes.join("\n"));
        if (!confirmed) return;

        try {
            await memberService.updateMember(editForm);
            const refreshedMembers = await memberService.getMembers();
            setMembersList(refreshedMembers);
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

    const [membersList, setMembersList] = useState([]);
    useEffect(() => {
        memberService.getMembers().then(setMembersList);
    }, []);

    const filteredMembers = useMemo(() => {
        const activeFilters = FILTER_FIELDS
            .map((field) => [field, normalize(filters[field])])
            .filter(([, value]) => value);
        return membersList.filter((member) => activeFilters.every(([field, value]) =>
            normalize(member[field]).includes(value)
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

                {/* Simplified table container for context truncation */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm no-print">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        Showing {filteredMembers.length === 0 ? 0 : startIndex + 1}-{endIndex} of {filteredMembers.length} members
                        {filteredMembers.length > 0 && (
                            <button onClick={() => window.print()} title="Print results" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition">
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
            </div>

            {/* Modal: Member Details */}
            {selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Member Details">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedMember(null)} />
                    <div className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        {showSavedNotification && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
                                <CheckCircle2 size={18} />
                                <span className="text-sm font-medium">Changes saved successfully!</span>
                            </div>
                        )}

                        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold">Member Details</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                                    <span>{`${selectedMember.title ? selectedMember.title + " " : ""}${[selectedMember.initials, selectedMember.surname].filter(Boolean).join(" ") || "-"}`}</span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-gray-600 dark:text-gray-300">{selectedMember.bankName || "-"}</span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-gray-600 dark:text-gray-300">{selectedMember.branch || "-"}</span>
                                    <span className="text-gray-400">•</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${selectedMember.status === "Active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300"}`}>{selectedMember.status}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedMember(null)} className="shrink-0 rounded-md p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700">
                                <span className="text-xl">✕</span>
                            </button>
                        </div>

                        {/* Tab Navigation */}
                        <div className="px-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <div className="flex -mb-px">
                                {TABS.map((tab) => (
                                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`mr-4 inline-block p-4 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id ? "border-cyan-600 text-cyan-600 dark:border-cyan-400 dark:text-cyan-400" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"}`}>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Main Tabs Workspace Panel Container */}
                        <div className="px-6 py-5 overflow-y-auto max-h-[70vh] text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/40">
                            {activeTab === "structures" && (
                                <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                                        <h3 className="text-sm font-bold uppercase tracking-wide text-cyan-700 dark:text-cyan-400">SASBO Structural Configuration</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Manage how this member sits across SASBO hierarchical layouts.</p>
                                    </div>

                                    {isEditing ? (
                                        <div className="space-y-6">
                                            {/* LEVEL 1: Shop Steward Framework */}
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

                                            {/* LEVEL 2: BEC Core Affiliation */}
                                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                                <Detail label="BEC (Branch Executive Committee) Member?" value={editForm.isBec ? "Yes" : "No"} isEditing={true} options={["Yes", "No"]} onChange={(e) => {
                                                    const isYes = e.target.value === "Yes";
                                                    setEditForm(prev => ({
                                                        ...prev,
                                                        isBec: isYes,
                                                        ...(isYes ? {} : { becCommitteeId: "", isBecRecruiter: false, becRecruiterRole: "", isBecStructureRep: false, becStructures: [], isBecExecutive: false, becExecutivePosition: "" })
                                                    }));
                                                }} />
                                            </div>

                                            {/* NESTED DEPENDENCIES */}
                                            {editForm.isBec && (
                                                <div className="pl-4 border-l-2 border-cyan-500 dark:border-cyan-600 space-y-6 mt-4 animate-slideDown">
                                                    {/* LEVEL 3A: 44 Single Selection Committees */}
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

                                                    {/* LEVEL 3B: BEC Recruiter Selection */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <Detail label="BEC Recruiter?" value={editForm.isBecRecruiter ? "Yes" : "No"} isEditing={true} options={["Yes", "No"]} onChange={(e) => {
                                                            const isYes = e.target.value === "Yes";
                                                            setEditForm(prev => ({ ...prev, isBecRecruiter: isYes, ...(!isYes ? { becRecruiterRole: "" } : {}) }));
                                                        }} />
                                                        {editForm.isBecRecruiter && (
                                                            <Detail label="BEC Recruiter Role" value={editForm.becRecruiterRole} isEditing={true} options={roles?.map(r => r.name) || ["Standard Recruiter", "Lead Recruiter"]} onChange={(e) => setEditForm(prev => ({ ...prev, becRecruiterRole: e.target.value }))} />
                                                        )}
                                                    </div>

                                                    {/* LEVEL 3C: BEC Structure Representative - Multiple Selection */}
                                                    <div className="space-y-3">
                                                        <Detail label="BEC Structure Representative?" value={editForm.isBecStructureRep ? "Yes" : "No"} isEditing={true} options={["Yes", "No"]} onChange={(e) => {
                                                            const isYes = e.target.value === "Yes";
                                                            setEditForm(prev => ({ ...prev, isBecStructureRep: isYes, ...(!isYes ? { becStructures: [] } : {}) }));
                                                        }} />
                                                        {editForm.isBecStructureRep && (
                                                            <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
                                                                <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Select Associated Structure(s) — MULTIPLE ALLOWED</label>
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

                                                    {/* LEVEL 3D: BEC Executive Selection - Single Choice */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <Detail label="BEC Executive?" value={editForm.isBecExecutive ? "Yes" : "No"} isEditing={true} options={["Yes", "No"]} onChange={(e) => {
                                                            const isYes = e.target.value === "Yes";
                                                            setEditForm(prev => ({ ...prev, isBecExecutive: isYes, ...(!isYes ? { becExecutivePosition: "" } : {}) }));
                                                        }} />
                                                        {editForm.isBecExecutive && (
                                                            <Detail label="Select Executive Position" value={editForm.becExecutivePosition} isEditing={true} options={["Chairperson", "Deputy Chairperson", "Secretary", "Deputy Secretary", "Treasurer"]} onChange={(e) => setEditForm(prev => ({ ...prev, becExecutivePosition: e.target.value }))} />
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* READ-ONLY WORKSPACE OVERVIEW */
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
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab !== "structures" && (
                                <div className="text-center py-10 text-gray-400">
                                    Tab content placeholder mock wrapper.
                                </div>
                            )}
                        </div>

                        {/* Footer buttons section layout */}
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
        disabled ? "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed" : "bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white"
    } ${error ? "border-red-500 dark:border-red-400" : "border-gray-200 dark:border-gray-700"}`;

function Detail({ label, value, isEditing, onChange, className = "", options = null, type = "text", error = null, disabled = false }) {
    const detailId = `detail-${label.toLowerCase().replace(/\\s+/g, "-")}`;
    return (
        <div className={className}>
            <label htmlFor={detailId} className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
            {isEditing ? (
                <div className="relative">
                    {options ? (
                        <select id={detailId} value={value || ""} onChange={onChange} className={fieldCls(error, disabled)} disabled={disabled}>
                            <option value="">Select...</option>
                            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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