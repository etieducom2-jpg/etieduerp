"""
Exam management routes.

Note: This file is set up for future refactoring.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/exams", tags=["Exams"])

# Routes to migrate:
# - POST /exams
# - GET /exams
# - GET /exams/{exam_id}
# - PUT /exams/{exam_id}
# - DELETE /exams/{exam_id}
# - POST /exams/{exam_id}/results
# - GET /quiz/topics
# - GET /quiz/questions/{topic_id}
