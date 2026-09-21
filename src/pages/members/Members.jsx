import { useDeferredValue, useEffect, useMemo, useState, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import { useNavigate, useLocation, useOutletContext } from "react-router-dom";
import {
    LucideUserRoundPlus, AlertCircle, CircleCheck, Printer, SlidersHorizontal,
    Pencil, Check,
} from "lucide-react";
import { memberService } from "@/services/memberService.js";
import { jobGradeService } from "@/services/jobGradeService.js";
import { bankService } from "@/services/bankService.js";
import { TextInput, SearchableSelect, SelectInput, Button, DateField } from "../../components/form";
import StatusChip, { CANCELLED_STATUSES } from "../../components/common/StatusChip.jsx";
import Table from "../../components/table/Table.jsx";
import Modal,{ ConfirmDialog, closeOn } from "../../components/overlay/Modal.jsx";
import {
    TITLE_OPTIONS, RACE_OPTIONS, PAYMENT_TYPE_OPTIONS,
    STATUS_OPTIONS, IDENTITY_TYPE_OPTIONS, GENDER_OPTIONS,
    BRANCH_OPTIONS, MEMBER_FIELD_LABEL_MAP, EMPLOYMENT_TYPE_OPTIONS, IDENTITY_TYPE_PASSPORT,
    DEBIT_DAY_OPTIONS, PAYMENT_TYPE_PAYROLL, PAYMENT_TYPE_PAYROLL_LEGACY,
} from "@/config/memberConstants.js";
import {
    validateSAID, validateEmail, extractDateOfBirthFromSAID, extractGenderFromSAID
} from "@/utils/validateSAID.js";
import PageTitle from "../../components/common/PageTitle.jsx";
import AddressAutocomplete from "../../components/form/AddressAutocomplete";
import DataState from "../../components/common/DataState.jsx";
import FigureStrip from "../../components/members/FigureStrip.jsx";
import Criteria, { CRITERION } from "../../components/common/Criteria.jsx";
import Pager from "../../components/common/Pager.jsx";
import KeyHints from "../../components/common/KeyHints.jsx";
import Sheet from "../../components/common/Sheet.jsx";
import useReferenceData from "../../hooks/useReferenceData.js";
import reportError from "../../lib/reportError.js";
import { writeMayHaveLanded } from "@/services/parseApiError.js";
import { formatDate, parseDate, sameDate, today } from "@/lib/format.js";
import { sanitiseField, validateField } from "@/utils/inputRules.js";
import { branchNamesForBank } from "@/utils/bankBranches.js";
import { cn } from "@/lib/utils.js";
import { personName } from "@/lib/names.js";

import MembershipCard from "../../components/members/MembershipCard.jsx";


const PAGE_SIZE = memberService.getPageSize();

/** The job-grade list when there is no current answer: stable, so the select is not handed a new array each render. */
const NO_JOB_GRADES = [];

/*
 * 🔴 HOW LONG THE RECORD OUTLIVES THE CLICK THAT CLOSED IT. This is `--duration-panel` in
 * `index.css`, and the two are commented at both ends because nothing else keeps them in
 * step: the panel's column animates from 448px to nothing over that time, and if the record
 * is thrown away first the animation plays over an empty white box.
 */
const PANEL_MS = 380;

/** The fields the topbar's search reads -- card.js `visible()`, plus the wire's own names. */
const SEARCH_FIELDS = [
    "membershipNumber", "employeeNumber", "surname", "firstNames", "initials", "bankName",
    "branch", "status", "identityNumber", "workEmail", "personalEmail", "email", "phone",
];

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

/*
 * THE FIVE SECTIONS OF A MEMBER'S RECORD -- this panel's own list, not the capture form's.
 *
 * 🔴 IT IS SEPARATE FROM `MEMBER_TABS` ON PURPOSE. Main removed "Sasbo Structures" from the
 * capture form (client 4a7a67b) and kept it here on the record, so the two screens are meant
 * to list different sections. The design branch had briefly pointed this panel at the capture
 * constant; taking main's shorter list through it would have silently removed the Structures
 * tab from every member's record, and switched `TAB_PLACE` off with it.
 *
 * 📐 `label` is what the strip SHOWS -- short, because the docked panel is a 400px column and
 * the full phrases are 762px of tabs (the owner, 2026-09-10). `full` is the tab's accessible
 * NAME, so a screen reader and the automation suite (`openModalTab('Employment & Bank')`)
 * still address each tab by the phrase that names it. The visible word is always contained in
 * the full phrase, which is what WCAG 2.5.3 asks of a label that differs from its name.
 */
const RECORD_TABS = [
    { id: "personal", label: "Personal", full: "Personal Information" },
    { id: "employment", label: "Employment", full: "Employment & Bank" },
    { id: "membership", label: "Membership", full: "Membership & Subscriptions" },
    { id: "representatives", label: "Recruitment", full: "Recruitment Channel" },
    { id: "structures", label: "Structures", full: "Sasbo Structures" },
];
const TABS = RECORD_TABS;

/** A record field's value, or "Not on file" when the record holds none -- never an invented default. */
const notOnFile = (value) => (value === null || value === undefined || String(value).trim() === "" ? "Not on file" : value);

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
    workTel: "personal",
    homeTel: "personal",
    employeeNumber: "employment",
    ibtNo: "employment",
    employmentType: "employment",
    jobGrade: "employment",
    bankName: "employment",
    branch: "employment",
    paymentType: "employment",
    bankAccountNumber: "employment",
    debitDay: "employment"
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

/**
 * The stored value, folded onto the name the form offers.
 *
 * 🔑 THE FOLD RUNS THE OTHER WAY NOW (A6). It used to turn the server's "Payroll Deduction" into
 * the browser's "Payroll"; the browser was the one that had drifted, so the browser is what moved.
 * `PaymentType` on the server is `PAYROLL("Payroll Deduction")` and that is what the option says.
 *
 * ⚠️ The fold itself is NOT redundant and must not be deleted with the rename. `MemberDto.paymentType`
 * is a String passed through from storage, not the enum, so members captured under the old spelling
 * still arrive as "Payroll". Without this, opening such a record would show a payment type that is
 * not one of the options, and the first save would report a change the administrator never made.
 */
const normalizePaymentType = (paymentType) =>
    paymentType === PAYMENT_TYPE_PAYROLL_LEGACY ? PAYMENT_TYPE_PAYROLL : paymentType;

const getInitialFilters = (locationState) => ({
    ...EMPTY_FILTERS,
    bankName: locationState?.filters?.bankName || "",
    branch: locationState?.filters?.branch || "",
});

/*
 * 🔴 THE SAVE CONFIRMATION SPOKE IN FIELD KEYS, AND PRINTED "No" AS "-" (`06.5`, the `06.3` critique, F-P55). It
 * labelled each change from the shared `MEMBER_FIELD_LABEL_MAP`, which knows none of the record's Structures fields,
 * so an administrator was asked to confirm `isCosatu: Y → N` and `becCommitteeId: - → bec-04`. It named fields
 * differently from the form above it, printed `false` and an empty list as "-" or nothing, and reported an unchanged
 * COSATU positions list as a change, because the record holds it as "PEC,CEC" and the form as an array.
 *
 * The form's own words come first here. The shared map, which the Capture Member arc also reads, is left as it is.
 */
const RECORD_FIELD_LABELS = {
    firstNames: "First Name(s)",
    identityType: "Identity Type",
    identityNumber: "Identity Number",
    phone: "Cellphone Number",
    address: "Residential Address",
    bankName: "Bank Where Employed",
    employmentType: "Employment Type",
    branch: "Bank Branch",
    debitDay: "Debit Day",
    bankAddress: "Bank Work Address",
    status: "Account Membership Status",
    isShopSteward: "Shop Steward",
    shopStewardElectionDate: "Shop Steward Election Date",
    isBec: "BEC Member",
    becCommitteeId: "BEC Committee",
    isBecRecruiter: "BEC Recruiter",
    becRecruiterRole: "BEC Recruiter Role",
    isBecStructureRep: "BEC Structure Representative",
    becStructures: "BEC Structures Represented",
    isBecExecutive: "BEC Executive",
    becExecutivePosition: "BEC Executive Position",
    isCosatu: "COSATU Member",
    isCosatuLocal: "COSATU Local structure",
    isCosatuRegional: "COSATU Regional structure",
    cosatuLocal: "COSATU Local",
    cosatuRegion: "Region within Local",
    cosatuPositions: "COSATU Positions",
};

/** Never listed: identifiers, and a name the form derives from a field that is listed (the committee's id). */
const UNLISTED_KEYS = new Set(["id", "membershipNumber", "memberId", "becCommitteeName"]);

/**
 * A stored yes/no as a person reads it. `null` is its own answer on the read side -- Shop Steward
 * and BEC had no column until V29 (CM-05), so for every earlier member nobody ever answered.
 */
const yesNo = (flag, unanswered = "No") => (flag === true ? "Yes" : flag === false ? "No" : unanswered);

/** COSATU is stored as V19's "Y"/"N"; older records carry a boolean. */
const isCosatuMember = (member) => member?.isCosatu === "Y" || member?.isCosatu === true;

/** A value as the form holds it, for comparing: a yes/no flag as a boolean, a list as its joined text. */
const comparable = (key, value) => {
    if (key === "paymentType") return normalizePaymentType(value);
    if (/^is[A-Z]/.test(key)) return value === true || value === "Y";
    if (Array.isArray(value)) return value.join(",");
    if (value === null || value === undefined) return "";
    return value;
};

/**
 * A record date as the panel shows it (R3-F1), and the one rule the deleted `formatBackendDate` used to carry:
 * EMPTY stays empty. `formatDate` answers the em dash for a missing value and `Detail` prints its own for an empty
 * one, so calling it unguarded put a literal "—" inside a disabled edit FIELD -- which a capture caught and no test
 * did. Written once because it was written three times.
 */
const recordDate = (value) => (value ? formatDate(value) : "");

/** The record's date fields, by name. conventions §15 gives them all one shape: `yyyy/mm/dd`. */
const DATE_KEYS = new Set(["dateOfBirth", "joinDate", "electionDate"]);

/** A value as a person reads it. */
const readable = (key, value) => {
    const shown = comparable(key, value);
    if (typeof shown === "boolean") return shown ? "Yes" : "No";
    if (key === "becCommitteeId") return SASBO_BEC_BRANCHES.find((branch) => branch.id === shown)?.name ?? (shown || "—");
    if (key === "becStructures" || key === "cosatuPositions") return shown ? String(shown).split(",").join(", ") : "none";
    // R3-F1: a LocalDate arrives as [y, m, d], and `comparable` joins an array with commas -- so an untouched date
    // read "1988,6,15", and a changed one "1988,6,15 → 1988-06-15". Dates are NAMED, never sniffed: a value that
    // merely looks like one is not one, and the record holds exactly these three.
    if (DATE_KEYS.has(key)) return formatDate(value);
    return shown === "" ? "—" : String(shown);
};

const fieldLabel = (key) =>
    RECORD_FIELD_LABELS[key] || MEMBER_FIELD_LABEL_MAP[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

const getChangedFields = (draft, original) => Object.keys(draft)
    .filter((key) => !UNLISTED_KEYS.has(key))
    .filter((key) => comparable(key, draft[key]) !== comparable(key, original[key]))
    .map((key) => `${fieldLabel(key)}: ${readable(key, original[key])} → ${readable(key, draft[key])}`);


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
    banks: () => bankService.getBankNames(),
    'bank branches': () => bankService.getBankListing(),
};

/**
 * The record's save notice, by kind. `unconfirmed` and `stale` are R3-F2's: a save whose answer never arrived is not
 * "not saved", and a save that landed before the register failed to refresh is saved.
 */
const SAVE_NOTICE_TITLES = {
    invalid: "Fix these before saving",
    unchanged: "Nothing to save",
    failed: "The changes were not saved",
    unconfirmed: "The save could not be confirmed",
    stale: "The changes were saved",
};

export default function Members() {
    const navigate = useNavigate();
    const location = useLocation();
    const [filters, setFilters] = useState(() => getInitialFilters(location.state));
    const [requestedPage, setPage] = useState(1);
    const [selectedMember, setSelectedMember] = useState(null);

    /*
     * 🔴 CLOSING IS TWO THINGS, AND THEY DO NOT HAPPEN AT THE SAME MOMENT: the column starts
     * to collapse now, and the record is thrown away when it has finished. `panelClosing`
     * carries the gap. `open` is the column's business, `selectedMember` is the record's, and
     * `MemberPanel` renders its body off the record rather than off `open` for this reason.
     *
     * ⚠️ CHOOSING ANOTHER MEMBER MID-CLOSE MUST CANCEL THE PENDING CLEAR, or the timer lands
     * a few hundred milliseconds later and throws away the member you just picked -- which is
     * exactly the shape of bug a delayed teardown introduces if nobody owns it.
     */
    const [panelClosing, setPanelClosing] = useState(false);
    const closeTimer = useRef(null);
    // The guarded close, for the window-level Escape listener, which is registered once. Kept current by an effect.
    const leaveRef = useRef(null);

    const openRecord = useCallback((member) => {
        if (closeTimer.current) {
            clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
        setPanelClosing(false);
        setSelectedMember(member);
    }, []);

    const closeRecord = useCallback(() => {
        if (closeTimer.current) return;
        setPanelClosing(true);
        closeTimer.current = setTimeout(() => {
            closeTimer.current = null;
            setPanelClosing(false);
            setSelectedMember(null);
        }, PANEL_MS);
    }, []);

    useEffect(() => () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
    }, []);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    // The form as it stood when editing began, serialised: an edit has changes exactly when the form no longer
    // serialises to it. Compared whole, so a field the member record never carried still counts once it is typed in.
    const [editBaseline, setEditBaseline] = useState(null);
    const [activeTab, setActiveTab] = useState("personal");
    const [showSavedNotification, setShowSavedNotification] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
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

    /*
     * The topbar's search is the SHELL's (card.html's `.search`); this page reads it
     * through the outlet context and applies it across every field the register shows.
     * Mounted without the shell -- every test does -- there is no context and no query.
     */
    const { search = "", setSearch } = useOutletContext() || {};
    const deferredSearch = useDeferredValue(search);
    const query = deferredSearch.trim().toLowerCase();

    /* Tab changes move in the direction of travel (card.js `enterTab`). */
    const [tabDirection, setTabDirection] = useState("fwd");
    const changeTab = (next) => {
        setTabDirection((TABS.findIndex(t => t.id === next) > TABS.findIndex(t => t.id === activeTab)) ? "fwd" : "back");
        setActiveTab(next);
    };

    /* The name the toast says, captured at the save so it survives the panel closing. */
    const [savedName, setSavedName] = useState("");

    /*
     * 🖨️ WHICH OF THE TWO THINGS ON THIS SCREEN IS BEING PRINTED.
     *
     * Print is live (the owner, 2026-09-09) and this page carries two printable surfaces at
     * once: the register, from Export, and the open member's record, from the panel's Print.
     * `index.css`'s print rules keep everything inside `.print-area` and remove the rest --
     * so exactly one of them may wear the class, and which one depends on the button that
     * was pressed. Without this the register printed the record beside it and the record
     * printed the register behind it.
     *
     * 🔑 `flushSync` BECAUSE `window.print()` DOES NOT WAIT FOR REACT. The dialog opens on
     * the DOM as it is at the moment of the call; a state change scheduled normally lands
     * after the snapshot, so the class would arrive one print too late, every time.
     */
    const [printScope, setPrintScope] = useState(null);
    const printWith = useCallback((scope) => {
        flushSync(() => setPrintScope(scope));
        window.print();
        setPrintScope(null);
    }, []);

    /*
     * 🔴 THE LOADING RESET IS ON THE RETRY PATH NOW (`10.4`), not inside the fetch the effect
     * calls. `react-hooks/set-state-in-effect` is an error as of this phase and it was right.
     *
     * 🔑 A NO-OP ON MOUNT: `listState` already initialises to "loading". The line only ever did
     * work when a human pressed Try again after a failure, and that is `retryMembers`.
     */
    const loadMembers = useCallback(() => {
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

    const retryMembers = useCallback(() => {
        setListState("loading");
        loadMembers();
    }, [loadMembers]);

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
    // The same branch rule as Capture Member: the bank's own branches together with the fourteen names. One rule on
    // both screens -- two screens holding one member with two vocabularies is how A6 and A7 happened.
    const bankListing = refs.data['bank branches'];
    const branchOptionsFor = useCallback(
        (bankName) => (bankName ? [...new Set([...branchNamesForBank(bankListing, bankName), ...BRANCH_OPTIONS])] : BRANCH_OPTIONS),
        [bankListing],
    );
    const branchOptions = branchOptionsFor(editForm.bankName);
    const genderOptions = GENDER_OPTIONS;
    /*
     * ✅ A25's SECOND CLAUSE, `06.1b` -- the other of the two callers. Same reasoning as the
     * one written out at `CaptureMember.jsx`: `getByBank` no longer swallows a failure into
     * the (empty) static list, so this panel renders the failure with a retry instead of
     * telling an administrator that the member's bank has no job grades on file.
     */
    const [jobGradeAttempt, setJobGradeAttempt] = useState(0);
    /*
     * 🔴 ONE RESULT, KEYED BY THE QUESTION IT ANSWERS, AND SHOWN ONLY WHILE IT IS THE CURRENT ONE (`10.4`).
     *
     * The grades and their failure used to be two pieces of state that the fetch effect RESET on the way in
     * (`setJobGradeOptions([])`, `setJobGradeError(null)`) -- which `react-hooks/set-state-in-effect` makes an
     * error this phase. Keying the result by `[bank, attempt]` removes every one of those resets, because a
     * result for another bank or another attempt is simply not current, so it is not shown. Nothing has to be
     * cleared for it to disappear.
     *
     * 🔑 AND IT CLOSES A GAP R3-F4 LEFT OPEN. The resets only ran when the NEXT answer landed, so switching
     * ABSA -> Capitec while editing left ABSA's grades on offer under "Capitec" for as long as Capitec took to
     * answer -- one click from saving a grade against the wrong bank, which is the very thing R3-F4's ticket
     * was added to prevent, reached by waiting rather than by racing. Here the old bank's list stops being
     * current the instant the bank changes. `Members.jobGradeSequencing.test.jsx` ③ was red on that before
     * this change.
     *
     * Not editing, or no bank: no key, no grades -- grades are per bank, so an empty list is the honest answer.
     */
    const [jobGradeResult, setJobGradeResult] = useState(null);
    const jobGradeKey = isEditing && editForm.bankName
        ? JSON.stringify([editForm.bankName, jobGradeAttempt])
        : null;
    const currentJobGrades = jobGradeResult?.key === jobGradeKey ? jobGradeResult : null;
    const jobGrade = currentJobGrades?.options ?? NO_JOB_GRADES;
    const jobGradeError = currentJobGrades?.error ?? null;

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== "Escape") return;
            // An Escape something nearer has already answered -- the date picker, a
            // dialog, a listbox -- is not a request to close the whole record. Without this
            // guard, Escape in the calendar of the edit form threw the member away.
            if (e.defaultPrevented || e.target?.closest?.('[role="dialog"], [role="listbox"]')) return;
            // `06.5`: through the same guard as every other way out -- an edit with changes asks first.
            // `leaveRef` is assigned on every commit, before any key can be pressed, so there is no second path.
            leaveRef.current?.();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    /**
     * 🔴 R4-F1, the edit twin of Capture Member's: Initials are derived from First Name(s) until the administrator
     * types them. Reset whenever an edit BEGINS (`handleEditToggle`), so one member's typed initials do not stop the
     * next member's from deriving.
     *
     * ♻️ IT USED TO BE RESET ON RECORD LOAD AS WELL, AND THAT RESET HAD NO CONSEQUENCE. The flag is read only while
     * editing, every way into editing passes through `handleEditToggle`, and no path opens a different member in the
     * middle of an edit -- opening one ends the edit first, and a save ends it itself. A deletion proof in `10.4`
     * confirmed it (removed, `Members.recordSeed.test.jsx` ③ stayed green), and P10's refactor pass removed it.
     */
    const initialsTyped = useRef(false);

    /*
     * 🔴 THE RECORD RESEEDS DURING RENDER NOW, AND THE REF THAT REMEMBERED THE LAST MEMBER IS STATE (`10.4`).
     *
     * This was one effect keyed on `selectedMember` -- an error under `react-hooks/set-state-in-effect` this
     * phase -- and it could not simply be lifted into render, because it also WROTE two refs, and a ref written
     * during render is its own violation. So it splits:
     *
     *   - the state it seeds (form, section, errors, edit mode) moves into a render-phase update guarded by
     *     the last member seen, React's documented form, which also means a newly opened record never paints
     *     one frame with the previous member's form;
     *   - `prevMemberIdRef` is not moved but REPLACED: the last member seen is exactly what it held;
     *   - the `initialsTyped` reset that was also here turned out to be dead weight -- see `initialsTyped`.
     *
     * ⚠️ THE SECTION RESETS BY MEMBERSHIP NUMBER, NOT BY OBJECT, and that has to survive: a save replaces the
     * record with a new object carrying the same number, and comparing identities would throw the user back to
     * Personal after every save. `Members.recordSeed.test.jsx` ② is the must-pass that says so.
     */
    const [seenMember, setSeenMember] = useState(null);
    if (selectedMember !== seenMember) {
        const previousNumber = seenMember?.membershipNumber ?? null;
        setSeenMember(selectedMember);
        if (selectedMember) {
            // List fields arrive as lists: memberService.normalizeMember unfolds the server's
            // "PEC,CEC" once, for every consumer (A37 / A38).
            setEditForm({ ...selectedMember, paymentType: normalizePaymentType(selectedMember.paymentType) });
            if (previousNumber !== selectedMember.membershipNumber) setActiveTab("personal");
            setFieldErrors({});
        } else {
            setIsEditing(false);
            setEditForm({});
            setFieldErrors({});
        }
    }

    useEffect(() => {
        /*
         * 🔴 THE GRADE IS NOT CLEARED HERE, AND MAIN'S e56dbe4 CLEARED IT HERE. An effect on
         * `editForm.bankName` cannot tell a user changing the bank from the form being LOADED
         * with a member -- opening a record copies the member in, `bankName` goes from nothing
         * to their bank, and the reset blanked the grade the record panel then displayed as
         * "—" for every member. The clear lives in `handleEditChange` now, on the bank field's
         * own change, which only a person can cause. Proved by `Members.jobGrade.test.jsx`:
         * ① reddened on the merged code, and ③ holds that a real change of bank still clears it.
         */
        /*
         * 🔴 R3-F4: ONLY WHILE EDITING, AND ONLY THE LATEST ANSWER COUNTS.
         *
         * The list is offered by the edit form alone -- the read view prints `editForm.jobGrade` directly and never
         * touches these options -- so fetching on every OPEN spent two requests per member looked at, on the screen
         * used most, for something nobody could see. And the fetch had no ticket: switching bank A → B with A's
         * answer arriving last put A's grades under bank B, where one of them could then be saved.
         */
        if (jobGradeKey === null) return undefined;

        let superseded = false;
        jobGradeService.getByBank(editForm.bankName)
            .then((grades) => {
                if (superseded) return;
                setJobGradeResult({ key: jobGradeKey, options: Array.isArray(grades) ? grades : [], error: null });
            })
            .catch((error) => {
                // An abort is the caller superseding itself, not a failure (§16, EH-D3).
                if (superseded || error?.kind === 'abort') return;
                setJobGradeResult({ key: jobGradeKey, options: [], error });
            });
        return () => {
            superseded = true;
        };
    }, [jobGradeKey, editForm.bankName]);


    const handleEditToggle = () => {
        if (isEditing) {
            // Cancel is the one way out that is itself the discard, so it does not ask; it does put the record's own
            // values back, so the page read after it is the record rather than the edit that was thrown away.
            endEdit();
            return;
        }
        const start = { ...selectedMember, paymentType: normalizePaymentType(selectedMember?.paymentType) };
        initialsTyped.current = false;
        setEditForm(start);
        setEditBaseline(JSON.stringify(start));
        setFieldErrors({});
        setIsEditing(true);
    };

    const handleEditChange = useCallback((field) => (event) => {
        let rawValue = event && event.target ? event.target.value : event;
        if (field === "initials") initialsTyped.current = true;

        const hasNonNumericInput =
            field === "identityNumber" && editForm.identityType === "I.D. Number" &&
            /\D/.test(rawValue);
        // One typing rule for both member screens (utils/inputRules.js).
        const value = sanitiseField(field, rawValue, { identityType: editForm.identityType });

        setEditForm((prev) => {
            const next = { ...prev, [field]: value };

            // Main's intent (e56dbe4), in the one place it can be told apart from a record
            // loading: a grade belongs to a bank, so choosing a DIFFERENT bank clears it.
            if (field === "bankName" && value !== prev.bankName) {
                next.jobGrade = "";
                // A branch the new bank does not offer goes with the old bank; the fourteen names stay for every bank.
                if (value && prev.branch && !branchOptionsFor(value).includes(prev.branch)) next.branch = "";
            }

            // R4-F1: derived until typed -- see `initialsTyped`.
            if (field === "firstNames" && !initialsTyped.current) {
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
    }, [editForm.identityType, branchOptionsFor]);

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

        if (editForm.identityType === IDENTITY_TYPE_PASSPORT && !editForm.dateOfBirth) {
            errors.dateOfBirth = "Date of Birth is strictly required when Passport is selected";
        }

        if (editForm.paymentType === "Debit Order") {
            if (!editForm.bankAccountNumber?.trim()) errors.bankAccountNumber = "Bank Account Number is required for Debit Orders";
            if (!editForm.bankName?.trim()) errors.bankName = "Bank Employer alignment name is required for Debit Orders";
            if (!editForm.branch?.trim()) errors.branch = "Bank Branch selection is required for Debit Orders";
        }

        // Shape checks on what the administrator CHANGED in this edit, and only on fields this screen shows. A stored
        // value nobody touched is left alone: rules written today would otherwise make older members unsaveable over a
        // field on another tab. The emails have no control on Edit Member, and Bank Account Number is hidden under
        // Payroll, so neither can block a save the administrator has no way to fix.
        const original = editBaseline ? JSON.parse(editBaseline) : {};
        const shapeChecked = ["initials", "phone", "workTel", "homeTel", "ibtNo", "dateOfBirth"];
        if (editForm.paymentType === "Debit Order") shapeChecked.push("bankAccountNumber");
        for (const key of shapeChecked) {
            if (errors[key] || String(editForm[key] ?? "") === String(original[key] ?? "")) continue;
            const message = validateField(key, editForm[key], { identityType: editForm.identityType });
            if (message) errors[key] = message;
        }

        // No COSATU-requires-BEC check here: the form cannot express the contradiction (COSATU is only
        // offered under BEC = Yes, and BEC = No clears it), and a legacy member stored as COSATU with no BEC
        // answer must stay saveable unchanged -- the server's validateStructures owns both halves.
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

    /*
     * 🔴 THE CONFIRMATION CLOSED BEFORE THE WRITE, AND NOTHING SHOWED WHILE IT RAN (`06.5`, F-P55). "Save changes"
     * dismissed the dialog first and awaited the request after, so for the length of a slow save the record looked
     * exactly as if nothing had been pressed -- and could be pressed again. The dialog stays open, its button busy,
     * until the write has answered either way.
     */
    const [savingRecord, setSavingRecord] = useState(false);

    const commitSave = async () => {
        if (savingRecord) return;
        setSavingRecord(true);
        // ONE exit, whatever happens below: the write's own `catch` returns early, and the refresh that follows
        // has a `try` of its own, so a third path added later would otherwise leave the record busy for ever.
        try {
            try {
                await memberService.updateMember(editForm);
            } catch (error) {
                reportError("Members.save", error);
                // 06.1 owns the shared error CONTRACT; what this wave owes the screen is that
                // a failed save is visible on the screen the member is looking at, rather than
                // in a dialog they dismiss and a console they never open.
                // 🔴 R3-F2: "Nothing was written" only after a refusal. A timeout, a lost connection or a 5xx may have saved
                // the change, and a clerk told otherwise redoes it.
                setPendingSave(null);
                setSaveNotice(writeMayHaveLanded(error)
                    ? {
                        kind: "unconfirmed",
                        messages: ["We did not get an answer about these changes, so they may have been saved. Reload the register and check this member before trying again."],
                    }
                    : {
                        kind: "failed",
                        messages: ["We could not save these changes. Nothing was written — please try again."],
                    });
                return;
            }

            // The save landed. What follows is the register catching up, and its failure is not the save's (R3-F2): it
            // shared the write's `try`, so a good save followed by a failed refresh was reported as not written.
            setPendingSave(null);
            setSelectedMember({ ...editForm });
            setEditBaseline(null);
            setIsEditing(false);
            setSavedName(personName(editForm));
            setShowSavedNotification(true);
            window.setTimeout(() => setShowSavedNotification(false), 2600);
            try {
                const refreshed = await memberService.getMembers();
                setMembersList(Array.isArray(refreshed) ? refreshed : (refreshed.data || refreshed.members || []));
            } catch (error) {
                reportError("Members.refreshAfterSave", error);
                setSaveNotice({
                    kind: "stale",
                    messages: ["The changes were saved, but the register could not be refreshed, so its rows may show the old values until the page is reloaded."],
                });
            }
        } finally {
            setSavingRecord(false);
        }
    };

    const [pendingSave, setPendingSave] = useState(null);

    /*
     * 🔴 AN EDIT WAS THROWN AWAY BY ANYTHING THAT CHANGED THE RECORD (`06.5`, the `06.3` critique, F-P55). Choosing
     * another member, the close button, the scrim and Escape each replaced or cleared the record while the form held
     * unsaved changes -- without a word -- and the next member opened already in edit mode, because nothing reset
     * `isEditing`. Every one of those ways out comes through here now: an edit with changes asks first, an edit
     * without them simply ends, and the record that opens next opens to be read.
     */
    const [pendingLeave, setPendingLeave] = useState(null);
    // The ways out read the record as of the last commit, and ask whether it changed only when one is taken --
    // `recordIsDirty`, below the component. Serialising the whole form on every render to fill a ref nothing
    // renders was work every keystroke paid for.
    const guard = useRef({ isEditing: false, selectedId: null, baseline: null, editForm: null });

    const endEdit = useCallback(() => {
        const { baseline } = guard.current;
        if (baseline) setEditForm(JSON.parse(baseline));
        setEditBaseline(null);
        setIsEditing(false);
        setSaveNotice(null);
        setFieldErrors({});
    }, []);

    const requestOpenRecord = useCallback((member) => {
        const { isEditing: editing, selectedId } = guard.current;
        // The member already open, chosen again: there is nothing to switch to, and nothing to throw away.
        if (member?.id != null && member.id === selectedId) {
            if (!editing) openRecord(member);
            return;
        }
        if (recordIsDirty(guard.current)) {
            setPendingLeave({ member });
            return;
        }
        endEdit();
        openRecord(member);
    }, [openRecord, endEdit, setPendingLeave]);

    const requestCloseRecord = useCallback(() => {
        if (recordIsDirty(guard.current)) {
            setPendingLeave({ close: true });
            return;
        }
        endEdit();
        closeRecord();
    }, [closeRecord, endEdit, setPendingLeave]);

    useEffect(() => {
        guard.current = { isEditing, selectedId: selectedMember?.id ?? null, baseline: editBaseline, editForm };
        leaveRef.current = requestCloseRecord;
    });

    const discardAndLeave = () => {
        const leave = pendingLeave;
        setPendingLeave(null);
        endEdit();
        if (leave?.member) openRecord(leave.member);
        else closeRecord();
    };

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
        return membersList.filter((member) =>
            activeFilters.every(([field, value]) =>
                String(member[field] ?? "").trim().toLowerCase().includes(value)
            ) &&
            (!query || SEARCH_FIELDS.some((field) => String(member[field] ?? "").toLowerCase().includes(query)))
        );
    }, [deferredFilters, membersList, query]);

    /*
     * 🔴 THE PAGE IS DERIVED, NOT CLAMPED AFTER THE FACT (`10.4`) -- AND THE CLAMP WAS A LIE FOR ONE FRAME.
     *
     * It used to be an effect: `setPage(p => Math.min(p, totalPages))`. `react-hooks/set-state-in-effect`
     * flagged it, and the warning was describing a real frame. Search from page 3 for a surname five members
     * share, and React rendered once with `page` still 3 and one page in total -- an EMPTY slice -- COMMITTED
     * it, and drew **No member matches "..."** over members it was about to show. Only then did the effect
     * bring the page down. A false statement about the union's own register, for one frame, on every search
     * made from a later page.
     *
     * Criteria never showed it (they reset to page 1 themselves); only the TOPBAR search shrinks the list
     * without doing so, which is why that is the one path that needed a clamp at all. And no test could see
     * it, because every test mounts this page without the shell that supplies the search.
     * `Members.pageClamp.test.jsx` mounts it under one, and watches the empty title for the whole transition.
     *
     * Derived during render, there is no frame in which the page can be out of range.
     *
     * ⚠️ AND DERIVING ALONE WOULD HAVE BROKEN SOMETHING ELSE, WHICH IS WHY THE SECOND LINE EXISTS. The effect
     * clamped PERMANENTLY: search from page 3, land on page 1, clear the search, and you stay on page 1. A bare
     * `Math.min` leaves what was asked for at 3, so clearing the search would have thrown the user back to
     * page 3 of the full register -- a page they never chose for that list. So what was asked for follows
     * what can be shown, during render. That is React's documented adjustment ("storing information from
     * previous renders"): the re-render happens before anything commits, so the stale frame is never drawn,
     * and the guard is what makes it terminate. The test file's third case holds this half.
     */
    const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE)), [filteredMembers]);
    const page = Math.min(requestedPage, totalPages);
    if (requestedPage !== page) setPage(page);

    /* The rows re-enter when the question changes: a new query, a new criterion, a new page. */
    const enterKey = useMemo(
        () => JSON.stringify([deferredFilters, query, page]),
        [deferredFilters, query, page],
    );

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

    /* The Branch criterion's choices: every branch the register holds, once, in order. */
    const registerBranches = useMemo(
        () => [...new Set(membersList.map((m) => m?.branch).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
        [membersList],
    );

    const registerFigures = useMemo(() => {
        const by = (status) => membersList.filter((m) => m?.status === status).length;
        const now = today();
        return {
            total: membersList.length,
            active: by("Active"),
            pending: by("Pending"),
            suspended: by("Suspended"),
            // card.html's fifth, quiet figure. `dateLastChanged` is the wire's name for the
            // record's last edit; a register that carries none simply reads 0.
            updatedToday: membersList.filter((m) =>
                sameDate(parseDate(m?.dateLastChanged ?? m?.updatedAt), now),
            ).length,
        };
    }, [membersList]);

    const startIndex = (page - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, filteredMembers.length);
    const visibleMembers = useMemo(() => filteredMembers.slice(startIndex, endIndex), [filteredMembers, startIndex, endIndex]);

    const handleClear = () => {
        setFilters({ ...EMPTY_FILTERS });
        setSearch?.("");
        setPage(1);
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
    /* card.html's six columns, in its order and its words, with its column ladder: the
       employee number yields first, then the branch, then the bank; the number, the member
       and the status never do. */
    const columns = useMemo(() => [
        {
            key: "membershipNumber",
            header: "Membership no.",
            priority: "essential",
            cell: (member) => {
                const number = member.membershipNumber || "—";
                const who = [member.title, member.initials, member.surname].filter(Boolean).join(" ");
                const cancelled = CANCELLED_STATUSES.some((s) => s.toLowerCase() === String(member.status ?? "").toLowerCase());
                return (
                    <button
                        type="button"
                        data-row-action=""
                        onClick={() => requestOpenRecord(member)}
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
                        className={cn(
                            "touch-target rounded-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring",
                            // card.css: "nothing disappears, it cancels" -- a resigned or retired
                            // member's number is struck through, not hidden.
                            cancelled
                                ? "font-medium text-ink-muted line-through decoration-status-resigned-dot decoration-[1.5px]"
                                : "font-semibold tracking-[0.06em] text-brand-ink",
                        )}
                    >
                        {number}
                    </button>
                );
            },
        },
        {
            key: "employeeNumber",
            header: "Employee no.",
            priority: "secondary",
            fit: "wide",
            cell: (m) => <span className="tabular-nums text-ink-muted">{m.employeeNumber || "—"}</span>,
        },
        {
            key: "member",
            header: "Member",
            priority: "essential",
            // The two-line member cell -- `Ms NT Mokoena` over `Nomvula Thandeka`. Both lines
            // truncate at the same width, and the full names are one click away on the card.
            // 13rem, not 14: the cap is what the column ladder must fit (index.css `.register`),
            // and at 14rem a real long name put Status past the sheet with the record docked at 1440.
            cell: (m) => (
                <span className="block max-w-[13rem]">
                    <span className="block truncate text-base font-semibold leading-tight text-ink">
                        {[m.title, m.initials, m.surname].filter(Boolean).join(" ") || "—"}
                    </span>
                    {m.firstNames && <span className="block truncate text-xs text-ink-muted">{m.firstNames}</span>}
                </span>
            ),
        },
        {
            key: "bankName",
            header: "Bank",
            priority: "secondary",
            fit: "narrow",
            // Real bank names run to "The Standard Bank of South Africa Limited"; the mock's
            // fit with "Standard Bank". Truncated here, whole in the cell's title, the
            // detail panel and the card.
            truncate: true,
            // 🔴 THE CAP IS FLUID, IN THE REGISTER'S OWN UNITS. A fixed 10rem was measured at
            // 1349 (the register 605px, four columns fitting in 598) and then conceded that
            // width everywhere else: at 1440 the register is 680 and four names still
            // truncated with ~20px going spare. `cqw` reads the `.register` container the
            // column ladder already measures, so the cap grows with the space.
            // ⚠️ 9rem / 21cqw / 16rem since `06.3`, measured on a row at every cap: at 10rem /
            // 26cqw a real long name and bank put Status past the sheet with the record docked
            // at 1440, where the owner's ruling keeps four columns (index.css `.register`).
            className: "max-w-[clamp(9rem,21cqw,16rem)]",
            cell: (m) => m.bankName || "—",
        },
        {
            key: "branch",
            header: "Branch",
            priority: "secondary",
            fit: "medium",
            // Capped like Bank, and for Bank's reason: an uncapped branch sets the width the column
            // ladder has to fit, so one real branch longer than the synthetic data's longest would
            // move the width at which Status is cut. Truncated here and whole in the cell's title --
            // which Table writes only for a STRING cell, so the muted ink moves to the cell's class.
            truncate: true,
            className: "text-ink-muted max-w-[clamp(9rem,22cqw,15rem)]",
            cell: (m) => m.branch || "—",
        },
        {
            key: "status",
            header: "Status",
            priority: "essential",
            cell: (member) => <StatusChip status={member.status} />,
        },
    // `requestOpenRecord` reads the edit through a ref and depends only on stable callbacks, so this list is still
    // stable and the columns are still built once -- it is named because the rule is right: a closure that is not
    // declared is a closure nobody will remember to check when it stops being stable.
    ], [requestOpenRecord]);

    return (
        /* 📐 card.html's `.main`, section by section: the page head, the ruled figure strip,
           the criteria row, and the register as a sheet that fills whatever height is left so
           its pager sits at the foot. Each carries the mock's 28px gutter. The record panel
           is the SHELL's third column -- `MemberPanel` portals into it -- so nothing here has
           to make room for it, and below `xl` it is a drawer over this. */
        <div className="flex min-h-0 flex-1 flex-col text-ink">
            <div className="px-7 pt-[26px] max-lg:px-4">
                <PageTitle
                    title="Members"
                    subtitle="The membership register across every bank. Select a member to open their card."
                    actions={
                        <>
                            {/* 🖨️ Export prints the register -- and the print dialog is where a
                                PDF comes from. Print is live (the owner, 2026-09-09); an
                                endpoint that writes a spreadsheet does not exist yet, and a
                                control that promised one would be a lie in a primary position. */}
                            <Button onClick={() => printWith("register")} title="Print the register, or save it as a PDF">
                                <Printer size={16} strokeWidth={1.75} aria-hidden="true" /> Print
                            </Button>
                            <Button variant="primary" onClick={() => navigate("/members/capture")}>
                                <LucideUserRoundPlus size={16} strokeWidth={1.75} aria-hidden="true" /> Capture Member
                            </Button>
                        </>
                    }
                />
            </div>

            {/* 📊 THE RULED FIGURE STRIP -- "ledger line, not tiles", and the contract
                refuses the alternative by name ("hero-metric tiles, dashboards of same-size
                cards"). Counted from the register the page already holds, so it can never
                disagree with the rows below it. */}
            <FigureStrip className="mx-7 mt-5 max-lg:mx-4" {...registerFigures} state={listState} />

            {/* 🔍 THE CRITERIA ROW -- card.css `.criteria`. Three labelled fields printed on
                the page, "More criteria" beside them, Clear at the end. This page had FIFTEEN
                in a grid, which is a search form rather than a register's criteria. The other
                twelve are all still here, one disclosure away -- nothing was removed. */}
            <div className="no-print px-7 pt-4 max-lg:px-4">
                <Criteria>
                    <SearchableSelect
                        className={CRITERION}
                        label="Bank"
                        value={filters.bankName}
                        onChange={handleInputChange("bankName")}
                        placeholder="All banks"
                        {...refs.field('banks')}
                        options={[{ value: '', label: 'All banks' }, ...bankOptions.map(b => ({ value: b, label: b }))]}
                    />
                    {/* A picker, as the mock's `.crit` is -- fed by the branches the register
                        actually holds, so the list can never offer a branch with no members. */}
                    <SearchableSelect
                        className={CRITERION}
                        label="Branch"
                        value={filters.branch}
                        onChange={handleInputChange("branch")}
                        placeholder="Any"
                        options={[{ value: "", label: "Any" }, ...registerBranches.map(b => ({ value: b, label: b }))]}
                    />
                    <SearchableSelect
                        className={CRITERION}
                        label="Status"
                        value={filters.status}
                        onChange={handleInputChange("status")}
                        placeholder="Any"
                        options={[{ value: "", label: "Any" }, ...statusOptions.map(o => ({ value: o, label: o }))]}
                    />
                    {/* One flex item, so the two controls share a baseline on a phone instead
                        of Clear orphaning onto a line of its own. */}
                    <div className="flex shrink-0 items-center gap-1">
                        <Button
                            variant="ghost"
                            onClick={() => setMoreCriteria((open) => !open)}
                            aria-expanded={moreCriteria}
                            aria-controls="more-criteria"
                            className="pl-1.5"
                        >
                            <SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
                            More criteria
                            {activeExtraCriteria > 0 && (
                                <span className="ml-0.5 rounded-full bg-brand-soft px-1.5 text-xs font-semibold tabular-nums text-brand-ink">
                                    {activeExtraCriteria}
                                </span>
                            )}
                        </Button>
                        <Button variant="ghost" onClick={handleClear}>Clear</Button>
                    </div>
                </Criteria>

                {/* ⚠️ THE OTHER TWELVE ARE ALL STILL HERE. The mock shows three criteria and a
                    "More criteria" control; it does not show a register with twelve fewer
                    ways to search it. Collapsing is a change to what is on screen at rest,
                    never to what the register can do -- and the count on the control above is
                    what stops a collapsed criterion filtering the list invisibly. */}
                <div
                    id="more-criteria"
                    hidden={!moreCriteria}
                    className="mt-3 grid grid-cols-1 items-end gap-x-3 gap-y-3 rounded-lg bg-surface p-4 shadow-(--shadow-1) sm:grid-cols-2 lg:grid-cols-4"
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
            </div>

            {/* ✅ THE FOURTH STATE (EH-D9). The register below has its own error state and
                its own retry; this is about the two lists that fill the EDIT panel. A
                missing bank list must not blank a register that loaded perfectly well,
                and it must not be silent either -- an administrator who opens the edit
                panel and finds no banks would otherwise conclude there are none. */}
            {(refs.state === 'partial' || refs.state === 'error') && (
                <div className="mx-7 mt-4 rounded-lg bg-surface shadow-(--shadow-1) max-lg:mx-4">
                    <DataState
                        state={refs.state === 'error' ? 'error' : 'partial'}
                        layout="row"
                        compact
                        onRetry={refs.retry}
                        // 🔴 "THE REGISTER BELOW IS UP TO DATE" WAS SAID WHATEVER THE REGISTER HAD DONE (`06.4`) -- while it was
                        // loading, and when it had failed as well -- and the sentence began in lowercase, "banks did not load".
                        title={refs.state === "error" ? "None of the edit panel’s option lists could be loaded." : "Some option lists are missing."}
                        message={`${refs.failed.join(" and ").replace(/^./, (c) => c.toUpperCase())} did not load, so the edit panel cannot offer them.${listState === "ready" ? " The register below is complete." : ""}`}
                    />
                </div>
            )}

            {/* 🔴 A27, CLOSED. `Table` renders loading, error and empty as three separate
                branches, and `error` NEVER renders as `empty` — which is the whole
                defect: a backend that is down used to say "no members match", and an
                administrator reads that as a fact about the union. The retry re-runs the
                same fetch the mount effect does. The copy is card.html's own. */}
            {/* 📐 card.css `.register` + `.card-surface`: the sheet fills the remaining
                height, and the pager is its foot. The `register` class is the container the
                column ladder measures (index.css). */}
            <section
                aria-label="Member register"
                className={cn(
                    "register flex flex-1 flex-col px-7 pb-7 pt-4 max-lg:px-4",
                    printScope === "register" && "print-area",
                )}
            >
                <Sheet>
                    <Table
                        caption="Sasbo members matching the current search"
                        columns={columns}
                        rows={visibleMembers}
                        rowKey="id"
                        selectedKey={selectedMember?.id}
                        onRowSelect={requestOpenRecord}
                        enterKey={enterKey}
                        loading={listState === "loading"}
                        error={listState === "error" ? "The register could not be reached" : null}
                        errorMessage="The server did not answer, so this is not an empty result. Nothing you typed has been lost."
                        onRetry={retryMembers}
                        emptyTitle={query ? `No member matches “${deferredSearch.trim()}”` : "No members match these criteria"}
                        emptyMessage={
                            query
                                ? "Try the membership number, which is unique, or clear the search to see the whole register."
                                : "Clear the criteria to see the whole register, or capture a new member."
                        }
                        // 🔴 "Clear" WAS OFFERED WHEN NOTHING WAS SET, AND DID NOTHING (`06.4`). A register that is empty with no
                        // search and no criteria has nothing to clear; what there is to do is capture a member.
                        emptyAction={
                            query || Object.values(filters).some((value) => String(value ?? "").trim() !== "")
                                ? <Button onClick={handleClear}>Clear</Button>
                                : <Button variant="primary" onClick={() => navigate("/members/capture")}>Capture member</Button>
                        }
                    />

                    {/* card.css `.pager`: "Showing 1–14 of 2 418 · Page 1 of 173", Previous and Next. */}
                    <Pager
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        count={filteredMembers.length}
                        start={startIndex + 1}
                        end={endIndex}
                        noun="members"
                        error={listState === "error"}
                        loading={listState === "loading"}
                        /* 🔴 THE KEYBOARD LEGEND MOVED HERE FROM THE RECORD PANEL'S EMPTY
                           STATE. It always described THIS surface -- ↑ and ↓ move the
                           selection, Enter opens the record -- and it was only ever on screen
                           while the panel had nothing in it, so when the owner asked for that
                           empty column to close it would have taken the one place the
                           application teaches its own keyboard model with it. */
                        hint={filteredMembers.length > 0 ? (
                            <KeyHints
                                hints={[
                                    [['↑', '↓'], 'move'],
                                    [['Enter'], 'open'],
                                    [['⌘K'], 'search'],
                                ]}
                            />
                        ) : null}
                    />
                </Sheet>
            </section>

            {/* card.css `.toast`: the save's confirmation, low and centred, gone in 2.6s. */}
            {/* card.css `.toast`: the save's confirmation, low and centred, gone in 2.6s.
                `<output>` NOT `<div role="status">`: its implicit role IS `status`, so the
                live region is native semantics rather than a generic box wearing an ARIA hat --
                consistent across every device and screen reader. */}
            {showSavedNotification && (
                <output
                    className="kind-in fixed bottom-[84px] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-[10px] bg-ink px-3.5 py-2.5 text-[13.5px] font-medium text-bg shadow-(--shadow-2)"
                >
                    <CircleCheck size={16} strokeWidth={2} aria-hidden="true" className="text-brand" />
                    <span>{savedName ? `${savedName}’s record saved` : "Changes saved"}</span>
                </output>
            )}

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
            <Modal
                open={Boolean(selectedMember) && !panelClosing}
                onOpenChange={(next) => { if (!next) requestCloseRecord(); }}
                title={personName(selectedMember) || "Member record"}
                description={selectedMember?.membershipNumber ? `Membership no. ${selectedMember.membershipNumber}` : undefined}
                size="lg"
                footer={
                    isEditing ? (
                        <>
                            <Button onClick={handleEditToggle}>Cancel</Button>
                            <Button variant="primary" onClick={handleSaveChanges}>
                                <Check size={16} strokeWidth={2} aria-hidden="true" /> Save changes
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button size="icon" onClick={() => printWith("record")} aria-label="Print this member's record">
                                <Printer size={16} strokeWidth={1.75} aria-hidden="true" />
                            </Button>
                            <Button variant="primary" onClick={handleEditToggle}>
                                <Pencil size={16} strokeWidth={1.75} aria-hidden="true" /> Edit Member
                            </Button>
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
                    <div className={cn("member-record", printScope === "record" && "print-area")}>
                        <MembershipCard
                            name={personName(selectedMember) || "—"}
                            membershipNumber={selectedMember.membershipNumber}
                            status={selectedMember.status}
                            since={selectedMember.joinDate}
                            employer={selectedMember.bankName}
                        />
                        {/* THE ERROR SUMMARY that replaced three `alert()` calls. Focused
                            rather than `role="alert"`: `Field` already gives every inline
                            message that role, so a form failing four validations would
                            queue five announcements at once. F-P23. */}
                        {saveNotice && (
                            <div
                                ref={errorSummaryRef}
                                tabIndex={-1}
                                aria-labelledby="member-save-notice-title"
                                className={`mt-4 rounded-lg border p-3 text-sm no-print focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring ${
                                    saveNotice.kind === "unchanged" || saveNotice.kind === "stale"
                                        ? "border-line-strong bg-surface-2 text-ink-muted"
                                        : "border-status-suspended-dot bg-status-suspended-bg text-status-suspended"
                                }`}
                            >
                                <p id="member-save-notice-title" className="flex items-center gap-2 font-medium">
                                    <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                                    {SAVE_NOTICE_TITLES[saveNotice.kind]}
                                </p>
                                <ul className="mt-1 list-disc pl-6">
                                    {saveNotice.messages.map((message) => <li key={message}>{message}</li>)}
                                </ul>
                            </div>
                        )}

                        {/* card.css `.tabs`: a wrapping strip under a hairline, the current
                            section underlined in the brand's teal.

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
                            application has three places that want it. */}
                        {/* 🔴 ONE LINE, NOT A GRID. The record opens in a wide modal now (`size="xl"`),
                            so all five short labels fit across a single row. The three-column
                            arrangement only existed to fold them inside the old 448px docked column;
                            `overflow-x-auto` is the safety valve if a narrow screen ever runs out of room. */}
                        <div className="no-print mt-4 border-b border-line">
                            <div className="flex flex-nowrap items-center gap-x-1 overflow-x-auto">
                                {TABS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        aria-current={activeTab === tab.id ? "true" : undefined}
                                        onClick={() => changeTab(tab.id)}
                                        className={cn(
                                            // card.css:358 -- 13px, not 14: a quiet index of the record, not a second row of headings.
                                            "touch-target inline-flex items-center gap-1 whitespace-nowrap px-[9px] pb-[11px] pt-[9px] text-[13px] font-medium",
                                            "transition-[color,box-shadow] duration-(--duration-instant) focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring",
                                            activeTab === tab.id
                                                ? "font-semibold text-brand-ink shadow-[inset_0_-2px_0_var(--color-brand)]"
                                                : "text-ink-muted shadow-[inset_0_-2px_0_transparent] hover-hover:hover:text-ink",
                                        )}
                                >
                                    {/* Shown short, named in full -- see `RECORD_TABS`. Not `aria-label`: that would
                                        also silence the "has errors" text a screen reader gets below. */}
                                    <span aria-hidden="true">{tab.label}</span>
                                    <span className="sr-only">{tab.full}</span>
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

                        {/* card.css `.remarks`: the slip of gold paper under the tabs, only when
                            the record carries a remark. */}
                        {selectedMember.remarks && !isEditing && (
                            <p className="record-rise mt-[18px] rounded-lg bg-accent-soft px-3 py-2.5 text-sm text-ink">
                                <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-ink">Remarks</span>
                                {selectedMember.remarks}
                            </p>
                        )}

                        <div
                            key={activeTab}
                            className={cn("pt-[18px] text-sm", tabDirection === "fwd" ? "tab-enter-fwd" : "tab-enter-back")}
                        >
                            {activeTab === "personal" && (
                                <div className="fieldgroup grid grid-cols-2 gap-x-4 gap-y-3.5 max-sm:grid-cols-1">
                                    <Detail label="Title" value={editForm.title} isEditing={isEditing} options={titleOptions} onChange={handleEditChange("title")} />
                                    <Detail label="Initials" value={editForm.initials} isEditing={isEditing} onChange={handleEditChange("initials")} error={fieldErrors.initials} />
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
                                        kind={editForm.identityType === IDENTITY_TYPE_PASSPORT ? "reference" : "identifier"}
                                        required
                                    />
                                    {/* 🔴 `04.2`: was a native <input type="date"> reached through
                                        `Detail`'s `type` prop -- one of the three the P3 box
                                        could not close, because BR-10 owned this file until
                                        now. The I.D.-derived case stays read-only text: it is
                                        computed from the identity number, not typed. */}
                                    {editForm.identityType === "I.D. Number" ? (
                                        <Detail label="Date of Birth" value={recordDate(editForm.dateOfBirth)} isEditing={isEditing} disabled onChange={handleEditChange("dateOfBirth")} />
                                    ) : isEditing ? (
                                        <DateField
                                            label="Date of Birth"
                                            value={editForm.dateOfBirth || ""}
                                            required={editForm.identityType === IDENTITY_TYPE_PASSPORT}
                                            error={fieldErrors.dateOfBirth || undefined}
                                            max="today"
                                            onChange={(e) => setEditForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                                        />
                                    ) : (
                                        <Detail label="Date of Birth" value={recordDate(editForm.dateOfBirth)} isEditing={false} />
                                    )}
                                    <Detail label="Gender" value={editForm.gender} isEditing={isEditing} options={editForm.identityType === "I.D. Number" ? null : genderOptions} onChange={handleEditChange("gender")} disabled={editForm.identityType === "I.D. Number"} />
                                    <Detail label="Race" value={editForm.race} isEditing={isEditing} options={raceOptions} onChange={handleEditChange("race")} />
                                    <Detail label="Cellphone Number" value={editForm.phone} isEditing={isEditing} onChange={handleEditChange("phone")} kind="tel" error={fieldErrors.phone} />
                                    <Detail label="Work Tel" value={editForm.workTel} isEditing={isEditing} onChange={handleEditChange("workTel")} kind="tel" error={fieldErrors.workTel} />
                                    <Detail label="Home Tel" value={editForm.homeTel} isEditing={isEditing} onChange={handleEditChange("homeTel")} kind="tel" error={fieldErrors.homeTel} />
                                    <div className="col-span-full">
                                        {isEditing ? (
                                            <AddressAutocomplete label="Residential Address" value={editForm.address} onChange={handleEditChange("address")} placeholder="Update residential location address strings..." />
                                        ) : (
                                            <Detail label="Residential Address" value={selectedMember.address} isEditing={false} />
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === "employment" && (
                                <div className="fieldgroup grid grid-cols-2 gap-x-4 gap-y-3.5 max-sm:grid-cols-1">
                                    <Detail label="Employee Number" value={editForm.employeeNumber} isEditing={isEditing} onChange={handleEditChange("employeeNumber")} kind="reference" />
                                    <Detail label="Bank Where Employed" value={editForm.bankName} isEditing={isEditing} {...refs.field('banks')} options={bankOptions} error={fieldErrors.bankName} required={editForm.paymentType === "Debit Order"} onChange={handleEditChange("bankName")} />
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
                                                options={DEBIT_DAY_OPTIONS}
                                                error={fieldErrors.debitDay}
                                                onChange={handleEditChange("debitDay")}
                                            />
                                        </>
                                    )}
                                    <Detail label="IBT No." value={editForm.ibtNo} isEditing={isEditing} onChange={handleEditChange("ibtNo")} kind="identifier" error={fieldErrors.ibtNo} />
                                    <div className="col-span-full">
                                        {isEditing ? (
                                            <AddressAutocomplete label="Bank Work Address" value={editForm.bankAddress} onChange={handleEditChange("bankAddress")} placeholder="Search coordinates..." />
                                        ) : (
                                            <Detail label="Bank Address" value={selectedMember.bankAddress} isEditing={false} />
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === "membership" && (
                                <div className="fieldgroup grid grid-cols-2 gap-x-4 gap-y-3.5 max-sm:grid-cols-1">
                                    <Detail label="Date Joined Sasbo" value={recordDate(selectedMember.joinDate)} isEditing={false} />
                                    <Detail label="Account Membership Status" value={editForm.status} isEditing={isEditing} options={statusOptions} onChange={handleEditChange("status")} />
                                    <h4 className="col-span-full mt-1.5 border-t border-line pt-[18px] text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Sasbo Subscription Fee Details</h4>
                                    {/* 🔴 A MEMBER WITH NO SUBSCRIPTION ON FILE WAS SHOWN R182.77, MONTHLY (`06.4`) -- two invented
                                        facts about their money, printed as if the record held them. The absence is said instead. */}
                                    <Detail label="Monthly Subscription (ZAR)" value={notOnFile(selectedMember.monthlySubscription)} isEditing={false} />
                                    <Detail label="Billing Frequency" value={notOnFile(selectedMember.subscriptionFrequency)} isEditing={false} />
                                </div>
                            )}

                            {activeTab === "representatives" && (
                                <div className="fieldgroup grid grid-cols-2 gap-x-4 gap-y-3.5 max-sm:grid-cols-1">
                                    {/* 🗣️ 03.9 -- ALL THREE, AND NONE OF THEM EDITABLE FROM HERE. The stakeholder:
                                        recruitment "should only show ... should not be editable from there". It showed
                                        TWO, and not because the third was hidden: "Recruiter Type" had no field
                                        anywhere until 03.8 gave the capture screen one.

                                        🔑 "Area's Recruiter" is GONE rather than relabelled (R2/RE-3). It read
                                        `areasRep`, which held a PERSON chosen from the recruiter list, under an
                                        area-shaped name. `areaRecruited` is a different field carrying a different
                                        kind of thing; showing the old value under the new label would have been the
                                        same defect with a corrected word on it.

                                        Read-only here, editable on capture: a recruiter is assigned where the member
                                        is captured, and these three are a historical fact about that moment. */}
                                    <Detail label="Recruiter Type" value={editForm.recruitedHow} isEditing={false} />
                                    <Detail label="Area Recruited" value={editForm.areaRecruited} isEditing={false} />
                                    <Detail label="Recruiter" value={editForm.recruitmentRepresentativeName} isEditing={false} />
                                </div>
                            )}

                            {activeTab === "structures" && (
                                <div className="space-y-5">
                                    <div className="border-b border-line pb-3">
                                        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">SASBO structures</h3>
                                    </div>

                                    {/* 🗣️ THE STAKEHOLDER'S SHAPE, 2026-09-17, and the owner's "only these fields":
                                        Shop Steward? · BEC Member? → COSATU Member? → the two COSATU structures.
                                        🔴 COSATU IS NESTED UNDER BEC AGAIN, AND THIS TIME IT IS THE RULE, NOT A DEFECT.
                                        `04.2` (N5 / BR-15) un-nested it because nothing then said BEC was a
                                        prerequisite; the stakeholder has now said it is -- "for a member to participate
                                        in COSATU structures, they have to be within the BEC structure" -- and the server
                                        refuses COSATU without BEC (`MemberValidator.validateStructures`). A COSATU Local
                                        and a COSATU Region are structures a member SITS ON, so each is a yes/no, not a
                                        name. BEC committee, recruiter, structure-representative and executive
                                        sub-questions, the election date and COSATU positions are gone from the screen:
                                        none of them had a column (CM-05), so nothing they held was ever stored. */}
                                    {isEditing ? (
                                        <div className="space-y-6">
                                            <Detail label="Shop Steward?" value={yesNo(editForm.isShopSteward)} isEditing={true} options={["Yes", "No"]} onChange={(e) => {
                                                setEditForm(prev => ({ ...prev, isShopSteward: e.target.value === "Yes" }));
                                            }} />

                                            <div className="border-t border-line pt-4">
                                                <Detail label="BEC (Branch Executive Committee) Member?" value={yesNo(editForm.isBec)} isEditing={true} options={["Yes", "No"]} onChange={(e) => {
                                                    const isYes = e.target.value === "Yes";
                                                    // Leaving BEC leaves COSATU with it: the one cannot be held without the other.
                                                    setEditForm(prev => ({
                                                        ...prev,
                                                        isBec: isYes,
                                                        ...(!isYes ? { isCosatu: "N", isCosatuLocal: false, isCosatuRegional: false } : {}),
                                                    }));
                                                }} />

                                                {editForm.isBec === true && (
                                                    <div className="mt-4 space-y-4 border-l border-line pl-4">
                                                        <Detail label="COSATU Member?" value={isCosatuMember(editForm) ? "Yes" : "No"} isEditing={true} options={["Yes", "No"]} onChange={(e) => {
                                                            const isYes = e.target.value === "Yes";
                                                            setEditForm(prev => ({
                                                                ...prev,
                                                                isCosatu: isYes ? "Y" : "N",
                                                                ...(!isYes ? { isCosatuLocal: false, isCosatuRegional: false } : {}),
                                                            }));
                                                        }} />

                                                        {isCosatuMember(editForm) && (
                                                            <div className="grid grid-cols-1 gap-4 border-l border-line pl-4 md:grid-cols-2">
                                                                <Detail label="Sits on a COSATU Local structure?" value={yesNo(editForm.isCosatuLocal)} isEditing={true} options={["Yes", "No"]} onChange={(e) => setEditForm(prev => ({ ...prev, isCosatuLocal: e.target.value === "Yes" }))} />
                                                                <Detail label="Sits on a COSATU Regional structure?" value={yesNo(editForm.isCosatuRegional)} isEditing={true} options={["Yes", "No"]} onChange={(e) => setEditForm(prev => ({ ...prev, isCosatuRegional: e.target.value === "Yes" }))} />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">Core Appointments</h4>
                                            <Detail label="Shop Steward" value={yesNo(selectedMember.isShopSteward, "Not recorded")} isEditing={false} />
                                            <Detail label="BEC Member" value={yesNo(selectedMember.isBec, "Not recorded")} isEditing={false} />
                                            {(selectedMember.isBec === true || isCosatuMember(selectedMember)) && (
                                                <div className="space-y-3 border-l border-line pl-4">
                                                    <Detail label="COSATU Member" value={isCosatuMember(selectedMember) ? "Yes" : "No"} isEditing={false} />
                                                    {isCosatuMember(selectedMember) && (
                                                        <>
                                                            <Detail label="COSATU Local structure" value={yesNo(selectedMember.isCosatuLocal, "Not recorded")} isEditing={false} />
                                                            <Detail label="COSATU Regional structure" value={yesNo(selectedMember.isCosatuRegional, "Not recorded")} isEditing={false} />
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </Modal>

            <ConfirmDialog
                open={Boolean(pendingSave)}
                onOpenChange={closeOn(() => { if (!savingRecord) setPendingSave(null); })}
                title="Save these changes?"
                confirmLabel="Save changes"
                cancelLabel="Keep editing"
                destructive={false}
                onConfirm={commitSave}
                loading={savingRecord}
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

            <ConfirmDialog
                open={Boolean(pendingLeave)}
                onOpenChange={closeOn(() => setPendingLeave(null))}
                title="Discard your changes?"
                description={`The changes to ${personName(selectedMember) || "this record"} have not been saved.`}
                confirmLabel="Discard changes"
                cancelLabel="Keep editing"
                onConfirm={discardAndLeave}
            />
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
/** An edit with changes: the form no longer serialises to the record it started from. */
function recordIsDirty({ isEditing, baseline, editForm }) {
    return isEditing && baseline !== null && JSON.stringify(editForm) !== baseline;
}

function Detail({ label, value, isEditing, onChange, className = "", options = null, kind = "text", error = null, disabled = false, required = false, loadError = null, onRetryLoad }) {
    if (!isEditing) {
        /* card.css `.field`: the label in small capitals, the value in ink, no box around
           either -- a record reads as a record, not as a form with its inputs disabled. */
        return (
            <div className={cn("field record-rise min-w-0", className)}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">{label}</p>
                <p className="min-h-[21px] text-base font-medium text-ink [overflow-wrap:anywhere]">{value || "—"}</p>
            </div>
        );
    }

    /*
     * 🔑 `loadError` IS NOT `error` -- `error` says the VALUE is wrong, `loadError` that the CHOICES never
     * arrived. `SelectInput` renders a failed list since `06.4`; this adapter carried its own copy of that
     * state, as `CaptureMember`'s `Field` did, and now passes the pair on. (`Detail` is the read/edit twin
     * of that `Field`; the props are deliberately named the same on both.)
     */
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
                loadError={loadError}
                onRetryLoad={onRetryLoad}
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
