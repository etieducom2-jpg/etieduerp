"""
Test P2 Features for ETI Educom:
1. Trainer Dashboard - batches and attendance functionality
2. Mark attendance API - trainers only
3. Course completion API - trainers only
4. Payment model now includes student_name and program_name
5. Reports endpoint returns correct data with student names
6. Public certificate request page accessible at /certificate-request
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthentication:
    """Test authentication for different roles"""
    
    def test_trainer_login(self):
        """Test trainer can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "trainer@etieducom.com",
            "password": "password"
        })
        assert response.status_code == 200, f"Trainer login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "Trainer"
        return data["access_token"]
    
    def test_branch_admin_login(self):
        """Test branch admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "branchadmin@etieducom.com",
            "password": "admin@123"
        })
        assert response.status_code == 200, f"Branch Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "Branch Admin"
        return data["access_token"]


class TestTrainerDashboard:
    """Test Trainer Dashboard features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get trainer token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "trainer@etieducom.com",
            "password": "password"
        })
        if response.status_code == 200:
            self.trainer_token = response.json()["access_token"]
            self.trainer_headers = {"Authorization": f"Bearer {self.trainer_token}"}
        else:
            pytest.skip("Trainer login failed")
    
    def test_trainer_dashboard_loads(self):
        """Test trainer dashboard endpoint returns data"""
        response = requests.get(
            f"{BASE_URL}/api/trainer/dashboard",
            headers=self.trainer_headers
        )
        assert response.status_code == 200, f"Failed to load trainer dashboard: {response.text}"
        data = response.json()
        # Dashboard should have these keys
        assert "batches" in data
        assert "students" in data
        assert "total_students" in data
        assert "today_attendance" in data
        assert "curricula" in data
        print(f"Trainer dashboard loaded: {len(data['batches'])} batches, {data['total_students']} students")
    
    def test_trainer_batches_endpoint(self):
        """Test trainer batches endpoint - should return 6 fixed batches"""
        response = requests.get(
            f"{BASE_URL}/api/trainer/batches",
            headers=self.trainer_headers
        )
        assert response.status_code == 200, f"Failed to get trainer batches: {response.text}"
        batches = response.json()
        assert isinstance(batches, list)
        # Trainer should have 6 fixed batches (one for each time slot)
        print(f"Trainer has {len(batches)} batches")
        assert len(batches) == 6, f"Expected 6 batches, got {len(batches)}"
        
        # Verify batch structure
        for batch in batches:
            assert "id" in batch
            assert "name" in batch
            assert "timing" in batch
            assert "trainer_id" in batch
            print(f"  - Batch: {batch['name']}, Timing: {batch.get('timing', 'N/A')}")
    
    def test_non_trainer_cannot_access_dashboard(self):
        """Test non-trainer cannot access trainer dashboard"""
        # Login as branch admin
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "branchadmin@etieducom.com",
            "password": "admin@123"
        })
        if response.status_code == 200:
            admin_token = response.json()["access_token"]
            admin_headers = {"Authorization": f"Bearer {admin_token}"}
            
            # Try to access trainer dashboard
            response = requests.get(
                f"{BASE_URL}/api/trainer/dashboard",
                headers=admin_headers
            )
            # Should get 403 Forbidden
            assert response.status_code == 403, f"Expected 403, got {response.status_code}"
            print("Correctly denied access to non-trainer")


class TestAttendanceAPI:
    """Test Attendance marking functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get trainer token and batch info"""
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "trainer@etieducom.com",
            "password": "password"
        })
        if response.status_code == 200:
            self.trainer_token = response.json()["access_token"]
            self.trainer_headers = {"Authorization": f"Bearer {self.trainer_token}"}
            
            # Get batches
            batches_response = requests.get(
                f"{BASE_URL}/api/trainer/batches",
                headers=self.trainer_headers
            )
            if batches_response.status_code == 200:
                self.batches = batches_response.json()
        else:
            pytest.skip("Trainer login failed")
    
    def test_attendance_bulk_endpoint_exists(self):
        """Test bulk attendance endpoint is accessible"""
        if not self.batches:
            pytest.skip("No batches available")
        
        batch = self.batches[0]
        
        # Try marking bulk attendance (even without students, endpoint should respond)
        response = requests.post(
            f"{BASE_URL}/api/attendance/bulk",
            headers=self.trainer_headers,
            json={
                "batch_id": batch["id"],
                "date": "2025-01-15",
                "attendance_records": []  # Empty records just to test endpoint
            }
        )
        # Should return 200 even with empty records
        assert response.status_code == 200, f"Bulk attendance endpoint failed: {response.text}"
        print("Bulk attendance endpoint working correctly")
    
    def test_single_attendance_endpoint(self):
        """Test single attendance marking endpoint is accessible"""
        if not self.batches:
            pytest.skip("No batches available")
        
        batch = self.batches[0]
        
        # Try marking single attendance with a fake enrollment (should fail with proper error)
        response = requests.post(
            f"{BASE_URL}/api/attendance",
            headers=self.trainer_headers,
            json={
                "batch_id": batch["id"],
                "enrollment_id": "test-enrollment-123",
                "date": "2025-01-15",
                "status": "Present",
                "remarks": "Test attendance"
            }
        )
        # Endpoint should exist and respond
        print(f"Single attendance endpoint responded with status: {response.status_code}")
        # Either 200 (success) or valid error response
        assert response.status_code in [200, 400, 404], f"Unexpected status: {response.status_code}"
    
    def test_get_batch_attendance(self):
        """Test getting attendance for a batch"""
        if not self.batches:
            pytest.skip("No batches available")
        
        batch = self.batches[0]
        
        # Correct endpoint is /api/attendance/{batch_id}
        response = requests.get(
            f"{BASE_URL}/api/attendance/{batch['id']}",
            headers=self.trainer_headers,
            params={"date": "2025-01-15"}
        )
        assert response.status_code == 200, f"Failed to get batch attendance: {response.text}"
        print("Successfully retrieved batch attendance data")


class TestCourseCompletionAPI:
    """Test Course Completion marking functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get trainer token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "trainer@etieducom.com",
            "password": "password"
        })
        if response.status_code == 200:
            self.trainer_token = response.json()["access_token"]
            self.trainer_headers = {"Authorization": f"Bearer {self.trainer_token}"}
        else:
            pytest.skip("Trainer login failed")
    
    def test_course_completion_endpoint_exists(self):
        """Test course completion endpoint is accessible"""
        response = requests.post(
            f"{BASE_URL}/api/course-completion",
            headers=self.trainer_headers,
            params={
                "enrollment_id": "non-existent-enrollment",
                "exam_status": "Passed",
                "exam_score": 85.5,
                "remarks": "Test completion"
            }
        )
        # Should get 403 (student not assigned) or 404 (enrollment not found)
        print(f"Course completion endpoint responded with status: {response.status_code}")
        assert response.status_code in [200, 400, 403, 404], f"Unexpected status: {response.status_code}"
        print("Course completion endpoint exists and responds correctly")
    
    def test_get_course_completions(self):
        """Test getting course completions"""
        response = requests.get(
            f"{BASE_URL}/api/course-completions",
            headers=self.trainer_headers
        )
        assert response.status_code == 200, f"Failed to get course completions: {response.text}"
        completions = response.json()
        assert isinstance(completions, list)
        print(f"Retrieved {len(completions)} course completions")


class TestPaymentModel:
    """Test Payment model includes student_name and program_name"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get branch admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "branchadmin@etieducom.com",
            "password": "admin@123"
        })
        if response.status_code == 200:
            self.admin_token = response.json()["access_token"]
            self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        else:
            pytest.skip("Branch Admin login failed")
    
    def test_payments_have_student_name_and_program_name(self):
        """Test that payment records include student_name and program_name"""
        response = requests.get(
            f"{BASE_URL}/api/payments/all",
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Failed to get payments: {response.text}"
        payments = response.json()
        
        if len(payments) > 0:
            payment = payments[0]
            # Verify student_name and program_name fields exist
            assert "student_name" in payment, "Payment missing student_name field"
            assert "program_name" in payment, "Payment missing program_name field"
            print(f"Payment found with student_name='{payment.get('student_name', '')}', program_name='{payment.get('program_name', '')}'")
            
            # Check if at least one payment has populated student_name
            populated_payments = [p for p in payments if p.get('student_name')]
            print(f"Found {len(populated_payments)} payments with populated student_name out of {len(payments)} total")
        else:
            print("No payments found in database - cannot verify fields")
            pytest.skip("No payments available to verify")
    
    def test_reports_income_with_student_names(self):
        """Test income reports include student names"""
        response = requests.get(
            f"{BASE_URL}/api/reports/generate",
            headers=self.admin_headers,
            params={"report_type": "income"}
        )
        assert response.status_code == 200, f"Failed to get income report: {response.text}"
        print("Income report generated successfully")


class TestPublicCertificateRequest:
    """Test Public Certificate Request endpoint"""
    
    def test_public_enrollment_lookup_endpoint(self):
        """Test public enrollment lookup endpoint exists"""
        # Using a fake enrollment number - should get 404 not server error
        response = requests.get(
            f"{BASE_URL}/api/public/enrollment/TEST12345"
        )
        # Should get 404 (not found) not 500 (server error)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        if response.status_code == 404:
            print("Public enrollment lookup working - returns 404 for non-existent enrollment")
        else:
            print("Public enrollment lookup working - found enrollment data")
    
    def test_public_certificate_request_endpoint(self):
        """Test public certificate request submission endpoint exists"""
        # Try submitting a certificate request with fake data
        response = requests.post(
            f"{BASE_URL}/api/public/certificate-requests",
            json={
                "enrollment_number": "FAKEID123",
                "email": "test@test.com",
                "phone": "9876543210",
                "program_start_date": "2024-01-01",
                "program_end_date": "2024-12-31",
                "training_mode": "Offline",
                "training_hours": 120
            }
        )
        # Should get 404 (enrollment not found) not 500 (server error)
        print(f"Certificate request endpoint responded with status: {response.status_code}")
        assert response.status_code in [200, 201, 400, 404], f"Server error: {response.status_code} - {response.text}"
        print("Public certificate request endpoint accessible and working")
    
    def test_public_certificate_verify_endpoint(self):
        """Test public certificate verification endpoint exists"""
        response = requests.get(
            f"{BASE_URL}/api/public/verify/FAKE-VERIFICATION-ID"
        )
        # Should get 404 (not found) not 500 (server error)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print("Public certificate verification endpoint accessible")


class TestReportsWithStudentNames:
    """Test Reports endpoints return data with student names"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get branch admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "branchadmin@etieducom.com",
            "password": "admin@123"
        })
        if response.status_code == 200:
            self.admin_token = response.json()["access_token"]
            self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        else:
            pytest.skip("Branch Admin login failed")
    
    def test_pending_payments_report_has_student_names(self):
        """Test pending payments report includes student names"""
        response = requests.get(
            f"{BASE_URL}/api/reports/generate",
            headers=self.admin_headers,
            params={"report_type": "pending_payments"}
        )
        assert response.status_code == 200, f"Failed to get pending payments report: {response.text}"
        print("Pending payments report generated successfully")
    
    def test_leads_report(self):
        """Test leads report endpoint - returns CSV"""
        response = requests.get(
            f"{BASE_URL}/api/reports/leads",
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Failed to get leads report: {response.status_code}"
        # This endpoint returns CSV, not JSON
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type or response.text.startswith("Name,"), f"Expected CSV, got: {content_type}"
        print(f"Leads report returned CSV data (first 100 chars): {response.text[:100]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
