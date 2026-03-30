import sys
import json
from services.scanner import scan

def main():
    while True:
        # print("Testing Safe Message:")
        # safe = scan("Hey there! Hope you are having a wonderful day!")
        # print(json.dumps(safe, indent=2))
        
        # print("\n---")
        
        # print("\nTesting Toxic Message:")
        # toxic = scan("shut up and go kill yourself")
        # print(json.dumps(toxic, indent=2))

        text=input()
        result=scan(text)
        print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
