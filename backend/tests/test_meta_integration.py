"""
Test Meta (Facebook/Instagram) Integration APIs
Tests: POST/GET/PUT /api/meta/config, GET /api/meta/configs, 
       GET /api/meta/analytics/{branch_id}, GET /api/meta/leads
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "admin@etieducom.com"
SUPER_ADMIN_PASSWORD = "admin@123"
BRANCH_ADMIN_EMAIL = "branchadmin@etieducom.com"
BRANCH_ADMIN_PASSWORD = "admin@123"

# Known test branch from main agent context
TEST_BRANCH_ID = "18ec2cdd-28d2-4f0a-a85a-9077b5f52c21"

# User-provided Meta credentials
META_APP_ID = "1450852853090759"
META_APP_SECRET = "041957404f823363dae6ea1bbede8775"
META_PAGE_IDS = ["1816156461993200", "2150448635145655"]

class TestMetaConfigAPIs:
    """Test Meta Config CRUD APIs - Super Admin only"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session and login as Super Admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as Super Admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.super_admin_token = token
            self.user = login_response.json().get("user", {})
        else:
            pytest.skip("Super Admin login failed - skipping meta config tests")
    
    def test_super_admin_login_success(self):
        """Test Super Admin can login successfully"""
        assert hasattr(self, 'super_admin_token') and self.super_admin_token
        assert self.user.get('role') == 'Admin'
        print(f"✓ Super Admin login successful: {self.user.get('email')}")
    
    def test_list_meta_configs_endpoint(self):
        """Test GET /api/meta/configs - List all Meta configurations"""
        response = self.session.get(f"{BASE_URL}/api/meta/configs")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        configs = response.json()
        assert isinstance(configs, list), "Response should be a list"
        
        # Verify sensitive data is hidden
        for config in configs:
            assert 'app_secret' not in config or config.get('app_secret') is None, "App secret should not be exposed"
            assert 'access_token' not in config or config.get('access_token') is None, "Access token should not be exposed"
        
        print(f"✓ Found {len(configs)} Meta configurations")
        return configs
    
    def test_get_meta_config_for_branch(self):
        """Test GET /api/meta/config/{branch_id} - Get config for specific branch"""
        response = self.session.get(f"{BASE_URL}/api/meta/config/{TEST_BRANCH_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        if data.get('configured'):
            config = data.get('config', {})
            assert config.get('branch_id') == TEST_BRANCH_ID
            # Verify sensitive data is hidden
            assert config.get('app_secret') == '***hidden***', "App secret should be hidden"
            print(f"✓ Meta config found for branch {TEST_BRANCH_ID}: App ID = {config.get('app_id')}")
        else:
            print(f"✓ No Meta config for branch {TEST_BRANCH_ID} (expected if not configured)")
    
    def test_create_or_update_meta_config(self):
        """Test POST/PUT /api/meta/config - Create or update configuration"""
        # First check if config exists
        get_response = self.session.get(f"{BASE_URL}/api/meta/config/{TEST_BRANCH_ID}")
        config_exists = get_response.status_code == 200 and get_response.json().get('configured')
        
        if config_exists:
            # Test PUT - Update existing config
            update_data = {
                "app_id": META_APP_ID,
                "page_id": META_PAGE_IDS[0],
                "page_ids": META_PAGE_IDS
            }
            response = self.session.put(f"{BASE_URL}/api/meta/config/{TEST_BRANCH_ID}", json=update_data)
            
            assert response.status_code == 200, f"Update failed: {response.status_code}: {response.text}"
            assert "updated" in response.json().get('message', '').lower()
            print(f"✓ Meta config updated for branch {TEST_BRANCH_ID}")
        else:
            # Test POST - Create new config
            create_data = {
                "branch_id": TEST_BRANCH_ID,
                "app_id": META_APP_ID,
                "app_secret": META_APP_SECRET,
                "page_id": META_PAGE_IDS[0],
                "page_ids": META_PAGE_IDS
            }
            response = self.session.post(f"{BASE_URL}/api/meta/config", json=create_data)
            
            # Either 200 (created) or 400 (already exists)
            if response.status_code == 200:
                assert 'webhook_verify_token' in response.json(), "Should return webhook verify token"
                print(f"✓ Meta config created for branch {TEST_BRANCH_ID}")
            elif response.status_code == 400:
                assert "already exists" in response.json().get('detail', '').lower()
                print(f"✓ Meta config already exists for branch {TEST_BRANCH_ID}")
            else:
                pytest.fail(f"Unexpected status code: {response.status_code}: {response.text}")


class TestMetaAnalyticsAPI:
    """Test Meta Analytics API - Branch Admin access"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session and login as Branch Admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as Branch Admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": BRANCH_ADMIN_EMAIL, "password": BRANCH_ADMIN_PASSWORD},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.branch_admin_token = token
            self.user = login_response.json().get("user", {})
            self.branch_id = self.user.get('branch_id')
        else:
            pytest.skip("Branch Admin login failed - skipping analytics tests")
    
    def test_branch_admin_login_success(self):
        """Test Branch Admin can login successfully"""
        assert hasattr(self, 'branch_admin_token') and self.branch_admin_token
        assert self.user.get('role') == 'Branch Admin'
        print(f"✓ Branch Admin login successful: {self.user.get('email')}")
    
    def test_get_meta_analytics(self):
        """Test GET /api/meta/analytics/{branch_id} - Get analytics with AI analysis"""
        if not self.branch_id:
            pytest.skip("Branch Admin has no branch_id assigned")
        
        response = self.session.get(f"{BASE_URL}/api/meta/analytics/{self.branch_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert 'period' in data, "Response should have 'period' field"
        assert 'summary' in data, "Response should have 'summary' field"
        assert 'campaigns' in data, "Response should have 'campaigns' field"
        
        # Verify summary fields
        summary = data.get('summary', {})
        expected_fields = ['total_spend', 'total_impressions', 'total_reach', 'total_clicks', 
                          'ctr', 'total_leads', 'converted_leads', 'cost_per_lead', 'conversion_rate']
        for field in expected_fields:
            assert field in summary, f"Summary should have '{field}' field"
        
        print(f"✓ Meta analytics retrieved for branch {self.branch_id}")
        print(f"  - Total Spend: {summary.get('total_spend')}")
        print(f"  - Total Leads: {summary.get('total_leads')}")
        print(f"  - Cost per Lead: {summary.get('cost_per_lead')}")
        
        # Check if AI analysis is present (optional - depends on LLM availability)
        if 'ai_analysis' in data and data['ai_analysis']:
            print(f"  - AI Analysis: Available")
        else:
            print(f"  - AI Analysis: Not available (LLM not configured or no data)")
    
    def test_get_meta_analytics_with_days_param(self):
        """Test GET /api/meta/analytics/{branch_id}?days=7 - Analytics with custom days"""
        if not self.branch_id:
            pytest.skip("Branch Admin has no branch_id assigned")
        
        response = self.session.get(f"{BASE_URL}/api/meta/analytics/{self.branch_id}", params={"days": 7})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        period = data.get('period', {})
        assert 'start' in period and 'end' in period
        print(f"✓ Meta analytics with days=7: {period.get('start')} to {period.get('end')}")


class TestMetaLeadsAPI:
    """Test Meta Leads API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session and login as Branch Admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as Branch Admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": BRANCH_ADMIN_EMAIL, "password": BRANCH_ADMIN_PASSWORD},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.branch_id = login_response.json().get("user", {}).get('branch_id')
    
    def test_get_meta_leads(self):
        """Test GET /api/meta/leads - Get Facebook leads"""
        response = self.session.get(f"{BASE_URL}/api/meta/leads")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        leads = response.json()
        assert isinstance(leads, list), "Response should be a list"
        
        print(f"✓ Retrieved {len(leads)} Meta leads")
        
        # If there are leads, verify structure
        if leads:
            lead = leads[0]
            expected_fields = ['id', 'branch_id', 'leadgen_id', 'page_id', 'is_synced_to_crm']
            for field in expected_fields:
                assert field in lead, f"Lead should have '{field}' field"
            print(f"  - First lead: {lead.get('name', 'Unknown')} (synced: {lead.get('is_synced_to_crm')})")
    
    def test_get_meta_leads_filtered_by_branch(self):
        """Test GET /api/meta/leads?branch_id={id} - Filter by branch"""
        if not self.branch_id:
            pytest.skip("Branch Admin has no branch_id")
        
        response = self.session.get(f"{BASE_URL}/api/meta/leads", params={"branch_id": self.branch_id})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        leads = response.json()
        # All leads should be from the requested branch
        for lead in leads:
            assert lead.get('branch_id') == self.branch_id, f"Lead branch_id mismatch"
        
        print(f"✓ Retrieved {len(leads)} Meta leads for branch {self.branch_id}")


class TestMetaWebhook:
    """Test Facebook Webhook endpoint"""
    
    def test_webhook_verification_endpoint_exists(self):
        """Test GET /api/webhooks/facebook-leads - Webhook verification endpoint"""
        response = requests.get(f"{BASE_URL}/api/webhooks/facebook-leads")
        
        # Without proper params, should return 403 or 422
        assert response.status_code in [403, 422, 400], f"Expected 403/422/400, got {response.status_code}"
        print(f"✓ Webhook verification endpoint exists (returns {response.status_code} without params)")
    
    def test_webhook_post_endpoint_exists(self):
        """Test POST /api/webhooks/facebook-leads - Webhook handler"""
        # Send a mock webhook payload
        mock_payload = {
            "object": "page",
            "entry": []
        }
        response = requests.post(f"{BASE_URL}/api/webhooks/facebook-leads", json=mock_payload)
        
        # Should return 200 (webhook processed) even with empty data
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Webhook POST endpoint exists and accepts valid payloads")


class TestAccessControl:
    """Test role-based access control for Meta APIs"""
    
    def test_super_admin_access_to_configs(self):
        """Test Super Admin has access to /api/meta/configs"""
        session = requests.Session()
        
        # Login as Super Admin
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Super Admin login failed")
        
        token = login_response.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = session.get(f"{BASE_URL}/api/meta/configs")
        assert response.status_code == 200, "Super Admin should have access to /api/meta/configs"
        print(f"✓ Super Admin has access to Meta configs")
    
    def test_branch_admin_no_access_to_configs_list(self):
        """Test Branch Admin cannot access /api/meta/configs list"""
        session = requests.Session()
        
        # Login as Branch Admin
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": BRANCH_ADMIN_EMAIL, "password": BRANCH_ADMIN_PASSWORD},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Branch Admin login failed")
        
        token = login_response.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = session.get(f"{BASE_URL}/api/meta/configs")
        
        # Branch Admin should not have access to all configs
        assert response.status_code == 403, f"Branch Admin should get 403, got {response.status_code}"
        print(f"✓ Branch Admin correctly denied access to configs list")
    
    def test_branch_admin_access_to_own_analytics(self):
        """Test Branch Admin can access their own branch's analytics"""
        session = requests.Session()
        
        # Login as Branch Admin
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": BRANCH_ADMIN_EMAIL, "password": BRANCH_ADMIN_PASSWORD},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Branch Admin login failed")
        
        token = login_response.json().get("access_token")
        branch_id = login_response.json().get("user", {}).get("branch_id")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        if not branch_id:
            pytest.skip("Branch Admin has no branch_id")
        
        response = session.get(f"{BASE_URL}/api/meta/analytics/{branch_id}")
        assert response.status_code == 200, f"Branch Admin should access own analytics, got {response.status_code}"
        print(f"✓ Branch Admin has access to own branch analytics")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
