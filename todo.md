# Project TODO

- [x] Establish the premium D'Blossom visual system: typography, color tokens, responsive spacing, states, and accessibility.
- [ ] Build separate public Home, About, Academics, Gallery, Events/News, Payment Information, and Contact experiences. (Current delivery has a polished single-page public experience with these sections represented.)
- [ ] Add database tables for students, teachers, results, payments, events, gallery images, and complaints with required fields and relationships. (Tables are present; foreign-key relationships remain.)
- [ ] Implement secure role-aware backend procedures for public submissions, student access, teacher access, and admin CRUD. (Current procedures include portal access and an admin snapshot; hardening and full CRUD remain.)
- [x] Implement student login by admission number and password.
- [x] Implement student result filtering by term and session.
- [x] Implement branded multi-subject PDF report card generation.
- [x] Implement teacher login by staff ID and password.
- [x] Implement class-teacher result entry with selectable term/session and automatic CA/exam totals, grades, and averages.
- [x] Implement teaching-staff view-only result access with class-filtered result listing.
- [ ] Build the admin dashboard with CRUD management for all required entities. (Current delivery includes a protected live snapshot dashboard; CRUD actions remain.)
- [x] Implement automatic grading rules: A >= 70, B 60-69, C 50-59, D 40-49, F < 40.
- [x] Implement parent payment notification form with WhatsApp proof-sending instructions.
- [x] Implement admin payment confirmation and rejection flow.
- [x] Implement public complaint/contact submission routed to the protected admin portal; direct school-inbox email is intentionally not required by the revised scope.
- [ ] Implement S3-backed upload and serving for gallery and event images.
- [ ] Add Vitest coverage for grading, result persistence, role permissions, payment workflow, complaint notification, and report-card data. (Current tests cover configuration and grading.)
- [ ] Run type checks, tests, production build, and browser verification at desktop and mobile breakpoints. (Checks and desktop verification are complete; mobile capture was attempted but unavailable after service restart.)
- [ ] Resolve defects, review accessibility and visual consistency, and prepare the final checkpoint.

- [x] Route new public complaints into the protected admin portal as the primary review workflow; direct school-inbox email is no longer required.
- [x] Add an admin complaints view with status management and readable submission details.

- [ ] Add specification-aligned /admin-login and /admin-dashboard routes with local admin credentials, validation, session guard, logout, and settings password override.
- [ ] Align secured portal visual tokens, typography, header bands, login cards, validation states, loading states, and mobile navigation with the attached specification.
- [ ] Expand the admin dashboard into the nine specified modules: Students, Teachers, Results, Payments, Events, Gallery, Complaints, Subjects, and Settings.
- [ ] Add admin CSV exports for students, teachers, and long-format results.
- [ ] Persist an admin-managed subject list and use it to build the teacher result-entry grid dynamically.
- [ ] Update the student portal to /student-portal with specification-aligned login validation and report-card rendering.
- [ ] Update the teacher portal to /teacher-portal with specification-aligned login validation, dynamic subjects, load/edit result behavior, add/remove subject controls, and save/update states.
- [ ] Add portal-specific Vitest coverage for admin authentication, student/teacher validation, dynamic subject behavior, result persistence, and report-card shaping.
