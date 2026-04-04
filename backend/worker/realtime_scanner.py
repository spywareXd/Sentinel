import sys
import os
import asyncio

# Ensure backend directory is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import supabase
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))


async def scan_unprocessed():
    """Scan messages where processed_at IS NULL"""
    try:
        resp = supabase.table("messages") \
            .select("id, user_id, content") \
            .is_("processed_at", None) \
            .limit(3) \
            .execute()
        
        messages = resp.data or []
        
        if not messages:
            return
        
        print(f"\nFound {len(messages)} unprocessed messages")
        
        from services.scanner import scan
        
        for msg in messages:
            print(f"Scanning: {msg['content'][:40]}...")
            
            # Get user's warning count for punishment calibration
            warning_count = 0
            if msg.get("user_id"):
                try:
                    profile = supabase.table("profiles") \
                        .select("warnings") \
                        .eq("id", msg["user_id"]) \
                        .single() \
                        .execute()
                    warning_count = (profile.data or {}).get("warnings", 0) or 0
                except:
                    pass
            
            # Run scanner
            result = scan(msg["content"], warning_count=warning_count)
            
            # Update message with scan results
            supabase.table("messages").update({
                "flagged": result["flagged"],
                "reason": result["reason"],
                "harmful_score": result["harmful_score"],
                "severe_score": result["severe_score"],
                "punishment": result["punishment"],
                "punishment_duration": result["punishment_duration"],
                "processed_at": datetime.now(IST).isoformat()
            }).eq("id", msg["id"]).execute()
            
            status = "FLAGGED" if result["flagged"] else "SAFE"
            print(f"   {status} | Score: {result['harmful_score']:.2f} | Punishment: {result['punishment']} ({result['punishment_duration']} min)")
            
            # ===== NEW: Create moderation case if flagged =====
            if result["flagged"] and msg.get("user_id"):
                print("Triggering moderation case...")
                
                # Check if case already exists for this message
                existing = supabase.table("moderation_cases") \
                    .select("id") \
                    .eq("message_id", msg["id"]) \
                    .execute()
                
                if not existing.data:
                    from services.moderation import create_moderation_case
                    
                    case_result = create_moderation_case(
                        message_id=msg["id"],
                        user_id=msg["user_id"],
                        content=msg["content"],
                        severe_score=result["severe_score"]
                    )
                    
                    if case_result["success"]:
                        print(f"   Moderation case created. Chain ID: {case_result['blockchain_case_id']}")
                    else:
                        print(f"   Warning: Moderation case issue: {case_result.get('reason', 'unknown')}")
                else:
                    print("   Case already exists for this message")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


async def check_resolved():
    """Check blockchain for resolved cases and update Supabase"""
    try:
        from services.moderation import check_and_update_resolved_cases
        check_and_update_resolved_cases()
    except Exception as e:
        print(f"Error checking resolved: {e}")


async def main():
    print("Sentinel scanner started.")
    print("Scanning for new messages every 2 seconds")
    print("Checking resolved cases every 10 seconds")
    
    cycle = 0
    while True:
        await scan_unprocessed()
        
        # Check resolved cases every 5 cycles (10 seconds)
        if cycle % 5 == 0:
            await check_resolved()
        
        cycle += 1
        await asyncio.sleep(2)


if __name__ == "__main__":
    asyncio.run(main())
