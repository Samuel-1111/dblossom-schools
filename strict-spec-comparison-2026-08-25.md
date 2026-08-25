# Strict Secured-Portal Specification Comparison

This comparison uses `/home/ubuntu/upload/pasted_content_2.txt` as the authoritative source. It records the exact requirement areas checked against the current secured portal implementation and does not claim pixel-perfect parity where the implementation intentionally differs for security or portability.

| Specification lines | Requirement checked | Current implementation evidence | Disposition |
|---|---|---|---|
| 8–35 | Shared HSL tokens, Playfair/Inter typography, navy/gold/red hierarchy, login validation, toasts, Home links, loading labels | `client/src/index.css`, shared portal login component, and portal regression contracts | Implemented; exact utility-class differences are treated as visual implementation details |
| 41–72 | Admin login route, DivineBlossom username, DBMS default, validation, logo, Admin Login copy | `app/admin-login/page.tsx`, `app/portal-login/PortalLogin.tsx`, local-admin session route | Implemented; server-signed override is used instead of browser-only password storage |
| 74–100 | Admin dashboard guard, logout, nine modules and exact order | `app/admin-dashboard/AdminDashboardClient.tsx` and protected Admin API routes | Implemented |
| 104–112 | Student list, search/filter, Add Student form, required fields, CSV export | Admin student module, protected records API, registration tests, CSV export contract | Implemented; password is explicitly entered rather than silently generated |
| 114–117 | Teacher registration fields, roles, assigned class, status, CSV export | Admin teacher module, protected records API, registration tests | Implemented |
| 119–124 | Results filters, Student/Class/Term/Session/Average table, view/delete, long CSV export | Admin Results module and result regression tests | Implemented |
| 145–156 | Subject persistence, duplicate prevention, reset, teacher reuse, settings password flow | Subject helpers, Admin Subjects module, Teacher workspace, settings route | Implemented; secure signed settings state replaces browser-only credential storage |
| 162–186 | Student route, admission-number/password login, validation, branded login hierarchy | `app/student-portal/page.tsx`, portal login resolver, portal-login tests | Implemented |
| 188–219 | Student dashboard, term/session filtering, empty state, multi-page PDF download | Student dashboard result query/filter path, report-card renderer, report-card tests | Implemented |
| 222–236 | Report-card header, student info, subjects, grading badges, Total/Average/Position cards, comments | Branded report-card component and result shaping tests | Implemented; responsive rendering may differ from literal class ordering |
| 240–262 | Teacher route, staff-ID/password login, validation, branded entry page | `app/teacher-portal/page.tsx`, portal login resolver, portal-login tests | Implemented |
| 264–274 | Teacher header and Class Teacher versus Teaching Staff branch | Teacher workspace role gate and assigned-class restoration | Implemented |
| 276–340 | Assigned-class student loading, dynamic subjects, score validation, totals/grades, save/update states | Teacher workspace, result persistence route, teacher save-state and result-persistence tests | Implemented |

## Explicit non-literal differences

The authoritative specification requests browser `localStorage` for the Admin password override. The portable implementation stores the override in the protected server-side session/configuration path so it is not exposed as a client credential. The authoritative specification also describes a surname-derived default student password. The current implementation requires the administrator to enter a password during registration, which avoids silently creating guessable credentials. These are intentional security differences and are not represented as exact-copy parity.

The live Supabase project remains a deployment prerequisite: the host must apply `supabase/SETUP_ALL.sql`, ensure the credential columns and RLS policies exist, and populate real student and teacher records. No fabricated accounts or results were inserted to make the verification appear successful.
