#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

def create_admin_user():
    """Create admin user for testing"""
    base_url = "https://resource-platform-1.preview.emergentagent.com"
    
    # Try to register admin user
    admin_data = {
        "email": "admin@etieducom.com",
        "password": "admin@123",
        "name": "System Administrator",
        "role": "Admin",
        "branch_id": None
    }
    
    try:
        response = requests.post(f"{base_url}/api/auth/register", json=admin_data, timeout=30)
        print(f"Admin registration status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Admin user created successfully")
            return True
        else:
            print("❌ Failed to create admin user")
            return False
            
    except Exception as e:
        print(f"❌ Error creating admin user: {str(e)}")
        return False

def test_admin_login():
    """Test admin login"""
    base_url = "https://resource-platform-1.preview.emergentagent.com"
    
    login_data = "username=admin@etieducom.com&password=admin@123"
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    
    try:
        response = requests.post(f"{base_url}/api/auth/login", data=login_data, headers=headers, timeout=30)
        print(f"Login status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Admin login successful")
            print(f"User: {data.get('user', {}).get('name')} ({data.get('user', {}).get('role')})")
            return data.get('access_token')
        else:
            print("❌ Admin login failed")
            return None
            
    except Exception as e:
        print(f"❌ Error during login: {str(e)}")
        return None

def test_endpoints(token):
    """Test key endpoints with admin token"""
    base_url = "https://resource-platform-1.preview.emergentagent.com"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    endpoints = [
        ("GET /api/students", "students"),
        ("GET /api/programs", "programs"),
        ("GET /api/leads", "leads"),
        ("GET /api/enrollments", "enrollments")
    ]
    
    results = []
    
    for name, endpoint in endpoints:
        try:
            response = requests.get(f"{base_url}/api/{endpoint}", headers=headers, timeout=30)
            print(f"\n🔍 Testing {name}")
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict) and 'data' in data:
                    count = len(data['data']) if isinstance(data['data'], list) else 'object'
                    print(f"   ✅ Success - {count} items")
                    results.append((name, True, count))
                else:
                    print(f"   ✅ Success - {type(data).__name__}")
                    results.append((name, True, "data"))
            else:
                print(f"   ❌ Failed - {response.text[:100]}")
                results.append((name, False, response.text[:50]))
                
        except Exception as e:
            print(f"   ❌ Error - {str(e)}")
            results.append((name, False, str(e)))
    
    return results

def main():
    print("🚀 ETI Educom Admin Setup & Testing")
    print("=" * 50)
    
    # Step 1: Create admin user
    print("\n📝 Creating admin user...")
    if not create_admin_user():
        print("❌ Failed to create admin user. Exiting.")
        return 1
    
    # Step 2: Test admin login
    print("\n🔐 Testing admin login...")
    token = test_admin_login()
    if not token:
        print("❌ Admin login failed. Exiting.")
        return 1
    
    # Step 3: Test key endpoints
    print("\n📊 Testing key endpoints...")
    results = test_endpoints(token)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 SUMMARY")
    passed = sum(1 for _, success, _ in results if success)
    total = len(results)
    print(f"Tests passed: {passed}/{total}")
    
    for name, success, details in results:
        status = "✅" if success else "❌"
        print(f"{status} {name}: {details}")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️ {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())