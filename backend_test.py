#!/usr/bin/env python3
"""
Multi-Program Certificate Flow Test
Tests GET /api/public/enrollment/{enrollment_number} endpoint
and the complete certificate request flow for students with multiple enrollments.
"""

import requests
import json
import uuid
from datetime import datetime, timezone
import os
import sys
from dotenv import load_dotenv

# Load environment variables from backend/.env
load_dotenv('/app/backend/.env')

# Base URL from frontend/.env
BASE_URL = "https://erp-preview-18.preview.emergentagent.com/api"

# Admin credentials
ADMIN_EMAIL = "admin@etieducom.com"
ADMIN_PASSWORD = "admin@123"

# Test data
TEST_PHONE = "9990001111"
TEST_STUDENT_NAME = "Multi Program Test Student"
TEST_EMAIL = "multiprogram@test.com"

def log(message):
    """Print with timestamp"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

def login_admin():
    """Login as admin and return token"""
    log("Logging in as admin...")
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
    )
    if response.status_code != 200:
        log(f"❌ Login failed: {response.status_code} - {response.text}")
        sys.exit(1)
    
    token = response.json()["access_token"]
    log(f"✓ Login successful")
    return token

def create_branch(token):
    """Create a test branch"""
    log("Creating test branch...")
    branch_data = {
        "name": f"Test Branch Multi Program {uuid.uuid4().hex[:8]}",
        "location": "Test Location",
        "address": "Test Address",
        "city": "Test City",
        "state": "Test State",
        "pincode": "123456",
        "owner_name": "Test Owner",
        "owner_email": "owner@test.com",
        "owner_phone": "9999999999",
        "owner_designation": "Owner",
        "branch_phone": "9999999999",
        "branch_email": "branch@test.com",
        "royalty_percentage": 0.0
    }
    
    response = requests.post(
        f"{BASE_URL}/admin/branches",
        headers={"Authorization": f"Bearer {token}"},
        json=branch_data
    )
    
    if response.status_code != 200:
        log(f"❌ Branch creation failed: {response.status_code} - {response.text}")
        sys.exit(1)
    
    branch_id = response.json()["id"]
    log(f"✓ Branch created: {branch_id}")
    return branch_id

def create_program(token, branch_id, program_name):
    """Create a test program"""
    log(f"Creating program: {program_name}...")
    program_data = {
        "name": program_name,
        "duration": "3 Months",
        "fee": 10000,
        "max_discount_percent": 10.0
    }
    
    response = requests.post(
        f"{BASE_URL}/admin/programs",
        headers={"Authorization": f"Bearer {token}"},
        json=program_data
    )
    
    if response.status_code != 200:
        log(f"❌ Program creation failed: {response.status_code} - {response.text}")
        sys.exit(1)
    
    program_id = response.json()["id"]
    log(f"✓ Program created: {program_id}")
    return program_id

def seed_enrollment_mongo(enrollment_id, branch_id, program_id, program_name, final_fee=10000, total_paid=10000):
    """Seed enrollment directly via MongoDB"""
    import pymongo
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'eti_educom')
    
    client = pymongo.MongoClient(mongo_url)
    db = client[db_name]
    
    enrollment_uuid = str(uuid.uuid4())
    enrollment_doc = {
        "id": enrollment_uuid,
        "enrollment_id": enrollment_id,
        "branch_id": branch_id,
        "program_id": program_id,
        "program_name": program_name,
        "student_name": TEST_STUDENT_NAME,
        "phone": TEST_PHONE,
        "student_phone": TEST_PHONE,
        "email": TEST_EMAIL,
        "final_fee": final_fee,
        "total_paid": total_paid,
        "status": "Active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "enrollment_date": datetime.now(timezone.utc).isoformat()
    }
    
    db.enrollments.insert_one(enrollment_doc)
    
    # Also seed course_completions with Passed status
    completion_doc = {
        "id": str(uuid.uuid4()),
        "enrollment_id": enrollment_uuid,
        "exam_status": "Passed",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.course_completions.insert_one(completion_doc)
    
    log(f"✓ Seeded enrollment {enrollment_id} with UUID {enrollment_uuid}")
    return enrollment_uuid

def cleanup_mongo(enrollment_ids):
    """Clean up test data from MongoDB"""
    import pymongo
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'eti_educom')
    
    client = pymongo.MongoClient(mongo_url)
    db = client[db_name]
    
    # Delete enrollments
    result = db.enrollments.delete_many({"enrollment_id": {"$in": enrollment_ids}})
    log(f"✓ Cleaned up {result.deleted_count} enrollments")
    
    # Delete course_completions
    enrollments = list(db.enrollments.find({"enrollment_id": {"$in": enrollment_ids}}, {"id": 1}))
    enrollment_uuids = [e["id"] for e in enrollments]
    result = db.course_completions.delete_many({"enrollment_id": {"$in": enrollment_uuids}})
    log(f"✓ Cleaned up {result.deleted_count} course completions")
    
    # Delete certificate requests
    result = db.certificate_requests.delete_many({"enrollment_number": {"$in": enrollment_ids}})
    log(f"✓ Cleaned up {result.deleted_count} certificate requests")

def test_multi_program_flow():
    """Main test function"""
    log("=" * 80)
    log("MULTI-PROGRAM CERTIFICATE FLOW TEST")
    log("=" * 80)
    
    token = login_admin()
    
    # Create branch and programs
    branch_id = create_branch(token)
    program1_id = create_program(token, branch_id, "Tally Prime with GST")
    program2_id = create_program(token, branch_id, "Advanced Excel")
    
    # Seed two enrollments for the same student
    enrollment1_id = "AUTOSEED0001"
    enrollment2_id = "AUTOSEED0002"
    
    log("\n" + "=" * 80)
    log("ASSERTION 1: SEED - One student, two programs")
    log("=" * 80)
    
    enrollment1_uuid = seed_enrollment_mongo(enrollment1_id, branch_id, program1_id, "Tally Prime with GST")
    enrollment2_uuid = seed_enrollment_mongo(enrollment2_id, branch_id, program2_id, "Advanced Excel")
    
    log(f"✓ Created two enrollments for {TEST_STUDENT_NAME} (phone: {TEST_PHONE})")
    log(f"  - {enrollment1_id}: Tally Prime with GST")
    log(f"  - {enrollment2_id}: Advanced Excel")
    
    # ASSERTION 2: GET /api/public/enrollment/{enrollment_number}
    log("\n" + "=" * 80)
    log("ASSERTION 2: GET /api/public/enrollment/AUTOSEED0001")
    log("=" * 80)
    
    response = requests.get(f"{BASE_URL}/public/enrollment/{enrollment1_id}")
    
    if response.status_code != 200:
        log(f"❌ FAIL: Expected 200, got {response.status_code}")
        log(f"Response: {response.text}")
        cleanup_mongo([enrollment1_id, enrollment2_id])
        return False
    
    data = response.json()
    log(f"✓ Response: {json.dumps(data, indent=2)}")
    
    # Verify response structure
    if "courses" not in data:
        log(f"❌ FAIL: Response missing 'courses' field")
        cleanup_mongo([enrollment1_id, enrollment2_id])
        return False
    
    if len(data["courses"]) != 2:
        log(f"❌ FAIL: Expected 2 courses, got {len(data['courses'])}")
        log(f"Courses: {json.dumps(data['courses'], indent=2)}")
        cleanup_mongo([enrollment1_id, enrollment2_id])
        return False
    
    log(f"✓ PASS: Response contains 2 courses")
    
    # Verify both courses have fee_cleared=true and course_completed=true
    for course in data["courses"]:
        if not course.get("fee_cleared"):
            log(f"❌ FAIL: Course {course['enrollment_id']} has fee_cleared={course.get('fee_cleared')}")
            cleanup_mongo([enrollment1_id, enrollment2_id])
            return False
        if not course.get("course_completed"):
            log(f"❌ FAIL: Course {course['enrollment_id']} has course_completed={course.get('course_completed')}")
            cleanup_mongo([enrollment1_id, enrollment2_id])
            return False
    
    log(f"✓ PASS: Both courses have fee_cleared=true and course_completed=true")
    
    # Verify distinct enrollment_ids and program_names
    enrollment_ids = [c["enrollment_id"] for c in data["courses"]]
    program_names = [c["program_name"] for c in data["courses"]]
    
    if enrollment1_id not in enrollment_ids or enrollment2_id not in enrollment_ids:
        log(f"❌ FAIL: Expected enrollment_ids {enrollment1_id} and {enrollment2_id}, got {enrollment_ids}")
        cleanup_mongo([enrollment1_id, enrollment2_id])
        return False
    
    log(f"✓ PASS: Both enrollment_ids present: {enrollment_ids}")
    log(f"✓ PASS: Program names: {program_names}")
    
    # ASSERTION 3: POST certificate requests for both enrollments
    log("\n" + "=" * 80)
    log("ASSERTION 3: POST certificate requests for both enrollments")
    log("=" * 80)
    
    cert_ids = []
    
    for enroll_id in [enrollment1_id, enrollment2_id]:
        cert_data = {
            "enrollment_number": enroll_id,
            "email": TEST_EMAIL,
            "phone": TEST_PHONE,
            "program_start_date": "2024-01-01",
            "program_end_date": "2024-03-31",
            "training_mode": "Online",
            "training_hours": 120
        }
        
        response = requests.post(
            f"{BASE_URL}/public/certificate-requests",
            json=cert_data
        )
        
        if response.status_code != 200:
            log(f"❌ FAIL: Certificate request for {enroll_id} failed: {response.status_code} - {response.text}")
            cleanup_mongo([enrollment1_id, enrollment2_id])
            return False
        
        result = response.json()
        cert_ids.append(result["certificate_id"])
        log(f"✓ PASS: Certificate request created for {enroll_id}: {result['certificate_id']}")
    
    if len(set(cert_ids)) != 2:
        log(f"❌ FAIL: Certificate IDs are not distinct: {cert_ids}")
        cleanup_mongo([enrollment1_id, enrollment2_id])
        return False
    
    log(f"✓ PASS: Both certificate requests have distinct certificate_ids: {cert_ids}")
    
    # ASSERTION 4: Repeat one request (should still work)
    log("\n" + "=" * 80)
    log("ASSERTION 4: Repeat certificate request for AUTOSEED0001")
    log("=" * 80)
    
    cert_data = {
        "enrollment_number": enrollment1_id,
        "email": TEST_EMAIL,
        "phone": TEST_PHONE,
        "program_start_date": "2024-01-01",
        "program_end_date": "2024-03-31",
        "training_mode": "Online",
        "training_hours": 120
    }
    
    response = requests.post(
        f"{BASE_URL}/public/certificate-requests",
        json=cert_data
    )
    
    if response.status_code != 200:
        log(f"❌ FAIL: Repeat certificate request failed: {response.status_code} - {response.text}")
        cleanup_mongo([enrollment1_id, enrollment2_id])
        return False
    
    result = response.json()
    third_cert_id = result["certificate_id"]
    
    if third_cert_id in cert_ids:
        log(f"❌ FAIL: Third certificate ID is not distinct: {third_cert_id} (already in {cert_ids})")
        cleanup_mongo([enrollment1_id, enrollment2_id])
        return False
    
    log(f"✓ PASS: Third certificate request created with distinct certificate_id: {third_cert_id}")
    
    # Get all certificate request IDs for approval
    log("\n" + "=" * 80)
    log("Getting certificate request IDs for approval...")
    log("=" * 80)
    
    response = requests.get(
        f"{BASE_URL}/certificate-requests",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code != 200:
        log(f"❌ FAIL: Failed to get certificate requests: {response.status_code} - {response.text}")
        cleanup_mongo([enrollment1_id, enrollment2_id])
        return False
    
    all_certs = response.json()
    test_certs = [c for c in all_certs if c["enrollment_number"] in [enrollment1_id, enrollment2_id]]
    
    if len(test_certs) < 2:
        log(f"❌ FAIL: Expected at least 2 certificate requests, got {len(test_certs)}")
        cleanup_mongo([enrollment1_id, enrollment2_id])
        return False
    
    log(f"✓ Found {len(test_certs)} certificate requests for our test enrollments")
    
    # ASSERTION 5: Approve both requests (first two)
    log("\n" + "=" * 80)
    log("ASSERTION 5: Approve both certificate requests")
    log("=" * 80)
    
    approved_cert_ids = []
    
    for cert in test_certs[:2]:  # Approve first two
        response = requests.post(
            f"{BASE_URL}/certificate-requests/{cert['id']}/approve",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code != 200:
            log(f"❌ FAIL: Approval failed for {cert['certificate_id']}: {response.status_code} - {response.text}")
            cleanup_mongo([enrollment1_id, enrollment2_id])
            return False
        
        approved_cert_ids.append(cert['id'])
        log(f"✓ PASS: Approved certificate {cert['certificate_id']}")
    
    # ASSERTION 6: Download both certificates
    log("\n" + "=" * 80)
    log("ASSERTION 6: Download both certificates and verify program_name")
    log("=" * 80)
    
    for cert_id in approved_cert_ids:
        response = requests.post(
            f"{BASE_URL}/certificate-requests/{cert_id}/download",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code != 200:
            log(f"❌ FAIL: Download failed for {cert_id}: {response.status_code} - {response.text}")
            cleanup_mongo([enrollment1_id, enrollment2_id])
            return False
        
        cert_data = response.json()
        log(f"✓ PASS: Downloaded certificate {cert_data['certificate_id']}")
        log(f"  - Program: {cert_data['program_name']}")
        log(f"  - Registration: {cert_data['registration_number']}")
        log(f"  - Verification: {cert_data['verification_id']}")
        
        # Verify program_name matches one of our programs
        if cert_data['program_name'] not in ["Tally Prime with GST", "Advanced Excel"]:
            log(f"❌ FAIL: Unexpected program_name: {cert_data['program_name']}")
            cleanup_mongo([enrollment1_id, enrollment2_id])
            return False
    
    log(f"✓ PASS: Both certificates downloaded with correct program_name")
    
    # ASSERTION 7: Mark one as printed
    log("\n" + "=" * 80)
    log("ASSERTION 7: Mark one certificate as printed")
    log("=" * 80)
    
    response = requests.post(
        f"{BASE_URL}/certificate-requests/{approved_cert_ids[0]}/mark-printed",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code != 200:
        log(f"❌ FAIL: Mark-printed failed: {response.status_code} - {response.text}")
        cleanup_mongo([enrollment1_id, enrollment2_id])
        return False
    
    result = response.json()
    log(f"✓ PASS: Certificate marked as printed: {result['status']}")
    
    # ASSERTION 8: Fee-not-cleared negative test
    log("\n" + "=" * 80)
    log("ASSERTION 8: Fee-not-cleared negative test")
    log("=" * 80)
    
    # Update enrollment2 to have pending fee
    import pymongo
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'eti_educom')
    client = pymongo.MongoClient(mongo_url)
    db = client[db_name]
    
    db.enrollments.update_one(
        {"enrollment_id": enrollment2_id},
        {"$set": {"total_paid": 5000}}  # Reduce total_paid so pending_fee > 0
    )
    log(f"✓ Updated {enrollment2_id} to have pending fee (total_paid=5000, final_fee=10000)")
    
    # Verify GET endpoint shows fee_cleared=false
    response = requests.get(f"{BASE_URL}/public/enrollment/{enrollment1_id}")
    
    if response.status_code != 200:
        log(f"❌ FAIL: GET enrollment failed: {response.status_code} - {response.text}")
        cleanup_mongo([enrollment1_id, enrollment2_id])
        return False
    
    data = response.json()
    course2 = [c for c in data["courses"] if c["enrollment_id"] == enrollment2_id][0]
    
    if course2.get("fee_cleared"):
        log(f"❌ FAIL: Expected fee_cleared=false for {enrollment2_id}, got {course2.get('fee_cleared')}")
        cleanup_mongo([enrollment1_id, enrollment2_id])
        return False
    
    if course2.get("pending_fee") <= 0:
        log(f"❌ FAIL: Expected pending_fee > 0 for {enrollment2_id}, got {course2.get('pending_fee')}")
        cleanup_mongo([enrollment1_id, enrollment2_id])
        return False
    
    log(f"✓ PASS: GET endpoint shows fee_cleared=false and pending_fee={course2.get('pending_fee')} for {enrollment2_id}")
    
    # Try to create certificate request for enrollment2 (should fail)
    cert_data = {
        "enrollment_number": enrollment2_id,
        "email": TEST_EMAIL,
        "phone": TEST_PHONE,
        "program_start_date": "2024-01-01",
        "program_end_date": "2024-03-31",
        "training_mode": "Online",
        "training_hours": 120
    }
    
    response = requests.post(
        f"{BASE_URL}/public/certificate-requests",
        json=cert_data
    )
    
    if response.status_code != 400:
        log(f"❌ FAIL: Expected 400 for unpaid fees, got {response.status_code}")
        log(f"Response: {response.text}")
        cleanup_mongo([enrollment1_id, enrollment2_id])
        return False
    
    error_msg = response.json().get("detail", "")
    if "fee" not in error_msg.lower():
        log(f"❌ FAIL: Expected fee-related error message, got: {error_msg}")
        cleanup_mongo([enrollment1_id, enrollment2_id])
        return False
    
    log(f"✓ PASS: Certificate request correctly blocked with 400: {error_msg}")
    
    # Cleanup
    log("\n" + "=" * 80)
    log("Cleaning up test data...")
    log("=" * 80)
    cleanup_mongo([enrollment1_id, enrollment2_id])
    
    log("\n" + "=" * 80)
    log("✅ ALL ASSERTIONS PASSED")
    log("=" * 80)
    
    return True

if __name__ == "__main__":
    try:
        success = test_multi_program_flow()
        sys.exit(0 if success else 1)
    except Exception as e:
        log(f"❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
