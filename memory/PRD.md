# ETI Educom - Branch Management System (ERP)

## Problem Statement
Clone https://github.com/etieducom2-jpg/etieduerp into /app and get it running.

## Architecture
- **Backend**: FastAPI + Motor (MongoDB async) at 0.0.0.0:8001, prefixed `/api`
- **Frontend**: React 19 + CRACO + Tailwind + Radix UI, at :3000
- **DB**: MongoDB (local, `MONGO_URL`, `DB_NAME=test_database`)
- **Auth**: JWT via `python-jose` + bcrypt via passlib
- **Integrations present in code**: Facebook Business SDK, emergentintegrations LLM, MSG91 WhatsApp, APScheduler, Stripe, qrcode, reportlab

## What's been implemented (2026-01-06)
- Cloned full repo from GitHub into `/app` (replaced existing content, preserved `.git`, `.emergent`)
- Installed Python deps from `backend/requirements.txt` (pip)
- Installed frontend deps via `yarn install`
- Restarted supervisor -> backend + frontend RUNNING
- Verified: login endpoint works with seeded admin credentials
- Verified: frontend login page loads at preview URL

## Seeded users (from server.py startup)
- admin@etieducom.com / admin@123 (Super Admin)
- placement@etieducom.com / placement@123 (Placement Manager)
- brandmgr@etieducom.com / brand@123 (Brand Manager)
- wizbang@etieducom.com / wizbang@123 (Wizbang Finance)

## Next Action Items
- User to test full app flows (leads, enrollments, batches, certificates, etc.)
- If any 3rd-party integrations are needed (MSG91 WhatsApp, Meta Ads, Stripe, LLM), user must supply keys via `.env`
- Optional: add integration API keys as needed for full feature usage
