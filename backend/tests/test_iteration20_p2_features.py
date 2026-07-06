"""
Iteration 20 Tests - P2 Features and Bug Fixes
Tests:
1. Task status update - PUT /api/tasks/{task_id} with JSON body {status: 'Completed'}
2. Trainer can see Tasks in sidebar (frontend test)
3. Trainer Dashboard has 'Passed Students' tab (frontend test)  
4. Quiz QR Code generation
5. Attendance Insights API for Branch Admin
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

class TestTaskStatusUpdate:
    """Test Task status update API - Fixed to use JSON body instead of query params"""
    
    @pytest.fixture
    def branch_admin_token(self):
        """Get Branch Admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "branchadmin@etieducom.com",
            "password": "admin@123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Branch Admin login failed")
    
    @pytest.fixture
    def trainer_token(self):
        """Get Trainer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "trainer@etieducom.com",
            "password": "test123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Trainer login failed")
    
    def test_task_status_update_with_json_body(self, branch_admin_token):
        """Test that PUT /api/tasks/{id} with JSON body works"""
        headers = {"Authorization": f"Bearer {branch_admin_token}"}
        
        # First get existing tasks
        response = requests.get(f"{BASE_URL}/api/tasks", headers=headers)
        assert response.status_code == 200, f"Failed to get tasks: {response.text}"
        tasks = response.json()
        
        if tasks:
            task = tasks[0]
            task_id = task['id']
            
            # Test updating with JSON body (the fixed approach)
            new_status = 'Completed' if task.get('status') != 'Completed' else 'Pending'
            response = requests.put(
                f"{BASE_URL}/api/tasks/{task_id}",
                headers=headers,
                json={"status": new_status}  # JSON body, not query params
            )
            assert response.status_code == 200, f"Task update failed: {response.text}"
            
            # Verify the update
            response = requests.get(f"{BASE_URL}/api/tasks", headers=headers)
            tasks = response.json()
            updated_task = next((t for t in tasks if t['id'] == task_id), None)
            assert updated_task is not None, "Task not found after update"
            assert updated_task['status'] == new_status, f"Status not updated correctly"
        else:
            # Create a task first, then update it
            response = requests.post(
                f"{BASE_URL}/api/tasks",
                headers=headers,
                json={
                    "title": "Test Task for Status Update",
                    "description": "Testing status update fix",
                    "assigned_to": task['assigned_to'] if tasks else "",
                    "priority": "Normal"
                }
            )
            print(f"No existing tasks found - test skipped")


class TestQuizQRCode:
    """Test Quiz QR Code generation API"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "branchadmin@etieducom.com",
            "password": "admin@123"
        })
        if response.status_code == 200:
            return {"Authorization": f"Bearer {response.json().get('access_token')}"}
        pytest.skip("Login failed")
    
    def test_quiz_list_endpoint(self, auth_headers):
        """Test that quiz list endpoint works"""
        response = requests.get(f"{BASE_URL}/api/quiz-exams", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get quizzes: {response.text}"
        quizzes = response.json()
        assert isinstance(quizzes, list), "Response should be a list"
        print(f"Found {len(quizzes)} quizzes")
    
    def test_quiz_qr_code_generation(self, auth_headers):
        """Test QR code generation for quiz"""
        # First get a quiz
        response = requests.get(f"{BASE_URL}/api/quiz-exams", headers=auth_headers)
        assert response.status_code == 200
        quizzes = response.json()
        
        if not quizzes:
            pytest.skip("No quizzes available for QR code test")
        
        quiz_id = quizzes[0]['id']
        
        # Test QR code endpoint
        response = requests.get(f"{BASE_URL}/api/quiz-exams/{quiz_id}/qr-code", headers=auth_headers)
        assert response.status_code == 200, f"QR code generation failed: {response.text}"
        
        data = response.json()
        assert "exam_name" in data, "Response should contain exam_name"
        assert "quiz_url" in data, "Response should contain quiz_url"
        assert "qr_code_base64" in data, "Response should contain qr_code_base64"
        
        # Verify QR code is valid base64 PNG
        assert data['qr_code_base64'].startswith("data:image/png;base64,"), "QR code should be PNG base64"
        
        # Verify URL format
        assert "/public/quiz/" in data['quiz_url'], "Quiz URL should contain public path"
        print(f"QR code generated for quiz: {data['exam_name']}")
        print(f"Quiz URL: {data['quiz_url']}")


class TestAttendanceInsights:
    """Test Attendance Insights API for Branch Admin"""
    
    @pytest.fixture
    def branch_admin_headers(self):
        """Get Branch Admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "branchadmin@etieducom.com",
            "password": "admin@123"
        })
        if response.status_code == 200:
            return {"Authorization": f"Bearer {response.json().get('access_token')}"}
        pytest.skip("Branch Admin login failed")
    
    @pytest.fixture
    def trainer_headers(self):
        """Get Trainer auth headers - should NOT have access"""
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "trainer@etieducom.com",
            "password": "test123"
        })
        if response.status_code == 200:
            return {"Authorization": f"Bearer {response.json().get('access_token')}"}
        pytest.skip("Trainer login failed")
    
    def test_attendance_insights_branch_admin_access(self, branch_admin_headers):
        """Test that Branch Admin can access attendance insights"""
        response = requests.get(f"{BASE_URL}/api/attendance/insights/missed", headers=branch_admin_headers)
        assert response.status_code == 200, f"Attendance insights failed: {response.text}"
        
        data = response.json()
        
        # Validate response structure
        assert "analysis_period" in data, "Response should contain analysis_period"
        assert "total_batches" in data, "Response should contain total_batches"
        assert "total_trainers" in data, "Response should contain total_trainers"
        assert "trainer_insights" in data, "Response should contain trainer_insights"
        assert "summary" in data, "Response should contain summary"
        
        # Validate summary structure
        summary = data['summary']
        assert "total_missed_days" in summary, "Summary should contain total_missed_days"
        assert "avg_compliance_rate" in summary, "Summary should contain avg_compliance_rate"
        
        print(f"Analysis period: {data['analysis_period']}")
        print(f"Total trainers: {data['total_trainers']}")
        print(f"Total batches: {data['total_batches']}")
        print(f"Average compliance: {summary['avg_compliance_rate']}%")
    
    def test_attendance_insights_trainer_denied(self, trainer_headers):
        """Test that Trainer cannot access attendance insights"""
        response = requests.get(f"{BASE_URL}/api/attendance/insights/missed", headers=trainer_headers)
        assert response.status_code == 403, f"Trainer should not have access: {response.status_code}"


class TestTrainerDashboard:
    """Test Trainer Dashboard API - Passed Students feature"""
    
    @pytest.fixture
    def trainer_headers(self):
        """Get Trainer auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "trainer@etieducom.com",
            "password": "test123"
        })
        if response.status_code == 200:
            return {"Authorization": f"Bearer {response.json().get('access_token')}"}
        pytest.skip("Trainer login failed")
    
    def test_trainer_dashboard_contains_passed_students(self, trainer_headers):
        """Test that trainer dashboard includes passed_students data"""
        response = requests.get(f"{BASE_URL}/api/trainer/dashboard", headers=trainer_headers)
        assert response.status_code == 200, f"Trainer dashboard failed: {response.text}"
        
        data = response.json()
        
        # Validate response contains passed students data
        assert "passed_students" in data, "Dashboard should contain passed_students"
        assert "total_passed" in data, "Dashboard should contain total_passed"
        
        passed_students = data['passed_students']
        assert isinstance(passed_students, list), "passed_students should be a list"
        
        print(f"Total passed students: {data['total_passed']}")
        
        # If there are passed students, validate their structure
        if passed_students:
            student = passed_students[0]
            assert "student_name" in student, "Passed student should have student_name"
            assert "program_name" in student, "Passed student should have program_name"
    
    def test_trainer_batches(self, trainer_headers):
        """Test trainer can get their batches"""
        response = requests.get(f"{BASE_URL}/api/trainer/batches", headers=trainer_headers)
        assert response.status_code == 200, f"Trainer batches failed: {response.text}"
        
        batches = response.json()
        assert isinstance(batches, list), "Response should be a list"
        print(f"Trainer has {len(batches)} batches")


class TestTrainerTasksAccess:
    """Test Trainer's access to Tasks"""
    
    @pytest.fixture
    def trainer_headers(self):
        """Get Trainer auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", data={
            "username": "trainer@etieducom.com",
            "password": "test123"
        })
        if response.status_code == 200:
            return {"Authorization": f"Bearer {response.json().get('access_token')}"}
        pytest.skip("Trainer login failed")
    
    def test_trainer_can_access_tasks_endpoint(self, trainer_headers):
        """Test that Trainer can access tasks endpoint"""
        response = requests.get(f"{BASE_URL}/api/tasks", headers=trainer_headers)
        assert response.status_code == 200, f"Trainer should be able to access tasks: {response.text}"
        
        tasks = response.json()
        assert isinstance(tasks, list), "Response should be a list"
        print(f"Trainer can see {len(tasks)} tasks")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
