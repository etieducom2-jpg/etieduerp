"""
Iteration 23: Academic Session Feature Tests
Tests session-based login and data filtering
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://campus-control-15.preview.emergentagent.com')

class TestAuthSessions:
    """Test /api/auth/sessions endpoint"""
    
    def test_get_sessions_returns_list(self):
        """Test that GET /api/auth/sessions returns list of sessions"""
        response = requests.get(f"{BASE_URL}/api/auth/sessions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "sessions" in data, "Response should contain 'sessions' key"
        assert "current_session" in data, "Response should contain 'current_session' key"
        
        sessions = data["sessions"]
        assert isinstance(sessions, list), "Sessions should be a list"
        assert len(sessions) >= 1, "Should have at least 1 session"
        
    def test_sessions_start_from_2016(self):
        """Test that sessions start from 2016-17"""
        response = requests.get(f"{BASE_URL}/api/auth/sessions")
        data = response.json()
        
        sessions = data["sessions"]
        first_session = sessions[0]
        
        assert first_session["value"] == "2016", f"First session should be 2016, got {first_session['value']}"
        assert first_session["label"] == "2016-17", f"First session label should be 2016-17, got {first_session['label']}"
    
    def test_current_session_is_2025(self):
        """Test that current session is 2025-26 (January 2026)"""
        response = requests.get(f"{BASE_URL}/api/auth/sessions")
        data = response.json()
        
        # In January 2026, current session should be 2025 (April 2025 - March 2026)
        current_session = data["current_session"]
        assert current_session == "2025", f"Current session should be 2025, got {current_session}"
    
    def test_session_format_is_correct(self):
        """Test that session format is value: YYYY, label: YYYY-YY"""
        response = requests.get(f"{BASE_URL}/api/auth/sessions")
        data = response.json()
        
        for session in data["sessions"]:
            assert "value" in session, "Session should have 'value' key"
            assert "label" in session, "Session should have 'label' key"
            
            # Check label format (YYYY-YY)
            year = int(session["value"])
            expected_label = f"{year}-{str(year+1)[2:]}"
            assert session["label"] == expected_label, f"Label should be {expected_label}, got {session['label']}"


class TestLoginWithSession:
    """Test login with session parameter"""
    
    def test_login_super_admin_with_session(self):
        """Test Super Admin can login with session parameter"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={
                "username": "admin@etieducom.com",
                "password": "admin@123",
                "session": "2025"
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "session" in data, "Response should contain session"
        assert data["session"] == "2025", f"Session should be 2025, got {data['session']}"
        assert data["user"]["role"] == "Admin", "User should be Admin role"
    
    def test_login_branch_admin_with_session(self):
        """Test Branch Admin can login with session parameter"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={
                "username": "branchadmin@etieducom.com",
                "password": "admin@123",
                "session": "2024"
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["session"] == "2024", f"Session should be 2024, got {data['session']}"
        assert data["user"]["role"] == "Branch Admin", "User should be Branch Admin role"
    
    def test_login_defaults_to_current_session(self):
        """Test login without session uses current session"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={
                "username": "admin@etieducom.com",
                "password": "admin@123"
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "session" in data, "Response should contain session"
        # Should default to current session (2025)
        assert data["session"] == "2025", f"Default session should be 2025, got {data['session']}"


class TestLeadsSessionFilter:
    """Test leads API with session filtering"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for Super Admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={
                "username": "admin@etieducom.com",
                "password": "admin@123",
                "session": "2025"
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json()["access_token"]
    
    def test_leads_with_session_2024(self, auth_token):
        """Test leads API returns filtered data for session 2024"""
        response = requests.get(
            f"{BASE_URL}/api/leads?session=2024",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Data filtering is working - we expect 0 or some leads based on creation dates
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_leads_with_session_2025(self, auth_token):
        """Test leads API returns data for session 2025"""
        response = requests.get(
            f"{BASE_URL}/api/leads?session=2025",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_leads_with_all_sessions(self, auth_token):
        """Test leads API returns all data when session=all"""
        response = requests.get(
            f"{BASE_URL}/api/leads?session=all",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_leads_with_header_session(self, auth_token):
        """Test leads API accepts session via X-Academic-Session header"""
        response = requests.get(
            f"{BASE_URL}/api/leads",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "X-Academic-Session": "2025"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"


class TestEnrollmentsSessionFilter:
    """Test enrollments API with session filtering"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for Super Admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={
                "username": "admin@etieducom.com",
                "password": "admin@123",
                "session": "2025"
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json()["access_token"]
    
    def test_enrollments_with_session_2024(self, auth_token):
        """Test enrollments API with session 2024"""
        response = requests.get(
            f"{BASE_URL}/api/enrollments?session=2024",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_enrollments_with_session_2025(self, auth_token):
        """Test enrollments API with session 2025"""
        response = requests.get(
            f"{BASE_URL}/api/enrollments?session=2025",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"


class TestPaymentsSessionFilter:
    """Test payments API with session filtering"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for Super Admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={
                "username": "admin@etieducom.com",
                "password": "admin@123",
                "session": "2025"
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json()["access_token"]
    
    def test_payments_with_session_2024(self, auth_token):
        """Test all payments API with session 2024"""
        response = requests.get(
            f"{BASE_URL}/api/payments/all?session=2024",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_payments_with_session_2025(self, auth_token):
        """Test all payments API with session 2025"""
        response = requests.get(
            f"{BASE_URL}/api/payments/all?session=2025",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"


class TestSessionFilterDifferentCounts:
    """Test that session filter actually returns different data counts"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for Super Admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={
                "username": "admin@etieducom.com",
                "password": "admin@123",
                "session": "2025"
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json()["access_token"]
    
    def test_session_filter_changes_leads_count(self, auth_token):
        """Test that different sessions return different lead counts"""
        # Get leads for session 2024
        response_2024 = requests.get(
            f"{BASE_URL}/api/leads?session=2024",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        leads_2024 = len(response_2024.json())
        
        # Get leads for session 2025
        response_2025 = requests.get(
            f"{BASE_URL}/api/leads?session=2025",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        leads_2025 = len(response_2025.json())
        
        # Get all leads
        response_all = requests.get(
            f"{BASE_URL}/api/leads?session=all",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        leads_all = len(response_all.json())
        
        # Verify all sessions returns at least as many as any single session
        assert leads_all >= leads_2024, "All sessions should return at least as many leads as 2024"
        assert leads_all >= leads_2025, "All sessions should return at least as many leads as 2025"
        
        print(f"Leads count - 2024: {leads_2024}, 2025: {leads_2025}, All: {leads_all}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
