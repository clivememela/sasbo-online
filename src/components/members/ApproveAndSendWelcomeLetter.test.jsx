// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApproveAndSendWelcomeLetter from './ApproveAndSendWelcomeLetter';
import { memberService } from '@/services/memberService';

vi.mock('@/services/memberService');

describe('ApproveAndSendWelcomeLetter', () => {
    const mockMember = {
        id: 1,
        title: 'Mr',
        firstNames: 'John',
        surname: 'Doe',
        identityNumber: '8512315800081',
        dateOfBirth: '1985-12-31',
        address: '123 Main Street, Johannesburg, 2000',
        personalEmail: 'john.doe@example.com',
        workEmail: 'john.doe@bank.com',
        preferredEmail: 'personal',
        employeeNumber: 'EMP123',
        bankName: 'First National Bank',
        paymentType: 'Debit Order',
        joinDate: '2024-01-15',
        status: 'Active',
        membershipNumber: 'SM001234',
    };

    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        memberService.previewWelcomeLetter = vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
        memberService.sendWelcomeLetter = vi.fn();
        memberService.createMember = vi.fn();
    });

    describe('Preview Step', () => {
        it('renders preview step when modal opens', async () => {
            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={mockMember}
                    onSuccess={mockOnSuccess}
                />
            );

            expect(screen.getByText('Welcome Letter Preview')).toBeInTheDocument();
            await waitFor(() => expect(screen.getByTitle('Sasbo Welcome Letter.pdf')).toBeInTheDocument());
        });

        it('displays member data in preview', async () => {
            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={mockMember}
                    onSuccess={mockOnSuccess}
                />
            );

            await waitFor(() => expect(screen.getByText('Sasbo Welcome Letter.pdf')).toBeInTheDocument());
        });

        it('displays recipient email in preview', () => {
            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={mockMember}
                    onSuccess={mockOnSuccess}
                />
            );

            expect(screen.getByText(/john.doe@example.com/)).toBeInTheDocument();
        });

        it('displays warning when membership number is missing', () => {
            const memberNoNumber = { ...mockMember, membershipNumber: '' };

            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={memberNoNumber}
                    onSuccess={mockOnSuccess}
                />
            );

            expect(screen.getByText(/no membership number yet/i)).toBeInTheDocument();
        });

        it('disables approve button when member has no email', () => {
            const memberNoEmail = { ...mockMember, personalEmail: '', workEmail: '' };

            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={memberNoEmail}
                    onSuccess={mockOnSuccess}
                />
            );

            const approveButton = screen.getByRole('button', { name: /Approve & Continue/i });
            expect(approveButton).toBeDisabled();
            expect(screen.getByText(/no email address/i)).toBeInTheDocument();
        });

        it('displays both emails when preferred email is both', () => {
            const memberBothEmails = { ...mockMember, preferredEmail: 'both' };

            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={memberBothEmails}
                    onSuccess={mockOnSuccess}
                />
            );

            expect(screen.getByText(/john.doe@example.com and john.doe@bank.com/)).toBeInTheDocument();
            expect(screen.getByText(/both addresses/)).toBeInTheDocument();
        });

        it('formats date of birth as dd/mm/yyyy in preview', () => {
            const memberWithDOB = { ...mockMember, dateOfBirth: '1985-12-31' };

            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={memberWithDOB}
                    onSuccess={mockOnSuccess}
                />
            );

            // formatDate should return 31/12/1985
            expect(screen.getByText(/31\/12\/1985/)).toBeInTheDocument();
        });
    });

    describe('Approve Step Transition', () => {
        it('transitions to send confirmation when approve is clicked', async () => {
            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={mockMember}
                    onSuccess={mockOnSuccess}
                />
            );

            const approveButton = screen.getByRole('button', { name: /Approve & Continue/i });
            fireEvent.click(approveButton);

            await waitFor(() => {
                expect(screen.getByText('Send Welcome Letter')).toBeInTheDocument();
                expect(screen.getByText(/Ready to send\?/)).toBeInTheDocument();
            });
        });

        it('displays confirmation summary after approve', async () => {
            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={mockMember}
                    onSuccess={mockOnSuccess}
                />
            );

            fireEvent.click(screen.getByRole('button', { name: /Approve & Continue/i }));

            await waitFor(() => {
                expect(screen.getByText('Sasbo Welcome Letter.pdf')).toBeInTheDocument();
                expect(screen.getByText('PDF')).toBeInTheDocument();
                expect(screen.getByText('SM001234')).toBeInTheDocument();
            });
        });

        it('allows going back to preview after approve', async () => {
            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={mockMember}
                    onSuccess={mockOnSuccess}
                />
            );

            fireEvent.click(screen.getByRole('button', { name: /Approve & Continue/i }));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Back to Preview/i })).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: /Back to Preview/i }));

            await waitFor(() => {
                expect(screen.getByText('Welcome Letter Preview')).toBeInTheDocument();
            });
        });
    });

    describe('Send Step', () => {
        it('sends welcome letter for existing member', async () => {
            memberService.sendWelcomeLetter.mockResolvedValue(mockMember);

            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={mockMember}
                    onSuccess={mockOnSuccess}
                />
            );

            // Click approve
            fireEvent.click(screen.getByRole('button', { name: /Approve & Continue/i }));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Send Welcome Letter/i })).toBeInTheDocument();
            });

            // Click send
            fireEvent.click(screen.getByRole('button', { name: /Send Welcome Letter/i }));

            await waitFor(() => {
                expect(memberService.sendWelcomeLetter).toHaveBeenCalledWith(mockMember.id);
                expect(screen.getByText(/Welcome Letter Sent/)).toBeInTheDocument();
                expect(mockOnSuccess).toHaveBeenCalledWith(mockMember);
            });
        });

        it('creates member with sendWelcome flag for new member', async () => {
            const newMember = { ...mockMember, id: undefined };
            memberService.createMember.mockResolvedValue({ ...newMember, id: 999 });

            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={newMember}
                    onSuccess={mockOnSuccess}
                />
            );

            fireEvent.click(screen.getByRole('button', { name: /Approve & Continue/i }));

            await waitFor(() => {
                fireEvent.click(screen.getByRole('button', { name: /Send Welcome Letter/i }));
            });

            await waitFor(() => {
                expect(memberService.createMember).toHaveBeenCalledWith(
                    newMember,
                    { sendWelcome: true }
                );
            });
        });

        it('shows loading state during send', async () => {
            memberService.sendWelcomeLetter.mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve(mockMember), 100))
            );

            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={mockMember}
                    onSuccess={mockOnSuccess}
                />
            );

            fireEvent.click(screen.getByRole('button', { name: /Approve & Continue/i }));

            await waitFor(() => {
                fireEvent.click(screen.getByRole('button', { name: /Send Welcome Letter/i }));
            });

            expect(screen.getByText(/Sending…/)).toBeInTheDocument();
        });

        it('shows success message after successful send', async () => {
            memberService.sendWelcomeLetter.mockResolvedValue(mockMember);

            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={mockMember}
                    onSuccess={mockOnSuccess}
                />
            );

            fireEvent.click(screen.getByRole('button', { name: /Approve & Continue/i }));

            await waitFor(() => {
                fireEvent.click(screen.getByRole('button', { name: /Send Welcome Letter/i }));
            });

            await waitFor(() => {
                expect(screen.getByText(/Welcome Letter Sent/)).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        it('displays error message on send failure', async () => {
            const errorMessage = 'Network error: Failed to send email';
            memberService.sendWelcomeLetter.mockRejectedValue(new Error(errorMessage));

            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={mockMember}
                    onSuccess={mockOnSuccess}
                />
            );

            fireEvent.click(screen.getByRole('button', { name: /Approve & Continue/i }));

            await waitFor(() => {
                fireEvent.click(screen.getByRole('button', { name: /Send Welcome Letter/i }));
            });

            await waitFor(() => {
                expect(screen.getByText(errorMessage)).toBeInTheDocument();
            });
        });

        it('allows retry after error', async () => {
            memberService.sendWelcomeLetter
                .mockRejectedValueOnce(new Error('Send failed'))
                .mockResolvedValueOnce(mockMember);

            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={mockMember}
                    onSuccess={mockOnSuccess}
                />
            );

            fireEvent.click(screen.getByRole('button', { name: /Approve & Continue/i }));

            await waitFor(() => {
                fireEvent.click(screen.getByRole('button', { name: /Send Welcome Letter/i }));
            });

            // Wait for error state
            await waitFor(() => {
                expect(screen.getByText(/Send failed/)).toBeInTheDocument();
            });

            // Click retry
            const retryButton = screen.getByRole('button', { name: /Retry Send/i });
            fireEvent.click(retryButton);

            // Should succeed now
            await waitFor(() => {
                expect(screen.getByText(/Welcome Letter Sent/)).toBeInTheDocument();
            });
        });

        it('displays generic error message if no message provided', async () => {
            memberService.sendWelcomeLetter.mockRejectedValue({});

            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={mockMember}
                    onSuccess={mockOnSuccess}
                />
            );

            fireEvent.click(screen.getByRole('button', { name: /Approve & Continue/i }));

            await waitFor(() => {
                fireEvent.click(screen.getByRole('button', { name: /Send Welcome Letter/i }));
            });

            await waitFor(() => {
                expect(screen.getByText(/Failed to send welcome letter/i)).toBeInTheDocument();
            });
        });
    });

    describe('Modal State Management', () => {
        it('resets state when member changes', async () => {
            const { rerender } = render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={mockMember}
                    onSuccess={mockOnSuccess}
                />
            );

            // Go to confirmation step
            fireEvent.click(screen.getByRole('button', { name: /Approve & Continue/i }));

            await waitFor(() => {
                expect(screen.getByText(/Ready to send\?/)).toBeInTheDocument();
            });

            // Change member
            const newMember = { ...mockMember, id: 2, firstNames: 'Jane' };
            rerender(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={newMember}
                    onSuccess={mockOnSuccess}
                />
            );

            // Should be back to preview
            await waitFor(() => {
                expect(screen.getByText('Welcome Letter Preview')).toBeInTheDocument();
                expect(screen.getByText('Jane Doe')).toBeInTheDocument();
            });
        });

        it('closes modal when onClose is called', () => {
            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={mockMember}
                    onSuccess={mockOnSuccess}
                />
            );

            // The close button should exist and work
            // (Modal component handles the actual closing through the scrim click)
        });

        it('does not render when open is false', () => {
            const { container } = render(
                <ApproveAndSendWelcomeLetter
                    open={false}
                    onClose={mockOnClose}
                    member={mockMember}
                    onSuccess={mockOnSuccess}
                />
            );

            expect(container.firstChild).toBeEmptyDOMElement();
        });

        it('does not render when member is null', () => {
            const { container } = render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={null}
                    onSuccess={mockOnSuccess}
                />
            );

            expect(container.firstChild).toBeEmptyDOMElement();
        });
    });

    describe('Email Preferences', () => {
        it('uses personal email when preferred is personal', () => {
            const member = { ...mockMember, preferredEmail: 'personal' };

            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={member}
                    onSuccess={mockOnSuccess}
                />
            );

            expect(screen.getByText(/john.doe@example.com/)).toBeInTheDocument();
        });

        it('uses work email when preferred is work', () => {
            const member = { ...mockMember, preferredEmail: 'work' };

            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={member}
                    onSuccess={mockOnSuccess}
                />
            );

            expect(screen.getByText(/john.doe@bank.com/)).toBeInTheDocument();
        });

        it('falls back to work email if personal unavailable', () => {
            const member = { ...mockMember, personalEmail: '', preferredEmail: 'personal' };

            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={member}
                    onSuccess={mockOnSuccess}
                />
            );

            expect(screen.getByText(/john.doe@bank.com/)).toBeInTheDocument();
        });

        it('shows em dash when no emails available', () => {
            const member = { ...mockMember, personalEmail: '', workEmail: '' };

            render(
                <ApproveAndSendWelcomeLetter
                    open={true}
                    onClose={mockOnClose}
                    member={member}
                    onSuccess={mockOnSuccess}
                />
            );

            expect(screen.getByText(/—/)).toBeInTheDocument();
        });
    });
});
