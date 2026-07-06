"""
Test file for Iteration 22 - ETI Educom Institute Management System
Testing:
1. Meta Tab Fix - API returns summary.total_leads
2. Insights Page Tabs - All tabs accessible 
3. My Responsibilities Feature - CRUD operations
4. Quiz CSV Import Feature
5. Deleted Leads Report - View and restore
6. Branch Admin Sidebar - Insights menu item
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://campus-control-15.preview.emergentagent.com').rstrip('/')


class TestAuth:
    """Authentication tests"""
    
    def test_branch_admin_login(self):
        """Test Branch Admin can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "branchadmin@etieducom.com", "password": "admin@123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "Branch Admin"
    
    def test_super_admin_login(self):
        """Test Super Admin can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@etieducom.com", "password": "admin@123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "Admin"
    
    def test_academic_controller_login(self):
        """Test Academic Controller can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "academic@etieducom.com", "password": "password"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "Academic Controller"


class TestMetaTabFix:
    """Test Meta Analytics API - Bug fix verification"""
    
    @pytest.fixture
    def branch_admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "branchadmin@etieducom.com", "password": "admin@123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json()["access_token"]
    
    def test_meta_analytics_returns_correct_structure(self, branch_admin_token):
        """Test Meta analytics API returns summary.total_leads (not metaAnalytics.total_leads)"""
        # Get branch ID
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        branch_id = me_response.json()["branch_id"]
        
        # Get Meta analytics
        response = requests.get(
            f"{BASE_URL}/api/meta/analytics/{branch_id}?days=30",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure - Bug fix: should have summary.total_leads
        assert "summary" in data
        assert "total_leads" in data["summary"]
        assert "period" in data
        assert "ai_analysis" in data
        print(f"Meta Analytics: summary.total_leads = {data['summary']['total_leads']}")


class TestInsightsPage:
    """Test Insights page APIs"""
    
    @pytest.fixture
    def branch_admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "branchadmin@etieducom.com", "password": "admin@123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json()["access_token"]
    
    def test_branch_insights_api(self, branch_admin_token):
        """Test AI Branch Insights API"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/ai-branch-insights",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data or "ai_analysis" in data
    
    def test_user_efficiency_api(self, branch_admin_token):
        """Test User Efficiency API"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/user-efficiency",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        assert response.status_code == 200
    
    def test_followups_pending_api(self, branch_admin_token):
        """Test Followups Pending API"""
        response = requests.get(
            f"{BASE_URL}/api/followups/pending",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        assert response.status_code == 200
    
    def test_feedback_api(self, branch_admin_token):
        """Test Feedback API"""
        response = requests.get(
            f"{BASE_URL}/api/feedback/all",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        assert response.status_code == 200
    
    def test_campaigns_api(self, branch_admin_token):
        """Test Campaigns API"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        assert response.status_code == 200
    
    def test_audit_logs_api(self, branch_admin_token):
        """Test Audit Logs API"""
        response = requests.get(
            f"{BASE_URL}/api/audit-logs",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        assert response.status_code == 200


class TestResponsibilities:
    """Test My Responsibilities feature"""
    
    @pytest.fixture
    def super_admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@etieducom.com", "password": "admin@123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture
    def branch_admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "branchadmin@etieducom.com", "password": "admin@123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json()["access_token"]
    
    def test_get_my_responsibilities(self, branch_admin_token):
        """Test getting own responsibilities"""
        response = requests.get(
            f"{BASE_URL}/api/responsibilities",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_all_responsibilities_super_admin(self, super_admin_token):
        """Test Super Admin can get all responsibilities"""
        response = requests.get(
            f"{BASE_URL}/api/responsibilities/all",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_responsibility_super_admin(self, super_admin_token):
        """Test Super Admin can create responsibility"""
        response = requests.post(
            f"{BASE_URL}/api/responsibilities",
            json={
                "role": "Counsellor",
                "title": "TEST - Daily Test Task",
                "description": "This is a test responsibility",
                "priority": "low",
                "category": "daily"
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST - Daily Test Task"
        
        # Cleanup - delete the test responsibility
        resp_id = data["id"]
        delete_response = requests.delete(
            f"{BASE_URL}/api/responsibilities/{resp_id}",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert delete_response.status_code == 200


class TestQuizExams:
    """Test Quiz Exams feature"""
    
    @pytest.fixture
    def academic_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "academic@etieducom.com", "password": "password"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json()["access_token"]
    
    def test_get_quizzes(self, academic_token):
        """Test getting all quizzes"""
        response = requests.get(
            f"{BASE_URL}/api/quiz-exams",
            headers={"Authorization": f"Bearer {academic_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_quiz(self, academic_token):
        """Test creating a quiz"""
        response = requests.post(
            f"{BASE_URL}/api/quiz-exams",
            json={
                "name": "TEST - Sample Quiz",
                "description": "Test quiz for testing",
                "duration_minutes": 10,
                "pass_percentage": 50,
                "questions": [
                    {
                        "question_text": "What is 2+2?",
                        "option_a": "3",
                        "option_b": "4",
                        "option_c": "5",
                        "option_d": "6",
                        "correct_answer": "B"
                    }
                ]
            },
            headers={"Authorization": f"Bearer {academic_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # API returns {message, exam_id} format
        assert "exam_id" in data or "id" in data
        
        # Cleanup - delete the test quiz
        quiz_id = data.get("exam_id") or data.get("id")
        delete_response = requests.delete(
            f"{BASE_URL}/api/quiz-exams/{quiz_id}",
            headers={"Authorization": f"Bearer {academic_token}"}
        )
        assert delete_response.status_code == 200
    
    def test_quiz_import_endpoint_exists(self, academic_token):
        """Test that quiz import endpoint exists"""
        # Test without file - should get validation error, not 404
        response = requests.post(
            f"{BASE_URL}/api/quiz-exams/import",
            data={"exam_name": "Test"},
            headers={"Authorization": f"Bearer {academic_token}"}
        )
        # Expecting 422 (validation error for missing file) or 400, not 404
        assert response.status_code in [400, 422]


class TestDeletedLeads:
    """Test Deleted Leads feature"""
    
    @pytest.fixture
    def branch_admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "branchadmin@etieducom.com", "password": "admin@123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json()["access_token"]
    
    def test_get_deleted_leads(self, branch_admin_token):
        """Test getting deleted leads"""
        response = requests.get(
            f"{BASE_URL}/api/leads/deleted",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_delete_and_restore_lead(self, branch_admin_token):
        """Test deleting and restoring a lead"""
        # Get a lead to test
        leads_response = requests.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        leads = leads_response.json()
        
        if len(leads) == 0:
            pytest.skip("No leads available for testing")
        
        lead_id = leads[0]["id"]
        lead_name = leads[0]["name"]
        
        # Delete the lead
        delete_response = requests.delete(
            f"{BASE_URL}/api/leads/{lead_id}",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        assert delete_response.status_code == 200
        
        # Verify lead appears in deleted leads
        deleted_response = requests.get(
            f"{BASE_URL}/api/leads/deleted",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        deleted_leads = deleted_response.json()
        deleted_ids = [l["id"] for l in deleted_leads]
        assert lead_id in deleted_ids
        
        # Restore the lead
        restore_response = requests.put(
            f"{BASE_URL}/api/leads/{lead_id}/restore",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        assert restore_response.status_code == 200
        
        # Verify lead no longer in deleted leads
        deleted_response2 = requests.get(
            f"{BASE_URL}/api/leads/deleted",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        deleted_leads2 = deleted_response2.json()
        deleted_ids2 = [l["id"] for l in deleted_leads2]
        assert lead_id not in deleted_ids2
        
        print(f"Successfully tested delete/restore for lead: {lead_name}")


class TestReports:
    """Test Reports functionality"""
    
    @pytest.fixture
    def branch_admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "branchadmin@etieducom.com", "password": "admin@123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json()["access_token"]
    
    def test_generate_leads_report(self, branch_admin_token):
        """Test generating leads report"""
        response = requests.get(
            f"{BASE_URL}/api/reports/generate?report_type=leads&format=csv",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
    
    def test_generate_enrollments_report(self, branch_admin_token):
        """Test generating enrollments report"""
        response = requests.get(
            f"{BASE_URL}/api/reports/generate?report_type=enrollments&format=csv",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
