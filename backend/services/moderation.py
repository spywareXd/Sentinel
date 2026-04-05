# backend/services/moderation.py

import hashlib
import random
from datetime import datetime, timezone, timedelta
from core.database import supabase
from services.blockchain import create_case_on_chain

IST = timezone(timedelta(hours=5, minutes=30))


def increment_offender_warnings(offender_id: str | None) -> None:
    """Increment the offender warning count after a punish decision."""
    if not offender_id:
        return

    try:
        profile = supabase.table("profiles") \
            .select("warnings") \
            .eq("id", offender_id) \
            .single() \
            .execute()

        current_warnings = (profile.data or {}).get("warnings", 0) or 0

        supabase.table("profiles").update({
            "warnings": current_warnings + 1
        }).eq("id", offender_id).execute()

        print(
            f"Warning count for offender {offender_id}: "
            f"{current_warnings} -> {current_warnings + 1}"
        )
    except Exception as e:
        print(f"Warning increment failed for offender {offender_id}: {e}")


def finalize_case_resolution(case: dict, decision: str) -> dict:
    """
    Mark a case resolved and apply resolution side effects exactly once.
    """
    case_id = case.get("id")
    if not case_id:
        return case

    current_case = supabase.table("moderation_cases") \
        .select("status, decision, offender_id") \
        .eq("id", case_id) \
        .single() \
        .execute()

    current_data = current_case.data or {}
    already_resolved = current_data.get("status") == "resolved"
    offender_id = case.get("offender_id") or current_data.get("offender_id")

    if already_resolved and current_data.get("decision") == decision:
        return {
            **case,
            "status": "resolved",
            "decision": decision,
            "offender_id": offender_id,
        }

    supabase.table("moderation_cases").update({
        "status": "resolved",
        "decision": decision
    }).eq("id", case_id).execute()

    if decision == "punish" and not already_resolved:
        increment_offender_warnings(offender_id)

    return {
        **case,
        "status": "resolved",
        "decision": decision,
        "offender_id": offender_id,
    }


def select_random_moderators(exclude_user_id: str = None, count: int = 3) -> list:
    """
    Select random moderators from profiles that have wallet_address set.
    Excludes the offender.
    """
    try:
        query = supabase.table("profiles") \
            .select("id, username, wallet_address") \
            .not_.is_("wallet_address", "null")
        
        # Exclude the offender from being a moderator
        if exclude_user_id:
            query = query.neq("id", exclude_user_id)
        
        resp = query.execute()
        eligible = resp.data or []
        
        # Filter out profiles with empty wallet_address
        eligible = [p for p in eligible if p.get("wallet_address") and p["wallet_address"].strip()]
        
        if len(eligible) < count:
            print(f"Warning: Only {len(eligible)} eligible moderators found (need {count})")
            if len(eligible) == 0:
                return []
            count = len(eligible)
        
        selected = random.sample(eligible, count)
        
        print(f"Selected {len(selected)} moderators:")
        for mod in selected:
            print(f"   - {mod['username']} ({mod['wallet_address'][:10]}...)")
        
        return selected
        
    except Exception as e:
        print(f"Error selecting moderators: {e}")
        return []


def create_moderation_case(message_id: str, user_id: str, content: str, toxicity_score: float, ai_metadata: dict = None) -> dict:
    """
    Full flow:
    1. Select 3 random moderators
    2. Create case in Supabase moderation_cases table
    3. Call smart contract createCase()
    4. Update moderation_cases with blockchain_case_id
    """
    try:
        print(f"\nCreating moderation case for message: {message_id}")
        
        # --- Step 1: Get offender wallet address ---
        offender_resp = supabase.table("profiles") \
            .select("wallet_address") \
            .eq("id", user_id) \
            .single() \
            .execute()
        
        offender_wallet = None
        if offender_resp.data and offender_resp.data.get("wallet_address"):
            offender_wallet = offender_resp.data["wallet_address"]
        
        # Also check messages table for wallet_address
        if not offender_wallet:
            msg_resp = supabase.table("messages") \
                .select("wallet_address") \
                .eq("id", message_id) \
                .single() \
                .execute()
            if msg_resp.data and msg_resp.data.get("wallet_address"):
                offender_wallet = msg_resp.data["wallet_address"]
        
        if not offender_wallet:
            print("Warning: No wallet address found for offender, using zero address")
            offender_wallet = "0x0000000000000000000000000000000000000000"
        
        # --- Step 2: Select 3 random moderators ---
        moderators = select_random_moderators(exclude_user_id=user_id, count=3)
        
        if len(moderators) < 3:
            print(f"Error: Not enough moderators ({len(moderators)}/3). Skipping blockchain call.")
            # Still create the case in Supabase for tracking
            mod_wallets = [m["wallet_address"].lower() for m in moderators]
            while len(mod_wallets) < 3:
                mod_wallets.append(None)
            
            case_data = {
                "message_id": message_id,
                "offender_id": user_id,
                "moderator_1": mod_wallets[0],
                "moderator_2": mod_wallets[1],
                "moderator_3": mod_wallets[2],
                "status": "insufficient_moderators",
                "toxicity_score": toxicity_score,
                "created_at": datetime.now(IST).isoformat()
            }
            
            resp = supabase.table("moderation_cases").insert(case_data).execute()
            return {"success": False, "reason": "insufficient_moderators", "case": resp.data}
        
        mod_wallets = [m["wallet_address"].lower() for m in moderators]
        
        # --- Step 3: Create message hash ---
        message_hash = hashlib.sha256(
            f"{message_id}:{content}".encode()
        ).hexdigest()
        
        print(f"Message hash: {message_hash[:20]}...")
        print(f"Offender wallet: {offender_wallet}")
        print(f"Moderator wallets: {[w[:10]+'...' for w in mod_wallets]}")
        
        # --- Step 4: Insert case into Supabase FIRST ---
        case_data = {
            "message_id": message_id,
            "offender_id": user_id,
            "moderator_1": mod_wallets[0],
            "moderator_2": mod_wallets[1],
            "moderator_3": mod_wallets[2],
            "status": "voting",
            "toxicity_score": toxicity_score,
            "ai_reason": ai_metadata.get("reason") if ai_metadata else None,
            "punishment_type": ai_metadata.get("punishment") if ai_metadata else None,
            "punishment_duration": ai_metadata.get("punishment_duration") if ai_metadata else 0,
            "created_at": datetime.now(IST).isoformat()
        }
        
        print(f"Creating case in DB with toxicity_score: {toxicity_score}")
        
        insert_resp = supabase.table("moderation_cases").insert(case_data).execute()
        
        if not insert_resp.data:
            print("Error: Failed to insert case into Supabase")
            return {"success": False, "reason": "db_insert_failed"}
        
        supabase_case_id = insert_resp.data[0]["id"]
        print(f"Supabase case created: {supabase_case_id}")
        
        # --- Step 5: Call smart contract ---
        chain_result = create_case_on_chain(
            message_hash_hex=message_hash,
            offender_address=offender_wallet,
            moderator_addresses=mod_wallets
        )
        
        if chain_result["success"]:
            blockchain_case_id = chain_result["case_id"]
            tx_hash = chain_result["tx_hash"]
            
            print(f"Case {blockchain_case_id} created on-chain. TX: {tx_hash}")

            # --- CRITICAL: Save blockchain_case_id and set status to voting ---
            # This is essential for the case to be votable in the frontend.
            try:
                # First attempt: Try to save EVERYTHING (including tx_hash if column exists)
                supabase.table("moderation_cases").update({
                    "blockchain_case_id": blockchain_case_id,
                    "tx_hash": tx_hash,
                    "status": "voting"
                }).eq("id", supabase_case_id).execute()
                print("   Saved case ID and transaction hash to DB.")
            except Exception as e:
                # Second attempt fallback: If tx_hash column is missing, just save case_id
                print(f"   Warning: Could not save tx_hash (col might be missing: {e})")
                print("   Falling back to basic case registration...")
                supabase.table("moderation_cases").update({
                    "blockchain_case_id": blockchain_case_id,
                    "status": "voting"
                }).eq("id", supabase_case_id).execute()
                print("   Basic case registration successful. Voting is now ENABLED.")
            
            return {
                "success": True,
                "supabase_case_id": supabase_case_id,
                "blockchain_case_id": blockchain_case_id,
                "tx_hash": tx_hash,
                "moderators": mod_wallets
            }
        else:
            # Blockchain failed but Supabase case exists
            supabase.table("moderation_cases").update({
                "status": "chain_error"
            }).eq("id", supabase_case_id).execute()
            
            print(f"Warning: Case created in DB but blockchain call failed: {chain_result.get('error')}")
            return {
                "success": False,
                "reason": "blockchain_failed",
                "error": chain_result.get("error"),
                "supabase_case_id": supabase_case_id
            }
        
    except Exception as e:
        print(f"Error creating moderation case: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "reason": str(e)}


def check_and_update_resolved_cases():
    """
    Poll blockchain for resolved cases OR 2/3 majority consensus.
    Updates Supabase to trigger automated punishments.
    """
    try:
        # Get all cases that are still 'voting' in Supabase
        resp = supabase.table("moderation_cases") \
            .select("id, blockchain_case_id, moderator_1, moderator_2, moderator_3") \
            .eq("status", "voting") \
            .not_.is_("blockchain_case_id", "null") \
            .execute()
        
        pending_cases = resp.data or []
        if not pending_cases:
            return
        
        from services.blockchain import get_case_from_chain, verify_vote_on_chain
        
        for case in pending_cases:
            try:
                bc_id = case["blockchain_case_id"]
                chain_data = get_case_from_chain(bc_id)
                if not chain_data:
                    continue

                # --- OPTION A: Blockchain is already officially resolved ---
                if chain_data["resolved"]:
                    decision = "punish" if chain_data["decision"] == 1 else "dismiss"
                    print(f"[SYNC] Case {bc_id} officially resolved on-chain: {decision}")
                    finalize_case_resolution(case, decision)
                    continue

                # --- OPTION B: Pro-active 2/3 Majority Check ---
                mods = [case["moderator_1"], case["moderator_2"], case["moderator_3"]]
                votes = {"punish": 0, "dismiss": 0}
                
                for mod_addr in mods:
                    if not mod_addr: continue
                    v_check = verify_vote_on_chain(bc_id, mod_addr)
                    if v_check["vote"] == 1: votes["punish"] += 1
                    elif v_check["vote"] == 2: votes["dismiss"] += 1

                determined_decision = None
                if votes["punish"] >= 2: determined_decision = "punish"
                elif votes["dismiss"] >= 2: determined_decision = "dismiss"

                if determined_decision:
                    print(f"[SYNC] Case {bc_id} reached 2/3 majority pro-actively: {determined_decision}")
                    finalize_case_resolution(case, determined_decision)
            except Exception as case_error:
                print(f"   [SYNC Error] Skipping Case {case.get('blockchain_case_id', 'unknown')}: {case_error}")
                continue
                
    except Exception as e:
        print(f"CRITICAL Error in background resolution sync loop: {e}")
