import { useDeferredValue, useEffect, useMemo, useState, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import { useNavigate, useLocation, useOutletContext } from "react-router-dom";
import {
    LucideUserRoundPlus, AlertCircle, CircleCheck, Printer, SlidersHorizontal,
    Pencil, Check,
} from "lucide-react";
import { memberService } from "../../services/memberService.js";
import { jobGradeService } from "../../services/jobGradeService.js";
import { bankService } from "../../services/bankService.js";
import { TextInput, SearchableSelect, SelectInput, Button, DateField } from "../../components/form";
import StatusChip, { CANCELLED_STATUSES } from "../../components/common/StatusChip.jsx";
import Table from "../../components/table/Table.jsx";
import { ConfirmDialog, closeOn } from "../../components/overlay/Modal.jsx";
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
import Criteria, { CRITERION } from "../../components/common/Criteria.jsx";
import Pager from "../../components/common/Pager.jsx";
import KeyHints from "../../components/common/KeyHints.jsx";
import Sheet from "../../components/common/Sheet.jsx";
import useReferenceData from "../../hooks/useReferenceData.js";
import reportError from "../../lib/reportError.js";
import { parseDate, sameDate, today } from "../../lib/format.js";
import { cn } from "../../lib/utils";
import { personName } from "../../lib/names.js";

const PAGE_SIZE = memberService.getPageSize();

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

/*
 * 🗣️ WHERE EACH OF THE FIVE SECTIONS SITS IN THE RECORD'S TAB STRIP -- the owner's
 * arrangement, settled over three rounds on 2026-09-10:
 *
 *     Personal                      Membership
 *                  Employment
 *     Recruitment                    Structures
 *
 * ① Three columns, so the sections line up under each other whatever the width. Left to
 *    `flex-wrap` the strip broke 4+1 on a 448px panel and 3+2 on the owner's own window,
 *    because the split was whatever the labels happened to measure.
 * ② The last section takes the THIRD column, not the second -- *"so that there's a gap in
 *    the middle between Recruitment and Structures."*
 * ③ That leaves the middle column holding one tab where the outer two hold two, so it spans
 *    both rows and centres in them -- *"right in the center, relative to all the other panel
 *    tabs."*
 * ④ And the strip is SYMMETRICAL about its own centre line: the left column reads from the
 *    left edge, the right column to the right edge, and the middle one is centred. Aligning
 *    all three from the left is what left "Membership" and "Structures" ending in different
 *    places and the whole block leaning.
 *
 * It is a list rather than three conditionals because it is one composition, and a
 * composition is easier to check when you can see it. It applies only at five sections --
 * a sixth would fill a 3x2 grid with nothing left to balance, so any other count falls back
 * to the plain left-aligned flow.
 */
const TAB_PLACE = TABS.length === 5
  ? [
      'justify-self-start',
      'row-span-2 justify-self-center self-center',
      'justify-self-end',
      'justify-self-start',
      'col-start-3 justify-self-end',
    ]
  : [];

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

const normalizePaymentType = (paymentType) => paymentType === "Payroll Deduction" ? "Payroll" : paymentType;

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
const UNLISTED_KEYS = ["id", "membershipNumber", "memberId", "becCommitteeName"];

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

/** A value as a person reads it. */
const readable = (key, value) => {
    const shown = comparable(key, value);
    if (typeof shown === "boolean") return shown ? "Yes" : "No";
    if (key === "becCommitteeId") return SASBO_BEC_BRANCHES.find((branch) => branch.id === shown)?.name ?? (shown || "—");
    if (key === "becStructures" || key === "cosatuPositions") return shown ? String(shown).split(",").join(", ") : "none";
    return shown === "" ? "—" : String(shown);
};

const fieldLabel = (key) =>
    RECORD_FIELD_LABELS[key] || MEMBER_FIELD_LABEL_MAP[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

const getChangedFields = (draft, original) => Object.keys(draft)
    .filter((key) => !UNLISTED_KEYS.includes(key))
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
};

export default function Members() {
    const navigate = useNavigate();
    const location = useLocation();
    const [filters, setFilters] = useState(() => getInitialFilters(location.state));
    const [page, setPage] = useState(1);
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
            if (e.key !== "Escape") return;
            // An Escape something nearer has already answered -- the date picker, a
            // dialog, a listbox -- is not a request to close the whole record. Without this
            // guard, Escape in the calendar of the edit form threw the member away.
            if (e.defaultPrevented || e.target?.closest?.('[role="dialog"], [role="listbox"]')) return;
            // `06.5`: through the same guard as every other way out -- an edit with changes asks first.
            if (leaveRef.current) {
                leaveRef.current();
                return;
            }
            closeRecord();
            setIsEditing(false);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    useEffect(() => {
        if (selectedMember) {
            // List fields arrive as lists: memberService.normalizeMember unfolds the server's
            // "PEC,CEC" once, for every consumer (A37 / A38).
            const normalized = { ...selectedMember, paymentType: normalizePaymentType(selectedMember.paymentType) };
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
        /*
         * 🔴 THE GRADE IS NOT CLEARED HERE, AND MAIN'S e56dbe4 CLEARED IT HERE. An effect on
         * `editForm.bankName` cannot tell a user changing the bank from the form being LOADED
         * with a member -- opening a record copies the member in, `bankName` goes from nothing
         * to their bank, and the reset blanked the grade the record panel then displayed as
         * "—" for every member. The clear lives in `handleEditChange` now, on the bank field's
         * own change, which only a person can cause. Proved by `Members.jobGrade.test.jsx`:
         * ① reddened on the merged code, and ③ holds that a real change of bank still clears it.
         */
        if (!editForm.bankName) {
            // No bank, no grades: grades are per bank, so an empty list is the honest answer.
            setJobGradeOptions([]);
            setJobGradeError(null);
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
        if (isEditing) {
            // Cancel is the one way out that is itself the discard, so it does not ask; it does put the record's own
            // values back, so the page read after it is the record rather than the edit that was thrown away.
            endEdit();
            return;
        }
        const start = { ...selectedMember, paymentType: normalizePaymentType(selectedMember?.paymentType) };
        setEditForm(start);
        setEditBaseline(JSON.stringify(start));
        setFieldErrors({});
        setIsEditing(true);
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

            // Main's intent (e56dbe4), in the one place it can be told apart from a record
            // loading: a grade belongs to a bank, so choosing a DIFFERENT bank clears it.
            if (field === "bankName" && value !== prev.bankName) {
                next.jobGrade = "";
            }

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
        try {
            await memberService.updateMember(editForm);
            const refreshed = await memberService.getMembers();
            const list = Array.isArray(refreshed) ? refreshed : (refreshed.data || refreshed.members || []);
            setPendingSave(null);
            setMembersList(list);
            setSelectedMember({ ...editForm });
            setEditBaseline(null);
            setIsEditing(false);
            setSavedName([editForm.firstNames, editForm.surname].filter(Boolean).join(" "));
            setShowSavedNotification(true);
            window.setTimeout(() => setShowSavedNotification(false), 2600);
        } catch (error) {
            reportError("Members.save", error);
            // 06.1 owns the shared error CONTRACT; what this wave owes the screen is that
            // a failed save is visible on the screen the member is looking at, rather than
            // in a dialog they dismiss and a console they never open.
            setPendingSave(null);
            setSaveNotice({
                kind: "failed",
                messages: ["We could not save these changes. Nothing was written — please try again."],
            });
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

    const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE)), [filteredMembers]);
    useEffect(() => {
        setPage((currentPage) => Math.min(currentPage, totalPages));
    }, [totalPages]);

    const startIndex = (page - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, filteredMembers.length);
    const visibleMembers = useMemo(() => filteredMembers.slice(startIndex, endIndex), [filteredMembers, startIndex, endIndex]);

    const handleClear = () => {
        setFilters({ ...EMPTY_FILTERS });
        setSearch?.("");
        setPage(1);
    };

    const formatBackendDate = (dateVal) => {
        // Empty, not "-": `Detail` prints the record's own "—" for a value that is not there,
        // and a hyphen beside it read as a different mark for the same absence (`06.3`).
        if (!dateVal) return "";
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
                        onRetry={loadMembers}
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
            {showSavedNotification && (
                <div
                    role="status"
                    className="kind-in fixed bottom-[84px] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-[10px] bg-ink px-3.5 py-2.5 text-[13.5px] font-medium text-bg shadow-(--shadow-2)"
                >
                    <CircleCheck size={16} strokeWidth={2} aria-hidden="true" className="text-brand" />
                    <span>{savedName ? `${savedName}’s record saved` : "Changes saved"}</span>
                </div>
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
            <MemberPanel
                member={selectedMember}
                open={Boolean(selectedMember) && !panelClosing}
                onClose={requestCloseRecord}
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
                            {/* 🗣️ PRINT IS LIVE (the owner, 2026-09-09) and the member record is
                                the first thing to get a real print layout: index.css hides the
                                shell and every control, drops the record to a single column, and
                                forces the light theme so a dark-mode user does not print a black
                                page. The mock's foot has Edit alone; print earns the one quiet
                                control beside it. */}
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
                        {/* 🔴 FIVE TABS WRAPPED TO THREE ROWS IN THE PANEL. Docked, the record
                            is a `clamp(360px, 32vw, 448px)` column, and "Personal Information",
                            "Employment & Bank", "Membership & Subscriptions", "Recruitment
                            Channel" and "Sasbo Structures" do not fit across it — so the strip
                            broke into three stacked lines with the rule under only the last of
                            them, and the record's own heading took 90px before a single field.
                            The mock's tab strip is ONE line with a rule under it, and one line
                            is what it stays: the row scrolls sideways instead of wrapping.
                            The scrollbar itself is hidden: `scroll-quiet` draws a THIN one,
                            which laid a second horizontal line directly on top of the strip's
                            own rule. The tabs are their own affordance — the cut-off edge of
                            the next label is what says there is more. */}
                        <div className="no-print mt-4 border-b border-line">
                        {/* 🔑 IT WRAPS. IT DOES NOT SCROLL — AND THE MOCK SETTLED THAT.
                            `card.css:357` is `.tabs { display: flex; flex-wrap: wrap; }` at
                            13px: every section is on screen, always, and nothing is reached by
                            swiping. This build had it scrolling for one round, and the owner
                            put it plainly — *"I didn't even know they were there until I opened
                            up the console. There mustn't be any trickyness to it."* A tab you
                            cannot see is a tab that does not exist, and a fading edge is a hint,
                            not a control.

                            What made wrapping look wrong before was not the wrap. It was FIVE
                            LONG LABELS breaking into three ragged rows, with the rule under only
                            the last of them. Short labels at the mock's own 13px fit two, and the
                            rule sits on the wrapper so it runs under the whole block the way
                            `.tabs`'s `border-bottom` does.

                            📐 THREE COLUMNS, NOT `flex-wrap` — AND THE DIFFERENCE IS THAT THIS
                            ONE IS THE SAME EVERY TIME. Left to wrap, the strip broke 4+1 on a
                            448px panel and 3+2 on the owner's own window, because the split was
                            whatever the labels happened to measure at that width. A grid gives
                            the five sections three fixed columns, so they line up under each
                            other in both rows and the arrangement does not change with the
                            window. `justify-self-start` keeps each button its own width, so the
                            active underline stays under the LABEL and not under the column.

                            🗣️ The last tab is placed in the third column rather than the second,
                            at the owner's instruction: *"Make structures aligned under Membership
                            so that there's a gap in the middle between Recruitment and
                            Structures."* The gap is the point -- it reads as a deliberate
                            arrangement rather than as a row that ran out. */}
                        <div className="grid grid-cols-3 gap-x-0.5">
                            {TABS.map((tab, index) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    aria-current={activeTab === tab.id ? "true" : undefined}
                                    onClick={() => changeTab(tab.id)}
                                    className={cn(
                                        // card.css:358 -- 13px, not 14: the strip is a quiet index of the record, not a
                                        // second row of headings, and the extra pixel is what pushed it to three rows.
                                        "touch-target inline-flex items-center justify-self-start gap-1 whitespace-nowrap px-[9px] pb-[11px] pt-[9px] text-[13px] font-medium",
                                        // Where this one sits in the composition -- see `TAB_PLACE`.
                                        TAB_PLACE[index],
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
                                        <Detail label="Date of Birth" value={editForm.dateOfBirth ? formatDate(editForm.dateOfBirth) : ""} isEditing={isEditing} disabled onChange={handleEditChange("dateOfBirth")} />
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
                                    <Detail label="Employee Number" value={editForm.employeeNumber} isEditing={isEditing} onChange={handleEditChange("employeeNumber")} kind="identifier" />
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
                                                options={["20", "25", "31"]}
                                                error={fieldErrors.debitDay}
                                                onChange={handleEditChange("debitDay")}
                                            />
                                        </>
                                    )}
                                    <Detail label="IBT No." value={editForm.ibtNo} isEditing={isEditing} onChange={handleEditChange("ibtNo")} kind="identifier" />
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
                                    <Detail label="Date Joined Sasbo" value={formatBackendDate(selectedMember.joinDate)} isEditing={false} />
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
                                    {/* Main (client bf547c1, 4a7a67b): renamed to the words the union uses, and
                                        read-only on the record -- a recruiter is assigned where the member is
                                        captured, not reassigned from here. */}
                                    <Detail label="Recruiter" value={editForm.recruitmentRepresentativeName} isEditing={isEditing} disabled={true} />
                                    <Detail label="Area's Recruiter" value={editForm.areasRep} isEditing={isEditing} disabled={true} />
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
            </MemberPanel>

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
