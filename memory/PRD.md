# ETI Educom - Institute Management System

## Problem Statement
Cloned from `https://github.com/wizbangindia-creator/etierp`. User progressively asked for:
1. Fix International Certifications "Mark Paid" 404 bug; dashboards show Incentive Earned / Released.
2. Verify full closed loop: trainer-marks-complete requires fee paid; multi-course certificates.
3. Cert request requires fee paid AND trainer-marked exam done. Only Cert Manager approves.
4. **Only Certificate Manager and Front Desk Executive can view & download approved certificates** (and Super Admin as system fallback).

## Tech Stack
- Frontend: React + Craco + Tailwind + Shadcn/UI
- Backend: FastAPI + Motor + MongoDB

## Roles & Final Certificate Permissions
| Role | Sidebar "Certificates" | List/view | Approve/Reject | Download |
|------|:-:|:-:|:-:|:-:|
| Super Admin | ✅ | ✅ (all branches) | ✅ | ✅ |
| Certificate Manager | ✅ | ✅ (all branches) | ✅ | ✅ |
| Front Desk Executive | ✅ | ✅ (own branch) | ❌ | ✅ |
| Branch Admin | ❌ | ❌ | ❌ | ❌ |
| Counsellor | ❌ | ❌ | ❌ | ❌ |
| Trainer | ❌ | ❌ | ❌ | ❌ |

## Closed-Loop Flow
1. Super Admin creates **programs/courses** via `POST /api/admin/programs`.
2. Student enrolls. Each enrollment has its own `final_fee` & `total_paid`.
3. **Trainer "Mark Complete"** blocks unless student is assigned + fee fully paid.
4. **Public cert request** blocks unless: enrollment exists, fee paid, trainer has marked complete, exam not Failed, no duplicate active request.
5. **Approve/Reject** — Certificate Manager + Super Admin only. Approval auto-marks enrollment `Completed`.
6. **Download** — Front Desk Executive, Certificate Manager, Super Admin only. Admin/CM download transitions status to `Ready` + sends WhatsApp.

## What's Been Implemented
- [2026-04-18] Repo cloned, deps installed, admin seeded.
- [2026-04-18] Fixed International Exam Incentive "Mark Paid" + dashboards show Earned/Released.
- [2026-04-19] Cert request flow: phone+branch matching; `course_completed` flag per course; cert request requires trainer completion + exam pass; cert UI gates Approve/Reject to CM/Admin.
- [2026-04-19] **Final permission tightening**: list/view/download restricted to FDE + Cert Manager (+ Admin). Branch Admin & Counsellor no longer see the Certificates tab at all.

## Verified E2E (10/10 permission checks passed)
```
LISTING           Counsellor=403  BA=403  FDE=200  CM=200  Admin=200
DOWNLOAD approved Counsellor=403  BA=403  FDE=200  CM=200  Admin=200
```

## Prioritized Backlog
- P1: Auto-send certificate PDF to student via WhatsApp on approval.
- P2: Audit log on approve/reject/download events.
- P2: Bulk-approve pending certificate requests.
- P3: Per-enrollment fee payment progress bar on public cert request page.
