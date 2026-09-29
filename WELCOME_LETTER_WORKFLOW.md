# Welcome Letter: Two-Step Approval & Send Workflow

## Overview

The welcome letter workflow has been enhanced to include an explicit two-step process:

1. **PREVIEW & APPROVE** - User views the populated welcome letter document
2. **SEND** - User confirms and dispatches the welcome letter as a PDF email

This separates the document review from the email dispatch, preventing accidental sends and ensuring document accuracy.

---

## User Workflow

### Step 1: Capture Member Form
User fills out the Capture Member form with all required personal, employment, and banking details, then clicks **"Save Member"**.

### Step 2: Preview Modal Opens
After validation passes, the "Welcome Letter Preview" modal opens showing:
- ✅ Document populated with member data
- ✅ Recipient email address(es) 
- ✅ Warning if member has no membership number yet
- ✅ Full welcome letter document preview

**Available Actions:**
- **"Approve & Continue"** - Proceed to send confirmation (if email exists)
- **"Cancel"** - Close modal and return to form

### Step 3: Send Confirmation Modal
After approval, the "Send Welcome Letter" confirmation modal shows:
- ✅ Recipient name and email
- ✅ Document format (PDF)
- ✅ Membership number status
- ✅ Summary of what will be sent

**Available Actions:**
- **"Back to Preview"** - Return to preview to review again
- **"Send Welcome Letter"** - Confirm and dispatch the email

### Step 4: Sending & Confirmation
- Email is dispatched with PDF attachment
- Member record is saved
- Success confirmation appears with "Welcome Letter Sent" message

---

## Component Structure

### New Component: `ApproveAndSendWelcomeLetter.jsx`

Located at: `/src/components/members/ApproveAndSendWelcomeLetter.jsx`

**Key Features:**
- Multi-step modal with preview and confirmation states
- Document populated with member data from template
- Separate approve and send actions
- Error handling with retry capability
- Responsive design matching application theme

**Props:**
```javascript
{
  open: boolean,           // Modal visibility
  onClose: function,       // Called when modal closes
  member: object,          // Member data to populate document
  onSuccess: function      // Called after successful send
}
```

**States:**
- `preview` - Show document preview with Approve button
- `sendConfirm` - Show confirmation with Back and Send buttons
- `sending` - Show loading state during email dispatch
- `sent` - Show success state
- `error` - Show error message with retry option

### Updated Component: `CaptureMember.jsx`

**Changes:**
- Replaced `WelcomeLetter` import with `ApproveAndSendWelcomeLetter`
- Updated component usage to new multi-step component
- Same callback handlers (`handleCaptureSuccess`)

### Preserved Component: `WelcomeLetter.jsx`

Still exists for backward compatibility and other uses. Can be deprecated if this is the only use case.

---

## Document Preview

The welcome letter preview includes:

### Header
- Member name and residential address
- Date letter was generated

### Membership Banner
- Membership number (or note if pending)
- Prominently displayed

### Content
- Salutation with member name
- Welcome message body (3-4 paragraphs)
- Member details summary table:
  - Full Name
  - Identity Number
  - Date of Birth (formatted as dd.mm/yyyy)
  - Employee Number
  - Bank
  - Payment Type
  - Date Joined
  - Status

### Sign-off
- "Your Faithfully,"
- Authorized signature
- General Secretary title

---

## Data Population

The welcome letter automatically populates with:

| Field | Source |
|-------|--------|
| Full Name | `title` + `firstNames` + `surname` |
| Address | `address` |
| Date | Current date (formatted for South Africa timezone) |
| Membership No | `membershipNumber` or "(no membership number yet)" |
| Identity Number | `identityNumber` or "—" |
| Date of Birth | `dateOfBirth` formatted as dd.mm/yyyy |
| Employee Number | `employeeNumber` or "—" |
| Bank | `bankName` or "—" |
| Payment Type | `paymentType` or "—" |
| Date Joined | `joinDate` or current date |
| Status | `status` or "Active" |

---

## Email Dispatch

### Recipients
- Primary: Member's preferred email address
- If "both" selected: Both personal and work emails
- Work email if personal unavailable
- Personal email if work unavailable

### Format
- PDF attachment with populated welcome letter
- Subject: "[Membership] Welcome to Sasbo"
- Sent from: Sasbo system (configured in backend)

### Validation
- ✅ Member must have at least one email address
- ✅ Approve button disabled if no email
- ✅ Clear error message shown if email missing

### Error Handling
- Network timeout: "Failed to send. Please try again."
- Invalid email: Backend returns validation error
- Server error: Specific error message displayed
- Retry button available on error state

---

## Workflow States & UI

### Preview State
```
┌─────────────────────────────────────────┐
│ Welcome Letter Preview                  │
├─────────────────────────────────────────┤
│                                         │
│  Will be sent to: john@example.com     │
│                                         │
│  ⚠️  No membership number yet          │
│                                         │
│  [Document Preview Content...]          │
│                                         │
├─────────────────────────────────────────┤
│  [Cancel]              [Approve & ▶]   │
└─────────────────────────────────────────┘
```

### Confirmation State
```
┌─────────────────────────────────────────┐
│ Send Welcome Letter                     │
├─────────────────────────────────────────┤
│                                         │
│  ✓ Ready to send?                      │
│    Email: john@example.com (work)      │
│    Format: PDF                         │
│    Membership No: (pending)            │
│                                         │
│  The member record will be saved       │
│  and the email will be dispatched.     │
│                                         │
├─────────────────────────────────────────┤
│ [Back to Preview]      [Send ✉️]        │
└─────────────────────────────────────────┘
```

### Sending State
```
┌─────────────────────────────────────────┐
│                                         │
│         ⏳ (Spinner)                    │
│   Sending welcome letter...             │
│   Please wait...                        │
│                                         │
└─────────────────────────────────────────┘
```

### Success State
```
┌─────────────────────────────────────────┐
│ Welcome Letter Preview                  │
├─────────────────────────────────────────┤
│                                         │
│         ✓ Welcome Letter Sent           │
│                                         │
├─────────────────────────────────────────┤
│  [Close]              ✓ Sent            │
└─────────────────────────────────────────┘
```

---

## Benefits of Two-Step Process

1. **Prevents Accidental Sends**
   - User must explicitly approve before email is sent
   - Two separate action buttons = lower risk

2. **Document Review**
   - User sees exactly what member will receive
   - Can catch data errors before dispatch
   - Membership number status visible before send

3. **Clear Separation**
   - Preview step focuses on "Does this look right?"
   - Confirmation step focuses on "Are we ready to send?"
   - Reduces cognitive load

4. **Professional Workflow**
   - Follows standard approval patterns
   - Matches stakeholder expectations
   - Audit trail: approval + send are explicit actions

5. **Error Prevention**
   - Email validation shown upfront
   - Warnings about missing data before send
   - Error recovery with retry option

---

## Testing the Workflow

### Test Case 1: Happy Path
1. Fill Capture Member form with all details
2. Click "Save Member"
3. Preview modal opens ✓
4. Review document ✓
5. Click "Approve & Continue"
6. Confirmation modal opens ✓
7. Click "Send Welcome Letter"
8. Success message appears ✓
9. Form resets ✓

### Test Case 2: Email Validation
1. Fill form WITHOUT email addresses
2. Click "Save Member"
3. Preview modal opens
4. "Approve & Continue" button is DISABLED ✓
5. Error message shown: "Add one to the member's record first" ✓

### Test Case 3: Back to Preview
1. Go through approval step
2. Click "Back to Preview"
3. Return to preview modal ✓
4. Can re-review document ✓
5. Can cancel or approve again ✓

### Test Case 4: Error Handling
1. Intentionally trigger email error (mock)
2. Error message displays ✓
3. "Retry Send" button available ✓
4. Can retry send ✓

---

## Technical Details

### Files Changed
- `/src/components/members/ApproveAndSendWelcomeLetter.jsx` - **NEW**
- `/src/pages/members/CaptureMember.jsx` - Updated import and usage
- `/src/lib/format.js` - Date formatting (dd.mm/yyyy)

### API Calls
- `memberService.createMember(member, { sendWelcome: true })` - For new members
- `memberService.sendWelcomeLetter(memberId)` - For existing members

### Date Format
- All dates display as `dd.mm/yyyy` (e.g., "15.06/1988")
- Consistent across entire application

### No Breaking Changes
- Existing WelcomeLetter component preserved
- Backward compatible
- Form validation unchanged

---

## Future Enhancements

Potential improvements for next phases:

1. **PDF Generation**
   - Generate PDF from Word template on backend
   - Include logo and formatting from original docx

2. **Preview Download**
   - Allow user to download preview as PDF before sending
   - Test printing from browser

3. **Email Templates**
   - Customize welcome letter text per bank
   - Localized versions (multiple languages)

4. **Batch Sends**
   - Send to multiple members
   - Scheduled sends
   - Send history/audit log

5. **Tracking**
   - Track email open/read events
   - Confirm delivery
   - Resend capability

---

## Troubleshooting

### Issue: Approve button disabled, no email error
**Solution:** Member has no email address. Add email in capture form.

### Issue: "Failed to send. Please try again."
**Solution:** Check backend is running. Check member has valid email.

### Issue: Modal won't close after send
**Solution:** Clear browser cache. Check for JavaScript errors in console.

### Issue: Member name shows as empty
**Solution:** Required fields (First Name, Surname) are empty. Fill before save.

---

## Questions?

For issues or questions about the welcome letter workflow:
1. Check browser console for errors
2. Verify member has required data (email, name)
3. Check backend logs for email dispatch errors
4. Contact development team with specific error messages
