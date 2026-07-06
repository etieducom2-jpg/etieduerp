"""
Test Phase 1 Features: User Management and International Exams Module
- Super Admin can change own password
- Super Admin can change password for any user
- Mark users active/inactive
- Delete any user
- International Exams module with exam types and bookings
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "admin@eti.com"
SUPER_ADMIN_PASSWORD = "admin123"

class TestAuth:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test Super Admin login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "Admin"
        print(f"LOGIN SUCCESS: Super Admin logged in successfully")
        return data["access_token"]


class TestUserManagement:
    """User Management Tests - Phase 1 Features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_users_list(self):
        """Test getting list of all users"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        users = response.json()
        assert isinstance(users, list)
        print(f"GET USERS SUCCESS: Found {len(users)} users")
    
    def test_create_test_user(self):
        """Create a test user for password/status/delete tests"""
        unique_id = str(uuid.uuid4())[:8]
        test_user = {
            "name": f"TEST_Phase1_User_{unique_id}",
            "email": f"test_phase1_{unique_id}@eti.com",
            "password": "test123",
            "role": "Counsellor",
            "phone": "9876543210"
        }
        response = requests.post(f"{BASE_URL}/api/admin/users", json=test_user, headers=self.headers)
        assert response.status_code == 200, f"Failed to create user: {response.text}"
        data = response.json()
        assert data["email"] == test_user["email"]
        print(f"CREATE USER SUCCESS: Created user {data['name']}")
        return data["id"], test_user["email"]
    
    def test_change_user_password(self):
        """Test Super Admin changing another user's password"""
        # First create a user
        unique_id = str(uuid.uuid4())[:8]
        test_user = {
            "name": f"TEST_PasswordChange_{unique_id}",
            "email": f"test_pwd_{unique_id}@eti.com",
            "password": "original123",
            "role": "Counsellor",
            "phone": "9876543211"
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/users", json=test_user, headers=self.headers)
        assert create_response.status_code == 200, f"Failed to create user: {create_response.text}"
        user_id = create_response.json()["id"]
        
        # Change password
        pwd_response = requests.put(
            f"{BASE_URL}/api/admin/users/{user_id}/password",
            json={"new_password": "newpassword123"},
            headers=self.headers
        )
        assert pwd_response.status_code == 200, f"Failed to change password: {pwd_response.text}"
        print(f"CHANGE USER PASSWORD SUCCESS: Password changed for user")
        
        # Verify new password works
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": test_user["email"], "password": "newpassword123"}
        )
        assert login_response.status_code == 200, "Failed to login with new password"
        print(f"PASSWORD VERIFY SUCCESS: User can login with new password")
        
        # Cleanup - delete user
        requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=self.headers)
    
    def test_change_own_password(self):
        """Test Super Admin changing own password"""
        # This requires current_password
        # Note: We won't actually change admin password, just verify API accepts correct format
        response = requests.put(
            f"{BASE_URL}/api/auth/change-password",
            json={
                "current_password": "wrongpassword",
                "new_password": "newadmin123"
            },
            headers=self.headers
        )
        # Should fail because current password is wrong
        assert response.status_code == 400, "Should fail with wrong current password"
        print(f"CHANGE OWN PASSWORD VALIDATION SUCCESS: API correctly rejects wrong current password")
    
    def test_toggle_user_status(self):
        """Test marking user active/inactive"""
        # First create a user
        unique_id = str(uuid.uuid4())[:8]
        test_user = {
            "name": f"TEST_StatusToggle_{unique_id}",
            "email": f"test_status_{unique_id}@eti.com",
            "password": "test123",
            "role": "Counsellor",
            "phone": "9876543212"
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/users", json=test_user, headers=self.headers)
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Deactivate user
        deactivate_response = requests.put(
            f"{BASE_URL}/api/admin/users/{user_id}/status",
            json={"is_active": False},
            headers=self.headers
        )
        assert deactivate_response.status_code == 200, f"Failed to deactivate: {deactivate_response.text}"
        print(f"DEACTIVATE USER SUCCESS: User deactivated")
        
        # Verify user is inactive in list
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        users = users_response.json()
        user = next((u for u in users if u["id"] == user_id), None)
        assert user is not None
        assert user["is_active"] == False, "User should be inactive"
        print(f"VERIFY INACTIVE SUCCESS: User marked as inactive")
        
        # Reactivate user
        activate_response = requests.put(
            f"{BASE_URL}/api/admin/users/{user_id}/status",
            json={"is_active": True},
            headers=self.headers
        )
        assert activate_response.status_code == 200
        print(f"ACTIVATE USER SUCCESS: User reactivated")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=self.headers)
    
    def test_delete_user(self):
        """Test deleting a user"""
        # Create user
        unique_id = str(uuid.uuid4())[:8]
        test_user = {
            "name": f"TEST_DeleteUser_{unique_id}",
            "email": f"test_delete_{unique_id}@eti.com",
            "password": "test123",
            "role": "Counsellor",
            "phone": "9876543213"
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/users", json=test_user, headers=self.headers)
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Delete user
        delete_response = requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=self.headers)
        assert delete_response.status_code == 200, f"Failed to delete: {delete_response.text}"
        print(f"DELETE USER SUCCESS: User deleted")
        
        # Verify user is gone
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        users = users_response.json()
        user = next((u for u in users if u["id"] == user_id), None)
        assert user is None, "User should be deleted"
        print(f"VERIFY DELETE SUCCESS: User no longer in list")


class TestInternationalExams:
    """International Exams Module Tests - Phase 1 Features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_exam_type(self):
        """Test creating an international exam type"""
        unique_id = str(uuid.uuid4())[:8]
        exam_data = {
            "name": f"TEST_IELTS_{unique_id}",
            "description": "International English Language Testing System",
            "price": 15000.00
        }
        response = requests.post(f"{BASE_URL}/api/admin/exams", json=exam_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to create exam: {response.text}"
        data = response.json()
        assert data["name"] == exam_data["name"]
        assert data["price"] == exam_data["price"]
        print(f"CREATE EXAM TYPE SUCCESS: Created {data['name']} at ₹{data['price']}")
        return data["id"]
    
    def test_get_exam_types(self):
        """Test getting list of exam types"""
        response = requests.get(f"{BASE_URL}/api/admin/exams", headers=self.headers)
        assert response.status_code == 200, f"Failed to get exams: {response.text}"
        exams = response.json()
        assert isinstance(exams, list)
        print(f"GET EXAM TYPES SUCCESS: Found {len(exams)} exam types")
    
    def test_delete_exam_type(self):
        """Test deleting an exam type"""
        # First create
        unique_id = str(uuid.uuid4())[:8]
        exam_data = {
            "name": f"TEST_DeleteExam_{unique_id}",
            "description": "Test exam to delete",
            "price": 5000.00
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/exams", json=exam_data, headers=self.headers)
        assert create_response.status_code == 200
        exam_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/admin/exams/{exam_id}", headers=self.headers)
        assert delete_response.status_code == 200, f"Failed to delete exam: {delete_response.text}"
        print(f"DELETE EXAM TYPE SUCCESS: Exam type deleted")
    
    def test_create_exam_booking(self):
        """Test creating an exam booking - requires branch user"""
        # First create an exam type
        unique_id = str(uuid.uuid4())[:8]
        exam_data = {
            "name": f"TEST_BookingExam_{unique_id}",
            "description": "Test exam for booking",
            "price": 12000.00
        }
        exam_response = requests.post(f"{BASE_URL}/api/admin/exams", json=exam_data, headers=self.headers)
        assert exam_response.status_code == 200
        exam_id = exam_response.json()["id"]
        
        # Create branch user for booking
        branch_response = requests.get(f"{BASE_URL}/api/admin/branches", headers=self.headers)
        branches = branch_response.json()
        
        if len(branches) == 0:
            print("SKIP BOOKING TEST: No branches available")
            return
        
        branch_id = branches[0]["id"]
        
        # Create a counsellor user with branch
        unique_id2 = str(uuid.uuid4())[:8]
        counsellor_data = {
            "name": f"TEST_Counsellor_{unique_id2}",
            "email": f"test_counsellor_{unique_id2}@eti.com",
            "password": "test123",
            "role": "Counsellor",
            "branch_id": branch_id,
            "phone": "9876543214"
        }
        counsellor_response = requests.post(f"{BASE_URL}/api/admin/users", json=counsellor_data, headers=self.headers)
        assert counsellor_response.status_code == 200
        counsellor_id = counsellor_response.json()["id"]
        
        # Login as counsellor
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": counsellor_data["email"], "password": "test123"}
        )
        counsellor_token = login_response.json()["access_token"]
        counsellor_headers = {"Authorization": f"Bearer {counsellor_token}"}
        
        # Create booking
        booking_data = {
            "student_name": f"TEST_Student_{unique_id}",
            "student_phone": "9876543215",
            "student_email": f"test_student_{unique_id}@example.com",
            "exam_id": exam_id,
            "exam_date": "2026-02-15",
            "notes": "Test booking"
        }
        booking_response = requests.post(f"{BASE_URL}/api/exam-bookings", json=booking_data, headers=counsellor_headers)
        assert booking_response.status_code == 200, f"Failed to create booking: {booking_response.text}"
        booking = booking_response.json()
        assert booking["student_name"] == booking_data["student_name"]
        assert booking["exam_id"] == exam_id
        print(f"CREATE BOOKING SUCCESS: Booking created for {booking['student_name']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/users/{counsellor_id}", headers=self.headers)
    
    def test_get_exam_bookings(self):
        """Test getting exam bookings"""
        response = requests.get(f"{BASE_URL}/api/exam-bookings", headers=self.headers)
        assert response.status_code == 200, f"Failed to get bookings: {response.text}"
        bookings = response.json()
        assert isinstance(bookings, list)
        print(f"GET BOOKINGS SUCCESS: Found {len(bookings)} bookings")
    
    def test_update_booking_status(self):
        """Test updating booking status"""
        # First create an exam and booking
        unique_id = str(uuid.uuid4())[:8]
        
        # Create exam
        exam_data = {
            "name": f"TEST_StatusExam_{unique_id}",
            "description": "Test exam for status update",
            "price": 8000.00
        }
        exam_response = requests.post(f"{BASE_URL}/api/admin/exams", json=exam_data, headers=self.headers)
        assert exam_response.status_code == 200
        exam_id = exam_response.json()["id"]
        
        # Get a branch
        branch_response = requests.get(f"{BASE_URL}/api/admin/branches", headers=self.headers)
        branches = branch_response.json()
        
        if len(branches) == 0:
            print("SKIP STATUS UPDATE TEST: No branches available")
            return
        
        branch_id = branches[0]["id"]
        
        # Create counsellor with branch
        counsellor_data = {
            "name": f"TEST_StatusCounsellor_{unique_id}",
            "email": f"test_status_counsellor_{unique_id}@eti.com",
            "password": "test123",
            "role": "Counsellor",
            "branch_id": branch_id,
            "phone": "9876543216"
        }
        counsellor_response = requests.post(f"{BASE_URL}/api/admin/users", json=counsellor_data, headers=self.headers)
        counsellor_id = counsellor_response.json()["id"]
        
        # Login as counsellor
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": counsellor_data["email"], "password": "test123"}
        )
        counsellor_token = login_response.json()["access_token"]
        counsellor_headers = {"Authorization": f"Bearer {counsellor_token}"}
        
        # Create booking
        booking_data = {
            "student_name": f"TEST_StatusStudent_{unique_id}",
            "student_phone": "9876543217",
            "exam_id": exam_id,
            "exam_date": "2026-02-20"
        }
        booking_response = requests.post(f"{BASE_URL}/api/exam-bookings", json=booking_data, headers=counsellor_headers)
        assert booking_response.status_code == 200
        booking_id = booking_response.json()["id"]
        
        # Update status to Confirmed
        status_response = requests.put(
            f"{BASE_URL}/api/exam-bookings/{booking_id}/status",
            params={"status": "Confirmed"},
            headers=counsellor_headers
        )
        assert status_response.status_code == 200, f"Failed to update status: {status_response.text}"
        print(f"UPDATE STATUS SUCCESS: Booking status updated to Confirmed")
        
        # Update status to Completed
        status_response2 = requests.put(
            f"{BASE_URL}/api/exam-bookings/{booking_id}/status",
            params={"status": "Completed"},
            headers=counsellor_headers
        )
        assert status_response2.status_code == 200
        print(f"UPDATE STATUS SUCCESS: Booking status updated to Completed")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/users/{counsellor_id}", headers=self.headers)


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_cleanup_test_data(self):
        """Clean up TEST_ prefixed data"""
        # Clean up test users
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        users = users_response.json()
        deleted_users = 0
        for user in users:
            if user.get("name", "").startswith("TEST_") or user.get("email", "").startswith("test_"):
                requests.delete(f"{BASE_URL}/api/admin/users/{user['id']}", headers=self.headers)
                deleted_users += 1
        
        print(f"CLEANUP SUCCESS: Deleted {deleted_users} test users")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
