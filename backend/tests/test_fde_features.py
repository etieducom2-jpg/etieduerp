"""
FDE Features Backend Tests
Tests for: Expense Categories, Expenses, Enrollments, Payment Plans, Payments
"""
import pytest
import requests
import os
from datetime import datetime, date

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://campus-control-15.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@eti.com"
ADMIN_PASSWORD = "admin123"

class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_admin_login(self):
        """Test admin login and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        print(f"Login response status: {response.status_code}")
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"Login successful for user: {data['user']['name']}, role: {data['user']['role']}")
        return data["access_token"]


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


class TestExpenseCategories:
    """Test Expense Category CRUD (Admin only)"""
    
    def test_get_expense_categories_empty_or_existing(self, api_client):
        """Test fetching expense categories"""
        response = api_client.get(f"{BASE_URL}/api/expense-categories")
        print(f"Get categories status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        print(f"Found {len(data)} existing expense categories")
        return data
    
    def test_create_expense_category(self, api_client):
        """Test creating a new expense category"""
        category_data = {
            "name": f"TEST_Office_Supplies_{datetime.now().strftime('%H%M%S')}",
            "description": "Office stationery, supplies, and equipment"
        }
        response = api_client.post(
            f"{BASE_URL}/api/admin/expense-categories",
            json=category_data
        )
        print(f"Create category status: {response.status_code}")
        print(f"Response: {response.text}")
        
        assert response.status_code == 200, f"Failed to create category: {response.text}"
        
        data = response.json()
        assert data["name"] == category_data["name"]
        assert data["description"] == category_data["description"]
        assert "id" in data
        print(f"Created category: {data['name']} with ID: {data['id']}")
        return data
    
    def test_create_expense_category_utilities(self, api_client):
        """Test creating utilities expense category"""
        category_data = {
            "name": f"TEST_Utilities_{datetime.now().strftime('%H%M%S')}",
            "description": "Electricity, water, internet bills"
        }
        response = api_client.post(
            f"{BASE_URL}/api/admin/expense-categories",
            json=category_data
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Created utilities category: {data['id']}")
        return data


class TestExpenses:
    """Test Expense management (FDE feature)"""
    
    def test_get_expenses(self, api_client):
        """Test fetching expenses"""
        response = api_client.get(f"{BASE_URL}/api/expenses")
        print(f"Get expenses status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        print(f"Found {len(data)} existing expenses")
        return data
    
    def test_create_expense_needs_category(self, api_client):
        """Test creating expense - first get/create a category"""
        # First get categories
        cat_response = api_client.get(f"{BASE_URL}/api/expense-categories")
        categories = cat_response.json()
        
        if not categories:
            # Create a category first
            cat_data = {"name": f"TEST_Misc_{datetime.now().strftime('%H%M%S')}", "description": "Miscellaneous expenses"}
            cat_response = api_client.post(f"{BASE_URL}/api/admin/expense-categories", json=cat_data)
            categories = [cat_response.json()]
        
        category_id = categories[0]["id"]
        print(f"Using category ID: {category_id}")
        
        # Create expense
        expense_data = {
            "category_id": category_id,
            "name": f"TEST_Printer_Paper_{datetime.now().strftime('%H%M%S')}",
            "amount": 500.0,
            "payment_mode": "Cash",
            "expense_date": date.today().isoformat(),
            "remarks": "Monthly office supplies"
        }
        
        response = api_client.post(f"{BASE_URL}/api/expenses", json=expense_data)
        print(f"Create expense status: {response.status_code}")
        print(f"Response: {response.text}")
        
        assert response.status_code == 200, f"Failed to create expense: {response.text}"
        
        data = response.json()
        assert data["name"] == expense_data["name"]
        assert data["amount"] == expense_data["amount"]
        assert "id" in data
        print(f"Created expense: {data['name']}, Amount: {data['amount']}")
        return data
    
    def test_expense_with_upi_payment(self, api_client):
        """Test creating expense with UPI payment mode"""
        cat_response = api_client.get(f"{BASE_URL}/api/expense-categories")
        categories = cat_response.json()
        
        if not categories:
            pytest.skip("No categories available")
        
        expense_data = {
            "category_id": categories[0]["id"],
            "name": f"TEST_Internet_Bill_{datetime.now().strftime('%H%M%S')}",
            "amount": 1500.0,
            "payment_mode": "UPI",
            "expense_date": date.today().isoformat(),
            "remarks": "Monthly internet subscription"
        }
        
        response = api_client.post(f"{BASE_URL}/api/expenses", json=expense_data)
        assert response.status_code == 200
        data = response.json()
        assert data["payment_mode"] == "UPI"
        print(f"Created UPI expense: {data['name']}")


class TestConvertedLeads:
    """Test converted leads endpoint for enrollment"""
    
    def test_get_converted_leads(self, api_client):
        """Test fetching converted leads ready for enrollment"""
        response = api_client.get(f"{BASE_URL}/api/leads/converted")
        print(f"Get converted leads status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        print(f"Found {len(data)} converted leads ready for enrollment")
        
        for lead in data:
            print(f"  - {lead.get('name')}: {lead.get('program_name')}, Fee: {lead.get('fee_quoted')}")
        
        return data


class TestEnrollments:
    """Test Enrollment management (FDE feature)"""
    
    def test_get_enrollments(self, api_client):
        """Test fetching enrollments"""
        response = api_client.get(f"{BASE_URL}/api/enrollments")
        print(f"Get enrollments status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        print(f"Found {len(data)} existing enrollments")
        return data
    
    def test_create_enrollment_from_converted_lead(self, api_client):
        """Test creating enrollment from a converted lead"""
        # Get converted leads
        leads_response = api_client.get(f"{BASE_URL}/api/leads/converted")
        converted_leads = leads_response.json()
        
        if not converted_leads:
            print("No converted leads available for enrollment test")
            pytest.skip("No converted leads available")
        
        lead = converted_leads[0]
        print(f"Enrolling lead: {lead['name']}")
        
        # Get programs to verify program_id
        programs_response = api_client.get(f"{BASE_URL}/api/programs")
        programs = programs_response.json()
        
        if not programs:
            pytest.skip("No programs available")
        
        program_id = lead.get("program_id") or programs[0]["id"]
        fee_quoted = lead.get("fee_quoted") or programs[0]["fee"]
        
        enrollment_data = {
            "lead_id": lead["id"],
            "student_name": lead["name"],
            "email": lead["email"],
            "phone": lead["number"],
            "date_of_birth": "1998-05-15",
            "gender": "Male",
            "address": lead.get("address") or "123 Test Street",
            "city": lead.get("city") or "Mumbai",
            "state": lead.get("state") or "Maharashtra",
            "pincode": "400001",
            "highest_qualification": "Graduate",
            "institution_name": "Test University",
            "passing_year": "2020",
            "percentage": 75.0,
            "program_id": program_id,
            "fee_quoted": fee_quoted,
            "discount_percent": lead.get("discount_percent") or 0,
            "enrollment_date": date.today().isoformat()
        }
        
        response = api_client.post(f"{BASE_URL}/api/enrollments", json=enrollment_data)
        print(f"Create enrollment status: {response.status_code}")
        print(f"Response: {response.text}")
        
        assert response.status_code == 200, f"Failed to create enrollment: {response.text}"
        
        data = response.json()
        assert data["student_name"] == enrollment_data["student_name"]
        assert data["email"] == enrollment_data["email"]
        assert "id" in data
        assert "final_fee" in data
        print(f"Created enrollment: {data['student_name']}, Final Fee: {data['final_fee']}")
        return data
    
    def test_enrollment_duplicate_prevention(self, api_client):
        """Test that duplicate enrollment is prevented"""
        # Get an already enrolled lead
        enrollments = api_client.get(f"{BASE_URL}/api/enrollments").json()
        
        if not enrollments:
            pytest.skip("No enrollments to test duplicate prevention")
        
        enrolled_lead_id = enrollments[0]["lead_id"]
        
        # Try to enroll again
        enrollment_data = {
            "lead_id": enrolled_lead_id,
            "student_name": "Test Duplicate",
            "email": "test@test.com",
            "phone": "9999999999",
            "program_id": enrollments[0]["program_id"],
            "fee_quoted": 50000,
            "enrollment_date": date.today().isoformat()
        }
        
        response = api_client.post(f"{BASE_URL}/api/enrollments", json=enrollment_data)
        print(f"Duplicate enrollment attempt status: {response.status_code}")
        
        # Should fail with 400
        assert response.status_code == 400
        assert "already enrolled" in response.text.lower()
        print("Duplicate enrollment correctly prevented")


class TestPaymentPlans:
    """Test Payment Plan management"""
    
    def test_create_onetime_payment_plan(self, api_client):
        """Test creating one-time payment plan"""
        # Get an enrollment without payment plan
        enrollments = api_client.get(f"{BASE_URL}/api/enrollments").json()
        
        if not enrollments:
            pytest.skip("No enrollments available for payment plan test")
        
        enrollment = enrollments[0]
        enrollment_id = enrollment["id"]
        
        # Check if payment plan exists
        plan_response = api_client.get(f"{BASE_URL}/api/enrollments/{enrollment_id}/payment-plan")
        
        if plan_response.status_code == 200 and plan_response.json():
            print(f"Payment plan already exists for enrollment {enrollment_id}")
            return plan_response.json()
        
        plan_data = {
            "enrollment_id": enrollment_id,
            "plan_type": "One-time",
            "total_amount": enrollment["final_fee"],
            "installments_count": None
        }
        
        response = api_client.post(f"{BASE_URL}/api/payment-plans", json=plan_data)
        print(f"Create payment plan status: {response.status_code}")
        print(f"Response: {response.text}")
        
        assert response.status_code == 200, f"Failed to create payment plan: {response.text}"
        
        data = response.json()
        assert data["plan_type"] == "One-time"
        assert data["enrollment_id"] == enrollment_id
        print(f"Created one-time payment plan: {data['id']}")
        return data
    
    def test_payment_plan_duplicate_prevention(self, api_client):
        """Test that duplicate payment plan is prevented"""
        enrollments = api_client.get(f"{BASE_URL}/api/enrollments").json()
        
        if not enrollments:
            pytest.skip("No enrollments available")
        
        enrollment = enrollments[0]
        
        # Get existing plan
        plan_response = api_client.get(f"{BASE_URL}/api/enrollments/{enrollment['id']}/payment-plan")
        
        if plan_response.status_code != 200 or not plan_response.json():
            # Create a plan first
            plan_data = {
                "enrollment_id": enrollment["id"],
                "plan_type": "One-time",
                "total_amount": enrollment["final_fee"]
            }
            api_client.post(f"{BASE_URL}/api/payment-plans", json=plan_data)
        
        # Try to create another plan for same enrollment
        plan_data = {
            "enrollment_id": enrollment["id"],
            "plan_type": "Installments",
            "total_amount": enrollment["final_fee"],
            "installments_count": 3
        }
        
        response = api_client.post(f"{BASE_URL}/api/payment-plans", json=plan_data)
        print(f"Duplicate payment plan attempt status: {response.status_code}")
        
        assert response.status_code == 400
        assert "already exists" in response.text.lower()
        print("Duplicate payment plan correctly prevented")


class TestPayments:
    """Test Payment recording"""
    
    def test_record_payment(self, api_client):
        """Test recording a payment"""
        enrollments = api_client.get(f"{BASE_URL}/api/enrollments").json()
        
        if not enrollments:
            pytest.skip("No enrollments available for payment test")
        
        enrollment = enrollments[0]
        enrollment_id = enrollment["id"]
        
        # Get or create payment plan
        plan_response = api_client.get(f"{BASE_URL}/api/enrollments/{enrollment_id}/payment-plan")
        plan = plan_response.json()
        
        if not plan:
            # Create plan first
            plan_data = {
                "enrollment_id": enrollment_id,
                "plan_type": "One-time",
                "total_amount": enrollment["final_fee"]
            }
            plan_response = api_client.post(f"{BASE_URL}/api/payment-plans", json=plan_data)
            plan = plan_response.json()
        
        payment_data = {
            "enrollment_id": enrollment_id,
            "payment_plan_id": plan["id"],
            "amount": 10000.0,
            "payment_mode": "Cash",
            "payment_date": date.today().isoformat(),
            "remarks": "TEST_Initial payment"
        }
        
        response = api_client.post(f"{BASE_URL}/api/payments", json=payment_data)
        print(f"Record payment status: {response.status_code}")
        print(f"Response: {response.text}")
        
        assert response.status_code == 200, f"Failed to record payment: {response.text}"
        
        data = response.json()
        assert data["amount"] == payment_data["amount"]
        assert data["payment_mode"] == "Cash"
        print(f"Recorded payment: ₹{data['amount']}")
        return data
    
    def test_get_enrollment_payments(self, api_client):
        """Test fetching payment history for an enrollment"""
        enrollments = api_client.get(f"{BASE_URL}/api/enrollments").json()
        
        if not enrollments:
            pytest.skip("No enrollments available")
        
        enrollment_id = enrollments[0]["id"]
        response = api_client.get(f"{BASE_URL}/api/enrollments/{enrollment_id}/payments")
        
        print(f"Get enrollment payments status: {response.status_code}")
        assert response.status_code == 200
        
        payments = response.json()
        print(f"Found {len(payments)} payments for enrollment")
        
        total_paid = sum(p["amount"] for p in payments)
        print(f"Total amount paid: ₹{total_paid}")
        return payments
    
    def test_payment_with_different_modes(self, api_client):
        """Test recording payment with UPI"""
        enrollments = api_client.get(f"{BASE_URL}/api/enrollments").json()
        
        if not enrollments:
            pytest.skip("No enrollments available")
        
        enrollment = enrollments[0]
        plan_response = api_client.get(f"{BASE_URL}/api/enrollments/{enrollment['id']}/payment-plan")
        plan = plan_response.json()
        
        if not plan:
            pytest.skip("No payment plan available")
        
        payment_data = {
            "enrollment_id": enrollment["id"],
            "payment_plan_id": plan["id"],
            "amount": 5000.0,
            "payment_mode": "UPI",
            "payment_date": date.today().isoformat(),
            "remarks": "TEST_UPI payment"
        }
        
        response = api_client.post(f"{BASE_URL}/api/payments", json=payment_data)
        assert response.status_code == 200
        data = response.json()
        assert data["payment_mode"] == "UPI"
        print(f"Recorded UPI payment: ₹{data['amount']}")


class TestPaymentReceipt:
    """Test payment receipt generation"""
    
    def test_generate_receipt(self, api_client):
        """Test generating payment receipt"""
        enrollments = api_client.get(f"{BASE_URL}/api/enrollments").json()
        
        if not enrollments:
            pytest.skip("No enrollments available")
        
        enrollment_id = enrollments[0]["id"]
        payments = api_client.get(f"{BASE_URL}/api/enrollments/{enrollment_id}/payments").json()
        
        if not payments:
            pytest.skip("No payments available for receipt test")
        
        payment_id = payments[0]["id"]
        response = api_client.get(f"{BASE_URL}/api/payments/{payment_id}/receipt")
        
        print(f"Generate receipt status: {response.status_code}")
        assert response.status_code == 200
        
        receipt = response.json()
        assert "receipt_number" in receipt, f"Receipt should have receipt_number field, got: {receipt.keys()}"
        assert "amount" in receipt
        print(f"Generated receipt: {receipt['receipt_number']} for ₹{receipt['amount']}")
        return receipt


class TestPrograms:
    """Test programs API - needed for enrollments"""
    
    def test_get_programs(self, api_client):
        """Test fetching programs"""
        response = api_client.get(f"{BASE_URL}/api/programs")
        print(f"Get programs status: {response.status_code}")
        assert response.status_code == 200
        
        programs = response.json()
        print(f"Found {len(programs)} programs")
        for p in programs:
            print(f"  - {p['name']}: ₹{p['fee']}, Duration: {p['duration']}")
        return programs


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
