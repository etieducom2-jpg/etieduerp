# PRD — ETI Educom Branch Management System (etieduerp)

## Origin
Cloned from `https://github.com/etieducom2-jpg/etieduerp` on 2026-05-12 and replaced `/app` content. Stack: FastAPI + MongoDB + React 19 + Tailwind + CRACO.

## User personas
- **Super Admin (Admin)** — full access across all branches.
- **Branch Admin** — full access within their branch.
- **Counsellor** — manages assigned leads/follow-ups; receives incentives on international exams.
- **Front Desk Executive (FDE)** — enrollments, payments, students.
- **Certificate Manager** — reviews / approves / edits / deletes certificate requests.
- **Trainer** — batch attendance, course completion.
- **Academic Controller** — curriculum, quizzes.

## Core requirements (static)
- Multi-branch CRM with leads, follow-ups, enrollments, payments, students.
- Certificate generation (server validates → frontend renders A4 PNG).
- International exam booking + counsellor incentive flow.
- Role-based dashboards, AI insights (gpt-4o via Emergent key), WhatsApp templated notifications (MSG91).

## Implemented in this iteration (2026-05-12)
- **Lost Leads** — new `GET /api/leads/lost`, `PUT /api/leads/{id}/restore-from-lost` endpoints; sidebar tab `/lost-leads` visible to Admin/Branch Admin/Counsellor; restore back to New/Contacted/Follow-up/Demo Booked.
- **Lead List Improvements** — `GET /api/leads` hides Lost by default (only returns Lost when `?status=Lost`); UI adds Source + Program filters; Lost removed from filter dropdown (lives in its own page).
- **AI Insights** — `EMERGENT_LLM_KEY` added to `/app/backend/.env`; endpoint returns AI-powered insights with rule-based fallback.
- **Certificate Manager** — new `DELETE /api/certificate-requests/{id}` (Admin & Cert Manager); `CertificateRequestUpdate` expanded to allow editing `student_name`, `program_name`, `program_duration` (in addition to dates, mode, hours). Edits reflect on the printed certificate.
- **Certificate Quality** — removed duplicated `ETI CERTIFIED –` prefix on program name; `(Hours)` clause only rendered when program contains "Basics of Computer"; canvas now uses high image-smoothing, geometricPrecision text rendering, and blob-based download for max-fidelity PNG.
- **International Exams** — `mark_incentive_paid` lookup uses `$or` on `id`/`booking_id` to eliminate the 'Booking not found' edge case on legacy bookings.
- **WhatsApp Templates** — defaults updated and a startup migration fills any blanks with: `eti_enquiry_confirmation`, `eti_demo_confirmation`, `eti_enrollment_confirmation`, `eti_payment`, `eti_fee_reminder`, `eti_birthday_wishes`, `eti_certificate` (namespace `73fda5e9_77e9_445f_82ac_9c2e532b32f4`).
- **Branch Admin Dashboard** — new "Demos Booked for Today" card (`GET /api/branch-admin/demos-today`) showing each lead, time, trainer, phone.

## Testing
Backend testing agent ran 24 tests against the new/changed endpoints: **24/24 passed (100%)**. Report: `/app/test_reports/iteration_1.json`. Tests file: `/app/backend/tests/test_iteration_lost_leads_etc.py`.

## Backlog / Next Action Items
- P1: Add a "View Followups + Last Contact" timeline directly on the LostLeadsPage row (currently restore-only).
- P1: Frontend smoke test via Playwright for sidebar/lost-leads/cert delete flows (skipped this round per testing-agent scope).
- P2: AI insights — bump Emergent LLM budget once consumed; consider caching for 1h to reduce calls.
- P2: Bulk actions on leads (assign counsellor, change status, export selected).
- P2: Refactor `server.py` (11k lines) into the `routes/` package — the scaffolding (`/app/backend/routes/leads.py`, etc.) already exists.
- P2: Validate `new_status` query param strictly in `restore-from-lost` (currently coerces invalid values to "New").

## Files of note
- `/app/backend/server.py` — all routes/models (monolith).
- `/app/backend/.env` — MONGO_URL, DB_NAME, CORS_ORIGINS, EMERGENT_LLM_KEY.
- `/app/frontend/src/pages/LostLeadsPage.js` — new.
- `/app/frontend/src/components/dashboards/BranchAdminDashboard.jsx` — Demos Today card.
- `/app/frontend/src/pages/CertificateManagementPage.js` — Delete, expanded Edit, certificate quality.
- `/app/frontend/src/pages/LeadsPage.js` — Source + Program filters.
- `/app/frontend/src/components/Layout.js` — Lost Leads sidebar item.
