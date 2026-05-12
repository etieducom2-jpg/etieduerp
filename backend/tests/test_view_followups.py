"""
Test cases for View Followups feature
- Tests GET /api/leads/{lead_id}/followups endpoint
- Tests role-based access (Admin, Branch Admin, Counsellor)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
BRANCH_ADMIN_CREDS = {"username": "branchadmin@etieducom.com", "password": "admin@123", "session": "2026-2027"}
SUPER_ADMIN_CREDS = {"username": "admin@etieducom.com", "password": "admin@123", "session": "2026-2027"}
COUNSELLOR_CREDS = {"username": "counsellor@etieducom.com", "password": "password", "session": "2026-2027"}

# Test lead with followups
TEST_LEAD_ID = "eb46513d-193f-4740-9a03-3f5b2e521769"


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def get_auth_token(api_client, credentials):
    """Helper to get auth token"""
    response = api_client.post(
        f"{BASE_URL}/api/auth/login",
        data=credentials,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    return None


class TestViewFollowupsAPI:
    """Tests for GET /api/leads/{lead_id}/followups endpoint"""
    
    def test_branch_admin_can_view_followups(self, api_client):
        """Branch Admin should be able to view followups for a lead"""
        token = get_auth_token(api_client, BRANCH_ADMIN_CREDS)
        assert token is not None, "Branch Admin login failed"
        
        response = api_client.get(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/followups",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 2, f"Expected at least 2 followups, got {len(data)}"
        
        # Verify followup structure
        for followup in data:
            assert "id" in followup, "Followup should have id"
            assert "lead_id" in followup, "Followup should have lead_id"
            assert "note" in followup, "Followup should have note"
            assert "followup_date" in followup, "Followup should have followup_date"
            assert "added_by_name" in followup or "created_by_name" in followup, "Followup should have creator name"
            assert followup["lead_id"] == TEST_LEAD_ID, "Followup should belong to the requested lead"
    
    def test_super_admin_can_view_followups(self, api_client):
        """Super Admin should be able to view followups for a lead"""
        token = get_auth_token(api_client, SUPER_ADMIN_CREDS)
        assert token is not None, "Super Admin login failed"
        
        response = api_client.get(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/followups",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 2, f"Expected at least 2 followups, got {len(data)}"
    
    def test_counsellor_can_view_followups(self, api_client):
        """Counsellor should also be able to view followups (API level access)"""
        token = get_auth_token(api_client, COUNSELLOR_CREDS)
        assert token is not None, "Counsellor login failed"
        
        response = api_client.get(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/followups",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Status assertion - API allows access, UI restricts visibility
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_followups_sorted_by_date_descending(self, api_client):
        """Followups should be sorted by created_at descending (newest first)"""
        token = get_auth_token(api_client, BRANCH_ADMIN_CREDS)
        assert token is not None, "Branch Admin login failed"
        
        response = api_client.get(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/followups",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) >= 2:
            # Check that followups are sorted by created_at descending
            for i in range(len(data) - 1):
                current_date = data[i].get("created_at", "")
                next_date = data[i + 1].get("created_at", "")
                assert current_date >= next_date, "Followups should be sorted by date descending"
    
    def test_followups_for_nonexistent_lead(self, api_client):
        """Should return empty list for non-existent lead"""
        token = get_auth_token(api_client, BRANCH_ADMIN_CREDS)
        assert token is not None, "Branch Admin login failed"
        
        response = api_client.get(
            f"{BASE_URL}/api/leads/nonexistent-lead-id/followups",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should return 200 with empty list (not 404)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 0, "Should return empty list for non-existent lead"
    
    def test_unauthorized_access_without_token(self, api_client):
        """Should return 401 without authentication"""
        response = api_client.get(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}/followups"
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_branch_admin_login(self, api_client):
        """Branch Admin should be able to login"""
        response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            data=BRANCH_ADMIN_CREDS,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "Branch Admin"
    
    def test_super_admin_login(self, api_client):
        """Super Admin should be able to login"""
        response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            data=SUPER_ADMIN_CREDS,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "Admin"
    
    def test_counsellor_login(self, api_client):
        """Counsellor should be able to login"""
        response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            data=COUNSELLOR_CREDS,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "Counsellor"


class TestLeadsEndpoint:
    """Test leads endpoint to verify test data exists"""
    
    def test_get_leads_list(self, api_client):
        """Should be able to get leads list"""
        token = get_auth_token(api_client, BRANCH_ADMIN_CREDS)
        assert token is not None, "Branch Admin login failed"
        
        response = api_client.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_get_specific_lead(self, api_client):
        """Should be able to get specific lead (John Smith)"""
        token = get_auth_token(api_client, BRANCH_ADMIN_CREDS)
        assert token is not None, "Branch Admin login failed"
        
        response = api_client.get(
            f"{BASE_URL}/api/leads/{TEST_LEAD_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("id") == TEST_LEAD_ID, "Lead ID should match"
        assert "name" in data, "Lead should have name"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
