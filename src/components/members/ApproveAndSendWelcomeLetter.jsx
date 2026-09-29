import { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react';
import Modal, { ModalClose, closeOn } from '../overlay/Modal';
import Button from '../form/Button';
import { memberService } from '@/services/memberService.js';
import { formatDate } from '@/utils/validateSAID.js';

/**
 * Two-step welcome letter workflow:
 * 1. PREVIEW & APPROVE: User views the letter document and approves it before sending
 * 2. SEND: User confirms and sends the welcome letter via email
 *
 * The document is populated with member data matching placeholders in "Sasbo Welcome Letter.docx".
 * After approval, the member is saved and the email is dispatched as a PDF attachment.
 */
export default function ApproveAndSendWelcomeLetter({ open, onClose, member, onSuccess }) {
    const [step, setStep] = useState('preview'); // preview | sending | sent | error
    const [errorMessage, setErrorMessage] = useState('');

    // Reset state when member changes or dialog opens
    const memberKey = member?.id ?? (member ? (member.identityNumber || member.surname || 'new') : null);
    const [stateFor, setStateFor] = useState(memberKey);
    if (stateFor !== memberKey) {
        setStateFor(memberKey);
        setStep('preview');
        setErrorMessage('');
    }

    if (!member) return null;

    const fullName = [member.title, member.firstNames, member.surname]
        .filter(Boolean).join(' ');

    const today = new Date().toLocaleDateString('en-ZA', {
        day: 'numeric', month: 'long', year: 'numeric',
    });

    const membershipNo = member.membershipNumber || '';
    const hasAddress = Boolean(member.personalEmail || member.workEmail);

    const preferredLabel = (() => {
        const pref = member.preferredEmail;
        if (pref === 'both') {
            return [member.personalEmail, member.workEmail].filter(Boolean).join(' and ') || '—';
        }
        if (pref === 'work') return member.workEmail || '—';
        return member.personalEmail || member.workEmail || '—';
    })();

    /**
     * Step 1: User approves the preview
     * Moves to the Send confirmation step
     */
    const handleApprove = () => {
        setStep('sendConfirm');
        setErrorMessage('');
    };

    /**
     * Step 2: User confirms and sends the welcome letter
     * Saves member and dispatches email with PDF attachment
     */
    const handleSend = () => {
        setStep('sending');
        setErrorMessage('');

        const sendPromise = member.id
            ? memberService.sendWelcomeLetter(member.id)
            : memberService.createMember(member, { sendWelcome: true });

        sendPromise
            .then((savedMember) => {
                setStep('sent');
                onSuccess?.(savedMember || member);
            })
            .catch((err) => {
                setErrorMessage(err?.message || 'The email could not be sent. Please try again.');
                setStep('error');
            });
    };

    /**
     * User can go back from Send confirmation to Preview
     */
    const handleBackToPreview = () => {
        setStep('preview');
        setErrorMessage('');
    };

    return (
        <Modal
            open={open}
            onOpenChange={closeOn(onClose)}
            busy={step === 'sending'}
            title={step === 'preview' ? 'Welcome Letter Preview' : 'Send Welcome Letter'}
            size="xl"
            footer={
                <>
                    {step === 'sent' ? (
                        <>
                            <ModalClose variant="ghost">Close</ModalClose>
                            <span role="status" className="flex items-center gap-2 text-sm font-medium text-status-active">
                                <CheckCircle2 className="size-4" aria-hidden="true" />
                                Welcome Letter Sent
                            </span>
                        </>
                    ) : step === 'preview' ? (
                        <>
                            <ModalClose variant="ghost">Cancel</ModalClose>
                            <Button
                                variant="primary"
                                onClick={handleApprove}
                                disabled={!hasAddress}
                            >
                                <FileText className="mr-1.5 size-4" aria-hidden="true" />
                                Approve & Continue
                            </Button>
                        </>
                    ) : step === 'sendConfirm' ? (
                        <>
                            <Button
                                variant="ghost"
                                onClick={handleBackToPreview}
                            >
                                Back to Preview
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSend}
                            >
                                <Send className="mr-1.5 size-4" aria-hidden="true" />
                                Send Welcome Letter
                            </Button>
                        </>
                    ) : (
                        <>
                            <ModalClose variant="ghost" disabled={step === 'sending'}>Close</ModalClose>
                            <Button
                                variant="primary"
                                onClick={handleSend}
                                disabled={step === 'sending'}
                            >
                                {step === 'sending'
                                    ? <><Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />Sending…</>
                                    : <><Send className="mr-1.5 size-4" aria-hidden="true" />Retry Send</>}
                            </Button>
                        </>
                    )}
                </>
            }
        >
            {/* Step 1: PREVIEW */}
            {step === 'preview' && (
                <>
                    {/* Recipient notice */}
                    {hasAddress ? (
                        <p className="mb-4 text-sm text-ink-muted">
                            After approval, this letter will be emailed as a PDF attachment to{' '}
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

                    {/* Letter preview */}
                    <div data-testid="welcome-letter-preview" className="rounded-lg border border-line bg-surface p-5 text-sm leading-relaxed text-ink sm:p-8">
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
                        <dl className="my-6 grid grid-cols-[8rem_minmax(0,1fr)] text-sm sm:grid-cols-[11rem_minmax(0,1fr)]">
                            {[
                                ['Full Name', fullName],
                                ['Identity Number', member.identityNumber || '—'],
                                ['Date of Birth', member.dateOfBirth ? formatDate(member.dateOfBirth) : '—'],
                                ['Employee Number', member.employeeNumber || '—'],
                                ['Bank', member.bankName || '—'],
                                ['Payment Type', member.paymentType || '—'],
                                ['Date Joined', member.joinDate ? formatDate(String(member.joinDate).split('T')[0]) : today],
                                ['Status', member.status || 'Active'],
                            ].map(([label, value], i, rows) => {
                                const rule = i < rows.length - 1 ? 'border-b border-line' : '';
                                return [
                                    <dt key={`${label}-term`} className={`py-1.5 pr-4 font-medium text-ink-muted sm:pr-6 ${rule}`}>{label}</dt>,
                                    <dd key={`${label}-value`} className={`break-words py-1.5 ${rule}`}>{value}</dd>,
                                ];
                            })}
                        </dl>

                        {/* Sign-off */}
                        <p className="mt-6">Your Faithfully,</p>
                        <p className="mt-1 font-semibold">Ms. Rosemary M. Rauleka</p>
                        <p className="text-ink-muted">General Secretary: Sasbo the Finance Union</p>
                    </div>
                </>
            )}

            {/* Step 2: CONFIRM & SEND */}
            {step === 'sendConfirm' && (
                <div className="space-y-4">
                    <div className="rounded-lg border border-status-active-dot bg-status-active-bg p-4 text-sm text-status-active">
                        <p className="font-medium mb-2">Ready to send?</p>
                        <p>
                            The welcome letter will be sent as a PDF attachment to{' '}
                            <strong>{preferredLabel}</strong>
                            {member.preferredEmail === 'both' && ' (both addresses)'}.
                        </p>
                        <p className="mt-2 text-xs text-ink-muted">
                            The member record will be saved and the email will be dispatched immediately.
                        </p>
                    </div>

                    {/* Preview summary */}
                    <div className="rounded-lg border border-line bg-surface-2 p-4">
                        <h4 className="font-semibold text-sm mb-3">Document Summary</h4>
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-ink-muted">Recipient:</dt>
                                <dd className="font-medium">{fullName}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-ink-muted">Email:</dt>
                                <dd className="font-medium">{preferredLabel}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-ink-muted">Membership No:</dt>
                                <dd className="font-medium">{membershipNo || '(pending)'}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-ink-muted">Format:</dt>
                                <dd className="font-medium">PDF</dd>
                            </div>
                        </dl>
                    </div>
                </div>
            )}

            {/* Step 3: SENDING/SENT */}
            {step === 'sending' && (
                <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="size-12 animate-spin text-brand mb-4" aria-hidden="true" />
                    <p className="text-lg font-medium">Sending welcome letter...</p>
                    <p className="text-sm text-ink-muted mt-2">Please wait while the member is saved and the email is dispatched.</p>
                </div>
            )}

            {/* Error state */}
            {step === 'error' && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-status-suspended-dot bg-status-suspended-bg p-4 text-sm text-status-suspended">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <div>
                        <p className="font-medium mb-1">Failed to send welcome letter</p>
                        <p>{errorMessage}</p>
                        <p className="mt-2 text-xs">Please try again or contact support if the problem persists.</p>
                    </div>
                </div>
            )}
        </Modal>
    );
}
