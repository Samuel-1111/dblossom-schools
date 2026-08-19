# Project TODO

- [x] Establish the premium D'Blossom visual system: typography, color tokens, responsive spacing, states, and accessibility.
- [ ] Build separate public Home, About, Academics, Gallery, Events/News, Payment Information, and Contact experiences. Public route aliases now exist for each information area and render the corresponding single-page sections; dedicated page-level copy/scroll behavior remains an audit item.
- [ ] Add database tables for students, teachers, results, payments, events, gallery images, and complaints with required fields and relationships. (Tables are present and results now reference students; remaining entity relationships are still tracked.)
- [ ] Implement secure role-aware backend procedures for public submissions, student access, teacher access, and admin CRUD. (Current procedures include portal access and an admin snapshot; hardening and full CRUD remain.)
- [x] Implement student login by admission number and password.
- [x] Implement student result filtering by term and session.
- [x] Implement branded multi-subject PDF report card generation.
- [x] Implement teacher login by staff ID and password.
- [x] Implement class-teacher result entry with selectable term/session and automatic CA/exam totals, grades, and averages.
- [x] Implement teaching-staff view-only result access with class-filtered result listing.
- [ ] Build the admin dashboard with CRUD management for all required entities. Current implementation has complete student/teacher foundations and management actions, but result/event/gallery update flows remain to be completed.
- [x] Implement automatic grading rules: A >= 70, B 60-69, C 50-59, D 40-49, F < 40.
- [x] Implement parent payment notification form with WhatsApp proof-sending instructions.
- [x] Implement admin payment confirmation and rejection flow.
- [x] Implement public complaint/contact submission routed to the protected admin portal; direct school-inbox email is intentionally not required by the revised scope.
- [ ] Implement S3-backed upload and serving for gallery and event images. Gallery upload is verified; event upload, admin thumbnails, and public rendering are implemented but end-to-end upload verification remains.
- [ ] Add Vitest coverage for grading, result persistence, role permissions, payment workflow, complaint notification, and report-card data. Focused grading, registration normalization, subject shaping, and authentication tests now total 18; persistence/workflow coverage remains.
- [x] Run type checks, tests, production build, and browser verification at desktop and mobile breakpoints. Automated checks and mobile screenshots for public, student, teacher, and admin entry routes are complete.
- [ ] Resolve defects, review accessibility and visual consistency, and prepare the final checkpoint. Latest desktop/mobile captures pass; media mutation failures now surface visibly, while strict module and exact-copy gaps remain tracked below.
- [ ] Add result update/create management parity and event/gallery edit flows where required by the strict admin specification. Result creation and comment updates plus event/gallery edit UI are wired; full browser verification remains.
- [ ] Add S3-backed event image upload and public/admin event image rendering. UI code is implemented; browser create-and-render verification remains.
- [ ] Complete the secured-portal exact-copy and interaction audit, including all validation/loading/mobile states.

- [x] Route new public complaints into the protected admin portal as the primary review workflow; direct school-inbox email is no longer required.
- [x] Add an admin complaints view with status management and readable submission details.

- [x] Add specification-aligned /admin-login and /admin-dashboard routes with local admin credentials, validation, session guard, logout, and settings password override.
- [ ] Align secured portal visual tokens, typography, header bands, login cards, validation states, loading states, and mobile navigation with the attached specification; screenshots pass the broad visual review, but exact behavior audit remains.
- [ ] Expand the admin dashboard into the nine specified modules: Students, Teachers, Results, Payments, Events, Gallery, Complaints, Subjects, and Settings; module shells exist, while full CRUD parity remains.
- [x] Add admin CSV exports for students, teachers, and long-format results.
- [x] Persist an admin-managed subject list and use it to build the teacher result-entry grid dynamically.
- [x] Update the student portal to /student-portal with specification-aligned login validation and report-card rendering, including per-result html2canvas/jsPDF capture.
- [ ] Update the teacher portal to /teacher-portal with specification-aligned login validation, dynamic subjects, class-student loading, existing-result loading, result entry controls, and save/update states; the broad flows exist but exact behavior audit remains.
- [ ] Add portal-specific Vitest coverage for admin authentication, student/teacher validation, dynamic subject behavior, result persistence, and report-card shaping. Current suite has 18 passing tests, including portal grade boundaries, optional-field normalization, and report-card shaping; mutation persistence coverage remains.

- [ ] Re-read and implement the complete authoritative pasted specification strictly, replacing prior design assumptions; the visual foundation is aligned, but remaining copy and module gaps are tracked below.
- [x] Reset global design tokens exactly to the specification: white background, dark navy foreground, primary HSL 220 70% 25%, red accent HSL 0 75% 50%, gold HSL 43 85% 55%, Inter body, Playfair Display headings, exact spacing, card, table, button, animation, and responsive rules.
- [x] Rebuild the public information architecture strictly as Home, About, Academics, Gallery, Events, Payment, Complaint, with the specified desktop/mobile navbar behavior and portal links.
- [ ] Rebuild secured portal layouts strictly from the specification, including exact login hierarchy, validation states, result-card formatting, branded report-card design, admin navigation, and specified module structure; exact cross-portal audit remains.
- [ ] Replace prior custom visual treatment and copy that is not present in the authoritative pasted specification.

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
