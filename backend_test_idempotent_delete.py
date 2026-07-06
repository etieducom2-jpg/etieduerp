#!/usr/bin/env python3
"""
Backend API Test for ETI Educom ERP - Idempotent Delete Bug Fix
Tests the "Student not found" delete bug fix - DELETE /api/students/{enrollment_id}/permanent

7 Assertions:
1. IDEMPOTENT — non-existent enrollment (fake UUID) → expect 200 + already_deleted: true
2. HAPPY PATH — real enrollment with no payments → expect 200 with success message
3. REPEATED DELETE — same UUID again → expect 200 + already_deleted: true (core fix)
4. AUTH ORDER — non-admin, non-existent → expect 403 (NOT 200)
5. PAYMENT GUARD — real enrollment with payment → expect 400 "already been received"
6. BRANCH GUARD — Branch Admin from another branch → expect 403 "You can only delete students from your branch"
7. CASCADE ON REAL DELETE — verify all related collections are cleaned up
"""

import requests
import json
import sys
import time
from typing import Optional, Dict, Any
from pymongo import MongoClient

# Unique timestamp for this test run
TEST_RUN_ID = str(int(time.time()))

# Base URL from frontend/.env
BASE_URL = "https://erp-preview-18.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@etieducom.com"
ADMIN_PASSWORD = "admin@123"

# MongoDB connection
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def log_success(msg: str):
    print(f"{Colors.GREEN}✓ {msg}{Colors.RESET}")

def log_error(msg: str):
    print(f"{Colors.RED}✗ {msg}{Colors.RESET}")

def log_info(msg: str):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.RESET}")

def log_warning(msg: str):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.RESET}")

def login(email: str, password: str) -> Optional[str]:
    """Login and return access token"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data={"username": email, "password": password}
        )
        if response.status_code == 200:
            token = response.json()["access_token"]
            log_success(f"Logged in as {email}")
            return token
        else:
            log_error(f"Login failed for {email}: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        log_error(f"Login exception for {email}: {str(e)}")
        return None

def create_branch(token: str, name: str) -> Optional[str]:
    """Create a test branch and return its ID"""
    try:
        branch_data = {
            "name": name,
            "location": "Test Location",
            "address": "123 Test St",
            "city": "TestCity",
            "state": "TestState",
            "pincode": "123456",
            "owner_name": "Test Owner",
            "owner_email": f"owner_{name.lower().replace(' ', '_')}_{TEST_RUN_ID}@test.com",
            "owner_phone": "9876543210",
            "owner_designation": "Owner",
            "branch_phone": "9876543211",
            "branch_email": f"branch_{name.lower().replace(' ', '_')}_{TEST_RUN_ID}@test.com",
            "royalty_percentage": 0.0
        }
        response = requests.post(
            f"{BASE_URL}/admin/branches",
            headers={"Authorization": f"Bearer {token}"},
            json=branch_data
        )
        if response.status_code == 200:
            branch_id = response.json()["id"]
            log_success(f"Created branch: {name} (ID: {branch_id})")
            return branch_id
        else:
            log_error(f"Failed to create branch: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        log_error(f"Exception creating branch: {str(e)}")
        return None

def create_user(token: str, email: str, password: str, name: str, role: str, branch_id: str) -> tuple:
    """Create a user and return their ID and email"""
    try:
        unique_email = email.replace("@", f"_{TEST_RUN_ID}@")
        user_data = {
            "email": unique_email,
            "password": password,
            "name": name,
            "role": role,
            "branch_id": branch_id,
            "phone": "9876543210"
        }
        response = requests.post(
            f"{BASE_URL}/admin/users",
            headers={"Authorization": f"Bearer {token}"},
            json=user_data
        )
        if response.status_code == 200:
            user_id = response.json()["id"]
            log_success(f"Created user: {name} ({role}) - ID: {user_id}")
            return user_id, unique_email
        else:
            log_error(f"Failed to create user {name}: {response.status_code} - {response.text}")
            return None, None
    except Exception as e:
        log_error(f"Exception creating user {name}: {str(e)}")
        return None, None

def create_program(token: str, name: str, fee: float) -> Optional[str]:
    """Create a program and return its ID"""
    try:
        program_data = {
            "name": name,
            "duration": "6 months",
            "fee": fee,
            "max_discount_percent": 20.0
        }
        response = requests.post(
            f"{BASE_URL}/admin/programs",
            headers={"Authorization": f"Bearer {token}"},
            json=program_data
        )
        if response.status_code == 200:
            program_id = response.json()["id"]
            log_success(f"Created program: {name} (ID: {program_id})")
            return program_id
        else:
            log_error(f"Failed to create program: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        log_error(f"Exception creating program: {str(e)}")
        return None

def create_lead(token: str, branch_id: str, program_id: str) -> Optional[str]:
    """Create a lead and return its ID"""
    try:
        lead_data = {
            "name": f"Test Student {TEST_RUN_ID}",
            "number": "9876543210",
            "email": f"student_{TEST_RUN_ID}_{branch_id[:8]}@test.com",
            "program_id": program_id,
            "lead_source": "Walk-in",
            "branch_id": branch_id
        }
        
        response = requests.post(
            f"{BASE_URL}/leads",
            headers={"Authorization": f"Bearer {token}"},
            json=lead_data
        )
        if response.status_code == 200:
            lead_id = response.json()["id"]
            log_success(f"Created lead: {lead_id}")
            
            # Update lead status to Converted so it can be enrolled
            update_response = requests.put(
                f"{BASE_URL}/leads/{lead_id}",
                headers={"Authorization": f"Bearer {token}"},
                json={"status": "Converted"}
            )
            if update_response.status_code != 200:
                log_warning(f"Failed to update lead status to Converted: {update_response.status_code}")
            
            return lead_id
        else:
            log_error(f"Failed to create lead: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        log_error(f"Exception creating lead: {str(e)}")
        return None

def create_enrollment(token: str, lead_id: str, program_id: str, branch_id: str) -> Optional[str]:
    """Create an enrollment and return its ID"""
    try:
        enrollment_data = {
            "lead_id": lead_id,
            "student_name": f"Test Student {TEST_RUN_ID}",
            "email": f"student_{TEST_RUN_ID}_{lead_id[:8]}@test.com",
            "phone": "9876543210",
            "program_id": program_id,
            "branch_id": branch_id,
            "fee_quoted": 50000,
            "discount_percent": 0,
            "final_fee": 50000,
            "payment_plan": "One-time",
            "enrollment_date": "2024-01-15"
        }
        response = requests.post(
            f"{BASE_URL}/enrollments",
            headers={"Authorization": f"Bearer {token}"},
            json=enrollment_data
        )
        if response.status_code == 200:
            enrollment_id = response.json()["id"]
            log_success(f"Created enrollment: {enrollment_id}")
            return enrollment_id
        else:
            log_error(f"Failed to create enrollment: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        log_error(f"Exception creating enrollment: {str(e)}")
        return None

def create_payment(token: str, enrollment_id: str, amount: float) -> Optional[str]:
    """Create a payment and return its ID"""
    try:
        payment_data = {
            "enrollment_id": enrollment_id,
            "amount": amount,
            "payment_mode": "Cash",
            "payment_date": "2024-01-20",
            "remarks": "Test payment"
        }
        response = requests.post(
            f"{BASE_URL}/payments",
            headers={"Authorization": f"Bearer {token}"},
            json=payment_data
        )
        if response.status_code == 200:
            payment_id = response.json()["id"]
            log_success(f"Created payment: {payment_id} for amount: {amount}")
            return payment_id
        else:
            log_error(f"Failed to create payment: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        log_error(f"Exception creating payment: {str(e)}")
        return None

def seed_related_records(enrollment_id: str, branch_id: str) -> bool:
    """Seed related records in MongoDB for cascade delete testing"""
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        import uuid
        from datetime import datetime, timezone
        
        # Create payment_plan
        plan_id = str(uuid.uuid4())
        payment_plan = {
            "id": plan_id,
            "enrollment_id": enrollment_id,
            "plan_type": "Installments",
            "total_amount": 50000,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        db.payment_plans.insert_one(payment_plan)
        log_success(f"Created payment_plan: {plan_id}")
        
        # Create installment_schedule
        installment_id = str(uuid.uuid4())
        installment = {
            "id": installment_id,
            "payment_plan_id": plan_id,
            "enrollment_id": enrollment_id,
            "amount": 25000,
            "due_date": "2024-02-01",
            "status": "Pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        db.installment_schedule.insert_one(installment)
        log_success(f"Created installment_schedule: {installment_id}")
        
        # Create student_batch_assignments
        batch_assignment_id = str(uuid.uuid4())
        batch_assignment = {
            "id": batch_assignment_id,
            "enrollment_id": enrollment_id,
            "batch_id": str(uuid.uuid4()),
            "assigned_at": datetime.now(timezone.utc).isoformat()
        }
        db.student_batch_assignments.insert_one(batch_assignment)
        log_success(f"Created student_batch_assignments: {batch_assignment_id}")
        
        # Create attendance
        attendance_id = str(uuid.uuid4())
        attendance = {
            "id": attendance_id,
            "enrollment_id": enrollment_id,
            "batch_id": str(uuid.uuid4()),
            "date": "2024-01-20",
            "status": "Present",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        db.attendance.insert_one(attendance)
        log_success(f"Created attendance: {attendance_id}")
        
        # Create addon_courses
        addon_id = str(uuid.uuid4())
        addon = {
            "id": addon_id,
            "enrollment_id": enrollment_id,
            "program_id": str(uuid.uuid4()),
            "program_name": "Test Addon",
            "fee_quoted": 10000,
            "final_fee": 10000,
            "added_at": datetime.now(timezone.utc).isoformat()
        }
        db.addon_courses.insert_one(addon)
        log_success(f"Created addon_courses: {addon_id}")
        
        # Create course_completions
        completion_id = str(uuid.uuid4())
        completion = {
            "id": completion_id,
            "enrollment_id": enrollment_id,
            "exam_status": "Passed",
            "marks_obtained": 85,
            "total_marks": 100,
            "completion_date": "2024-03-01",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        db.course_completions.insert_one(completion)
        log_success(f"Created course_completions: {completion_id}")
        
        return True
    except Exception as e:
        log_error(f"Exception seeding related records: {str(e)}")
        return False

def verify_cascade_delete(enrollment_id: str) -> bool:
    """Verify all related records are deleted"""
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Check payment_plans
        plans = list(db.payment_plans.find({"enrollment_id": enrollment_id}, {"_id": 0}))
        if plans:
            log_error(f"payment_plans still exist: {len(plans)} records")
            return False
        log_success("payment_plans deleted")
        
        # Check installment_schedule (by enrollment_id)
        installments = list(db.installment_schedule.find({"enrollment_id": enrollment_id}, {"_id": 0}))
        if installments:
            log_error(f"installment_schedule still exist: {len(installments)} records")
            return False
        log_success("installment_schedule deleted")
        
        # Check student_batch_assignments
        batch_assignments = list(db.student_batch_assignments.find({"enrollment_id": enrollment_id}, {"_id": 0}))
        if batch_assignments:
            log_error(f"student_batch_assignments still exist: {len(batch_assignments)} records")
            return False
        log_success("student_batch_assignments deleted")
        
        # Check attendance
        attendance = list(db.attendance.find({"enrollment_id": enrollment_id}, {"_id": 0}))
        if attendance:
            log_error(f"attendance still exist: {len(attendance)} records")
            return False
        log_success("attendance deleted")
        
        # Check addon_courses
        addons = list(db.addon_courses.find({"enrollment_id": enrollment_id}, {"_id": 0}))
        if addons:
            log_error(f"addon_courses still exist: {len(addons)} records")
            return False
        log_success("addon_courses deleted")
        
        # Check course_completions
        completions = list(db.course_completions.find({"enrollment_id": enrollment_id}, {"_id": 0}))
        if completions:
            log_error(f"course_completions still exist: {len(completions)} records")
            return False
        log_success("course_completions deleted")
        
        return True
    except Exception as e:
        log_error(f"Exception verifying cascade delete: {str(e)}")
        return False

# ============================================================================
# TEST: Idempotent Delete Bug Fix
# ============================================================================

def test_idempotent_delete():
    print("\n" + "="*80)
    print("TEST: Idempotent Delete Bug Fix - DELETE /api/students/{enrollment_id}/permanent")
    print("="*80)
    
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        log_error("Cannot proceed without admin token")
        return False
    
    # Create test data
    branch1_id = create_branch(admin_token, f"Test Branch 1 {TEST_RUN_ID}")
    if not branch1_id:
        return False
    
    branch2_id = create_branch(admin_token, f"Test Branch 2 {TEST_RUN_ID}")
    if not branch2_id:
        return False
    
    branch_admin1_id, ba1_email = create_user(admin_token, "branchadmin1@test.com", "test123", 
                                   "Branch Admin 1", "Branch Admin", branch1_id)
    if not branch_admin1_id:
        return False
    
    counsellor_id, counsellor_email = create_user(admin_token, "counsellor@test.com", "test123", 
                                   "Counsellor Test", "Counsellor", branch1_id)
    if not counsellor_id:
        return False
    
    program_id = create_program(admin_token, f"Test Program {TEST_RUN_ID}", 50000)
    if not program_id:
        return False
    
    # ========================================================================
    # ASSERTION 1: IDEMPOTENT — non-existent enrollment (fake UUID)
    # ========================================================================
    log_info("\n" + "="*70)
    log_info("ASSERTION 1: IDEMPOTENT — non-existent enrollment (fake UUID)")
    log_info("="*70)
    
    fake_uuid = "00000000-0000-0000-0000-000000000000"
    response = requests.delete(
        f"{BASE_URL}/students/{fake_uuid}/permanent",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"reason": "Test deletion"}
    )
    
    if response.status_code == 200:
        data = response.json()
        if data.get("already_deleted") == True:
            log_success("✓ ASSERTION 1 PASSED: Non-existent enrollment returns 200 with already_deleted: true")
            log_info(f"  Response: {json.dumps(data, indent=2)}")
        else:
            log_error(f"✗ ASSERTION 1 FAILED: Response missing already_deleted flag")
            log_error(f"  Response: {json.dumps(data, indent=2)}")
            return False
    else:
        log_error(f"✗ ASSERTION 1 FAILED: Expected 200, got {response.status_code}")
        log_error(f"  Response: {response.text}")
        return False
    
    # ========================================================================
    # ASSERTION 2: HAPPY PATH — real enrollment with no payments
    # ========================================================================
    log_info("\n" + "="*70)
    log_info("ASSERTION 2: HAPPY PATH — real enrollment with no payments")
    log_info("="*70)
    
    lead_id = create_lead(admin_token, branch1_id, program_id)
    if not lead_id:
        return False
    
    enrollment_id = create_enrollment(admin_token, lead_id, program_id, branch1_id)
    if not enrollment_id:
        return False
    
    response = requests.delete(
        f"{BASE_URL}/students/{enrollment_id}/permanent",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"reason": "Test deletion"}
    )
    
    if response.status_code == 200:
        data = response.json()
        if "already_deleted" not in data or data.get("already_deleted") == False:
            if "permanently deleted" in data.get("message", "").lower():
                log_success("✓ ASSERTION 2 PASSED: Real enrollment deleted successfully with proper message")
                log_info(f"  Response: {json.dumps(data, indent=2)}")
            else:
                log_error(f"✗ ASSERTION 2 FAILED: Message doesn't contain 'permanently deleted'")
                log_error(f"  Response: {json.dumps(data, indent=2)}")
                return False
        else:
            log_error(f"✗ ASSERTION 2 FAILED: Response has already_deleted flag (should not be present)")
            log_error(f"  Response: {json.dumps(data, indent=2)}")
            return False
    else:
        log_error(f"✗ ASSERTION 2 FAILED: Expected 200, got {response.status_code}")
        log_error(f"  Response: {response.text}")
        return False
    
    # ========================================================================
    # ASSERTION 3: REPEATED DELETE — same UUID again (CORE FIX)
    # ========================================================================
    log_info("\n" + "="*70)
    log_info("ASSERTION 3: REPEATED DELETE — same UUID again (CORE FIX)")
    log_info("="*70)
    
    response = requests.delete(
        f"{BASE_URL}/students/{enrollment_id}/permanent",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"reason": "Test deletion"}
    )
    
    if response.status_code == 200:
        data = response.json()
        if data.get("already_deleted") == True:
            log_success("✓ ASSERTION 3 PASSED: Repeated delete returns 200 with already_deleted: true (IDEMPOTENT)")
            log_info(f"  Response: {json.dumps(data, indent=2)}")
        else:
            log_error(f"✗ ASSERTION 3 FAILED: Response missing already_deleted flag")
            log_error(f"  Response: {json.dumps(data, indent=2)}")
            return False
    else:
        log_error(f"✗ ASSERTION 3 FAILED: Expected 200, got {response.status_code}")
        log_error(f"  Response: {response.text}")
        return False
    
    # ========================================================================
    # ASSERTION 4: AUTH ORDER — non-admin, non-existent (expect 403, NOT 200)
    # ========================================================================
    log_info("\n" + "="*70)
    log_info("ASSERTION 4: AUTH ORDER — non-admin, non-existent (expect 403, NOT 200)")
    log_info("="*70)
    
    counsellor_token = login(counsellor_email, "test123")
    if not counsellor_token:
        return False
    
    response = requests.delete(
        f"{BASE_URL}/students/{fake_uuid}/permanent",
        headers={"Authorization": f"Bearer {counsellor_token}"},
        params={"reason": "Test deletion"}
    )
    
    if response.status_code == 403:
        if "Branch Admin" in response.text or "Admin" in response.text:
            log_success("✓ ASSERTION 4 PASSED: Non-admin gets 403 BEFORE idempotent check (auth order correct)")
            log_info(f"  Response: {response.text}")
        else:
            log_error(f"✗ ASSERTION 4 FAILED: 403 but wrong message")
            log_error(f"  Response: {response.text}")
            return False
    else:
        log_error(f"✗ ASSERTION 4 FAILED: Expected 403, got {response.status_code}")
        log_error(f"  Response: {response.text}")
        return False
    
    # ========================================================================
    # ASSERTION 5: PAYMENT GUARD — real enrollment with payment
    # ========================================================================
    log_info("\n" + "="*70)
    log_info("ASSERTION 5: PAYMENT GUARD — real enrollment with payment")
    log_info("="*70)
    
    lead_id2 = create_lead(admin_token, branch1_id, program_id)
    if not lead_id2:
        return False
    
    enrollment_id2 = create_enrollment(admin_token, lead_id2, program_id, branch1_id)
    if not enrollment_id2:
        return False
    
    payment_id = create_payment(admin_token, enrollment_id2, 10000)
    if not payment_id:
        return False
    
    response = requests.delete(
        f"{BASE_URL}/students/{enrollment_id2}/permanent",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"reason": "Test deletion"}
    )
    
    if response.status_code == 400:
        if "already been received" in response.text.lower():
            log_success("✓ ASSERTION 5 PASSED: Deletion blocked when payment exists with proper error message")
            log_info(f"  Response: {response.text}")
        else:
            log_error(f"✗ ASSERTION 5 FAILED: 400 but wrong message")
            log_error(f"  Response: {response.text}")
            return False
    else:
        log_error(f"✗ ASSERTION 5 FAILED: Expected 400, got {response.status_code}")
        log_error(f"  Response: {response.text}")
        return False
    
    # ========================================================================
    # ASSERTION 6: BRANCH GUARD — Branch Admin from another branch
    # ========================================================================
    log_info("\n" + "="*70)
    log_info("ASSERTION 6: BRANCH GUARD — Branch Admin from another branch")
    log_info("="*70)
    
    # Create enrollment in branch2
    lead_id3 = create_lead(admin_token, branch2_id, program_id)
    if not lead_id3:
        return False
    
    enrollment_id3 = create_enrollment(admin_token, lead_id3, program_id, branch2_id)
    if not enrollment_id3:
        return False
    
    # Try to delete as Branch Admin from branch1
    ba1_token = login(ba1_email, "test123")
    if not ba1_token:
        return False
    
    response = requests.delete(
        f"{BASE_URL}/students/{enrollment_id3}/permanent",
        headers={"Authorization": f"Bearer {ba1_token}"},
        params={"reason": "Test deletion"}
    )
    
    if response.status_code == 403:
        if "branch" in response.text.lower():
            log_success("✓ ASSERTION 6 PASSED: Branch Admin cannot delete from another branch (403)")
            log_info(f"  Response: {response.text}")
        else:
            log_error(f"✗ ASSERTION 6 FAILED: 403 but wrong message")
            log_error(f"  Response: {response.text}")
            return False
    else:
        log_error(f"✗ ASSERTION 6 FAILED: Expected 403, got {response.status_code}")
        log_error(f"  Response: {response.text}")
        return False
    
    # ========================================================================
    # ASSERTION 7: CASCADE ON REAL DELETE
    # ========================================================================
    log_info("\n" + "="*70)
    log_info("ASSERTION 7: CASCADE ON REAL DELETE — verify all related collections cleaned up")
    log_info("="*70)
    
    # Create enrollment with related records
    lead_id4 = create_lead(admin_token, branch1_id, program_id)
    if not lead_id4:
        return False
    
    enrollment_id4 = create_enrollment(admin_token, lead_id4, program_id, branch1_id)
    if not enrollment_id4:
        return False
    
    # Seed related records
    if not seed_related_records(enrollment_id4, branch1_id):
        log_error("Failed to seed related records")
        return False
    
    # Delete the enrollment
    response = requests.delete(
        f"{BASE_URL}/students/{enrollment_id4}/permanent",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"reason": "Test cascade"}
    )
    
    if response.status_code == 200:
        log_success("Enrollment deleted successfully")
        
        # Verify cascade delete
        if verify_cascade_delete(enrollment_id4):
            log_success("✓ ASSERTION 7 PASSED: All related records cascade deleted successfully")
        else:
            log_error("✗ ASSERTION 7 FAILED: Some related records still exist")
            return False
    else:
        log_error(f"✗ ASSERTION 7 FAILED: Expected 200, got {response.status_code}")
        log_error(f"  Response: {response.text}")
        return False
    
    log_success("\n" + "="*80)
    log_success("✓ ALL 7 ASSERTIONS PASSED - Idempotent Delete Bug Fix Verified")
    log_success("="*80)
    return True

# ============================================================================
# MAIN
# ============================================================================

def main():
    print("\n" + "="*80)
    print("ETI EDUCOM ERP - IDEMPOTENT DELETE BUG FIX VERIFICATION")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin: {ADMIN_EMAIL}")
    print("="*80)
    
    try:
        success = test_idempotent_delete()
        if success:
            print(f"\n{Colors.GREEN}ALL TESTS PASSED ✓{Colors.RESET}")
            return 0
        else:
            print(f"\n{Colors.RED}TESTS FAILED ✗{Colors.RESET}")
            return 1
    except Exception as e:
        log_error(f"Test exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
