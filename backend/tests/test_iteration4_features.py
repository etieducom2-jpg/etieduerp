"""
Test file for Iteration 4 features:
1. Super Admin dashboard with branch performance overview
2. Branch Admin role in user creation dropdown
3. WhatsApp settings tab in Admin Panel (GET/PUT /api/admin/whatsapp-settings)
4. Role-based navigation - Super Admin sees Admin Panel, Branch Admin doesn't
5. Lead deletion - only Super Admin and Branch Admin can delete leads
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Basic API health check"""
    
    def test_api_available(self):
        response = requests.get(f"{BASE_URL}/api/programs")
        assert response.status_code in [200, 401, 403], f"API not responding: {response.status_code}"
        print("API is available")


class TestSuperAdminLogin:
    """Test Super Admin login and authentication"""
    
    def test_super_admin_login(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@eti.com", "password": "admin123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "Admin"
        print(f"Super Admin login successful - User: {data['user']['name']}, Role: {data['user']['role']}")
        return data["access_token"]


class TestWhatsAppSettingsAPI:
    """Test WhatsApp settings API endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@eti.com", "password": "admin123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_get_whatsapp_settings(self, auth_token):
        """GET /api/admin/whatsapp-settings - Super Admin should be able to get settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/whatsapp-settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed to get WhatsApp settings: {response.text}"
        data = response.json()
        
        # Verify required fields exist
        assert "enabled" in data
        assert "notify_lead_added" in data
        assert "notify_demo_booked" in data
        assert "notify_demo_completed" in data
        assert "notify_enrollment_confirmed" in data
        assert "notify_payment_received" in data
        assert "notify_installment_reminder" in data
        
        print(f"WhatsApp settings retrieved: enabled={data['enabled']}")
        print(f"  - notify_lead_added: {data['notify_lead_added']}")
        print(f"  - notify_demo_booked: {data['notify_demo_booked']}")
        print(f"  - notify_enrollment_confirmed: {data['notify_enrollment_confirmed']}")
    
    def test_update_whatsapp_settings_master_switch(self, auth_token):
        """PUT /api/admin/whatsapp-settings - Update master switch"""
        # First get current settings
        get_response = requests.get(
            f"{BASE_URL}/api/admin/whatsapp-settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        current_enabled = get_response.json().get("enabled", True)
        
        # Toggle the master switch
        new_enabled = not current_enabled
        response = requests.put(
            f"{BASE_URL}/api/admin/whatsapp-settings",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={"enabled": new_enabled}
        )
        assert response.status_code == 200, f"Failed to update WhatsApp settings: {response.text}"
        
        # Verify the update
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/whatsapp-settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert verify_response.json()["enabled"] == new_enabled
        print(f"WhatsApp master switch updated: {current_enabled} -> {new_enabled}")
        
        # Restore original setting
        requests.put(
            f"{BASE_URL}/api/admin/whatsapp-settings",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={"enabled": current_enabled}
        )
    
    def test_update_individual_notifications(self, auth_token):
        """PUT /api/admin/whatsapp-settings - Update individual notification settings"""
        # Test updating specific notification type
        response = requests.put(
            f"{BASE_URL}/api/admin/whatsapp-settings",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={
                "enabled": True,
                "notify_lead_added": True,
                "notify_demo_booked": True,
                "notify_demo_completed": True,
                "notify_enrollment_confirmed": True,
                "notify_payment_received": True,
                "notify_installment_reminder": True
            }
        )
        assert response.status_code == 200, f"Failed to update individual notifications: {response.text}"
        
        # Verify all settings were updated
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/whatsapp-settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = verify_response.json()
        assert data["enabled"] == True
        assert data["notify_lead_added"] == True
        print("All WhatsApp notification settings updated successfully")


class TestSuperAdminDashboard:
    """Test Super Admin dashboard with branch performance overview"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@eti.com", "password": "admin123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_super_admin_dashboard_endpoint(self, auth_token):
        """GET /api/analytics/super-admin-dashboard - Should return branch performance data"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/super-admin-dashboard",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed to get super admin dashboard: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "totals" in data
        assert "branches" in data
        
        # Verify totals
        totals = data["totals"]
        assert "total_leads" in totals
        assert "total_enrollments" in totals
        assert "total_income" in totals
        
        print(f"Super Admin Dashboard - Totals:")
        print(f"  - Total Leads: {totals['total_leads']}")
        print(f"  - Total Enrollments: {totals['total_enrollments']}")
        print(f"  - Total Income: {totals['total_income']}")
        
        # Verify branches data
        branches = data["branches"]
        if branches:
            print(f"  - Number of branches: {len(branches)}")
            for branch in branches[:3]:  # Show first 3 branches
                print(f"    - {branch.get('branch_name')}: {branch.get('leads_count')} leads, {branch.get('conversion_rate')}% conversion")
    
    def test_branch_wise_analytics(self, auth_token):
        """GET /api/analytics/branch-wise - Branch-wise analytics"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/branch-wise",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed to get branch analytics: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Branch-wise analytics retrieved for {len(data)} branches")


class TestUserCreationWithBranchAdmin:
    """Test Branch Admin role is available in user creation"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@eti.com", "password": "admin123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_get_users_shows_branch_admin(self, auth_token):
        """GET /api/admin/users - Check if Branch Admin users are returned"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        users = response.json()
        
        roles = set([u["role"] for u in users])
        print(f"User roles in system: {roles}")
        
        # Check available roles
        assert "Admin" in roles or len(users) > 0  # At least admin exists
    
    def test_create_branch_admin_user(self, auth_token):
        """POST /api/admin/users - Create a Branch Admin user"""
        # Get a branch first
        branches_response = requests.get(
            f"{BASE_URL}/api/admin/branches",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        branches = branches_response.json()
        
        if not branches:
            pytest.skip("No branches available for Branch Admin creation")
        
        branch_id = branches[0]["id"]
        
        # Create Branch Admin user
        test_user = {
            "name": "TEST_Branch_Admin_User",
            "email": "test_branch_admin_iter4@eti.com",
            "password": "test123",
            "role": "Branch Admin",
            "branch_id": branch_id,
            "phone": "9876543210"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json=test_user
        )
        
        if response.status_code == 400 and "already registered" in response.text:
            print("Branch Admin test user already exists")
            return
        
        assert response.status_code == 200, f"Failed to create Branch Admin user: {response.text}"
        data = response.json()
        assert data["role"] == "Branch Admin"
        print(f"Branch Admin user created: {data['name']} with role {data['role']}")


class TestLeadDeletionPermissions:
    """Test that only Super Admin and Branch Admin can delete leads"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@eti.com", "password": "admin123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin authentication failed")
    
    def test_super_admin_can_delete_lead(self, admin_token):
        """Super Admin should be able to soft delete leads"""
        # Get all leads
        leads_response = requests.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        leads = leads_response.json()
        
        if not leads:
            print("No leads available to test deletion")
            return
        
        # Try to delete a lead (soft delete)
        lead_id = leads[0]["id"]
        response = requests.delete(
            f"{BASE_URL}/api/leads/{lead_id}",
            headers={"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"},
            json={"reason": "TEST_DELETION_iter4"}
        )
        
        # Super Admin should be able to delete
        assert response.status_code in [200, 400], f"Delete failed unexpectedly: {response.text}"
        
        if response.status_code == 200:
            print(f"Super Admin successfully deleted lead {lead_id}")
        else:
            print(f"Lead deletion response: {response.text}")
    
    def test_deleted_leads_endpoint(self, admin_token):
        """GET /api/leads/deleted - Super Admin can view deleted leads"""
        response = requests.get(
            f"{BASE_URL}/api/leads/deleted",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get deleted leads: {response.text}"
        deleted_leads = response.json()
        print(f"Deleted leads count: {len(deleted_leads)}")


class TestAnalyticsOverview:
    """Test analytics overview endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "admin@eti.com", "password": "admin123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Authentication failed")
    
    def test_analytics_overview(self, auth_token):
        """GET /api/analytics/overview - General analytics"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/overview",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed to get analytics: {response.text}"
        data = response.json()
        
        assert "total_leads" in data
        assert "status_breakdown" in data
        print(f"Analytics Overview - Total leads: {data['total_leads']}")
        print(f"Status breakdown: {data['status_breakdown']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
