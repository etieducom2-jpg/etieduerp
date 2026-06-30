"""
Admin routes for the institute management system.
This includes branch management, user management, sessions, and admin settings.

Note: This file is set up for future refactoring.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/admin", tags=["Admin"])

# Routes to migrate:
# - POST /admin/branches
# - GET /admin/branches
# - PUT /admin/branches/{branch_id}
# - DELETE /admin/branches/{branch_id}
# - POST /admin/users
# - GET /admin/users
# - PUT /admin/users/{user_id}/password
# - PUT /admin/users/{user_id}/status
# - DELETE /admin/users/{user_id}
# - POST/GET/PUT/DELETE /admin/sessions
# - POST/GET/PUT/DELETE /admin/programs
# - GET /admin/settings
# - PUT /admin/settings
