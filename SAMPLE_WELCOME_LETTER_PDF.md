# Sample Welcome Letter PDF Output

## Primary Test Member Data

Use this data to generate the sample welcome letter PDF shown below:

```
Title:                  Mr
Initials:              JD
First Names:           John
Surname:               Doe
Identity Type:         I.D. Number
Identity Number:       8512315800081
Date of Birth:         1985-12-31
Gender:                Male
Race:                  African
Personal Email:        john.doe@example.com
Work Email:            john.doe@company.com
Preferred Email:       Personal
Cellphone:             0701234567
Residential Address:   123 Main Street, Johannesburg, 2000

Employment:
  Employee Number:     EMP001
  Bank:               First National Bank
  Bank Branch:        Johannesburg Branch
  Employment Type:    Permanent
  Job Grade:          Grade 3
  IBT Number:         IBT123
  Bank Address:       FNB Building, 100 Main Road, Johannesburg

Membership:
  Date Joined:        2024-01-15 (displays as "15 January 2024")
  Status:             Active
  Monthly Subscription: R174.00
  Billing Frequency:  Monthly
  Payment Type:       Debit Order
  Bank Account:       12345678901234
  Debit Day:          20

Recruitment:
  Recruited How:      Organiser
  Recruiter:          John Smith
```

---

## Sample Welcome Letter PDF (Text Representation)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                          WELCOME LETTER PREVIEW                             │
│                           Sasbo the Finance Union                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


Mr John Doe
123 Main Street
Johannesburg
2000                                                    15 January 2024


                            Your Sasbo Membership No:
                              (no membership number yet)


Dear Mr John Doe,

Welcome to Sasbo, thank you for joining the most progressive Union in the 
financial services sector. We trust it will be a long and happy relationship as 
we continue to make a positive difference in the lives of our members.

Now that you are a Sasbo member, be assured of the Unions' responsible 
protection and support while being entitled to many money saving benefits. Your 
membership number is enclosed at the top of the home page for your convenience. 
Please keep it safe as you would need the membership number to appreciate the 
benefits our Union has to offer you.

In the meantime, we have so much more to share to ensure that you are 
completely informed about our services, benefits and partnerships we have 
established for your benefit. Please refer to the enclosed member onboarding 
information sheet for your individual use.

We encourage you to play an active role at Sasbo's Annual General Meetings and 
to participate in the branch committee in your area. We wish a long and happy 
relationship with us.


                        Member Details Summary
                        ─────────────────────────────────────────

Full Name                                          Mr John Doe

Identity Number                                    8512315800081

Date of Birth                                      31/12/1985

Employee Number                                    EMP001

Bank                                              First National Bank

Payment Type                                       Debit Order

Date Joined                                        15 January 2024

Status                                             Active

                        ─────────────────────────────────────────


Your Faithfully,


Ms. Rosemary M. Rauleka

General Secretary: Sasbo the Finance Union


┌─────────────────────────────────────────────────────────────────────────────┐
│                     [End of Welcome Letter Document]                       │
│                                                                             │
│  This letter will be emailed as a PDF attachment to:                        │
│  john.doe@example.com                                                       │
│                                                                             │
│  Generated: 26 September 2024                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Elements in Generated PDF

### Header Section
- ✅ Letterhead: "WELCOME LETTER" or logo (if configured)
- ✅ Recipient address:
  - Mr John Doe
  - 123 Main Street
  - Johannesburg
  - 2000

### Date Section
- ✅ Right-aligned date: **15 January 2024**
- ✅ Format: Day Month YYYY (not dd/mm/yyyy for readable dates)

### Membership Banner
- ✅ Centered box with blue background (brand color)
- ✅ Text: "Your Sasbo Membership No:"
- ✅ Value: **(no membership number yet)** OR **SM001234** (if assigned)

### Salutation
- ✅ Format: "Dear Mr John Doe,"
- ✅ Uses title + first name + surname

### Body Paragraphs
- ✅ Paragraph 1: Welcome message
- ✅ Paragraph 2: Benefits and membership number info
- ✅ Paragraph 3: Onboarding information
- ✅ Paragraph 4: Participation and closing

### Member Details Table
- ✅ Format: Definition list (two columns)
- ✅ Labels: Semi-bold gray text
- ✅ Values: Regular black text
- ✅ Fields included:
  - Full Name: Mr John Doe
  - Identity Number: 8512315800081
  - **Date of Birth: 31/12/1985** (dd/mm/yyyy format!)
  - Employee Number: EMP001
  - Bank: First National Bank
  - Payment Type: Debit Order
  - Date Joined: 15 January 2024
  - Status: Active

### Sign-off
- ✅ "Your Faithfully,"
- ✅ Signature line (or actual signature image if configured)
- ✅ Name: **Ms. Rosemary M. Rauleka**
- ✅ Title: **General Secretary: Sasbo the Finance Union**

---

## Date Format Consistency in PDF

The PDF must show these date formats:

| Field | Format | Example |
|-------|--------|---------|
| Date of Birth | dd/mm/yyyy | 31/12/1985 |
| Date Generated | Day Month YYYY | 26 September 2024 |
| Date Joined | Day Month YYYY | 15 January 2024 |

---

## Expected PDF Properties

| Property | Value |
|----------|-------|
| Page Size | A4 (210 x 297mm) |
| Margins | 20mm (all sides) |
| Font | Arial or Calibri, 11pt |
| Line Height | 1.5 (readable spacing) |
| Colors | Black text, brand blue accents |
| File Format | PDF (UTF-8 encoded) |
| File Size | 200-400 KB |
| Embeddable | Yes (in email) |
| Printable | Yes (professional output) |

---

## Variations by Member Data

### Variation 1: With Assigned Membership Number

```
                            Your Sasbo Membership No:
                                   SM001234
```

### Variation 2: Passport Number Identity

```
Identity Number                                    P1234567

Date of Birth                                      25/06/1990
```

### Variation 3: Payroll Deduction Payment

```
Payment Type                                       Payroll Deduction
```

(No bank account info included in table)

### Variation 4: Work Email Preferred

```
This letter will be emailed as a PDF attachment to:
jane.smith@company.com
```

### Variation 5: Both Emails

```
This letter will be emailed as a PDF attachment to:
john.doe@personal.com and john.doe@company.com (both addresses)
```

---

## How PDF is Generated

### Step 1: User Completes Form
```
Form Data (7 fields × 5 sections = ~35 fields)
↓
```

### Step 2: Form Validation
```
Validation Check
├─ All required fields filled? ✓
├─ Email address exists? ✓
├─ Date formats valid? ✓
└─ Identity number valid? ✓
↓
```

### Step 3: Preview Modal (Client-Side)
```
HTML/CSS Rendering in Browser
- Document styled to match official template
- Member data populated
- Shows exactly what PDF will contain
- NOT actual PDF yet (browser rendered)
↓
```

### Step 4: User Approves
```
User clicks "Approve & Continue"
↓
```

### Step 5: Confirmation Modal
```
Summary displayed:
- Recipient name and email
- Document format: PDF
- Membership number status
↓
```

### Step 6: User Sends
```
User clicks "Send Welcome Letter"
↓
```

### Step 7: Backend Processes
```
Backend API Call: POST /api/members/send-welcome-letter
Payload: { memberId: 1, ... }
    ↓
Generate PDF from Template:
  - Load: Sasbo Welcome Letter.pdf
  - Populate: Member data into placeholders
  - Convert: DOCX → PDF
  - Encoding: UTF-8
    ↓
Send Email:
  - To: john.doe@example.com
  - Subject: [Membership] Welcome to Sasbo
  - Attachment: WelcomeLetter_SM001234.pdf
  - From: noreply@sasbo.org
    ↓
Save Member Record:
  - membershipNumber: SM001234 (assigned)
  - welcomeLetterSentDate: 2024-09-26
  - welcomeLetterEmail: john.doe@example.com
    ↓
Response: { success: true, membershipNumber: "SM001234" }
↓
```

### Step 8: Success Confirmation
```
Frontend displays:
✅ Welcome Letter Sent

Modal closes, form resets
↓ Ready for next member
```

---

## Testing the PDF Output

### Development Environment
```bash
# 1. Fill test form
http://localhost:5173/members/capture

# 2. Fill with test data (see above)
# 3. Click "Save Member"
# 4. Preview modal shows document
# 5. Right-click preview area
# 6. "Print to PDF" or take screenshot
# 7. Save as: WelcomeLetter_TestDev.pdf
```

### Preprod Environment
```bash
# 1. Navigate to:
https://[app]-[hash]-preprod.vercel.app/members/capture

# 2. Complete form with test data
# 3. Approve and send
# 4. Check email inbox for: noreply@sasbo.org
# 5. Open attachment: WelcomeLetter_SM###.pdf
# 6. Verify all fields populated correctly
```

### Production Environment
```bash
# 1. Navigate to:
https://sasbo.online/members/capture

# 2. Use a test email account (if available)
# 3. Complete form and send
# 4. Check test email inbox
# 5. Verify PDF attachment
# 6. Confirm formatting and content
```

---

## PDF Sample Files

### Download Samples
The following sample PDFs are provided for testing:

1. **WelcomeLetter_Sample_NewMember.pdf**
   - New member (no membership number yet)
   - All fields populated
   - Both emails scenario

2. **WelcomeLetter_Sample_WithNumber.pdf**
   - Existing member (membership number assigned)
   - Shows SM001234 in banner
   - Single email scenario

3. **WelcomeLetter_Sample_Passport.pdf**
   - Passport identity type
   - Date of Birth: 25/06/1990
   - Shows Passport Number field

4. **WelcomeLetter_Sample_Payroll.pdf**
   - Payroll deduction payment type
   - No bank account fields
   - Work email preferred

---

## Verifying PDF Quality

### Checklist for Each PDF

- [ ] **Content Present**
  - [ ] All text visible and readable
  - [ ] Dates formatted as dd/mm/yyyy (or Day Month YYYY)
  - [ ] Member name correct
  - [ ] Address complete
  - [ ] Membership number correct (or "pending")

- [ ] **Formatting**
  - [ ] Professional appearance
  - [ ] Margins consistent
  - [ ] Font sizes readable (>10pt)
  - [ ] Tables properly aligned
  - [ ] No overlapping text
  - [ ] Page fits on single page

- [ ] **Data Accuracy**
  - [ ] All member fields present
  - [ ] No truncated values
  - [ ] Special characters rendered correctly
  - [ ] Email correct in delivery info

- [ ] **Email Delivery**
  - [ ] PDF attached to email
  - [ ] Subject line correct
  - [ ] From address correct
  - [ ] PDF opens without errors
  - [ ] PDF prints correctly

---

## Expected Email Content

### Subject Line
```
[Membership] Welcome to Sasbo
```

### Email Body (Plain Text)
```
Dear Member,

Your Sasbo membership has been confirmed. Please see the 
attached welcome letter for important information about 
your membership, benefits, and next steps.

If you have any questions, please contact us at:
  Email: info@sasbo.org
  Phone: +27 11 234 5678

Best regards,
Sasbo Membership Team
```

### Email Attachment
```
Filename: WelcomeLetter_SM001234.pdf
Type: PDF Document
Size: 250-400 KB
```

---

## Troubleshooting PDF Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| PDF not received | Email filter | Check spam/junk folder |
| Blank PDF | Template error | Verify docx file exists |
| Wrong data in PDF | Form data issue | Check member form data |
| Date format wrong | formatDate() error | Check format.js |
| Text truncated | Font size wrong | Check template margins |
| PDF won't open | Corrupt file | Regenerate and retry |

---

## Final Verification Checklist

Before considering the feature complete, verify:

- [ ] PDF generated successfully for new member
- [ ] PDF includes all member fields
- [ ] Date format: 31/12/1985 (dd/mm/yyyy)
- [ ] Membership number: Shows "pending" or assigned number
- [ ] Email delivered successfully
- [ ] PDF opens without errors
- [ ] Formatting matches official template
- [ ] Both email addresses work
- [ ] Error scenarios handled gracefully
- [ ] All environments produce same output

---

## Sample PDF Download

**Primary Sample File:**
```
/src/assets/documents/WelcomeLetter_Sample_SM001234.pdf
```

This file represents the expected output for:
- New member capture
- Complete form data
- Personal email preferred
- No membership number yet
- All fields populated

**Generated:** 26 September 2024
**Status:** Sample/Test Document
**Real PDFs:** Generated per member at send time

