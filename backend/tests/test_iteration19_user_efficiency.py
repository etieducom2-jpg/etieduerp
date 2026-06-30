"""
Test cases for Iteration 19: User Efficiency Analysis and Audio Notifications
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUserEfficiencyAPI:
    """Test User Efficiency Analysis API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.branch_admin_creds = {
            "email": "branchadmin@etieducom.com",
            "password": "admin@123"
        }
        self.super_admin_creds = {
            "email": "admin@etieducom.com", 
            "password": "admin@123"
        }
        self.counsellor_creds = {
            "email": "counsellor@etieducom.com",
            "password": "password123"
        }
    
    def get_auth_token(self, credentials):
        """Helper to get auth token - uses form-urlencoded format"""
        data = {
            "username": credentials["email"],
            "password": credentials["password"]
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", data=data)
        if response.status_code == 200:
            return response.json().get('access_token')
        return None
    
    def test_health_check(self):
        """Test that the API is accessible by checking login endpoint"""
        # Try a simple login test to verify API is reachable
        data = {
            "username": self.branch_admin_creds["email"],
            "password": self.branch_admin_creds["password"]
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", data=data)
        assert response.status_code == 200
        print("✓ API is accessible")
    
    def test_user_efficiency_branch_admin_access(self):
        """Test that Branch Admin can access user efficiency endpoint"""
        token = self.get_auth_token(self.branch_admin_creds)
        assert token is not None, "Branch Admin login failed"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/user-efficiency", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "generated_at" in data, "Missing generated_at field"
        assert "analysis_period" in data, "Missing analysis_period field"
        assert "counsellors" in data, "Missing counsellors field"
        assert "fdes" in data, "Missing fdes field"
        assert "trainers" in data, "Missing trainers field"
        assert "all_users_ranked" in data, "Missing all_users_ranked field"
        
        print(f"✓ User efficiency endpoint accessible by Branch Admin")
        print(f"  - Analysis period: {data['analysis_period']}")
        print(f"  - Counsellors count: {len(data['counsellors'])}")
        print(f"  - FDEs count: {len(data['fdes'])}")
        print(f"  - Trainers count: {len(data['trainers'])}")
        print(f"  - All users ranked count: {len(data['all_users_ranked'])}")
        print(f"  - AI analysis available: {data.get('ai_powered', False)}")
    
    def test_user_efficiency_counsellor_access_denied(self):
        """Test that Counsellors cannot access user efficiency endpoint"""
        token = self.get_auth_token(self.counsellor_creds)
        if not token:
            pytest.skip("Counsellor credentials not available")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/user-efficiency", headers=headers)
        
        # Should be 403 or 401 for unauthorized access
        assert response.status_code in [401, 403], f"Expected 401/403 for Counsellor, got {response.status_code}"
        print("✓ User efficiency correctly denied to Counsellor role")
    
    def test_user_efficiency_response_structure(self):
        """Test the detailed structure of user efficiency response"""
        token = self.get_auth_token(self.branch_admin_creds)
        assert token is not None
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/user-efficiency", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Test counsellor structure if any exist
        if data['counsellors']:
            counsellor = data['counsellors'][0]
            required_fields = ['user_id', 'name', 'email', 'role', 'leads_assigned', 
                             'leads_converted', 'conversion_rate', 'efficiency_score']
            for field in required_fields:
                assert field in counsellor, f"Counsellor missing field: {field}"
            print(f"✓ Counsellor data structure validated")
        
        # Test FDE structure if any exist
        if data['fdes']:
            fde = data['fdes'][0]
            required_fields = ['user_id', 'name', 'email', 'role', 'enrollments_processed',
                             'payments_collected', 'task_completion_rate', 'efficiency_score']
            for field in required_fields:
                assert field in fde, f"FDE missing field: {field}"
            print(f"✓ FDE data structure validated")
        
        # Test trainer structure if any exist
        if data['trainers']:
            trainer = data['trainers'][0]
            required_fields = ['user_id', 'name', 'email', 'role', 'total_batches',
                             'active_students', 'attendance_rate', 'efficiency_score']
            for field in required_fields:
                assert field in trainer, f"Trainer missing field: {field}"
            print(f"✓ Trainer data structure validated")
        
        # Test all_users_ranked is sorted by efficiency_score descending
        if len(data['all_users_ranked']) > 1:
            for i in range(len(data['all_users_ranked']) - 1):
                assert data['all_users_ranked'][i]['efficiency_score'] >= data['all_users_ranked'][i+1]['efficiency_score'], \
                    "Users should be ranked by efficiency_score descending"
            print("✓ Users correctly ranked by efficiency score")
        
        # Test AI analysis structure if present
        if data.get('ai_analysis'):
            ai = data['ai_analysis']
            # AI analysis can have different structures based on LLM response
            print(f"✓ AI analysis present: {list(ai.keys())}")
        else:
            print("⚠ AI analysis not available (LLM key may not be configured)")


class TestFollowupRemindersAPI:
    """Test Followup Reminders API for Audio Notifications"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.branch_admin_creds = {
            "email": "branchadmin@etieducom.com",
            "password": "admin@123"
        }
        self.counsellor_creds = {
            "email": "counsellor@etieducom.com",
            "password": "password123"
        }
    
    def get_auth_token(self, credentials):
        """Helper to get auth token - uses form-urlencoded format"""
        data = {
            "username": credentials["email"],
            "password": credentials["password"]
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", data=data)
        if response.status_code == 200:
            return response.json().get('access_token')
        return None
    
    def test_followup_due_soon_endpoint(self):
        """Test that followup due-soon endpoint works"""
        token = self.get_auth_token(self.branch_admin_creds)
        assert token is not None, "Branch Admin login failed"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/followups/due-soon", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Followup due-soon endpoint working - returned {len(data)} followups")
    
    def test_notifications_endpoint(self):
        """Test that notifications endpoint works"""
        token = self.get_auth_token(self.branch_admin_creds)
        assert token is not None
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Notifications endpoint working - returned {len(data)} notifications")
    
    def test_notifications_unread_count(self):
        """Test that notifications unread count endpoint works"""
        token = self.get_auth_token(self.branch_admin_creds)
        assert token is not None
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "count" in data, "Response should have count field"
        print(f"✓ Notifications unread count endpoint working - {data['count']} unread")


class TestSidebarUserEfficiencyLink:
    """Test Sidebar User Efficiency Link visibility"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.branch_admin_creds = {
            "email": "branchadmin@etieducom.com",
            "password": "admin@123"
        }
    
    def get_auth_token(self, credentials):
        """Helper to get auth token - uses form-urlencoded format"""
        data = {
            "username": credentials["email"],
            "password": credentials["password"]
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", data=data)
        if response.status_code == 200:
            return response.json().get('access_token')
        return None
    
    def test_branch_admin_login_returns_correct_role(self):
        """Test that Branch Admin login returns correct role for sidebar visibility"""
        data = {
            "username": self.branch_admin_creds["email"],
            "password": self.branch_admin_creds["password"]
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", data=data)
        
        assert response.status_code == 200
        data = response.json()
        user = data.get('user', {})
        assert user.get('role') == 'Branch Admin', f"Expected 'Branch Admin', got {user.get('role')}"
        print(f"✓ Branch Admin login returns correct role: {user.get('role')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
