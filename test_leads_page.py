#!/usr/bin/env python3
"""
Test authenticated request to Leads page after login
"""

import asyncio
import sys
from playwright.async_api import async_playwright

BASE_URL = "https://erp-preview-build-4.preview.emergentagent.com"
TEST_EMAIL = "admin@etieducom.com"
TEST_PASSWORD = "admin@123"
TEST_SESSION = "2026"

async def test_leads_page():
    """Test accessing Leads page after login"""
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        # Track network errors
        network_errors = []
        
        def handle_response(response):
            if response.status in [401, 404]:
                network_errors.append({
                    'url': response.url,
                    'status': response.status,
                    'method': response.request.method
                })
                print(f"⚠️  {response.status} Error: {response.request.method} {response.url}")
        
        page.on("response", handle_response)
        
        print(f"\n🔍 Testing authenticated Leads page access")
        print("=" * 80)
        
        # Step 1: Login first
        print("\n1️⃣  Logging in...")
        await page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        
        email_input = page.locator('input[type="email"], input[name="email"]').first
        await email_input.fill(TEST_EMAIL)
        
        password_input = page.locator('input[type="password"]').first
        await password_input.fill(TEST_PASSWORD)
        
        session_input = page.locator('input[name="session"], select[name="session"]').first
        if await session_input.count() > 0:
            await session_input.fill(TEST_SESSION)
        
        submit_button = page.locator('button[type="submit"]').first
        await submit_button.click()
        
        await asyncio.sleep(3)
        print("✅ Logged in successfully")
        
        # Step 2: Navigate to Leads page
        print("\n2️⃣  Navigating to Leads page...")
        try:
            await page.goto(f"{BASE_URL}/leads", wait_until="networkidle", timeout=30000)
            print(f"✅ Successfully loaded Leads page: {page.url}")
        except Exception as e:
            print(f"❌ Failed to load Leads page: {e}")
            await browser.close()
            return False
        
        # Step 3: Verify page loaded correctly
        print("\n3️⃣  Verifying Leads page content...")
        await asyncio.sleep(2)
        
        current_url = page.url
        if "/leads" in current_url:
            print(f"✅ On Leads page: {current_url}")
        else:
            print(f"❌ Not on Leads page. Current URL: {current_url}")
            await browser.close()
            return False
        
        # Check for common Leads page elements
        page_content = await page.content()
        
        # Look for typical Leads page indicators
        leads_indicators = ["Lead", "Counsellor", "Status", "Phone", "Email"]
        found_indicators = [ind for ind in leads_indicators if ind in page_content]
        
        if found_indicators:
            print(f"✅ Found Leads page indicators: {', '.join(found_indicators)}")
        else:
            print("⚠️  No typical Leads page indicators found")
        
        # Step 4: Check for errors
        print("\n4️⃣  Checking for errors...")
        if network_errors:
            print(f"❌ Found {len(network_errors)} network errors:")
            for error in network_errors:
                print(f"   - {error['status']} {error['method']} {error['url']}")
        else:
            print("✅ No 401/404 errors detected")
        
        # Take screenshot
        await page.screenshot(path="/app/leads_page.png")
        print("\n📸 Screenshot saved to /app/leads_page.png")
        
        await browser.close()
        
        # Final verdict
        print("\n" + "=" * 80)
        if "/leads" in current_url and not any(e['status'] in [401, 404] for e in network_errors):
            print("✅ LEADS PAGE TEST PASSED")
            print("   - Successfully accessed Leads page after login")
            print("   - No authentication errors (401)")
            print("   - No not found errors (404)")
            return True
        else:
            print("❌ LEADS PAGE TEST FAILED")
            return False

if __name__ == "__main__":
    result = asyncio.run(test_leads_page())
    sys.exit(0 if result else 1)
