import { useRef, useState, useEffect, useMemo } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { memberService } from "../../services/memberService.js";
import { recruiterService } from "../../services/recruiterService.js";
import { jobGradeService } from "../../services/jobGradeService.js";
import { bankService } from "../../services/bankService.js";
import PageTitle from "../../components/common/PageTitle";
import {
    Button, CheckboxGroup, DateField, PositionTreeSelect, SearchableSelect, SelectInput, TextInput,
} from "../../components/form";
import {
    FREQUENCY_OPTIONS, TITLE_OPTIONS, RACE_OPTIONS, PAYMENT_TYPE_OPTIONS,
    STATUS_OPTIONS, IDENTITY_TYPE_OPTIONS, GENDER_OPTIONS, YES_NO_OPTIONS,
    SUSPENSION_CODE_OPTIONS, MEMBER_TABS,
    BRANCH_OPTIONS, EMPLOYMENT_TYPE_OPTIONS, DEBIT_DAY_OPTIONS
} from "../../config/memberConstants.js";
import { validateSAID, validateEmail, extractDateOfBirthFromSAID, extractGenderFromSAID,
    formatDate } from "../../utils/validateSAID.js";
import AddressAutocomplete from "../../components/form/AddressAutocomplete";
import DataState from "../../components/common/DataState";
import { cn } from "../../lib/utils";
import useReferenceData from "../../hooks/useReferenceData.js";

// 44 Unique SASBO Branches for Primary Selection Dropdown
const SASBO_BRANCHES = [
    "Absa Johannesburg Central", "Absa Pretoria", "Absa Cape Town", "Absa Durban", "Absa Gqeberha",
    "Standard Bank Gauteng South", "Standard Bank KZN", "Standard Bank Western Cape", "Standard Bank Eastern Cape",
    "Nedbank Wits & Pretoria", "Nedbank Coastal", "Capitec Western Cape", "Capitec Gauteng", "FNB Corporate HQ",
    "FNB Regional West", "FNB Eastern Cape", "FNB KZN Area", "Discovery Bank National", "TymeBank Johannesburg",
    "African Bank Midrand", "Bidvest Bank Regional", "Albaraka Bank National", "Mercantile Bank Central",
    "HBZ Bank South Africa", "Sasfin Bank Gauteng", "Grindrod Bank Coastal", "Investec Sandton", "Investec Cape Town",
    "SARB Pretoria HQ", "SARB Johannesburg", "SARB Cape Town Branch", "SARB Durban Branch", "Finbond National",
    "Ubank Mining Belt North", "Ubank Mining Belt South", "Postbank Free State", "Postbank Limpopo",
    "Land Bank Head Office", "Development Bank SA", "SNG Grant Thornton", "Santam Johannesburg",
    "Old Mutual Financial Services", "Hollard Insurance Group", "Regent Insurance National"
];

// BEC Structure Representative Options (Multiple Selection Allowed)
const STRUCTURE_REP_OPTIONS = [
    "INC / IC", "NCF / SJC", "VP", "President", "MANCOM", "Resolutions Committee"
];

// BEC Executive Positions (Only One Position Allowed)
const BEC_EXECUTIVE_POSITIONS = [
    "Chairperson", "Deputy Chairperson", "Secretary", "Deputy Secretary", "Treasurer"
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
    becBranchName: "structures",
    becExecutivePosition: "structures"
};


/**
 * THE FOUR REFERENCE LISTS THIS FORM LOADS ON MOUNT. `06.1b`, EH-D9.
 *
 * 🔴 ALL FOUR SWALLOWED THEIR FAILURES -- two as `.catch(err => console.error(...))`, two
 * as `.catch(() => setThing([]))`. On a capture form that is the worst place in the
 * application for a silent empty list: an administrator who cannot find the member's bank
 * does not conclude the server is down, they pick the closest bank they can see. The failure
 * does not stop the work, it corrupts the record -- and the record is a person's union
 * membership.
 *
 * 🔑 THE FIFTH LIST, JOB GRADES, IS NOT HERE and that is not an oversight. It depends on
 * the chosen bank, so it is not a mount fetch at all; it has its own effect, its own error
 * state and its own retry, and it is where A25 was closed.
 */
const REFERENCE_LOADERS = {
    recruiters: () => recruiterService.getAll(),
    structures: () => recruiterService.getStructures(),
    'bank branches': () => bankService.getBankListing(),
    banks: () => bankService.getBankNames(),
};

export default function CaptureMember() {
    const [activeTab, setActiveTab] = useState("personal");
    const [form, setForm] = useState({
        title: "",
        initials: "",
        firstNames: "",
        surname: "",
        identityType: "",
        identityNumber: "",
        dateOfBirth: "",
        gender: "",
        race: "",
        personalEmail: "",
        workEmail: "",
        preferredEmail: "personal",
        phone: "",
        workTel: "",
        homeTel: "",
        address: "",
        joinDate: new Date().toISOString().split("T"),
        status: "Active",
        monthlySubscription: "",
        subscriptionFrequency: "Monthly",
        employeeNumber: "",
        jobGrade: "",
        bankName: "",
        bankAccountNumber: "",
        branch: "",
        employmentType: "",
        ibtNo: "",
        paymentType: "Debit Order",
        debitDay: "20",
        bankAddress: "",
        workBankAddress: "",
        recruitmentRep: "",
        areasRep: "",
        repElectionDay: "",
        repElectionMonth: "",
        repElectionYear: "",
        electedRep: "N",
        remarks: "",
        remarks2: "",
        remarks3: "",
        remarks4: "",
        memnetMember: "N",
        printLabelForPostage: "Y",
        suspensionCode: "",
        useAltAddress: "N",
        deductACB: "Y",
        printMembershipCards: "Y",
        homeLoanReducedRateOption: "N",
        structure1: "",

        // Exact Flow diagram state bindings
        isShopSteward: "N",
        shopStewardElectionDate: "",
        isBecMember: "N",
        becBranchName: "", // Choice among the 44 unique branches
        isBecRecruiter: "N",
        isBecStructureRep: "N",
        selectedBecStructures: [], // Array for MULTIPLE STRUCTURES ALLOWED
        isBecExecutive: "N",
        becExecutivePosition: "", // Single Selection Allowed

        // COSATU Structure
        isCosatu: "N",
        isCosatuLocal: "",
        isCosatuRegional: "",
        cosatuPositions: [] // Multi-select: PEC, CEC, Treasurer, Chairperson, Secretary
    });

    const [fieldErrors, setFieldErrors] = useState({});
    const [showSavedNotification, setShowSavedNotification] = useState(false);
    /*
     * ✅ THE FOUR SILENT MOUNT LOADS, REPLACED BY ONE SET (EH-D9).
     *
     * They were two effects and four swallowing catches, in two separate places in this
     * file. One call, and -- the part that could not be done with four `useState`s -- a
     * `partial` state that knows THREE OF FOUR ANSWERED and can say which one did not.
     */
    const refs = useReferenceData(REFERENCE_LOADERS);
    const reps = refs.data.recruiters;
    const structures = refs.data.structures;
    const bankListing = refs.data['bank branches'];
    const bankNames = refs.data.banks;

    const tabsWithErrors = useMemo(() => {
        const errorTabs = new Set();
        Object.keys(fieldErrors).forEach((field) => {
            const mappedTab = FIELD_TO_TAB_MAP[field];
            if (mappedTab) errorTabs.add(mappedTab);
        });
        return errorTabs;
    }, [fieldErrors]);

    const handleChange = (field) => (event) => {
        let rawValue = event.target.value;

        if (field === "identityNumber" && form.identityType === "I.D. Number" && rawValue.length > 13) {
            rawValue = rawValue.substring(0, 13);
        }

        const hasNonNumericInput =
            field === "identityNumber" && form.identityType === "I.D. Number" &&
            /\D/.test(rawValue);
        const value =
            field === "identityNumber" && form.identityType === "I.D. Number"
                ? rawValue.replace(/\D/g, "")
                : rawValue;

        setForm((prev) => {
            let updatedForm = { ...prev, [field]: value };

            if (field === "firstNames") {
                const autoInitials = value
                    .trim()
                    .split(/\s+/)
                    .map(name => name.charAt(0).toUpperCase())
                    .join("");
                updatedForm.initials = autoInitials;
            }

            if (field === "isShopSteward" && value === "N") {
                updatedForm.shopStewardElectionDate = "";
            }
            if (field === "isBecMember" && value === "N") {
                updatedForm.becBranchName = "";
                updatedForm.isBecRecruiter = "N";
                updatedForm.isBecStructureRep = "N";
                updatedForm.selectedBecStructures = [];
                updatedForm.isBecExecutive = "N";
                updatedForm.becExecutivePosition = "";
            }
            if (field === "isBecStructureRep" && value === "N") {
                updatedForm.selectedBecStructures = [];
            }
            if (field === "isBecExecutive" && value === "N") {
                updatedForm.becExecutivePosition = "";
            }
            if (field === "isCosatu" && value === "N") {
                updatedForm.cosatuLocal = "";
                updatedForm.cosatuRegion = "";
                updatedForm.cosatuPositions = [];
            }

            return updatedForm;
        });

        setFieldErrors((prev) => {
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
            return newErrors;
        });

        if (field === "identityNumber" && form.identityType === "I.D. Number") {
            const error = hasNonNumericInput
                ? "Only numbers are allowed for I.D. Number"
                : validateSAID(value);
            if (error) {
                setFieldErrors((prev) => ({ ...prev, [field]: error }));
            } else if (value.length === 13) {
                const dob = extractDateOfBirthFromSAID(value);
                const gender = extractGenderFromSAID(value);
                if (dob) setForm((prev) => ({ ...prev, dateOfBirth: dob }));
                if (gender) setForm((prev) => ({ ...prev, gender }));
            }
        }

        if (field === "identityType") {
            setForm((prev) => ({ ...prev, dateOfBirth: "", gender: "" }));
        }

        if (field === "personalEmail" || field === "workEmail") {
            const error = validateEmail(value);
            if (error) setFieldErrors((prev) => ({ ...prev, [field]: error }));
        }
    };

    // `handleStructureCheckboxChange` lived here until `05.4`: eighteen lines of per-checkbox
    // add/remove bookkeeping that nothing had called since `04.2` gave the BEC structures a
    // real `CheckboxGroup`, which owns the toggle and hands back the whole next selection.
    // It survived because `no-unused-vars` was the only thing that could see it was dead.

    const validateFormBeforeSave = () => {
        const errors = {};

        if (!form.firstNames.trim()) errors.firstNames = "First Name(s) field is required";
        if (!form.surname.trim()) errors.surname = "Surname field is required";
        if (!form.identityType) errors.identityType = "Identity Type selection is required";
        if (!form.identityNumber.trim()) {
            errors.identityNumber = "Identity Number field is required";
        } else if (form.identityType === "I.D. Number" && form.identityNumber.trim().length !== 13) {
            errors.identityNumber = "Identity Number must be exactly 13 digits when I.D. Number is selected";
        }

        if (form.identityType === "Passport" && !form.dateOfBirth) {
            errors.dateOfBirth = "Date of Birth is strictly required when Passport is selected";
        }

        if (form.paymentType === "Debit Order") {
            if (!form.bankAccountNumber.trim()) errors.bankAccountNumber = "Bank Account Number is required for Debit Orders";
            if (!form.bankName.trim()) errors.bankName = "Bank Employer alignment name is required for Debit Orders";
            if (!form.branch.trim()) errors.branch = "Bank Branch selection is required for Debit Orders";

            // 🛠️ NEW VALIDATION RULE TO MATCH JAVA BACKEND
            const validDays = ["20", "25", "31", 20, 25, 31];
            if (!validDays.includes(form.debitDay)) {
                errors.debitDay = "Debit day must be one of 20, 25 or 31 when payment type is 'Debit Order'";
            }
        }

        if (form.isShopSteward === "Y" && !form.shopStewardElectionDate) {
            errors.shopStewardElectionDate = "Shop Steward Election Date is required";
        }

        if (form.isBecMember === "Y") {
            if (!form.becBranchName) errors.becBranchName = "BEC branch committee selection is required";
            if (form.isBecExecutive === "Y" && !form.becExecutivePosition) {
                errors.becExecutivePosition = "An Executive position assignment must be declared";
            }
        }

        return errors;
    };

    /**
     * What the last save attempt said. Replaces this file's two `alert()` calls.
     *
     * Focused rather than `role="alert"`: the shared `Field` gives every inline message
     * that role already, so a form failing six validations would queue seven
     * announcements at once. findings.md F-P23.
     */
    const [saveNotice, setSaveNotice] = useState(null);
    const saveNoticeRef = useRef(null);

    useEffect(() => {
        if (saveNotice) saveNoticeRef.current?.focus();
    }, [saveNotice]);

    const handleSave = () => {
        const clientSideErrors = validateFormBeforeSave();
        const mergedErrors = { ...fieldErrors, ...clientSideErrors };

        if (Object.keys(mergedErrors).length > 0) {
            setFieldErrors(mergedErrors);

            const dynamicErrorFields = Object.keys(mergedErrors);
            const firstFailedField = dynamicErrorFields[0];
            const fallbackTabContext = FIELD_TO_TAB_MAP[firstFailedField] || "personal";
            setActiveTab(fallbackTabContext);

            // 🔴 IT WAS AN `alert()` OF BULLETED LINES. A native modal blocks the thread,
            // cannot be styled, is suppressible, and -- worst on a five-tab form -- it
            // ARRIVES AND LEAVES: dismissing it returned the member to a form that looked
            // unchanged, with the list of problems now only in their memory. The summary
            // below stays on the screen, takes focus, and the tab switch above puts them
            // on the tab holding the first bad field.
            setSaveNotice({ kind: "invalid", messages: Object.values(mergedErrors) });
            return;
        }

        setSaveNotice(null);
        memberService.createMember(form)
            .then(() => {
                setShowSavedNotification(true);
                setTimeout(() => setShowSavedNotification(false), 3000);
            })
            .catch((err) => setSaveNotice({
                kind: "failed",
                messages: [`This member was not saved. ${err?.message || "Please try again."}`],
            }));
    };

    const tabs = MEMBER_TABS;
    const titleOptions = TITLE_OPTIONS;
    const raceOptions = RACE_OPTIONS;
    const statusOptions = STATUS_OPTIONS;
    const frequencyOptions = FREQUENCY_OPTIONS;
    const identityTypeOptions = IDENTITY_TYPE_OPTIONS;
    const genderOptions = GENDER_OPTIONS;
    const yesNoOptions = YES_NO_OPTIONS;
    const suspensionCodeOptions = SUSPENSION_CODE_OPTIONS;
    const [jobGradeOptions, setJobGradeOptions] = useState([]);
    const [jobGradeLoading, setJobGradeLoading] = useState(false);
    /*
     * ✅ A25's SECOND CLAUSE, `06.1b`. The register's criterion is "the method rejects AND
     * the caller renders an error", and this is the caller half. `jobGradeService.getByBank`
     * no longer swallows a failure into the (empty) static list, so a 500, a dropped
     * connection or the ten-second ceiling arrives here as a rejection in §16's shape and
     * this field says so, with a retry, instead of reading "No job grades available".
     *
     * 🔑 IT IS PER-PANEL, NOT PER-PAGE (EH-D9). Nine things load on this screen. A bank whose
     * grades cannot be fetched must not blank a capture form the user has half filled in --
     * the one field says what happened and the other eight keep working.
     */
    const [jobGradeError, setJobGradeError] = useState(null);
    // Bumped by the retry control. It is a dependency of the fetch effect, so "try again"
    // re-runs exactly the effect that failed rather than duplicating its body.
    const [jobGradeAttempt, setJobGradeAttempt] = useState(0);

    // Fetch job grades for the selected bank whenever bankName changes.
    useEffect(() => {
        let cancelled = false;
        const fetchGrades = async () => {
            if (!form.bankName) {
                setJobGradeOptions([]);
                setJobGradeError(null);
                setForm(prev => ({ ...prev, jobGrade: "" }));
                setJobGradeLoading(false);
                return;
            }

            setJobGradeLoading(true);
            setJobGradeError(null);

            // Try to resolve bank code locally from bankListing
            const normalized = String(form.bankName || '').trim().toLowerCase();
            const found = bankListing.find((b) => {
                const bn = String(b.bankName || b.name || '').trim().toLowerCase();
                return bn === normalized || bn.includes(normalized) || normalized.includes(bn);
            });
            const bankIdentifier = (found && (found.universalBranchCode || found.universal_branch_code)) || form.bankName;

            try {
                const grades = await jobGradeService.getByBank(bankIdentifier);
                if (!cancelled) setJobGradeOptions(Array.isArray(grades) ? grades : []);
            } catch (error) {
                // ⚠️ AN ABORT IS NOT A FAILURE (§16, EH-D3). A superseded request is dropped
                // silently: the state stays exactly as it was, and the field does not tell a
                // user their bank list broke because they kept typing.
                if (!cancelled && error?.kind !== 'abort') {
                    setJobGradeOptions([]);
                    setJobGradeError(error);
                }
            } finally {
                if (!cancelled) setJobGradeLoading(false);
            }
        };
        fetchGrades();
        return () => { cancelled = true; };
    }, [form.bankName, bankListing, jobGradeAttempt]);

    return (
        <div className="flex min-h-0 flex-1 flex-col px-7 pb-7 pt-[26px] text-ink max-lg:px-4">
            {/* BR-18: the page's only <h1>, from the shared component, so this route stops
                being one of the nine with no heading of its own. */}
            <PageTitle
                title="Capture Member"
                subtitle="Capture a new Sasbo member. Every required personal, employment and banking detail is checked before the record is saved."
                className="mb-5"
            />
            {/* ✅ THE FOURTH STATE, ABOVE THE FORM RATHER THAN INSIDE IT (EH-D9).

                Four reference lists fill this form's selectors. When some of them fail this
                says WHICH, before the member starts typing -- because the alternative is an
                administrator who fills in six tabs, reaches the bank field, finds it empty,
                and has no way to know whether that is a broken server or a real answer.

                🔴 IT IS A NOTICE, NOT A BLOCK. Everything that DID load still works, and a
                capture form is the last place to throw away a half-finished form over one
                dead endpoint. The retry re-runs only the lists that were asked for; nothing
                the member has typed is touched. */}
            {(refs.state === 'partial' || refs.state === 'error') && (
                <div className="mb-4 rounded-lg bg-surface p-3 shadow-(--shadow-1)">
                    <DataState
                        state={refs.state === 'error' ? 'error' : 'partial'}
                        compact
                        onRetry={refs.retry}
                        title={
                            refs.state === 'error'
                                ? 'None of this form’s option lists could be loaded.'
                                : 'Some option lists are missing.'
                        }
                        message={
                            refs.state === 'error'
                                ? 'The selectors below have nothing to offer until this succeeds. Anything you have already typed is kept.'
                                : `${refs.failed.join(', ')} did not load. Every other field on this form is ready.`
                        }
                    />
                </div>
            )}

            <div className="relative mt-2 max-w-4xl rounded-lg bg-surface shadow-(--shadow-1)">
                {showSavedNotification && (
                    <div role="status" className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 rounded-lg border border-status-active-dot bg-status-active-bg px-4 py-2 text-status-active shadow-(--shadow-2)">
                        <CheckCircle2 size={18} aria-hidden="true" />
                        <span className="text-sm font-medium">Member captured successfully!</span>
                    </div>
                )}

                {/* 🔴 WHAT REPLACED THE `alert()`. It stays on screen, it takes focus, and
                    the tab switch that runs beside it puts the member on the tab holding
                    the first bad field -- so the list of problems and the fields that
                    caused them are visible at the same time, which a modal made impossible. */}
                {saveNotice && (
                    <div
                        ref={saveNoticeRef}
                        tabIndex={-1}
                        aria-labelledby="capture-save-notice-title"
                        className="m-4 rounded-lg border border-status-suspended-dot bg-status-suspended-bg p-3 text-sm text-status-suspended focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
                    >
                        <p id="capture-save-notice-title" className="flex items-center gap-2 font-medium">
                            <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                            {saveNotice.kind === "invalid" ? "Fix these before saving" : "This member was not saved"}
                        </p>
                        <ul className="mt-1 list-disc pl-6">
                            {saveNotice.messages.map((message) => <li key={message}>{message}</li>)}
                        </ul>
                    </div>
                )}

                {/* 📱 R-RESP-J: A SCROLLABLE STRIP. Six tabs do not fit at 390px -- they
                    wrapped into crushed rows, and the last two were effectively hidden.
                    `overflow-x-auto` with `whitespace-nowrap` makes them reachable by
                    swiping, which is how a phone expects to meet a row that is too long.

                    ⚠️ Not `role="tab"`: the ARIA tabs pattern promises arrow-key
                    movement between tabs, which needs roving focus. `05.3` owns that, with
                    the shared hook RF already has on its list. `aria-current` says which
                    section is showing and promises nothing else. */}
                <div className="border-b border-line bg-surface-2">
                    <div className="flex -mb-px overflow-x-auto whitespace-nowrap px-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                aria-current={activeTab === tab.id ? "true" : undefined}
                                onClick={() => setActiveTab(tab.id)}
                                className={`touch-target inline-flex items-center gap-1 whitespace-nowrap px-[9px] pb-[11px] pt-[9px] text-sm font-medium transition-[color,box-shadow] duration-(--duration-instant) focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring ${activeTab === tab.id ? "font-semibold text-brand-ink shadow-[inset_0_-2px_0_var(--color-brand)]" : "text-ink-muted shadow-[inset_0_-2px_0_transparent] hover-hover:hover:text-ink"}`}
                            >
                                <span>{tab.label}</span>
                                {tabsWithErrors.has(tab.id) && (
                                    <>
                                        {/* The asterisk was the ONLY signal that a tab held
                                            errors -- invisible to a screen reader, and to
                                            anyone who cannot distinguish the colour. */}
                                        <span aria-hidden="true" className="text-status-suspended font-bold text-sm">*</span>
                                        <span className="sr-only">(has errors)</span>
                                    </>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                {/* Body */}
                <div className="px-6 py-8 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {activeTab === "personal" && (
                            <>
                                <Field label="Title" value={form.title} onChange={handleChange("title")} options={titleOptions} />
                                <Field label="Initials" value={form.initials} onChange={handleChange("initials")} />
                                <Field label="First Name(s)" value={form.firstNames} onChange={handleChange("firstNames")} error={fieldErrors.firstNames} required />
                                <Field label="Surname" value={form.surname} onChange={handleChange("surname")} error={fieldErrors.surname} required />
                                <Field label="Identity Type" value={form.identityType} onChange={handleChange("identityType")} options={identityTypeOptions} error={fieldErrors.identityType} required />
                                {/* 🔴 THE LABEL WAS AN INSTRUCTION: "Select Identity Type before
                                    entering", set in the small capitals every label wears, so
                                    the form appeared to shout a sentence at a field. A label
                                    names the field; the instruction is a hint under it, and it
                                    is only there while the field is actually shut. The name
                                    becomes the chosen type once there is one, which is what the
                                    member register does one screen over. */}
                                <Field
                                    label={form.identityType || "Identity Number"}
                                    note={form.identityType ? null : "Choose an identity type first."}
                                    value={form.identityNumber}
                                    onChange={handleChange("identityNumber")}
                                    error={fieldErrors.identityNumber}
                                    disabled={!form.identityType}
                                    required
                                />
                                <Field
                                    label="Date of Birth"
                                    value={form.identityType === "I.D. Number" ? formatDate(form.dateOfBirth) : form.dateOfBirth}
                                    onChange={handleChange("dateOfBirth")}
                                    type={form.identityType === "I.D. Number" ? "text" : "date"}
                                    disabled={form.identityType === "I.D. Number"}
                                    error={fieldErrors.dateOfBirth}
                                    required={form.identityType === "Passport"}
                                />
                                <Field
                                    label="Gender"
                                    value={form.gender}
                                    onChange={handleChange("gender")}
                                    options={form.identityType === "I.D. Number" ? null : genderOptions}
                                    disabled={form.identityType === "I.D. Number"}
                                />
                                <Field label="Race" value={form.race} onChange={handleChange("race")} options={raceOptions} />
                                <EmailFields form={form} setForm={setForm} handleChange={handleChange} fieldErrors={fieldErrors} />
                                <Field label="Cellphone Number" value={form.phone} onChange={handleChange("phone")} />
                                <Field label="Work Tel" value={form.workTel} onChange={handleChange("workTel")} />
                                <Field label="Home Tel" value={form.homeTel} onChange={handleChange("homeTel")} />
                                <AddressAutocomplete label="Residential Address" value={form.address} onChange={handleChange("address")} placeholder="Start typing a residential address..." className="md:col-span-2" />
                            </>
                        )}
                        {activeTab === "membership" && (
                            <>
                                <Field label="Date Joined" value={form.joinDate} onChange={handleChange("joinDate")} type="date" disabled />
                                <Field label="Status" value={form.status} onChange={handleChange("status")} options={statusOptions} disabled />
                                <SectionTitle title="Sasbo Subscription" />
                                <Field label="Monthly Subscription" value={form.monthlySubscription} onChange={handleChange("monthlySubscription")} disabled note="*reviewed annually through business discussions *" />
                                <Field label="Frequency" value={form.subscriptionFrequency} onChange={handleChange("subscriptionFrequency")} options={frequencyOptions} disabled />
                            </>
                        )}
                        {activeTab === "employment" && (
                            <>
                                <Field label="Employee Number" value={form.employeeNumber} onChange={handleChange("employeeNumber")} />
                                <Field label="Employment Type" value={form.employmentType} onChange={handleChange("employmentType")} options={EMPLOYMENT_TYPE_OPTIONS} />
                                <Field label="Bank Where Employed" value={form.bankName} onChange={handleChange("bankName")} options={bankNames} error={fieldErrors.bankName} required={form.paymentType === "Debit Order"} searchable />
                                <Field label="Job Grade" value={form.jobGrade} onChange={handleChange("jobGrade")} options={jobGradeOptions} disabled={!form.bankName} loading={jobGradeLoading} emptyLabel="No job grades available" loadError={jobGradeError} onRetryLoad={() => setJobGradeAttempt((n) => n + 1)} />
                                <Field label="Bank Branch" value={form.branch} onChange={handleChange("branch")} options={BRANCH_OPTIONS} error={fieldErrors.branch} required={form.paymentType === "Debit Order"} searchable />
                                <Field label="Payment Type" value={form.paymentType} onChange={handleChange("paymentType")} options={PAYMENT_TYPE_OPTIONS} />

                                {form.paymentType === "Debit Order" && (
                                    <>
                                        <Field label="Bank Account Number" value={form.bankAccountNumber} onChange={handleChange("bankAccountNumber")} error={fieldErrors.bankAccountNumber} required />
                                        <Field label="Debit Day" value={form.debitDay} onChange={handleChange("debitDay")} options={DEBIT_DAY_OPTIONS} />
                                    </>
                                )}
                                {form.paymentType === "Payroll" && (
                                    <p className="md:col-span-2 rounded-lg border border-line-strong bg-surface-2 p-3 text-sm text-ink-muted">
                                        Bank account details are not required for Payroll. Debit day is handled by payroll.
                                    </p>
                                )}
                                <Field label="IBT No." value={form.ibtNo} onChange={handleChange("ibtNo")} />
                                <AddressAutocomplete label="Bank Address" value={form.bankAddress} onChange={handleChange("bankAddress")} placeholder="Start typing a bank address..." className="md:col-span-2" />
                            </>
                        )}

                        {activeTab === "structures" && (
                            <>
                                <SectionTitle title="SASBO Hierarchy Core Alignment Matrix" />

                                {/* Flow node 1: Shop Steward? */}
                                <Field
                                    label="Shop Steward?"
                                    value={form.isShopSteward}
                                    onChange={handleChange("isShopSteward")}
                                    options={yesNoOptions}
                                />

                                {form.isShopSteward === "Y" && (
                                    <div className="md:col-span-2 rounded-lg border border-line bg-surface-2 p-4">
                                        <Field
                                            label="Enter Shop Steward Election Date"
                                            value={form.shopStewardElectionDate}
                                            onChange={handleChange("shopStewardElectionDate")}
                                            error={fieldErrors.shopStewardElectionDate}
                                            type="date"
                                            required
                                        />
                                    </div>
                                )}

                                {/* COSATU Structure */}
                                <Field
                                    label="COSATU Member?"
                                    value={form.isCosatu}
                                    onChange={handleChange("isCosatu")}
                                    options={yesNoOptions}
                                />

                                {form.isCosatu === "Y" && (
                                    <div className="md:col-span-2 mt-2 space-y-4 border-l border-line pl-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-accent-ink">COSATU Structure</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Field
                                                label="Local?"
                                                value={form.isCosatuLocal}
                                                onChange={handleChange("isCosatuLocal")}
                                                options={yesNoOptions}
                                            />
                                            <Field
                                                label="Regional?"
                                                value={form.isCosatuRegional}
                                                onChange={handleChange("isCosatuRegional")}
                                                options={yesNoOptions}
                                            />
                                        </div>
                                        {/* 🔴 THE `<label>` OVER THIS GROUP NAMED NOTHING --
                                            no `htmlFor`, and there is no single control to
                                            point one at -- so a screen-reader user met five
                                            checkboxes with no idea what question they
                                            answered. `CheckboxGroup` is a real <fieldset>
                                            with a <legend>, which is the element pair that
                                            exists for exactly this. */}
                                        <CheckboxGroup
                                            legend="COSATU Positions — Multiple Allowed"
                                            options={["PEC", "CEC", "Treasurer", "Chairperson", "Secretary"]}
                                            labelFor={(pos) =>
                                                pos === "PEC" ? "PEC (Provincial Executive Committee)" :
                                                pos === "CEC" ? "CEC (Central Executive Committee)" : pos}
                                            selected={form.cosatuPositions || []}
                                            onToggle={(next) => setForm(prev => ({ ...prev, cosatuPositions: next }))}
                                        />
                                    </div>
                                )}

                                {/* Flow node 2: BEC? */}
                                <Field
                                    label="BEC Member?"
                                    value={form.isBecMember}
                                    onChange={handleChange("isBecMember")}
                                    options={yesNoOptions}
                                />

                                {form.isBecMember === "Y" && (
                                    <div className="md:col-span-2 mt-2 space-y-6 border-l border-line pl-4">

                                        {/* Flow node 3: 44 BEC Committees (Single Selection branch selector) */}
                                        <Field
                                            label="Select primary BEC Committee (44 Unique Branches Available)"
                                            value={form.becBranchName}
                                            onChange={handleChange("becBranchName")}
                                            options={SASBO_BRANCHES}
                                            error={fieldErrors.becBranchName}
                                            searchable
                                            required
                                        />

                                        {/* Flow node 4: BEC Recruiter? */}
                                        <Field
                                            label="BEC Recruiter?"
                                            value={form.isBecRecruiter}
                                            onChange={handleChange("isBecRecruiter")}
                                            options={yesNoOptions}
                                        />

                                        {/* Flow node 5: BEC Structure Representative? */}
                                        <Field
                                            label="BEC Structure Representative?"
                                            value={form.isBecStructureRep}
                                            onChange={handleChange("isBecStructureRep")}
                                            options={yesNoOptions}
                                        />

                                        {form.isBecStructureRep === "Y" && (
                                            <CheckboxGroup
                                                legend="Select BEC Structure(s) — multiple allowed"
                                                options={STRUCTURE_REP_OPTIONS}
                                                selected={form.selectedBecStructures}
                                                onToggle={(next) => setForm(prev => ({ ...prev, selectedBecStructures: next }))}
                                            />
                                        )}

                                        {/* Flow node 6: BEC Executive? */}
                                        <Field
                                            label="BEC Executive?"
                                            value={form.isBecExecutive}
                                            onChange={handleChange("isBecExecutive")}
                                            options={yesNoOptions}
                                        />

                                        {form.isBecExecutive === "Y" && (
                                            <div className="rounded-lg border border-line bg-surface-2 p-4">
                                                <Field
                                                    label="Select BEC Executive Position - ONLY ONE POSITION ALLOWED"
                                                    value={form.becExecutivePosition}
                                                    onChange={handleChange("becExecutivePosition")}
                                                    options={BEC_EXECUTIVE_POSITIONS}
                                                    error={fieldErrors.becExecutivePosition}
                                                    required
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === "representatives" && (
                            <>
                                <Field label="Recruiter" value={form.recruitmentRep} onChange={handleChange("recruitmentRep")} options={reps.map(r => r.name).filter(Boolean)} searchable />
                                <Field label="Area's Recruiter" value={form.areasRep} onChange={handleChange("areasRep")} options={reps.map(r => r.name).filter(Boolean)} searchable />
                                <SectionTitle title="Elected Recruiter" />
                                <Field label="Elected Recruiter (Y/N)" value={form.electedRep} onChange={(e) => {
                                    const val = e.target.value;
                                    setForm(prev => ({
                                        ...prev,
                                        electedRep: val,
                                        ...(val === 'N' ? { repElectionDay: '', repElectionMonth: '', repElectionYear: '', structureIds: [] } : {})
                                    }));
                                }} options={yesNoOptions} />
                                {form.electedRep === 'Y' && (
                                    <>
                                        <RepElectionDatePicker form={form} setForm={setForm} />
                                        <div className="md:col-span-2">
                                            <PositionTreeSelect
                                                label="Position / Structure"
                                                structures={structures}
                                                selectedIds={form.structureIds || []}
                                                onChange={(ids) => setForm(prev => ({ ...prev, structureIds: ids }))}
                                                placeholder="Select positions..."
                                            />
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                        {activeTab === "history" && (
                            <>
                                <Field label="Remarks / Comments" value={form.remarks} onChange={handleChange("remarks")} className="md:col-span-2" />
                                <Field label="2nd Remarks Field" value={form.remarks2} onChange={handleChange("remarks2")} className="md:col-span-2" />
                                <Field label="MEMNET Member (Y/N)" value={form.memnetMember} onChange={handleChange("memnetMember")} options={yesNoOptions} />
                                <Field label="Print Label for Postage (Y/N)" value={form.printLabelForPostage} onChange={handleChange("printLabelForPostage")} options={yesNoOptions} />
                                <Field label="Suspension Code" value={form.suspensionCode} onChange={handleChange("suspensionCode")} options={suspensionCodeOptions} />
                                <Field label="Use Alternate Address (Y/N)" value={form.useAltAddress} onChange={handleChange("useAltAddress")} options={yesNoOptions} />
                                <Field label="Deduct Subscriptions through ACB (Y/N)" value={form.deductACB} onChange={handleChange("deductACB")} options={yesNoOptions} />
                                <Field label="Print Membership Cards (Y/N)" value={form.printMembershipCards} onChange={handleChange("printMembershipCards")} options={yesNoOptions} />
                                <Field label="Home Loan Reduced Rate (Y/N)" value={form.homeLoanReducedRateOption} onChange={handleChange("homeLoanReducedRateOption")} options={yesNoOptions} />
                            </>
                        )}
                    </div>
                </div>
                {/* 📱 R-RESP-J: SAVE IS A STICKY ACTION BAR NOW.
                    This form is six tabs of fields and the body used to scroll inside its
                    own `max-h-[70vh]` box, so on a phone Save sat below a scroller that
                    was itself below the fold -- reachable only by scrolling the page to
                    the bottom, past a panel that scrolls independently. The inner scroller
                    is gone (the page scrolls, which is what a phone expects) and the bar
                    is pinned to the bottom of the viewport.

                    `pb-[env(safe-area-inset-bottom)]` is the half that only shows up on
                    real hardware: without it the bar sits under the home indicator on an
                    iPhone, and Save is a button you can see and cannot press.

                    🔑 SAVE IS FIRST IN THE DOM AND VISUALLY LAST. `flex-row-reverse`
                    puts the primary action on the right for a mouse while leaving it first
                    in the tab order -- the order the two audiences each expect. */}
                <div className="sticky bottom-0 z-10 flex flex-row-reverse justify-start gap-3 border-t border-line bg-surface/95 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
                    <Button variant="primary" onClick={handleSave}>Save Member</Button>
                    <Button onClick={() => window.history.back()}>Cancel</Button>
                </div>
            </div>
        </div>
    );
}

const SectionTitle = ({ title }) => (
    <div className="md:col-span-2 mt-4 border-b border-line pb-1 font-semibold text-brand-ink">
        {title}
    </div>
);

/**
 * The rep's election date.
 *
 * 🔴 IT WAS A NATIVE `<input type="date">` UNDER A `<label>` THAT NAMED NOTHING -- no
 * `htmlFor`, so a screen-reader user reached an unnamed date box -- and it was the fourth
 * of the four native date inputs P3 could not reach, because BR-10 owned this file until
 * now. `DateField` is the approved picker: a real label, a keyboard grid, and the same
 * behaviour on every browser instead of whatever the platform happens to supply.
 *
 * ⚠️ THE THREE-FIELD STORAGE IS UNCHANGED. The server keeps day, month and year as
 * separate strings, and re-shaping that is a wire change, not a presentation one.
 */
function RepElectionDatePicker({ form, setForm }) {
    const dateValue =
        form.repElectionYear && form.repElectionMonth && form.repElectionDay
            ? `${form.repElectionYear}-${form.repElectionMonth}-${form.repElectionDay}`
            : "";
    const handleDateChange = (e) => {
        const [year, month, day] = e.target.value.split("-");
        setForm((prev) => ({ ...prev, repElectionYear: year || "", repElectionMonth: month || "", repElectionDay: day || "" }));
    };
    return (
        <div className="md:col-span-2">
            <DateField label="Election Date" value={dateValue} max="today" hint="ago" onChange={handleDateChange} />
        </div>
    );
}

function togglePersonalPreferred(setForm) {
    setForm((prev) => {
        const hasPersonal = prev.preferredEmail === "personal" || prev.preferredEmail === "both";
        const hasWork = prev.preferredEmail === "work" || prev.preferredEmail === "both";
        if (hasPersonal && hasWork) return { ...prev, preferredEmail: "work" };
        if (hasPersonal) return { ...prev, preferredEmail: "" };
        if (hasWork) return { ...prev, preferredEmail: "both" };
        return { ...prev, preferredEmail: "personal" };
    });
}

function toggleWorkPreferred(setForm) {
    setForm((prev) => {
        const hasPersonal = prev.preferredEmail === "personal" || prev.preferredEmail === "both";
        const hasWork = prev.preferredEmail === "work" || prev.preferredEmail === "both";
        if (hasWork && hasPersonal) return { ...prev, preferredEmail: "personal" };
        if (hasWork) return { ...prev, preferredEmail: "" };
        if (hasPersonal) return { ...prev, preferredEmail: "both" };
        return { ...prev, preferredEmail: "work" };
    });
}

/**
 * The two email addresses, each with a "preferred" tick beside it.
 *
 * The toggles keep their existing three-state behaviour exactly -- personal, work, both --
 * because that is a data question the wire already answers. What changed is the chrome
 * around them: `TextInput` supplies the label, the error wiring and the 16px-on-a-phone
 * rule that the hand-rolled `fieldCls` did not.
 */
function EmailFields({ form, setForm, handleChange, fieldErrors }) {
    /*
     * 🔴 THE CHECKBOX SITS UNDER THE FIELD, NOT BESIDE IT. Outboard, it took its width out
     * of the input: measured against the mock's strict two-column grid, PERSONAL EMAIL was
     * 447px where SURNAME in the same column was 524, and WORK EMAIL 446 against FIRST
     * NAME(S)' 525 -- three different widths down one column, which is the one thing a
     * grid exists to prevent. Under the field it reads as what it is: a note about the
     * value above it, in the same place `Field` puts a hint.
     */
    const preferred = (label, checked, onChange) => (
        <label className="touch-target -mt-0.5 flex w-fit cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-ink-muted">
            <input type="checkbox" checked={checked} onChange={onChange} className="size-3.5 accent-brand" />
            {label}
        </label>
    );

    return (
        <>
            <div className="flex flex-col gap-1.5">
                <TextInput
                    label="Personal Email"
                    kind="email"
                    value={form.personalEmail || ""}
                    onChange={handleChange("personalEmail")}
                    error={fieldErrors.personalEmail || undefined}
                />
                {preferred("Preferred", form.preferredEmail === "personal" || form.preferredEmail === "both", () => togglePersonalPreferred(setForm))}
            </div>
            <div className="flex flex-col gap-1.5">
                <TextInput
                    label="Work Email"
                    kind="email"
                    value={form.workEmail || ""}
                    onChange={handleChange("workEmail")}
                    error={fieldErrors.workEmail || undefined}
                />
                {preferred("Preferred", form.preferredEmail === "work" || form.preferredEmail === "both", () => toggleWorkPreferred(setForm))}
            </div>
        </>
    );
}

/**
 * ONE FIELD OF THE CAPTURE FORM -- and this is where BR-4's four-way fracture ends.
 *
 * 🔴 WHAT WAS HERE. A private `Field` and a private `SearchableSelect`, both shadowing
 * shared components of the same name, and a `fieldCls` restating the border, the focus
 * ring and the disabled treatment the token layer already owns. Between them they carried
 * four defects the shared primitives do not have:
 *
 *   1. THE ID WAS DERIVED FROM THE LABEL TEXT -- `label.toLowerCase().replace(/\s+/g,"-")`
 *      -- so two fields with the same label produced two elements with the same id, and
 *      the second label pointed at the first control. This form renders "Preferred" twice.
 *   2. THE PRIVATE `SearchableSelect` WAS MOUSE-ONLY. Its options were `<li onClick>` with
 *      `role="option"` and `aria-selected={false}` HARD-CODED on every one -- so it
 *      announced a listbox in which nothing is ever selected, and no arrow key, Enter or
 *      Escape did anything. The shared one is driven by `aria-activedescendant`.
 *   3. EVERY CONTROL WAS `text-sm`, which this design renders at 13px -- under the 16px
 *      floor, so iOS Safari zooms the page on focus and does not zoom back out. Fourteen
 *      of the fifteen remaining offenders in the whole tree were in this file.
 *      `controlClasses` uses `field-text`, which is 16px on a coarse pointer.
 *   4. `type="date"` GAVE A NATIVE DATE INPUT, three of them, which is what P3's
 *      "zero native date inputs" box could not close while BR-10 owned this file.
 *
 * 🔑 IT IS A THIN ADAPTER NOW, NOT A WRAPPER. It maps this form's call shape --
 * `options`, `searchable`, `type`, `note` -- onto the shared primitives, so the ~90 call
 * sites in this file did not each have to change. That is the whole point of BR-4
 * converging rather than rewriting: the fracture closes without touching the form's logic,
 * which is the Capture Member arc's.
 */
function Field({ label, value, onChange, className = "", options = null, type = "text",
                   error = null, disabled = false, searchable = false, note = null, kind, required = false,
                   loading = false, emptyLabel, loadError = null, onRetryLoad }) {
    /*
     * 🔑 `loadError` IS NOT `error`, AND CONFLATING THEM IS THE BUG THIS PROP EXISTS TO AVOID.
     *
     *   `error`     the VALUE is wrong. "Enter a valid identity number." The user fixes it.
     *   `loadError` the CHOICES are missing. The user cannot fix anything by typing; the
     *               only useful action is to try the fetch again.
     *
     * Rendered as a validation message, a failed reference list would blame the member for a
     * backend being down and offer them no way out -- so it renders as a compact `DataState`
     * with a retry beneath the control instead (EH-D4: every error state carries a way out
     * when one is honest, and `retryable` decides whether it is).
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

    const shared = {
        label,
        value,
        onChange,
        error: error || undefined,
        disabled,
        required,
        hint: note || undefined,
        className,
    };

    if (type === "date") {
        return <DateField {...shared} max="today" />;
    }

    if (options && searchable) {
        return (
            <SearchableSelect
                {...shared}
                options={options}
                loading={loading}
                onChange={(next) => onChange?.({ target: { value: next } })}
                placeholder="Search..."
            />
        );
    }

    if (options) {
        return (
            <SelectInput
                {...shared}
                options={options}
                loading={loading}
                onChange={(next) => onChange?.({ target: { value: next } })}
                placeholder="Select..."
                // The caller's wording, not a generic one. "No job grades available" tells
                // a member the BANK has no grades on file; "No options available" tells
                // them nothing they can act on, and it is the copy the suite pins.
                emptyLabel={emptyLabel}
            />
        );
    }

    return <TextInput {...shared} kind={kind || "text"} />;
}
