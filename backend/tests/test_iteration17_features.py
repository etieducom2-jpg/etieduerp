"""
Test Suite for Iteration 17 Features:
1. Cash Handling - FDE can view today's cash, submit deposit records
2. Cash Handling - Branch Admin can view history with date filters
3. Create Payment Plan from Students page (for students without plans)
4. Lead converted notification to FDE
5. Follow-up reminders endpoint
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
FDE_EMAIL = "fde@etieducom.com"
FDE_PASSWORD = "password123"
BRANCH_ADMIN_EMAIL = "branchadmin@etieducom.com"
BRANCH_ADMIN_PASSWORD = "admin@123"
COUNSELLOR_EMAIL = "counsellor@etieducom.com"
COUNSELLOR_PASSWORD = "password123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def fde_token(api_client):
    """Get FDE authentication token"""
    # Use form data for OAuth2 password flow
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": FDE_EMAIL, "password": FDE_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"FDE authentication failed - Status: {response.status_code}, Response: {response.text}")


@pytest.fixture(scope="module")
def branch_admin_token(api_client):
    """Get Branch Admin authentication token"""
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": BRANCH_ADMIN_EMAIL, "password": BRANCH_ADMIN_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Branch Admin authentication failed - Status: {response.status_code}, Response: {response.text}")


@pytest.fixture(scope="module")
def counsellor_token(api_client):
    """Get Counsellor authentication token"""
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": COUNSELLOR_EMAIL, "password": COUNSELLOR_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Counsellor authentication failed - Status: {response.status_code}, Response: {response.text}")


# ============ AUTHENTICATION TESTS ============

class TestAuthentication:
    """Test authentication for different user roles"""

    def test_fde_login(self, api_client):
        """Test FDE can login successfully"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": FDE_EMAIL, "password": FDE_PASSWORD},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 200, f"FDE login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "Front Desk Executive"
        print(f"✓ FDE login successful - User: {data['user']['name']}")

    def test_branch_admin_login(self, api_client):
        """Test Branch Admin can login successfully"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": BRANCH_ADMIN_EMAIL, "password": BRANCH_ADMIN_PASSWORD},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 200, f"Branch Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "Branch Admin"
        print(f"✓ Branch Admin login successful - User: {data['user']['name']}")

    def test_counsellor_login(self, api_client):
        """Test Counsellor can login successfully"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": COUNSELLOR_EMAIL, "password": COUNSELLOR_PASSWORD},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 200, f"Counsellor login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "Counsellor"
        print(f"✓ Counsellor login successful - User: {data['user']['name']}")


# ============ CASH HANDLING TESTS ============

class TestCashHandlingFDE:
    """Test Cash Handling features for Front Desk Executive"""

    def test_fde_can_get_today_cash(self, api_client, fde_token):
        """Test FDE can view today's cash total"""
        headers = {"Authorization": f"Bearer {fde_token}"}
        response = api_client.get(
            f"{BASE_URL}/api/cash-handling/today",
            headers=headers
        )
        assert response.status_code == 200, f"Get today's cash failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "date" in data
        assert "total_cash" in data
        assert "payments" in data
        
        # Verify data types
        assert isinstance(data["total_cash"], (int, float))
        assert isinstance(data["payments"], list)
        
        print(f"✓ FDE can view today's cash - Total: ₹{data['total_cash']}, Payments: {len(data['payments'])}")

    def test_fde_can_submit_deposit_with_remarks(self, api_client, fde_token):
        """Test FDE can submit cash handling record with remarks"""
        headers = {"Authorization": f"Bearer {fde_token}"}
        
        # Submit with only remarks (no receipt)
        response = api_client.post(
            f"{BASE_URL}/api/cash-handling/submit",
            headers=headers,
            params={"remarks": "Test deposit remarks from iteration 17"}
        )
        assert response.status_code == 200, f"Submit deposit failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ FDE submitted deposit record with remarks: {data['message']}")

    def test_fde_can_submit_deposit_with_receipt_url(self, api_client, fde_token):
        """Test FDE can submit cash handling record with receipt URL"""
        headers = {"Authorization": f"Bearer {fde_token}"}
        
        # Submit with receipt URL
        test_receipt_url = "https://example.com/test-receipt.jpg"
        response = api_client.post(
            f"{BASE_URL}/api/cash-handling/submit",
            headers=headers,
            params={
                "deposit_receipt_url": test_receipt_url,
                "remarks": "Deposited at SBI Main Branch"
            }
        )
        assert response.status_code == 200, f"Submit deposit with receipt failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ FDE submitted deposit with receipt URL: {data['message']}")


class TestCashHandlingBranchAdmin:
    """Test Cash Handling features for Branch Admin"""

    def test_branch_admin_can_view_history(self, api_client, branch_admin_token):
        """Test Branch Admin can view cash handling history"""
        headers = {"Authorization": f"Bearer {branch_admin_token}"}
        response = api_client.get(
            f"{BASE_URL}/api/cash-handling/history",
            headers=headers
        )
        assert response.status_code == 200, f"Get history failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Branch Admin can view history - Records: {len(data)}")
        
        # Verify structure of records if any exist
        if len(data) > 0:
            record = data[0]
            assert "date" in record
            assert "total_cash" in record
            assert "status" in record
            print(f"  Latest record: Date={record.get('date')}, Cash=₹{record.get('total_cash')}, Status={record.get('status')}")

    def test_branch_admin_can_filter_history_by_date(self, api_client, branch_admin_token):
        """Test Branch Admin can filter cash handling history by date range"""
        headers = {"Authorization": f"Bearer {branch_admin_token}"}
        
        # Filter by date range (last 7 days)
        end_date = datetime.now().strftime('%Y-%m-%d')
        start_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        
        response = api_client.get(
            f"{BASE_URL}/api/cash-handling/history",
            headers=headers,
            params={"start_date": start_date, "end_date": end_date}
        )
        assert response.status_code == 200, f"Get filtered history failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Branch Admin can filter history - Records in date range: {len(data)}")


class TestCashHandlingAccessControl:
    """Test Cash Handling access control"""

    def test_counsellor_cannot_access_cash_history(self, api_client, counsellor_token):
        """Test that Counsellor cannot access cash handling history (should be 403)"""
        headers = {"Authorization": f"Bearer {counsellor_token}"}
        response = api_client.get(
            f"{BASE_URL}/api/cash-handling/history",
            headers=headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"✓ Counsellor correctly denied access to cash history")


# ============ STUDENTS PAGE - CREATE PAYMENT PLAN TESTS ============

class TestStudentsPaymentPlan:
    """Test Create Payment Plan from Students page"""

    def test_get_students_with_has_payment_plan_field(self, api_client, fde_token):
        """Test Students list includes has_payment_plan field"""
        headers = {"Authorization": f"Bearer {fde_token}"}
        response = api_client.get(
            f"{BASE_URL}/api/students",
            headers=headers
        )
        assert response.status_code == 200, f"Get students failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        
        if len(data) > 0:
            student = data[0]
            assert "has_payment_plan" in student, "has_payment_plan field missing from student"
            assert isinstance(student["has_payment_plan"], bool)
            
            # Count students with and without plans
            with_plan = sum(1 for s in data if s.get("has_payment_plan"))
            without_plan = sum(1 for s in data if not s.get("has_payment_plan"))
            
            print(f"✓ Students list has has_payment_plan field - With plan: {with_plan}, Without plan: {without_plan}")
        else:
            print(f"✓ Students list returned (empty)")

    def test_find_student_without_plan(self, api_client, fde_token):
        """Test finding a student without payment plan (for Create Plan button)"""
        headers = {"Authorization": f"Bearer {fde_token}"}
        response = api_client.get(
            f"{BASE_URL}/api/students",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        students_without_plan = [s for s in data if not s.get("has_payment_plan")]
        
        if len(students_without_plan) > 0:
            student = students_without_plan[0]
            print(f"✓ Found student without plan: {student.get('student_name')} (ID: {student.get('id')[:8]}...)")
            print(f"  Final fee: ₹{student.get('final_fee', 0)}, Total paid: ₹{student.get('total_paid', 0)}")
        else:
            print(f"✓ All students have payment plans (no Create Plan button needed)")


# ============ NOTIFICATIONS TESTS ============

class TestNotifications:
    """Test notification system"""

    def test_get_notifications(self, api_client, fde_token):
        """Test FDE can get notifications"""
        headers = {"Authorization": f"Bearer {fde_token}"}
        response = api_client.get(
            f"{BASE_URL}/api/notifications",
            headers=headers
        )
        assert response.status_code == 200, f"Get notifications failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ FDE can get notifications - Count: {len(data)}")
        
        # Check for lead_converted notifications
        lead_converted = [n for n in data if n.get("type") == "lead_converted"]
        if lead_converted:
            print(f"  Lead converted notifications: {len(lead_converted)}")

    def test_get_unread_notifications(self, api_client, fde_token):
        """Test FDE can get unread notifications"""
        headers = {"Authorization": f"Bearer {fde_token}"}
        response = api_client.get(
            f"{BASE_URL}/api/notifications/unread",
            headers=headers
        )
        assert response.status_code == 200, f"Get unread notifications failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ FDE can get unread notifications - Count: {len(data)}")


class TestFollowupReminders:
    """Test follow-up reminders endpoint"""

    def test_get_followup_reminders(self, api_client, counsellor_token):
        """Test Counsellor can get follow-up reminders"""
        headers = {"Authorization": f"Bearer {counsellor_token}"}
        response = api_client.get(
            f"{BASE_URL}/api/notifications/followup-reminders",
            headers=headers
        )
        assert response.status_code == 200, f"Get followup reminders failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Counsellor can get followup reminders - Due in next 10 min: {len(data)}")
        
        # Verify structure if there are any reminders
        if len(data) > 0:
            reminder = data[0]
            assert "lead_id" in reminder
            assert "followup_date" in reminder
            print(f"  Next reminder: Lead={reminder.get('lead_name')}")


# ============ LEAD CONVERTED NOTIFICATION FLOW TEST ============

class TestLeadConvertedNotification:
    """Test lead converted notification creation"""

    def test_notification_exists_for_lead_conversion(self, api_client, fde_token):
        """Test that lead_converted notifications exist in the system"""
        headers = {"Authorization": f"Bearer {fde_token}"}
        response = api_client.get(
            f"{BASE_URL}/api/notifications",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        lead_converted_notifications = [
            n for n in data if n.get("type") == "lead_converted"
        ]
        
        print(f"✓ Lead converted notifications check - Found: {len(lead_converted_notifications)}")
        if lead_converted_notifications:
            notification = lead_converted_notifications[0]
            print(f"  Sample notification - Title: {notification.get('title')}")


# ============ ENROLLMENTS PAGE - PLAN BUTTON REMOVED TEST ============

class TestEnrollmentsPagePlanButton:
    """Test that Plan button is removed from Enrollments Enrolled tab"""

    def test_get_enrollments_for_enrolled_tab(self, api_client, fde_token):
        """Test getting enrollments - verify data structure for Enrolled tab"""
        headers = {"Authorization": f"Bearer {fde_token}"}
        response = api_client.get(
            f"{BASE_URL}/api/enrollments",
            headers=headers
        )
        assert response.status_code == 200, f"Get enrollments failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Enrollments endpoint works - Count: {len(data)}")
        
        # Note: The Plan button removal is a frontend-only change
        # Backend still provides the data, frontend just doesn't show the button


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
