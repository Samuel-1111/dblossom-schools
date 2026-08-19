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
