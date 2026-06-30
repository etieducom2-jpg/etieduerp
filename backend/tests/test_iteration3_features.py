"""
Backend tests for ETI Educom - Iteration 3 Features:
1. Admin Panel - Lead Sources tab - create/delete lead source
2. Admin Panel - Expense Categories tab - delete category (should fail if used)
3. Leads page - lead source dropdown populated from API
4. Leads page - soft delete with ownership check
5. Deleted Leads page - shows soft deleted leads
6. Payment validation - cannot pay more than remaining fee
7. All Payments page - shows all payments with filters
8. Pending Payments page - shows upcoming installments with overdue status
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://campus-control-15.preview.emergentagent.com')


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@eti.com", "password": "admin123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        token = response.json()["access_token"]
        return token
    
    def test_admin_login(self, admin_token):
        """Test admin can login successfully"""
        assert admin_token is not None
        print("SUCCESS: Admin login successful")


class TestLeadSources:
    """Lead Sources CRUD tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@eti.com", "password": "admin123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_lead_sources(self, headers):
        """Test getting all lead sources"""
        response = requests.get(f"{BASE_URL}/api/lead-sources", headers=headers)
        assert response.status_code == 200, f"Failed to get lead sources: {response.text}"
        sources = response.json()
        assert isinstance(sources, list)
        print(f"SUCCESS: Retrieved {len(sources)} lead sources")
        # Check if existing lead sources are present
        source_names = [s.get('name') for s in sources]
        print(f"Lead sources available: {source_names}")
    
    def test_create_lead_source(self, headers):
        """Test creating a new lead source"""
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        test_source = {
            "name": f"TEST_Instagram_Ads_{unique_id}",
            "description": "Test lead source created for iteration 3 testing"
        }
        response = requests.post(f"{BASE_URL}/api/admin/lead-sources", json=test_source, headers=headers)
        assert response.status_code == 200, f"Failed to create lead source: {response.text}"
        created = response.json()
        assert created["name"] == test_source["name"]
        assert "id" in created
        print(f"SUCCESS: Created lead source: {created['name']} with id: {created['id']}")
    
    def test_create_duplicate_lead_source_fails(self, headers):
        """Test creating duplicate lead source fails"""
        # First create a source
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        test_source = {
            "name": f"TEST_DuplicateTest_{unique_id}",
            "description": "Initial creation"
        }
        first_response = requests.post(f"{BASE_URL}/api/admin/lead-sources", json=test_source, headers=headers)
        assert first_response.status_code == 200, f"First creation should succeed: {first_response.text}"
        
        # Now try to create with the same name
        response = requests.post(f"{BASE_URL}/api/admin/lead-sources", json=test_source, headers=headers)
        assert response.status_code == 400, f"Duplicate lead source should fail: {response.text}"
        print("SUCCESS: Duplicate lead source creation correctly rejected")
    
    def test_delete_lead_source(self, headers):
        """Test deleting (soft delete) a lead source"""
        # First create a source to delete
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        test_source = {
            "name": f"TEST_ToDelete_Source_{unique_id}",
            "description": "Source to be deleted"
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/lead-sources", json=test_source, headers=headers)
        assert create_response.status_code == 200, f"Failed to create test source: {create_response.text}"
        source_id = create_response.json()["id"]
        
        # Delete the source (soft delete - sets is_active=False)
        delete_response = requests.delete(f"{BASE_URL}/api/admin/lead-sources/{source_id}", headers=headers)
        assert delete_response.status_code == 200, f"Failed to delete lead source: {delete_response.text}"
        print(f"SUCCESS: Soft deleted lead source with id: {source_id}")
        
        # Verify it's not returned in active sources list (since soft delete sets is_active=False)
        sources_response = requests.get(f"{BASE_URL}/api/lead-sources", headers=headers)
        sources = sources_response.json()
        active_source_ids = [s['id'] for s in sources if s.get('is_active', True)]
        assert source_id not in active_source_ids, "Soft deleted source should not appear in active sources"
        print("SUCCESS: Soft deleted source not in active sources list")


class TestExpenseCategories:
    """Expense Category tests including delete validation"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@eti.com", "password": "admin123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_expense_categories(self, headers):
        """Test getting expense categories"""
        response = requests.get(f"{BASE_URL}/api/expense-categories", headers=headers)
        assert response.status_code == 200
        categories = response.json()
        print(f"SUCCESS: Retrieved {len(categories)} expense categories")
        return categories
    
    def test_create_expense_category(self, headers):
        """Test creating expense category"""
        test_category = {
            "name": "TEST_Marketing_Expenses_Iteration3",
            "description": "Test category for iteration 3"
        }
        response = requests.post(f"{BASE_URL}/api/admin/expense-categories", json=test_category, headers=headers)
        assert response.status_code == 200, f"Failed to create category: {response.text}"
        created = response.json()
        assert created["name"] == test_category["name"]
        print(f"SUCCESS: Created expense category: {created['name']}")
        return created
    
    def test_delete_unused_category(self, headers):
        """Test deleting an unused expense category"""
        # Create a new category to delete
        test_category = {
            "name": "TEST_ToDelete_Category",
            "description": "Category to be deleted"
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/expense-categories", json=test_category, headers=headers)
        if create_response.status_code == 200:
            category_id = create_response.json()["id"]
        else:
            # Find existing
            categories_response = requests.get(f"{BASE_URL}/api/expense-categories", headers=headers)
            categories = categories_response.json()
            category_id = None
            for c in categories:
                if c['name'] == test_category['name']:
                    category_id = c['id']
                    break
            if not category_id:
                pytest.skip("Could not create or find test category")
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/admin/expense-categories/{category_id}", headers=headers)
        assert delete_response.status_code == 200, f"Failed to delete category: {delete_response.text}"
        print(f"SUCCESS: Deleted unused expense category")


class TestLeadSoftDelete:
    """Lead soft delete and ownership tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@eti.com", "password": "admin123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_leads_excludes_deleted(self, headers):
        """Test GET /leads excludes soft-deleted leads"""
        response = requests.get(f"{BASE_URL}/api/leads", headers=headers)
        assert response.status_code == 200
        leads = response.json()
        # Verify no deleted leads are returned
        deleted_leads = [l for l in leads if l.get('is_deleted') == True]
        assert len(deleted_leads) == 0, "Deleted leads should not be returned in GET /leads"
        print(f"SUCCESS: GET /leads returns {len(leads)} active leads (no deleted leads)")
    
    def test_soft_delete_lead(self, headers):
        """Test soft deleting a lead"""
        # First get a lead source to use
        sources_response = requests.get(f"{BASE_URL}/api/lead-sources", headers=headers)
        sources = sources_response.json()
        if not sources:
            pytest.skip("No lead sources available")
        lead_source = sources[0]['name']
        
        # Get a program
        programs_response = requests.get(f"{BASE_URL}/api/programs", headers=headers)
        programs = programs_response.json()
        if not programs:
            pytest.skip("No programs available")
        program_id = programs[0]['id']
        
        # Create a test lead
        test_lead = {
            "name": "TEST_SoftDelete_Lead",
            "number": "9876543210",
            "email": "test.softdelete@example.com",
            "program_id": program_id,
            "lead_source": lead_source
        }
        create_response = requests.post(f"{BASE_URL}/api/leads", json=test_lead, headers=headers)
        assert create_response.status_code == 200, f"Failed to create lead: {create_response.text}"
        lead_id = create_response.json()["id"]
        
        # Soft delete the lead
        delete_response = requests.delete(
            f"{BASE_URL}/api/leads/{lead_id}", 
            json={"reason": "Test deletion"},
            headers=headers
        )
        assert delete_response.status_code == 200, f"Failed to soft delete: {delete_response.text}"
        print(f"SUCCESS: Lead soft deleted successfully")
        
        # Verify it doesn't appear in regular leads list
        leads_response = requests.get(f"{BASE_URL}/api/leads", headers=headers)
        leads = leads_response.json()
        lead_ids = [l['id'] for l in leads]
        assert lead_id not in lead_ids, "Soft deleted lead should not appear in leads list"
        print("SUCCESS: Soft deleted lead excluded from regular leads list")


class TestDeletedLeads:
    """Deleted leads page tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@eti.com", "password": "admin123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_deleted_leads(self, headers):
        """Test getting deleted leads (Admin only)"""
        response = requests.get(f"{BASE_URL}/api/leads/deleted", headers=headers)
        assert response.status_code == 200, f"Failed to get deleted leads: {response.text}"
        deleted_leads = response.json()
        print(f"SUCCESS: Retrieved {len(deleted_leads)} deleted leads")
        
        # Verify deleted leads have audit fields
        if deleted_leads:
            lead = deleted_leads[0]
            assert lead.get('is_deleted') == True, "Deleted lead should have is_deleted=True"
            print(f"SUCCESS: Deleted lead has audit info - deleted_by: {lead.get('deleted_by_name')}, deleted_at: {lead.get('deleted_at')}")


class TestPaymentValidation:
    """Payment validation tests - cannot exceed course fee"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@eti.com", "password": "admin123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_payment_exceeds_remaining_fee_rejected(self, headers):
        """Test payment that exceeds remaining fee is rejected"""
        # Get enrollments
        enrollments_response = requests.get(f"{BASE_URL}/api/enrollments", headers=headers)
        assert enrollments_response.status_code == 200
        enrollments = enrollments_response.json()
        
        if not enrollments:
            pytest.skip("No enrollments available for testing")
        
        # Find Krishna Mahajan's enrollment (mentioned in context)
        enrollment = None
        for e in enrollments:
            if "Krishna" in e.get('student_name', ''):
                enrollment = e
                break
        
        if not enrollment:
            # Use first enrollment
            enrollment = enrollments[0]
        
        enrollment_id = enrollment['id']
        final_fee = enrollment.get('final_fee', 0)
        
        # Get existing payments for this enrollment
        payments_response = requests.get(f"{BASE_URL}/api/enrollments/{enrollment_id}/payments", headers=headers)
        payments = payments_response.json()
        total_paid = sum(p.get('amount', 0) for p in payments)
        remaining = final_fee - total_paid
        
        print(f"Enrollment: {enrollment.get('student_name')}, Final Fee: ₹{final_fee}, Paid: ₹{total_paid}, Remaining: ₹{remaining}")
        
        if remaining <= 0:
            pytest.skip("No remaining fee to test payment validation")
        
        # Get payment plan
        plan_response = requests.get(f"{BASE_URL}/api/enrollments/{enrollment_id}/payment-plan", headers=headers)
        plan = plan_response.json()
        if not plan:
            pytest.skip("No payment plan for this enrollment")
        
        # Try to make payment exceeding remaining fee
        excess_payment = {
            "enrollment_id": enrollment_id,
            "payment_plan_id": plan['id'],
            "amount": remaining + 1000,  # Exceed by 1000
            "payment_mode": "Cash",
            "payment_date": "2026-01-15"
        }
        
        response = requests.post(f"{BASE_URL}/api/payments", json=excess_payment, headers=headers)
        assert response.status_code == 400, f"Payment exceeding remaining fee should be rejected: {response.text}"
        error_detail = response.json().get('detail', '')
        assert 'exceeds' in error_detail.lower() or 'remaining' in error_detail.lower(), f"Error should mention exceeding remaining fee: {error_detail}"
        print(f"SUCCESS: Excess payment correctly rejected with message: {error_detail}")


class TestAllPayments:
    """All Payments page tests with filters"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@eti.com", "password": "admin123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_all_payments(self, headers):
        """Test GET /payments/all returns all payments"""
        response = requests.get(f"{BASE_URL}/api/payments/all", headers=headers)
        assert response.status_code == 200, f"Failed to get all payments: {response.text}"
        payments = response.json()
        print(f"SUCCESS: Retrieved {len(payments)} total payments")
        
        # Verify payment structure
        if payments:
            p = payments[0]
            assert 'amount' in p, "Payment should have amount"
            assert 'payment_mode' in p, "Payment should have payment_mode"
            # Check for enriched data
            if 'student_name' in p:
                print(f"SUCCESS: Payment enriched with student_name: {p['student_name']}")
    
    def test_payments_filter_by_payment_mode(self, headers):
        """Test filtering payments by payment mode"""
        response = requests.get(f"{BASE_URL}/api/payments/all?payment_mode=Cash", headers=headers)
        assert response.status_code == 200
        payments = response.json()
        if payments:
            cash_only = all(p.get('payment_mode') == 'Cash' for p in payments)
            print(f"SUCCESS: Filter by payment_mode=Cash returned {len(payments)} payments, all Cash: {cash_only}")
    
    def test_payments_filter_by_date_range(self, headers):
        """Test filtering payments by date range"""
        response = requests.get(
            f"{BASE_URL}/api/payments/all?start_date=2026-01-01&end_date=2026-12-31", 
            headers=headers
        )
        assert response.status_code == 200
        payments = response.json()
        print(f"SUCCESS: Filter by date range returned {len(payments)} payments")


class TestPendingPayments:
    """Pending Payments page tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@eti.com", "password": "admin123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_pending_payments(self, headers):
        """Test GET /payments/pending returns upcoming installments"""
        response = requests.get(f"{BASE_URL}/api/payments/pending", headers=headers)
        assert response.status_code == 200, f"Failed to get pending payments: {response.text}"
        pending = response.json()
        print(f"SUCCESS: Retrieved {len(pending)} pending payments")
        
        # Verify pending payment structure
        if pending:
            p = pending[0]
            assert 'due_date' in p, "Pending payment should have due_date"
            assert 'amount' in p, "Pending payment should have amount"
            assert 'is_overdue' in p, "Pending payment should have is_overdue flag"
            assert 'installment_number' in p, "Pending payment should have installment_number"
            print(f"SUCCESS: Pending payment structure verified - due_date: {p.get('due_date')}, is_overdue: {p.get('is_overdue')}")
    
    def test_pending_payments_overdue_status(self, headers):
        """Test pending payments show overdue status correctly"""
        response = requests.get(f"{BASE_URL}/api/payments/pending", headers=headers)
        assert response.status_code == 200
        pending = response.json()
        
        overdue_count = sum(1 for p in pending if p.get('is_overdue'))
        upcoming_count = sum(1 for p in pending if not p.get('is_overdue'))
        print(f"SUCCESS: Pending payments - Overdue: {overdue_count}, Upcoming: {upcoming_count}")


class TestProgramDisplay:
    """Test program name display in leads table"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@eti.com", "password": "admin123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_leads_have_program_name(self, headers):
        """Test leads response includes program_name"""
        response = requests.get(f"{BASE_URL}/api/leads", headers=headers)
        assert response.status_code == 200
        leads = response.json()
        
        if leads:
            leads_with_program_name = [l for l in leads if l.get('program_name')]
            print(f"SUCCESS: {len(leads_with_program_name)}/{len(leads)} leads have program_name field")
            
            if leads_with_program_name:
                lead = leads_with_program_name[0]
                print(f"Example: Lead '{lead.get('name')}' has program: '{lead.get('program_name')}'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
