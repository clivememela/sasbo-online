import { useState, useEffect } from 'react';
import TextInput from '../../components/form/TextInput';
import DateField from '../../components/form/DateField';
import Button from '../../components/form/Button';

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
        console.log('Form submitted:', formData);
    };

    // Textarea uses same label style as TextInput but renders a textarea element
    const TextArea = ({ label, name, rows = 3 }) => (
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 col-span-2">
            {label}
            <textarea
                name={name}
                value={formData[name]}
                onChange={handleChange}
                rows={rows}
                className="rounded-lg px-3 py-2 text-sm font-normal normal-case tracking-normal border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 resize-y"
            />
        </label>
    );

    // 🔴 `03.3`: `type="date"` routes to DateField rather than to a native date input.
    // ONE edit reaches all FOUR of this form's date fields, which is the point of the
    // wrapper existing at all -- and it is why the conversion is done here rather than at
    // each site. (This wrapper is one of BR-4's four; replacing it wholesale is `04.3`.)
    const Field = ({ label, name, type = 'text', fullWidth = false, textarea = false }) =>
        textarea
            ? <TextArea label={label} name={name} />
            : (
                <div className={fullWidth ? 'col-span-2' : ''}>
                    {type === 'date'
                        ? <DateField label={label} name={name} value={formData[name]} onChange={handleChange} hint="ago" />
                        : <TextInput label={label} name={name} type={type} value={formData[name]} onChange={handleChange} />}
                </div>
            );

    const Section = ({ title, children }) => (
        <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-white bg-cyan-700 dark:bg-cyan-800 px-4 py-2 rounded-md mb-4">{title}</h2>
            <div className="grid grid-cols-2 gap-4">{children}</div>
        </div>
    );

    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <h2 className="text-3xl text-center mb-2 text-cyan-700 dark:text-cyan-400">Organizer Report</h2>
            <p className="max-w-3xl mx-auto text-center text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                Streamline and record organizer site visits, branch engagements, and membership recruitment across all financial institutions.
            </p>
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                <div className="text-center mb-6 pb-4 border-b-2 border-cyan-700 dark:border-cyan-600">
                    <h1 className="text-sm font-semibold text-cyan-700 dark:text-cyan-400 tracking-wide uppercase">
                        SASBO Finance Union — Organizer's Branch / Department Report Form
                    </h1>
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

                    <div className="flex justify-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button type="submit" variant="primary">Submit Report</Button>
                        <Button type="reset" variant="default">Clear Form</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
