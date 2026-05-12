"""
New Features Backend Tests - Iteration 2
Tests for: Payment with branch_id & receipt_number, Receipt generation,
Monthly Financial Analytics, Branch-wise Financial Summary, Marketing Resources
"""
import pytest
import requests
import os
from datetime import datetime, date

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://campus-control-15.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@eti.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


class TestPaymentReceiptWithBranchInfo:
    """Test payment receipt generation includes branch details and receipt_number"""
    
    def test_new_payment_has_branch_id_and_receipt_number(self, api_client):
        """Test that NEW payments include branch_id and receipt_number fields"""
        # Get enrollments
        enrollments = api_client.get(f"{BASE_URL}/api/enrollments").json()
        if not enrollments:
            pytest.skip("No enrollments available")
        
        enrollment_id = enrollments[0]["id"]
        
        # Get or create payment plan
        plan_response = api_client.get(f"{BASE_URL}/api/enrollments/{enrollment_id}/payment-plan")
        plan = plan_response.json()
        
        if not plan:
            plan_data = {
                "enrollment_id": enrollment_id,
                "plan_type": "One-time",
                "total_amount": enrollments[0]["final_fee"]
            }
            plan_response = api_client.post(f"{BASE_URL}/api/payment-plans", json=plan_data)
            plan = plan_response.json()
        
        # Create a NEW payment (to ensure it has the new fields)
        payment_data = {
            "enrollment_id": enrollment_id,
            "payment_plan_id": plan["id"],
            "amount": 100.0,
            "payment_mode": "Cash",
            "payment_date": date.today().isoformat(),
            "remarks": f"TEST_New_payment_branch_check_{datetime.now().strftime('%H%M%S')}"
        }
        response = api_client.post(f"{BASE_URL}/api/payments", json=payment_data)
        assert response.status_code == 200
        payment = response.json()
        
        # Verify NEW payment has branch_id and receipt_number
        print(f"Payment ID: {payment.get('id')}")
        print(f"Branch ID: {payment.get('branch_id')}")
        print(f"Receipt Number: {payment.get('receipt_number')}")
        
        assert "branch_id" in payment, "Payment should have branch_id field"
        assert payment["branch_id"] is not None, "Payment branch_id should not be None"
        
        assert "receipt_number" in payment, "Payment should have receipt_number field"
        assert payment["receipt_number"] is not None, "Payment receipt_number should not be None"
        assert payment["receipt_number"].startswith("RCP-"), "Receipt number should start with 'RCP-'"
        
        print("New payment correctly includes branch_id and receipt_number")
    
    def test_receipt_api_returns_complete_data(self, api_client):
        """Test receipt endpoint returns complete receipt data with institute header"""
        enrollments = api_client.get(f"{BASE_URL}/api/enrollments").json()
        if not enrollments:
            pytest.skip("No enrollments available")
        
        enrollment_id = enrollments[0]["id"]
        payments = api_client.get(f"{BASE_URL}/api/enrollments/{enrollment_id}/payments").json()
        
        if not payments:
            pytest.skip("No payments available for receipt test")
        
        payment_id = payments[0]["id"]
        response = api_client.get(f"{BASE_URL}/api/payments/{payment_id}/receipt")
        
        print(f"Receipt API status: {response.status_code}")
        assert response.status_code == 200
        
        receipt = response.json()
        print(f"Receipt data: {receipt}")
        
        # Verify all required receipt fields
        required_fields = [
            "receipt_number", "payment_id", "payment_date",
            "student_name", "program", "amount", "payment_mode",
            "total_fee", "institute_name", "institute_tagline"
        ]
        
        for field in required_fields:
            assert field in receipt, f"Receipt should have {field} field"
            print(f"  {field}: {receipt[field]}")
        
        # Check institute info
        assert receipt["institute_name"] == "ETI Educom", "Institute name should be ETI Educom"
        assert receipt["institute_tagline"] is not None, "Institute tagline should not be empty"
        
        # Branch info may or may not be present depending on enrollment
        if receipt.get("branch_name"):
            print(f"  Branch: {receipt['branch_name']}, {receipt.get('branch_city')}")
        
        print("Receipt API returns complete data successfully")


class TestMonthlyFinancialAnalytics:
    """Test monthly income & expense analytics API"""
    
    def test_monthly_financial_api(self, api_client):
        """Test /api/analytics/financial/monthly endpoint"""
        response = api_client.get(f"{BASE_URL}/api/analytics/financial/monthly")
        
        print(f"Monthly financial status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        print(f"Financial data: year={data.get('year')}")
        
        # Verify response structure
        assert "year" in data, "Response should have year field"
        assert "monthly_data" in data, "Response should have monthly_data array"
        assert "total_income" in data, "Response should have total_income field"
        assert "total_expenses" in data, "Response should have total_expenses field"
        
        # Verify monthly_data has all 12 months
        monthly_data = data["monthly_data"]
        assert len(monthly_data) == 12, f"Should have 12 months of data, got {len(monthly_data)}"
        
        # Verify each month has required fields
        for month_data in monthly_data:
            assert "month" in month_data, "Month data should have month number"
            assert "month_name" in month_data, "Month data should have month_name"
            assert "income" in month_data, "Month data should have income"
            assert "expenses" in month_data, "Month data should have expenses"
        
        # Verify month names
        expected_months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        actual_months = [m["month_name"] for m in monthly_data]
        assert actual_months == expected_months, f"Month names mismatch: {actual_months}"
        
        print(f"Total Income: ₹{data['total_income']}")
        print(f"Total Expenses: ₹{data['total_expenses']}")
        print(f"Net Profit: ₹{data['total_income'] - data['total_expenses']}")
        
        # Print months with data
        for m in monthly_data:
            if m['income'] > 0 or m['expenses'] > 0:
                print(f"  {m['month_name']}: Income=₹{m['income']}, Expenses=₹{m['expenses']}")
        
        print("Monthly financial analytics API working correctly")
    
    def test_monthly_financial_with_year_param(self, api_client):
        """Test monthly financial API with specific year parameter"""
        year = 2026
        response = api_client.get(f"{BASE_URL}/api/analytics/financial/monthly?year={year}")
        
        print(f"Monthly financial for {year} status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["year"] == year, f"Returned year should be {year}"
        
        print(f"Year {year} data retrieved successfully")


class TestBranchWiseFinancialSummary:
    """Test branch-wise financial summary API (Admin only)"""
    
    def test_branch_wise_financial_api(self, api_client):
        """Test /api/analytics/financial/branch-wise endpoint"""
        response = api_client.get(f"{BASE_URL}/api/analytics/financial/branch-wise")
        
        print(f"Branch-wise financial status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        print(f"Found {len(data)} branches with financial data")
        
        if not data:
            print("No branches found - this is expected if no branches exist")
            return
        
        # Verify each branch has required fields
        required_fields = [
            "branch_id", "branch_name", "total_income", 
            "total_expenses", "net_profit", "enrollments_count"
        ]
        
        for branch in data:
            for field in required_fields:
                assert field in branch, f"Branch should have {field} field"
            
            print(f"\nBranch: {branch['branch_name']} ({branch.get('branch_location', 'N/A')})")
            print(f"  Enrollments: {branch['enrollments_count']}")
            print(f"  Total Income: ₹{branch['total_income']}")
            print(f"  Total Expenses: ₹{branch['total_expenses']}")
            print(f"  Net Profit: ₹{branch['net_profit']}")
        
        print("\nBranch-wise financial API working correctly")


class TestMarketingResources:
    """Test Marketing Resources CRUD APIs"""
    
    def test_get_resources_empty_or_existing(self, api_client):
        """Test fetching marketing resources list"""
        response = api_client.get(f"{BASE_URL}/api/resources")
        
        print(f"Get resources status: {response.status_code}")
        assert response.status_code == 200
        
        resources = response.json()
        print(f"Found {len(resources)} existing resources")
        
        for res in resources:
            print(f"  - {res['title']} ({res['resource_type']})")
        
        return resources
    
    def test_create_brochure_resource(self, api_client):
        """Test creating a brochure resource (Admin only)"""
        resource_data = {
            "title": f"TEST_Course_Brochure_{datetime.now().strftime('%H%M%S')}",
            "description": "Comprehensive course information brochure",
            "resource_type": "Brochure",
            "file_url": "https://example.com/brochure.pdf"
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/resources", json=resource_data)
        
        print(f"Create brochure status: {response.status_code}")
        print(f"Response: {response.text}")
        
        assert response.status_code == 200, f"Failed to create brochure: {response.text}"
        
        data = response.json()
        assert data["title"] == resource_data["title"]
        assert data["resource_type"] == "Brochure"
        assert data["file_url"] == resource_data["file_url"]
        assert "id" in data
        assert "created_by" in data
        
        print(f"Created brochure resource: {data['title']}, ID: {data['id']}")
        return data
    
    def test_create_creative_resource(self, api_client):
        """Test creating a creative (image) resource"""
        resource_data = {
            "title": f"TEST_Social_Media_Creative_{datetime.now().strftime('%H%M%S')}",
            "description": "Instagram/Facebook promotional creative",
            "resource_type": "Creative",
            "file_url": "https://example.com/creative.png"
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/resources", json=resource_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["resource_type"] == "Creative"
        
        print(f"Created creative resource: {data['title']}")
        return data
    
    def test_create_video_resource(self, api_client):
        """Test creating a video resource with video_link"""
        resource_data = {
            "title": f"TEST_Course_Video_{datetime.now().strftime('%H%M%S')}",
            "description": "Course introduction video",
            "resource_type": "Video",
            "video_link": "https://youtube.com/watch?v=testVideo123"
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/resources", json=resource_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["resource_type"] == "Video"
        assert data["video_link"] == resource_data["video_link"]
        
        print(f"Created video resource: {data['title']}")
        return data
    
    def test_create_document_resource(self, api_client):
        """Test creating a document resource"""
        resource_data = {
            "title": f"TEST_Training_Material_{datetime.now().strftime('%H%M%S')}",
            "description": "Training documentation for counselors",
            "resource_type": "Document",
            "file_url": "https://example.com/training.docx"
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/resources", json=resource_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["resource_type"] == "Document"
        
        print(f"Created document resource: {data['title']}")
        return data
    
    def test_delete_resource(self, api_client):
        """Test deleting a resource (Admin only)"""
        # First create a resource to delete
        resource_data = {
            "title": f"TEST_ToDelete_{datetime.now().strftime('%H%M%S')}",
            "description": "Resource to be deleted",
            "resource_type": "Document"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/admin/resources", json=resource_data)
        assert create_response.status_code == 200
        resource_id = create_response.json()["id"]
        
        # Now delete it
        delete_response = api_client.delete(f"{BASE_URL}/api/admin/resources/{resource_id}")
        
        print(f"Delete resource status: {delete_response.status_code}")
        assert delete_response.status_code == 200
        
        # Verify it's deleted
        get_response = api_client.get(f"{BASE_URL}/api/resources")
        resources = get_response.json()
        resource_ids = [r["id"] for r in resources]
        assert resource_id not in resource_ids, "Deleted resource should not appear in list"
        
        print(f"Successfully deleted resource: {resource_id}")


class TestEnrolledStudentsPaymentStatus:
    """Test enrolled students display with payment status"""
    
    def test_enrollments_have_final_fee(self, api_client):
        """Test that enrollments have final_fee for payment status calculation"""
        response = api_client.get(f"{BASE_URL}/api/enrollments")
        
        assert response.status_code == 200
        enrollments = response.json()
        
        if not enrollments:
            pytest.skip("No enrollments to test")
        
        print(f"Testing payment status for {len(enrollments)} enrollments")
        
        for enrollment in enrollments:
            assert "final_fee" in enrollment, "Enrollment should have final_fee"
            
            enrollment_id = enrollment["id"]
            payments = api_client.get(f"{BASE_URL}/api/enrollments/{enrollment_id}/payments").json()
            total_paid = sum(p["amount"] for p in payments)
            
            status = "Paid" if total_paid >= enrollment["final_fee"] else \
                     "Partial" if total_paid > 0 else "Pending"
            
            print(f"\n{enrollment['student_name']}:")
            print(f"  Final Fee: ₹{enrollment['final_fee']}")
            print(f"  Total Paid: ₹{total_paid}")
            print(f"  Payment Status: {status}")
        
        print("\nEnrollment payment status verification complete")


class TestAnalyticsOverview:
    """Test analytics overview for dashboard"""
    
    def test_overview_api(self, api_client):
        """Test /api/analytics/overview endpoint"""
        response = api_client.get(f"{BASE_URL}/api/analytics/overview")
        
        print(f"Analytics overview status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_leads" in data
        assert "status_breakdown" in data
        assert "source_performance" in data
        assert "program_performance" in data
        
        print(f"Total Leads: {data['total_leads']}")
        print(f"Status Breakdown: {data['status_breakdown']}")
        
        return data


class TestBranchWiseLeadAnalytics:
    """Test branch-wise lead analytics (Admin only)"""
    
    def test_branch_wise_analytics_api(self, api_client):
        """Test /api/analytics/branch-wise endpoint"""
        response = api_client.get(f"{BASE_URL}/api/analytics/branch-wise")
        
        print(f"Branch-wise analytics status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        print(f"Found {len(data)} branches")
        
        if data:
            required_fields = [
                "branch_id", "branch_name", "total_leads", "new_leads",
                "contacted", "demo_booked", "followup", "converted", 
                "lost", "conversion_rate", "active_counsellors"
            ]
            
            for branch in data:
                for field in required_fields:
                    assert field in branch, f"Branch analytics should have {field}"
                
                print(f"\n{branch['branch_name']}:")
                print(f"  Total Leads: {branch['total_leads']}")
                print(f"  Converted: {branch['converted']}")
                print(f"  Conversion Rate: {branch['conversion_rate']}%")
        
        return data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
