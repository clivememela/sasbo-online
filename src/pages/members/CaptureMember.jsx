import { useRef, useState, useEffect, useMemo } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import WelcomeLetter from "../../components/members/WelcomeLetter";
import { memberService } from "@/services/memberService.js";
import { recruiterService } from "@/services/recruiterService.js";
import { jobGradeService } from "@/services/jobGradeService.js";
import { bankService } from "@/services/bankService.js";
import PageTitle from "../../components/common/PageTitle";
import {
    Button, DateField, PositionTreeSelect, SearchableSelect, SelectInput, TextInput,
} from "../../components/form";
import {
    FREQUENCY_OPTIONS, TITLE_OPTIONS, RACE_OPTIONS, PAYMENT_TYPE_OPTIONS,
    STATUS_OPTIONS, IDENTITY_TYPE_OPTIONS, GENDER_OPTIONS, MEMBER_TABS,
    BRANCH_OPTIONS, EMPLOYMENT_TYPE_OPTIONS, DEBIT_DAY_OPTIONS, IDENTITY_TYPE_PASSPORT
} from "@/config/memberConstants.js";
import { toWireDate, today } from "@/lib/format.js";
import { validateSAID, validateEmail, extractDateOfBirthFromSAID, extractGenderFromSAID,
    formatDate } from "@/utils/validateSAID.js";
import AddressAutocomplete from "../../components/form/AddressAutocomplete";
import DataState from "../../components/common/DataState";
import useReferenceData from "../../hooks/useReferenceData.js";
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
    employeeNumber: "employment",
    employmentType: "employment",
    jobGrade: "employment",
    bankName: "employment",
    branch: "employment",
    paymentType: "employment",
    bankAccountNumber: "employment",
    debitDay: "employment",
};

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
        workBankAddress: "",
        recruitmentRep: "",
        areasRep: "",
        repElectionDay: "",
        repElectionMonth: "",
        repElectionYear: "",
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
    });

    const [fieldErrors, setFieldErrors] = useState({});
    const [showSavedNotification, setShowSavedNotification] = useState(false);
    const [welcomeMember, setWelcomeMember] = useState(null);
    const [saving, setSaving] = useState(false);
    const [savedName, setSavedName] = useState("");
    const [pristineForm] = useState(() => JSON.stringify(form));
    const [confirmDiscard, setConfirmDiscard] = useState(false);
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

    /**
     * 🔴 R4-F1: Initials are derived from First Name(s) until the administrator types them, and never after.
     * Recomputing on every keystroke replaced initials somebody had set on purpose the moment they fixed a typo in
     * the first names. A ref, not state: it changes what the NEXT keystroke does, and nothing renders from it.
     */
    const initialsTyped = useRef(false);

    const handleChange = (field) => (event) => {
        let rawValue = event.target.value;
        if (field === "initials") initialsTyped.current = true;

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

            const validDays = ["20", "25", "31", 20, 25, 31];
            if (!validDays.includes(form.debitDay)) {
                errors.debitDay = "Debit day must be one of 20, 25 or 31 when payment type is 'Debit Order'";
            }
        }

        return errors;
    };

    const [saveNotice, setSaveNotice] = useState(null);
    const saveNoticeRef = useRef(null);

    useEffect(() => {
        if (saveNotice) saveNoticeRef.current?.focus();
    }, [saveNotice]);

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
        memberService.createMember(form)
            .then((saved) => {
                setSavedName([form.firstNames, form.surname].filter(Boolean).join(" "));
                setShowSavedNotification(true);
                setTimeout(() => setShowSavedNotification(false), 3000);
                
                // Inject the persisted ID from the Java backend into the payload structure
                // This triggers the WelcomeLetter evaluation overlay window to perform inspection
                setWelcomeMember({ ...form, id: saved?.id || saved?.memberId });
            })
            .catch((err) => setSaveNotice({
                kind: "failed",
                messages: [`This member was not saved. ${err?.message || "Please try again."}`],
            }))
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
    const [jobGradeOptions, setJobGradeOptions] = useState([]);
    const [jobGradeLoading, setJobGradeLoading] = useState(false);
    const [jobGradeError, setJobGradeError] = useState(null);
    const [jobGradeAttempt, setJobGradeAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setForm(prev => ({ ...prev, jobGrade: "" }));

        const fetchGrades = async () => {
            if (!form.bankName) {
                setJobGradeOptions([]);
                setJobGradeError(null);
                setJobGradeLoading(false);
                return;
            }

            setJobGradeLoading(true);
            setJobGradeError(null);

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
        <>
        <WelcomeLetter
            open={!!welcomeMember}
            onClose={() => setWelcomeMember(null)}
            member={welcomeMember}
        />
        <div className="flex min-h-0 flex-1 flex-col px-7 pb-7 pt-[26px] text-ink max-lg:px-4">
            <PageTitle
                title="Capture Member"
                subtitle="Capture a new Sasbo member. Every required personal, employment and banking detail is checked before the record is saved."
                className="mb-5"
            />
            
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
                            {saveNotice.kind === "invalid" ? "Fix these before saving" : "This member was not saved"}
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
                                <Field label="Initials" value={form.initials} onChange={handleChange("initials")} />
                                <Field label="First Name(s)" value={form.firstNames} onChange={handleChange("firstNames")} error={fieldErrors.firstNames} required />
                                <Field label="Surname" value={form.surname} onChange={handleChange("surname")} error={fieldErrors.surname} required />
                                <Field label="Identity Type" value={form.identityType} onChange={handleChange("identityType")} options={identityTypeOptions} error={fieldErrors.identityType} required />
                                <Field
                                    kind="identifier"
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
                                <Field label="Cellphone Number" kind="tel" value={form.phone} onChange={handleChange("phone")} />
                                <Field label="Work Tel" kind="tel" value={form.workTel} onChange={handleChange("workTel")} />
                                <Field label="Home Tel" kind="tel" value={form.homeTel} onChange={handleChange("homeTel")} />
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
                                <Field label="Employee Number" kind="identifier" value={form.employeeNumber} onChange={handleChange("employeeNumber")} />
                                <Field label="Employment Type" value={form.employmentType} onChange={handleChange("employmentType")} options={EMPLOYMENT_TYPE_OPTIONS} />
                                <Field label="Bank Where Employed" value={form.bankName} onChange={handleChange("bankName")} {...refs.field('banks')} options={bankNames} error={fieldErrors.bankName} required={form.paymentType === "Debit Order"} searchable />
                                <Field label="Job Grade" value={form.jobGrade} onChange={handleChange("jobGrade")} options={jobGradeOptions} disabled={!form.bankName} loading={jobGradeLoading} emptyLabel="No job grades available" loadError={jobGradeError} onRetryLoad={() => setJobGradeAttempt((n) => n + 1)} />
                                <Field label="Bank Branch" value={form.branch} onChange={handleChange("branch")} options={BRANCH_OPTIONS} error={fieldErrors.branch} required={form.paymentType === "Debit Order"} searchable />
                                <Field label="Payment Type" value={form.paymentType} onChange={handleChange("paymentType")} options={PAYMENT_TYPE_OPTIONS} />

                                {form.paymentType === "Debit Order" && (
                                    <>
                                        <Field label="Bank Account Number" kind="identifier" value={form.bankAccountNumber} onChange={handleChange("bankAccountNumber")} error={fieldErrors.bankAccountNumber} required />
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

                        {activeTab === "representatives" && (
                            <>
                                <Field label="Recruiter" value={form.recruitmentRep} onChange={handleChange("recruitmentRep")} {...refs.field('recruiters')} options={reps.map(r => r.name).filter(Boolean)} searchable />
                                <Field label="Area's Recruiter" value={form.areasRep} onChange={handleChange("areasRep")} {...refs.field('recruiters')} options={reps.map(r => r.name).filter(Boolean)} searchable />

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
        </div>
        </>
    );
}

const SectionTitle = ({ title }) => (
    <div className="md:col-span-2 mt-4 border-b border-line pb-1 font-semibold text-brand-ink">
        {title}
    </div>
);

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
                   loading = false, emptyLabel, loadError = null, onRetryLoad }) {

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
                loadError={loadError}
                onRetryLoad={onRetryLoad}
                onChange={(next) => onChange?.({ target: { value: next } })}
                placeholder="Select..."
                emptyLabel={emptyLabel}
            />
        );
    }

    return <TextInput {...shared} kind={kind || "text"} />;
}
