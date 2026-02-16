#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test ELSA UI - Check toast colors, loading state, and layout"""

import sys
import io
from playwright.sync_api import sync_playwright
import time

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Show browser for user to see
        page = browser.new_page()

        print("Testing ELSA UI...")
        print("=" * 60)

        # Navigate to the app
        page.goto('http://localhost:5173')
        page.wait_for_load_state('networkidle')

        # Take screenshot of initial state (empty state)
        print("\n[SCREENSHOT] Taking screenshot of empty state...")
        page.screenshot(path='screenshots/01-empty-state.png', full_page=True)
        print("   OK Saved: screenshots/01-empty-state.png")

        # Check if feature cards are visible and horizontal
        print("\n[CHECK] Checking feature cards layout...")
        feature_cards = page.locator('text=Deep Analysis').count()
        if feature_cards > 0:
            print(f"   OK Feature cards found: {feature_cards}")
            # Check grid layout
            grid = page.locator('.grid.grid-cols-3')
            if grid.count() > 0:
                print("   OK Feature cards using grid-cols-3 (horizontal)")
            else:
                print("   WARNING Feature cards might not be horizontal")

        # Check if account section is at the bottom
        print("\n[CHECK] Checking sidebar account position...")
        sidebar = page.locator('text=ELSA').first
        if sidebar.is_visible():
            print("   OK Sidebar visible")
            # Take screenshot of sidebar
            page.screenshot(path='screenshots/02-sidebar.png')
            print("   OK Saved: screenshots/02-sidebar.png")

        # Test loading state by entering a wallet address
        print("\n[CHECK] Testing loading state and toast notifications...")

        # Find the input field
        input_field = page.locator('textarea[placeholder*="wallet"]').first
        if input_field.is_visible():
            print("   OK Input field found")

            # Enter an invalid wallet to trigger validation toast
            print("\n   Testing invalid wallet (should show warning toast)...")
            input_field.fill('0xinvalid')
            page.keyboard.press('Enter')
            time.sleep(1)

            # Take screenshot of warning toast
            page.screenshot(path='screenshots/03-warning-toast.png')
            print("   OK Saved: screenshots/03-warning-toast.png")

            # Clear and try valid wallet
            print("\n   Testing valid wallet (should show loading state)...")
            input_field.fill('')
            input_field.fill('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')
            page.keyboard.press('Enter')

            # Wait a moment to capture loading state
            time.sleep(0.5)
            page.screenshot(path='screenshots/04-loading-state.png', full_page=True)
            print("   OK Saved: screenshots/04-loading-state.png")

            # Wait for response and capture success toast
            print("\n   Waiting for response...")
            time.sleep(3)
            page.screenshot(path='screenshots/05-response-with-toast.png', full_page=True)
            print("   OK Saved: screenshots/05-response-with-toast.png")

            # Check if WalletDashboardCard is horizontal
            print("\n[CHECK] Checking WalletDashboardCard layout...")
            wallet_card = page.locator('text=Wallet Address').first
            if wallet_card.is_visible():
                print("   OK WalletDashboardCard found")
                # Check if stats grid is horizontal
                stats_grid = page.locator('.grid.grid-cols-3').nth(1)
                if stats_grid.count() > 0:
                    print("   OK Stats grid using grid-cols-3 (horizontal)")
                else:
                    print("   WARNING Stats grid might not be horizontal")

            # Final screenshot
            page.screenshot(path='screenshots/06-final-state.png', full_page=True)
            print("   OK Saved: screenshots/06-final-state.png")

        print("\n" + "=" * 60)
        print("COMPLETE - UI testing finished! Check screenshots/ folder for results.")
        print("\nKey checks:")
        print("  - Feature cards horizontal: Check 01-empty-state.png")
        print("  - Loading state visible: Check 04-loading-state.png")
        print("  - Toast colors: Check 03-warning-toast.png & 05-response-with-toast.png")
        print("  - WalletDashboard horizontal: Check 06-final-state.png")
        print("  - Account at bottom: Check 02-sidebar.png")

        # Keep browser open for manual inspection
        print("\n[WAIT] Browser will stay open for 10 seconds for manual inspection...")
        time.sleep(10)

        browser.close()

if __name__ == '__main__':
    import os
    os.makedirs('screenshots', exist_ok=True)
    test_ui()
