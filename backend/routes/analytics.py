"""
Analytics and dashboard routes for the institute management system.

Note: This file is set up for future refactoring.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/analytics", tags=["Analytics"])

# Routes to migrate:
# - GET /analytics (main analytics)
# - GET /analytics/branch-financial-stats
# - GET /analytics/branch-admission-stats
# - GET /analytics/ai-branch-insights
# - GET /session-comparison-stats
# - GET /fde-dashboard
# - GET /fde-dashboard-enhanced
# - GET /counsellor-dashboard-enhanced
