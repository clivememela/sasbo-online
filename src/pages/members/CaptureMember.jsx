import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { memberService } from "../../services/memberService.js";
import { Button, SearchableSelect } from "../../components/form";
import {
    FREQUENCY_OPTIONS, TITLE_OPTIONS, RACE_OPTIONS, PAYMENT_TYPE_OPTIONS,
    STATUS_OPTIONS, IDENTITY_TYPE_OPTIONS, YES_NO_OPTIONS, SUSPENSION_CODE_OPTIONS,
    JOB_GRADE_OPTIONS, MANAGER_OPTIONS, DAY_OPTIONS, MEMBER_TABS,
    BANK_OPTIONS, BRANCH_OPTIONS, REP_OPTIONS,
} from "../../config/memberConstants.js";
import { validateSAID } from "../../utils/validateSAID.js";

export default function CaptureMember() {
    const [activeTab, setActiveTab] = useState("personal");
    const [form, setForm] = useState({
        title: "",
        initials: "",
        firstNames: "",
        surname: "",
        identityType: "",
        identityNumber: "",
        race: "",
        email: "",
        phone: "",
        workTel: "",
        homeTel: "",
        faxNumber: "",
        address: "",
        joinDate: new Date().toISOString().split("T")[0],
        status: "Active",
        monthlySubscription: "",
        subscriptionFrequency: "Monthly",
        deathBenefitSubs: "",
        deathBenefitFrequency: "Monthly",
        deathBenefitPolicyNo: "",
        endowmentSubs: "",
        endowmentFrequency: "Monthly",
        endowmentPolicyNo: "",
        benevolentSubs: "",
        benevolentFrequency: "Monthly",
        benevolentPolicyNo: "",
        employeeNumber: "",
        jobGrade: "",
        bankName: "",
        bankAccountNumber: "",
        branch: "",
        ibtNo: "",
        workIbtNo: "",
        paymentType: "Debit Order",
        debitDay: "01",
        bankAddress: "",
        workBankAddress: "",
        recruitmentRep: "",
        areasRep: "",
        repElectionDay: "",
        repElectionMonth: "",
        repElectionYear: "",
        electedRep: "N",
        nationalCouncillor: "N",
        branchCommitteeMember: "N",
        remarks: "",
        remarks2: "",
        remarks3: "",
        remarks4: "",
        managersCode: "",
        memnetMember: "N",
        printLabelForPostage: "Y",
        suspensionCode: "",
        useAltAddress: "N",
        deductACB: "Y",
        printMembershipCards: "Y",
        homeLoanReducedRateOption: "N",
    });
    const [fieldErrors, setFieldErrors] = useState({});
    const [showSavedNotification, setShowSavedNotification] = useState(false);

    const handleChange = (field) => (event) => {
        const rawValue = event.target.value;
        const hasNonNumericInput =
            field === "identityNumber" && form.identityType === "I.D. Number" && /\D/.test(rawValue);
        const value =
            field === "identityNumber" && form.identityType === "I.D. Number"
                ? rawValue.replace(/\D/g, "")
                : rawValue;
        setForm((prev) => ({ ...prev, [field]: value }));
        setFieldErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });
        if (field === "identityType") {
            setFieldErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors.identityNumber;
                return newErrors;
            });
        }
        if (field === "identityNumber" && form.identityType === "I.D. Number") {
            const error = hasNonNumericInput
                ? "Only numbers are allowed for I.D. Number"
                : validateSAID(value);
            if (error) {
                setFieldErrors((prev) => ({ ...prev, [field]: error }));
            }
        }
    };

    const handleSave = () => {
        if (Object.keys(fieldErrors).length > 0) {
            alert("Please fix the errors before saving.");
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
    const yesNoOptions = YES_NO_OPTIONS;
    const suspensionCodeOptions = SUSPENSION_CODE_OPTIONS;
    const jobGradeOptions = JOB_GRADE_OPTIONS;
    const managerOptions = MANAGER_OPTIONS;
    const paymentTypeOptions = PAYMENT_TYPE_OPTIONS;

    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <h2 className="text-3xl text-center mb-4 text-cyan-700 dark:text-cyan-400">
                Capture Member
            </h2>
            <p className="max-w-3xl mx-auto text-center text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                Securely Capture/Register new Sasbo member. Ensure all required personal, employment, and banking information is accurately entered to maintain the integrity of our member database.
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
                    <div className="flex flex-wrap -mb-px">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`mr-4 inline-block p-4 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
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
                <div className="px-6 py-8 overflow-y-auto max-h-[70vh] text-sm bg-white dark:bg-gray-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {activeTab === "personal" && (
                            <>
                                <Field label="Title" value={form.title} onChange={handleChange("title")} options={titleOptions} />
                                <Field label="Initials" value={form.initials} onChange={handleChange("initials")} />
                                <Field label="First Names" value={form.firstNames} onChange={handleChange("firstNames")} />
                                <Field label="Surname" value={form.surname} onChange={handleChange("surname")} />
                                <Field label="Identity Type" value={form.identityType} onChange={handleChange("identityType")} options={identityTypeOptions} />
                                <Field
                                    label={form.identityType || "Select Identity Type before entering"}
                                    value={form.identityNumber}
                                    onChange={handleChange("identityNumber")}
                                    error={form.identityType === "I.D. Number" ? fieldErrors.identityNumber : null}
                                    disabled={!form.identityType}
                                />
                                <Field label="Race" value={form.race} onChange={handleChange("race")} options={raceOptions} />
                                <Field label="Email Address" value={form.email} onChange={handleChange("email")} type="email" />
                                <Field label="Cellphone Number" value={form.phone} onChange={handleChange("phone")} />
                                <Field label="Work Tel" value={form.workTel} onChange={handleChange("workTel")} />
                                <Field label="Home Tel" value={form.homeTel} onChange={handleChange("homeTel")} />
                                <Field label="Fax Number" value={form.faxNumber} onChange={handleChange("faxNumber")} />
                                <Field label="Residential Address" value={form.address} onChange={handleChange("address")} className="md:col-span-2" />
                            </>
                        )}

                        {activeTab === "membership" && (
                            <>
                                <Field label="Date Joined" value={form.joinDate} onChange={handleChange("joinDate")} type="date" />
                                <Field label="Status" value={form.status} onChange={handleChange("status")} options={statusOptions} />

                                <SectionTitle title="Sasbo Subscription" />
                                <Field label="Monthly Subscription" value={form.monthlySubscription} onChange={handleChange("monthlySubscription")} />
                                <Field label="Frequency" value={form.subscriptionFrequency} onChange={handleChange("subscriptionFrequency")} options={frequencyOptions} />

                                <SectionTitle title="Death Benefit Fund" />
                                <Field label="Benefit Fund Subs" value={form.deathBenefitSubs} onChange={handleChange("deathBenefitSubs")} />
                                <Field label="Frequency" value={form.deathBenefitFrequency} onChange={handleChange("deathBenefitFrequency")} options={frequencyOptions} />
                                <Field label="Policy Number" value={form.deathBenefitPolicyNo} onChange={handleChange("deathBenefitPolicyNo")} className="md:col-span-2" />

                                <SectionTitle title="Endowment Fund" />
                                <Field label="Endowment Fund Subs" value={form.endowmentSubs} onChange={handleChange("endowmentSubs")} />
                                <Field label="Frequency" value={form.endowmentFrequency} onChange={handleChange("endowmentFrequency")} options={frequencyOptions} />
                                <Field label="Policy Number" value={form.endowmentPolicyNo} onChange={handleChange("endowmentPolicyNo")} className="md:col-span-2" />

                                <SectionTitle title="Benevolent Fund" />
                                <Field label="Benevolent Fund Subs" value={form.benevolentSubs} onChange={handleChange("benevolentSubs")} />
                                <Field label="Frequency" value={form.benevolentFrequency} onChange={handleChange("benevolentFrequency")} options={frequencyOptions} />
                                <Field label="Policy Number" value={form.benevolentPolicyNo} onChange={handleChange("benevolentPolicyNo")} className="md:col-span-2" />
                            </>
                        )}

                        {activeTab === "employment" && (
                            <>
                                <Field label="Employee Number" value={form.employeeNumber} onChange={handleChange("employeeNumber")} />
                                <Field label="Job Grade" value={form.jobGrade} onChange={handleChange("jobGrade")} options={jobGradeOptions} />
                                <Field label="Bank Where Employed" value={form.bankName} onChange={handleChange("bankName")} options={BANK_OPTIONS} searchable />
                                <Field label="Bank Branch" value={form.branch} onChange={handleChange("branch")} options={BRANCH_OPTIONS} />
                                <Field label="Bank Account Number" value={form.bankAccountNumber} onChange={handleChange("bankAccountNumber")} />
                                <Field label="IBT No." value={form.ibtNo} onChange={handleChange("ibtNo")} />
                                <Field label="Work IBT No." value={form.workIbtNo} onChange={handleChange("workIbtNo")} />
                                <Field label="Payment Type" value={form.paymentType} onChange={handleChange("paymentType")} options={paymentTypeOptions} />
                                <Field label="Debit Day" value={form.debitDay} onChange={handleChange("debitDay")} options={Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, "0"))} />
                                <Field label="Bank Address" value={form.bankAddress} onChange={handleChange("bankAddress")} className="md:col-span-2" />
                            </>
                        )}

                        {activeTab === "representatives" && (
                            <>
                                <Field label="Recruitment Rep" value={form.recruitmentRep} onChange={handleChange("recruitmentRep")} options={REP_OPTIONS} />
                                <Field label="Area's Rep" value={form.areasRep} onChange={handleChange("areasRep")} options={REP_OPTIONS} />
                                <SectionTitle title="Representative Election Date" />
                                <RepElectionDatePicker form={form} setForm={setForm} />

                                <SectionTitle title="Roles" />
                                <Field label="Elected Rep (Y/N)" value={form.electedRep} onChange={handleChange("electedRep")} options={yesNoOptions} />
                                <Field label="National Councillor (Y/N)" value={form.nationalCouncillor} onChange={handleChange("nationalCouncillor")} options={yesNoOptions} />
                                <Field label="Branch Committee Member (Y/N)" value={form.branchCommitteeMember} onChange={handleChange("branchCommitteeMember")} options={yesNoOptions} />
                            </>
                        )}

                        {activeTab === "history" && (
                            <>
                                <Field label="Remarks / Comments" value={form.remarks} onChange={handleChange("remarks")} className="md:col-span-2" />
                                <Field label="2nd Remarks Field" value={form.remarks2} onChange={handleChange("remarks2")} className="md:col-span-2" />
                                <Field label="Managers Code" value={form.managersCode} onChange={handleChange("managersCode")} options={managerOptions} />
                                <Field label="MEMNET Member (Y/N)" value={form.memnetMember} onChange={handleChange("memnetMember")} options={yesNoOptions} />
                                <Field label="Print Label for Postage (Y/N)" value={form.printLabelForPostage} onChange={handleChange("printLabelForPostage")} options={yesNoOptions} />
                                <Field label="Suspension Code" value={form.suspensionCode} onChange={handleChange("suspensionCode")} options={suspensionCodeOptions} />
                                <Field label="Use Alternate Address (Y/N)" value={form.useAltAddress} onChange={handleChange("useAltAddress")} options={yesNoOptions} />
                                <Field label="Deduct Subs through ACB (Y/N)" value={form.deductACB} onChange={handleChange("deductACB")} options={yesNoOptions} />
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

const fieldCls = (error) =>
    `w-full rounded-lg px-4 py-2.5 text-sm border bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 transition-all ${error ? "border-red-500 dark:border-red-400" : "border-gray-200 dark:border-gray-700"
    }`;

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
                className={fieldCls(null)}
            />
        </div>
    );
}

function Field({ label, value, onChange, className = "", options = null, type = "text", error = null, disabled = false, searchable = false }) {
    return (
        <div className={className}>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                {label}
            </label>
            <div className="relative">
                {options && searchable ? (
                    <select value={value || ""} onChange={onChange} className={fieldCls(error)} disabled={disabled}>
                        <option value="">Select...</option>
                        {options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                ) : options ? (
                    <select value={value || ""} onChange={onChange} className={fieldCls(error)} disabled={disabled}>
                        <option value="">Select...</option>
                        {options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                ) : (
                    <input type={type} value={value || ""} onChange={onChange} className={fieldCls(error)} disabled={disabled} />
                )}
                {error && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>}
            </div>
        </div>
    );
}
