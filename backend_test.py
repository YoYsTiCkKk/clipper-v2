#!/usr/bin/env python3
"""
Minimal Backend API Connectivity Test for Clipper App
Since backend APIs are already verified working, this just checks basic connectivity.
"""

import requests
import sys
from datetime import datetime

class BasicAPITester:
    def __init__(self, base_url="https://barber-reserve-36.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.content:
                    try:
                        data = response.json()
                        print(f"   Response: {type(data).__name__} with {len(data) if isinstance(data, list) else 'data'}")
                    except:
                        pass
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.content:
                    print(f"   Response: {response.text[:200]}")

            return success, response.json() if success else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

def main():
    """Test basic API connectivity"""
    print("🚀 Testing Basic API Connectivity for Clipper App")
    print("=" * 50)
    
    tester = BasicAPITester()

    # Test barber listing (should work without auth)
    tester.run_test(
        "Get Barbers (Madrid area)",
        "GET", 
        "barbers?lat=40.4168&lng=-3.7038&radius=50000",
        200
    )

    # Test login with demo barber
    tester.run_test(
        "Login Demo Barber Carlos",
        "POST",
        "auth/login",
        200,
        data={"email": "carlos@clipper.es", "password": "demo123"}
    )

    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Backend API Tests: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("✅ All basic API connectivity tests passed!")
        return 0
    else:
        print("❌ Some API tests failed. Check backend connectivity.")
        return 1

if __name__ == "__main__":
    sys.exit(main())