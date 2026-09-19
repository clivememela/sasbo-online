import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import TextInput from '../../components/form/TextInput';
import DateField from '../../components/form/DateField';
import Button from '../../components/form/Button';
import PageTitle from '../../components/common/PageTitle';
import { Page } from '../../components/common/Sheet.jsx';

/**
 * 🔴 THESE THREE LIVE AT MODULE SCOPE, AND UNTIL NOW THEY DID NOT -- WHICH BROKE TYPING.
 *
 * `TextArea`, `Field` and `Section` were declared INSIDE `OrganizerReport`, so every render
 * produced three brand-new function identities. React compares an element's `type` by
 * identity: a new type is not the same component, so React does not update the old tree, it
 * UNMOUNTS it and mounts a fresh one. This form holds `formData` in state and writes to it
 * on every keystroke -- so each character re-rendered the parent, replaced all three
 * component types, and tore down and rebuilt all 31 fields. **The field being typed in lost
 * focus after every single character**, and an open `DateField` calendar closed with it. On
 * the one form an organiser fills in standing up, in a branch.
 *
 * The values reach them through a context rather than through 31 new pairs of props, because
 * the IDENTITY is what had to stop changing; the data was never the problem.
 * `eslint`'s `react-hooks/static-components` had been reporting this the whole time.
 */
const FormScope = createContext({ values: {}, onChange: () => {} });

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
const TextArea = ({ label, name, rows = 3 }) => {
    const { values, onChange } = useContext(FormScope);
    return (
    <TextInput
        label={label}
        name={name}
        multiline
        rows={rows}
        value={values[name]}
        onChange={onChange}
        className="sm:col-span-2"
    />
    );
};

// 🔴 `03.3`: `type="date"` routes to DateField rather than to a native date input.
// ONE edit reaches all FOUR of this form's date fields, which is the point of the
// wrapper existing at all -- and it is why the conversion is done here rather than at
// each site. (This wrapper is one of BR-4's four; replacing it wholesale is `04.3`.)
const Field = ({ label, name, type = 'text', fullWidth = false, textarea = false }) => {
    const { values, onChange } = useContext(FormScope);
    return textarea
        ? <TextArea label={label} name={name} />
        : (
            // `sm:col-span-2`, not `col-span-2`: in a one-column grid a span of two
            // is a span past the end, which some engines honour by widening the track.
            <div className={fullWidth ? 'sm:col-span-2' : ''}>
                {type === 'date'
                    ? <DateField label={label} name={name} value={values[name]} onChange={onChange} hint="ago" />
                    : <TextInput label={label} name={name} type={type} value={values[name]} onChange={onChange} />}
            </div>
        );
};

/*
 * 🔴 THE SOLID TEAL BAND IS GONE. Each section used to be announced by a filled
 * `bg-brand-hover` bar with white small capitals across it -- three of them down the
 * form. The Card world has exactly one filled brand surface, the primary button, and
 * one place the palette is allowed to be material, the membership card; a form's
 * section head is neither. card.css's `.fieldgroup__title` is what this is: small
 * capitals in muted ink, with a hairline separating one group from the next.
 */
const Section = ({ title, children }) => (
    <div className="mt-5 border-t border-line pt-[18px] first:mt-0 first:border-t-0 first:pt-0">
        <h3 className="mb-3.5 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">{title}</h3>
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

/**
 * 🔴 `embedded` EXISTS BECAUSE THIS REPORT HAS TWO HOMES. It is the route
 * `/reports/organizer-report`, and it is also what `Forms` renders when you pick either
 * Branch Form -- and inside `Forms` it brought a second page gutter and a second `<h1>`
 * with it. Two `<h1>`s on one route is the exact defect `headingContract.test.jsx` guards,
 * and that test cannot see this one because reaching it takes a change of select.
 *
 * Embedded, the report is only its sheet, captioned by the `<h2>` letterhead it already
 * had -- which is the shape `GeneralForm` uses in the same picker.
 */
export const OrganizerReport = ({ filters, embedded = false }) => {
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

    /*
     * 🔴 AN UNREACHABLE EFFECT, DELETED. Register row **A60**; `10.4`, and [F-P60]. Same defect as
     * `GeneralForm.jsx`, whose comment carries the full account.
     *
     * `Forms.jsx:60` renders this as `<OrganizerReport embedded />` and `App.jsx:92` as
     * `<OrganizerReport />`. Neither passes `filters`, and nothing ever has -- so `if (filters)`
     * was permanently false and this effect could not run.
     *
     * ⚠️ The prop stays in the signature so the real defect is not buried with the dead code:
     * the Bank, Branch, Area and R/A No the user types into `Forms.jsx` are DISCARDED, and this
     * report opens with all four blank. Wiring them through is a change to what the screen does
     * and waits on the owner; when it is granted, seed the form with a `key` or during render,
     * never by restoring an effect like this one -- it would overwrite what the user had
     * already typed every time a criterion changed.
     */

    // `useCallback` with no dependencies: `setFormData`'s updater form reads the previous
    // state, so this handler never needs to close over `formData` and never has to change.
    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

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

    // One object per render, so a keystroke reaches all 31 fields -- which is what a
    // controlled form does anyway. What must NOT change per render is the component
    // identity, and that is now fixed at module scope above.
    const scope = useMemo(() => ({ values: formData, onChange: handleChange }), [formData, handleChange]);

    const sheet = (
        <FormScope.Provider value={scope}>
            <div className="mt-5 max-w-4xl rounded-lg bg-surface p-6 shadow-(--shadow-1)">
                {/* The form's own letterhead, kept because this IS a paper form that gets
                    printed -- but as a hairline and quiet ink rather than a 2px brand rule.
                    Nothing else in this world underlines itself in the brand's colour. */}
                <div className="mb-6 border-b border-line pb-4 text-center">
                    {/* 🔴 THIS WAS AN <h1>, AND IT IS THE SUBTLER HALF OF N8. The page's
                        actual title was an <h2> above it while this line of form chrome --
                        `text-sm`, uppercase, 14px -- was the document's top-level heading.
                        A screen-reader user jumping by heading landed here and was told the
                        most important thing on the page was the form's letterhead. It is
                        the form's name, so it is a heading, but a SECOND-level one under
                        the page title PageTitle now supplies. */}
                    <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
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

                    {/* The actions sit where every other surface in this world puts them:
                        at the end of the sheet, to the right, primary last. */}
                    <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
                        <Button type="reset" variant="default">Clear form</Button>
                        <Button type="submit" variant="primary">Submit report</Button>
                    </div>
                </form>
            </div>
        </FormScope.Provider>
    );

    if (embedded) return sheet;

    return (
        <Page>
            <PageTitle
                title="Organizer Report"
                subtitle="Streamline and record organizer site visits, branch engagements, and membership recruitment across all financial institutions."
            />
            {sheet}
        </Page>
    );
};
