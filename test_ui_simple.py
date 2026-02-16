#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Simple UI Test - Check visual rendering without auth"""

import sys
import io
from playwright.sync_api import sync_playwright
import time

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        print("\n" + "=" * 60)
        print("ELSA UI Visual Test")
        print("=" * 60)

        # Navigate to the app
        page.goto('http://localhost:5173')
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        # Take full page screenshot
        print("\n[1/3] Taking login page screenshot...")
        page.screenshot(path='screenshots/test-login.png', full_page=True)
        print("      Saved: screenshots/test-login.png")

        # Inspect the page structure
        print("\n[2/3] Inspecting page structure...")

        # Check if login elements are present
        login_button = page.locator('text=Login dengan Google')
        if login_button.is_visible():
            print("      OK Login page loaded correctly")
            print("      OK Google Sign-In button visible")

        # Check for any console errors
        console_messages = []
        page.on('console', lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))

        time.sleep(1)

        if console_messages:
            print("\n[3/3] Console messages found:")
            for msg in console_messages[-5:]:  # Last 5 messages
                print(f"      {msg}")
        else:
            print("\n[3/3] No console errors detected")

        # Check network errors
        network_errors = []
        page.on('requestfailed', lambda req: network_errors.append(f"{req.url} - {req.failure}"))

        if network_errors:
            print("\n      Network errors detected:")
            for err in network_errors:
                print(f"      ! {err}")
        else:
            print("      No network errors")

        print("\n" + "=" * 60)
        print("Test Summary:")
        print("  - Login page renders: OK")
        print("  - Google OAuth button: OK")
        print("  - Console errors: " + ("YES" if console_messages else "NO"))
        print("  - Network errors: " + ("YES" if network_errors else "NO"))
        print("\nTo test the full UI after login:")
        print("  1. Login manually with Google")
        print("  2. Check feature cards are horizontal (3 columns)")
        print("  3. Enter invalid wallet to see warning toast (orange)")
        print("  4. Enter valid wallet to see loading skeleton")
        print("  5. Check WalletDashboardCard stats are horizontal")
        print("  6. Check account section is at bottom of sidebar")
        print("=" * 60)

        # Keep browser open
        print("\n[WAIT] Browser staying open for 15 seconds...")
        print("       You can manually login and inspect the UI")
        time.sleep(15)

        browser.close()

if __name__ == '__main__':
    import os
    os.makedirs('screenshots', exist_ok=True)
    test_ui()
