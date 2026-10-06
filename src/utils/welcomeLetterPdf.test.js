import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { createWelcomeLetterPdf } from './welcomeLetterPdf.js';

describe('createWelcomeLetterPdf', () => {
    it('creates a readable populated PDF for a new member', async () => {
        const bytes = await createWelcomeLetterPdf({
            title: 'Mr',
            firstNames: 'John',
            surname: 'Doe',
            address: '123 Main Street, Johannesburg, 2000',
            identityNumber: '8512315800081',
            dateOfBirth: '1985-12-31',
            employeeNumber: 'EMP001',
            bankName: 'First National Bank',
            paymentType: 'Debit Order',
            joinDate: '2024-01-15',
            status: 'Active',
        }, new Date('2024-01-15T00:00:00Z'));

        const pdf = await PDFDocument.load(bytes);
        expect(pdf.getPageCount()).toBeGreaterThan(0);
        expect(bytes.slice(0, 5).toString()).toBe('37,80,68,70,45');
    });
});
