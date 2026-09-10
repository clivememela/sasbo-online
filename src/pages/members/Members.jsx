import { useDeferredValue, useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LucideUserRoundPlus, AlertCircle, CheckCircle2, Printer, SlidersHorizontal } from "lucide-react";
import { memberService } from "../../services/memberService.js";
import { recruiterService } from "../../services/recruiterService.js";
import { jobGradeService } from "../../services/jobGradeService.js";
import { bankService } from "../../services/bankService.js";
import { TextInput, SearchableSelect, SelectInput, Button, CheckboxGroup, DateField, Field, controlClasses } from "../../components/form";
import StatusChip from "../../components/common/StatusChip.jsx";
import Table from "../../components/table/Table.jsx";
import Modal, { ConfirmDialog, closeOn } from "../../components/overlay/Modal.jsx";
import {
    TITLE_OPTIONS, RACE_OPTIONS, PAYMENT_TYPE_OPTIONS,
    STATUS_OPTIONS, IDENTITY_TYPE_OPTIONS, GENDER_OPTIONS,
    BRANCH_OPTIONS, MEMBER_FIELD_LABEL_MAP, EMPLOYMENT_TYPE_OPTIONS,
} from "../../config/memberConstants.js";
import {
    validateSAID, validateEmail, formatDate, extractDateOfBirthFromSAID, extractGenderFromSAID
} from "../../utils/validateSAID.js";
import PageTitle from "../../components/common/PageTitle.jsx";
import AddressAutocomplete from "../../components/form/AddressAutocomplete";
import DataState from "../../components/common/DataState.jsx";
import FigureStrip from "../../components/members/FigureStrip.jsx";
import MemberPanel from "../../components/members/MemberPanel.jsx";
import useReferenceData from "../../hooks/useReferenceData.js";
import reportError from "../../lib/reportError.js";
import { cn } from "../../lib/utils";

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


/**
 * THE TWO REFERENCE LISTS BEHIND THIS SCREEN'S EDIT PANEL. `06.1b`, EH-D9.
 *
 * 🔴 BOTH LOADED WITH `.catch(err => console.error(...))`. The member register itself has
 * had a proper error state since `04.2` (that was A27), but the two lists that fill the edit
 * panel's Bank and Lead Recruiter selectors did not -- so a half-down backend rendered a
 * perfectly good register whose edit panel silently offered no banks. An administrator
 * editing a member would conclude the bank list was empty, not that the server had failed.
 *
 * 🔑 At module scope because `useReferenceData` needs a stable object; rebuilt per render
 * it re-fetches forever, which looks exactly like a slow backend.
 */
const REFERENCE_LOADERS = {
    'lead recruiters': () => recruiterService.getRoles(),
    banks: () => bankService.getBankNames(),
};

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
    const [membersList, setMembersList] = useState([]);

    /*
     * ✅ THE TWO SILENT `.catch(console.error)` LOADS, REPLACED BY ONE SET (EH-D9).
     *
     * Note what is NOT here: `membersList`. The register's own fetch keeps its own
     * `listState`, because a register that failed IS this screen failing -- there is nothing
     * left to look at. A missing bank list is not; the register still renders and the edit
     * panel says which list is missing. That is the line between `error` and `partial`.
     */
    const refs = useReferenceData(REFERENCE_LOADERS);
    const roles = refs.data['lead recruiters'];
    const bankNames = refs.data.banks;

    /**
     * A27 — THE THREE STATES, AT LAST, AND THE DEFECT WAS THAT THERE WAS ONLY ONE.
     *
     * The mount effect's entire failure handling was `console.error`, and `membersList`
     * simply stayed `[]`. So a backend that is DOWN rendered "No Sasbo members match the
     * specified query definitions" — which an administrator reads as a fact about the
     * union rather than a fact about the server, with no retry, because nothing in the
     * page knew a request had failed. There was no loading state either: the empty table
     * rendered synchronously on mount, so the first thing every user saw, every time, was
     * "no members", flickering into data.
     *
     * 🔑 `listState` IS ONE VALUE, NOT TWO BOOLEANS. `loading` and `error` as separate
     * flags is four combinations for three legal states, and the illegal fourth
     * (`loading && error`) is what renders an error and a spinner at once.
     */
    const [listState, setListState] = useState("loading");
    /* The twelve criteria the mock keeps behind "More criteria". Closed at rest. */
    const [moreCriteria, setMoreCriteria] = useState(false);

    const loadMembers = useCallback(() => {
        setListState("loading");
        return memberService.getMembers().then(res => {
            const list = Array.isArray(res) ? res : (res.data || res.members || []);
            setMembersList(list);
            setListState("ready");
        }).catch(err => {
            // Still logged — the log is what a developer reads. What changed is that the
            // SCREEN now knows too.
            reportError("Members.loadMembers", err);
            setListState("error");
        });
    }, []);

    // The two reference lists are `useReferenceData`'s now; this owns the register alone.
    useEffect(() => {
        loadMembers();
    }, [loadMembers]);

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
    const bankOptions = bankNames;
    const branchOptions = BRANCH_OPTIONS;
    const genderOptions = GENDER_OPTIONS;
    const [jobGradeOptions, setJobGradeOptions] = useState([]);
    /*
     * ✅ A25's SECOND CLAUSE, `06.1b` -- the other of the two callers. Same reasoning as the
     * one written out at `CaptureMember.jsx`: `getByBank` no longer swallows a failure into
     * the (empty) static list, so this panel renders the failure with a retry instead of
     * telling an administrator that the member's bank has no job grades on file.
     */
    const [jobGradeError, setJobGradeError] = useState(null);
    const [jobGradeAttempt, setJobGradeAttempt] = useState(0);
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
            setJobGradeOptions([]);
            setJobGradeError(null);
            setEditForm(prev => ({ ...prev, jobGrade: "" }));
            return;
        }

        setJobGradeError(null);
        jobGradeService.getByBank(editForm.bankName)
            .then((grades) => setJobGradeOptions(Array.isArray(grades) ? grades : []))
            .catch((error) => {
                // An abort is the caller superseding itself, not a failure (§16, EH-D3).
                if (error?.kind === 'abort') return;
                setJobGradeOptions([]);
                setJobGradeError(error);
            });
    }, [editForm.bankName, jobGradeAttempt]);

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

    /**
     * What the last save attempt said, when it was not a validation failure.
     *
     * 🔴 IT WAS THREE `alert()` CALLS. A native modal cannot be styled, blocks the thread,
     * names no field, and is SUPPRESSIBLE — a member who ticks "don't show me these again"
     * silently loses every confirmation in the application. It also arrives and leaves,
     * so after dismissing "please fix the following validation errors" the form looked
     * exactly as it had, with nothing on screen saying what was wrong.
     */
    const [saveNotice, setSaveNotice] = useState(null);
    const errorSummaryRef = useRef(null);

    const handleSaveChanges = async () => {
        const clientSideErrors = validateEditForm();
        const mergedErrors = { ...fieldErrors, ...clientSideErrors };

        if (Object.keys(mergedErrors).length > 0) {
            setFieldErrors(mergedErrors);
            const dynamicFields = Object.keys(mergedErrors);
            setActiveTab(FIELD_TO_TAB_MAP[dynamicFields[0]] || "personal");
            // The summary is rendered in the dialog and focused, so the member is told
            // where the problem is AND left looking at it. The tab switch above is what
            // makes that true for a form whose fields are behind five tabs.
            setSaveNotice({ kind: "invalid", messages: Object.values(mergedErrors) });
            return;
        }

        const changes = getChangedFields(editForm, selectedMember);
        if (changes.length === 0) {
            setSaveNotice({ kind: "unchanged", messages: ["Nothing on this record has changed, so there is nothing to save."] });
            setIsEditing(false);
            return;
        }

        setSaveNotice(null);

        // 🔴 `03.4`: was `window.confirm()`. It listed the changes in a browser dialog that
        // cannot be styled, cannot be scrolled sensibly, blocks the whole thread, and is
        // SUPPRESSIBLE -- a user who ticks "don't show me these again" silently loses this
        // confirmation and every other one in the application.
        setPendingSave(changes);
    };

    const commitSave = async () => {
        setPendingSave(null);
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
            reportError("Members.save", error);
            // 06.1 owns the shared error CONTRACT; what this wave owes the screen is that
            // a failed save is visible on the screen the member is looking at, rather than
            // in a dialog they dismiss and a console they never open.
            setSaveNotice({
                kind: "failed",
                messages: ["We could not save these changes. Nothing was written — please try again."],
            });
        }
    };

    const [pendingSave, setPendingSave] = useState(null);

    // Same shape as `Auth`'s, and for the same reason: the summary does not exist yet when
    // the handler that sets it runs, so focusing it there is a silent no-op. `saveNotice`
    // is replaced by a fresh object on every attempt, so a second failed save moves focus
    // again rather than looking ignored.
    useEffect(() => {
        if (saveNotice) errorSummaryRef.current?.focus();
    }, [saveNotice]);

    const handleInputChange = useCallback((field) => (event) => {
        const value = event && event.target ? event.target.value : event;
        setFilters((prev) => ({ ...prev, [field]: value }));
        setPage(1);
    }, []);

    /**
     * R-PERF-J. The filter runs against the WHOLE member list on every keystroke, and the
     * result re-renders a table of up to a hundred rows. `useDeferredValue` lets React
     * paint the keystroke first and the filtered list a beat later, so typing stays
     * responsive on a list that is large enough to matter.
     *
     * ⚠️ DEFERRED, NOT DEBOUNCED, AND THE DIFFERENCE IS WHICH ONE IS CORRECT HERE. A
     * debounce delays by a fixed time whether or not the machine needed it; deferring
     * costs nothing on a fast machine and degrades gracefully on a slow one. `useDebounce`
     * is the right tool where a keystroke triggers a REQUEST — this filter is local, so
     * there is no request to spare.
     */
    const deferredFilters = useDeferredValue(filters);

    const filteredMembers = useMemo(() => {
        const activeFilters = FILTER_FIELDS
            .map((field) => [field, deferredFilters[field] ? String(deferredFilters[field]).trim().toLowerCase() : ""])
            .filter(([, value]) => value);
        return membersList.filter((member) => activeFilters.every(([field, value]) =>
            String(member[field] ?? "").trim().toLowerCase().includes(value)
        ));
    }, [deferredFilters, membersList]);

    /*
     * 📊 THE FIGURE STRIP'S NUMBERS, COUNTED FROM THE REGISTER THIS PAGE ALREADY HOLDS.
     *
     * 🔑 NOT FETCHED, AND THAT IS THE DECISION. A `/api/members/summary` endpoint would be
     * one more thing to fail, one more empty state, and -- worse -- a number that can
     * DISAGREE with the rows underneath it. A strip reading "1 902 active" over a register
     * showing something else is a screen nobody can trust twice, and it is the failure mode
     * the register would take longest to notice.
     *
     * ⚠️ COUNTED OVER `membersList`, NOT `filteredMembers`. The strip is a statement about
     * the REGISTER, not about the current search: totals that move as you type are a
     * different instrument, and the contract calls this the "register summary".
     */
    /*
     * How many of the COLLAPSED criteria are actually filtering.
     *
     * 🔴 WITHOUT THIS THE DISCLOSURE IS A TRAP. Type a surname, collapse the panel, and the
     * register goes on showing a filtered list with nothing on screen to say why -- which is
     * the same class of defect as a failed fetch rendering as an empty state: the user reads
     * a consequence as a fact. The count on the control is what makes a hidden criterion
     * visible.
     */
    const activeExtraCriteria = useMemo(() => {
        const shown = new Set(["bankName", "branch", "status"]);
        return Object.entries(filters).filter(
            ([key, value]) => !shown.has(key) && String(value ?? "").trim() !== "",
        ).length;
    }, [filters]);

    const registerFigures = useMemo(() => {
        const by = (status) => membersList.filter((m) => m?.status === status).length;
        return {
            total: membersList.length,
            active: by("Active"),
            pending: by("Pending"),
            suspended: by("Suspended"),
        };
    }, [membersList]);

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
    /**
     * The register's columns. R-RESP-K: every column declares what it is worth, so a phone
     * shows three real columns and puts the rest in the row's detail panel instead of
     * crushing nine into 390px.
     *
     * 🔴 THE ROW IS NOT CLICKABLE ANY MORE, AND THAT WAS A REAL DEFECT. It was
     * `<tr onClick>` — no tab stop, no accessible name, no Enter, so the only way to open a
     * member record was a mouse. `Table` offers no `onRowClick` at all, deliberately, so
     * the action is a real `<button>` in the row: the membership number itself, which is
     * the thing a user is looking at when they decide to open it.
     */
    const columns = useMemo(() => [
        {
            key: "membershipNumber",
            header: "Membership No",
            priority: "essential",
            cell: (member) => {
                const number = member.membershipNumber || "-";
                const who = [member.title, member.initials, member.surname].filter(Boolean).join(" ");
                return (
                    <button
                        type="button"
                        onClick={() => setSelectedMember(member)}
                        // The number alone is not a name a screen-reader user can act on:
                        // "1002" says nothing about what pressing it does, and every row
                        // has one.
                        //
                        // ⚠️ `aria-label` RATHER THAN A VISUALLY-HIDDEN SPAN, and the
                        // difference is not cosmetic. A hidden span is real text content,
                        // so the member's surname then appears TWICE in the row -- once in
                        // the name column and once inside this button -- and every
                        // `getByText(surname)` in the suite starts finding two nodes. It
                        // begins as a test annoyance and ends as a page where "find the
                        // name" is ambiguous. `aria-label` is not text content.
                        //
                        // It OPENS with the visible number, which WCAG 2.5.3 requires: an
                        // accessible name that does not contain the visible label breaks
                        // speech control ("press 1002").
                        aria-label={who ? `${number} — open the record for ${who}` : `${number} — open this member's record`}
                        className="touch-target rounded-sm font-semibold text-brand-ink underline-offset-2 hover-hover:hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
                    >
                        {number}
                    </button>
                );
            },
        },
        { key: "employeeNumber", header: "Employee No", priority: "secondary", cell: (m) => m.employeeNumber || "-" },
        {
            key: "fullName",
            header: "Full Names & Surname",
            priority: "essential",
            // R-RESP-I: `truncate` is safe ONLY because Table puts the full value in the
            // detail panel and in the cell's `title`. A truncated name with no way to read
            // it is a register that cannot do its job.
            truncate: true,
            cell: (m) => [m.title, m.initials, m.surname].filter(Boolean).join(" ") || "-",
        },
        { key: "bankName", header: "Bank Institution", priority: "secondary", cell: (m) => m.bankName || "-" },
        { key: "branch", header: "Branch Location", priority: "secondary", cell: (m) => m.branch || "-" },
        {
            key: "status",
            header: "Status",
            priority: "essential",
            cell: (member) => <StatusChip status={member.status} />,
        },
    ], []);

    return (
        /* 📐 THE THIRD COLUMN. directionContract.md -> Density and layout: "three
           columns -- the rail (256px), the register, the record panel". The rail is the
           shell's; these two are the page's. Below `xl` the panel becomes an overlay and
           this collapses to one column, which is the same rule stated once here rather than
           at every child. */
        <div className="flex min-h-0 items-start text-ink">
            <div className="min-w-0 flex-1 p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <PageTitle
                    title="Members"
                    subtitle="The membership register across every bank. Select a member to open their card."
                    align="left"
                />
                <div className="flex items-center gap-2">
                    <Button variant="primary" onClick={() => navigate("/members/capture")}>
                        <LucideUserRoundPlus size={16} strokeWidth={2} aria-hidden="true" /> Capture Member
                    </Button>
                </div>
            </div>

            {/* 📊 THE RULED FIGURE STRIP -- "ledger line, not tiles", and the contract
                refuses the alternative by name ("hero-metric tiles, dashboards of same-size
                cards"). Counted from the register the page already holds, so it can never
                disagree with the rows below it. */}
            <FigureStrip className="mt-5" {...registerFigures} />

            <div className="mt-5 rounded-card border border-line bg-surface p-5 shadow-(--shadow-1)">
                {/* 🔍 THE CRITERIA ROW. The mock prints three labelled fields and hides the
                    rest behind "More criteria"; this page had FIFTEEN in a grid, which is a
                    search form rather than a register's criteria. The other twelve are all
                    still here, one disclosure away -- nothing was removed. */}
                <div className="flex flex-wrap items-end gap-4">
                    <SearchableSelect
                        className="min-w-[190px] flex-1"
                        label="Bank"
                        value={filters.bankName}
                        onChange={handleInputChange("bankName")}
                        placeholder="All banks"
                        options={[{ value: '', label: 'All banks' }, ...bankOptions.map(b => ({ value: b, label: b }))]}
                    />
                    <TextInput
                        className="min-w-[190px] flex-1"
                        label="Branch"
                        value={filters.branch}
                        onChange={handleInputChange("branch")}
                        placeholder="Any"
                    />
                    <SearchableSelect
                        className="min-w-[190px] flex-1"
                        label="Status"
                        value={filters.status}
                        onChange={handleInputChange("status")}
                        placeholder="Any"
                        options={[{ value: "", label: "Any" }, ...statusOptions.map(o => ({ value: o, label: o }))]}
                    />
                    <Button
                        onClick={() => setMoreCriteria((open) => !open)}
                        aria-expanded={moreCriteria}
                        aria-controls="more-criteria"
                    >
                        <SlidersHorizontal size={16} aria-hidden="true" />
                        More criteria
                        {activeExtraCriteria > 0 && (
                            <span className="ml-1 rounded-full bg-brand-soft px-1.5 text-xs font-semibold text-brand-ink tabular-nums">
                                {activeExtraCriteria}
                            </span>
                        )}
                    </Button>
                    <Button variant="ghost" onClick={handleClear}>Clear</Button>
                </div>

                {/* ⚠️ THE OTHER TWELVE ARE ALL STILL HERE. The mock shows three criteria and a
                    "More criteria" control; it does not show a register with twelve fewer
                    ways to search it. Collapsing is a change to what is on screen at rest,
                    never to what the register can do -- and the count on the control above is
                    what stops a collapsed criterion filtering the list invisibly. */}
                <div
                    id="more-criteria"
                    hidden={!moreCriteria}
                    className="mt-4 grid grid-cols-1 items-end gap-4 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <SearchableSelect label="Title" value={filters.title} onChange={handleInputChange("title")} placeholder="All Titles" options={[{ value: "", label: "All Titles" }, ...titleOptions.map(o => ({ value: o, label: o }))]} />
                    <TextInput label="Employee Number" kind="identifier" value={filters.employeeNumber} onChange={handleInputChange("employeeNumber")} placeholder="Search by employee number" />
                    <TextInput label="Membership Number" kind="identifier" value={filters.membershipNumber} onChange={handleInputChange("membershipNumber")} placeholder="Search by membership number" />
                    <TextInput label="Initials" value={filters.initials} onChange={handleInputChange("initials")} placeholder="Search by initials" />
                    <TextInput label="Surname" kind="name" value={filters.surname} onChange={handleInputChange("surname")} placeholder="Search by surname" />
                    {/* 🔴 A28, CLOSED. This was a bare <select> under a <span>Identity Type</span>
                        — a span is not a label, so nothing associated the two and a
                        screen-reader user reached a dropdown announced only as "combo box",
                        with no way to know what it filtered. axe rated it CRITICAL, it was
                        the only violation the Members list had, and every neighbouring
                        filter was already a primitive. `SelectInput` carries the real
                        <label htmlFor>. The pin in `a11y.test.jsx` is flipped in this same
                        commit — never repaired. */}
                    <SelectInput
                        label="Identity Type"
                        value={filters.identityType}
                        onChange={handleInputChange("identityType")}
                        placeholder="All Types"
                        options={[{ value: "", label: "All Types" }, ...idTypeOptions.map(o => ({ value: o, label: o }))]}
                    />
                    <TextInput label="Identity Number" kind="identifier" value={filters.identityNumber} onChange={handleInputChange("identityNumber")} placeholder="Search by identity number" />
                    <TextInput label="Bank Account Number" kind="identifier" value={filters.bankAccountNumber} onChange={handleInputChange("bankAccountNumber")} placeholder="Search by bank account number" />
                    <TextInput label="Cellphone Number" kind="tel" value={filters.phone} onChange={handleInputChange("phone")} placeholder="Search by cellphone number" />
                    <TextInput label="Personal Email" kind="email" value={filters.personalEmail} onChange={handleInputChange("personalEmail")} placeholder="Search by personal email" />
                    <TextInput label="Work Email" kind="email" value={filters.workEmail} onChange={handleInputChange("workEmail")} placeholder="Search by work email" />
                    <SearchableSelect label="Race" value={filters.race || ""} onChange={handleInputChange("race")} placeholder="All Races" options={[{ value: "", label: "All Races" }, ...raceOptions.map(o => ({ value: o, label: o }))]} />
                </div>

                {/* 🔴 A27, CLOSED. `Table` renders loading, error and empty as three separate
                    branches, and `error` NEVER renders as `empty` — which is the whole
                    defect: a backend that is down used to say "No Sasbo members match the
                    specified query definitions", and an administrator reads that as a fact
                    about the union. The retry re-runs the same fetch the mount effect does. */}
                {/* ✅ THE FOURTH STATE (EH-D9). The register below has its own error state and
                    its own retry; this is about the two lists that fill the EDIT panel. A
                    missing bank list must not blank a register that loaded perfectly well,
                    and it must not be silent either -- an administrator who opens the edit
                    panel and finds no banks would otherwise conclude there are none. */}
                {(refs.state === 'partial' || refs.state === 'error') && (
                    <div className="mt-6 rounded-lg border border-line bg-surface-2 p-3">
                        <DataState
                            state={refs.state === 'error' ? 'error' : 'partial'}
                            compact
                            onRetry={refs.retry}
                            title="Some option lists are missing."
                            message={`${refs.failed.join(' and ')} did not load, so the edit panel cannot offer them. The register below is up to date.`}
                        />
                    </div>
                )}

                <div className="mt-6">
                    <Table
                        caption="Sasbo members matching the current search"
                        columns={columns}
                        rows={visibleMembers}
                        rowKey="id"
                        loading={listState === "loading"}
                        error={listState === "error" ? "We could not load the member register." : null}
                        onRetry={loadMembers}
                        emptyTitle="No Sasbo members match the specified query definitions."
                        emptyMessage="Try widening or clearing the filters above."
                    />
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm no-print">
                    <div className="flex items-center gap-2 text-ink-muted font-medium">
                        Showing {filteredMembers.length === 0 ? 0 : startIndex + 1}-{endIndex} of {filteredMembers.length} members
                        {filteredMembers.length > 0 && (
                            <Button size="icon" variant="ghost" onClick={() => window.print()} aria-label="Print these results">
                                <Printer size={16} aria-hidden="true" />
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="pagination" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                        <span className="text-ink-muted text-sm font-semibold">Page {page} of {totalPages}</span>
                        <Button variant="pagination" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                        <Button onClick={handleClear}>Clear</Button>
                    </div>
                </div>
            </div>

            {/* 🔴 `03.4`: was a bare `fixed inset-0` div with `aria-modal="true"` ASSERTED
                rather than implemented -- no portal, no focus trap, no Escape, and a
                `<div onClick>` backdrop only a mouse could dismiss. It also capped at
                `max-h-[90vh]`, a `vh` value (conventions §6). `Modal` supplies all of it. */}
            {/* ⚠️ STILL GUARDED BY `selectedMember &&`, and that is not belt-and-braces.
                JSX children are CONSTRUCTED whether or not the dialog renders them, so the
                body's `selectedMember.address` runs on every render of this page. Passing
                `open={Boolean(selectedMember)}` alone threw
                `Cannot read properties of null (reading 'address')` the moment the page
                mounted -- caught by the route smoke, not by reading. */}
            {/* ✅ THE RECORD IS A DOCKED PANEL, NOT A MODAL.
                directionContract.md refuses "a modal for tasks that need neither
                interruption nor protected focus: the record edits in place", and this is the
                surface it names. `03.4` had routed it through the shared Modal with the
                other seven overlays -- correct for those, wrong for this one, because that
                unit was scoped by "things that are dialogs today" rather than by "things the
                design says should be dialogs".

                ⚠️ STILL GUARDED BY `selectedMember &&`, and that is not belt-and-braces:
                JSX children are CONSTRUCTED whether or not they render, so the body's
                `selectedMember.address` runs on every render of this page. Passing only
                `open={Boolean(selectedMember)}` threw `Cannot read properties of null` the
                moment the page mounted -- caught by the route smoke, not by reading. */}
            </div>

            <MemberPanel
                member={selectedMember}
                open={Boolean(selectedMember)}
                onClose={() => setSelectedMember(null)}
                arriving={Boolean(selectedMember)}
                footer={
                    isEditing ? (
                        <>
                            <Button onClick={handleEditToggle}>Cancel</Button>
                            <Button variant="primary" onClick={handleSaveChanges}>Save Changes</Button>
                        </>
                    ) : (
                        <>
                            <Button onClick={() => setSelectedMember(null)}>Close</Button>
                            {/* 🗣️ PRINT IS LIVE (the owner, 2026-09-09) and the member record is
                                the first thing to get a real print layout: `print.css` hides
                                the shell, the dialog chrome and every control, drops the
                                record to a single column, and forces the light theme so a
                                dark-mode user does not print a black page. */}
                            <Button onClick={() => window.print()}>
                                <Printer size={16} aria-hidden="true" /> Print
                            </Button>
                            <Button variant="primary" onClick={handleEditToggle}>Edit Member</Button>
                        </>
                    )
                }
            >
                {/* ⚠️ THE `selectedMember &&` GUARD IS LOAD-BEARING AND I REMOVED IT ONCE.
                    JSX children are CONSTRUCTED whether or not the parent renders them, so
                    the body's `selectedMember.address` runs on every render of this page.
                    Swapping the Modal for the panel dropped this guard, and the register
                    went to the error boundary with `Cannot read properties of null (reading
                    'address')` the moment it mounted -- the same failure the Modal's own
                    comment recorded, reintroduced by the commit that removed the Modal. */}
                {selectedMember && (
                    <div className="relative member-record">
                        {showSavedNotification && (
                            <div role="status" className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-status-active-bg text-status-active border border-status-active-dot rounded-lg shadow-(--shadow-2) no-print">
                                <CheckCircle2 size={18} aria-hidden="true" />
                                <span className="text-sm font-medium">Changes saved successfully!</span>
                            </div>
                        )}

                        {/* THE ERROR SUMMARY that replaced three `alert()` calls. Focused
                            rather than `role="alert"`: `Field` already gives every inline
                            message that role, so a form failing four validations would
                            queue five announcements at once. F-P23. */}
                        {saveNotice && (
                            <div
                                ref={errorSummaryRef}
                                tabIndex={-1}
                                aria-labelledby="member-save-notice-title"
                                className={`mb-4 rounded-lg border p-3 text-sm no-print focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring ${
                                    saveNotice.kind === "unchanged"
                                        ? "border-line-strong bg-surface-2 text-ink-muted"
                                        : "border-status-suspended-dot bg-status-suspended-bg text-status-suspended"
                                }`}
                            >
                                <p id="member-save-notice-title" className="flex items-center gap-2 font-medium">
                                    <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                                    {saveNotice.kind === "invalid"
                                        ? "Fix these before saving"
                                        : saveNotice.kind === "unchanged"
                                            ? "Nothing to save"
                                            : "The changes were not saved"}
                                </p>
                                <ul className="mt-1 list-disc pl-6">
                                    {saveNotice.messages.map((message) => <li key={message}>{message}</li>)}
                                </ul>
                            </div>
                        )}

                        <div className="flex items-start justify-between gap-4 pb-4">
                            <div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-base font-bold text-ink">
                                    <span>{`${editForm.title ? editForm.title + " " : ""}${[editForm.initials, editForm.surname].filter(Boolean).join(" ") || "-"}`}</span>
                                    <span aria-hidden="true" className="text-ink-faint">•</span>
                                    <span className="text-ink-muted text-sm font-semibold">{editForm.membershipNumber || "No Account ID"}</span>
                                    <span aria-hidden="true" className="text-ink-faint">•</span>
                                    <StatusChip status={editForm.status} />
                                </div>
                            </div>
                        </div>

                        {/* 📱 A SCROLLABLE STRIP. Five sections at 390px do not fit; before
                            this they wrapped into two crushed rows.

                            ⚠️ NOT `role="tab"`, AND THAT IS DELIBERATE. It looks like a tab
                            strip and the first draft said so — but the ARIA tabs pattern is
                            a CONTRACT: arrow keys move between tabs, one tab stop covers the
                            set, and each tab owns a `tabpanel`. Declaring the role without
                            implementing the keyboard behaviour tells a screen-reader user
                            "tab 3 of 5" and then does nothing when they press the arrow key,
                            which is worse than a plain group of buttons — those simply work.
                            `aria-current` says which section is showing without promising
                            anything that is not here.

                            ⏳ The full pattern needs roving focus, and a shared
                            `useRovingFocus` is already on RF's list precisely because this
                            application has three places that want it. `05.3` (keyboard and
                            focus) is where it lands. */}
                        <div className="border-b border-line no-print">
                            <div className="flex -mb-px overflow-x-auto whitespace-nowrap">
                                {TABS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        aria-current={activeTab === tab.id ? "true" : undefined}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`touch-target mr-4 inline-flex items-center gap-1 p-4 border-b-2 font-bold text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring ${activeTab === tab.id ? "border-brand text-brand-ink" : "border-transparent text-ink-muted hover-hover:hover:text-ink"}`}
                                    >
                                        <span>{tab.label}</span>
                                        {isEditing && tabsWithErrors.has(tab.id) && (
                                            <>
                                                <span aria-hidden="true" className="text-status-suspended font-extrabold text-sm">*</span>
                                                {/* The asterisk was the only signal, and it is
                                                    invisible to a screen reader and to anyone
                                                    who cannot distinguish the colour. */}
                                                <span className="sr-only">(has errors)</span>
                                            </>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="text-sm">
                            {activeTab === "personal" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-surface p-6 rounded-lg border border-line">
                                    <Detail label="Title" value={editForm.title} isEditing={isEditing} options={titleOptions} onChange={handleEditChange("title")} />
                                    <Detail label="Initials" value={editForm.initials} isEditing={isEditing} onChange={handleEditChange("initials")} />
                                    <Detail label="First Name(s)" value={editForm.firstNames} isEditing={isEditing} onChange={handleEditChange("firstNames")} error={fieldErrors.firstNames} required kind="name" />
                                    <Detail label="Surname" value={editForm.surname} isEditing={isEditing} onChange={handleEditChange("surname")} error={fieldErrors.surname} required kind="name" />
                                    <Detail label="Identity Type" value={editForm.identityType} isEditing={isEditing} options={idTypeOptions} onChange={handleEditChange("identityType")} error={fieldErrors.identityType} required />
                                    <Detail
                                        label={editForm.identityType || "Identity Number"}
                                        value={editForm.identityNumber}
                                        isEditing={isEditing}
                                        onChange={handleEditChange("identityNumber")}
                                        error={fieldErrors.identityNumber}
                                        disabled={!editForm.identityType}
                                        kind="identifier"
                                        required
                                    />
                                    {/* 🔴 `04.2`: was a native <input type="date"> reached through
                                        `Detail`'s `type` prop -- one of the three the P3 box
                                        could not close, because BR-10 owned this file until
                                        now. The I.D.-derived case stays read-only text: it is
                                        computed from the identity number, not typed. */}
                                    {editForm.identityType === "I.D. Number" ? (
                                        <Detail label="Date of Birth" value={formatDate(editForm.dateOfBirth)} isEditing={isEditing} disabled onChange={handleEditChange("dateOfBirth")} />
                                    ) : isEditing ? (
                                        <DateField
                                            label="Date of Birth"
                                            value={editForm.dateOfBirth || ""}
                                            required={editForm.identityType === "Passport"}
                                            error={fieldErrors.dateOfBirth || undefined}
                                            max="today"
                                            onChange={(e) => setEditForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                                        />
                                    ) : (
                                        <Detail label="Date of Birth" value={editForm.dateOfBirth} isEditing={false} />
                                    )}
                                    <Detail label="Gender" value={editForm.gender} isEditing={isEditing} options={editForm.identityType === "I.D. Number" ? null : genderOptions} onChange={handleEditChange("gender")} disabled={editForm.identityType === "I.D. Number"} />
                                    <Detail label="Race" value={editForm.race} isEditing={isEditing} options={raceOptions} onChange={handleEditChange("race")} />
                                    <Detail label="Cellphone Number" value={editForm.phone} isEditing={isEditing} onChange={handleEditChange("phone")} kind="tel" />
                                    <Detail label="Work Tel" value={editForm.workTel} isEditing={isEditing} onChange={handleEditChange("workTel")} kind="tel" />
                                    <Detail label="Home Tel" value={editForm.homeTel} isEditing={isEditing} onChange={handleEditChange("homeTel")} kind="tel" />
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-surface p-6 rounded-lg border border-line">
                                    <Detail label="Employee Number" value={editForm.employeeNumber} isEditing={isEditing} onChange={handleEditChange("employeeNumber")} kind="identifier" />
                                    <Detail label="Bank Where Employed" value={editForm.bankName} isEditing={isEditing} options={bankOptions} error={fieldErrors.bankName} required={editForm.paymentType === "Debit Order"} onChange={handleEditChange("bankName")} />
                                    <Detail label="Employment Type" value={editForm.employmentType} isEditing={isEditing} options={EMPLOYMENT_TYPE_OPTIONS} onChange={handleEditChange("employmentType")} />
                                    <Detail label="Job Grade" value={editForm.jobGrade} isEditing={isEditing} options={jobGrade} onChange={handleEditChange("jobGrade")} disabled={!editForm.bankName} loadError={jobGradeError} onRetryLoad={() => setJobGradeAttempt((n) => n + 1)} />
                                    <Detail label="Bank Branch" value={editForm.branch} isEditing={isEditing} options={branchOptions} error={fieldErrors.branch} required={editForm.paymentType === "Debit Order"} onChange={handleEditChange("branch")} />
                                    <Detail label="Payment Type" value={editForm.paymentType} isEditing={isEditing} options={paymentTypeOptions} onChange={handleEditChange("paymentType")} />

                                    {editForm.paymentType === "Debit Order" && (
                                        <>
                                            <Detail label="Bank Account Number" value={editForm.bankAccountNumber} isEditing={isEditing} error={fieldErrors.bankAccountNumber} required onChange={handleEditChange("bankAccountNumber")} kind="identifier" />
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
                                    <Detail label="IBT No." value={editForm.ibtNo} isEditing={isEditing} onChange={handleEditChange("ibtNo")} kind="identifier" />
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-surface p-6 rounded-lg border border-line">
                                    <Detail label="Date Joined Sasbo" value={formatBackendDate(selectedMember.joinDate)} isEditing={false} />
                                    <Detail label="Account Membership Status" value={editForm.status} isEditing={isEditing} options={statusOptions} onChange={handleEditChange("status")} />
                                    <div className="md:col-span-2 border-t border-line pt-3 font-semibold text-brand-ink">Sasbo Subscription Fee Details</div>
                                    <Detail label="Monthly Subscription (ZAR)" value={selectedMember.monthlySubscription || "182.77"} isEditing={false} />
                                    <Detail label="Billing Frequency" value={selectedMember.subscriptionFrequency || "Monthly"} isEditing={false} />
                                </div>
                            )}

                            {activeTab === "representatives" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-surface p-6 rounded-lg border border-line">
                                    <Detail label="Assigned Lead Recruiter" value={editForm.recruitmentRepresentativeName} isEditing={isEditing} options={roles.map(r => r.name)} onChange={handleEditChange("recruitmentRepresentativeName")} />
                                    <Detail label="Regional Area Representative" value={editForm.areasRep} isEditing={isEditing} options={roles.map(r => r.name)} onChange={handleEditChange("areasRep")} />
                                </div>
                            )}

                            {activeTab === "structures" && (
                                <div className="space-y-6 bg-surface p-6 rounded-lg border border-line">
                                    <div className="pb-4 border-b border-line">
                                        <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink">SASBO Structural Configuration Matrix</h3>
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
                                                        {/* 🔴 `03.3`: was a native <input type="date"> with a <label> that named
                                                            no control -- the label had no htmlFor, so a screen reader reached an
                                                            unnamed date box. DateField carries its own real label. */}
                                                        <DateField
                                                            label="Shop Steward Election Date"
                                                            required
                                                            value={editForm.shopStewardElectionDate || ""}
                                                            error={fieldErrors.shopStewardElectionDate || undefined}
                                                            max="today"
                                                            hint="ago"
                                                            onChange={(e) => setEditForm(prev => ({ ...prev, shopStewardElectionDate: e.target.value }))}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="border-t border-line pt-4">
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
                                                <div className="pl-4 border-l-2 border-brand space-y-6 mt-4 animate-slideDown">
                                                    {/* 🔴 THE COMMITTEE SELECT HAD NO ACCESSIBLE NAME EITHER — the
                                                        same defect as A28, one dialog over, and invisible to the
                                                        a11y gate because that scans the LIST page. The <label> above
                                                        it carried no `htmlFor`. `Field` hands down a real id without
                                                        forcing the control to be an <input>, which is what lets the
                                                        44 committees keep their <optgroup> grouping by region —
                                                        genuinely useful at this length, and something no listbox
                                                        primitive here offers. */}
                                                    <Field label="Select BEC Committee (Single Selection — 44 Available)" required error={fieldErrors.becCommitteeId}>
                                                        {({ id, describedBy, invalid }) => (
                                                            <select
                                                                id={id}
                                                                aria-invalid={invalid}
                                                                aria-describedby={describedBy}
                                                                value={editForm.becCommitteeId || ""}
                                                                className={controlClasses({ invalid, className: "touch-target" })}
                                                                onChange={(e) => {
                                                                    const selectedId = e.target.value;
                                                                    const foundBranch = SASBO_BEC_BRANCHES.find(b => b.id === selectedId);
                                                                    setEditForm(prev => ({ ...prev, becCommitteeId: selectedId, becCommitteeName: foundBranch ? foundBranch.name : "" }));
                                                                }}
                                                            >
                                                                <option value="">Select Committee...</option>
                                                                {Object.entries(SASBO_BEC_BRANCHES.reduce((acc, branch) => {
                                                                    (acc[branch.region] = acc[branch.region] || []).push(branch);
                                                                    return acc;
                                                                }, {})).map(([regionName, branchesInRegion]) => (
                                                                    <optgroup key={regionName} label={regionName.toUpperCase()}>
                                                                        {branchesInRegion.map(b => (
                                                                            <option key={b.id} value={b.id}>{b.name}</option>
                                                                        ))}
                                                                    </optgroup>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </Field>

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
                                                            <CheckboxGroup
                                                                legend="BEC structures represented"
                                                                options={["INC / IC", "NCF / SJC", "Vice President (VP)", "President", "MANCOM", "Resolutions Committee"]}
                                                                selected={editForm.becStructures || []}
                                                                onToggle={(next) => setEditForm(prev => ({ ...prev, becStructures: next }))}
                                                            />
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
                                                </div>
                                            )}

                                            {/* 🔴 N5 / BR-15 — COSATU IS OUT FROM UNDER `isBec`, AND THAT IS A DATA
                                                MODEL FIX, NOT A LAYOUT ONE.
                                                `07cd8ec` nested this whole block inside `editForm.isBec &&` while
                                                leaving it ungated in `CaptureMember.jsx`, so the same member could
                                                be captured as COSATU and then have it disappear from their record
                                                the moment they were not a BEC member. `V19` models COSATU as
                                                PARALLEL to BEC, and a stakeholder confirmed via the owner on
                                                2026-09-09 that "everyone is a member and linked up with Area,
                                                Region and all other elements" — no eligibility gate. Two
                                                independent sources, so the nesting is the defect.
                                                🟡 What is still open is narrower and blocks nothing: whether a
                                                member's COSATU Local/Region is the SAME Area/Region already held
                                                against them (a lookup) or COSATU's own structure (free text, as
                                                below). BR-15. */}
                                            <div className="border-t border-line pt-4">
                                                <Detail label="COSATU Member?" value={editForm.isCosatu === "Y" || editForm.isCosatu === true ? "Yes" : "No"} isEditing={true} options={["Yes", "No"]} onChange={(e) => {
                                                    const isYes = e.target.value === "Yes";
                                                    setEditForm(prev => ({
                                                        ...prev,
                                                        isCosatu: isYes ? "Y" : "N",
                                                        ...(!isYes ? { cosatuLocal: "", cosatuRegion: "", cosatuPositions: [] } : {})
                                                    }));
                                                }} />
                                                {(editForm.isCosatu === "Y" || editForm.isCosatu === true) && (
                                                    <div className="mt-4 pl-4 border-l-2 border-accent space-y-4 animate-slideDown">
                                                        <p className="text-xs font-bold uppercase tracking-wide text-accent-ink">COSATU structure</p>
                                                        {/* 🔴 BR-14 — THE TWO UNLABELLED CHECKBOXES ARE GONE, replaced
                                                            by the two labelled free-text fields `V19` actually
                                                            describes. What was here rendered `<label>` elements with
                                                            a checkbox and NO TEXT AT ALL: an empty accessible name,
                                                            two of them, side by side, so a screen-reader user met two
                                                            anonymous checkboxes and a sighted user met two bare
                                                            boxes. They also wrote "COSATU Local" and "Region within
                                                            Local" into `cosatuPositions`, the POSITIONS array —
                                                            structure recorded as though it were a role. The
                                                            `cosatuPositions` wire shape agreed with the Capture
                                                            Member arc is positions only. */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <Detail label="COSATU Local" value={editForm.cosatuLocal || ""} isEditing={true} onChange={(e) => setEditForm(prev => ({ ...prev, cosatuLocal: e.target.value }))} />
                                                            <Detail label="Region within Local" value={editForm.cosatuRegion || ""} isEditing={true} onChange={(e) => setEditForm(prev => ({ ...prev, cosatuRegion: e.target.value }))} />
                                                        </div>
                                                        <CheckboxGroup
                                                            legend="COSATU Positions — Multiple Allowed"
                                                            options={["PEC", "CEC", "Treasurer", "Chairperson", "Secretary"]}
                                                            labelFor={(pos) =>
                                                                pos === "PEC" ? "PEC (Provincial Executive Committee)" :
                                                                pos === "CEC" ? "CEC (Central Executive Committee)" : pos}
                                                            selected={editForm.cosatuPositions || []}
                                                            onToggle={(next) => setEditForm(prev => ({ ...prev, cosatuPositions: next }))}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Core Appointments</h4>
                                                <Detail label="Shop Steward status" value={selectedMember.isShopSteward ? "Yes" : "No"} isEditing={false} />
                                                {selectedMember.isShopSteward && <Detail label="Election Date" value={selectedMember.shopStewardElectionDate || "-"} isEditing={false} />}
                                                <Detail label="BEC Member status" value={selectedMember.isBec ? "Yes" : "No"} isEditing={false} />
                                                {selectedMember.isBec && <Detail label="Assigned BEC Committee" value={SASBO_BEC_BRANCHES.find(b => b.id === selectedMember.becCommitteeId)?.name || selectedMember.becCommitteeName || "-"} isEditing={false} />}
                                            </div>
                                            <div className="space-y-3 pt-4 md:pt-0">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Specialized Assignments</h4>
                                                {selectedMember.isBec && (
                                                    <>
                                                        <Detail label="BEC Recruiter" value={selectedMember.isBecRecruiter ? `Yes (${selectedMember.becRecruiterRole || 'Standard'})` : "No"} isEditing={false} />
                                                        <Detail label="Structure Representative Roles" value={selectedMember.isBecStructureRep && selectedMember.becStructures?.length > 0 ? selectedMember.becStructures.join(", ") : "None Assigned"} isEditing={false} />
                                                        <Detail label="BEC Executive Position" value={selectedMember.isBecExecutive ? selectedMember.becExecutivePosition : "None"} isEditing={false} />
                                                    </>
                                                )}

                                                {/* Read side, un-nested to match the edit side. Before this it sat
                                                    inside `selectedMember.isBec &&`, so a COSATU member who was not
                                                    BEC had their COSATU record simply not shown. */}
                                                <div className="pt-3 mt-3 border-t border-line">
                                                    <h5 className="text-xs font-bold uppercase tracking-wider text-accent-ink mb-2">COSATU Structure</h5>
                                                    <Detail label="COSATU Member" value={selectedMember.isCosatu === "Y" || selectedMember.isCosatu === true ? "Yes" : "No"} isEditing={false} />
                                                    {(selectedMember.isCosatu === "Y" || selectedMember.isCosatu === true) && (
                                                        <div className="grid grid-cols-1 gap-3 mt-2">
                                                            <Detail label="COSATU Local" value={selectedMember.cosatuLocal || "-"} isEditing={false} />
                                                            <Detail label="Region within Local" value={selectedMember.cosatuRegion || "-"} isEditing={false} />
                                                            <Detail label="Positions Held" value={selectedMember.cosatuPositions?.length > 0 ? selectedMember.cosatuPositions.join(", ") : "None"} isEditing={false} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </MemberPanel>

            <ConfirmDialog
                open={Boolean(pendingSave)}
                onOpenChange={closeOn(() => setPendingSave(null))}
                title="Save these changes?"
                confirmLabel="Save changes"
                cancelLabel="Keep editing"
                destructive={false}
                onConfirm={commitSave}
            >
                {/* 🔑 The changes are a LIST now, not a string of bullets concatenated into
                    a browser dialog. A long list scrolls inside the modal body rather than
                    running off the bottom of an unscrollable native alert.
                    (`getChangedFields` emits plain `Label: a → b` strings — the leading-bullet
                    strip this used to carry removed nothing, so it is gone.) */}
                <ul className="space-y-1 text-sm text-ink">
                    {(pendingSave ?? []).map((change) => (
                        <li key={change} className="flex gap-2">
                            <span aria-hidden="true" className="text-ink-faint">•</span>
                            <span>{change}</span>
                        </li>
                    ))}
                </ul>
            </ConfirmDialog>
        </div>
    );
}

/**
 * One field of a member record — a value when reading, a control when editing.
 *
 * 🔴 IT WAS A FIFTH ANSWER TO "WHAT WRAPS A FORM CONTROL" (BR-4 counted four). It built its
 * own id from the label text — `detail-${label.toLowerCase().replace(/\s+/g, "-")}` — which
 * collides the moment two fields share a label, and this dialog renders "COSATU Local" in
 * two tabs. It also hand-rolled the border, the focus ring and the error colour, restating
 * decisions the token layer already owns.
 *
 * It now delegates to the primitives: `SelectInput` when there are options, `TextInput`
 * when there are not, and a definition-list entry when reading. `useId` inside `Field`
 * makes the collision impossible rather than unlikely.
 */
function Detail({ label, value, isEditing, onChange, className = "", options = null, kind = "text", error = null, disabled = false, required = false, loadError = null, onRetryLoad }) {
    if (!isEditing) {
        return (
            <div className={className}>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
                <p className="mt-0.5 rounded-lg border border-line bg-surface-2 p-2 text-sm font-semibold text-ink">{value || "-"}</p>
            </div>
        );
    }

    /*
     * 🔑 `loadError` IS NOT `error`. `error` says the VALUE is wrong and the user can fix
     * it by typing; `loadError` says the CHOICES never arrived, which no amount of typing
     * repairs. Rendering the second as the first blames an administrator for a backend being
     * down and offers them nothing to do about it -- so the failure gets its own compact
     * state, with the retry that EH-D4 requires of every error state that can honestly offer
     * one. (`Detail` is the read/edit twin of `CaptureMember`'s `Field`; the prop pair is
     * deliberately named the same on both.)
     */
    if (loadError) {
        return (
            <div className={cn("flex flex-col gap-1", className)}>
                <SelectInput
                    label={label}
                    value={value}
                    onChange={(next) => onChange?.({ target: { value: next } })}
                    options={[]}
                    disabled
                    required={required}
                    placeholder="Unavailable"
                    emptyLabel="Unavailable"
                />
                <DataState
                    state="error"
                    compact
                    error={loadError}
                    onRetry={onRetryLoad}
                    title={`${label} could not be loaded.`}
                />
            </div>
        );
    }

    if (options) {
        return (
            <SelectInput
                label={label}
                value={value}
                onChange={(next) => onChange?.({ target: { value: next } })}
                options={options}
                placeholder="Select..."
                error={error || undefined}
                disabled={disabled}
                required={required}
                className={className}
            />
        );
    }

    return (
        <TextInput
            label={label}
            value={value}
            onChange={onChange}
            kind={kind}
            error={error || undefined}
            disabled={disabled}
            required={required}
            className={className}
        />
    );
}
