"""
Test Iteration 5 Features:
1. Dashboard deleted leads count (analytics)
2. WhatsApp per-event templates (5 events)
3. Quiz Exam module (CRUD, public access)
4. Branch Admin task assignment (/branch/users endpoint)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthentication:
    """Test login functionality"""
    
    def test_super_admin_login(self):
        """Super Admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "admin@eti.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "Admin"
        print(f"SUCCESS: Super Admin login - token received")
        return data["access_token"]


class TestDashboardDeletedLeads:
    """Test deleted leads analytics"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "admin@eti.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_analytics_overview_includes_deleted_count(self, auth_token):
        """Analytics overview should include deleted_leads count separately"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/overview", headers=headers)
        
        assert response.status_code == 200, f"API failed: {response.text}"
        data = response.json()
        
        # Check required fields
        assert "total_leads" in data, "Missing total_leads field"
        assert "status_breakdown" in data, "Missing status_breakdown field"
        
        # Check deleted_leads is present (either as separate field or in status_breakdown)
        has_deleted = "deleted_leads" in data or "Deleted" in data.get("status_breakdown", {})
        assert has_deleted, "Missing deleted_leads count in analytics"
        
        deleted_count = data.get("deleted_leads", data.get("status_breakdown", {}).get("Deleted", 0))
        print(f"SUCCESS: Analytics overview includes deleted_leads count: {deleted_count}")
        print(f"Total leads (excluding deleted): {data['total_leads']}")
        print(f"Status breakdown: {data['status_breakdown']}")
    
    def test_branch_wise_analytics_includes_deleted(self, auth_token):
        """Branch-wise analytics should include deleted_leads per branch"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/branch-wise", headers=headers)
        
        assert response.status_code == 200, f"API failed: {response.text}"
        data = response.json()
        
        if len(data) > 0:
            # Check each branch has deleted_leads field
            for branch in data:
                assert "deleted_leads" in branch, f"Branch {branch.get('branch_name')} missing deleted_leads"
            print(f"SUCCESS: Branch-wise analytics includes deleted_leads for {len(data)} branches")


class TestWhatsAppPerEventTemplates:
    """Test WhatsApp per-event template configuration"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "admin@eti.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_whatsapp_settings_has_5_events(self, auth_token):
        """WhatsApp settings should include 5 event configurations"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/whatsapp-settings", headers=headers)
        
        assert response.status_code == 200, f"API failed: {response.text}"
        data = response.json()
        
        # Check master settings
        assert "enabled" in data, "Missing enabled field"
        assert "integrated_number" in data, "Missing integrated_number field"
        assert "events" in data, "Missing events field"
        
        # Check for 5 specific events
        expected_events = [
            "enquiry_saved",
            "demo_booked", 
            "enrollment_confirmed",
            "fee_reminder",
            "birthday_wishes"
        ]
        
        events = data["events"]
        for event_name in expected_events:
            assert event_name in events, f"Missing event: {event_name}"
            event = events[event_name]
            assert "enabled" in event, f"Event {event_name} missing enabled"
            assert "template_name" in event, f"Event {event_name} missing template_name"
            assert "namespace" in event, f"Event {event_name} missing namespace"
            assert "variables" in event, f"Event {event_name} missing variables"
        
        print(f"SUCCESS: WhatsApp settings has all 5 events configured:")
        for event_name in expected_events:
            event = events[event_name]
            print(f"  - {event_name}: enabled={event['enabled']}, variables={event.get('variables', [])}")
    
    def test_update_event_template_settings(self, auth_token):
        """Should be able to update individual event template settings"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        # Get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/whatsapp-settings", headers=headers)
        current_settings = get_response.json()
        
        # Update one event's template
        test_template_name = "test_enquiry_template"
        test_namespace = "test_namespace_12345"
        
        current_settings["events"]["enquiry_saved"]["template_name"] = test_template_name
        current_settings["events"]["enquiry_saved"]["namespace"] = test_namespace
        
        update_response = requests.put(
            f"{BASE_URL}/api/admin/whatsapp-settings",
            headers=headers,
            json=current_settings
        )
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update persisted
        verify_response = requests.get(f"{BASE_URL}/api/admin/whatsapp-settings", headers=headers)
        updated_data = verify_response.json()
        
        # Check the event was updated
        enquiry_event = updated_data["events"]["enquiry_saved"]
        assert enquiry_event["template_name"] == test_template_name
        assert enquiry_event["namespace"] == test_namespace
        
        print(f"SUCCESS: Event template settings updated and persisted")


class TestQuizExamsModule:
    """Test Quiz-Based Exams module"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "admin@eti.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_get_quiz_exams_list(self, auth_token):
        """Should list all quiz exams"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/quiz-exams", headers=headers)
        
        assert response.status_code == 200, f"API failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"SUCCESS: Found {len(data)} quiz exams")
        for quiz in data:
            print(f"  - {quiz.get('name')}: {quiz.get('total_questions', 0)} questions, {quiz.get('duration_minutes', 0)} mins")
    
    def test_create_quiz_exam(self, auth_token):
        """Super Admin can create quiz exam with questions"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        quiz_data = {
            "name": "TEST_English_Proficiency_Quiz",
            "description": "Test quiz for English proficiency",
            "duration_minutes": 15,
            "pass_percentage": 60,
            "questions": [
                {
                    "question_number": 1,
                    "question_text": "What is the past tense of 'go'?",
                    "option_a": "goed",
                    "option_b": "went",
                    "option_c": "gone",
                    "option_d": "going",
                    "correct_answer": "B"
                },
                {
                    "question_number": 2,
                    "question_text": "Select the correct spelling:",
                    "option_a": "recieve",
                    "option_b": "receve",
                    "option_c": "receive",
                    "option_d": "recive",
                    "correct_answer": "C"
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/quiz-exams", headers=headers, json=quiz_data)
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "exam_id" in data, "Response should include exam_id"
        
        print(f"SUCCESS: Quiz exam created with ID: {data['exam_id']}")
        return data["exam_id"]
    
    def test_public_quiz_endpoint_no_auth(self):
        """Public quiz endpoint should work without authentication"""
        # First get a quiz ID
        auth_response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "admin@eti.com",
            "password": "admin123"
        })
        token = auth_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get list of quizzes
        list_response = requests.get(f"{BASE_URL}/api/quiz-exams", headers=headers)
        quizzes = list_response.json()
        
        if len(quizzes) == 0:
            pytest.skip("No quizzes available for public test")
        
        quiz_id = quizzes[0]["id"]
        
        # Now test public endpoint without auth
        public_response = requests.get(f"{BASE_URL}/api/public/quiz/{quiz_id}")
        
        assert public_response.status_code == 200, f"Public endpoint failed: {public_response.text}"
        data = public_response.json()
        
        # Verify required fields present
        assert "name" in data
        assert "duration_minutes" in data
        assert "total_questions" in data
        assert "questions" in data
        
        # Verify correct answers are NOT exposed
        for q in data["questions"]:
            assert "correct_answer" not in q, "Public quiz should not expose correct answers!"
        
        print(f"SUCCESS: Public quiz endpoint works - {data['name']}, {data['total_questions']} questions")
        print(f"  Correct answers properly hidden from public view")
    
    def test_get_quiz_details_admin(self, auth_token):
        """Admin can see full quiz details including correct answers"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get list of quizzes
        list_response = requests.get(f"{BASE_URL}/api/quiz-exams", headers=headers)
        quizzes = list_response.json()
        
        if len(quizzes) == 0:
            pytest.skip("No quizzes available for details test")
        
        quiz_id = quizzes[0]["id"]
        
        # Get full details
        details_response = requests.get(f"{BASE_URL}/api/quiz-exams/{quiz_id}", headers=headers)
        
        assert details_response.status_code == 200, f"Details failed: {details_response.text}"
        data = details_response.json()
        
        # Admin should see correct answers
        if data.get("questions"):
            for q in data["questions"]:
                assert "correct_answer" in q, "Admin should see correct answers"
        
        print(f"SUCCESS: Admin can see full quiz details with correct answers")
    
    def test_quiz_attempts_endpoint(self, auth_token):
        """Admin can view all quiz attempts"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/quiz-attempts", headers=headers)
        
        assert response.status_code == 200, f"API failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        print(f"SUCCESS: Quiz attempts endpoint works - {len(data)} attempts found")


class TestBranchAdminTaskAssignment:
    """Test Branch Admin can see users in their branch for task assignment"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "admin@eti.com",
            "password": "admin123"
        })
        return response.json()["access_token"]
    
    def test_branch_users_endpoint_exists(self, admin_token):
        """/branch/users endpoint should exist and work"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/branch/users", headers=headers)
        
        assert response.status_code == 200, f"API failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        print(f"SUCCESS: /branch/users endpoint works - {len(data)} users returned for Super Admin")
    
    def test_create_branch_admin_and_verify_branch_users(self, admin_token):
        """Create Branch Admin and verify they can access /branch/users"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        
        # First get a branch
        branches_response = requests.get(f"{BASE_URL}/api/admin/branches", headers=headers)
        branches = branches_response.json()
        
        if len(branches) == 0:
            pytest.skip("No branches available for testing")
        
        branch_id = branches[0]["id"]
        branch_name = branches[0]["name"]
        
        # Create a Branch Admin user
        branch_admin_data = {
            "email": "test_branch_admin_iter5@eti.com",
            "password": "test123",
            "name": "TEST Branch Admin Iter5",
            "role": "Branch Admin",
            "branch_id": branch_id,
            "phone": "9876543210"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/users", headers=headers, json=branch_admin_data)
        
        if create_response.status_code == 400 and "already registered" in create_response.text:
            print("Branch Admin already exists, testing login...")
        else:
            assert create_response.status_code == 200, f"Create user failed: {create_response.text}"
            print(f"SUCCESS: Created Branch Admin for {branch_name}")
        
        # Login as Branch Admin
        ba_login = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "test_branch_admin_iter5@eti.com",
            "password": "test123"
        })
        
        if ba_login.status_code != 200:
            pytest.skip("Could not login as Branch Admin")
        
        ba_token = ba_login.json()["access_token"]
        ba_headers = {"Authorization": f"Bearer {ba_token}"}
        
        # Branch Admin should be able to access /branch/users
        ba_users_response = requests.get(f"{BASE_URL}/api/branch/users", headers=ba_headers)
        
        assert ba_users_response.status_code == 200, f"Branch Admin cannot access /branch/users: {ba_users_response.text}"
        ba_users = ba_users_response.json()
        
        # Verify Branch Admin only sees users from their branch
        for user in ba_users:
            assert user.get("branch_id") == branch_id or user.get("branch_id") is None, \
                f"Branch Admin sees user from different branch: {user.get('email')}"
        
        print(f"SUCCESS: Branch Admin sees {len(ba_users)} users in their branch")
        
        # Branch Admin should NOT have access to /admin/users
        admin_users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=ba_headers)
        assert admin_users_response.status_code == 403, "Branch Admin should not access /admin/users"
        
        print(f"SUCCESS: Branch Admin correctly restricted from /admin/users (403)")


class TestExistingQuizExam:
    """Test the existing quiz exam mentioned in requirements"""
    
    def test_existing_quiz_c731a28a(self):
        """Test the existing quiz exam c731a28a-a1be-4e26-bb28-d8ee2f3157cb"""
        existing_quiz_id = "c731a28a-a1be-4e26-bb28-d8ee2f3157cb"
        
        # Test public access
        response = requests.get(f"{BASE_URL}/api/public/quiz/{existing_quiz_id}")
        
        if response.status_code == 404:
            print(f"INFO: Existing quiz {existing_quiz_id} not found - may have been deleted")
            pytest.skip("Existing quiz not found")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        print(f"SUCCESS: Existing quiz found: {data.get('name')}")
        print(f"  Duration: {data.get('duration_minutes')} mins")
        print(f"  Questions: {data.get('total_questions')}")


# Cleanup function
def cleanup_test_data():
    """Clean up test data created during testing"""
    try:
        auth_response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "admin@eti.com",
            "password": "admin123"
        })
        token = auth_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get and delete test quizzes
        quizzes = requests.get(f"{BASE_URL}/api/quiz-exams", headers=headers).json()
        for quiz in quizzes:
            if quiz.get("name", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/quiz-exams/{quiz['id']}", headers=headers)
                print(f"Cleaned up quiz: {quiz['name']}")
    except Exception as e:
        print(f"Cleanup warning: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
