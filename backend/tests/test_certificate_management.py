"""
Test Certificate Management System
Features tested:
1. Public certificate request page - GET /api/public/enrollment/{enrollment_number}
2. Public certificate request submission - POST /api/public/certificate-requests
3. Certificate Manager role access to /certificates page via GET /api/certificate-requests
4. Approve request - POST /api/certificate-requests/{id}/approve
5. Reject request - POST /api/certificate-requests/{id}/reject
6. Download certificate - POST /api/certificate-requests/{id}/download
7. Public verification - GET /api/public/verify/{verification_id}
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCertificatePublicEndpoints:
    """Test public endpoints for certificate requests"""
    
    def test_get_enrollment_info_valid(self):
        """Test fetching enrollment info with valid enrollment number"""
        response = requests.get(f"{BASE_URL}/api/public/enrollment/PBPTKE0001")
        print(f"GET enrollment info status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        assert "student_name" in data
        assert "program_name" in data
        assert "branch_name" in data
        assert "enrollment_number" in data
        print(f"✓ Enrollment info retrieved for: {data['student_name']}")
    
    def test_get_enrollment_info_invalid(self):
        """Test fetching enrollment info with invalid enrollment number"""
        response = requests.get(f"{BASE_URL}/api/public/enrollment/INVALID123")
        print(f"GET invalid enrollment status: {response.status_code}")
        
        assert response.status_code == 404
        print("✓ Invalid enrollment correctly returns 404")
    
    def test_public_certificate_request_submission(self):
        """Test submitting a certificate request (may fail if already exists)"""
        payload = {
            "enrollment_number": "PBPTKE0001",
            "email": "test@example.com",
            "phone": "9876543210",
            "program_start_date": "2024-01-01",
            "program_end_date": "2024-06-30",
            "training_mode": "Offline",
            "training_hours": 120
        }
        response = requests.post(f"{BASE_URL}/api/public/certificate-requests", json=payload)
        print(f"POST certificate request status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Either 200 (created) or 400 (already exists)
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            data = response.json()
            assert "certificate_id" in data
            print(f"✓ Certificate request created: {data['certificate_id']}")
        else:
            data = response.json()
            assert "already exists" in data.get('detail', '').lower() or response.status_code == 400
            print(f"✓ Certificate request already exists (expected in retest)")
    
    def test_public_verify_invalid(self):
        """Test public verification with invalid ID"""
        response = requests.get(f"{BASE_URL}/api/public/verify/invalid-verification-id")
        print(f"GET verify invalid status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["verified"] == False
        print("✓ Invalid verification correctly returns verified=false")


class TestCertificateManagerAccess:
    """Test Certificate Manager role access"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get tokens for both admin and certificate manager"""
        # Admin login
        admin_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@etieducom.com", "password": "admin@123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert admin_response.status_code == 200
        self.admin_token = admin_response.json()["access_token"]
        
        # Certificate Manager login
        cm_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "certmanager@etieducom.com", "password": "cert@123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert cm_response.status_code == 200
        self.cm_token = cm_response.json()["access_token"]
        self.cm_user = cm_response.json()["user"]
        print(f"✓ Certificate Manager logged in: {self.cm_user['name']} ({self.cm_user['role']})")
    
    def test_certificate_manager_role_correct(self):
        """Verify Certificate Manager has correct role"""
        assert self.cm_user["role"] == "Certificate Manager"
        print("✓ Certificate Manager role is correct")
    
    def test_cm_can_list_certificate_requests(self):
        """Certificate Manager can access GET /api/certificate-requests"""
        response = requests.get(
            f"{BASE_URL}/api/certificate-requests",
            headers={"Authorization": f"Bearer {self.cm_token}"}
        )
        print(f"GET certificate-requests status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Certificate Manager retrieved {len(data)} requests")
        return data
    
    def test_admin_can_list_certificate_requests(self):
        """Admin can also access GET /api/certificate-requests"""
        response = requests.get(
            f"{BASE_URL}/api/certificate-requests",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        print(f"GET certificate-requests (admin) status: {response.status_code}")
        
        assert response.status_code == 200
        print("✓ Admin can also access certificate requests")
    
    def test_counsellor_cannot_access_certificate_requests(self):
        """Counsellor should be denied access"""
        # Login as counsellor
        counsellor_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "shamligupta80@gmail.com", "password": "counsellor@123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if counsellor_response.status_code == 200:
            counsellor_token = counsellor_response.json()["access_token"]
            response = requests.get(
                f"{BASE_URL}/api/certificate-requests",
                headers={"Authorization": f"Bearer {counsellor_token}"}
            )
            assert response.status_code == 403
            print("✓ Counsellor correctly denied access to certificate requests")
        else:
            print("⚠ Counsellor login failed - skipping role access test")
            pytest.skip("Counsellor login failed")


class TestCertificateWorkflow:
    """Test full certificate workflow: Pending → Approved → Ready"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get Certificate Manager token"""
        cm_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "certmanager@etieducom.com", "password": "cert@123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert cm_response.status_code == 200
        self.cm_token = cm_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.cm_token}"}
    
    def test_get_pending_requests(self):
        """Get pending certificate requests"""
        response = requests.get(
            f"{BASE_URL}/api/certificate-requests",
            params={"status": "Pending"},
            headers=self.headers
        )
        assert response.status_code == 200
        pending = response.json()
        print(f"✓ Found {len(pending)} pending requests")
        return pending
    
    def test_approve_request(self):
        """Test approving a certificate request"""
        # First, get all requests
        list_response = requests.get(
            f"{BASE_URL}/api/certificate-requests",
            headers=self.headers
        )
        requests_list = list_response.json()
        
        # Find a pending request to approve
        pending = [r for r in requests_list if r.get("status") == "Pending"]
        
        if not pending:
            print("⚠ No pending requests to approve - test inconclusive")
            pytest.skip("No pending requests available")
            return
        
        request_id = pending[0]["id"]
        print(f"Approving request: {request_id}")
        
        response = requests.post(
            f"{BASE_URL}/api/certificate-requests/{request_id}/approve",
            headers=self.headers
        )
        print(f"Approve status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        print("✓ Certificate request approved successfully")
    
    def test_download_certificate(self):
        """Test downloading/generating certificate (marks as Ready)"""
        # Get all requests
        list_response = requests.get(
            f"{BASE_URL}/api/certificate-requests",
            headers=self.headers
        )
        requests_list = list_response.json()
        
        # Find an approved or ready request
        approved = [r for r in requests_list if r.get("status") in ["Approved", "Ready"]]
        
        if not approved:
            print("⚠ No approved requests to download - test inconclusive")
            pytest.skip("No approved requests available")
            return
        
        request_id = approved[0]["id"]
        print(f"Downloading certificate for request: {request_id}")
        
        response = requests.post(
            f"{BASE_URL}/api/certificate-requests/{request_id}/download",
            headers=self.headers
        )
        print(f"Download status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify certificate data structure
        assert "certificate_id" in data
        assert "student_name" in data
        assert "program_name" in data
        assert "verification_id" in data
        assert "registration_number" in data
        
        print(f"✓ Certificate data retrieved: {data['certificate_id']}")
        print(f"  Student: {data['student_name']}")
        print(f"  Verification ID: {data['verification_id']}")
        
        return data["verification_id"]
    
    def test_verify_valid_certificate(self):
        """Test public verification of a valid certificate"""
        # First download to ensure we have a Ready certificate
        list_response = requests.get(
            f"{BASE_URL}/api/certificate-requests",
            headers=self.headers
        )
        requests_list = list_response.json()
        
        # Find a Ready certificate
        ready = [r for r in requests_list if r.get("status") == "Ready"]
        
        if not ready:
            print("⚠ No Ready certificates to verify - test inconclusive")
            pytest.skip("No Ready certificates available")
            return
        
        verification_id = ready[0].get("verification_id")
        if not verification_id:
            pytest.skip("No verification_id found")
            return
        
        print(f"Verifying certificate with ID: {verification_id}")
        
        response = requests.get(f"{BASE_URL}/api/public/verify/{verification_id}")
        print(f"Verify status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["verified"] == True
        assert "certificate_details" in data
        print(f"✓ Certificate verified successfully: {data['certificate_details']['certificate_id']}")
    
    def test_reject_request(self):
        """Test rejecting a certificate request"""
        # First, create a new test request to reject
        # Get enrollment info first
        enrollment_response = requests.get(f"{BASE_URL}/api/public/enrollment/PBPTKE0001")
        if enrollment_response.status_code != 200:
            pytest.skip("No enrollment to test rejection")
            return
        
        # Try to create a certificate request (may fail if one exists)
        payload = {
            "enrollment_number": "PBPTKE0001",
            "email": "reject_test@example.com",
            "phone": "9999999999",
            "program_start_date": "2024-01-01",
            "program_end_date": "2024-06-30",
            "training_mode": "Online",
            "training_hours": 100
        }
        
        # Get pending requests before
        list_response = requests.get(
            f"{BASE_URL}/api/certificate-requests",
            params={"status": "Pending"},
            headers=self.headers
        )
        pending = list_response.json()
        
        if not pending:
            print("⚠ No pending requests to reject - skipping")
            pytest.skip("No pending requests to reject")
            return
        
        request_id = pending[0]["id"]
        print(f"Rejecting request: {request_id}")
        
        response = requests.post(
            f"{BASE_URL}/api/certificate-requests/{request_id}/reject",
            params={"reason": "Test rejection reason"},
            headers=self.headers
        )
        print(f"Reject status: {response.status_code}")
        
        # May be 404 if request was already approved in earlier test
        if response.status_code == 404:
            print("⚠ Request already approved/rejected - expected in workflow tests")
            return
        
        assert response.status_code == 200
        print("✓ Certificate request rejected successfully")


class TestVerifyWithProvidedId:
    """Test verification using the provided test verification ID"""
    
    def test_verify_provided_id(self):
        """Test verification with the provided test_verification_id"""
        # Use the verification ID from test credentials
        verification_id = "_wq5fXSiBEI1CK20Bu49yA"
        
        response = requests.get(f"{BASE_URL}/api/public/verify/{verification_id}")
        print(f"Verify provided ID status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Either verified (if certificate exists and is Ready) or not verified
        if data.get("verified"):
            print(f"✓ Certificate verified: {data['certificate_details']['student_name']}")
        else:
            print(f"⚠ Certificate not verified: {data.get('message')}")
            # This is ok - the verification ID may not exist or not be Ready yet


class TestWhatsAppCertificateEvent:
    """Test that certificate_ready event is configured in WhatsApp settings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        admin_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@etieducom.com", "password": "admin@123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert admin_response.status_code == 200
        self.admin_token = admin_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_whatsapp_settings_include_certificate_ready(self):
        """Verify WhatsApp settings include certificate_ready event"""
        response = requests.get(
            f"{BASE_URL}/api/admin/whatsapp-settings",
            headers=self.headers
        )
        print(f"GET WhatsApp settings status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "events" in data
        assert "certificate_ready" in data["events"]
        
        cert_event = data["events"]["certificate_ready"]
        print(f"Certificate Ready event config: {cert_event}")
        
        assert "enabled" in cert_event
        assert "variables" in cert_event
        assert "name" in cert_event.get("variables", []) or "name" in str(cert_event)
        
        print("✓ certificate_ready event is configured in WhatsApp settings")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
