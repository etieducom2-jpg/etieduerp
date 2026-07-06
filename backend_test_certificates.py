#!/usr/bin/env python3
"""
Backend API Tests for ETI Educom ERP - Certificate Features
Tests TWO new certificate features:
A) Multiple certificates for students enrolled in multiple programs
B) Mark certificate as printed endpoint
"""

import requests
import json
import sys
import time
from typing import Optional, Dict, Any
from pymongo import MongoClient
from datetime import datetime, timezone
import uuid as uuid_module

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
            "owner_email": f"owner_{name.lower().replace(' ', '_')}@test.com",
            "owner_phone": "9876543210",
            "owner_designation": "Owner",
            "branch_phone": "9876543211",
            "branch_email": f"branch_{name.lower().replace(' ', '_')}@test.com",
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

def create_enrollment_with_phone(token: str, branch_id: str, program_id: str, phone: str, student_name: str) -> tuple:
    """Create lead and enrollment with specific phone number, return enrollment_id and enrollment_number"""
    try:
        # Create lead
        lead_data = {
            "name": student_name,
            "number": phone,
            "email": f"student_{phone}@test.com",
            "program_id": program_id,
            "lead_source": "Walk-in",
            "branch_id": branch_id
        }
        
        response = requests.post(
            f"{BASE_URL}/leads",
            headers={"Authorization": f"Bearer {token}"},
            json=lead_data
        )
        if response.status_code != 200:
            log_error(f"Failed to create lead: {response.status_code} - {response.text}")
            return None, None
        
        lead_id = response.json()["id"]
        
        # Update lead status to Converted
        requests.put(
            f"{BASE_URL}/leads/{lead_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"status": "Converted"}
        )
        
        # Create enrollment
        enrollment_data = {
            "lead_id": lead_id,
            "student_name": student_name,
            "email": f"student_{phone}@test.com",
            "phone": phone,
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
        if response.status_code != 200:
            log_error(f"Failed to create enrollment: {response.status_code} - {response.text}")
            return None, None
        
        enrollment_id = response.json()["id"]
        
        # Get enrollment details to get enrollment_number
        response = requests.get(
            f"{BASE_URL}/students/{enrollment_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code != 200:
            log_error(f"Failed to get enrollment details: {response.status_code}")
            return None, None
        
        enrollment_data = response.json().get("enrollment", {})
        enrollment_number = enrollment_data.get("enrollment_id")
        
        log_success(f"Created enrollment: {enrollment_number} for {student_name}")
        return enrollment_id, enrollment_number
        
    except Exception as e:
        log_error(f"Exception creating enrollment: {str(e)}")
        return None, None

def pay_full_fees(token: str, enrollment_id: str) -> bool:
    """Pay full fees for an enrollment"""
    try:
        # Get enrollment details
        response = requests.get(
            f"{BASE_URL}/students/{enrollment_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code != 200:
            log_error(f"Failed to get enrollment details: {response.status_code}")
            return False
        
        enrollment_data = response.json().get("enrollment", {})
        final_fee = enrollment_data.get("final_fee", 50000)
        
        # Create payment
        payment_data = {
            "enrollment_id": enrollment_id,
            "amount": final_fee,
            "payment_mode": "Cash",
            "payment_date": "2024-01-20",
            "remarks": "Full payment"
        }
        response = requests.post(
            f"{BASE_URL}/payments",
            headers={"Authorization": f"Bearer {token}"},
            json=payment_data
        )
        if response.status_code == 200:
            log_success(f"Paid full fees: ₹{final_fee}")
            return True
        else:
            log_error(f"Failed to create payment: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        log_error(f"Exception paying fees: {str(e)}")
        return False

def mark_course_completed(enrollment_id: str, exam_status: str = "Passed") -> bool:
    """Create course_completions entry directly in MongoDB"""
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        completion_data = {
            "id": str(uuid_module.uuid4()),
            "enrollment_id": enrollment_id,
            "exam_status": exam_status,
            "marks_obtained": 85 if exam_status == "Passed" else 30,
            "total_marks": 100,
            "completion_date": "2024-03-01",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        db.course_completions.insert_one(completion_data)
        log_success(f"Marked course completed with exam_status: {exam_status}")
        return True
    except Exception as e:
        log_error(f"Exception marking course completed: {str(e)}")
        return False

# ============================================================================
# TEST A: MULTI-PROGRAM CERTIFICATES
# ============================================================================

def test_multi_program_certificates():
    print("\n" + "="*80)
    print("TEST A: MULTI-PROGRAM CERTIFICATES")
    print("="*80)
    
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        return False
    
    # Create test data
    branch_id = create_branch(admin_token, f"Test Branch MultiCert {TEST_RUN_ID}")
    if not branch_id:
        return False
    
    program1_id = create_program(admin_token, f"Tally Prime {TEST_RUN_ID}", 30000)
    if not program1_id:
        return False
    
    program2_id = create_program(admin_token, f"Advanced Excel {TEST_RUN_ID}", 25000)
    if not program2_id:
        return False
    
    # A.1: Create student with TWO enrollments (same phone, different programs)
    log_info("\nA.1: Creating student with TWO enrollments in different programs")
    student_phone = f"98765{TEST_RUN_ID[-5:]}"
    student_name = "Rajesh Kumar"
    
    enrollment1_id, enrollment1_number = create_enrollment_with_phone(
        admin_token, branch_id, program1_id, student_phone, student_name
    )
    if not enrollment1_id:
        return False
    
    enrollment2_id, enrollment2_number = create_enrollment_with_phone(
        admin_token, branch_id, program2_id, student_phone, student_name
    )
    if not enrollment2_id:
        return False
    
    log_success(f"Created 2 enrollments for {student_name} (phone: {student_phone})")
    log_info(f"  Enrollment 1: {enrollment1_number} (Tally Prime)")
    log_info(f"  Enrollment 2: {enrollment2_number} (Advanced Excel)")
    
    # Pay fees for both enrollments
    if not pay_full_fees(admin_token, enrollment1_id):
        return False
    if not pay_full_fees(admin_token, enrollment2_id):
        return False
    
    # Mark both courses as completed
    if not mark_course_completed(enrollment1_id, "Passed"):
        return False
    if not mark_course_completed(enrollment2_id, "Passed"):
        return False
    
    # A.2: Check if eligibility endpoint exists
    log_info(f"\nA.2: Checking GET /api/certificates/eligibility/{student_phone}")
    response = requests.get(
        f"{BASE_URL}/certificates/eligibility/{student_phone}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if response.status_code == 404:
        log_error("✗ CRITICAL: GET /api/certificates/eligibility/{phone} endpoint NOT FOUND (404)")
        log_error("  This endpoint has NOT been implemented by the main agent")
        log_error("  Expected: Returns list of eligible courses for a phone number")
        log_error("  Expected response: { courses: [{enrollment_number, program_name, fee_cleared, course_completed}, ...] }")
        return False
    elif response.status_code == 200:
        data = response.json()
        courses = data.get("courses", [])
        
        if len(courses) >= 2:
            log_success(f"✓ Eligibility endpoint returned {len(courses)} courses")
            
            # Check if both enrollments are present
            enrollment_numbers = [c.get("enrollment_number") for c in courses]
            if enrollment1_number in enrollment_numbers and enrollment2_number in enrollment_numbers:
                log_success("  ✓ Both enrollments present in eligibility response")
            else:
                log_error(f"  ✗ Missing enrollments. Found: {enrollment_numbers}")
                return False
            
            # Check fee_cleared and course_completed flags
            for course in courses:
                if course.get("enrollment_number") in [enrollment1_number, enrollment2_number]:
                    if course.get("fee_cleared") == True:
                        log_success(f"  ✓ {course.get('enrollment_number')}: fee_cleared=true")
                    else:
                        log_error(f"  ✗ {course.get('enrollment_number')}: fee_cleared={course.get('fee_cleared')}")
                        return False
                    
                    if course.get("course_completed") == True:
                        log_success(f"  ✓ {course.get('enrollment_number')}: course_completed=true")
                    else:
                        log_error(f"  ✗ {course.get('enrollment_number')}: course_completed={course.get('course_completed')}")
                        return False
        else:
            log_error(f"  ✗ Expected at least 2 courses, got {len(courses)}")
            return False
    else:
        log_error(f"Unexpected response: {response.status_code} - {response.text}")
        return False
    
    # A.3: Request certificate for first enrollment
    log_info("\nA.3: Requesting certificate for first enrollment")
    cert_request_data1 = {
        "enrollment_number": enrollment1_number,
        "email": f"student_{student_phone}@test.com",
        "phone": student_phone,
        "program_start_date": "2024-01-15",
        "program_end_date": "2024-07-15",
        "training_mode": "Offline",
        "training_hours": 120
    }
    
    response = requests.post(
        f"{BASE_URL}/public/certificate-requests",
        json=cert_request_data1
    )
    
    if response.status_code == 200:
        cert1 = response.json()
        cert1_id = cert1.get("certificate_id")
        log_success(f"✓ First certificate request created: {cert1_id}")
    else:
        log_error(f"Failed to create first certificate request: {response.status_code} - {response.text}")
        return False
    
    # A.4: Request certificate for second enrollment
    log_info("\nA.4: Requesting certificate for second enrollment")
    cert_request_data2 = {
        "enrollment_number": enrollment2_number,
        "email": f"student_{student_phone}@test.com",
        "phone": student_phone,
        "program_start_date": "2024-01-15",
        "program_end_date": "2024-07-15",
        "training_mode": "Offline",
        "training_hours": 120
    }
    
    response = requests.post(
        f"{BASE_URL}/public/certificate-requests",
        json=cert_request_data2
    )
    
    if response.status_code == 200:
        cert2 = response.json()
        cert2_id = cert2.get("certificate_id")
        log_success(f"✓ Second certificate request created: {cert2_id}")
        
        if cert2_id != cert1_id:
            log_success(f"  ✓ Distinct certificate_id generated")
        else:
            log_error(f"  ✗ Same certificate_id as first request")
            return False
    else:
        log_error(f"Failed to create second certificate request: {response.status_code} - {response.text}")
        return False
    
    # A.5: Repeat request for SAME enrollment (should still work)
    log_info("\nA.5: Repeating certificate request for first enrollment (should allow)")
    response = requests.post(
        f"{BASE_URL}/public/certificate-requests",
        json=cert_request_data1
    )
    
    if response.status_code == 200:
        cert3 = response.json()
        cert3_id = cert3.get("certificate_id")
        log_success(f"✓ Third certificate request created: {cert3_id}")
        
        if cert3_id != cert1_id and cert3_id != cert2_id:
            log_success(f"  ✓ Another distinct certificate_id generated")
        else:
            log_error(f"  ✗ Duplicate certificate_id")
            return False
    else:
        log_error(f"Failed to create third certificate request: {response.status_code} - {response.text}")
        return False
    
    # A.6: Approve and download both certificates
    log_info("\nA.6: Approving and downloading both certificates")
    
    # Get all certificate requests
    response = requests.get(
        f"{BASE_URL}/certificate-requests",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if response.status_code != 200:
        log_error(f"Failed to get certificate requests: {response.status_code}")
        return False
    
    cert_requests = response.json()
    
    # Find our two certificate requests
    cert1_request = None
    cert2_request = None
    for cert in cert_requests:
        if cert.get("certificate_id") == cert1_id:
            cert1_request = cert
        elif cert.get("certificate_id") == cert2_id:
            cert2_request = cert
    
    if not cert1_request or not cert2_request:
        log_error("Could not find certificate requests in list")
        return False
    
    # Approve and download first certificate
    response = requests.post(
        f"{BASE_URL}/certificate-requests/{cert1_request['id']}/approve",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if response.status_code != 200:
        log_error(f"Failed to approve first certificate: {response.status_code}")
        return False
    
    response = requests.post(
        f"{BASE_URL}/certificate-requests/{cert1_request['id']}/download",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if response.status_code == 200:
        cert_data = response.json()
        if "Tally Prime" in cert_data.get("program_name", ""):
            log_success(f"✓ First certificate downloaded with correct program: {cert_data.get('program_name')}")
        else:
            log_warning(f"First certificate program name: {cert_data.get('program_name')}")
    else:
        log_error(f"Failed to download first certificate: {response.status_code}")
        return False
    
    # Approve and download second certificate
    response = requests.post(
        f"{BASE_URL}/certificate-requests/{cert2_request['id']}/approve",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if response.status_code != 200:
        log_error(f"Failed to approve second certificate: {response.status_code}")
        return False
    
    response = requests.post(
        f"{BASE_URL}/certificate-requests/{cert2_request['id']}/download",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if response.status_code == 200:
        cert_data = response.json()
        if "Advanced Excel" in cert_data.get("program_name", ""):
            log_success(f"✓ Second certificate downloaded with correct program: {cert_data.get('program_name')}")
        else:
            log_warning(f"Second certificate program name: {cert_data.get('program_name')}")
    else:
        log_error(f"Failed to download second certificate: {response.status_code}")
        return False
    
    log_success("\n✓ TEST A PASSED: Multi-program certificates working correctly")
    return True

# ============================================================================
# TEST B: MARK CERTIFICATE AS PRINTED
# ============================================================================

def test_mark_certificate_printed():
    print("\n" + "="*80)
    print("TEST B: MARK CERTIFICATE AS PRINTED")
    print("="*80)
    
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        return False
    
    # Create test data
    branch_id = create_branch(admin_token, f"Test Branch Printed {TEST_RUN_ID}")
    if not branch_id:
        return False
    
    # Create another branch for cross-branch testing
    branch2_id = create_branch(admin_token, f"Test Branch Printed 2 {TEST_RUN_ID}")
    if not branch2_id:
        return False
    
    # Create users with different roles
    fde_id, fde_email = create_user(admin_token, "fde_printed@test.com", "test123", 
                                     "FDE Printed", "Front Desk Executive", branch_id)
    if not fde_id:
        return False
    
    trainer_id, trainer_email = create_user(admin_token, "trainer_printed@test.com", "test123", 
                                            "Trainer Printed", "Trainer", branch_id)
    if not trainer_id:
        return False
    
    counsellor_id, counsellor_email = create_user(admin_token, "counsellor_printed@test.com", "test123", 
                                                   "Counsellor Printed", "Counsellor", branch_id)
    if not counsellor_id:
        return False
    
    branch_admin_id, branch_admin_email = create_user(admin_token, "branchadmin_printed@test.com", "test123", 
                                                       "Branch Admin Printed", "Branch Admin", branch2_id)
    if not branch_admin_id:
        return False
    
    program_id = create_program(admin_token, f"Test Program Printed {TEST_RUN_ID}", 30000)
    if not program_id:
        return False
    
    # Helper function to create a certificate request
    def create_test_certificate(branch_id_param, program_id_param):
        phone = f"98765{str(int(time.time()))[-5:]}"
        enrollment_id, enrollment_number = create_enrollment_with_phone(
            admin_token, branch_id_param, program_id_param, phone, "Test Student"
        )
        if not enrollment_id:
            return None, None
        
        pay_full_fees(admin_token, enrollment_id)
        mark_course_completed(enrollment_id, "Passed")
        
        cert_request_data = {
            "enrollment_number": enrollment_number,
            "email": f"student_{phone}@test.com",
            "phone": phone,
            "program_start_date": "2024-01-15",
            "program_end_date": "2024-07-15",
            "training_mode": "Offline",
            "training_hours": 120
        }
        
        response = requests.post(
            f"{BASE_URL}/public/certificate-requests",
            json=cert_request_data
        )
        
        if response.status_code != 200:
            return None, None
        
        cert_id = response.json().get("certificate_id")
        
        # Get certificate request ID
        response = requests.get(
            f"{BASE_URL}/certificate-requests",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code != 200:
            return None, None
        
        for cert in response.json():
            if cert.get("certificate_id") == cert_id:
                return cert.get("id"), cert_id
        
        return None, None
    
    # B.1: Fresh Pending cert → mark-printed → 400
    log_info("\nB.1: Trying to mark Pending certificate as printed (should get 400)")
    cert_request_id1, cert_id1 = create_test_certificate(branch_id, program_id)
    if not cert_request_id1:
        log_error("Failed to create test certificate")
        return False
    
    response = requests.post(
        f"{BASE_URL}/certificate-requests/{cert_request_id1}/mark-printed",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if response.status_code == 400 and ("downloaded" in response.text.lower() or "ready" in response.text.lower()):
        log_success("✓ Correctly blocked marking Pending certificate with 400")
    else:
        log_error(f"Expected 400 for Pending cert, got {response.status_code}: {response.text}")
        return False
    
    # B.2: Approve + download → status becomes Ready
    log_info("\nB.2: Approving and downloading certificate (status should become Ready)")
    response = requests.post(
        f"{BASE_URL}/certificate-requests/{cert_request_id1}/approve",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if response.status_code != 200:
        log_error(f"Failed to approve: {response.status_code}")
        return False
    
    response = requests.post(
        f"{BASE_URL}/certificate-requests/{cert_request_id1}/download",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if response.status_code == 200:
        log_success("✓ Certificate downloaded successfully")
    else:
        log_error(f"Failed to download: {response.status_code}")
        return False
    
    # Verify status is Ready
    response = requests.get(
        f"{BASE_URL}/certificate-requests/{cert_request_id1}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if response.status_code == 200:
        cert_data = response.json()
        if cert_data.get("status") == "Ready":
            log_success("✓ Certificate status is 'Ready' after download")
        else:
            log_error(f"Status is not 'Ready': {cert_data.get('status')}")
            return False
    
    # B.3: POST /mark-printed as Admin → 200 with proper fields
    log_info("\nB.3: Marking certificate as Printed (Admin)")
    response = requests.post(
        f"{BASE_URL}/certificate-requests/{cert_request_id1}/mark-printed",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if response.status_code == 200:
        data = response.json()
        if data.get("status") == "Printed":
            log_success("✓ Response status is 'Printed'")
        else:
            log_error(f"Response status is not 'Printed': {data.get('status')}")
            return False
        
        if "message" in data:
            log_success(f"✓ Message present: {data.get('message')}")
        else:
            log_error("Message not present in response")
            return False
    else:
        log_error(f"Failed to mark as printed: {response.status_code} - {response.text}")
        return False
    
    # Verify MongoDB document has all fields
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        cert_doc = db.certificate_requests.find_one({"id": cert_request_id1}, {"_id": 0})
        
        if cert_doc:
            if cert_doc.get("status") == "Printed":
                log_success("✓ MongoDB: status='Printed'")
            else:
                log_error(f"MongoDB: status={cert_doc.get('status')}")
                return False
            
            if cert_doc.get("printed_at"):
                log_success(f"✓ MongoDB: printed_at present ({cert_doc.get('printed_at')})")
            else:
                log_error("MongoDB: printed_at missing")
                return False
            
            if cert_doc.get("printed_by"):
                log_success(f"✓ MongoDB: printed_by present ({cert_doc.get('printed_by')})")
            else:
                log_error("MongoDB: printed_by missing")
                return False
            
            if cert_doc.get("printed_by_name"):
                log_success(f"✓ MongoDB: printed_by_name present ({cert_doc.get('printed_by_name')})")
            else:
                log_error("MongoDB: printed_by_name missing")
                return False
        else:
            log_error("Certificate not found in MongoDB")
            return False
    except Exception as e:
        log_error(f"MongoDB check failed: {str(e)}")
        return False
    
    # B.4: Repeat POST /mark-printed → 200 with already_printed: true
    log_info("\nB.4: Repeating mark-printed on same certificate (should return already_printed)")
    response = requests.post(
        f"{BASE_URL}/certificate-requests/{cert_request_id1}/mark-printed",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if response.status_code == 200:
        data = response.json()
        if data.get("already_printed") == True:
            log_success("✓ Response has already_printed: true")
        else:
            log_error(f"already_printed not true: {data.get('already_printed')}")
            return False
    else:
        log_error(f"Expected 200, got {response.status_code}: {response.text}")
        return False
    
    # B.5: Public verify endpoint accepts Printed status
    log_info("\nB.5: Verifying Printed certificate via public endpoint")
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        cert_doc = db.certificate_requests.find_one({"id": cert_request_id1}, {"_id": 0})
        verification_id = cert_doc.get("verification_id")
        
        if not verification_id:
            log_error("verification_id not found")
            return False
        
        response = requests.get(f"{BASE_URL}/public/verify/{verification_id}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("verified") == True:
                log_success("✓ Public verify returns verified=true for Printed cert")
            else:
                log_error(f"verified is not true: {data.get('verified')}")
                return False
        else:
            log_error(f"Public verify failed: {response.status_code}")
            return False
    except Exception as e:
        log_error(f"Public verify check failed: {str(e)}")
        return False
    
    # B.6: Re-download Printed certificate (should still work)
    log_info("\nB.6: Re-downloading Printed certificate (should work)")
    response = requests.post(
        f"{BASE_URL}/certificate-requests/{cert_request_id1}/download",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if response.status_code == 200:
        log_success("✓ Re-download of Printed certificate successful")
    else:
        log_error(f"Re-download failed: {response.status_code} - {response.text}")
        return False
    
    # B.7: Role checks
    log_info("\nB.7: Testing role-based access control")
    
    # Create a new certificate for role testing
    cert_request_id2, cert_id2 = create_test_certificate(branch_id, program_id)
    if not cert_request_id2:
        log_error("Failed to create test certificate for role testing")
        return False
    
    # Approve and download
    requests.post(
        f"{BASE_URL}/certificate-requests/{cert_request_id2}/approve",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    requests.post(
        f"{BASE_URL}/certificate-requests/{cert_request_id2}/download",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    # B.7.1: FDE in same branch → 200 allowed
    log_info("\n  B.7.1: FDE in same branch tries to mark-printed (should be allowed)")
    fde_token = login(fde_email, "test123")
    if not fde_token:
        return False
    
    response = requests.post(
        f"{BASE_URL}/certificate-requests/{cert_request_id2}/mark-printed",
        headers={"Authorization": f"Bearer {fde_token}"}
    )
    
    if response.status_code == 200:
        log_success("✓ FDE allowed to mark-printed (200)")
    else:
        log_error(f"FDE denied: {response.status_code} - {response.text}")
        return False
    
    # B.7.2: Trainer in same branch → 403
    log_info("\n  B.7.2: Trainer in same branch tries to mark-printed (should get 403)")
    
    # Create another certificate
    cert_request_id3, cert_id3 = create_test_certificate(branch_id, program_id)
    if not cert_request_id3:
        log_error("Failed to create test certificate")
        return False
    
    requests.post(
        f"{BASE_URL}/certificate-requests/{cert_request_id3}/approve",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    requests.post(
        f"{BASE_URL}/certificate-requests/{cert_request_id3}/download",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    trainer_token = login(trainer_email, "test123")
    if not trainer_token:
        return False
    
    response = requests.post(
        f"{BASE_URL}/certificate-requests/{cert_request_id3}/mark-printed",
        headers={"Authorization": f"Bearer {trainer_token}"}
    )
    
    if response.status_code == 403:
        log_success("✓ Trainer correctly denied with 403")
    else:
        log_error(f"Expected 403 for Trainer, got {response.status_code}: {response.text}")
        return False
    
    # B.7.3: Counsellor behavior
    log_info("\n  B.7.3: Counsellor tries to mark-printed (checking behavior)")
    counsellor_token = login(counsellor_email, "test123")
    if not counsellor_token:
        return False
    
    response = requests.post(
        f"{BASE_URL}/certificate-requests/{cert_request_id3}/mark-printed",
        headers={"Authorization": f"Bearer {counsellor_token}"}
    )
    
    if response.status_code == 403:
        log_success("✓ Counsellor denied with 403 (not in CERT_VIEW_ROLES)")
    elif response.status_code == 200:
        log_warning("⚠ Counsellor allowed to mark-printed (200) - may be in CERT_VIEW_ROLES")
    else:
        log_info(f"Counsellor got: {response.status_code} - {response.text}")
    
    # B.8: Branch Admin from different branch → 403
    log_info("\n  B.8: Branch Admin from different branch tries to mark-printed (should get 403)")
    branch_admin_token = login(branch_admin_email, "test123")
    if not branch_admin_token:
        return False
    
    response = requests.post(
        f"{BASE_URL}/certificate-requests/{cert_request_id3}/mark-printed",
        headers={"Authorization": f"Bearer {branch_admin_token}"}
    )
    
    if response.status_code == 403 and "branch" in response.text.lower():
        log_success("✓ Branch Admin from different branch correctly denied with 403")
    else:
        log_error(f"Expected 403 with 'branch', got {response.status_code}: {response.text}")
        return False
    
    # B.9: Non-existent request_id → 404
    log_info("\n  B.9: Trying to mark-printed non-existent certificate (should get 404)")
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = requests.post(
        f"{BASE_URL}/certificate-requests/{fake_id}/mark-printed",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if response.status_code == 404 and "not found" in response.text.lower():
        log_success("✓ Non-existent certificate correctly returns 404")
    else:
        log_error(f"Expected 404 with 'not found', got {response.status_code}: {response.text}")
        return False
    
    log_success("\n✓ TEST B PASSED: Mark certificate as printed working correctly")
    return True

# ============================================================================
# MAIN
# ============================================================================

def main():
    print("\n" + "="*80)
    print("ETI EDUCOM ERP - CERTIFICATE FEATURES TESTS")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Admin: {ADMIN_EMAIL}")
    print("="*80)
    
    results = {
        "Test A: Multi-Program Certificates": False,
        "Test B: Mark Certificate as Printed": False
    }
    
    try:
        results["Test A: Multi-Program Certificates"] = test_multi_program_certificates()
    except Exception as e:
        log_error(f"Test A exception: {str(e)}")
        import traceback
        traceback.print_exc()
    
    try:
        results["Test B: Mark Certificate as Printed"] = test_mark_certificate_printed()
    except Exception as e:
        log_error(f"Test B exception: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    for test_name, passed in results.items():
        status = f"{Colors.GREEN}PASSED{Colors.RESET}" if passed else f"{Colors.RED}FAILED{Colors.RESET}"
        print(f"{test_name}: {status}")
    
    all_passed = all(results.values())
    print("="*80)
    if all_passed:
        print(f"{Colors.GREEN}ALL TESTS PASSED ✓{Colors.RESET}")
        return 0
    else:
        print(f"{Colors.RED}SOME TESTS FAILED ✗{Colors.RESET}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
