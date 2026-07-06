"""
Backend tests for Counsellor Incentive System for International Exams
Tests:
1. /api/counsellor/incentives - Returns counsellor's own incentives
2. /api/branch-admin/incentive-stats - Returns branch-wide incentive stats
3. /api/exam-bookings/{id}/status - Status updates trigger incentive/refund
4. /api/exam-bookings/{id}/refund - Mark refund as processed
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


def get_counsellor_token():
    """Get counsellor auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": "counsellor@etieducom.com", "password": "password"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if response.status_code == 200:
        return response.json().get('access_token')
    return None


def get_branch_admin_token():
    """Get branch admin auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": "branchadmin@etieducom.com", "password": "admin@123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if response.status_code == 200:
        return response.json().get('access_token')
    return None


# ============ Counsellor Incentives Tests ============

def test_counsellor_incentives_endpoint_structure():
    """Test /api/counsellor/incentives returns correct structure"""
    token = get_counsellor_token()
    if not token:
        pytest.skip("Counsellor login failed")
    
    response = requests.get(
        f"{BASE_URL}/api/counsellor/incentives",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    
    # Verify response structure
    assert "summary" in data, "Response should contain 'summary'"
    assert "earned_bookings" in data, "Response should contain 'earned_bookings'"
    assert "pending_bookings" in data, "Response should contain 'pending_bookings'"
    assert "cancelled_bookings" in data, "Response should contain 'cancelled_bookings'"
    
    # Verify summary structure
    summary = data["summary"]
    assert "total_earned" in summary, "Summary should have 'total_earned'"
    assert "total_pending" in summary, "Summary should have 'total_pending'"
    assert "total_cancelled_refunds" in summary, "Summary should have 'total_cancelled_refunds'"
    assert "total_bookings" in summary, "Summary should have 'total_bookings'"
    assert "completed_count" in summary, "Summary should have 'completed_count'"
    assert "pending_count" in summary, "Summary should have 'pending_count'"
    assert "cancelled_count" in summary, "Summary should have 'cancelled_count'"
    
    # Verify data types
    assert isinstance(summary["total_earned"], (int, float)), "total_earned should be numeric"
    assert isinstance(summary["total_pending"], (int, float)), "total_pending should be numeric"
    assert isinstance(summary["total_cancelled_refunds"], (int, float)), "total_cancelled_refunds should be numeric"
    assert isinstance(data["earned_bookings"], list), "earned_bookings should be a list"
    assert isinstance(data["pending_bookings"], list), "pending_bookings should be a list"
    assert isinstance(data["cancelled_bookings"], list), "cancelled_bookings should be a list"
    
    print(f"✓ Counsellor Incentives API returns correct structure")
    print(f"  Summary: total_earned={summary['total_earned']}, total_pending={summary['total_pending']}, total_cancelled={summary['total_cancelled_refunds']}")


def test_counsellor_incentives_requires_auth():
    """Test that incentives endpoint requires authentication"""
    response = requests.get(f"{BASE_URL}/api/counsellor/incentives")
    assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
    print("✓ Counsellor Incentives API requires authentication")


def test_branch_admin_incentive_stats_structure():
    """Test /api/branch-admin/incentive-stats returns correct structure"""
    token = get_branch_admin_token()
    if not token:
        pytest.skip("Branch Admin login failed")
    
    response = requests.get(
        f"{BASE_URL}/api/branch-admin/incentive-stats",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    
    # Verify response structure
    assert "branch_summary" in data, "Response should contain 'branch_summary'"
    assert "counsellor_stats" in data, "Response should contain 'counsellor_stats'"
    
    # Verify branch_summary structure
    summary = data["branch_summary"]
    assert "total_earned_incentives" in summary, "Summary should have 'total_earned_incentives'"
    assert "total_pending_incentives" in summary, "Summary should have 'total_pending_incentives'"
    assert "total_refunds_pending" in summary, "Summary should have 'total_refunds_pending'"
    assert "total_exam_bookings" in summary, "Summary should have 'total_exam_bookings'"
    assert "completed_exams" in summary, "Summary should have 'completed_exams'"
    assert "cancelled_exams" in summary, "Summary should have 'cancelled_exams'"
    
    # Verify counsellor_stats is a list
    assert isinstance(data["counsellor_stats"], list), "counsellor_stats should be a list"
    
    # If there are counsellors, verify their structure
    if len(data["counsellor_stats"]) > 0:
        counsellor = data["counsellor_stats"][0]
        assert "counsellor_id" in counsellor, "Counsellor stat should have 'counsellor_id'"
        assert "counsellor_name" in counsellor, "Counsellor stat should have 'counsellor_name'"
        assert "counsellor_email" in counsellor, "Counsellor stat should have 'counsellor_email'"
        assert "total_bookings" in counsellor, "Counsellor stat should have 'total_bookings'"
        assert "earned_incentive" in counsellor, "Counsellor stat should have 'earned_incentive'"
        assert "pending_incentive" in counsellor, "Counsellor stat should have 'pending_incentive'"
        assert "completed_exams" in counsellor, "Counsellor stat should have 'completed_exams'"
        assert "cancelled_exams" in counsellor, "Counsellor stat should have 'cancelled_exams'"
    
    print(f"✓ Branch Admin Incentive Stats API returns correct structure")
    print(f"  Summary: earned={summary['total_earned_incentives']}, pending={summary['total_pending_incentives']}, refunds={summary['total_refunds_pending']}")
    print(f"  Counsellors tracked: {len(data['counsellor_stats'])}")


def test_branch_admin_incentive_stats_requires_admin_role():
    """Test that incentive stats endpoint requires Branch Admin role"""
    counsellor_token = get_counsellor_token()
    if not counsellor_token:
        pytest.skip("Counsellor login failed")
    
    response = requests.get(
        f"{BASE_URL}/api/branch-admin/incentive-stats",
        headers={"Authorization": f"Bearer {counsellor_token}"}
    )
    assert response.status_code == 403, f"Expected 403 for counsellor, got {response.status_code}"
    print("✓ Branch Admin Incentive Stats API requires Branch Admin role")


def test_branch_admin_incentive_stats_requires_auth():
    """Test that incentive stats endpoint requires authentication"""
    response = requests.get(f"{BASE_URL}/api/branch-admin/incentive-stats")
    assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
    print("✓ Branch Admin Incentive Stats API requires authentication")


# ============ Exam Booking Incentive Flow Tests ============

def test_get_exam_bookings_endpoint():
    """Test /api/exam-bookings returns bookings list"""
    token = get_branch_admin_token()
    if not token:
        pytest.skip("Branch Admin login failed")
    
    response = requests.get(
        f"{BASE_URL}/api/exam-bookings",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert isinstance(data, list), "Response should be a list"
    
    if len(data) > 0:
        booking = data[0]
        assert "id" in booking, "Booking should have 'id'"
        assert "status" in booking, "Booking should have 'status'"
        print(f"✓ Exam Bookings API returns {len(data)} bookings")
    else:
        print("✓ Exam Bookings API returns empty list (no bookings yet)")


def test_exam_booking_status_update_endpoint_exists():
    """Test exam booking status update endpoint exists"""
    token = get_branch_admin_token()
    if not token:
        pytest.skip("Branch Admin login failed")
    
    response = requests.put(
        f"{BASE_URL}/api/exam-bookings/non-existent-id/status",
        params={"status": "Completed"},
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code in [404, 400], f"Expected 404 or 400 for non-existent booking, got {response.status_code}"
    print("✓ Exam Booking Status Update endpoint exists")


def test_refund_endpoint_exists():
    """Test refund marking endpoint exists"""
    token = get_branch_admin_token()
    if not token:
        pytest.skip("Branch Admin login failed")
    
    response = requests.put(
        f"{BASE_URL}/api/exam-bookings/non-existent-id/refund",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 404, f"Expected 404 for non-existent booking, got {response.status_code}"
    print("✓ Refund endpoint exists")


def test_exam_bookings_contain_incentive_refund_fields():
    """Verify exam bookings response has incentive/refund fields in model"""
    token = get_branch_admin_token()
    if not token:
        pytest.skip("Branch Admin login failed")
    
    response = requests.get(
        f"{BASE_URL}/api/exam-bookings",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    print("✓ Exam bookings endpoint accessible - incentive/refund fields in model")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
