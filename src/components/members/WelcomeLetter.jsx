import { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Modal, { closeOn } from '../overlay/Modal';
import Button from '../form/Button';
import { memberService } from '@/services/memberService.js';
import { formatDate } from '@/utils/validateSAID.js';

/**
 * Shown after a member is successfully captured.
 *
 * Renders the Sasbo Welcome Letter content with all member fields filled in,
 * matching the placeholders in the .docx template. The "Send Welcome Letter"
 * button triggers the backend to email the filled .docx to the member's
 * preferred email address(es).
 *
 * 🔑 THE CARD'S WORLD, BY RULE. card.html drew no letter, so the preview takes the world's materials rather than a
 * page of its own: the sheet is `surface` on the dialog's `bg`, ruled with `line`, its ink `ink` and `ink-muted`, in
 * the application's type -- in both themes. The words are the template's, including its sign-off, so the preview
 * says what the member will receive.
 */
export default function WelcomeLetter({ open, onClose, member }) {
    const [sendState, setSendState] = useState('idle'); // idle | sending | sent | error
    const [errorMessage, setErrorMessage] = useState('');

    /*
     * 🔴 A51: ONE SEND STATE PER MEMBER. CaptureMember keeps this dialog mounted and swaps its member, so a state that
     * is never reset carried "sent" onto the next member captured in the same visit -- whose dialog opened with no
     * Send button. Reset when the member changes, during render (React's pattern for state derived from a prop),
     * never on a re-render of the same member.
     */
    const memberKey = member?.id ?? null;
    const [stateFor, setStateFor] = useState(memberKey);
    if (stateFor !== memberKey) {
        setStateFor(memberKey);
        setSendState('idle');
        setErrorMessage('');
    }

    if (!member) return null;

    const fullName = [member.title, member.firstNames, member.surname]
        .filter(Boolean).join(' ');

    const today = new Date().toLocaleDateString('en-ZA', {
        day: 'numeric', month: 'long', year: 'numeric',
    });

    /*
     * 🔴 A52: NOTHING ASSIGNS A MEMBERSHIP NUMBER YET (A54, the server's), so a newly captured member has none and the
     * emailed letter goes out with the space blank. The preview said "—", which reads as a number to come. It now
     * says, before Send is pressed, that the letter carries no number.
     */
    const membershipNo = member.membershipNumber || '';

    const preferredLabel = (() => {
        const pref = member.preferredEmail;
        if (pref === 'both') {
            return [member.personalEmail, member.workEmail].filter(Boolean).join(' and ') || '—';
        }
        if (pref === 'work') return member.workEmail || '—';
        return member.personalEmail || member.workEmail || '—';
    })();

    /*
     * 🔴 A56: A LETTER WITH NOWHERE TO GO WAS STILL OFFERED. Capture saves a member with no email address, and the dialog
     * read "emailed as an attachment to —" beside an enabled Send; the server refuses it (400, "No email address is
     * available for this member."). Send is not offered when the member has no address at all, and the dialog says why.
     */
    const hasAddress = Boolean(member.personalEmail || member.workEmail);

    const handleSend = () => {
        if (!member.id) {
            setErrorMessage('Member ID is missing — cannot send email.');
            setSendState('error');
            return;
        }
        setSendState('sending');
        setErrorMessage('');
        memberService.sendWelcomeLetter(member.id)
            .then(() => setSendState('sent'))
            .catch((err) => {
                setErrorMessage(err?.message || 'The email could not be sent. Please try again.');
                setSendState('error');
            });
    };

    return (
        <Modal
            open={open}
            onOpenChange={closeOn(onClose)}
            title="Welcome Letter Preview"
            size="xl"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                    {sendState === 'sent' ? (
                        <span role="status" className="flex items-center gap-2 text-sm font-medium text-status-active">
                            <CheckCircle2 className="size-4" aria-hidden="true" />
                            Welcome Letter Sent
                        </span>
                    ) : (
                        <Button
                            variant="primary"
                            onClick={handleSend}
                            disabled={sendState === 'sending' || !hasAddress}
                        >
                            {sendState === 'sending'
                                ? <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />
                                : <Send className="mr-1.5 size-4" aria-hidden="true" />}
                            {sendState === 'sending' ? 'Sending…' : 'Send Welcome Letter'}
                        </Button>
                    )}
                </>
            }
        >
            {/* Recipient notice */}
            {hasAddress ? (
                <p className="mb-4 text-sm text-ink-muted">
                    This letter will be emailed as an attachment to{' '}
                    <strong className="text-ink">{preferredLabel}</strong>
                    {member.preferredEmail === 'both' && ' (both addresses)'}.
                </p>
            ) : (
                <p className="mb-4 flex items-start gap-2 rounded-lg border border-status-suspended-dot bg-status-suspended-bg p-3 text-sm text-status-suspended">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>This member has no email address, so the letter cannot be sent. Add one to the member's record first.</span>
                </p>
            )}

            {!membershipNo && (
                <p className="mb-4 flex items-start gap-2 rounded-lg border border-status-pending-dot bg-status-pending-bg p-3 text-sm text-status-pending">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>This member has no membership number yet, so the letter will be sent with that space blank.</span>
                </p>
            )}

            {sendState === 'error' && (
                <div role="alert" data-send-error className="mb-4 flex items-start gap-2 rounded-lg border border-status-suspended-dot bg-status-suspended-bg p-3 text-sm text-status-suspended">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* Letter preview — mirrors the .docx layout */}
            <div data-testid="welcome-letter" className="rounded-lg border border-line bg-surface p-5 text-sm leading-relaxed text-ink sm:p-8">

                {/* Header: date + address block */}
                <div className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                    <div className="min-w-0 space-y-0.5">
                        <p>{fullName}</p>
                        <p>{member.address || ''}</p>
                    </div>
                    <p className="sm:text-right">{today}</p>
                </div>

                {/* Membership number banner */}
                <div className="mb-6 rounded-md bg-surface-2 px-4 py-2 text-center font-semibold">
                    Your Sasbo Membership No:{' '}
                    {membershipNo
                        ? <span className="text-brand-ink">{membershipNo}</span>
                        : <span className="font-normal text-ink-muted">(no membership number yet)</span>}
                </div>

                {/* Salutation */}
                <p className="mb-4">Dear <strong>{fullName}</strong>,</p>

                {/* Body */}
                <p className="mb-3">
                    Welcome to Sasbo, thank you for joining the most progressive Union in the financial
                    services sector. We trust it will be a long and happy relationship as we continue to
                    make a positive difference in the lives of our members.
                </p>
                <p className="mb-3">
                    Now that you are a Sasbo member, be assured of the Unions' responsible protection and
                    support while being entitled to many money saving benefits. Your membership number is
                    enclosed at the top of the home page for your convenience. Please keep it safe as you
                    would need the membership number to appreciate the benefits our Union has to offer you.
                </p>
                <p className="mb-3">
                    In the meantime, we have so much more to share to ensure that you are completely
                    informed about our services, benefits and partnerships we have established for your
                    benefit. Please refer to the enclosed member onboarding information sheet for your
                    individual use.
                </p>
                <p className="mb-3">
                    We encourage you to play an active role at Sasbo's Annual General Meetings and to
                    participate in the branch committee in your area. We wish a long and happy relationship
                    with us.
                </p>

                {/* Member details summary */}
                <table className="my-6 w-full border-collapse text-sm">
                    <tbody>
                        {[
                            ['Full Name',        fullName],
                            ['Identity Number',  member.identityNumber || '—'],
                            ['Date of Birth',    member.dateOfBirth ? formatDate(member.dateOfBirth) : '—'],
                            ['Employee Number',  member.employeeNumber || '—'],
                            ['Bank',             member.bankName || '—'],
                            ['Payment Type',     member.paymentType || '—'],
                            ['Date Joined',      member.joinDate ? formatDate(String(member.joinDate).split('T')[0]) : today],
                            ['Status',           member.status || 'Active'],
                        ].map(([label, value]) => (
                            <tr key={label} className="border-b border-line last:border-0">
                                <td className="w-32 py-1.5 pr-4 font-medium text-ink-muted sm:w-44 sm:pr-6">{label}</td>
                                <td className="break-words py-1.5">{value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Sign-off -- the template's own words (Sasbo Welcome Letter.docx), which is what the member receives. */}
                <p className="mt-6">Your Faithfully,</p>
                <p className="mt-1 font-semibold">Ms. Rosemary M. Rauleka</p>
                <p className="text-ink-muted">General Secretary: Sasbo the Finance Union</p>
            </div>
        </Modal>
    );
}
