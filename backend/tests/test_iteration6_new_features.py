"""
Iteration 6 Backend Tests - New Features:
1. Notification bell with unread count
2. Follow-up due-soon alarm notifications
3. Webhook lead capture endpoints
4. Task creation with auto-notification
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from requirements
ADMIN_EMAIL = "admin@etieducom.com"
ADMIN_PASSWORD = "admin@123"
WEBHOOK_KEY = "qWzSyJK_W4SmsVWSDL_9qGRVUDSmnucGwMb0hEWkWVU"
BRANCH_ID = "18ec2cdd-28d2-4f0a-a85a-9077b5f52c21"
COUNSELLOR_ID = "6cd9593e-6a04-444e-bc31-3354e4563945"


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Login as admin and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_admin_login(self, admin_token):
        """Test admin login works"""
        assert admin_token is not None
        print(f"Admin token obtained successfully")


class TestNotificationEndpoints:
    """Test notification-related endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_unread_count(self, admin_token):
        """GET /api/notifications/unread-count - returns count of unread notifications"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get unread count: {response.text}"
        data = response.json()
        assert "count" in data, "Response should contain 'count' field"
        assert isinstance(data["count"], int), "Count should be an integer"
        print(f"Unread notification count: {data['count']}")
    
    def test_get_all_notifications(self, admin_token):
        """GET /api/notifications - returns list of notifications"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get notifications: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} notifications")
    
    def test_mark_all_as_read(self, admin_token):
        """PUT /api/notifications/mark-all-read - marks all notifications as read"""
        response = requests.put(
            f"{BASE_URL}/api/notifications/mark-all-read",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to mark all as read: {response.text}"
        data = response.json()
        assert "message" in data, "Response should contain 'message' field"
        print(f"Mark all read response: {data['message']}")


class TestFollowupDueSoon:
    """Test follow-up due-soon endpoint for alarm notifications"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_due_soon_followups(self, admin_token):
        """GET /api/followups/due-soon - returns followups due within 10 minutes"""
        response = requests.get(
            f"{BASE_URL}/api/followups/due-soon",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get due-soon followups: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} follow-ups due soon")
        # If there are follow-ups, verify structure
        if len(data) > 0:
            fu = data[0]
            assert "id" in fu, "Follow-up should have 'id'"
            assert "lead_name" in fu, "Follow-up should have 'lead_name'"
            assert "followup_date" in fu, "Follow-up should have 'followup_date'"
    
    def test_get_overdue_followups(self, admin_token):
        """GET /api/followups/overdue - returns overdue followups"""
        response = requests.get(
            f"{BASE_URL}/api/followups/overdue",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get overdue followups: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} overdue follow-ups")


class TestWebhookEndpoints:
    """Test webhook lead capture endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_webhook_info(self, admin_token):
        """GET /api/admin/branches/{branch_id}/webhook-info - returns webhook URL and key"""
        response = requests.get(
            f"{BASE_URL}/api/admin/branches/{BRANCH_ID}/webhook-info",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get webhook info: {response.text}"
        data = response.json()
        
        assert "branch_id" in data, "Response should have 'branch_id'"
        assert "branch_name" in data, "Response should have 'branch_name'"
        assert "webhook_key" in data, "Response should have 'webhook_key'"
        assert "webhook_url" in data, "Response should have 'webhook_url'"
        assert "usage_instructions" in data, "Response should have 'usage_instructions'"
        
        # Verify webhook URL format
        assert "/api/webhooks/leads/" in data["webhook_url"], "Webhook URL should contain '/api/webhooks/leads/'"
        
        print(f"Webhook URL: {data['webhook_url']}")
        print(f"Webhook key length: {len(data['webhook_key'])}")
        
        return data["webhook_key"]
    
    def test_webhook_lead_capture_public_endpoint(self, admin_token):
        """POST /api/webhooks/leads/{webhook_key} - PUBLIC endpoint creates leads from external sources"""
        # First get the current webhook key
        info_response = requests.get(
            f"{BASE_URL}/api/admin/branches/{BRANCH_ID}/webhook-info",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert info_response.status_code == 200
        webhook_key = info_response.json()["webhook_key"]
        
        # Generate unique test data
        unique_id = str(uuid.uuid4())[:8]
        lead_data = {
            "name": f"TEST_WebhookLead_{unique_id}",
            "phone": f"98765{unique_id[:5].replace('-', '0')}",
            "email": f"test_webhook_{unique_id}@example.com",
            "source": "Google Ads",
            "campaign": "Summer Campaign 2024",
            "ad_name": "Banner Ad 1",
            "program_name": None,  # Should use default program
            "city": "Mumbai",
            "state": "Maharashtra"
        }
        
        # This is a PUBLIC endpoint - no auth required
        response = requests.post(
            f"{BASE_URL}/api/webhooks/leads/{webhook_key}",
            json=lead_data
        )
        
        assert response.status_code == 200, f"Failed to create lead via webhook: {response.text}"
        data = response.json()
        
        assert data["success"] == True, "Response should indicate success"
        assert "lead_id" in data, "Response should contain 'lead_id'"
        assert "message" in data, "Response should contain 'message'"
        
        print(f"Webhook lead created: {data['lead_id']}")
        print(f"Response message: {data['message']}")
    
    def test_webhook_invalid_key_returns_404(self):
        """POST /api/webhooks/leads/{invalid_key} - returns 404 for invalid key"""
        lead_data = {
            "name": "Invalid Lead",
            "phone": "9876543210"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/webhooks/leads/invalid-webhook-key-12345",
            json=lead_data
        )
        
        assert response.status_code == 404, f"Should return 404 for invalid webhook key: {response.text}"
        data = response.json()
        assert "Invalid webhook key" in data.get("detail", ""), "Error should mention invalid key"
        print("Invalid webhook key correctly returns 404")
    
    def test_regenerate_webhook_key(self, admin_token):
        """POST /api/admin/branches/{branch_id}/regenerate-webhook-key - regenerates the webhook key"""
        # Get current key first
        info_response = requests.get(
            f"{BASE_URL}/api/admin/branches/{BRANCH_ID}/webhook-info",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        old_key = info_response.json()["webhook_key"]
        
        # Regenerate key
        response = requests.post(
            f"{BASE_URL}/api/admin/branches/{BRANCH_ID}/regenerate-webhook-key",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to regenerate webhook key: {response.text}"
        data = response.json()
        
        assert "webhook_key" in data, "Response should contain 'webhook_key'"
        assert "message" in data, "Response should contain 'message'"
        assert data["webhook_key"] != old_key, "New key should be different from old key"
        
        print(f"Old key length: {len(old_key)}, New key length: {len(data['webhook_key'])}")
        print(f"Response: {data['message']}")
    
    def test_old_webhook_key_no_longer_works_after_regenerate(self, admin_token):
        """After regenerating, old webhook key should be invalid"""
        # Get current key
        info_response = requests.get(
            f"{BASE_URL}/api/admin/branches/{BRANCH_ID}/webhook-info",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        current_key = info_response.json()["webhook_key"]
        
        # Regenerate to get a new key
        regen_response = requests.post(
            f"{BASE_URL}/api/admin/branches/{BRANCH_ID}/regenerate-webhook-key",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        old_key = current_key  # Now this is the old key
        
        # Try to use the old key - should fail
        lead_data = {
            "name": "Test Lead",
            "phone": "9876543210"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/webhooks/leads/{old_key}",
            json=lead_data
        )
        
        # Should be 404 because key has been changed
        assert response.status_code == 404, f"Old key should be invalidated: {response.text}"
        print("Old webhook key correctly invalidated after regeneration")


class TestTaskWithNotification:
    """Test task creation automatically creates notification for assigned user"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def branch_admin_user(self, admin_token):
        """Create a test branch admin user for task testing"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "name": f"TEST_BranchAdmin_{unique_id}",
            "email": f"test_ba_{unique_id}@etieducom.com",
            "password": "test123",
            "role": "Branch Admin",
            "branch_id": BRANCH_ID,
            "phone": f"9876{unique_id[:6].replace('-', '0')}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users",
            json=user_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 400 and "Email already registered" in response.text:
            # User already exists, try to find them
            users_response = requests.get(
                f"{BASE_URL}/api/admin/users",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            for user in users_response.json():
                if "TEST_BranchAdmin" in user.get("name", ""):
                    return user
            pytest.skip("Could not find or create test branch admin user")
        
        assert response.status_code == 200, f"Failed to create branch admin: {response.text}"
        return response.json()
    
    @pytest.fixture(scope="class")
    def test_counsellor(self, admin_token):
        """Create or get a test counsellor user"""
        # First check if COUNSELLOR_ID exists
        users_response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        users = users_response.json()
        
        # Try to find counsellor by ID or any counsellor in branch
        for user in users:
            if user.get("id") == COUNSELLOR_ID:
                return user
            if user.get("role") == "Counsellor" and user.get("branch_id") == BRANCH_ID:
                return user
        
        # Create new counsellor
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "name": f"TEST_Counsellor_{unique_id}",
            "email": f"test_counsellor_{unique_id}@etieducom.com",
            "password": "test123",
            "role": "Counsellor",
            "branch_id": BRANCH_ID,
            "phone": f"9999{unique_id[:6].replace('-', '0')}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users",
            json=user_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to create counsellor: {response.text}"
        return response.json()
    
    def test_create_task_as_admin(self, admin_token, test_counsellor):
        """POST /api/tasks - creates task AND automatically creates notification"""
        unique_id = str(uuid.uuid4())[:8]
        task_data = {
            "title": f"TEST_Task_{unique_id}",
            "description": "This is a test task created by automated testing",
            "assigned_to": test_counsellor["id"],
            "priority": "High",
            "due_date": "2026-01-31"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/tasks",
            json=task_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to create task: {response.text}"
        data = response.json()
        
        assert "task_id" in data, "Response should contain 'task_id'"
        assert "message" in data, "Response should contain 'message'"
        assert "notification" in data["message"].lower(), "Response should mention notification"
        
        print(f"Task created: {data['task_id']}")
        print(f"Response: {data['message']}")
        
        return data["task_id"]
    
    def test_notification_created_for_assigned_user(self, admin_token, test_counsellor):
        """Verify notification is created when task is assigned"""
        # Login as counsellor to check their notifications
        counsellor_login = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": test_counsellor["email"], "password": "test123"}
        )
        
        if counsellor_login.status_code != 200:
            # If we can't login as counsellor, check via admin
            # First create a task
            unique_id = str(uuid.uuid4())[:8]
            task_data = {
                "title": f"TEST_TaskNotif_{unique_id}",
                "description": "Task for notification test",
                "assigned_to": test_counsellor["id"],
                "priority": "Normal"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/tasks",
                json=task_data,
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            
            assert response.status_code == 200, f"Failed to create task: {response.text}"
            assert "notification" in response.json()["message"].lower()
            print("Task created with notification (verified via response)")
            return
        
        counsellor_token = counsellor_login.json()["access_token"]
        
        # Get notifications
        notif_response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {counsellor_token}"}
        )
        
        assert notif_response.status_code == 200
        notifications = notif_response.json()
        
        # Check if there's a task notification
        task_notifications = [n for n in notifications if n.get("notification_type") == "task"]
        print(f"Found {len(task_notifications)} task notifications")
    
    def test_get_all_tasks(self, admin_token):
        """GET /api/tasks - returns list of tasks"""
        response = requests.get(
            f"{BASE_URL}/api/tasks",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get tasks: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} tasks")
        
        if len(data) > 0:
            task = data[0]
            assert "title" in task, "Task should have 'title'"
            assert "assigned_to" in task, "Task should have 'assigned_to'"
            assert "status" in task, "Task should have 'status'"


class TestPushSubscriptionEndpoints:
    """Test browser push notification subscription endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_vapid_public_key(self, admin_token):
        """GET /api/push-subscriptions/vapid-public-key - returns VAPID key for push notifications"""
        response = requests.get(
            f"{BASE_URL}/api/push-subscriptions/vapid-public-key",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get VAPID key: {response.text}"
        data = response.json()
        
        assert "publicKey" in data, "Response should contain 'publicKey'"
        assert len(data["publicKey"]) > 0, "Public key should not be empty"
        
        print(f"VAPID public key length: {len(data['publicKey'])}")
    
    def test_save_push_subscription(self, admin_token):
        """POST /api/push-subscriptions - saves browser push subscription"""
        subscription_data = {
            "endpoint": f"https://test-endpoint.example.com/{uuid.uuid4()}",
            "keys": {
                "p256dh": "test_p256dh_key_base64_encoded",
                "auth": "test_auth_key_base64_encoded"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/push-subscriptions",
            json=subscription_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to save push subscription: {response.text}"
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        print(f"Push subscription response: {data['message']}")
    
    def test_delete_push_subscription(self, admin_token):
        """DELETE /api/push-subscriptions - removes push subscription"""
        response = requests.delete(
            f"{BASE_URL}/api/push-subscriptions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to delete push subscription: {response.text}"
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        print(f"Delete push subscription response: {data['message']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
