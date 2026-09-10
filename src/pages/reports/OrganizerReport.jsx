import { useState, useEffect } from 'react';
import TextInput from '../../components/form/TextInput';
import DateField from '../../components/form/DateField';
import Button from '../../components/form/Button';
import PageTitle from '../../components/common/PageTitle';

export const OrganizerReport = ({ filters }) => {
    const [formData, setFormData] = useState({
        organiserName: '', dateOfVisit: '', timeIn: '', timeOut: '',
        bank: filters?.bankName || '', branchDepartment: filters?.branch || '',
        raNumber: filters?.randomAccessNumber || '', area: filters?.area || '',
        postalAddress: '', physicalAddress: '', branchDepTelNo: '', branchDepFaxNo: '',
        branchDepManager: '', branchRepName: '', cellPhoneEmail1: '', memnetMemName: '',
        cellPhoneEmail2: '', becMemberName: '', cellPhoneEmail3: '', compliment: '',
        noOfNonMembers: '', membership: '', noOfNewMembersRecruited: '',
        percentagePenetration: '', noOfNonMembersInterviewed: '', organiserSignature: '',
        organiserSignatureDate: '', snrOrganiserSignature: '', snrOrganiserSignatureDate: '',
        adminDeptSignature: '', dateCaptured: '',
    });

    useEffect(() => {
        if (filters) {
            setFormData(prev => ({
                ...prev,
                bank: filters.bankName || prev.bank,
                branchDepartment: filters.branch || prev.branchDepartment,
                raNumber: filters.randomAccessNumber || prev.raNumber,
                area: filters.area || prev.area,
            }));
        }
    }, [filters]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        /*
         * 🔴 IT WAS `console.log('Form submitted:', formData)`, AND THAT IS THE `Auth.jsx`
         * DEFECT AGAIN ON A DIFFERENT SCREEN. Auth logged `{ email, password }` on every
         * login attempt; this logged the WHOLE organiser report payload -- every field the
         * user had filled in -- on every submit, to a console that survives in a saved HAR,
         * in a screen share and in any extension the user has installed.
         *
         * ⚠️ THE LINE IS DELETED RATHER THAN ROUTED THROUGH `reportError`. The sink exists
         * for FAILURES and emits `kind`/`status`/`retryable` only; a successful submit has
         * no failure to report, so there is nothing here it should be saying. This form has
         * no backend yet (`04.3` left it as a shape), and when it gets one the write goes
         * through a service and its failure through the sink like every other.
         */
    };

    /**
     * 🔴 BR-4's FOURTH WRAPPER, AND THE LAST ONE. `blastRadius.md` counted four answers
     * to "what wraps a form control": the shared `SearchableSelect`, a private one in
     * `CaptureMember.jsx`, a private `Field` there, and this. `03.2a` built the shared
     * `Field`, `04.2` retired the two in `CaptureMember.jsx`, and this closes the set.
     *
     * 🔑 IT WRAPPED THE LABEL AROUND THE CONTROL, which works and is not what the rest
     * of this application does -- so this textarea was the one control in the tree whose
     * label was not a `<label htmlFor>`, and the difference was invisible until something
     * tried to query it by label. `TextInput multiline` is the same textarea with the
     * shared chrome: one label element, one error path, one focus ring, one 16px rule.
     */
    const TextArea = ({ label, name, rows = 3 }) => (
        <TextInput
            label={label}
            name={name}
            multiline
            rows={rows}
            value={formData[name]}
            onChange={handleChange}
            className="sm:col-span-2"
        />
    );

    // 🔴 `03.3`: `type="date"` routes to DateField rather than to a native date input.
    // ONE edit reaches all FOUR of this form's date fields, which is the point of the
    // wrapper existing at all -- and it is why the conversion is done here rather than at
    // each site. (This wrapper is one of BR-4's four; replacing it wholesale is `04.3`.)
    const Field = ({ label, name, type = 'text', fullWidth = false, textarea = false }) =>
        textarea
            ? <TextArea label={label} name={name} />
            : (
                // `sm:col-span-2`, not `col-span-2`: in a one-column grid a span of two
                // is a span past the end, which some engines honour by widening the track.
                <div className={fullWidth ? 'sm:col-span-2' : ''}>
                    {type === 'date'
                        ? <DateField label={label} name={name} value={formData[name]} onChange={handleChange} hint="ago" />
                        : <TextInput label={label} name={name} type={type} value={formData[name]} onChange={handleChange} />}
                </div>
            );

    const Section = ({ title, children }) => (
        <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-on-brand bg-brand-hover px-4 py-2 rounded-md mb-4">{title}</h3>
            {/* 📱 R-RESP-O: PHONE-FIRST, and this form is the reason the rule exists.
                It is an organiser's site-visit report -- filled in standing up, in a
                branch -- and it had NO breakpoint at all: a hard `grid-cols-2`, so every
                field was half of 390px, roughly 170px, on the device it is actually used
                on. One column is the DEFAULT here and two is the enhancement, which is
                what "phone-first" means as opposed to a desktop layout with a phone
                exception bolted on. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
        </div>
    );

    return (
        <div className="p-6 text-ink">
            <PageTitle
                title="Organizer Report"
                subtitle="Streamline and record organizer site visits, branch engagements, and membership recruitment across all financial institutions."
            />
            <div className="max-w-4xl mx-auto bg-surface rounded-2xl shadow-lg p-8">
                <div className="text-center mb-6 pb-4 border-b-2 border-brand">
                    {/* 🔴 THIS WAS AN <h1>, AND IT IS THE SUBTLER HALF OF N8. The page's
                        actual title was an <h2> above it while this line of form chrome --
                        `text-sm`, uppercase, 14px -- was the document's top-level heading.
                        A screen-reader user jumping by heading landed here and was told the
                        most important thing on the page was the form's letterhead. It is
                        the form's name, so it is a heading, but a SECOND-level one under
                        the page title PageTitle now supplies. */}
                    <h2 className="text-sm font-semibold text-brand-ink tracking-wide uppercase">
                        SASBO Finance Union — Organizer's Branch / Department Report Form
                    </h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <Section title="General Data">
                        <Field label="Organiser Name" name="organiserName" />
                        <Field label="Date of Visit" name="dateOfVisit" type="date" />
                        <Field label="Time In" name="timeIn" type="time" />
                        <Field label="Time Out" name="timeOut" type="time" />
                        <Field label="Bank" name="bank" />
                        <Field label="Branch / Department" name="branchDepartment" />
                        <Field label="R / A Number" name="raNumber" />
                        <Field label="Area" name="area" />
                        <Field label="Postal Address" name="postalAddress" fullWidth textarea />
                        <Field label="Physical Address" name="physicalAddress" fullWidth textarea />
                        <Field label="Branch / Dep Tel No" name="branchDepTelNo" type="tel" />
                        <Field label="Branch / Dep Fax No" name="branchDepFaxNo" type="tel" />
                        <Field label="Branch / Dep Manager" name="branchDepManager" fullWidth />
                        <Field label="Branch Rep Name" name="branchRepName" />
                        <Field label="Cell Phone & E-Mail" name="cellPhoneEmail1" />
                        <Field label="Memnet Mem Name" name="memnetMemName" />
                        <Field label="Cell Phone & Email" name="cellPhoneEmail2" />
                        <Field label="BEC Member Name" name="becMemberName" />
                        <Field label="Cell Phone & Email" name="cellPhoneEmail3" />
                    </Section>

                    <Section title="Membership (After Visit)">
                        <Field label="Compliment" name="compliment" />
                        <Field label="No of Non-Members" name="noOfNonMembers" type="number" />
                        <Field label="Membership" name="membership" />
                        <Field label="No of New Members Recruited" name="noOfNewMembersRecruited" type="number" />
                        <Field label="Percentage Penetration" name="percentagePenetration" />
                        <Field label="No of Non-Members Interviewed" name="noOfNonMembersInterviewed" type="number" />
                    </Section>

                    <Section title="Distribution">
                        <Field label="Organiser Signature" name="organiserSignature" />
                        <Field label="Date" name="organiserSignatureDate" type="date" />
                        <Field label="Snr Organiser Signature" name="snrOrganiserSignature" />
                        <Field label="Date" name="snrOrganiserSignatureDate" type="date" />
                        <Field label="Admin Dept Signature" name="adminDeptSignature" fullWidth />
                        <Field label="Date Captured" name="dateCaptured" type="date" />
                    </Section>

                    <div className="flex justify-center gap-3 pt-4 border-t border-line">
                        <Button type="submit" variant="primary">Submit Report</Button>
                        <Button type="reset" variant="default">Clear Form</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
