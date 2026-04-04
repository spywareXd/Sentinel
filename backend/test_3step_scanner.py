import sys
import os
import json

# Ensure backend directory is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.scanner import scan

def test_scanner():
    print("=== Testing 3-Step Scanner ===")
    
    # Test 1: Clearly Safe Message
    print("\nTest 1: Safe Message")
    res1 = scan("Hey everyone! Hope you're having a great day.")
    print(f"Result: {json.dumps(res1, indent=2)}")
    
    # Test 2: Death Threat (Expected: Extreme / 1.0 / 43200 min)
    print("\nTest 2: Death Threat (Extreme)")
    res2 = scan("I am going to find you and kill you tonight.")
    print(f"Result: {json.dumps(res2, indent=2)}")
    print(f"Duration: {res2.get('punishment_duration')} min")

    # Test 3: Racism/Hate Speech (Expected: High / 0.8 / 60 min)
    print("\nTest 3: Racism/Hate Speech (High)")
    res3 = scan("I hate people of your race, you guys are subhuman.")
    print(f"Result: {json.dumps(res3, indent=2)}")
    print(f"Duration: {res3.get('punishment_duration')} min")

    # Test 4: Directed Insult (Expected: Medium / 0.5 / 10 min)
    print("\nTest 4: Directed Insult (Medium)")
    res4 = scan("You are a total loser and a failure at life.")
    print(f"Result: {json.dumps(res4, indent=2)}")
    print(f"Duration: {res4.get('punishment_duration')} min")

    # Test 5: Undirected Cussing (Expected: Low / 0.2 / 0 min)
    print("\nTest 5: Undirected Cussing (Low)")
    res5 = scan("This process is f***ing frustrating as hell.")
    print(f"Result: {json.dumps(res5, indent=2)}")
    print(f"Duration: {res5.get('punishment_duration')} min")

if __name__ == "__main__":
    test_scanner()
