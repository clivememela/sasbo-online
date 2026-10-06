import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

function displayDate(value, fallback = '—') {
    if (!value) return fallback;
    const date = new Date(String(value).split('T')[0]);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function displayLongDate(value, fallback) {
    if (!value) return fallback;
    const date = new Date(String(value).split('T')[0]);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function wrapText(text, font, size, maxWidth) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) line = candidate;
        else { lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    return lines;
}

export async function createWelcomeLetterPdf(member, generatedAt = new Date()) {
    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    const addPageIfNeeded = (height = 16) => {
        if (y - height < MARGIN) {
            page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            y = PAGE_HEIGHT - MARGIN;
        }
    };
    const text = (value, options = {}) => {
        const { font = regular, size = 10, color = rgb(0.12, 0.12, 0.12), indent = 0 } = options;
        page.drawText(String(value ?? ''), { x: MARGIN + indent, y, size, font, color });
        y -= size + 5;
    };
    const paragraph = (value) => {
        for (const line of wrapText(value, regular, 10, CONTENT_WIDTH)) { addPageIfNeeded(15); text(line); }
        y -= 4;
    };

    const fullName = [member.title, member.firstNames, member.surname].filter(Boolean).join(' ') || 'Member';
    const membershipNo = member.membershipNumber || '(no membership number yet)';
    const generatedDate = generatedAt.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

    text('WELCOME LETTER', { font: bold, size: 18, color: rgb(0.08, 0.32, 0.25) });
    y -= 8;
    text(generatedDate, { indent: CONTENT_WIDTH - regular.widthOfTextAtSize(generatedDate, 10) });
    y -= 8;
    text(fullName, { font: bold });
    for (const line of String(member.address || '').split(/\n|,/).map((part) => part.trim()).filter(Boolean)) text(line);
    y -= 10;

    page.drawRectangle({ x: MARGIN, y: y - 8, width: CONTENT_WIDTH, height: 28, color: rgb(0.92, 0.95, 0.94) });
    page.drawText(`Your Sasbo Membership No: ${membershipNo}`, { x: MARGIN + 12, y: y + 1, size: 11, font: bold, color: rgb(0.08, 0.32, 0.25) });
    y -= 42;

    text(`Dear ${fullName},`, { font: bold });
    y -= 4;
    paragraph('Welcome to Sasbo, thank you for joining the most progressive Union in the financial services sector. We trust it will be a long and happy relationship as we continue to make a positive difference in the lives of our members.');
    paragraph("Now that you are a Sasbo member, be assured of the Unions' responsible protection and support while being entitled to many money saving benefits. Your membership number is enclosed at the top of the home page for your convenience. Please keep it safe as you would need the membership number to appreciate the benefits our Union has to offer you.");
    paragraph('In the meantime, we have so much more to share to ensure that you are completely informed about our services, benefits and partnerships we have established for your benefit. Please refer to the enclosed member onboarding information sheet for your individual use.');
    paragraph("We encourage you to play an active role at Sasbo's Annual General Meetings and to participate in the branch committee in your area. We wish a long and happy relationship with us.");

    addPageIfNeeded(150);
    y -= 8;
    text('Member Details', { font: bold, size: 12, color: rgb(0.08, 0.32, 0.25) });
    const rows = [
        ['Full Name', fullName],
        ['Identity Number', member.identityNumber || '—'],
        ['Date of Birth', displayDate(member.dateOfBirth)],
        ['Employee Number', member.employeeNumber || '—'],
        ['Bank', member.bankName || '—'],
        ['Payment Type', member.paymentType || '—'],
        ['Date Joined', displayLongDate(member.joinDate, generatedDate)],
        ['Status', member.status || 'Active'],
    ];
    for (const [label, value] of rows) {
        addPageIfNeeded(16);
        page.drawText(label, { x: MARGIN, y, size: 9, font: bold });
        page.drawText(String(value), { x: MARGIN + 145, y, size: 9, font: regular });
        page.drawLine({ start: { x: MARGIN, y: y - 3 }, end: { x: MARGIN + CONTENT_WIDTH, y: y - 3 }, thickness: 0.35, color: rgb(0.82, 0.82, 0.82) });
        y -= 16;
    }

    addPageIfNeeded(65);
    y -= 18;
    text('Your Faithfully,');
    y -= 12;
    text('Ms. Rosemary M. Rauleka', { font: bold });
    text('General Secretary: Sasbo the Finance Union', { color: rgb(0.35, 0.35, 0.35) });

    return pdf.save();
}
