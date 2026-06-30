"""
Financial routes for the institute management system.
Includes payments, expenses, royalties.

Note: This file is set up for future refactoring.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/finances", tags=["Finances"])

# Routes to migrate:
# - POST /payments
# - GET /payments
# - GET /payments/{payment_id}
# - DELETE /payments/{payment_id}
# - POST /expenses
# - GET /expenses
# - DELETE /expenses/{expense_id}
# - GET /financial-stats
# - GET /royalty/collection
# - POST /royalty/pay
