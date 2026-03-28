import sys
import json
from services.ai_scanner import scan

def main():
    print("Testing Safe Message:")
    safe = scan("Hey there! Hope you are having a wonderful day!")
    print(json.dumps(safe, indent=2))
    
    print("\n---")
    
    print("\nTesting Toxic Message:")
    toxic = scan("shut up and go kill yourself")
    print(json.dumps(toxic, indent=2))

if __name__ == "__main__":
    main()
