#!/usr/bin/env python3
"""
Backend API Testing for ETI Educom ERP
Tests for Tasks 2, 3, 4, 6 - User deactivation, final_fee persistence, permanent delete, pending payments filter
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://erp-preview-build-4.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@etieducom.com"
ADMIN_PASSWORD = "admin@123"
SESSION = "2026"

# Test results tracking
test_results = []

def log_test(test_name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    test_results.append({
        "test": test_name,
        "passed": passed,
        "details": details
    })
    print(f"{status}: {test_name}")
    if details:
        print(f"   Details: {details}")

def admin_login():
    """Login as admin and return token"""
    print("\n=== Admin Login ===")
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "session": SESSION
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print(f"✅ Admin login successful")
        return token
    else:
        print(f"❌ Admin login failed: {response.status_code} - {response.text}")
        return None

def get_headers(token):
    """Get authorization headers"""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def get_or_create_branch(token):
    """Get first available branch ID or create one"""
    # Try admin/branches endpoint
    response = requests.get(f"{BASE_URL}/admin/branches", headers=get_headers(token))
    if response.status_code == 200:
        branches = response.json()
        if branches and len(branches) > 0:
            print(f"Using existing branch: {branches[0].get('name')}")
            return branches[0]["id"]
    
    # Create a test branch
    print("No branches found. Creating test branch...")
    create_response = requests.post(
        f"{BASE_URL}/admin/branches",
        headers=get_headers(token),
        json={
            "name": "Test Branch",
            "location": "Test Location",
            "address": "123 Test Street",
            "city": "Patiala",
            "state": "Punjab",
            "pincode": "147001",
            "owner_name": "Test Owner",
            "owner_email": "owner@test.com",
            "owner_phone": "9876543210",
            "owner_designation": "Manager",
            "branch_phone": "9876543211",
            "branch_email": "branch@test.com",
            "royalty_percentage": 0.0
        }
    )
    
    if create_response.status_code == 200:
        branch_data = create_response.json()
        print(f"✅ Created test branch: {branch_data.get('id')}")
        return branch_data.get("id")
    else:
        print(f"❌ Failed to create branch: {create_response.status_code} - {create_response.text}")
        return None

def get_branch_id(token):
    """Get first available branch ID"""
    return get_or_create_branch(token)

def get_or_create_program(token):
    """Get first available program ID or create one"""
    response = requests.get(f"{BASE_URL}/programs", headers=get_headers(token))
    if response.status_code == 200:
        programs = response.json()
        if programs and len(programs) > 0:
            print(f"Using existing program: {programs[0].get('name')}")
            return programs[0]["id"]
    
    # Create a test program
    print("No programs found. Creating test program...")
    create_response = requests.post(
        f"{BASE_URL}/admin/programs",
        headers=get_headers(token),
        json={
            "name": "Test Program",
            "duration": "6 months",
            "fee": 50000,
            "max_discount_percent": 20
        }
    )
    
    if create_response.status_code == 200:
        program_data = create_response.json()
        print(f"✅ Created test program: {program_data.get('id')}")
        return program_data.get("id")
    else:
        print(f"❌ Failed to create program: {create_response.status_code} - {create_response.text}")
        return None

def get_program_id(token):
    """Get first available program ID"""
    return get_or_create_program(token)

def test_task_4_inactive_user_login_block(token):
    """
    Task 4: Test inactive user login block
    - Create a test user (Counsellor role)
    - Deactivate the user
    - Attempt login (should return 403)
    - Reactivate the user
    - Attempt login (should return 200)
    """
    print("\n" + "="*80)
    print("TASK 4: INACTIVE USER LOGIN BLOCK")
    print("="*80)
    
    branch_id = get_branch_id(token)
    if not branch_id:
        log_test("Task 4 - Get Branch", False, "No branches available")
        return None
    
    # Create test user
    test_user_email = f"test_counsellor_{datetime.now().timestamp()}@test.com"
    test_user_password = "TestPass123!"
    
    print(f"\n1. Creating test user: {test_user_email}")
    create_response = requests.post(
        f"{BASE_URL}/admin/users",
        headers=get_headers(token),
        json={
            "email": test_user_email,
            "password": test_user_password,
            "name": "Test Counsellor",
            "role": "Counsellor",
            "branch_id": branch_id,
            "phone": "9876543210"
        }
    )
    
    if create_response.status_code != 200:
        log_test("Task 4 - Create User", False, f"Status: {create_response.status_code}, Response: {create_response.text}")
        return None
    
    user_data = create_response.json()
    user_id = user_data.get("id")
    log_test("Task 4 - Create User", True, f"User ID: {user_id}")
    
    # Verify user can login initially
    print(f"\n2. Testing initial login (should succeed)")
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        data={
            "username": test_user_email,
            "password": test_user_password,
            "session": SESSION
        }
    )
    
    if login_response.status_code == 200:
        log_test("Task 4 - Initial Login Success", True, "User can login when active")
    else:
        log_test("Task 4 - Initial Login Success", False, f"Status: {login_response.status_code}")
    
    # Deactivate user
    print(f"\n3. Deactivating user")
    deactivate_response = requests.put(
        f"{BASE_URL}/admin/users/{user_id}/status",
        headers=get_headers(token),
        json={"is_active": False}
    )
    
    if deactivate_response.status_code == 200:
        log_test("Task 4 - Deactivate User", True, "User deactivated successfully")
    else:
        log_test("Task 4 - Deactivate User", False, f"Status: {deactivate_response.status_code}")
    
    # Attempt login as deactivated user (should fail with 403)
    print(f"\n4. Attempting login as deactivated user (should return 403)")
    login_deactivated = requests.post(
        f"{BASE_URL}/auth/login",
        data={
            "username": test_user_email,
            "password": test_user_password,
            "session": SESSION
        }
    )
    
    if login_deactivated.status_code == 403:
        detail = login_deactivated.json().get("detail", "")
        if "deactivated" in detail.lower():
            log_test("Task 4 - Deactivated Login Block", True, f"403 with correct message: {detail}")
        else:
            log_test("Task 4 - Deactivated Login Block", False, f"403 but wrong message: {detail}")
    else:
        log_test("Task 4 - Deactivated Login Block", False, f"Expected 403, got {login_deactivated.status_code}")
    
    # Reactivate user
    print(f"\n5. Reactivating user")
    reactivate_response = requests.put(
        f"{BASE_URL}/admin/users/{user_id}/status",
        headers=get_headers(token),
        json={"is_active": True}
    )
    
    if reactivate_response.status_code == 200:
        log_test("Task 4 - Reactivate User", True, "User reactivated successfully")
    else:
        log_test("Task 4 - Reactivate User", False, f"Status: {reactivate_response.status_code}")
    
    # Attempt login as reactivated user (should succeed)
    print(f"\n6. Attempting login as reactivated user (should succeed)")
    login_reactivated = requests.post(
        f"{BASE_URL}/auth/login",
        data={
            "username": test_user_email,
            "password": test_user_password,
            "session": SESSION
        }
    )
    
    if login_reactivated.status_code == 200:
        log_test("Task 4 - Reactivated Login Success", True, "User can login after reactivation")
    else:
        log_test("Task 4 - Reactivated Login Success", False, f"Status: {login_reactivated.status_code}")
    
    return user_id

def create_test_enrollment(token, branch_id, program_id, student_name="Test Student"):
    """Helper: Create a test enrollment"""
    # First create a lead
    lead_response = requests.post(
        f"{BASE_URL}/leads",
        headers=get_headers(token),
        json={
            "name": student_name,
            "number": f"98765{datetime.now().timestamp():.0f}"[-10:],
            "email": f"student_{datetime.now().timestamp()}@test.com",
            "program_id": program_id,
            "lead_source": "Walk-in",
            "branch_id": branch_id
        }
    )
    
    if lead_response.status_code != 200:
        print(f"Failed to create lead: {lead_response.status_code}")
        return None
    
    lead_data = lead_response.json()
    lead_id = lead_data.get("id")
    
    # Mark lead as Converted (required for enrollment)
    update_lead_response = requests.put(
        f"{BASE_URL}/leads/{lead_id}",
        headers=get_headers(token),
        json={"status": "Converted"}
    )
    
    if update_lead_response.status_code != 200:
        print(f"Failed to mark lead as Converted: {update_lead_response.status_code} - {update_lead_response.text}")
    
    # Create enrollment
    enrollment_response = requests.post(
        f"{BASE_URL}/enrollments",
        headers=get_headers(token),
        json={
            "lead_id": lead_id,
            "student_name": student_name,
            "email": f"student_{datetime.now().timestamp()}@test.com",
            "phone": f"98765{datetime.now().timestamp():.0f}"[-10:],
            "program_id": program_id,
            "fee_quoted": 50000,
            "discount_percent": 10,
            "enrollment_date": datetime.now().strftime("%Y-%m-%d")
        }
    )
    
    if enrollment_response.status_code == 200:
        return enrollment_response.json()
    else:
        print(f"Failed to create enrollment: {enrollment_response.status_code} - {enrollment_response.text}")
        return None

def test_task_3_final_fee_persistence(token):
    """
    Task 3: Test final_fee persistence fix
    - Create enrollment with original final_fee
    - Update with only final_fee (should persist)
    - Update with final_fee + fee_quoted together (final_fee should win)
    - Update with only discount_percent (should recalculate final_fee)
    """
    print("\n" + "="*80)
    print("TASK 3: FINAL FEE PERSISTENCE FIX")
    print("="*80)
    
    branch_id = get_branch_id(token)
    program_id = get_program_id(token)
    
    if not branch_id or not program_id:
        log_test("Task 3 - Prerequisites", False, "Missing branch or program")
        return
    
    # Create test enrollment
    print("\n1. Creating test enrollment with fee_quoted=50000, discount=10%")
    enrollment = create_test_enrollment(token, branch_id, program_id, "Final Fee Test Student")
    
    if not enrollment:
        log_test("Task 3 - Create Enrollment", False, "Failed to create enrollment")
        return
    
    enrollment_id = enrollment.get("id")
    original_final_fee = enrollment.get("final_fee", 0)
    log_test("Task 3 - Create Enrollment", True, f"Enrollment ID: {enrollment_id}, Original final_fee: {original_final_fee}")
    
    # Test 1: Update only final_fee (should persist, not recalculate)
    print("\n2. Updating only final_fee to 40000 (should persist)")
    update_response = requests.put(
        f"{BASE_URL}/students/{enrollment_id}/update",
        headers=get_headers(token),
        json={"final_fee": 40000}
    )
    
    if update_response.status_code != 200:
        log_test("Task 3 - Update final_fee only", False, f"Status: {update_response.status_code}")
    else:
        # Fetch enrollment to verify
        get_response = requests.get(
            f"{BASE_URL}/students/{enrollment_id}",
            headers=get_headers(token)
        )
        
        if get_response.status_code == 200:
            response_data = get_response.json()
            # The response has nested structure: {"enrollment": {...}, ...}
            updated_enrollment = response_data.get("enrollment", response_data)
            final_fee = updated_enrollment.get("final_fee", 0)
            
            if final_fee == 40000:
                log_test("Task 3 - Update final_fee only", True, f"final_fee persisted correctly: {final_fee}")
            else:
                log_test("Task 3 - Update final_fee only", False, f"Expected 40000, got {final_fee}")
        else:
            log_test("Task 3 - Update final_fee only", False, "Failed to fetch updated enrollment")
    
    # Test 2: Update final_fee + fee_quoted together (explicit final_fee should win)
    print("\n3. Updating final_fee=42000 + fee_quoted=50000 together (final_fee should win)")
    update_response2 = requests.put(
        f"{BASE_URL}/students/{enrollment_id}/update",
        headers=get_headers(token),
        json={
            "final_fee": 42000,
            "fee_quoted": 50000
        }
    )
    
    if update_response2.status_code != 200:
        log_test("Task 3 - Update final_fee + fee_quoted", False, f"Status: {update_response2.status_code}")
    else:
        get_response2 = requests.get(
            f"{BASE_URL}/students/{enrollment_id}",
            headers=get_headers(token)
        )
        
        if get_response2.status_code == 200:
            response_data2 = get_response2.json()
            updated_enrollment2 = response_data2.get("enrollment", response_data2)
            final_fee2 = updated_enrollment2.get("final_fee", 0)
            
            if final_fee2 == 42000:
                log_test("Task 3 - Update final_fee + fee_quoted", True, f"Explicit final_fee preserved: {final_fee2}")
            else:
                log_test("Task 3 - Update final_fee + fee_quoted", False, f"Expected 42000, got {final_fee2}")
        else:
            log_test("Task 3 - Update final_fee + fee_quoted", False, "Failed to fetch updated enrollment")
    
    # Test 3: Update only discount_percent (should recalculate)
    print("\n4. Updating only discount_percent=20 (should recalculate final_fee)")
    update_response3 = requests.put(
        f"{BASE_URL}/students/{enrollment_id}/update",
        headers=get_headers(token),
        json={"discount_percent": 20}
    )
    
    if update_response3.status_code != 200:
        log_test("Task 3 - Update discount_percent only", False, f"Status: {update_response3.status_code}")
    else:
        get_response3 = requests.get(
            f"{BASE_URL}/students/{enrollment_id}",
            headers=get_headers(token)
        )
        
        if get_response3.status_code == 200:
            response_data3 = get_response3.json()
            updated_enrollment3 = response_data3.get("enrollment", response_data3)
            final_fee3 = updated_enrollment3.get("final_fee", 0)
            fee_quoted3 = updated_enrollment3.get("fee_quoted", 0)
            expected_final_fee = fee_quoted3 * 0.8  # 20% discount
            
            if abs(final_fee3 - expected_final_fee) < 1:  # Allow small floating point difference
                log_test("Task 3 - Update discount_percent only", True, f"final_fee recalculated correctly: {final_fee3}")
            else:
                log_test("Task 3 - Update discount_percent only", False, f"Expected {expected_final_fee}, got {final_fee3}")
        else:
            log_test("Task 3 - Update discount_percent only", False, "Failed to fetch updated enrollment")

def test_task_2_permanent_delete(token):
    """
    Task 2: Test permanent delete of dropped student
    - Create enrollment, mark as Dropped, delete with 0 payments (should succeed)
    - Try to delete Active enrollment (should fail with 400)
    - Create enrollment, mark as Dropped, add payment, try to delete (should fail with 400)
    """
    print("\n" + "="*80)
    print("TASK 2: PERMANENT DELETE OF DROPPED STUDENT")
    print("="*80)
    
    branch_id = get_branch_id(token)
    program_id = get_program_id(token)
    
    if not branch_id or not program_id:
        log_test("Task 2 - Prerequisites", False, "Missing branch or program")
        return
    
    # Test 1: Delete Dropped student with 0 payments (should succeed)
    print("\n1. Creating enrollment, marking as Dropped, deleting (should succeed)")
    enrollment1 = create_test_enrollment(token, branch_id, program_id, "Delete Test Student 1")
    
    if not enrollment1:
        log_test("Task 2 - Create Enrollment 1", False, "Failed to create enrollment")
        return
    
    enrollment_id1 = enrollment1.get("id")
    log_test("Task 2 - Create Enrollment 1", True, f"Enrollment ID: {enrollment_id1}")
    
    # Mark as Dropped
    status_response = requests.put(
        f"{BASE_URL}/students/{enrollment_id1}/status",
        headers=get_headers(token),
        params={"status": "Dropped", "reason": "Test deletion"}
    )
    
    if status_response.status_code == 200:
        log_test("Task 2 - Mark as Dropped", True, "Status updated to Dropped")
    else:
        log_test("Task 2 - Mark as Dropped", False, f"Status: {status_response.status_code}")
    
    # Delete permanently
    delete_response = requests.delete(
        f"{BASE_URL}/students/{enrollment_id1}/permanent",
        headers=get_headers(token),
        params={"reason": "Duplicate"}
    )
    
    if delete_response.status_code == 200:
        log_test("Task 2 - Delete Dropped (0 payments)", True, "Deletion successful")
        
        # Verify deletion - should return 404
        get_response = requests.get(
            f"{BASE_URL}/students/{enrollment_id1}",
            headers=get_headers(token)
        )
        
        if get_response.status_code == 404:
            log_test("Task 2 - Verify Deletion", True, "Student not found after deletion (404)")
        else:
            log_test("Task 2 - Verify Deletion", False, f"Expected 404, got {get_response.status_code}")
    else:
        log_test("Task 2 - Delete Dropped (0 payments)", False, f"Status: {delete_response.status_code}, Response: {delete_response.text}")
    
    # Test 2: Try to delete Active enrollment (should fail)
    print("\n2. Creating Active enrollment and trying to delete (should fail with 400)")
    enrollment2 = create_test_enrollment(token, branch_id, program_id, "Delete Test Student 2")
    
    if not enrollment2:
        log_test("Task 2 - Create Enrollment 2", False, "Failed to create enrollment")
        return
    
    enrollment_id2 = enrollment2.get("id")
    log_test("Task 2 - Create Enrollment 2", True, f"Enrollment ID: {enrollment_id2}")
    
    # Try to delete Active enrollment
    delete_active_response = requests.delete(
        f"{BASE_URL}/students/{enrollment_id2}/permanent",
        headers=get_headers(token),
        params={"reason": "Test"}
    )
    
    if delete_active_response.status_code == 400:
        detail = delete_active_response.json().get("detail", "")
        if "Dropped" in detail or "Cancelled" in detail or "Inactive" in detail:
            log_test("Task 2 - Delete Active (guard)", True, f"400 with correct message: {detail}")
        else:
            log_test("Task 2 - Delete Active (guard)", False, f"400 but wrong message: {detail}")
    else:
        log_test("Task 2 - Delete Active (guard)", False, f"Expected 400, got {delete_active_response.status_code}")
    
    # Test 3: Delete Dropped student with payments (should fail)
    print("\n3. Creating enrollment, marking as Dropped, adding payment, trying to delete (should fail)")
    enrollment3 = create_test_enrollment(token, branch_id, program_id, "Delete Test Student 3")
    
    if not enrollment3:
        log_test("Task 2 - Create Enrollment 3", False, "Failed to create enrollment")
        return
    
    enrollment_id3 = enrollment3.get("id")
    log_test("Task 2 - Create Enrollment 3", True, f"Enrollment ID: {enrollment_id3}")
    
    # Mark as Dropped
    status_response3 = requests.put(
        f"{BASE_URL}/students/{enrollment_id3}/status",
        headers=get_headers(token),
        params={"status": "Dropped", "reason": "Test"}
    )
    
    if status_response3.status_code == 200:
        log_test("Task 2 - Mark Enrollment 3 as Dropped", True, "Status updated")
    else:
        log_test("Task 2 - Mark Enrollment 3 as Dropped", False, f"Status: {status_response3.status_code}")
    
    # Add a payment
    payment_response = requests.post(
        f"{BASE_URL}/payments",
        headers=get_headers(token),
        json={
            "enrollment_id": enrollment_id3,
            "amount": 5000,
            "payment_mode": "Cash",
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "remarks": "Test payment"
        }
    )
    
    if payment_response.status_code == 200:
        log_test("Task 2 - Add Payment", True, "Payment added")
    else:
        log_test("Task 2 - Add Payment", False, f"Status: {payment_response.status_code}")
    
    # Try to delete (should fail)
    delete_with_payment = requests.delete(
        f"{BASE_URL}/students/{enrollment_id3}/permanent",
        headers=get_headers(token),
        params={"reason": "Test"}
    )
    
    if delete_with_payment.status_code == 400:
        detail = delete_with_payment.json().get("detail", "")
        if "received" in detail.lower() or "payment" in detail.lower():
            log_test("Task 2 - Delete with Payment (guard)", True, f"400 with correct message: {detail}")
        else:
            log_test("Task 2 - Delete with Payment (guard)", False, f"400 but wrong message: {detail}")
    else:
        log_test("Task 2 - Delete with Payment (guard)", False, f"Expected 400, got {delete_with_payment.status_code}")

def test_task_6_pending_payments_filter(token):
    """
    Task 6: Test pending payments excludes Dropped/Cancelled/Inactive
    - Create Active enrollment with unpaid fee (should appear in pending)
    - Mark as Dropped (should NOT appear in pending)
    - Test same for Cancelled and Inactive
    """
    print("\n" + "="*80)
    print("TASK 6: PENDING PAYMENTS EXCLUDES DROPPED/CANCELLED/INACTIVE")
    print("="*80)
    
    branch_id = get_branch_id(token)
    program_id = get_program_id(token)
    
    if not branch_id or not program_id:
        log_test("Task 6 - Prerequisites", False, "Missing branch or program")
        return
    
    # Create Active enrollment with unpaid fee
    print("\n1. Creating Active enrollment with unpaid fee")
    enrollment = create_test_enrollment(token, branch_id, program_id, "Pending Payment Test Student")
    
    if not enrollment:
        log_test("Task 6 - Create Enrollment", False, "Failed to create enrollment")
        return
    
    enrollment_id = enrollment.get("id")
    enrollment_number = enrollment.get("enrollment_id")
    log_test("Task 6 - Create Enrollment", True, f"Enrollment: {enrollment_number}")
    
    # Check pending payments (should include this enrollment)
    print("\n2. Checking pending payments (should include Active enrollment)")
    pending_response = requests.get(
        f"{BASE_URL}/payments/pending",
        headers=get_headers(token)
    )
    
    if pending_response.status_code == 200:
        pending_list = pending_response.json()
        found = any(p.get("enrollment_id") == enrollment_id for p in pending_list)
        
        if found:
            log_test("Task 6 - Active in Pending", True, "Active enrollment appears in pending payments")
        else:
            log_test("Task 6 - Active in Pending", False, "Active enrollment NOT found in pending payments")
    else:
        log_test("Task 6 - Active in Pending", False, f"Status: {pending_response.status_code}")
    
    # Mark as Dropped
    print("\n3. Marking enrollment as Dropped")
    status_response = requests.put(
        f"{BASE_URL}/students/{enrollment_id}/status",
        headers=get_headers(token),
        params={"status": "Dropped", "reason": "Test"}
    )
    
    if status_response.status_code == 200:
        log_test("Task 6 - Mark as Dropped", True, "Status updated to Dropped")
    else:
        log_test("Task 6 - Mark as Dropped", False, f"Status: {status_response.status_code}")
    
    # Check pending payments again (should NOT include this enrollment)
    print("\n4. Checking pending payments (should NOT include Dropped enrollment)")
    pending_response2 = requests.get(
        f"{BASE_URL}/payments/pending",
        headers=get_headers(token)
    )
    
    if pending_response2.status_code == 200:
        pending_list2 = pending_response2.json()
        found2 = any(p.get("enrollment_id") == enrollment_id for p in pending_list2)
        
        if not found2:
            log_test("Task 6 - Dropped NOT in Pending", True, "Dropped enrollment correctly excluded from pending")
        else:
            log_test("Task 6 - Dropped NOT in Pending", False, "Dropped enrollment still appears in pending (BUG)")
    else:
        log_test("Task 6 - Dropped NOT in Pending", False, f"Status: {pending_response2.status_code}")
    
    # Test Cancelled status
    print("\n5. Testing Cancelled status")
    enrollment_cancelled = create_test_enrollment(token, branch_id, program_id, "Cancelled Test Student")
    if enrollment_cancelled:
        enrollment_id_cancelled = enrollment_cancelled.get("id")
        
        # Mark as Cancelled
        requests.put(
            f"{BASE_URL}/students/{enrollment_id_cancelled}/status",
            headers=get_headers(token),
            params={"status": "Cancelled", "reason": "Test"}
        )
        
        # Check pending
        pending_response3 = requests.get(
            f"{BASE_URL}/payments/pending",
            headers=get_headers(token)
        )
        
        if pending_response3.status_code == 200:
            pending_list3 = pending_response3.json()
            found3 = any(p.get("enrollment_id") == enrollment_id_cancelled for p in pending_list3)
            
            if not found3:
                log_test("Task 6 - Cancelled NOT in Pending", True, "Cancelled enrollment correctly excluded")
            else:
                log_test("Task 6 - Cancelled NOT in Pending", False, "Cancelled enrollment still in pending")
    
    # Test Inactive status
    print("\n6. Testing Inactive status")
    enrollment_inactive = create_test_enrollment(token, branch_id, program_id, "Inactive Test Student")
    if enrollment_inactive:
        enrollment_id_inactive = enrollment_inactive.get("id")
        
        # Mark as Inactive
        requests.put(
            f"{BASE_URL}/students/{enrollment_id_inactive}/status",
            headers=get_headers(token),
            params={"status": "Inactive", "reason": "Test"}
        )
        
        # Check pending
        pending_response4 = requests.get(
            f"{BASE_URL}/payments/pending",
            headers=get_headers(token)
        )
        
        if pending_response4.status_code == 200:
            pending_list4 = pending_response4.json()
            found4 = any(p.get("enrollment_id") == enrollment_id_inactive for p in pending_list4)
            
            if not found4:
                log_test("Task 6 - Inactive NOT in Pending", True, "Inactive enrollment correctly excluded")
            else:
                log_test("Task 6 - Inactive NOT in Pending", False, "Inactive enrollment still in pending")

def test_existing_endpoints(token):
    """
    Test 5: Verify existing endpoints still work
    """
    print("\n" + "="*80)
    print("TEST 5: EXISTING ENDPOINTS HEALTH CHECK")
    print("="*80)
    
    # Test GET /api/payments/all
    print("\n1. Testing GET /api/payments/all")
    payments_response = requests.get(
        f"{BASE_URL}/payments/all",
        headers=get_headers(token)
    )
    
    if payments_response.status_code == 200:
        log_test("Test 5 - GET /api/payments/all", True, f"Status: 200, returned list")
    else:
        log_test("Test 5 - GET /api/payments/all", False, f"Status: {payments_response.status_code}")
    
    # Test GET /api/students with status filter
    print("\n2. Testing GET /api/students?status=Dropped")
    students_response = requests.get(
        f"{BASE_URL}/students",
        headers=get_headers(token),
        params={"status": "Dropped"}
    )
    
    if students_response.status_code == 200:
        log_test("Test 5 - GET /api/students (Dropped)", True, f"Status: 200, returned list")
    else:
        log_test("Test 5 - GET /api/students (Dropped)", False, f"Status: {students_response.status_code}")
    
    # Test GET /api/students (all)
    print("\n3. Testing GET /api/students (all)")
    all_students_response = requests.get(
        f"{BASE_URL}/students",
        headers=get_headers(token)
    )
    
    if all_students_response.status_code == 200:
        log_test("Test 5 - GET /api/students (all)", True, f"Status: 200, returned list")
    else:
        log_test("Test 5 - GET /api/students (all)", False, f"Status: {all_students_response.status_code}")

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for t in test_results if t["passed"])
    failed = sum(1 for t in test_results if not t["passed"])
    total = len(test_results)
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {failed} ❌")
    print(f"Success Rate: {(passed/total*100):.1f}%\n")
    
    if failed > 0:
        print("Failed Tests:")
        for t in test_results:
            if not t["passed"]:
                print(f"  ❌ {t['test']}")
                if t["details"]:
                    print(f"     {t['details']}")
    
    return failed == 0

def main():
    """Main test execution"""
    print("="*80)
    print("ETI EDUCOM ERP - BACKEND API TESTING")
    print("Testing Tasks 2, 3, 4, 6")
    print("="*80)
    
    # Login as admin
    token = admin_login()
    if not token:
        print("❌ Failed to login as admin. Exiting.")
        sys.exit(1)
    
    # Run all tests
    try:
        test_task_4_inactive_user_login_block(token)
        test_task_3_final_fee_persistence(token)
        test_task_2_permanent_delete(token)
        test_task_6_pending_payments_filter(token)
        test_existing_endpoints(token)
    except Exception as e:
        print(f"\n❌ Test execution error: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # Print summary
    all_passed = print_summary()
    
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
