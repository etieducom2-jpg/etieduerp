"""
Enrollment management routes for the institute management system.

Note: This file is set up for future refactoring.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/enrollments", tags=["Enrollments"])

# Routes to migrate:
# - POST /enrollments
# - GET /enrollments
# - GET /enrollments/{enrollment_id}
# - PUT /enrollments/{enrollment_id}
# - PUT /enrollments/{enrollment_id}/student
# - DELETE /enrollments/{enrollment_id}
