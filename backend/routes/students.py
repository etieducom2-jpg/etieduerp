"""
Student management routes for the institute management system.

Note: This file is set up for future refactoring.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/students", tags=["Students"])

# Routes to migrate:
# - GET /students
# - GET /students/{student_id}
# - PUT /students/{student_id}
# - GET /students/{student_id}/attendance
# - GET /students/{student_id}/exams
