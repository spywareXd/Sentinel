# backend/test_3step_scanner.py

import os
import json
from services.scanner import scan

def test_scanner():
    print("=== Testing 3-Step Scanner ===")
    
    # Test 1: Clearly Safe Message (Should only reach Step 1)
    print("\nTest 1: Safe Message")
    res1 = scan("Hey everyone! Hope you're having a great day.")
    print(f"Result: {json.dumps(res1, indent=2)}")
    
    # Test 2: Potentially Suspicious Message (Should reach Step 3)
    # Note: ToxicBERT might flag this, then Gemini will analyze it.
    print("\nTest 2: Suspicious Message (No Context)")
    res2 = scan("You are such a loser, I hate you.")
    print(f"Result: {json.dumps(res2, indent=2)}")

    # Test 3: Context-Dependent Message (Simulated)
    # This would normally fetch from Supabase. 
    # To truly test Step 2/3, we'd need valid message_ids.
    print("\nTest 3: Context-Dependent (Manual check of logic)")
    print("To test Step 2 & 3 fully, ensure SUPABASE_URL and GEMINI_API_KEY are in .env.")

if __name__ == "__main__":
    test_scanner()
