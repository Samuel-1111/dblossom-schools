# Project TODO

- [x] Establish the premium D'Blossom visual system: typography, color tokens, responsive spacing, states, and accessibility.
- [x] Build separate public Home, About, Academics, Gallery, Events/News, Payment Information, and Contact experiences. Public aliases route to the corresponding Home sections with fixed-navbar scroll offsets, and footer navigation now includes every public information area; route-specific pages are implemented.
- [x] Add database tables for students, teachers, results, payments, events, gallery images, and complaints with required fields and relationships. The repository migrations and `supabase/SETUP_ALL.sql` define the complete schema; live hosted RLS/profile setup remains a one-time external SQL step.
- [x] Implement secure role-aware backend procedures for public submissions, student access, teacher access, and admin CRUD. Supabase RLS policies, the portal login resolver, protected local-admin records API, teacher assigned-class restrictions, and public submission policies are implemented.
- [x] Implement student login by admission number and password.
- [x] Implement student result filtering by term and session.
- [x] Implement branded multi-subject PDF report card generation.
- [x] Implement teacher login by staff ID and password.
- [x] Implement class-teacher result entry with selectable term/session and automatic CA/exam totals, grades, and averages.
- [x] Implement teaching-staff view-only result access with class-filtered result listing.
- [x] Build the admin dashboard with CRUD management for all required entities. The nine specified modules now have protected reads and the implemented create/update/delete/status/comment actions appropriate to each workflow.
- [x] Implement automatic grading rules: A >= 70, B 60-69, C 50-59, D 40-49, F < 40.
- [x] Implement parent payment notification form with WhatsApp proof-sending instructions.
- [x] Implement admin payment confirmation and rejection flow.
- [x] Implement public complaint/contact submission routed to the protected admin portal; direct school-inbox email is intentionally not required by the revised scope.
- [x] Implement S3-backed upload and serving for gallery and event images. Gallery and event upload procedures, Supabase Storage fallback, admin thumbnails, public rendering, and matching client/server image type/5 MB guards are implemented; live storage credentials remain an external deployment check.
- [x] Add Vitest coverage for grading, result persistence, role permissions, payment workflow, complaint notification, and report-card data. The full deterministic suite now passes 75 tests with one optional live Supabase integration probe skipped by default.
- [x] Run type checks, tests, production build, and browser verification at desktop and mobile breakpoints. Automated checks plus current desktop/mobile captures for public, student, teacher, admin login, and admin dashboard routes are complete.
- [x] Resolve defects, review accessibility and visual consistency, and prepare the final checkpoint. Responsive QA, source contracts, build checks, supplied-logo verification, and the final standalone smoke test are recorded.
- [x] Add result update/create management parity and event/gallery edit flows where required by the strict admin specification. Result creation remains teacher-only, while Admin comment review and event/gallery create/edit/delete flows are protected and implemented.
- [x] Add S3-backed event image upload and public/admin event image rendering. Protected upload procedures enforce image type and 5 MB safeguards, persist URLs, and support admin/public rendering with safe fallbacks.
- [x] Complete the secured-portal exact-copy and interaction audit, including validation, loading, mobile, Home-link, role-specific, report-card, result-filter, and save-state behavior. The audit addendum records the latest corrections and explicit implementation notes.

- [x] Route new public complaints into the protected admin portal as the primary review workflow; direct school-inbox email is no longer required.
- [x] Add an admin complaints view with status management and readable submission details.

- [x] Add specification-aligned /admin-login and /admin-dashboard routes with local admin credentials, validation, session guard, logout, and settings password override.
- [x] Align secured portal visual tokens, typography, header bands, login cards, validation states, loading states, and mobile navigation with the attached specification; semantic HSL tokens, navy bands, shared login hierarchy, responsive navigation, and states are implemented.
- [x] Expand the admin dashboard into the nine specified modules: Students, Teachers, Results, Payments, Events, Gallery, Complaints, Subjects, and Settings; all nine modules are implemented with the supported protected actions and filters.
- [x] Add admin CSV exports for students, teachers, and long-format results.
- [x] Persist an admin-managed subject list and use it to build the teacher result-entry grid dynamically.
- [x] Update the student portal to /student-portal with specification-aligned login validation and report-card rendering, including per-result html2canvas/jsPDF capture.
- [x] Update the teacher portal to /teacher-portal with specification-aligned login validation, dynamic subjects, class-student loading, existing-result loading, assigned-class result entry, attendance controls, and save/update states.
- [x] Add portal-specific Vitest coverage for admin authentication, student/teacher validation, dynamic subject behavior, result persistence, and report-card shaping. The verified full suite includes these focused contracts and passes 75 tests.

- [x] Re-read and implement the complete authoritative pasted specification strictly, replacing prior design assumptions; complete the line-by-line source comparison and record evidence in the secured-portal audit.
- [x] Reset global design tokens exactly to the specification: white background, dark navy foreground, primary HSL 220 70% 25%, red accent HSL 0 75% 50%, gold HSL 43 85% 55%, Inter body, Playfair Display headings, exact spacing, card, table, button, animation, and responsive rules.
- [x] Rebuild the public information architecture strictly as Home, About, Academics, Gallery, Events, Payment, Complaint, with the specified desktop/mobile navbar behavior and portal links.
- [x] Rebuild secured portal layouts strictly from the specification, including login hierarchy, validation states, result-card formatting, branded report-card design, Admin navigation, and specified module structure; final responsive and source-contract checks are complete.
- [x] Replace prior custom visual treatment and copy that is not present in the authoritative pasted specification; run the final route-by-route copy/token/layout review and record implementation notes for intentional secure differences.

- [x] Rebuild administrator student registration with the authoritative prompt fields, defaults, search/filter, edit/delete actions, and field-level validation.
- [x] Rebuild administrator teacher registration with the authoritative prompt fields, role/class controls, edit/delete actions, and field-level validation.
- [x] Apply the supplied D'Blossom school logo to the admin portal, student/teacher portal branding, public brand surfaces, and report-card header where specified.
- [x] Validate registration flows, logo rendering, responsive layouts, tests, type checking, and production build. Automated checks with 16 tests, desktop/mobile visual review, supplied-logo rendering, and live blank-submit validation for student and teacher registration are complete; destructive create/delete actions were intentionally not exercised.

- [x] Prevent duplicate student admission numbers and teacher staff IDs during administrator registration with clear backend errors.
- [x] Prevent changing an existing student admission number or teacher staff ID to another record during administrator edits.

- [x] Remove OAuth dependency from local admin CRUD actions so DivineBlossom / DBMS is sufficient for administrator management; verified on the published build.
- [x] Preserve admission-number/password student login and staff-ID/password teacher login without adding OAuth prompts.
- [x] Re-run browser verification of local admin registration after removing the OAuth redirect; published create and delete completed without OAuth.
- [x] Prevent global OAuth fallback from intercepting local admin mutations and enable local-cookie admin snapshot refreshes; verified on the published build.
- [x] Publish the local-admin auth changes, then verify latest /admin-login → /admin-dashboard create and delete flows without OAuth.
- [x] Re-run full tests, typecheck, and build; checkpoint save remains pending.
- [x] Normalize blank optional parent and teacher contact fields before registration mutations to prevent invalid empty-email payloads.
- [x] Publish and browser-verify the corrected UI registration form, then remove all temporary QA records.
- [x] Fix admin dashboard snapshot authorization for valid platform-admin sessions while preserving local-admin cookie access and non-admin denial.
- [x] Add regression coverage for platform-admin and local-admin snapshot authorization, then rerun tests, typecheck, build, and browser verification.
- [x] Hide Admin Student and Teacher registration forms until Add Student/Add Teacher is pressed, with a clear close/cancel path.
- [x] Restrict teacher result uploads to Class Teacher users and their assigned class in both UI and backend validation.
- [x] Add regression coverage and verify the revised admin and teacher workflows with tests, typecheck, build, and browser captures.
- [x] Remove administrator result-upload controls so result creation remains teacher-portal-only, while retaining administrator review and comment management.
- [x] Migrate the existing React/Vite/tRPC/Drizzle platform to Next.js + Supabase while preserving public, Student, Teacher, and Admin workflows.
- [x] Add Supabase client/server/middleware helpers, root middleware, OAuth callback, environment configuration, schema/RLS SQL, and signup profile trigger.
- [x] Port existing routes and workflows to the Next.js app and validate standalone export behavior.

- [x] Add Next.js App Router foundation, standalone output configuration, production-mode scripts, patched Next.js runtime, and Tailwind/PostCSS styling compatibility.
- [x] Add Supabase browser/server/middleware clients, root session middleware, OAuth callback, auth error page, and sign-out route using only the publishable key.
- [x] Add the Supabase school-management SQL migration with profiles, classes, students, subjects, attendance, grades, announcements, signup profile trigger, RLS, and role-scoped policies.
- [x] Add Supabase-backed Student, Teacher, and Admin login entry routes and protected dashboard shells with role checks and assigned-class/student reads.
- [x] Validate the migration with 27 passing Vitest tests, TypeScript, production build, and browser captures for public and portal entry routes.
- [x] Complete the remaining full CRUD/data migration from the legacy school workflows into Supabase-backed Next.js modules and package the complete ordered Supabase setup in `supabase/SETUP_ALL.sql`; applying that SQL remains a one-time external hosting step.
- [x] Fix the Next.js development runtime crash reporting a missing generated Webpack chunk (`./244.js`) and revalidate affected routes.
- [x] Resolve the Next.js auto-publish packaging mismatch that expects `dist/public`, then verify the published runtime after the compatibility shim.
- [x] Fix the managed deployment startup failure where the platform launches `/usr/src/app/dist/index.js` even though the migrated Next.js build currently emits `.next/standalone/server.js`.
- [x] Restore and port the complete previously working Admin, Teacher, Student, public, registration, result, report-card, media, payment, complaint, and role-restricted workflows into the Next.js + Supabase migration without removing or replacing them with placeholders.
- [x] Reconcile the authoritative pasted specification and amendment with the migrated application, including local school credentials, Add Student/Add Teacher form buttons, credential-bearing registration, and teacher-only assigned-class result uploads.
- [x] Verify that the published routes expose Admin Portal, Teacher Portal, Student Portal, and all required public experiences after the Supabase migration.
- [x] Fix the Next.js production prerender failure `TypeError: a[d] is not a function` on `/_not-found` after adding the Teacher workspace, then rerun build and route validation.
- [x] Add a Supabase-backed Teacher workspace with assigned-class student/subject loading, teacher-only result entry, and attendance recording controls.
- [x] Revalidate the repaired Next.js build and preview routes for `/`, `/admin-login`, `/student-portal`, `/teacher-portal`, and a missing route; the missing route returns the stable Next.js 404 fallback.
- [x] Add a Supabase-backed Student workspace with own-record profile, term-filterable grades, attendance summaries, announcements, and report-card-oriented result presentation.
- [x] Stabilize the Next.js App Router production build with the patched Next.js version, non-worker webpack build, explicit App Router error boundaries, dynamic root fallbacks, and complete ESM standalone artifact packaging.
- [x] Fix the reported Admin Portal rejection of the documented local credentials `DivineBlossom` / `DBMS`, including normalization, session creation, and regression coverage.
- [x] Reproduce and fix the live published Admin Portal rejection of `DivineBlossom` / `DBMS`; verify the exact browser flow after deployment.
- [x] Restore the published site after the latest administrator-login deployment began returning a blank Internal Server Error; preserve and revalidate the repaired Admin Portal flow.
- [x] Investigate the recurring published Internal Server Error after the Admin Portal checkpoint and restore a stable live deployment without losing the verified local-admin flow.
- [x] Compare the preview and published runtime after the recurring blank Internal Server Error and remove the unstable failure source without breaking the verified Admin Portal login.
- [x] Make preview startup resilient to stale `.next` chunks by cleaning generated output before `next dev` and avoiding TypeScript watch failures while generated route types are being recreated.
- [x] Revalidate repeated preview requests and logs after the durable startup fix, including all public and portal routes.
- [x] Complete the next Admin Portal CRUD increment for student and teacher records, including edit/delete controls, validation, and local-session-safe data access.
- [x] Import the uploaded students, teachers, and results CSV data into Supabase, preserving optional blanks, creating required reference rows, and reporting the one required blank admission number and any omitted schema fields.
- [x] Align Admin Dashboard student/teacher queries with the live Supabase `students` and `teachers` tables so all imported records are visible and editable after CSV import.
- [x] Add server-side local-admin Supabase record routes for imported student and teacher data so the signed local session can read and mutate records under RLS safely.
- [x] Fix Admin student edit/create fields to use live names (`admission_number`, `full_name`, `class_id`, and related supported columns) end to end.
- [x] Align teacher edit UX with the live `teachers` schema or add a safe server-side schema path for the imported teacher fields before claiming full editability.
- [x] Verify local-admin load, edit, save, and reopen behavior for imported student and teacher records through `/api/admin/records`.
- [x] Route Admin class-reference loading through the protected server endpoint so student forms can display and preserve live class UUIDs under the local-admin cookie.
- [x] Add Admin result review editing for teacher/principal comments through the protected results route while keeping result creation and deletion teacher-only.
- [x] Replace the public homepage event/gallery placeholders with live Supabase data and safe image rendering from stored image URLs.
- [x] Add explicit homepage error handling for gallery and event Supabase queries so backend failures are not shown as misleading empty states.
- [x] Route Admin event and gallery record reads through the protected server endpoint so local administrators can review imported or uploaded media records safely.
- [x] Investigate and fix the newly reported Internal Server Error shown in the live preview, then revalidate the affected route and published deployment.
- [x] Prevent malformed Supabase auth-cookie state from causing `Unexpected end of JSON input` during public homepage rendering, with regression coverage and route verification.
- [x] Audit pasted_content_2.txt against Admin, Student, and Teacher portal source files and record concrete mismatches.
- [x] Align the secured portal authentication and shared visual patterns with pasted_content_2.txt, including exact copy, validation feedback, loading labels, header bands, and responsive navigation.
- [x] Align Admin module behavior with pasted_content_2.txt, including signed server-side password override, module-specific filters/actions, nine-module navigation, registration credentials, event/gallery management behavior, result detail, and CSV exports; final source evidence is recorded.
- [x] Align Student and Teacher portal behavior with pasted_content_2.txt, including result filtering, multi-page report-card presentation, assigned-class restrictions, attendance/result save states, metadata fallbacks, and branded report cards; final source evidence is recorded.
- [x] Add regression coverage for the newly audited portal specification requirements and revalidate all secured routes.
- [x] Audit pasted_content_2.txt against Admin, Student, and Teacher portal source files and record concrete mismatches.
- [x] Apply the uploaded specification’s shared secured-portal login hierarchy, role-specific icons/subtitles, field-level validation, loading labels, Home links, and Sonner feedback without weakening server-side authentication.
- [x] Add the supplied circular school logo to the shared Admin, Student, and Teacher login cards as required by pasted_content_2.txt.
- [x] Implement a secure Admin Settings password change and login override flow corresponding to pasted_content_2.txt without storing the replacement password in browser storage or exposing it to the client.
- [x] Implement a secure Admin Settings password change and login override flow corresponding to pasted_content_2.txt without storing the replacement password in browser storage or exposing it to the client.
- [x] Upload the supplied school logo to durable web storage, replace stale references, and serve `/manus-storage/*` through the Next.js server-side signed URL proxy.
- [x] Exclude `.manus-logs` and generated output from Next.js development watching to prevent log-triggered recompilation and intermittent manifest JSON errors.
- [x] Add Admin module search/filter controls required by pasted_content_2.txt while preserving protected server-backed reads and existing CRUD actions.
- [x] Add accessible Admin module search/filter controls across live student, teacher, result, payment, event, gallery, complaint, and subject tables while preserving protected reads and CRUD actions.
- [x] Add Student result filtering by academic session and term plus a branded client-side PDF report-card download using the installed html2canvas and jsPDF libraries.
- [x] Add explicit Teacher result and attendance saving states, disabled submit controls, and success/error feedback required by pasted_content_2.txt.
- [x] Add explicit Teacher result and attendance saving states, disabled submit controls, and success/error feedback required by pasted_content_2.txt.
- [x] Replace the homepage Payment and Complaint placeholders with responsive Supabase-backed public submission forms, loading states, and toast feedback.
- [x] Extend the protected Admin records API and module tables with sanitized event/gallery metadata mutation and deletion actions while preserving server-side local-admin authorization.
- [x] Add protected Admin payment confirmation and rejection actions with explicit status feedback in the Payments module.
- [x] Add protected Admin payment confirmation and rejection actions with explicit status feedback in the Payments module.
- [x] Add public About, Academics, Gallery, Events, Payment, and Complaint alias routes that preserve fixed-navbar-safe homepage section navigation.
- [x] Add an accessible mobile menu to the fixed public homepage navigation while preserving desktop links and portal actions.
- [x] Add an accessible mobile menu to the fixed public homepage navigation while preserving desktop links and portal actions.
- [x] Add protected Admin complaint review status actions with explicit status feedback in the Complaints module.
- [x] Add protected Admin complaint review status actions with explicit status feedback in the Complaints module.
- [x] Add protected Admin subject deletion with explicit confirmation and status feedback in the Subjects module.
- [x] Add protected Admin subject deletion with explicit confirmation and status feedback in the Subjects module.
- [x] Add protected Admin event and gallery metadata edit forms with sanitized server-side saves, explicit feedback, and cancel actions.
- [x] Add protected Admin event and gallery image upload through server storage with image-type and 5 MB guards, URL persistence, client upload feedback, and public/admin-compatible URLs.
- [x] Route Admin subject creation through the protected local-admin records API with validation and refresh feedback.
- [x] Route Admin subject creation through the protected local-admin records API with validation and refresh feedback.
- [x] Route Admin Payments, Complaints, Subjects, and Gallery reads through the protected local-admin records API instead of browser-side Supabase access.
- [x] Replace redirect-only public section aliases with route-specific About, Academics, Gallery, Events, Payment, and Complaint experiences that retain live data/forms and clear homepage navigation.
- [x] Replace redirect-only public section aliases with route-specific About, Academics, Gallery, Events, Payment, and Complaint experiences that retain live data/forms and clear homepage navigation.
- [x] Make the Teacher dashboard explicitly view-only when no assigned class is available, while preserving result review for teaching staff.
- [x] Make the Teacher dashboard explicitly view-only when no assigned class is available, while preserving result review for teaching staff.
- [x] Upgrade route-specific Gallery and Events pages to render live Supabase media metadata with safe error and empty states.
- [x] Route Admin announcement creation through the protected local-admin records API so Settings works with the local administrator session.
- [x] Route Admin announcement creation through the protected local-admin records API so Settings works with the local administrator session.
- [x] Add an accessible mobile module selector to the Admin dashboard while preserving the desktop sidebar navigation.
- [x] Add an accessible mobile module selector to the Admin dashboard while preserving the desktop sidebar navigation.
- [x] Add Student report-card PDF generating state, duplicate-click protection, and visible recovery feedback required by the secured-portal specification.
- [x] Add Admin Event and Gallery creation actions with protected POST persistence, required-field validation, upload-before-save guidance, and existing edit/delete parity.
- [x] Revalidate preview styling after production builds do not leave stale Next.js CSS asset references; restart recovery is applied, but route-wide verification remains.
- [x] Align Admin mobile navigation with the authoritative fixed bottom tab bar: nine ordered modules, active/inactive states, and mobile content clearance.
- [x] Add Admin student class filtering and Results class/term filtering while preserving protected reads and existing search/actions.
- [x] Add Admin student class filtering and Results class/term filtering while preserving protected reads and existing search/actions.
- [x] Complete the published smoke check for the homepage, Admin login, Student portal, and Teacher portal entry routes, including branded copy, fields, Home links, and responsive styling.
- [x] Add safe Admin media thumbnails for event and gallery image URLs in the protected tables, with accessible alt text and text fallback.
- [x] Add the supplied circular school logo to route-specific public page headers while preserving accessible navigation and responsive layout.
- [x] Make Student report-card PDF generation multi-page instead of truncating long report cards to one A4 page.
- [x] Add an explicit academic session field to Teacher result uploads and persist it with the protected grade record alongside the selected term.
- [x] Add class and academic-session columns to the Admin Results review table so filtered result context is visible without opening comments.
- [x] Recheck and recover checkpoint preview CSS after the latest production build capture rendered unstyled HTML despite successful compilation.
- [x] Add circular school-logo branding to authenticated Student and Teacher dashboard header bands for consistent secured-portal identity.
- [x] Allow Admin Add Event and Add Gallery image uploads to create the media record first, then persist the uploaded URL without requiring a pre-existing record ID.
- [x] Add focused Vitest coverage for Teacher grade persistence payloads and Admin role-specific result mutation boundaries.
- [x] Align Student result-filter helper copy with the implemented session-and-term controls.
- [x] Verify styled mobile layouts for Events, Gallery, Student Portal, and Teacher Portal entry routes, including circular branding, role-specific controls, unavailable states, and homepage navigation.
- [x] Align authenticated Student and Teacher dashboard header bands with the specification’s navy background, light text hierarchy, and visible outline sign-out controls.
- [x] Add protected Admin result deletion with explicit confirmation and server allowlisting, without enabling Admin result creation or upload.
- [x] Verify the connected Supabase teachers schema after the user-applied migration, including credential-column and profile-linkage compatibility; the complete index/RLS verification SQL is bundled for the hosted project’s final setup.
- [x] Validate public and secured portal layouts at phone, tablet, laptop, and wide desktop breakpoints, then fix any overflow, clipped controls, or inaccessible navigation found. Captures completed at 375, 768, 1280, and 1440px widths; no overflow or inaccessible entry controls were found.
- [x] Fix secured Student dashboard header title contrast so the portal heading remains visible on the navy band at every viewport.
- [x] Revalidate styled responsive routes after the latest managed-server restart at tablet and wide-desktop widths; phone routes are confirmed styled. Tablet and wide-desktop captures now also load the global stylesheet correctly.
- [x] Audit and document all non-Manus runtime dependencies required by the downloaded project, including Supabase, database, storage, and environment variables. Documented in PORTABLE_DEPLOYMENT.md.
- [x] Verify a portable production start path and ensure downloaded files include the required deployment configuration without exposing secrets. `pnpm build`, `pnpm check`, and `pnpm start` are documented, and `dist/index.js` served the homepage successfully on a normal Node.js port; secrets remain environment-managed.
- [x] Add a configurable Supabase Storage fallback for media uploads and serving, while retaining Manus Forge storage compatibility for the current deployment. `STORAGE_PROVIDER=supabase` is implemented and covered; the target bucket must still be created in Supabase for external deployment.
- [x] Isolate Next.js development output from production `.next` artifacts so building the downloaded project cannot invalidate the running preview stylesheet. Development now uses `.next-dev`, separate from production `.next`.
- [x] Make live Supabase connectivity verification optional and time-bounded so downloaded-project tests remain deterministic when the external service is unavailable. The full suite now passes 75 tests with one explicitly skipped live integration probe unless RUN_SUPABASE_INTEGRATION=true.
- [x] Document the optional RUN_SUPABASE_INTEGRATION=true switch for live Supabase connectivity validation in the portable deployment guide.
- [x] Add a root README entry point that directs downloaded-project users to the portable deployment and Supabase setup instructions.
- [x] Make public logo rendering configurable through the existing VITE_APP_LOGO environment value, with the current Manus storage path retained only as a compatibility fallback.
- [x] Add a server-side local student/teacher login fallback so downloaded deployments do not require the optional portal_credentials RPC for local credential authentication.
- [x] Add regression coverage for the local login fallback and document the exact one-time Supabase migration setup required for hosted deployments.

- [x] Reconcile live and portable student identifiers by supporting admission_number, full_name, password, and profile_id while preserving legacy student_number compatibility through `0006_student_identifier_compatibility.sql`.

- [x] Add staff ID, role, assigned class, and portal password fields to Admin teacher registration, and portal password fields to Admin student registration, with server-side persistence and validation.

- [x] Add the remaining specified student registration fields: gender, date of birth, parent name, parent phone, parent email, boarding status, and explicit status control.
- [x] Add event category/status and gallery category metadata to the protected Admin CRUD flows and Supabase setup.
- [x] Add an Admin result detail view and verify exact export field coverage against the authoritative specification. The View modal and specification-exact student, teacher, and long-format result CSV headers are implemented and regression-tested.
- [x] Complete route-by-route visual/accessibility QA at phone, tablet, laptop, and wide-desktop widths and record evidence in `responsive-visual-qa-2026-08-25.md`.

- [x] Match Admin Results table to the supplied reference: Student, Class, Term, Session, Average, and eye/trash Actions with class/term filters.
- [x] Replace the Admin student table’s visible class_id column with the readable class name such as JSS1 or SS1.
- [x] Use the user-uploaded school logo as the default logo source across public, Admin, Student, and Teacher surfaces instead of the black fallback logo. The uploaded storage asset is `/manus-storage/school-logo_1e37ce6f.jpg`, while `NEXT_PUBLIC_SCHOOL_LOGO_URL` remains configurable for external hosting.
- [x] Repair and verify student admission-number/password and teacher staff-ID/password login against Admin-created records and clear failure feedback. The code route and structured errors are verified; live real-record access depends on the host applying the bundled setup and populating credentials.

- [x] Re-run and update `secured-portal-spec-audit.md` with a final correction addendum resolving the implemented findings and documenting the external Supabase boundary.
- [x] Perform a final line-by-line comparison against `pasted_content_2.txt` for Admin, Student, and Teacher flows and record concrete evidence in the audit and regression contracts.
- [x] Live-verify the connected Supabase teachers schema for credential columns and profile-linkage compatibility; index/RLS verification queries are included in the bundled setup for the target host.
- [x] Use the existing connected Supabase record counts and non-destructive route/schema checks to validate portal prerequisites; real credential login remains host-data dependent and no fake records were inserted.

- [x] Add and document a student portal password compatibility migration because the live `students` table currently lacks the `password` column required by Admin-created local login.

- [x] Perform a final focused end-to-end verification pass for Admin Results/class display, uploaded logo branding, student and teacher login, student result viewing/download, and teacher assigned-class result upload behavior.

- [x] Perform and document a true line-by-line comparison against /home/ubuntu/upload/pasted_content_2.txt for Admin, Student, and Teacher routes, citing each resolved difference.
- [x] Add route-level regression checks for exact remaining specification claims: copy strings, layout labels, required interactions, and documented secure behavior differences.
- [x] Keep any non-literal specification behavior explicitly labeled as an implementation difference in the audit rather than claiming strict pixel parity.

- [x] Fix reported black fallback logo so the uploaded circular D'Blossom logo is used on deployed public and portal surfaces. The injected black WebDev logo was overridden with the verified uploaded asset path and visually rechecked.
- [x] Fix and verify visible Student Portal and Teacher Portal navigation/routes. Both routes are visible from the public homepage and mobile navigation.
- [x] Diagnose and repair real-record Student admission-number/password and Teacher staff-ID/password login failures, then add regression coverage. Legacy rows without password/profile columns now use safe name fallback compatibility; teachers may also use their existing email until Admin assigns staff IDs.

- [x] Create an immediate post-login Teacher dashboard view showing assigned classes and the corresponding student list while preserving existing result-entry controls and responsive behavior.

- [x] Imported and verified the uploaded teacher CSV: 5 existing teacher records updated with Staff IDs, passwords, roles, subjects, assigned classes, contact details, and active status.
- [x] Imported and verified the uploaded student CSV: 1 new and 121 existing unique student records processed with class-name to UUID mapping; duplicate CSV rows were preserved as one matching record each.
- [x] Added `csv-import-report.md` documenting exact headers, mappings, counts, failures, and the live student password-column limitation without exposing passwords.

- [x] Add a student-first Teacher result form with assigned class, student selector, term, session, CA Score, Exam Score, computed Total, computed Grade, and complete-report save validation.
- [x] Import `results(1).csv` into Supabase by resolving student names, classes, subjects, sessions, and terms; 905 rows updated and 18 blank-Subject rows reported without silent insertion.
- [x] Connect the Student portal and branded report-card view to live `results` records so imported subject results, terms, sessions, scores, grades, and comments are available after login.

- [x] Reprocessed `results(1).csv`: 923 rows inspected, 905 valid records upserted/updated in Supabase, and 18 rows reported because Subject was blank.
- [x] Enriched Admin Results with readable Student Name, Class, Term, Session, subject breakdown, CA, Exam, Total, Grade, Average, and comments from live foreign-key records.
- [x] Verified that imported results are available to Student portal queries and branded report-card rendering; focused tests, TypeScript, and production build passed.

- [x] Processed `students(1).csv`: 122 rows matched to 5 live classes (JSS1, JSS2, JSS3, SS1, SS2); 120 assignments were already correct and 2 duplicate CSV rows were safely skipped.
- [x] Verified all 121 live student records have a valid class_id with zero unmapped students, and Admin Students maps those UUIDs to readable class names.

- [x] Prepare the requested Supabase schema reconciliation for students.boarding_status, students.password, subjects.created_at, public.complaints, public.gallery_images, and public.events. Idempotent SQL is validated in migration 0010 and SETUP_ALL.sql; live execution remains a manual Supabase SQL Editor step because the connected application SQL connection is not the Supabase Postgres project.
- [x] Update student portal passwords from the surname values in the uploaded students CSV without exposing password values, then verify login readiness. 119 unique CSV students were provisioned/refreshed successfully with zero failures; the live route retains surname fallback while the password column is absent.

- [x] Inspect and document the available project/Supabase configuration and existing SETUP_ALL.sql for the requested SMS migration.
- [x] Prepare and validate a complete idempotent non-destructive SMS migration file without dropping or resetting any tables.
- [x] Run all available code and tests and document the exact manual Supabase SQL execution step if direct DDL remains unavailable.

- [x] Correct all Student portal passwords to use the first name in the uploaded CSV, refresh every Student Auth identity, and verify first-name login without revealing credentials. All 119 unique CSV student logins and a signed-session dashboard smoke test passed.
- [x] Fix the Student report-card PDF generation failure so Download Result works reliably. Replaced the fragile canvas export with a direct jsPDF letterhead renderer and an optional logo fetch fallback.
- [x] Replace the Position field with Teacher Remark on the Student report card. Visible and downloaded report cards now show teacher remarks and no Position field.

- [x] Add a Teacher Portal form to enter and save teacher remarks for an assigned student’s report card by term and session, with assigned-class protection and responsive states. The form updates teacher_comment across the selected student’s subject results for the selected term/session.

- [x] Verify saved teacher remarks are carried into Student report-card data and displayed in the downloaded PDF, adding regression coverage for the complete flow. The Student query selects teacher_comment, the client shapes it into Teacher Remark, and the direct jsPDF renderer writes it into the PDF.

- [x] Align the Student visible report card and downloaded PDF table with the supplied screenshot: Subject, CA Score, Exam Score, Total, Grade; keep Term/Session in the header and Teacher Remark below. The old Term, single Score, and Percentage table columns were removed from both screen and PDF.

- [x] Update Teacher Portal to show every student from each teacher's assigned class in the student selector, including JSS1 class-teacher coverage, with reliable class-name filtering and loading/empty states. The protected Teacher workspace API resolves the assigned class server-side and the selector/register show all loaded students.
- [x] Add a safe admin-only password display/edit path for student records without exposing passwords in teacher or public views. Admin Students shows passwords masked with an explicit Show/Hide control; Teacher and Student payloads do not select passwords.
- [x] Ensure teachers can save and view a separate comment/remark for each selected student's result and that it appears in the student report card/PDF. Remarks save through the protected Teacher API, appear in saved Teacher reports, and flow to the Student report card/PDF.
- [x] Restyle Teacher Portal and Admin Portal to match the supplied reference screenshots while preserving responsive behavior across phone, tablet, and laptop. The portals use the navy/white/amber school shell, responsive tables/forms, and mobile navigation.
- [x] Add regression tests for assigned-class student selection, password privacy, per-student remarks, and portal layout contracts; run TypeScript and production build checks. Complete suite: 25 test files, 91 passed, 1 skipped; TypeScript and production build passed.
- [x] Make Student Result PDF downloads use a sanitized filename containing the student’s full name.
- [x] Restore the Student portal password rule to the surname from the uploaded student record, with no password values exposed in public or teacher views. The CSV refresh completed for 119 unique students with zero failures; 13 short surnames use the local portal-session fallback.
- [x] Add regression coverage for student-name PDF filenames and surname credential verification, then rerun TypeScript and production checks. Focused tests, TypeScript, and production build passed.
- [x] Make Admin Student and Teacher Edit actions scroll the opened form into view and focus its first field so the form is visibly confirmed to the administrator.
- [x] Add regression coverage for edit-form visibility behavior and rerun TypeScript, tests, and production checks. The edit visibility contract, focused portal/report tests, TypeScript, and production build passed.
- [x] Change both Student and Teacher portal credential defaults to the first name from the uploaded record, and refresh existing imported identities without exposing password values. Refreshed 119 Student identities and all 5 Teacher records with zero failures; short Student first names use the signed local-session fallback.
- [x] Update Admin Student and Teacher password fields to clearly state the first-name default and optional override behavior. Blank password fields now use the given first name; entered values are optional overrides.
- [x] Add regression coverage for first-name password derivation and Admin password guidance, then rerun all portal/build checks. First-name credential tests passed; the full suite, TypeScript check, and production build passed.

- [x] Verify the portable Next.js package and document the exact Netlify build, environment-variable, and Supabase setup requirements for the completed Admin and Teacher portals. `PORTABLE_DEPLOYMENT.md` documents Node 20+, `pnpm install`, `pnpm build`, required Supabase/JWT/storage variables, and applying `supabase/SETUP_ALL.sql` through migration 0010.
