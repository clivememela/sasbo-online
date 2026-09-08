import React, { useState, useEffect, useMemo } from "react";
import { CheckCircle2 } from "lucide-react";
import { memberService } from "../../services/memberService.js";
import { recruiterService } from "../../services/recruiterService.js";
import { jobGradeService } from "../../services/jobGradeService.js";
import { bankService } from "../../services/bankService.js";
import { Button, PositionTreeSelect } from "../../components/form";
import {
    FREQUENCY_OPTIONS, TITLE_OPTIONS, RACE_OPTIONS, PAYMENT_TYPE_OPTIONS,
    STATUS_OPTIONS, IDENTITY_TYPE_OPTIONS, GENDER_OPTIONS, YES_NO_OPTIONS,
    SUSPENSION_CODE_OPTIONS, JOB_GRADE_OPTIONS, MEMBER_TABS,
    BRANCH_OPTIONS, EMPLOYMENT_TYPE_OPTIONS, DEBIT_DAY_OPTIONS
} from "../../config/memberConstants.js";
import { validateSAID, validateEmail, extractDateOfBirthFromSAID, extractGenderFromSAID,
    formatDate } from "../../utils/validateSAID.js";
import AddressAutocomplete from "../../components/form/AddressAutocomplete";

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
        workIbtNo: "",
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
        cosatuLocal: "",
        cosatuRegion: "",
        cosatuPositions: [] // Multi-select: PEC, CEC, Treasurer, Chairperson, Secretary
    });

    const [fieldErrors, setFieldErrors] = useState({});
    const [showSavedNotification, setShowSavedNotification] = useState(false);
    const [reps, setReps] = useState([]);
    const [structures, setStructures] = useState([]);

    useEffect(() => {
        recruiterService.getAll()
            .then(data => setReps(data || []))
            .catch(err => console.error('Failed to fetch recruiters:', err));
        recruiterService.getStructures()
            .then(data => setStructures(data || []))
            .catch(err => console.error('Failed to fetch structures:', err));
    }, []);

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

    const handleStructureCheckboxChange = (structureName) => (event) => {
        const checked = event.target.checked;
        setForm((prev) => {
            let currentSelections = [...prev.selectedBecStructures];
            if (checked) {
                if (!currentSelections.includes(structureName)) {
                    currentSelections.push(structureName);
                }
            } else {
                currentSelections = currentSelections.filter(item => item !== structureName);
            }
            return { ...prev, selectedBecStructures: currentSelections };
        });
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

    const handleSave = () => {
        const clientSideErrors = validateFormBeforeSave();
        const mergedErrors = { ...fieldErrors, ...clientSideErrors };

        if (Object.keys(mergedErrors).length > 0) {
            setFieldErrors(mergedErrors);

            const dynamicErrorFields = Object.keys(mergedErrors);
            const firstFailedField = dynamicErrorFields[0];
            const fallbackTabContext = FIELD_TO_TAB_MAP[firstFailedField] || "personal";
            setActiveTab(fallbackTabContext);

            const errorSummaryList = Object.values(mergedErrors)
                .map((errMsg) => `• ${errMsg}`)
                .join("\n");

            alert(`Please fix the following validation errors before saving:\n\n${errorSummaryList}`);
            return;
        }

        memberService.createMember(form)
            .then(() => {
                setShowSavedNotification(true);
                setTimeout(() => setShowSavedNotification(false), 3000);
            })
            .catch((err) => alert(`Failed to save member: ${err.message}`));
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
    const [jobGradeOptions, setJobGradeOptions] = useState(JOB_GRADE_OPTIONS);
    const [jobGradeLoading, setJobGradeLoading] = useState(false);
    const [bankListing, setBankListing] = useState([]);
    const [bankNames, setBankNames] = useState([]);

    // Load bank listing and bank names on mount so we can resolve a selected bank name to a bank code
    useEffect(() => {
        let mounted = true;
        bankService.getBankListing()
            .then(list => { if (mounted) setBankListing(list || []); })
            .catch(() => { if (mounted) setBankListing([]); });
        bankService.getBankNames()
            .then(names => { if (mounted) setBankNames(names || []); })
            .catch(() => { if (mounted) setBankNames([]); });
        return () => { mounted = false; };
    }, []);

    // Fetch job grades for the selected bank whenever bankName changes.
    useEffect(() => {
        let cancelled = false;
        const fetchGrades = async () => {
            if (!form.bankName) {
                setJobGradeOptions(JOB_GRADE_OPTIONS);
                setForm(prev => ({ ...prev, jobGrade: "" }));
                setJobGradeLoading(false);
                return;
            }

            setJobGradeLoading(true);

            // Try to resolve bank code locally from bankListing
            const normalized = String(form.bankName || '').trim().toLowerCase();
            const found = bankListing.find((b) => {
                const bn = String(b.bankName || b.name || '').trim().toLowerCase();
                return bn === normalized || bn.includes(normalized) || normalized.includes(bn);
            });
            const bankIdentifier = (found && (found.universalBranchCode || found.universal_branch_code)) || form.bankName;

            try {
                const grades = await jobGradeService.getByBank(bankIdentifier);
                if (!cancelled) setJobGradeOptions(Array.isArray(grades) && grades.length ? grades : JOB_GRADE_OPTIONS);
            } catch (e) {
                if (!cancelled) setJobGradeOptions(JOB_GRADE_OPTIONS);
            } finally {
                if (!cancelled) setJobGradeLoading(false);
            }
        };
        fetchGrades();
        return () => { cancelled = true; };
    }, [form.bankName, bankListing]);

    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <h2 className="text-3xl text-center mb-4 text-cyan-700 dark:text-cyan-400">
                Capture Member
            </h2>
            <p className="max-w-3xl mx-auto text-center text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                Securely capture a new Sasbo member. Ensure all required personal,
                employment, and banking information is accurately entered to maintain the integrity of our member database.
            </p>
            <div className="max-w-6xl mx-auto rounded-2xl shadow-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden relative">
                {showSavedNotification && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
                        <CheckCircle2 size={18} />
                        <span className="text-sm font-medium">Member captured successfully!</span>
                    </div>
                )}
                {/* Tab Navigation */}
                <div className="px-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                    <div className="flex -mb-px">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`mr-4 inline-flex items-center gap-1 p-4 border-b-2 font-bold text-sm transition-colors ${activeTab === tab.id ? "border-cyan-600 text-cyan-600 dark:border-cyan-400 dark:text-cyan-400" : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
                            >
                                <span>{tab.label}</span>
                                {tabsWithErrors.has(tab.id) && (
                                    <span className="text-red-500 font-bold animate-pulse text-sm" title="Contains required validation errors">*</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                {/* Body */}
                <div className="px-6 py-8 overflow-y-auto max-h-[70vh] text-sm bg-white dark:bg-gray-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {activeTab === "personal" && (
                            <>
                                <Field label="Title" value={form.title} onChange={handleChange("title")} options={titleOptions} />
                                <Field label="Initials" value={form.initials} onChange={handleChange("initials")} />
                                <Field label="First Name(s)" value={form.firstNames} onChange={handleChange("firstNames")} error={fieldErrors.firstNames} required />
                                <Field label="Surname" value={form.surname} onChange={handleChange("surname")} error={fieldErrors.surname} required />
                                <Field label="Identity Type" value={form.identityType} onChange={handleChange("identityType")} options={identityTypeOptions} error={fieldErrors.identityType} required />
                                <Field
                                    label={form.identityType || "Select Identity Type before entering"}
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
                                <Field label="Job Grade" value={form.jobGrade} onChange={handleChange("jobGrade")} options={jobGradeOptions} disabled={!form.bankName} loading={jobGradeLoading} />
                                <Field label="Bank Branch" value={form.branch} onChange={handleChange("branch")} options={BRANCH_OPTIONS} error={fieldErrors.branch} required={form.paymentType === "Debit Order"} searchable />
                                <Field label="Payment Type" value={form.paymentType} onChange={handleChange("paymentType")} options={PAYMENT_TYPE_OPTIONS} />

                                {form.paymentType === "Debit Order" && (
                                    <>
                                        <Field label="Bank Account Number" value={form.bankAccountNumber} onChange={handleChange("bankAccountNumber")} error={fieldErrors.bankAccountNumber} required />
                                        <Field label="Debit Day" value={form.debitDay} onChange={handleChange("debitDay")} options={DEBIT_DAY_OPTIONS} />
                                    </>
                                )}
                                {form.paymentType === "Payroll" && (
                                    <div className="md:col-span-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-700 dark:text-blue-300">
                                        ℹ️ Bank account details are not required for Payroll. Debit day is handled by payroll.
                                    </div>
                                )}
                                <Field label="IBT No." value={form.ibtNo} onChange={handleChange("ibtNo")} />
                                <Field label="Work IBT No." value={form.workIbtNo} onChange={handleChange("workIbtNo")} />
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
                                    <div className="md:col-span-2 p-4 bg-cyan-50/50 dark:bg-cyan-950/10 border border-cyan-100 rounded-lg animate-in fade-in duration-200">
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
                                    <div className="md:col-span-2 space-y-4 border-l-2 border-orange-400 pl-4 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <p className="text-xs font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400">COSATU Structure</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Field label="Local" value={form.cosatuLocal} onChange={handleChange("cosatuLocal")} />
                                            <Field label="Region" value={form.cosatuRegion} onChange={handleChange("cosatuRegion")} />
                                        </div>
                                        <div className="p-4 bg-orange-50/50 dark:bg-orange-950/10 border border-orange-200 dark:border-orange-800 rounded-lg">
                                            <label className="block text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-400 mb-2">
                                                COSATU Positions — Multiple Allowed
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {["PEC", "CEC", "Treasurer", "Chairperson", "Secretary"].map((pos) => (
                                                    <label key={pos} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={(form.cosatuPositions || []).includes(pos)}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setForm(prev => ({
                                                                    ...prev,
                                                                    cosatuPositions: checked
                                                                        ? [...(prev.cosatuPositions || []), pos]
                                                                        : (prev.cosatuPositions || []).filter(p => p !== pos)
                                                                }));
                                                            }}
                                                            className="rounded border-gray-300 text-orange-500 focus:ring-orange-400 w-4 h-4"
                                                        />
                                                        {pos === "PEC" ? "PEC (Provincial Executive Committee)" :
                                                         pos === "CEC" ? "CEC (Central Executive Committee)" : pos}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
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
                                    <div className="md:col-span-2 space-y-6 border-l-2 border-cyan-500 pl-4 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">

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
                                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 animate-in fade-in duration-200">
                                                <label className="block text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-400 mb-2">
                                                    Select BEC Structure(s) - MULTIPLE STRUCTURES ALLOWED
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {STRUCTURE_REP_OPTIONS.map((struct) => (
                                                        <label key={struct} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={form.selectedBecStructures.includes(struct)}
                                                                onChange={handleStructureCheckboxChange(struct)}
                                                                className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                                                            />
                                                            {struct}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Flow node 6: BEC Executive? */}
                                        <Field
                                            label="BEC Executive?"
                                            value={form.isBecExecutive}
                                            onChange={handleChange("isBecExecutive")}
                                            options={yesNoOptions}
                                        />

                                        {form.isBecExecutive === "Y" && (
                                            <div className="p-4 bg-purple-50/50 dark:bg-purple-950/10 rounded-lg border border-purple-200 dark:border-purple-800 animate-in slide-in-from-left-2 duration-300">
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
                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                    <Button variant="primary" onClick={handleSave}>Save Member</Button>
                    <Button onClick={() => window.history.back()}>Cancel</Button>
                </div>
            </div>
        </div>
    );
}

const SectionTitle = ({ title }) => (
    <div className="md:col-span-2 mt-4 border-b border-gray-200 dark:border-gray-700 pb-1 font-semibold text-cyan-700 dark:text-cyan-400">
        {title}
    </div>
);

const fieldCls = (error, disabled = false) =>
    `w-full rounded-lg px-4 py-2.5 text-sm border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 ${
        disabled ? "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed" : "bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white"} ${error ? "border-red-500 dark:border-red-400" : "border-gray-200 dark:border-gray-700"}`;

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
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                Election Date
            </label>
            <input
                type="date"
                value={dateValue}
                onChange={handleDateChange}
                className={fieldCls(null, false)}
            />
        </div>
    );
}

function SearchableSelect({ value, onChange, options, error, disabled }) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const ref = React.useRef(null);
    const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));
    const handleSelect = (opt) => {
        onChange({ target: { value: opt } });
        setQuery("");
        setOpen(false);
    };
    const handleClear = () => {
        onChange({ target: { value: "" } });
        setQuery("");
    };
    React.useEffect(() => {
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
                    {filtered.map((opt) => (
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
    return (
        <>
            <div>
                <label htmlFor="personalEmail" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                    Personal Email
                </label>
                <div className="flex items-center gap-2">
                    <input
                        id="personalEmail"
                        type="email"
                        value={form.personalEmail || ""}
                        onChange={handleChange("personalEmail")}
                        className={fieldCls(fieldErrors.personalEmail)}
                    />
                    <label htmlFor="prefPersonal" className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap cursor-pointer">
                        <input
                            id="prefPersonal"
                            type="checkbox"
                            checked={form.preferredEmail === "personal" || form.preferredEmail === "both"}
                            onChange={() => togglePersonalPreferred(setForm)}
                            className="accent-cyan-600 w-4 h-4"
                        />
                        Preferred
                    </label>
                </div>
                {fieldErrors.personalEmail && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{fieldErrors.personalEmail}</p>}
            </div>
            <div>
                <label htmlFor="workEmail" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                    Work Email
                </label>
                <div className="flex items-center gap-2">
                    <input
                        id="workEmail"
                        type="email"
                        value={form.workEmail || ""}
                        onChange={handleChange("workEmail")}
                        className={fieldCls(fieldErrors.workEmail)}
                    />
                    <label htmlFor="prefWork" className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap cursor-pointer">
                        <input
                            id="prefWork"
                            type="checkbox"
                            checked={form.preferredEmail === "work" || form.preferredEmail === "both"}
                            onChange={() => toggleWorkPreferred(setForm)}
                            className="accent-cyan-600 w-4 h-4"
                        />
                        Preferred
                    </label>
                </div>
                {fieldErrors.workEmail && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{fieldErrors.workEmail}</p>}
            </div>
        </>
    );
}

function Field({ label, value, onChange, className = "", options = null, type = "text",
                   error = null, disabled = false, searchable = false, note = null, id, required = false, loading = false }) {
    const fieldId = id || label.toLowerCase().replace(/\s+/g, "-");
    return (
        <div className={className}>
            <label htmlFor={fieldId} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                <span>{label} {required && <span className="text-red-500 font-bold">*</span>}</span>
                {loading && (
                    <svg className="w-4 h-4 animate-spin text-cyan-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
                        <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                )}
            </label>
            {note && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{note}</p>}
            <div className="relative">
                {options && searchable ? (
                    <SearchableSelect value={value} onChange={onChange} options={options} error={error} disabled={disabled} />
                ) : options ? (
                    <select id={fieldId} value={value || ""} onChange={onChange} className={fieldCls(error, disabled)} disabled={disabled}>
                        <option value="">Select...</option>
                        {options.length === 0 ? (
                            <option value="" disabled>No job grades available</option>
                        ) : (
                            options.map((opt) => {
                                const val = opt?.value !== undefined ? opt.value : opt;
                                const lbl = opt?.label !== undefined ? opt.label : opt;
                                return <option key={val} value={val}>{lbl}</option>;
                            })
                        )}
                    </select>
                ) : (
                    <input id={fieldId} type={type} value={value || ""} onChange={onChange} className={fieldCls(error, disabled)} disabled={disabled} />
                )}
                {error && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>}
            </div>
        </div>
    );
}
