#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class ETIEducomAPITester:
    def __init__(self, base_url="https://resource-platform-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_info = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        request_headers = {'Content-Type': 'application/json'}
        if self.token:
            request_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            request_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers, timeout=30)
            elif method == 'POST':
                if isinstance(data, dict):
                    response = requests.post(url, json=data, headers=request_headers, timeout=30)
                else:
                    response = requests.post(url, data=data, headers=request_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=request_headers, timeout=30)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and 'data' in response_data:
                        print(f"   Response: {len(response_data.get('data', []))} items" if isinstance(response_data['data'], list) else "   Response: Data object")
                    elif isinstance(response_data, list):
                        print(f"   Response: {len(response_data)} items")
                    else:
                        print(f"   Response: {type(response_data).__name__}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                print(f"   Error: {response.text[:200]}...")

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def test_login(self, username, password):
        """Test login and get token"""
        print(f"\n🔐 Testing login with {username}")
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=f"username={username}&password={password}",
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        if success and isinstance(response, dict) and 'access_token' in response:
            self.token = response['access_token']
            self.user_info = response.get('user', {})
            print(f"✅ Login successful - User: {self.user_info.get('name', 'Unknown')} ({self.user_info.get('role', 'Unknown')})")
            return True
        print(f"❌ Login failed - Response: {response}")
        return False

    def test_server_health(self):
        """Test if server is running"""
        try:
            response = requests.get(f"{self.base_url}/api/programs", timeout=10)
            if response.status_code in [200, 401]:  # 401 is expected without auth
                print("✅ Server is running and responding")
                return True
            else:
                print(f"❌ Server responded with unexpected status: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Server is not responding: {str(e)}")
            return False

    def test_students_endpoint(self):
        """Test the optimized students endpoint"""
        success, response = self.run_test(
            "Get Students (Optimized)",
            "GET",
            "students",
            200
        )
        if success and isinstance(response, dict):
            students = response.get('data', [])
            print(f"   Found {len(students)} students")
            if students:
                student = students[0]
                print(f"   Sample student: {student.get('student_name', 'Unknown')} - {student.get('program_name', 'Unknown')}")
        return success

    def test_programs_endpoint(self):
        """Test programs endpoint"""
        success, response = self.run_test(
            "Get Programs",
            "GET",
            "programs",
            200
        )
        if success and isinstance(response, dict):
            programs = response.get('data', [])
            print(f"   Found {len(programs)} programs")
            if programs:
                program = programs[0]
                print(f"   Sample program: {program.get('name', 'Unknown')} - ₹{program.get('fee', 0)}")
        return success

def main():
    print("🚀 Starting ETI Educom API Testing")
    print("=" * 50)
    
    tester = ETIEducomAPITester()
    
    # Test server health first
    print("\n📡 Testing Server Health...")
    if not tester.test_server_health():
        print("❌ Server is not responding. Stopping tests.")
        return 1
    
    # Test login with admin credentials
    print("\n🔐 Testing Authentication...")
    if not tester.test_login("admin@etieducom.com", "admin@123"):
        print("❌ Admin login failed. Stopping tests.")
        return 1
    
    # Test core endpoints mentioned in requirements
    print("\n📊 Testing Core Endpoints...")
    
    # Test optimized endpoints (main focus)
    tester.test_students_endpoint()
    tester.test_programs_endpoint()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())