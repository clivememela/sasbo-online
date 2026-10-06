# Welcome Letter Flow - Comprehensive Test Guide

## Test Environments Setup

### Development Environment
```bash
# Start local backend
cd /Users/clivememela/IdeaProjects/sasbo-online-backend
./gradlew bootRun

# Start frontend
cd /Users/clivememela/WebstormProjects/sasbo-online
npm run dev

# Navigate to: http://localhost:5173/members/capture
```

### Preprod Environment (Vercel Preview)
```
Frontend: https://[branch-name].vercel.app
Backend: https://sasbo-online-backend-preprod.onrender.com
```

### Production Environment (Vercel)
```
Frontend: https://sasbo.online
Backend: https://sasbo-online-backend-prod.onrender.com
```

---

## Manual Test Scenarios

### Test 1: Complete Happy Path (All Environments)

**Steps:**
1. Navigate to "Capture Member" page
2. Fill out entire form with valid data:
   - Title: Mr
   - First Names: John
   - Surname: Doe
   - Identity Type: I.D. Number
   - Identity Number: 8512315800081
   - Date of Birth: Should auto-fill as 31/12/1985
   - Gender: Should auto-fill from I.D.
   - Race: African
   - Personal Email: john.doe@personal.com
   - Work Email: john.doe@company.com
   - Preferred Email: Personal
   - Employment tab:
     - Bank: First National Bank
     - Branch: Johannesburg
     - Employee Number: EMP001
     - Job Grade: Grade 3
     - IBT Number: IBT123
     - Bank Address: 123 Main Street
   - Membership tab:
     - Status: Active
   - Banking Details:
     - Payment Type: Debit Order
     - Bank Account: 12345678901
     - Debit Day: 20

3. Click **"Save Member"** button

**Expected Result - Step 1: Preview Modal**
- ✓ Modal opens with title "Welcome Letter Preview"
- ✓ Document preview shows:
  - Member full name: "Mr John Doe"
  - Address: "123 Main Street"
  - Date generated: Today's date
  - Membership number section (shows pending if new)
  - Dear Mr John Doe salutation
  - Full welcome letter text
  - Member details table with:
    - Full Name: Mr John Doe
    - Identity Number: 8512315800081
    - Date of Birth: 31/12/1985
    - Employee Number: EMP001
    - Bank: First National Bank
    - Payment Type: Debit Order
    - Date Joined: Today
    - Status: Active
  - Sign-off: Ms. Rosemary M. Rauleka, General Secretary
- ✓ Recipient notice shows: "john.doe@personal.com"
- ✓ No warnings (member has membership number, email exists)
- ✓ **"Approve & Continue"** button is enabled
- ✓ **"Cancel"** button closes modal without saving

4. Click **"Approve & Continue"** button

**Expected Result - Step 2: Send Confirmation Modal**
- ✓ Modal title changes to "Send Welcome Letter"
- ✓ Confirmation section shows:
  - "Ready to send?"
  - Recipient: john.doe@personal.com
  - Format: PDF
  - Membership No: (will fill after save)
- ✓ Document Summary shows:
  - Recipient: John Doe
  - Email: john.doe@personal.com
  - Membership No: (pending)
  - Format: PDF
- ✓ **"Back to Preview"** button takes you back to preview
- ✓ **"Send Welcome Letter"** button is enabled

5. Click **"Send Welcome Letter"** button

**Expected Result - Step 3: Sending & Success**
- ✓ Modal shows "Sending welcome letter..." with spinner
- ✓ Background dims (busy state)
- ✓ All buttons disabled during send
- ✓ After 2-3 seconds (backend processing):
  - Modal shows success state
  - Green checkmark with "✓ Welcome Letter Sent"
  - **"Close"** button appears
- ✓ Click **"Close"**:
  - Modal closes
  - Returns to Capture Member form
  - Form is cleared/reset
  - Green notification shows: "Member Saved: John Doe"
  - Form ready for next member

**Time Tracking:**
- Dev (localhost): ~1-2 seconds
- Preprod: ~3-5 seconds
- Production: ~3-5 seconds

---

### Test 2: Missing Email Address (All Environments)

**Setup:**
Fill form completely EXCEPT leave all email fields empty

**Steps:**
1. Complete form without email
2. Click "Save Member"
3. Preview modal opens

**Expected Result:**
- ✓ Error alert shows:
  ```
  ⚠️ This member has no email address, so the letter 
     cannot be sent. Add one to the member's record first.
  ```
- ✓ **"Approve & Continue"** button is DISABLED (grayed out)
- ✓ **"Cancel"** button is enabled
- ✓ User must cancel and add email before retry

**Verification:**
- Dev, Preprod, Production all show same behavior

---

### Test 3: Missing Membership Number (All Environments)

**Setup:**
Fill complete form (new member won't have membership number)

**Steps:**
1. Fill form with all required data
2. Click "Save Member"
3. Preview modal opens

**Expected Result:**
- ✓ Warning alert shows:
  ```
  ⚠️ This member has no membership number yet, so the 
     letter will be sent with that space blank.
  ```
- ✓ In document preview, membership number banner shows:
  ```
  Your Sasbo Membership No: (no membership number yet)
  ```
- ✓ Approve button is still ENABLED
- ✓ User can proceed to send
- ✓ After save, membership number is assigned by backend
- ✓ Future sends will show the assigned number

**Verification:**
- All environments show warning
- Document still renders correctly
- Send proceeds without block

---

### Test 4: Passport Number Identity Type (All Environments)

**Setup:**
Select "Passport Number" instead of "I.D. Number"

**Steps:**
1. Fill form
2. Select Identity Type: **"Passport Number"** (capitalized!)
3. Enter passport: P1234567
4. Manually enter Date of Birth: 25/06/1990
5. Complete rest of form
6. Click "Save Member"

**Expected Result:**
- ✓ Identity field label shows: **"Passport Number"** (capitalized)
- ✓ Date of Birth field shows: 25/06/1990 format
- ✓ Date of Birth is EDITABLE (unlike I.D. which auto-fills)
- ✓ In preview:
  - Identity Number: P1234567
  - Date of Birth: 25/06/1990
- ✓ Send succeeds normally

**Verification:**
- Dev: Field capitalization correct
- Preprod: Date format displays correctly
- Production: Full flow works with Passport

---

### Test 5: Both Email Addresses (All Environments)

**Setup:**
- Personal Email: john@personal.com
- Work Email: john@work.com
- Preferred Email: **"Both"**

**Steps:**
1. Fill form with both emails
2. Set preferred to "Both"
3. Click "Save Member"

**Expected Result:**
- ✓ Preview modal shows:
  ```
  This letter will be emailed as an attachment to
  john@personal.com and john@work.com (both addresses).
  ```
- ✓ Confirmation shows same
- ✓ After send:
  - Both emails receive the PDF
  - Only one member record created
  - Success message shows once

**Verification:**
- Dev (local): Both emails in test inbox
- Preprod: Check email testing service
- Production: Real email sends (use test email account)

---

### Test 6: Back to Preview Functionality (All Environments)

**Steps:**
1. Complete form → Save
2. Preview opens
3. Click "Approve & Continue"
4. Confirmation modal opens
5. Click "Back to Preview"

**Expected Result:**
- ✓ Returns to preview modal
- ✓ Document content unchanged
- ✓ Can click "Approve & Continue" again
- ✓ Can click "Cancel" to close

**Verification:**
- All environments support navigation
- No data loss during back navigation
- Can approve multiple times if needed

---

### Test 7: Error Recovery (Dev/Preprod)

**Setup (requires backend control):**
- Stop backend service mid-send
- Or mock network error

**Steps:**
1. Complete form → Save → Approve → Send
2. While sending, kill backend connection
3. Modal shows "Sending..." then error

**Expected Result:**
- ✓ Loading stops
- ✓ Error message displays:
  ```
  ⚠️ Failed to send welcome letter
  Failed to connect to backend. Please try again or 
  contact support if the problem persists.
  ```
- ✓ **"Retry Send"** button appears
- ✓ User clicks "Retry Send"
- ✓ Restart backend
- ✓ Send succeeds on retry

**Verification:**
- Error state UI displays correctly
- Retry mechanism works
- No data loss

---

### Test 8: Form Validation Before Preview (All Environments)

**Steps:**
1. Leave form mostly empty
2. Click "Save Member"

**Expected Result:**
- ✓ Form validation runs
- ✓ Error notice appears:
  ```
  ⓘ Fix these before saving
  • First Name(s) is required
  • Surname is required
  • Identity Type is required
  • Identity Number is required
  • Bank Where Employed is required for Debit Orders
  • Bank Branch is required for Debit Orders
  ... (other required fields)
  ```
- ✓ **NO preview modal opens**
- ✓ Tab with error highlighted
- ✓ User fixes fields and retries

**Verification:**
- All environments enforce validation
- Preview never opens with invalid data
- Error messages are clear

---

### Test 9: Date Format Display (All Environments)

**Test Date Formats Throughout Application:**

**Setup:**
Use member with DOB: 1988-06-15

**Check Displayed As:**
- ✓ Capture Member form: 15/06/1988
- ✓ Welcome Letter preview: 15/06/1988
- ✓ Members page list: 15/06/1988
- ✓ Edit Member dialog: 15/06/1988
- ✓ Member details: 15/06/1988

**Consistency Check:**
- Dev: All dates match dd/mm/yyyy
- Preprod: All dates match dd/mm/yyyy
- Production: All dates match dd/mm/yyyy

---

## Automated Test Execution

### Run Unit Tests

```bash
cd /Users/clivememela/WebstormProjects/sasbo-online

# Run all tests
npm run test

# Run specific test file
npm run test ApproveAndSendWelcomeLetter.test.jsx

# Run with coverage
npm run test:coverage

# Watch mode (auto-rerun on changes)
npm run test -- --watch
```

### Expected Test Results

```
✓ ApproveAndSendWelcomeLetter (45 tests)
  ✓ Preview Step (8 tests)
    ✓ renders preview step when modal opens
    ✓ displays member data in preview
    ✓ displays recipient email
    ✓ displays warning for missing membership number
    ✓ disables approve button without email
    ✓ displays both emails when preferred is both
    ✓ formats date of birth as dd/mm/yyyy
    ✓ shows em dash for missing fields

  ✓ Approve Step Transition (3 tests)
    ✓ transitions to send confirmation
    ✓ displays confirmation summary
    ✓ allows going back to preview

  ✓ Send Step (4 tests)
    ✓ sends for existing member
    ✓ creates new member with sendWelcome
    ✓ shows loading state
    ✓ shows success message

  ✓ Error Handling (3 tests)
    ✓ displays error message
    ✓ allows retry after error
    ✓ displays generic error message

  ... (more tests)

✓ CaptureMember - Welcome Letter Flow (28 tests)
  ✓ Complete Happy Path Flow
  ✓ Form Validation
  ✓ Preview Modal Behavior
  ✓ Approval Step
  ✓ Send Step
  ✓ Error Handling
  ✓ Form State After Send
  ... (more tests)

=============================================
Total: 73 tests
Passed: 73 ✓
Failed: 0
Duration: 2.5s
=============================================
```

---

## Performance Testing

### Page Load Time
- Dev (localhost): 200-400ms
- Preprod: 1-2 seconds
- Production: 1-2 seconds

### Modal Open Time
- All environments: < 500ms (instant)

### Send Operation Time
- Dev: 1-2 seconds
- Preprod: 2-4 seconds
- Production: 2-4 seconds

### Document Rendering
- Preview renders: < 300ms
- Document populates: Instant (client-side)

---

## Browser Compatibility

Test on:
- ✓ Chrome 120+
- ✓ Firefox 120+
- ✓ Safari 16+
- ✓ Edge 120+

### Mobile Testing
- ✓ iOS Safari (iPhone 12+)
- ✓ Android Chrome
- ✓ Responsive: tablet (iPad)

---

## Accessibility Testing

### Screen Reader (NVDA/JAWS)
- ✓ Modal title announced
- ✓ Button labels clear
- ✓ Loading state announced
- ✓ Success state announced
- ✓ Error messages in alert role

### Keyboard Navigation
- ✓ Tab through all buttons
- ✓ Enter to activate button
- ✓ Escape to close modal
- ✓ Back button accessible
- ✓ Retry button accessible

### Color Contrast
- ✓ All text meets WCAG AA (4.5:1)
- ✓ Error states: Red with text
- ✓ Success states: Green with text

---

## Regression Testing Checklist

After any changes, verify:

- [ ] Preview step renders document correctly
- [ ] Date format is dd/mm/yyyy
- [ ] Passport Number label is capitalized
- [ ] Email validation works
- [ ] Approve button state correct
- [ ] Confirmation modal shows
- [ ] Back to Preview works
- [ ] Send triggers API call
- [ ] Success message displays
- [ ] Form resets after send
- [ ] Error message shows on failure
- [ ] Retry button works
- [ ] Modal closes properly
- [ ] No console errors
- [ ] All tests pass

---

## Known Issues & Workarounds

### Issue: Modal doesn't close after send
**Workaround:** Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

### Issue: Date format shows wrong
**Workaround:** Clear browser cache, restart dev server

### Issue: Email not received
**Workaround:** Check spam folder, verify email is correct, check backend logs

---

## Support & Questions

For issues with testing:
1. Check browser console (F12)
2. Check backend logs (Render dashboard or local logs)
3. Review this guide for expected behavior
4. Contact development team with specific errors

