# D'Blossom Platform Structure

## Identity

`auth.users` → `profiles` → role-specific records.

Roles:
- admin
- teacher
- student
- parent

Student/teacher records keep `profile_id` so authorization is tied to the authenticated Supabase user, not editable metadata.

## Academic

`students` → `classes`  
`teachers` → `teacher_assignments` → `classes` + `subjects`  
`results` → student + subject + term  
`attendance` → student + teacher  
`academic_sessions` → `terms`

## Parent

`parent_profiles` → `parent_student_links` → `students`

Parents can see only linked children. The Parent Portal combines:
- academic performance/history
- attendance
- assignments
- learning materials
- fees and balances
- payment history
- announcements
- notifications
- school calendar
- messages
- student documents

## Finance

`fee_categories` → `fee_invoices` → `fee_invoice_items`  
`fee_invoices` → `fee_payments` → `fee_receipts`

An invoice stores total, amount paid, balance, due date and status. Partial payments are supported and receipts are generated automatically.

## ₦1,000 Result Access

`result_access_payments` → `result_access_grants`

Paystack initialization and verification run in Supabase Edge Functions. The amount is fixed server-side at 100,000 kobo (₦1,000). Result rows are protected by both application logic and RLS: a student must have a valid result-access grant before their result rows can be selected.

## Communications

`announcements` supports:
- all-school
- parent
- targeted student
- targeted class
- pinned
- publish status

`parent_notifications` and `parent_notification_preferences` provide the in-app notification centre.

`parent_messages` provides parent ↔ school messaging.

## Learning

- assignments
- assignment submissions
- learning materials
- lesson plans

## Admissions

`admission_applications` → `admission_documents`

Supports application number, review queue, status, interview date/notes, applicant search, approval/rejection, and conversion into a student with an automatically generated admission number.

## Administration

- `student_promotions`
- `student_documents`
- `result_locks`
- `staff_permissions`
- `audit_logs`
- `school_settings`

## Performance

The database has indexes on high-use relationship columns. Portal pages use server-side filtering and bounded result sets instead of loading unbounded records into the browser.

Empty optional data uses neutral empty states; missing announcements/events/messages are not presented as red errors.

## Migration rule

The connected Supabase project is the source of truth. Its core IDs are UUIDs. The older Manus migration chain contains legacy bigint assumptions and must not be used to reset the connected database. Capture the remote schema with `supabase db pull` before establishing the new local migration baseline.
