# Code Refactoring Guide

## Overview

This document provides a detailed plan for refactoring the codebase to improve maintainability and reduce technical debt.

## Current State

### Backend (`server.py`)
- **Lines of code:** 10,225
- **Status:** CRITICAL - Needs immediate attention
- **Risk:** High - Single point of failure, difficult to maintain

### Frontend (`Dashboard.js`)
- **Lines of code:** 1,042 (reduced from 1,704)
- **Status:** IMPROVED - Modular components created
- **Components extracted:**
  - `FDEDashboard.jsx`
  - `CounsellorDashboard.jsx`
  - `BranchAdminDashboard.jsx`

---

## Backend Refactoring Plan

### Step 1: Router Structure (COMPLETED)

Created stub files in `/app/backend/routes/`:
- `auth.py` - Authentication routes
- `admin.py` - Admin management routes
- `leads.py` - Lead management routes
- `enrollments.py` - Enrollment routes
- `students.py` - Student routes
- `analytics.py` - Analytics/dashboard routes
- `finances.py` - Financial routes
- `batches.py` - Batch management routes
- `exams.py` - Exam routes

### Step 2: Core Dependencies (COMPLETED)

Created shared modules in `/app/backend/core/`:
- `deps.py` - Database, auth, password utilities
- `session.py` - Academic session helpers

### Step 3: Migration Process

For each router file:

1. **Copy relevant routes** from `server.py` to the router file
2. **Update imports** to use shared modules
3. **Add router to main app** in `server.py`:
   ```python
   from routes.auth import router as auth_router
   app.include_router(auth_router, prefix="/api")
   ```
4. **Remove routes** from `server.py`
5. **Test thoroughly** before proceeding

### Route Migration Order (Recommended)

1. **auth.py** (5 routes) - Foundation
2. **admin.py** (15+ routes) - High impact
3. **leads.py** (7 routes) - Core business
4. **enrollments.py** (6 routes) - Core business
5. **students.py** (5 routes) - Core business
6. **finances.py** (10+ routes) - Financial operations
7. **batches.py** (7 routes) - Support
8. **analytics.py** (8+ routes) - Dashboard data
9. **exams.py** (8+ routes) - LMS features

---

## Frontend Refactoring Plan

### Completed

- [x] Create modular dashboard components
- [x] Extract FDE Dashboard
- [x] Extract Counsellor Dashboard
- [x] Extract Branch Admin Dashboard
- [x] Update main Dashboard.js to use components

### Remaining

- [ ] Extract Super Admin Dashboard
- [ ] Refactor `AdminPanel.js` (growing too large)
- [ ] Refactor `StudentsPage.js` (1,800+ lines)
- [ ] Refactor `InsightsPage.js` (by tab)

---

## Testing Strategy

After each refactoring step:

1. Run backend linting: `ruff check /app/backend`
2. Run frontend linting: `eslint /app/frontend/src`
3. Test API endpoints with curl
4. Test UI with screenshot tool
5. Run testing agent for comprehensive testing

---

## Rollback Plan

If any step fails:

1. Git revert to previous commit
2. Restart services: `sudo supervisorctl restart all`
3. Verify functionality before continuing

---

## Estimated Effort

| Task | Lines | Complexity | Time Estimate |
|------|-------|------------|---------------|
| Backend auth routes | 150 | Low | 30 min |
| Backend admin routes | 400 | Medium | 1 hour |
| Backend leads routes | 300 | Medium | 45 min |
| Backend enrollments | 400 | High | 1 hour |
| Backend students | 250 | Medium | 45 min |
| Backend finances | 500 | High | 1.5 hours |
| Backend batches | 300 | Medium | 45 min |
| Backend analytics | 600 | High | 1.5 hours |
| Backend exams | 400 | Medium | 1 hour |
| Frontend remaining | 1000 | Medium | 2 hours |

**Total estimated time:** ~10-12 hours of focused work

---

## Notes

- Always maintain a working state after each step
- Test in preview before deploying to production
- Keep `server.py` as fallback until migration is verified
- Document any breaking changes

Last updated: April 2026
