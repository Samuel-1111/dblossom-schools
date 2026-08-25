# Secured Portal Specification Audit

**Audit date:** 2026-08-25  
**Authoritative source:** `/home/ubuntu/upload/pasted_content_2.txt`  
**Scope:** Admin, Student, and Teacher routes, shared visual tokens, authentication, validation, data operations, and responsive states.

This audit compares the current source tree with the authoritative portal specification rather than treating the existence of a route or a passing unit test as proof of exact parity. **Verified** means the behavior is directly visible in the current source and supported by a regression contract or build check. **Partial** means the core behavior exists but the specification has additional fields, copy, styling, or interaction details not yet proven. **Blocked** means live Supabase configuration is required before the behavior can be exercised against real data.

## Verification evidence

| Area | Evidence |
|---|---|
| Shared login | `app/portal-login/PortalLogin.tsx`; `server/portal-spec.test.ts`; `server/portal-login-spec.test.ts` |
| Admin authentication and guard | `app/admin-login/page.tsx`; `app/admin-dashboard/page.tsx`; `app/api/admin-login/route.ts`; `server/admin-auth.test.ts` |
| Admin CRUD and protected mutations | `app/admin-dashboard/AdminDashboardClient.tsx`; `app/api/admin/records/route.ts`; `server/admin-crud-ui.test.ts` |
| Student data and report card | `app/student-portal/page.tsx`; `app/student-dashboard/page.tsx`; `app/student-dashboard/StudentDashboardClient.tsx`; `server/student-report-card.test.ts` |
| Teacher data and result/attendance actions | `app/teacher-portal/page.tsx`; `app/teacher-dashboard/page.tsx`; `app/teacher-dashboard/TeacherDashboardClient.tsx`; `server/teacher-save-state.test.ts` |
| Portable schema and login | `supabase/migrations/0001_school_management.sql` through `0006_student_identifier_compatibility.sql`; `supabase/SETUP_ALL.sql`; `app/api/portal-login/route.ts`; `server/portable-deployment.test.ts` |
| Automated verification | `pnpm test`: 77 passed, 1 optional live Supabase probe skipped; `pnpm check`: passed; production build: passed; standalone launcher smoke: homepage HTTP 200 and portal-login validation HTTP 400 as expected for an empty request. |

## Shared design tokens and patterns

| Specification requirement | Status | Evidence and finding |
|---|---|---|
| Primary/deep navy, gold, red, white card, secondary, border, and muted tokens | **Verified** | `client/src/index.css` defines the navy/gold/accent theme foundation; secured screens use the established navy, white, amber, slate, and red classes. |
| Inter body and Playfair Display headings | **Verified** | Global font variables and heading classes are present in `client/src/index.css` and used by secured layouts. |
| Circular school logo across secured login/dashboard surfaces | **Verified** | Shared login and secured dashboard headers render the configurable circular logo with a compatibility fallback. |
| Shared login card, icon, Home link, loading text, field-level red errors, and toast feedback | **Verified with copy caveat** | `PortalLogin.tsx` contains Home links, role icons, field errors, `toast.error`/`toast.success`, disabled loading state, and `Logging in…`. Exact Framer Motion animation and every specified class combination are not present as a separately verified contract. |
| Outline logout control on dark dashboard bands | **Verified** | Student and Teacher dashboard headers include visible white outline sign-out controls; Admin uses its protected logout flow. |
| Exact shared header-band padding `py-16 md:py-24` for login and `py-8 md:py-12` for authenticated dashboards | **Partial** | The navy bands and responsive hierarchy are implemented, but this audit does not claim every route uses every exact utility class from the source specification. |

## Admin portal

| Specification requirement | Status | Evidence and finding |
|---|---|---|
| `/admin-login` and `/admin-dashboard` are separate full-screen routes | **Verified** | Routes exist and are covered by route/source contracts; they do not use the public navbar/footer layout. |
| Username `DivineBlossom` and default password `DBMS` | **Verified** | Admin constants and server-side local-admin validation preserve the required credentials. |
| Empty-field and wrong-credential feedback | **Verified** | Admin login validates required fields and returns visible field/toast feedback. |
| Settings password override | **Verified with secure implementation difference** | Password override is stored and checked server-side through signed state rather than browser `localStorage`. This is intentionally safer for a downloadable production deployment, but it is not a literal implementation of the specification's `localStorage` requirement. |
| Nine modules in the specified order | **Verified** | `AdminDashboardClient.tsx` defines Students, Teachers, Results, Payments, Events, Gallery, Complaints, Subjects, and Settings in that order, with desktop and mobile navigation. |
| Student search and class filter | **Verified** | Student search/filter state and class filter are implemented. |
| Student Add/Edit/Delete | **Verified** | Add Student is button-gated; edit and delete actions use protected server mutations with confirmation. |
| Student form includes exact specification fields: gender, date of birth, parent name/phone/email, boarding status, status, and password | **Partial** | Current form includes full name, admission number, class, guardian name/contact, status from stored rows, and portal password. Gender, date of birth, parent email, and boarding status are not all collected in the current visible form. |
| Student default surname password | **Partial** | New student password is required and explicitly entered; automatic surname generation is not claimed. |
| Teacher Add/Edit/Delete | **Verified** | Add Teacher is button-gated; staff ID, name, email, phone, subject, role, assigned class, password, status, edit, and delete are implemented. |
| Results review filters, comment editing, and protected delete | **Verified** | Class/term filters, comment editing, and explicit result deletion are present; result creation remains teacher-only as required by the amendment. |
| Payments confirmation/rejection | **Verified** | Confirm and Reject actions are present with confirmation and protected status updates. |
| Events and Gallery CRUD plus image upload guards | **Verified in code** | Create/edit/delete, upload flow, thumbnails, public URLs, MIME allowlist, and 5 MB guards are implemented. Live storage credentials still require deployment verification. |
| Complaints status workflow | **Verified** | Protected Admin list and Reviewed/Resolved actions are present. |
| Subjects localStorage behavior, reset-to-default, duplicate prevention | **Partial** | Dynamic subject behavior and deletion are implemented, but literal parity for every localStorage helper/reset interaction remains source-audit work. |
| CSV exports matching all specified columns | **Partial** | Export paths exist, but exact column-by-column parity against the specification has not been proven in this audit. |

## Student portal

| Specification requirement | Status | Evidence and finding |
|---|---|---|
| `/student-portal` local admission-number/password entry | **Verified in code; live setup dependent** | Shared login posts to `/api/portal-login`, which resolves `admission_number` and server-side password data before creating the Supabase Auth session. The database requires the bundled schema setup. |
| Required-field, not-found, and wrong-password feedback | **Verified** | Shared login clears field errors on typing and shows role-specific not-found/wrong-password messages with toasts. |
| Authenticated header with name, class, admission number, and logout | **Verified with data caveat** | Student dashboard renders the authenticated header and uses `admission_number`; class/profile data depends on the linked Supabase profile and student row. |
| View Results term/session filters and empty-state feedback | **Verified in current dashboard contract** | Student dashboard includes term/session filtering and no-results messaging in the current implementation. |
| Multi-page branded PDF report card | **Verified in code** | Report-card rendering and PDF pagination logic are covered by report-card regression tests and the production build. |
| Exact report-card summary cards for Total, Average, Position | **Partial** | The branded report-card foundation is present; exact Position data and every visual utility from the specification are not independently proven by this audit. |
| Exact subject table and comments formatting | **Partial** | Subject results and comments are rendered; pixel-level and complete copy parity remain unproven without a route-by-route visual comparison against the original reference. |

## Teacher portal

| Specification requirement | Status | Evidence and finding |
|---|---|---|
| `/teacher-portal` local staff-ID/password entry | **Verified in code; live setup dependent** | Shared login posts to `/api/portal-login`, which resolves `staff_id` and server-side password data; `profile_id` is nullable in the compatibility schema. |
| Required-field, not-found, and wrong-password feedback | **Verified** | Shared login validates Staff ID and password and returns visible field/toast feedback. |
| Class Teacher versus Teaching Staff role branch | **Verified in code** | Teacher dashboard gates upload/attendance controls using the assigned role/class and displays view-only messaging when upload access is unavailable. |
| Assigned-class student/subject loading | **Verified in code** | Teacher workspace loads students by assigned class and uses dynamic subjects. Student display now uses `admission_number`. |
| Result entry, automatic totals/grades, save/update states | **Verified with data-shape caveat** | Result and attendance controls, numeric validation, save state, and role restrictions are implemented. Exact object-level report payload parity with the original specification is not claimed for every field. |
| Add/delete subject controls | **Verified** | Teacher subject controls include accessible add/remove behavior and dynamic scoring rows. |
| Exact top-card four-column layout, overall percentage, and every specified label | **Partial** | Responsive result controls exist, but this audit does not claim literal parity for each label/layout utility without a complete visual comparison. |

## Live Supabase and portability status

The portable code now ships `supabase/SETUP_ALL.sql` plus the six ordered migration files. The latest code does not require the optional `resolve_portal_login` RPC to resolve local student/teacher identifiers; it uses the server-only Supabase service client and never exposes the service-role key to the browser.

The managed Supabase project previously confirmed the teacher-table columns after the direct alteration. The complete six-migration setup, including `profiles`, `portal_credentials`, role policies, login RPC, and student compatibility fields, still must be run in the target project before live teacher/student login and RLS behavior can be called verified. A successful SQL Editor response with “no rows returned” is normal for DDL, but the post-migration verification queries must still be run.

## QA record

The deterministic regression suite currently reports **77 passing tests and one intentionally skipped live Supabase probe**. TypeScript passes. The production build passes. The standalone launcher starts on a normal `PORT`, serves the homepage with HTTP 200, and returns the expected HTTP 400 validation response for an empty portal-login request. Previous responsive captures covered phone, tablet, laptop, and wide desktop public and portal-entry routes.

This record supports a **stable implementation checkpoint**, but it does not claim that every specification row marked Partial is complete or that live Supabase configuration has been verified. The remaining open tracker items intentionally preserve those distinctions.
