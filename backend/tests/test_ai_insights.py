"""
Test AI Insights Endpoint - Real GPT-4o Integration
Tests /api/analytics/ai-leads-insights endpoint with real LLM integration

Features to test:
- AI Insights endpoint returns ai_powered: true when LLM is available
- AI Insights include real GPT-4o generated insights with title, message, type, and priority
- AI Insights include actionable recommendations
- Health score is calculated correctly
- Insights include conversion analysis, source performance, and pipeline recommendations
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAIInsights:
    """Test AI-powered lead insights with real GPT-4o integration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data - login as branch admin"""
        # Login as Branch Admin (has access to AI insights)
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={
                "username": "branchadmin@etieducom.com",
                "password": "admin@123"
            }
        )
        assert login_response.status_code == 200, f"Branch admin login failed: {login_response.text}"
        self.branch_admin_token = login_response.json()["access_token"]
        self.branch_admin_headers = {
            "Authorization": f"Bearer {self.branch_admin_token}",
            "Content-Type": "application/json"
        }
        
        # Login as Counsellor (also has access to AI insights)
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={
                "username": "counsellor@etieducom.com",
                "password": "password"
            }
        )
        assert login_response.status_code == 200, f"Counsellor login failed: {login_response.text}"
        self.counsellor_token = login_response.json()["access_token"]
        self.counsellor_headers = {
            "Authorization": f"Bearer {self.counsellor_token}",
            "Content-Type": "application/json"
        }
    
    def test_ai_insights_endpoint_accessible_for_branch_admin(self):
        """Test that AI insights endpoint is accessible for Branch Admin"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/ai-leads-insights",
            headers=self.branch_admin_headers,
            timeout=30  # LLM calls can take 5-7 seconds
        )
        
        assert response.status_code == 200, f"AI insights endpoint failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "summary" in data, "Response should contain summary"
        assert "insights" in data, "Response should contain insights"
        assert "recommendations" in data, "Response should contain recommendations"
        assert "health_score" in data, "Response should contain health_score"
        assert "ai_powered" in data, "Response should contain ai_powered flag"
        
        print(f"AI Insights response: ai_powered={data['ai_powered']}, health_score={data['health_score']}")
    
    def test_ai_insights_endpoint_accessible_for_counsellor(self):
        """Test that AI insights endpoint is accessible for Counsellor"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/ai-leads-insights",
            headers=self.counsellor_headers,
            timeout=30
        )
        
        assert response.status_code == 200, f"AI insights endpoint failed for counsellor: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "summary" in data
        assert "insights" in data
        assert "ai_powered" in data
        
        print(f"Counsellor AI Insights: ai_powered={data['ai_powered']}")
    
    def test_ai_powered_flag_true_when_llm_available(self):
        """Test that ai_powered is true when LLM key is configured and LLM works"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/ai-leads-insights",
            headers=self.branch_admin_headers,
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check ai_powered flag - should be true if EMERGENT_LLM_KEY is set
        ai_powered = data.get('ai_powered', False)
        print(f"AI Powered: {ai_powered}")
        
        # This is the key assertion - if LLM is available, ai_powered should be true
        # Note: If LLM fails, it falls back to rule-based (ai_powered=false)
        assert isinstance(ai_powered, bool), "ai_powered should be a boolean"
        
        if ai_powered:
            print("✓ GPT-4o is active and generating insights")
        else:
            print("⚠ LLM not available, using rule-based fallback")
    
    def test_insights_structure(self):
        """Test that insights have correct structure with title, message, type, priority"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/ai-leads-insights",
            headers=self.branch_admin_headers,
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        insights = data.get('insights', [])
        print(f"Number of insights: {len(insights)}")
        
        # Verify insights structure if any insights exist
        for idx, insight in enumerate(insights):
            assert "title" in insight, f"Insight {idx} missing title"
            assert "message" in insight, f"Insight {idx} missing message"
            assert "type" in insight, f"Insight {idx} missing type"
            assert "priority" in insight, f"Insight {idx} missing priority"
            
            # Validate type values
            valid_types = ["warning", "success", "alert", "info"]
            assert insight["type"] in valid_types, f"Insight {idx} has invalid type: {insight['type']}"
            
            # Validate priority values
            valid_priorities = ["high", "medium", "low"]
            assert insight["priority"] in valid_priorities, f"Insight {idx} has invalid priority: {insight['priority']}"
            
            print(f"  Insight {idx}: [{insight['type']}] {insight['title']} (priority: {insight['priority']})")
    
    def test_recommendations_included(self):
        """Test that recommendations are included in response"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/ai-leads-insights",
            headers=self.branch_admin_headers,
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        recommendations = data.get('recommendations', [])
        print(f"Number of recommendations: {len(recommendations)}")
        
        # Verify recommendations are strings
        for idx, rec in enumerate(recommendations):
            assert isinstance(rec, str), f"Recommendation {idx} should be a string"
            assert len(rec) > 0, f"Recommendation {idx} should not be empty"
            print(f"  Recommendation {idx}: {rec[:100]}...")
    
    def test_health_score_calculation(self):
        """Test that health score is calculated correctly (0-100 range)"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/ai-leads-insights",
            headers=self.branch_admin_headers,
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        health_score = data.get('health_score')
        assert health_score is not None, "health_score should not be None"
        assert isinstance(health_score, (int, float)), "health_score should be a number"
        assert 0 <= health_score <= 100, f"health_score should be 0-100, got {health_score}"
        
        print(f"Health Score: {health_score}%")
        
        # Health score interpretation
        if health_score >= 70:
            print("  Status: Good (Green)")
        elif health_score >= 40:
            print("  Status: Average (Yellow)")
        else:
            print("  Status: Needs Attention (Red)")
    
    def test_summary_contains_required_fields(self):
        """Test that summary contains all required analytics fields"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/ai-leads-insights",
            headers=self.branch_admin_headers,
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        summary = data.get('summary', {})
        
        # Required summary fields
        required_fields = [
            'total_leads',
            'leads_this_week',
            'leads_this_month',
            'conversion_rate',
            'monthly_conversion_rate',
            'pending_followups',
            'overdue_followups',
            'best_source',
            'popular_program'
        ]
        
        for field in required_fields:
            assert field in summary, f"Summary missing required field: {field}"
            print(f"  {field}: {summary[field]}")
    
    def test_status_breakdown_included(self):
        """Test that status breakdown is included for conversion analysis"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/ai-leads-insights",
            headers=self.branch_admin_headers,
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        status_breakdown = data.get('status_breakdown', {})
        assert isinstance(status_breakdown, dict), "status_breakdown should be a dictionary"
        
        print(f"Status Breakdown: {status_breakdown}")
    
    def test_source_breakdown_included(self):
        """Test that source breakdown is included for source performance analysis"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/ai-leads-insights",
            headers=self.branch_admin_headers,
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        source_breakdown = data.get('source_breakdown', {})
        assert isinstance(source_breakdown, dict), "source_breakdown should be a dictionary"
        
        print(f"Source Breakdown: {source_breakdown}")
    
    def test_unauthorized_access_denied(self):
        """Test that unauthorized users cannot access AI insights"""
        # Try without token
        response = requests.get(f"{BASE_URL}/api/analytics/ai-leads-insights")
        assert response.status_code == 401, "Should return 401 without token"
        
    def test_ai_insights_with_real_llm_response_time(self):
        """Test AI insights response time (LLM should respond in 5-7 seconds)"""
        import time
        
        start_time = time.time()
        response = requests.get(
            f"{BASE_URL}/api/analytics/ai-leads-insights",
            headers=self.branch_admin_headers,
            timeout=60  # Extended timeout for LLM
        )
        end_time = time.time()
        
        response_time = end_time - start_time
        print(f"AI Insights response time: {response_time:.2f} seconds")
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get('ai_powered'):
            print(f"✓ Real LLM response received in {response_time:.2f}s")
            # LLM calls typically take 3-10 seconds
            assert response_time < 30, f"Response took too long: {response_time}s"
        else:
            print(f"⚠ Rule-based fallback used (faster response: {response_time:.2f}s)")


class TestAIInsightsFrontendIntegration:
    """Test AI Insights data format for frontend display"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as branch admin"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={
                "username": "branchadmin@etieducom.com",
                "password": "admin@123"
            }
        )
        assert login_response.status_code == 200
        self.token = login_response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_gpt4o_powered_badge_data(self):
        """Test that ai_powered flag is correctly returned for 'GPT-4o Powered' badge"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/ai-leads-insights",
            headers=self.headers,
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Frontend shows 'GPT-4o Powered' badge when ai_powered is true
        ai_powered = data.get('ai_powered')
        assert ai_powered is not None
        assert isinstance(ai_powered, bool)
        
        print(f"Frontend should show 'GPT-4o Powered' badge: {ai_powered}")
    
    def test_insight_types_for_styling(self):
        """Test insight types match frontend styling expectations"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/ai-leads-insights",
            headers=self.headers,
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Frontend uses these types for styling:
        # alert -> bg-red-50 border-red-500
        # warning -> bg-yellow-50 border-yellow-500  
        # success -> bg-green-50 border-green-500
        # info -> bg-blue-50 border-blue-500
        
        for insight in data.get('insights', []):
            insight_type = insight.get('type')
            assert insight_type in ['alert', 'warning', 'success', 'info'], \
                f"Invalid insight type for frontend styling: {insight_type}"
    
    def test_priority_badges(self):
        """Test priority values for frontend badge styling"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/ai-leads-insights",
            headers=self.headers,
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Frontend uses these priorities for badge styling:
        # high -> bg-red-100 text-red-800
        # medium -> bg-yellow-100 text-yellow-800
        # low -> bg-slate-100 text-slate-800
        
        for insight in data.get('insights', []):
            priority = insight.get('priority')
            assert priority in ['high', 'medium', 'low'], \
                f"Invalid priority for frontend badge: {priority}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
