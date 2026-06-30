"""
Lead management routes for the institute management system.

Note: This file is set up for future refactoring.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/leads", tags=["Leads"])

# Routes to migrate:
# - POST /leads
# - GET /leads
# - GET /leads/{lead_id}
# - PUT /leads/{lead_id}
# - DELETE /leads/{lead_id}
# - POST /leads/{lead_id}/followup
# - GET /leads/{lead_id}/followups
