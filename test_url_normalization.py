#!/usr/bin/env python3
"""
Verify URL normalization by checking browser console and network tab
"""

import asyncio
import sys
from playwright.async_api import async_playwright

BASE_URL = "https://erp-preview-build-4.preview.emergentagent.com"
TEST_EMAIL = "admin@etieducom.com"
TEST_PASSWORD = "admin@123"
TEST_SESSION = "2026"

async def test_url_normalization():
    """Test that URLs are not duplicated in network requests"""
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        # Track all API requests
        api_requests = []
        console_messages = []
        
        def handle_request(request):
            if "/api/" in request.url:
                api_requests.append({
                    'url': request.url,
                    'method': request.method
                })
        
        def handle_console(msg):
            console_messages.append({
                'type': msg.type,
                'text': msg.text
            })
        
        page.on("request", handle_request)
        page.on("console", handle_console)
        
        print(f"\n🔍 Testing URL normalization in browser")
        print("=" * 80)
        
        # Login
        print("\n1️⃣  Logging in and tracking network requests...")
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
        
        # Navigate to a few pages to generate API calls
        print("\n2️⃣  Navigating through app to generate API calls...")
        await page.goto(f"{BASE_URL}/", wait_until="networkidle")
        await asyncio.sleep(2)
        
        # Check API requests
        print("\n3️⃣  Analyzing API requests...")
        print(f"   Total API requests captured: {len(api_requests)}")
        
        # Check for URL duplication patterns
        duplicated_urls = []
        for req in api_requests:
            url = req['url']
            # Check if URL contains the base URL twice (e.g., https://domain.com/https://domain.com/api/...)
            if url.count(BASE_URL) > 1 or url.count("https://") > 1:
                duplicated_urls.append(url)
        
        if duplicated_urls:
            print(f"\n❌ Found {len(duplicated_urls)} requests with duplicated URLs:")
            for url in duplicated_urls[:5]:  # Show first 5
                print(f"   - {url}")
        else:
            print("✅ No URL duplication detected")
        
        # Show sample of correct API calls
        print("\n4️⃣  Sample API requests (first 5):")
        for req in api_requests[:5]:
            print(f"   {req['method']} {req['url']}")
        
        # Check console for errors
        print("\n5️⃣  Checking browser console...")
        error_messages = [msg for msg in console_messages if msg['type'] == 'error']
        
        if error_messages:
            print(f"⚠️  Found {len(error_messages)} console errors:")
            for msg in error_messages[:5]:
                print(f"   - {msg['text']}")
        else:
            print("✅ No console errors detected")
        
        # Verify all API calls go to correct base URL
        print("\n6️⃣  Verifying API call patterns...")
        correct_pattern = f"{BASE_URL}/api/"
        incorrect_calls = [req for req in api_requests if not req['url'].startswith(correct_pattern)]
        
        if incorrect_calls:
            print(f"⚠️  Found {len(incorrect_calls)} API calls not matching expected pattern:")
            for req in incorrect_calls[:5]:
                print(f"   - {req['url']}")
        else:
            print(f"✅ All API calls correctly use pattern: {correct_pattern}*")
        
        await browser.close()
        
        # Final verdict
        print("\n" + "=" * 80)
        if not duplicated_urls and not incorrect_calls:
            print("✅ URL NORMALIZATION TEST PASSED")
            print("   - No URL duplication detected")
            print("   - All API calls use correct base URL")
            print("   - No console errors related to URLs")
            return True
        else:
            print("❌ URL NORMALIZATION TEST FAILED")
            if duplicated_urls:
                print(f"   - Found {len(duplicated_urls)} duplicated URLs")
            if incorrect_calls:
                print(f"   - Found {len(incorrect_calls)} incorrect API calls")
            return False

if __name__ == "__main__":
    result = asyncio.run(test_url_normalization())
    sys.exit(0 if result else 1)
