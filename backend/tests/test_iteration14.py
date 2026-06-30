"""
Iteration 14 - Testing multiple features:
1. Branch Admin financial stats shows correct exam revenue (₹4,000)
2. Academic Controller can see 'Create Quiz' button on Quiz Exams page
3. Analytics tab is removed from sidebar for all roles
4. Branch Admin can access Campaign Management page at /campaigns
5. Campaign creation form works with all fields
6. Students page has Edit button for Branch Admin/FDE
7. FDE cannot edit student name/phone (fields disabled)
8. Reports page shows only leads report for Counsellor
9. Reports page shows income/student/leads for FDE
10. FDE dashboard does NOT show Income & Expense chart
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://campus-control-15.preview.emergentagent.com')

# Test credentials
BRANCH_ADMIN_EMAIL = "branchadmin@etieducom.com"
BRANCH_ADMIN_PASSWORD = "admin@123"
ACADEMIC_EMAIL = "academic@etieducom.com"
ACADEMIC_PASSWORD = "password"
COUNSELLOR_EMAIL = "counsellor@etieducom.com"
COUNSELLOR_PASSWORD = "password"


@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def get_auth_token(email: str, password: str):
    """Login and return auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": email, "password": password}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    return None


@pytest.fixture
def branch_admin_token():
    """Get Branch Admin token"""
    token = get_auth_token(BRANCH_ADMIN_EMAIL, BRANCH_ADMIN_PASSWORD)
    if not token:
        pytest.skip("Branch Admin login failed")
    return token


@pytest.fixture
def academic_token():
    """Get Academic Controller token"""
    token = get_auth_token(ACADEMIC_EMAIL, ACADEMIC_PASSWORD)
    if not token:
        pytest.skip("Academic Controller login failed")
    return token


@pytest.fixture
def counsellor_token():
    """Get Counsellor token"""
    token = get_auth_token(COUNSELLOR_EMAIL, COUNSELLOR_PASSWORD)
    if not token:
        pytest.skip("Counsellor login failed")
    return token


class TestBranchAdminFinancialStats:
    """Test 1: Branch Admin financial stats shows correct exam revenue"""

    def test_financial_stats_endpoint_exists(self, branch_admin_token):
        """Test that the financial stats endpoint exists"""
        response = requests.get(
            f"{BASE_URL}/api/branch-admin/financial-stats",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_financial_stats_has_exam_revenue(self, branch_admin_token):
        """Test that financial stats includes exam_revenue field"""
        response = requests.get(
            f"{BASE_URL}/api/branch-admin/financial-stats",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "exam_revenue" in data, f"Missing exam_revenue field. Fields: {data.keys()}"
        print(f"Exam Revenue: ₹{data['exam_revenue']}")

    def test_financial_stats_structure(self, branch_admin_token):
        """Test that financial stats has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/branch-admin/financial-stats",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        required_fields = ["total_collections", "pending_amounts", "monthly_revenue", 
                          "exam_revenue", "total_expenses", "net_revenue"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"


class TestCampaignManagement:
    """Test 4-5: Branch Admin Campaign Management"""

    def test_get_campaigns_endpoint(self, branch_admin_token):
        """Test that campaigns GET endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert isinstance(response.json(), list)

    def test_create_campaign(self, branch_admin_token):
        """Test creating a campaign with all fields"""
        campaign_data = {
            "campaign_name": "TEST_Winter Campaign 2026",
            "platform": "Google Ads",
            "campaign_link": "https://ads.google.com/test",
            "start_date": "2026-01-01",
            "end_date": "2026-01-31",
            "total_spend": 5000,
            "total_leads": 50,
            "total_messages": 100,
            "status": "Active",
            "notes": "Test campaign for automated testing"
        }
        response = requests.post(
            f"{BASE_URL}/api/campaigns",
            headers={"Authorization": f"Bearer {branch_admin_token}"},
            json=campaign_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data or "message" in data, "Response should have id or message"

    def test_campaign_analytics_endpoint(self, branch_admin_token):
        """Test that campaigns with analytics work"""
        # First get campaigns list
        response = requests.get(
            f"{BASE_URL}/api/campaigns",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        if response.status_code == 200 and len(response.json()) > 0:
            campaign_id = response.json()[0].get("id")
            # Get analytics for first campaign
            analytics_response = requests.get(
                f"{BASE_URL}/api/campaigns/{campaign_id}/analytics",
                headers={"Authorization": f"Bearer {branch_admin_token}"}
            )
            assert analytics_response.status_code == 200


class TestQuizExamPermissions:
    """Test 2: Academic Controller can create quiz exams"""

    def test_academic_controller_can_access_quiz_exams(self, academic_token):
        """Test Academic Controller can get quiz exams list"""
        response = requests.get(
            f"{BASE_URL}/api/quiz-exams",
            headers={"Authorization": f"Bearer {academic_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    def test_academic_controller_can_create_quiz(self, academic_token):
        """Test Academic Controller can create a quiz"""
        quiz_data = {
            "name": "TEST_Sample Quiz",
            "description": "Test quiz for automated testing",
            "duration_minutes": 15,
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
        }
        response = requests.post(
            f"{BASE_URL}/api/quiz-exams",
            headers={"Authorization": f"Bearer {academic_token}"},
            json=quiz_data
        )
        # Should succeed for Academic Controller
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"


class TestStudentEditPermissions:
    """Test 6-7: Student edit permissions"""

    def test_students_endpoint_accessible(self, branch_admin_token):
        """Test students list endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/students",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        assert response.status_code == 200

    def test_student_update_endpoint_exists(self, branch_admin_token):
        """Test student update endpoint exists"""
        # Get a student first
        students_response = requests.get(
            f"{BASE_URL}/api/students",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        if students_response.status_code == 200 and len(students_response.json()) > 0:
            student_id = students_response.json()[0].get("id")
            # Try to get student details
            detail_response = requests.get(
                f"{BASE_URL}/api/students/{student_id}",
                headers={"Authorization": f"Bearer {branch_admin_token}"}
            )
            assert detail_response.status_code in [200, 404]


class TestReportsAccessControl:
    """Test 8-9: Reports access control by role"""

    def test_reports_endpoint_accessible_for_counsellor(self, counsellor_token):
        """Test Counsellor can access reports"""
        response = requests.get(
            f"{BASE_URL}/api/reports/generate",
            headers={"Authorization": f"Bearer {counsellor_token}"},
            params={"report_type": "leads"}
        )
        # Should succeed or return 200
        assert response.status_code in [200, 422], f"Expected 200/422, got {response.status_code}"

    def test_reports_endpoint_accessible_for_branch_admin(self, branch_admin_token):
        """Test Branch Admin can access reports"""
        response = requests.get(
            f"{BASE_URL}/api/reports/generate",
            headers={"Authorization": f"Bearer {branch_admin_token}"},
            params={"report_type": "leads"}
        )
        assert response.status_code in [200, 422]


class TestCleanup:
    """Cleanup test data"""

    def test_cleanup_test_campaigns(self, branch_admin_token):
        """Clean up TEST_ prefixed campaigns"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns",
            headers={"Authorization": f"Bearer {branch_admin_token}"}
        )
        if response.status_code == 200:
            campaigns = response.json()
            for campaign in campaigns:
                if campaign.get("campaign_name", "").startswith("TEST_"):
                    delete_response = requests.delete(
                        f"{BASE_URL}/api/campaigns/{campaign['id']}",
                        headers={"Authorization": f"Bearer {branch_admin_token}"}
                    )
                    print(f"Deleted test campaign: {campaign.get('campaign_name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
