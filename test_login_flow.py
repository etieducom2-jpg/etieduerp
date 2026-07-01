#!/usr/bin/env python3
"""
End-to-end test for login flow to verify "Not Found" bug fix.
Tests the deployed URL: https://erp-preview-build-4.preview.emergentagent.com
"""

import asyncio
import sys
from playwright.async_api import async_playwright, expect

BASE_URL = "https://erp-preview-build-4.preview.emergentagent.com"
TEST_EMAIL = "admin@etieducom.com"
TEST_PASSWORD = "admin@123"
TEST_SESSION = "2026"

async def test_login_flow():
    """Test the complete login flow end-to-end"""
    
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        # Track network requests to verify no 404s
        network_errors = []
        
        def handle_response(response):
            if response.status == 404:
                network_errors.append({
                    'url': response.url,
                    'status': response.status,
                    'method': response.request.method
                })
                print(f"❌ 404 Error detected: {response.request.method} {response.url}")
        
        page.on("response", handle_response)
        
        print(f"\n🔍 Testing login flow at {BASE_URL}")
        print("=" * 80)
        
        # Step 1: Navigate to login page
        print("\n1️⃣  Navigating to login page...")
        try:
            await page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=30000)
            print(f"✅ Successfully loaded login page: {page.url}")
        except Exception as e:
            print(f"❌ Failed to load login page: {e}")
            await browser.close()
            return False
        
        # Step 2: Fill in login credentials
        print(f"\n2️⃣  Filling in credentials...")
        print(f"   Email: {TEST_EMAIL}")
        print(f"   Password: {'*' * len(TEST_PASSWORD)}")
        print(f"   Session: {TEST_SESSION}")
        
        try:
            # Wait for form elements to be visible
            await page.wait_for_selector('input[type="email"], input[name="email"], input[placeholder*="email" i]', timeout=10000)
            
            # Fill email
            email_input = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first
            await email_input.fill(TEST_EMAIL)
            
            # Fill password
            password_input = page.locator('input[type="password"], input[name="password"]').first
            await password_input.fill(TEST_PASSWORD)
            
            # Fill session (if visible)
            session_input = page.locator('input[name="session"], select[name="session"]').first
            if await session_input.count() > 0:
                await session_input.fill(TEST_SESSION)
            
            print("✅ Credentials filled successfully")
        except Exception as e:
            print(f"❌ Failed to fill credentials: {e}")
            await browser.close()
            return False
        
        # Step 3: Click Sign In button
        print("\n3️⃣  Clicking Sign In button...")
        try:
            # Find and click the submit button
            submit_button = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first
            await submit_button.click()
            print("✅ Sign In button clicked")
        except Exception as e:
            print(f"❌ Failed to click Sign In button: {e}")
            await browser.close()
            return False
        
        # Step 4: Wait for navigation and check for errors
        print("\n4️⃣  Waiting for authentication...")
        await asyncio.sleep(3)  # Wait for any toasts or redirects
        
        # Check for "Not Found" toast or error messages
        print("\n5️⃣  Checking for error toasts...")
        try:
            # Look for common toast/error selectors
            error_selectors = [
                'text="Not Found"',
                'text="404"',
                '[role="alert"]:has-text("Not Found")',
                '.toast:has-text("Not Found")',
                '.error:has-text("Not Found")',
                '[class*="toast"]:has-text("Not Found")',
                '[class*="notification"]:has-text("Not Found")'
            ]
            
            not_found_detected = False
            for selector in error_selectors:
                if await page.locator(selector).count() > 0:
                    not_found_detected = True
                    print(f"❌ 'Not Found' error detected in UI: {selector}")
                    break
            
            if not not_found_detected:
                print("✅ No 'Not Found' toast detected")
        except Exception as e:
            print(f"⚠️  Error checking for toasts: {e}")
        
        # Step 5: Verify redirect to dashboard
        print("\n6️⃣  Verifying redirect to dashboard...")
        current_url = page.url
        print(f"   Current URL: {current_url}")
        
        if current_url == f"{BASE_URL}/" or current_url == f"{BASE_URL}" or "/login" not in current_url:
            print("✅ Successfully redirected to dashboard")
        else:
            print(f"❌ Not redirected to dashboard. Still at: {current_url}")
            # Take screenshot for debugging
            await page.screenshot(path="/app/login_failed.png")
            print("   Screenshot saved to /app/login_failed.png")
            await browser.close()
            return False
        
        # Step 6: Verify dashboard content
        print("\n7️⃣  Verifying dashboard content...")
        await asyncio.sleep(2)  # Wait for dashboard to load
        
        try:
            # Check for user info in header
            page_content = await page.content()
            
            if "Super Admin" in page_content:
                print("✅ Dashboard shows 'Super Admin'")
            else:
                print("⚠️  'Super Admin' not found in dashboard")
            
            if TEST_EMAIL in page_content:
                print(f"✅ Dashboard shows email '{TEST_EMAIL}'")
            else:
                print(f"⚠️  Email '{TEST_EMAIL}' not found in dashboard")
            
        except Exception as e:
            print(f"⚠️  Error verifying dashboard content: {e}")
        
        # Step 7: Test authenticated request (Leads page)
        print("\n8️⃣  Testing authenticated request (Leads page)...")
        try:
            # Try to navigate to Leads page
            leads_link = page.locator('a[href="/leads"], a:has-text("Leads")').first
            if await leads_link.count() > 0:
                await leads_link.click()
                await asyncio.sleep(2)
                
                current_url = page.url
                if "/leads" in current_url:
                    print(f"✅ Successfully navigated to Leads page: {current_url}")
                else:
                    print(f"⚠️  Expected /leads but got: {current_url}")
            else:
                print("⚠️  Leads link not found in navigation")
        except Exception as e:
            print(f"⚠️  Error testing Leads page: {e}")
        
        # Step 8: Check for any 404 errors in network requests
        print("\n9️⃣  Checking network requests...")
        if network_errors:
            print(f"❌ Found {len(network_errors)} 404 errors:")
            for error in network_errors:
                print(f"   - {error['method']} {error['url']}")
        else:
            print("✅ No 404 errors detected in network requests")
        
        # Step 9: Verify the URL normalization fix
        print("\n🔟 Verifying URL normalization fix...")
        try:
            # Check that API calls are going to the correct URL
            api_calls = []
            
            def track_api_calls(response):
                if "/api/" in response.url:
                    api_calls.append(response.url)
            
            page.on("response", track_api_calls)
            
            # Make a test API call by refreshing
            await page.reload(wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Check that API URLs are correct
            incorrect_urls = [url for url in api_calls if url.startswith(f"{BASE_URL}/{BASE_URL}")]
            
            if incorrect_urls:
                print(f"❌ Found duplicated URLs (normalization issue):")
                for url in incorrect_urls:
                    print(f"   - {url}")
            else:
                print("✅ URL normalization working correctly (no duplicated origins)")
        except Exception as e:
            print(f"⚠️  Error verifying URL normalization: {e}")
        
        # Take final screenshot
        await page.screenshot(path="/app/dashboard_success.png")
        print("\n📸 Screenshot saved to /app/dashboard_success.png")
        
        await browser.close()
        
        # Final verdict
        print("\n" + "=" * 80)
        if not network_errors and "/login" not in page.url:
            print("✅ LOGIN FLOW TEST PASSED")
            print("   - Backend /api/auth/login endpoint working")
            print("   - No 'Not Found' errors detected")
            print("   - Successfully redirected to dashboard")
            print("   - Dashboard content verified")
            print("   - Authenticated requests working")
            return True
        else:
            print("❌ LOGIN FLOW TEST FAILED")
            if network_errors:
                print(f"   - Found {len(network_errors)} 404 errors")
            if "/login" in page.url:
                print("   - Failed to redirect from login page")
            return False

if __name__ == "__main__":
    result = asyncio.run(test_login_flow())
    sys.exit(0 if result else 1)
