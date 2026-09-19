import { useRef, useState, useMemo } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import WelcomeLetter from "../../components/members/WelcomeLetter";
import { memberService } from "@/services/memberService.js";
import { recruiterService } from "@/services/recruiterService.js";
import { recruitmentChannelService } from "@/services/recruitmentChannelService.js";
import { locationService } from "@/services/locationService.js";
import { jobGradeService } from "@/services/jobGradeService.js";
import { bankService } from "@/services/bankService.js";
import PageTitle from "../../components/common/PageTitle";
import { Page } from "../../components/common/Sheet.jsx";
import {
    Button, DateField, SearchableSelect, SelectInput, TextInput,
} from "../../components/form";
import {
    FREQUENCY_OPTIONS, TITLE_OPTIONS, RACE_OPTIONS, PAYMENT_TYPE_OPTIONS,
    STATUS_OPTIONS, IDENTITY_TYPE_OPTIONS, GENDER_OPTIONS, MEMBER_TABS,
    BRANCH_OPTIONS, EMPLOYMENT_TYPE_OPTIONS, DEBIT_DAY_OPTIONS, IDENTITY_TYPE_PASSPORT,
    DEBIT_DAY_EARLIEST, DEBIT_DAY_LATEST, isDebitDayInRange,
    PAYMENT_TYPE_DEBIT_ORDER, PAYMENT_TYPE_PAYROLL
} from "@/config/memberConstants.js";
import { toWireDate, today } from "@/lib/format.js";
import { sanitiseField, validateField } from "@/utils/inputRules.js";
import { subscriptionsService } from "@/services/subscriptionsService.js";
import { messageOf, validationErrorsOf, writeMayHaveLanded } from "@/services/parseApiError.js";
import { findSubscriptionForBank, formatSubscriptionAmount, sasboSubscriptionAmount } from "@/utils/bankSubscription.js";
import { branchCodeOf, branchNamesForBank, findBranchRecord, formatBranchAddress } from "@/utils/bankBranches.js";
import { DERIVATION, derivationNote, derivationStateOf } from "@/utils/derivation.js";
import { debitDateSentence } from "@/utils/debitDate.js";
import { nearMisses, resolveToOption } from "@/utils/jobGradeMatch.js";
import { nameKey } from "@/utils/nameKey.js";
import { personName } from "@/lib/names.js";
import { fieldValue } from "@/lib/fieldValue.js";
import { validateSAID, validateEmail, extractDateOfBirthFromSAID, extractGenderFromSAID,
    formatDate } from "@/utils/validateSAID.js";
import AddressAutocomplete from "../../components/form/AddressAutocomplete";
import DataState from "../../components/common/DataState";
import useReferenceData from "../../hooks/useReferenceData.js";
import useAsyncOptions from "../../hooks/useAsyncOptions.js";
import useFocusOn from "../../hooks/useFocusOn.js";
import { ConfirmDialog, closeOn } from "../../components/overlay/Modal.jsx";

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
    debitDay: "employment",
};

/** The names out of a reference table of `{id, name}` rows -- [] until the list has arrived. */
const nameList = (rows) => (Array.isArray(rows) ? rows : []).map((row) => row?.name).filter(Boolean);

const REFERENCE_LOADERS = {
    // 🔴 S6/R5/03.10: the CAPTURE screen's recruiter list is `/api/recruiters`, not the representatives
    // endpoint. Two lists, two jobs -- see `recruiterService.getRecruiters`.
    recruiters: () => recruiterService.getRecruiters(),
    // 03.8 -- HOW the member was recruited. A reference table that was seeded, served and administered
    // with no member ever pointing at it, because no screen had the field.
    'recruitment channels': () => recruitmentChannelService.getAll(),
    // 03.3 -- the AREAS, for "Area Recruited". A different list from the recruiters, and that IS the fix.
    areas: () => locationService.getAllAreas(),
    'bank branches': () => bankService.getBankListing(),
    banks: () => bankService.getBankNames(),
    subscriptions: () => subscriptionsService.getAll(),
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
        // The LOCAL calendar day (CM-38): toISOString() is UTC, a day behind between midnight and 02:00 in SAST.
        joinDate: toWireDate(today()),
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
        // The three the stakeholder asked for, under the names MemberDto declares.
        recruitedHow: "",
        areaRecruited: "",
        recruitmentRep: "",

        /* 🗑️ SIXTEEN KEYS WERE HERE, AND EVERY CAPTURE HAS BEEN POSTING THEM (03.1, 03.2).
         *
         * Two whole tabs came off this screen -- Sasbo Structures ("a new member cannot immediately sit
         * on a structure", the stakeholder, 2026-09-09) and History & Remarks. Their CONTROLS went; their
         * keys stayed here, and `handleSave` posts the form, so the screen went on sending fields nobody
         * could see, set or stop:
         *
         *   workBankAddress · repElectionDay/Month/Year · remarks, remarks2, remarks3, remarks4 ·
         *   memnetMember · printLabelForPostage · suspensionCode · useAltAddress · deductACB ·
         *   printMembershipCards · homeLoanReducedRateOption · structure1
         *
         * 🔑 A HIDDEN TAB IS NOT A REMOVED FIELD; the payload is the contract. And four of these were not
         * blanks but OPINIONS -- `memnetMember: "N"`, `printLabelForPostage: "Y"`, `deductACB: "Y"`,
         * `printMembershipCards: "Y"` -- written into every new member by a form that never asked. The day
         * one of those columns is read, the answer would be this file's default rather than anybody's
         * decision, with nothing on screen to contradict it. `remarks3` and `remarks4` never had a control
         * anywhere at all.
         *
         * ⚖️ Cleared with the automation arc before landing (2026-09-17): none of the sixteen is among the
         * 21 fields its live round-trip scenario types and reads back, and `captureCatalogue.spec.js`'s
         * closed list of removed-tab labels does not move. `capturePayload.test.jsx` holds the payload as a
         * CLOSED SET, so a key creeping back reddens whether or not anyone remembers to look for it. */
    });

    const [fieldErrors, setFieldErrors] = useState({});
    const [showSavedNotification, setShowSavedNotification] = useState(false);
    const [welcomeMember, setWelcomeMember] = useState(null);
    const [saving, setSaving] = useState(false);
    const [savedName, setSavedName] = useState("");
    const [pristineForm] = useState(() => JSON.stringify(form));
    const [confirmDiscard, setConfirmDiscard] = useState(false);
    const refs = useReferenceData(REFERENCE_LOADERS);

    /**
     * 🗣️ THE SASBO SUBSCRIPTION -- 174, shown before anyone picks a bank.
     *
     * The owner: "You keep on giving me a blank field instead of 174! Put 174!!!" The fee is the UNION's, set once
     * for everybody; the reference table has a row per bank only because the debit DAY differs, and SASBO's own
     * branch report (31/07/26) has subs = members x R174 on every one of its 5,513 workplaces. So: the chosen bank's
     * row when it has one, otherwise the single amount every row agrees on -- and nothing at all when the rows
     * disagree, because then only a bank could say and a guess would reach a finance report.
     *
     * Derived during render and added to the payload at save, never copied into `form` by an effect: the field is
     * read-only, so there is no user value to preserve, and a copy is a second place for the number to go stale.
     */
    const subscriptionRows = refs.data.subscriptions;
    const subscriptionAmount = useMemo(() => {
        const row = form.bankName ? findSubscriptionForBank(subscriptionRows, form.bankName) : null;
        return row?.subscriptionAmount ?? sasboSubscriptionAmount(subscriptionRows);
    }, [form.bankName, subscriptionRows]);
    const reps = refs.data.recruiters;
    const channels = refs.data['recruitment channels'];
    const areas = refs.data.areas;
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

    /**
     * 🔴 R4-F1: Initials are derived from First Name(s) until the administrator types them, and never after.
     * Recomputing on every keystroke replaced initials somebody had set on purpose the moment they fixed a typo in
     * the first names. A ref, not state: it changes what the NEXT keystroke does, and nothing renders from it.
     */
    const initialsTyped = useRef(false);

    /**
     * 🔑 S4, FOR THE TWO BRANCH-DERIVED FIELDS (E4, E6). Same rule as the initials above and the same defect
     * behind it: a derivation must never win an argument with a value somebody typed. State rather than a ref,
     * unlike `initialsTyped`, because the NOTE under each field renders from it -- a ref would leave the field
     * saying "filled in from the branch" under a value the administrator had just corrected.
     */
    const [bankAddressTyped, setBankAddressTyped] = useState(false);
    const [ibtNoTyped, setIbtNoTyped] = useState(false);

    /**
     * E3 + the owner (2026-09-15, "take what's on Bank Branch of dev.sasbo.online"): the chosen bank's OWN branches
     * together with the fourteen names dev offers. A union, because the seeded listing holds one branch per bank and
     * the fourteen alone name nothing a bank owns. Empty until a bank is chosen: a branch means nothing without one.
     * SASBO's 31/07/26 branch report (planning/branches/capture-member/bankBranchReport.md) replaces the source once
     * it is imported.
     */
    const branchOptionsFor = (bankName) =>
        bankName ? [...new Set([...branchNamesForBank(bankListing, bankName), ...BRANCH_OPTIONS])] : [];

    /**
     * WHY EACH BRANCH-DERIVED FIELD LOOKS THE WAY IT DOES (04.1's closed set, `utils/derivation.js`).
     *
     * The state is computed per field rather than shared, because the two do not always agree: the fourteen
     * dev branch names resolve to no record at all, while a real branch can carry a code and no address. The
     * ORDER of the tests is the rule -- typed beats everything, then "no input yet", then "the source is
     * missing", then "the source had nothing for this input". Getting the last two the wrong way round is how
     * a failed fetch comes to read as an empty result (CM-15).
     */
    const branchRecord = findBranchRecord(bankListing, form.bankName, form.branch);
    const branchSourceLoaded = Array.isArray(bankListing) && bankListing.length > 0;
    const derivedFrom = (userEdited, value) => derivationStateOf({
        userEdited,
        hasInput: Boolean(form.bankName && form.branch),
        sourceLoaded: branchSourceLoaded,
        match: Boolean(value),
    });
    const ibtNoState = derivedFrom(ibtNoTyped, branchCodeOf(branchRecord));
    const bankAddressState = derivedFrom(bankAddressTyped, formatBranchAddress(branchRecord));

    /**
     * The sentence under a branch-derived field.
     *
     * The two states that need their own words are the ones whose general wording would be WRONG here:
     *   NOT_APPLICABLE  means "no branch chosen yet", not "this member has no IBT number", and saying the
     *                   latter would tell the administrator to stop looking for a value that is coming.
     *   NO_MATCH        names the branch, because the fourteen dev branch names are offered for every bank
     *                   and belong to none of them -- "nothing found" without the name reads as a fault.
     */
    const branchDerivationNote = (state, source) => derivationNote(state, {
        source,
        detail: state === DERIVATION.NOT_APPLICABLE
            ? `Choose a branch and this fills in from ${source}.`
            : `Nothing found for ${form.branch} in the branch listing — you can still enter this yourself.`,
    });

    /**
     * 04.3 -- the one thing this screen can say that no other screen can: the DATE, not the day.
     *
     * The rule is the signed spec's and A57 corrected it: back to the last business day, forward only where
     * back would fall out of the 20th-to-31st window. The sentence carries its own caveat, because no
     * maintained public-holiday source is wired to this application and presenting the date as certain would
     * overstate it.
     */
    const debitDateHint = form.paymentType === PAYMENT_TYPE_DEBIT_ORDER
        ? debitDateSentence(form.debitDay)
        : null;

    // An event from a text field, or a bare value from a select: `fieldValue` reads either (RF -- the selects
    // below were wrapping their value in a fake event so this line could read `event.target.value`).
    const handleChange = (field) => (event) => {
        let rawValue = fieldValue(event);
        if (field === "initials") initialsTyped.current = true;
        if (field === "bankAddress") setBankAddressTyped(true);
        if (field === "ibtNo") setIbtNoTyped(true);

        const hasNonNumericInput =
            field === "identityNumber" && form.identityType === "I.D. Number" &&
            /\D/.test(rawValue);
        // What each field accepts at all, as it is typed -- one rule for both member screens (utils/inputRules.js).
        const value = sanitiseField(field, rawValue, { identityType: form.identityType });

        setForm((prev) => {
            let updatedForm = { ...prev, [field]: value };

            // A different bank: its grades and its branches are different ones. The grade always goes; the branch goes
            // only if the new bank's list does not offer it (the fourteen names are offered for every bank).
            if (field === "bankName" && value !== prev.bankName) {
                updatedForm.jobGrade = "";
                // Judged against the bank actually CHOSEN: the searchable control passes through an empty bank while
                // the administrator clears it to pick another, and that moment must not drop a branch the next bank offers.
                if (value && prev.branch && !branchOptionsFor(value).includes(prev.branch)) updatedForm.branch = "";
            }

            /**
             * E4 + E6: the branch record already holds the IBT number and the address. Derived HERE, where the
             * branch changes, rather than in an effect -- an effect that writes the form from the form is the
             * shape that overwrites people mid-keystroke, and this needs no second render to be correct.
             *
             * A blank bank or an unknown branch resolves to `null`, and both helpers answer "" for it. That is
             * deliberate: a stale address from the branch previously chosen is worse than an empty one, because
             * it is wrong AND it looks deliberate.
             */
            if (field === "bankName" || field === "branch") {
                const record = findBranchRecord(bankListing, updatedForm.bankName, updatedForm.branch);
                if (!ibtNoTyped) updatedForm.ibtNo = branchCodeOf(record);
                if (!bankAddressTyped) updatedForm.bankAddress = formatBranchAddress(record);
            }

            if (field === "firstNames" && !initialsTyped.current) {
                const autoInitials = value
                    .trim()
                    .split(/\s+/)
                    .map(name => name.charAt(0).toUpperCase())
                    .join("");
                updatedForm.initials = autoInitials;
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

        if (form.identityType === IDENTITY_TYPE_PASSPORT && !form.dateOfBirth) {
            errors.dateOfBirth = "Date of Birth is strictly required when Passport is selected";
        }

        if (form.paymentType === "Debit Order") {
            if (!form.bankAccountNumber.trim()) errors.bankAccountNumber = "Bank Account Number is required for Debit Orders";
            if (!form.bankName.trim()) errors.bankName = "Bank Employer alignment name is required for Debit Orders";
            if (!form.branch.trim()) errors.branch = "Bank Branch selection is required for Debit Orders";

            // A RANGE, not a list of three. The server's DebitDay takes the 20th to the 31st and
            // most banks' own ACB days live between them (E9a/E9b, A32).
            if (!isDebitDayInRange(form.debitDay)) {
                errors.debitDay = `Debit day must be between ${DEBIT_DAY_EARLIEST} and ${DEBIT_DAY_LATEST} when payment type is 'Debit Order'`;
            }
        }

        // Shape checks, on what is FILLED IN (requiredness is above). Bank Account Number only while it is on screen:
        // under Payroll it is hidden, and a stale value there must not block a save nobody can see the reason for.
        const shapeChecked = ["initials", "phone", "workTel", "homeTel", "ibtNo", "personalEmail", "workEmail", "dateOfBirth"];
        if (form.paymentType === "Debit Order") shapeChecked.push("bankAccountNumber");
        for (const key of shapeChecked) {
            if (errors[key]) continue;
            const message = validateField(key, form[key], { identityType: form.identityType });
            if (message) errors[key] = message;
        }

        return errors;
    };

    const [saveNotice, setSaveNotice] = useState(null);
    const saveNoticeRef = useFocusOn(saveNotice);

    const handleSave = () => {
        if (saving) return;
        const clientSideErrors = validateFormBeforeSave();
        const mergedErrors = { ...fieldErrors, ...clientSideErrors };

        if (Object.keys(mergedErrors).length > 0) {
            setFieldErrors(mergedErrors);

            const dynamicErrorFields = Object.keys(mergedErrors);
            const firstFailedField = dynamicErrorFields[0];
            const fallbackTabContext = FIELD_TO_TAB_MAP[firstFailedField] || "personal";
            setActiveTab(fallbackTabContext);

            setSaveNotice({ kind: "invalid", messages: Object.values(mergedErrors) });
            return;
        }

        setSaveNotice(null);
        setSaving(true);
        memberService.createMember({ ...form, monthlySubscription: subscriptionAmount ?? form.monthlySubscription })
            .then((saved) => {
                setSavedName(personName(form));
                setShowSavedNotification(true);
                setTimeout(() => setShowSavedNotification(false), 3000);
                
                // Inject the persisted ID from the Java backend into the payload structure
                // This triggers the WelcomeLetter evaluation overlay window to perform inspection
                setWelcomeMember({ ...form, id: saved?.id || saved?.memberId });

                // 🔴 R3-OBS-2b: the form stayed filled and Save re-enabled, so a second press posted the same member
                // again. The welcome letter has taken its own copy above, so the form can be emptied now.
                initialsTyped.current = false;
                setForm(JSON.parse(pristineForm));
                setFieldErrors({});
            })
            .catch((err) => {
                // The server's per-field messages go under their fields, not only into the summary.
                const serverFieldErrors = validationErrorsOf(err);
                if (Object.keys(serverFieldErrors).length > 0) {
                    setFieldErrors((prev) => ({ ...prev, ...serverFieldErrors }));
                }
                // 🔴 R3-F2: only a 4xx is the server saying no. A timeout, a dropped connection or a 5xx does NOT mean
                // nothing was written -- "not saved" there invites a second press, and the second press is a second
                // member. The rule is `writeMayHaveLanded`'s, one home for it (RF); the longer wording is this screen's.
                const refused = !writeMayHaveLanded(err);
                setSaveNotice({
                    kind: refused ? "failed" : "unconfirmed",
                    messages: [refused
                        ? `This member was not saved. ${messageOf(err)}`
                        : `We could not confirm whether this member was saved. ${messageOf(err)} Check the register for this member before trying again, or they may be captured twice.`],
                });
            })
            .finally(() => setSaving(false));
    };

    const handleCancel = () => {
        if (JSON.stringify(form) !== pristineForm) {
            setConfirmDiscard(true);
            return;
        }
        window.history.back();
    };

    const tabs = MEMBER_TABS;
    const titleOptions = TITLE_OPTIONS;
    const raceOptions = RACE_OPTIONS;
    const statusOptions = STATUS_OPTIONS;
    const frequencyOptions = FREQUENCY_OPTIONS;
    const identityTypeOptions = IDENTITY_TYPE_OPTIONS;
    const genderOptions = GENDER_OPTIONS;
    /*
     * 🔑 THE GRADES FOLLOW THE BANK, THROUGH `useAsyncOptions` (RF). This was a hand-rolled copy of that hook -- a
     * `cancelled` flag for its ticket, an attempt counter for its `refetch` -- and it set loading SYNCHRONOUSLY inside
     * its effect, through an async function the `set-state-in-effect` rule cannot see into (F-P60's blind spot, live).
     * The hook answers exactly as the copy did: no bank, no grades and no request; a new bank keeps the last list on
     * offer until its own answer lands; a failure empties it and says so; a superseded answer is dropped.
     *
     * 🔴 R3-F3: the grade is NOT cleared here. This re-runs when a reference list is retried (the listing gets a new
     * identity), and clearing here wiped a chosen grade under a notice promising "anything you have already typed is
     * kept". A grade belongs to a bank, so it is cleared where the BANK changes: handleChange.
     */
    const jobGrades = useAsyncOptions(() => {
        const normalized = nameKey(form.bankName);
        const found = bankListing.find((b) => {
            const bn = nameKey(b.bankName || b.name);
            return bn === normalized || bn.includes(normalized) || normalized.includes(bn);
        });
        const bankIdentifier = (found && (found.universalBranchCode || found.universal_branch_code)) || form.bankName;
        return jobGradeService.getByBank(bankIdentifier);
    }, [form.bankName, bankListing], { enabled: !!form.bankName });
    const jobGradeOptions = jobGrades.options;

    /**
     * 🔑 THE NEAR MISS IS A QUESTION, NEVER A SUBSTITUTION (rule 4, "smartly allow free text").
     *
     * `SBG4` for `SBG04` is the realistic mistake where grades are zero-padded. Silently correcting it
     * is the failure 02.5 exists to fix: a grade that appeared to save, saved as something else, and
     * said nothing. So the screen ASKS, and what was typed stays exactly as typed.
     *
     * Computed here rather than inside `SearchableSelect` because the vocabulary is known here and not
     * there -- the primitive deliberately does not guess.
     */
    const jobGradeNote = useMemo(() => {
        if (!form.jobGrade || resolveToOption(jobGradeOptions, form.jobGrade)) return null;
        const suggestions = nearMisses(jobGradeOptions, form.jobGrade);
        if (suggestions.length === 0) return null;
        return `Did you mean ${suggestions.join(" or ")}? "${form.jobGrade}" will be sent for review as a new grade.`;
    }, [form.jobGrade, jobGradeOptions]);


    return (
        <>
        <WelcomeLetter
            open={!!welcomeMember}
            onClose={() => setWelcomeMember(null)}
            member={welcomeMember}
        />
        <Page>
            <PageTitle
                title="Capture Member"
                subtitle="Capture a new Sasbo member. Every required personal, employment and banking detail is checked before the record is saved."
                className="mb-5"
            />
            
            {(refs.state === 'partial' || refs.state === 'error') && (
                <div className="mb-4 rounded-lg bg-surface p-3 shadow-(--shadow-1)">
                    <DataState
                        state={refs.state}
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

            <div className="relative mt-2 rounded-lg bg-surface shadow-(--shadow-1)">
                {/* 🔴 IT SAID "Member captured successfully!" AT THE TOP OF A LONG FORM, WHERE NOBODY PRESSING SAVE AT THE
                    BOTTOM COULD SEE IT (`06.5`). It is the world's toast now, fixed above the action bar as the record's
                    own is, and it names who was captured.
                    ⚠️ THE SENTENCE IS KEPT WORD FOR WORD, IN ITS OWN ELEMENT: the automation arc's `MemberCapturePage`
                    waits for `getByText('Member captured successfully!')`. The name is a second element beside it. */}
                {showSavedNotification && (
                    <div
                        role="status"
                        className="kind-in fixed bottom-[84px] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-[10px] bg-ink px-3.5 py-2.5 text-[13.5px] font-medium text-bg shadow-(--shadow-2)"
                    >
                        <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" className="text-brand" />
                        <span>Member captured successfully!</span>
                        {savedName && <span className="font-normal opacity-80">{savedName}</span>}
                    </div>
                )}

                {saveNotice && (
                    <div
                        ref={saveNoticeRef}
                        tabIndex={-1}
                        aria-labelledby="capture-save-notice-title"
                        className="m-4 rounded-lg border border-status-suspended-dot bg-status-suspended-bg p-3 text-sm text-status-suspended focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
                    >
                        <p id="capture-save-notice-title" className="flex items-center gap-2 font-medium">
                            <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                            {saveNotice.kind === "invalid" ? "Fix these before saving" : saveNotice.kind === "unconfirmed" ? "Save not confirmed" : "This member was not saved"}
                        </p>
                        <ul className="mt-1 list-disc pl-6">
                            {saveNotice.messages.map((message) => <li key={message}>{message}</li>)}
                        </ul>
                    </div>
                )}

                <div className="border-b border-line bg-surface-2">
                    <div className="flex flex-wrap -mb-px px-6">
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
                                        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-status-suspended-dot" />
                                        <span className="sr-only">(has errors)</span>
                                    </>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="px-6 py-8 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {activeTab === "personal" && (
                            <>
                                <Field label="Title" value={form.title} onChange={handleChange("title")} options={titleOptions} />
                                <Field label="Initials" value={form.initials} onChange={handleChange("initials")} error={fieldErrors.initials} />
                                <Field label="First Name(s)" value={form.firstNames} onChange={handleChange("firstNames")} error={fieldErrors.firstNames} required />
                                <Field label="Surname" value={form.surname} onChange={handleChange("surname")} error={fieldErrors.surname} required />
                                <Field label="Identity Type" value={form.identityType} onChange={handleChange("identityType")} options={identityTypeOptions} error={fieldErrors.identityType} required />
                                <Field
                                    kind={form.identityType === IDENTITY_TYPE_PASSPORT ? "reference" : "identifier"}
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
                                    required={form.identityType === IDENTITY_TYPE_PASSPORT}
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
                                <Field label="Cellphone Number" kind="tel" value={form.phone} onChange={handleChange("phone")} error={fieldErrors.phone} />
                                <Field label="Work Tel" kind="tel" value={form.workTel} onChange={handleChange("workTel")} error={fieldErrors.workTel} />
                                <Field label="Home Tel" kind="tel" value={form.homeTel} onChange={handleChange("homeTel")} error={fieldErrors.homeTel} />
                                <AddressAutocomplete label="Residential Address" value={form.address} onChange={handleChange("address")} placeholder="Start typing a residential address..." className="md:col-span-2" />
                            </>
                        )}
                        {activeTab === "membership" && (
                            <>
                                <Field label="Date Joined" value={form.joinDate} onChange={handleChange("joinDate")} type="date" disabled />
                                <Field label="Status" value={form.status} onChange={handleChange("status")} options={statusOptions} disabled />
                                <SectionTitle title="Sasbo Subscription" />
                                <Field label="Monthly Subscription" value={formatSubscriptionAmount(subscriptionAmount)} onChange={handleChange("monthlySubscription")} disabled note="*reviewed annually through business discussions *" />
                                <Field label="Frequency" value={form.subscriptionFrequency} onChange={handleChange("subscriptionFrequency")} options={frequencyOptions} disabled />
                            </>
                        )}
                        {activeTab === "employment" && (
                            <>
                                <Field label="Bank Where Employed" value={form.bankName} onChange={handleChange("bankName")} {...refs.field('banks')} options={bankNames} error={fieldErrors.bankName} required={form.paymentType === "Debit Order"} searchable />
                                <Field label="Employee Number" kind="reference" value={form.employeeNumber} onChange={handleChange("employeeNumber")} />
                                <Field label="Employment Type" value={form.employmentType} onChange={handleChange("employmentType")} options={EMPLOYMENT_TYPE_OPTIONS} />
                                {/* 🔑 02.5 / CM-37 -- LIST FIRST, TYPING ALLOWED. The seeded list is per-bank and
                                    incomplete (SASBO's own data carries grades no bank row has), so a list-only
                                    field means a member who cannot be captured at all. The server is built for
                                    it: `jobGradeMatching` in `api-vocabulary.json` publishes the normalisation
                                    and `MemberDto.jobGradeOutcome` reports MATCHED / CAPTURED / CLEARED.
                                    `allowCustom` is the design arc's prop, on their instruction and their shape. */}
                                <Field label="Job Grade" value={form.jobGrade} onChange={handleChange("jobGrade")} options={jobGradeOptions} disabled={!form.bankName} loading={jobGrades.loading} emptyLabel="No job grades available" loadError={jobGrades.error} onRetryLoad={jobGrades.refetch} searchable allowCustom note={jobGradeNote} />
                                <Field label="Bank Branch" value={form.branch} onChange={handleChange("branch")} options={branchOptionsFor(form.bankName)} error={fieldErrors.branch} required={form.paymentType === "Debit Order"} searchable disabled={!form.bankName} note={form.bankName ? null : "Choose the bank first."} />
                                <Field label="Payment Type" value={form.paymentType} onChange={handleChange("paymentType")} options={PAYMENT_TYPE_OPTIONS} />

                                {form.paymentType === "Debit Order" && (
                                    <>
                                        <Field label="Bank Account Number" kind="identifier" value={form.bankAccountNumber} onChange={handleChange("bankAccountNumber")} error={fieldErrors.bankAccountNumber} required />
                                        <Field label="Debit Day" value={form.debitDay} onChange={handleChange("debitDay")} options={DEBIT_DAY_OPTIONS} note={debitDateHint} />
                                    </>
                                )}
                                {form.paymentType === PAYMENT_TYPE_PAYROLL && (
                                    <p className="md:col-span-2 rounded-lg border border-line-strong bg-surface-2 p-3 text-sm text-ink-muted">
                                        Bank account details are not required for {PAYMENT_TYPE_PAYROLL}. Debit day is handled by payroll.
                                    </p>
                                )}
                                <Field label="IBT No." kind="identifier" value={form.ibtNo} onChange={handleChange("ibtNo")} error={fieldErrors.ibtNo}
                                       note={branchDerivationNote(ibtNoState, "the branch's code")} />
                                <AddressAutocomplete label="Bank Address" value={form.bankAddress} onChange={handleChange("bankAddress")} placeholder="Start typing a bank address..." className="md:col-span-2"
                                       hint={branchDerivationNote(bankAddressState, "the branch's address")} />
                            </>
                        )}

                        {activeTab === "representatives" && (
                            <>
                                {/* The stakeholder, 2026-09-09, on exactly what this tab captures: "1. How the member
                                    was recruited. 2. The area where the member was recruited. 3. Who recruited the
                                    member, where applicable." Those three, in that order, and nothing else.

                                    🗣️ S6, SETTLED BY THE OWNER the same day. The older spec asks for a tab called
                                    "Recruiter Type"; the stakeholder calls the tab "Recruitment Channel", twice, on
                                    both screens. Both are right about different things -- "Recruiter Type" was never
                                    the TAB, it names the KIND of recruitment, which is what the first field holds. So
                                    the tab keeps the stakeholder's name and the FIELD takes the spec's. Nothing was
                                    renamed to satisfy a checker: the reconciliation was put to the owner. */}
                                <Field label="Recruiter Type" value={form.recruitedHow} onChange={handleChange("recruitedHow")} {...refs.field('recruitment channels')} options={nameList(channels)} searchable />

                                {/* 🔑 R2 / RE-3 -- A CHANGE OF MEANING, NOT A RENAME. This was "Area's Recruiter", fed
                                    from the list of recruiter PEOPLE, so it captured a person under an area-shaped
                                    name. Three documents ask for an AREA (28 Aug, §11, RE-3). Relabelling alone would
                                    have left the screen collecting the wrong KIND of thing behind a corrected word --
                                    worse than obviously wrong, because nothing about it would ever look wrong again.

                                    ⛔ And it is deliberately NOT pre-filled from the bank's area. The area a member
                                    WORKS in is usually where they were recruited, and "usually" is a correlation, not
                                    a lookup (S1). This field records a historical fact; a plausible unverified default
                                    is the hardest kind to detect later. */}
                                <Field label="Area Recruited" value={form.areaRecruited} onChange={handleChange("areaRecruited")} {...refs.field('areas')} options={nameList(areas)} searchable />

                                {/* "where applicable" is the stakeholder's own qualifier, so this one is optional by
                                    instruction rather than by omission. */}
                                <Field label="Recruiter" value={form.recruitmentRep} onChange={handleChange("recruitmentRep")} {...refs.field('recruiters')} options={nameList(reps)} searchable note="Where applicable" />

                                {/* 🗑️ ELECTED RECRUITER + ELECTION DATE + POSITION/STRUCTURE WERE HERE -- removed
                                    (03.1/S5, R3-OBS-2a). The spec moves an election to Edit Member: it happens to an
                                    existing member, not while one is being captured. The block was already
                                    UNREACHABLE -- it was guarded by `form.electedRep === 'Y'` against a form with no
                                    `electedRep` key -- so nothing on screen changes. Dead code that looks live is how
                                    a removed field keeps being reasoned about. */}
                            </>
                        )}
                    </div>
                </div>

                <div className="sticky bottom-0 z-10 flex flex-row-reverse justify-start gap-3 border-t border-line bg-surface px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <Button variant="primary" onClick={handleSave} loading={saving}>Save Member</Button>
                    <Button onClick={handleCancel}>Cancel</Button>
                </div>

                <ConfirmDialog
                    open={confirmDiscard}
                    onOpenChange={closeOn(() => setConfirmDiscard(false))}
                    title="Discard this member?"
                    description="Nothing on this form has been saved."
                    confirmLabel="Discard member"
                    cancelLabel="Keep capturing"
                    onConfirm={() => {
                        setConfirmDiscard(false);
                        window.history.back();
                    }}
                />
            </div>
        </Page>
        </>
    );
}

const SectionTitle = ({ title }) => (
    <div className="md:col-span-2 mt-4 border-b border-line pb-1 font-semibold text-brand-ink">
        {title}
    </div>
);

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

function EmailFields({ form, setForm, handleChange, fieldErrors }) {
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

function Field({ label, value, onChange, className = "", options = null, type = "text",
                   error = null, disabled = false, searchable = false, note = null, kind, required = false,
                   loading = false, emptyLabel, loadError = null, onRetryLoad, allowCustom = false }) {

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
                loadError={loadError}
                onRetryLoad={onRetryLoad}
                allowCustom={allowCustom}
                /* 🔴 `emptyLabel` WAS NOT FORWARDED HERE, and the plain-select branch below does forward
                   it. So any field that was searchable fell back to "No options available" while its
                   caller had written a sentence about its own list -- F-P54's exact shape, surviving in
                   one of the two branches. Found when Job Grade became searchable and its "No job
                   grades available" disappeared. */
                emptyLabel={emptyLabel}
                onChange={onChange}
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
                loadError={loadError}
                onRetryLoad={onRetryLoad}
                onChange={onChange}
                placeholder="Select..."
                emptyLabel={emptyLabel}
            />
        );
    }

    return <TextInput {...shared} kind={kind || "text"} />;
}
