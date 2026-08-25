# Responsive and Visual QA Record

**Date:** 2026-08-25  
**Project:** D'Blossom Model Private Schools  
**Viewports reviewed:** 375×812 phone, 768px tablet, 1280×720 laptop, and 1440px wide desktop.

## Route evidence

| Route/group | Phone | Tablet | Laptop | Wide desktop | Result |
|---|---:|---:|---:|---:|---|
| `/` homepage | Captured | Previously captured | Captured | Previously captured | Pass: logo/menu behavior, hero copy, CTA reachability, and no horizontal overflow observed. |
| `/about` and `/academics` | Previously captured | Previously captured | Captured | Previously captured | Pass: navy hero bands, readable heading/body contrast, cards, and Back to Home escape path. |
| `/gallery` and `/events` | Captured | Previously captured | Captured | Previously captured | Pass: unavailable-media states are visible, actionable, and do not collapse the content layout. |
| `/admin-login` | Captured | Previously captured | Captured | Previously captured | Pass: full-screen navy hierarchy, circular logo, labels, inputs, and primary action fit within the viewport; the lower card continues scrollably on phone. |
| `/student-portal` | Captured | Previously captured | Captured | Previously captured | Pass: role icon, heading, logo, Admission Number and Password fields, Login action, and Back to Home remain visible/reachable. |
| `/teacher-portal` | Captured | Previously captured | Captured | Previously captured | Pass: role icon, heading, logo, Staff ID and Password fields, Login action, and Back to Home remain visible/reachable. |
| `/admin-dashboard` | Previously captured | Previously captured | Previously captured | Previously captured | Pass for shell/navigation: desktop sidebar and mobile bottom navigation remain reachable; protected dashboard requires administrator session. |
| `/student-dashboard` and `/teacher-dashboard` | Previously captured | Previously captured | Previously captured | Previously captured | Pass for secured header bands, role-specific controls, responsive tables/forms, and visible sign-out escape paths; live data access remains Supabase-configuration dependent. |

## Accessibility checks

Interactive elements were checked for native button semantics, visible labels or accessible names, keyboard-reachable links/buttons/selects, disabled loading states, visible `role="status"` feedback where applicable, and explicit confirmation for destructive Admin actions. The current Admin registration controls use required browser validation for the core fields and shared validation helpers for student/teacher credential rules. Password values are not rendered in Admin data tables.

The visual review confirmed the required high-level contrast hierarchy: dark navy surfaces carry light text, gold is reserved for emphasis/primary secondary actions, red is reserved for errors/destructive meaning, and white cards retain readable dark text. The current source retains a few intentional implementation differences from the specification, which are documented in `secured-portal-spec-audit.md` rather than being silently treated as exact parity.

## Functional QA evidence

The complete deterministic suite reports **77 passing tests and 1 intentionally skipped optional live Supabase probe**. TypeScript passes. The production build passes. The standalone `dist/index.js` launcher starts on a normal port, returns HTTP 200 for `/`, and returns HTTP 400 with a structured required-field message for an empty `/api/portal-login` request.

## Open verification boundary

This record verifies the responsive and visual implementation available in the managed preview. It does not claim successful live student/teacher login until the target Supabase project has the complete ordered setup from `supabase/SETUP_ALL.sql`, including profiles, portal credential support, role policies, and student/media compatibility fields. It also does not claim pixel-perfect parity for specification rows marked Partial in `secured-portal-spec-audit.md`.

## Post-parity desktop recheck

At 1280×720, `/`, `/student-portal`, `/teacher-portal`, `/admin-login`, `/events`, and `/gallery` rendered successfully after the semantic-token, localStorage-subject, and report-card updates. Portal entry cards remain centered, the navy header bands retain readable light-text hierarchy, the circular logo is visible, and public media routes show clear unavailable-state messaging with reachable home navigation when no live media rows are available. Homepage navigation and portal CTAs remain visible without horizontal overflow in the captured viewport.
