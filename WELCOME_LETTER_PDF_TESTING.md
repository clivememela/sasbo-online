# Test Welcome Letter - Sample PDF Output

## Sample Test Member Data

Use the following test data to generate sample welcome letter PDFs:

### Test Case 1: Complete New Member (Primary Test)

```
Title: Mr
Initials: JD
First Names: John
Surname: Doe
Identity Type: I.D. Number
Identity Number: 8512315800081
Date of Birth: 1985-12-31 (displays as 31/12/1985)
Gender: Male
Race: African
Personal Email: john.doe@example.com
Work Email: john.doe@company.com
Preferred Email: Personal
Phone: 0701234567
Address: 123 Main Street, Johannesburg, 2000

Employment:
- Employee Number: EMP001
- Bank: First National Bank
- Branch: Johannesburg Branch
- Employment Type: Permanent
- Job Grade: Grade 3
- IBT Number: IBT123
- Bank Address: FNB Building, 100 Main Road, Johannesburg

Membership:
- Joined: 2024-01-15
- Status: Active
- Monthly Subscription: R174.00
- Frequency: Monthly
- Payment Type: Debit Order
- Bank Account: 12345678901234
- Debit Day: 20

Recruitment:
- Recruited How: Organiser
- Recruiter: John Smith
```

**Expected PDF Output:**

```
═══════════════════════════════════════════════════════════════

                     WELCOME LETTER

                                              15 January 2024

Mr John Doe
123 Main Street
Johannesburg
2000


                    Your Sasbo Membership No:
                        (no membership number yet)


Dear Mr John Doe,

Welcome to Sasbo, thank you for joining the most progressive 
Union in the financial services sector. We trust it will be a 
long and happy relationship as we continue to make a positive 
difference in the lives of our members.

Now that you are a Sasbo member, be assured of the Unions' 
responsible protection and support while being entitled to many 
money saving benefits. Your membership number is enclosed at the 
top of the home page for your convenience. Please keep it safe 
as you would need the membership number to appreciate the 
benefits our Union has to offer you.

In the meantime, we have so much more to share to ensure that 
you are completely informed about our services, benefits and 
partnerships we have established for your benefit. Please refer 
to the enclosed member onboarding information sheet for your 
individual use.

We encourage you to play an active role at Sasbo's Annual 
General Meetings and to participate in the branch committee in 
your area. We wish a long and happy relationship with us.


Member Details:
───────────────────────────────────────────────────────────────
Full Name                           Mr John Doe
Identity Number                     8512315800081
Date of Birth                       31/12/1985
Employee Number                     EMP001
Bank                               First National Bank
Payment Type                        Debit Order
Date Joined                         15 January 2024
Status                              Active
───────────────────────────────────────────────────────────────


Your Faithfully,


Ms. Rosemary M. Rauleka
General Secretary: Sasbo the Finance Union


═══════════════════════════════════════════════════════════════
```

---

## Test Cases for PDF Generation

### Test Case 2: Member with Passport Number

```
Title: Dr
First Names: Jane Marie
Surname: Smith
Identity Type: Passport Number (CAPITALIZED LABEL)
Identity Number: P1234567
Date of Birth: 1990-06-25 (displays as 25/06/1990 - EDITABLE)
Preferred Email: Work
Email: jane.smith@bank.co.za

Bank: Nedbank
Bank Branch: Cape Town Branch
Payment Type: Payroll Deduction
```

**Expected Changes in PDF:**
- ✓ Title: "Dr"
- ✓ Name: "Dr Jane Marie Smith"
- ✓ Identity Number: "P1234567"
- ✓ Date of Birth: "25/06/1990" (formatted correctly)
- ✓ Email: jane.smith@bank.co.za (work email)
- ✓ Bank: Nedbank
- ✓ Payment Type: Payroll Deduction

---

### Test Case 3: Member with Both Emails

```
Personal Email: person@email.com
Work Email: work@company.com
Preferred Email: Both
```

**Expected Changes in PDF:**
- ✓ Email row shows: "person@email.com and work@company.com"
- ✓ PDF sent to BOTH addresses
- ✓ Single document, two recipients

---

### Test Case 4: Member with Assigned Membership Number

```
(After member is saved and membership number assigned)

Membership Number: SM001234
```

**Expected Changes in PDF:**
- ✓ Banner shows: "Your Sasbo Membership No: SM001234"
- ✓ Not "(no membership number yet)"

---

### Test Case 5: Member with Existing Record (Edit & Send)

When sending welcome letter to existing member:
- ✓ Membership number is already assigned (SM000891)
- ✓ Status is current (Active/Suspended)
- ✓ All fields reflect current member record
- ✓ Letter sends immediately after approval

---

## Date Format Verification

All dates in PDF must display as **dd/mm/yyyy**:

| Field | Input | Display in PDF |
|-------|-------|---|
| Date of Birth | 1985-12-31 | 31/12/1985 |
| Date of Birth | 1990-06-25 | 25/06/1990 |
| Date of Birth | 2000-01-01 | 01.01/2000 |
| Date Joined | 2024-01-15 | 15 January 2024 |
| Today | 2024-09-26 | 26 September 2024 |

**Long dates** use month names (January, February, etc.)
**Short dates** use dd/mm/yyyy format

---

## PDF Generation Flow

### Step 1: Capture Form
User fills form with member data

### Step 2: Save & Validate
- Form validated
- No member record created yet
- Preview modal opens

### Step 3: Preview (Client-Side Rendering)
- PDF preview generated in browser (NOT actual PDF)
- Styled to match official template
- Shows what member will receive

### Step 4: Approve
User approves document content

### Step 5: Send
- User confirms send
- Backend receives member data
- Backend generates actual PDF from Word template
- PDF emailed to recipient(s)
- Member record saved with membership number

### Step 6: Confirmation
- Success message shown
- Form resets
- Ready for next member

---

## Email Delivery Verification

### Development Environment
```
Service: Local backend (no actual email sending)
Option 1: Check backend logs
Option 2: Mock email service in development
Option 3: Use test email service (Mailtrap, SendGrid sandbox)

Expected log entry:
[INFO] Sending welcome letter to john.doe@example.com
[INFO] PDF generated from template: Sasbo Welcome Letter.pdf
[INFO] Email sent successfully, member saved with ID: 1
```

### Preprod Environment
```
Service: Render (test email account)
Email: Use test+[timestamp]@example.com
Check: Email inbox for received PDF
Verify: PDF attachment is readable and formatted correctly
```

### Production Environment
```
Service: Render (production email)
Email: Use real member email
Verify: Member receives PDF within 5 minutes
Check: Email contains:
  - Subject: "[Membership] Welcome to Sasbo"
  - Attachment: WelcomeLetter_[MembershipNo].pdf
  - Body: Delivery confirmation
```

---

## Manual PDF Testing Checklist

### Document Content
- [ ] Full name correct
- [ ] Title displayed correctly
- [ ] Address formatted properly
- [ ] Membership number present (or marked pending)
- [ ] All body paragraphs present
- [ ] Salutation correct
- [ ] Member details table complete
- [ ] Sign-off present (Ms. Rosemary M. Rauleka)

### Date Formatting
- [ ] Date of Birth: dd/mm/yyyy format
- [ ] Date Generated: Day Month YYYY (e.g., "26 September 2024")
- [ ] Date Joined: Day Month YYYY format

### Capitalization & Labels
- [ ] "Passport Number" capitalized (if passport)
- [ ] "Identity Number" correct (if I.D.)
- [ ] All section headers capitalized
- [ ] Membership table labels consistent

### Styling & Layout
- [ ] Document has professional appearance
- [ ] Margins appropriate
- [ ] Text readable (font size > 10pt)
- [ ] Tables aligned properly
- [ ] No overlapping text
- [ ] Logo/header present (if configured)
- [ ] Logo/footer present (if configured)

### Email Delivery
- [ ] Email sent to correct recipient
- [ ] PDF attachment included
- [ ] Attachment is readable
- [ ] Email not marked as spam
- [ ] Delivery receipt received (if requested)

---

## Sample PDF Files for Download

### Location in Repository
```
/src/assets/documents/
├── Sasbo Welcome Letter.pdf (template)
└── WelcomeLetter_Sample_SM001234.pdf (example output)
```

### Download Test PDFs

**Development:**
```bash
# Navigate to capture member
http://localhost:5173/members/capture

# Fill form with test data (above)
# Click Save
# Click Approve & Continue
# Take screenshot of preview
# Or: Browser DevTools → Print to PDF
```

**Preprod/Production:**
```bash
# Same workflow, different backend
# Email will be sent to test address
# Save PDF from email for comparison
```

---

## Visual Regression Testing

### Compare PDFs Across Environments

1. **Generate PDF in each environment** using same member data
2. **Compare visually:**
   - ✓ Layout matches
   - ✓ Fonts consistent
   - ✓ Spacing identical
   - ✓ Colors correct
   - ✓ Images aligned

3. **Check for differences:**
   - ✗ Layout breaks
   - ✗ Text truncates
   - ✗ Images missing
   - ✗ Colors different
   - ✗ Fonts changed

### Tools for Comparison
- PDF viewers: Adobe Reader, Preview (Mac)
- Online: PDF Diff tools
- Manual: Side-by-side visual inspection

---

## Performance Benchmarks

### PDF Generation Time
- Template load: 100-200ms
- Data population: 50-100ms
- PDF rendering: 200-500ms
- Email dispatch: 500-2000ms
- **Total: 1-3 seconds**

### File Size
- PDF with embedded data: 200-400KB
- Attachment limit: Check email provider (usually 25-50MB)
- Expected: No issues with size

---

## Troubleshooting

### PDF Not Received
1. Check email spam folder
2. Verify email address in form
3. Check backend logs for errors
4. Try resend button
5. Contact support with member ID

### PDF Content Incorrect
1. Check member data in preview
2. Verify date format (dd/mm/yyyy)
3. Ensure all fields populated
4. Regenerate PDF

### Template Issues
1. Verify docx file exists
2. Check docx template formatting
3. Ensure placeholders match code
4. Restart backend service

---

## Automation Scripts

### Generate Multiple Test PDFs
```bash
# Create sample output directory
mkdir -p test-pdfs

# Generate 5 test PDFs with different data
for i in {1..5}; do
  # Call API or manual process
  # Save output to test-pdfs/
done
```

### Email Verification Script
```bash
# Check if email arrived
curl -s https://test-email-service/check \
  -H "Authorization: Bearer $TOKEN" \
  -d "address=test+$TIMESTAMP@example.com"
```

---

## Next Steps

1. ✓ Generate PDF using test member data
2. ✓ Verify all environments produce matching output
3. ✓ Email test addresses and confirm delivery
4. ✓ Compare against official template
5. ✓ Run automated tests
6. ✓ Performance test with multiple sends
7. ✓ Sign off on final output

