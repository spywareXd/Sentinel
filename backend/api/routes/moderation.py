# backend/routes/moderation.py

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from core.database import supabase
from services.blockchain import get_case_from_chain, get_case_count, verify_vote_on_chain

router = APIRouter(prefix="/moderation", tags=["Moderation"])


class VoteSyncRequest(BaseModel):
    case_id: str          # UUID of the moderation case in Supabase
    moderator_address: str  # wallet address of the moderator who voted
    vote: int              # 1 = punish, 2 = dismiss
    tx_hash: str           # transaction hash from MetaMask


@router.post("/vote/sync")
def sync_vote(body: VoteSyncRequest):
    """
    Called by frontend AFTER a moderator submits their vote via MetaMask.
    Verifies the vote on-chain, then updates the moderation case in Supabase.
    If 2+ votes agree (majority), marks the case resolved.
    """
    # Fetch the case
    resp = supabase.table("moderation_cases") \
        .select("*") \
        .eq("id", body.case_id) \
        .single() \
        .execute()

    if not resp.data:
        raise HTTPException(status_code=404, detail="Case not found")

    case = resp.data

    if case.get("status") == "resolved":
        raise HTTPException(status_code=400, detail="Case already resolved")

    blockchain_case_id = case.get("blockchain_case_id")
    if blockchain_case_id is None:
        raise HTTPException(status_code=400, detail="Case has no blockchain ID yet")

    # Verify on-chain
    on_chain = verify_vote_on_chain(blockchain_case_id, body.moderator_address)
    if not on_chain.get("has_voted"):
        raise HTTPException(
            status_code=422,
            detail="On-chain verification failed: vote not found on blockchain"
        )

    # Check current on-chain case state
    chain_case = get_case_from_chain(blockchain_case_id)

    if chain_case and chain_case.get("resolved"):
        # Contract resolved the case — determine outcome
        decision_code = chain_case.get("decision", 0)
        decision = "punish" if decision_code == 1 else "dismiss"
        supabase.table("moderation_cases").update({
            "status": "resolved",
            "decision": decision
        }).eq("id", body.case_id).execute()
        return {
            "success": True,
            "vote_recorded": True,
            "case_resolved": True,
            "decision": decision,
            "tx_hash": body.tx_hash,
            "on_chain": chain_case
        }

    return {
        "success": True,
        "vote_recorded": True,
        "case_resolved": False,
        "vote": body.vote,
        "tx_hash": body.tx_hash,
        "on_chain": chain_case
    }


@router.get("/cases")
def get_all_cases(status: str = None, limit: int = 20):
    """Get all moderation cases, optionally filtered by status"""
    query = supabase.table("moderation_cases") \
        .select("*, messages:message_id(content, harmful_score, severe_score, reason), offender:offender_id(username, wallet_address, warnings)") \
        .order("created_at", desc=True) \
        .limit(limit)
    
    if status:
        query = query.eq("status", status)
    
    resp = query.execute()
    
    return {
        "success": True,
        "count": len(resp.data or []),
        "cases": resp.data or []
    }


@router.get("/my-cases")
def get_my_cases(wallet_address: str = Query(..., description="Moderator wallet address")):
    """Get cases assigned to a specific moderator wallet"""
    addr = wallet_address.lower()
    
    resp = supabase.table("moderation_cases") \
        .select("*, messages:message_id(content, harmful_score, severe_score, reason), offender:offender_id(username, wallet_address, warnings)") \
        .or_(f"moderator_1.eq.{addr},moderator_2.eq.{addr},moderator_3.eq.{addr}") \
        .order("created_at", desc=True) \
        .execute()
    
    cases = resp.data or []
    
    # Enrich with on-chain data
    enriched = []
    for case in cases:
        chain_data = None
        if case.get("blockchain_case_id") is not None:
            chain_data = get_case_from_chain(case["blockchain_case_id"])
        
        enriched.append({
            **case,
            "on_chain": chain_data
        })
    
    return {
        "success": True,
        "count": len(enriched),
        "cases": enriched
    }


@router.get("/case/{case_id}")
def get_case_detail(case_id: str):
    """Get full details of a specific moderation case"""
    resp = supabase.table("moderation_cases") \
        .select("*, messages:message_id(content, harmful_score, severe_score, reason, punishment), offender:offender_id(username, wallet_address, warnings)") \
        .eq("id", case_id) \
        .single() \
        .execute()
    
    if not resp.data:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case = resp.data
    chain_data = None
    
    if case.get("blockchain_case_id") is not None:
        chain_data = get_case_from_chain(case["blockchain_case_id"])
    
    return {
        "success": True,
        "case": {
            **case,
            "on_chain": chain_data
        }
    }


@router.get("/chain/case/{blockchain_case_id}")
def get_chain_case(blockchain_case_id: int):
    """Read case directly from blockchain"""
    data = get_case_from_chain(blockchain_case_id)
    
    if not data:
        raise HTTPException(status_code=404, detail="Case not found on chain")
    
    return {
        "success": True,
        "case": data
    }


@router.get("/chain/count")
def get_chain_case_count():
    """Get total case count from blockchain"""
    count = get_case_count()
    return {"success": True, "case_count": count}


@router.get("/stats")
def get_moderation_stats():
    """Get moderation statistics"""
    try:
        total = supabase.table("moderation_cases").select("id", count="exact").execute()
        voting = supabase.table("moderation_cases").select("id", count="exact").eq("status", "voting").execute()
        resolved = supabase.table("moderation_cases").select("id", count="exact").eq("status", "resolved").execute()
        punished = supabase.table("moderation_cases").select("id", count="exact").eq("decision", "punish").execute()
        dismissed = supabase.table("moderation_cases").select("id", count="exact").eq("decision", "dismiss").execute()
        
        return {
            "success": True,
            "stats": {
                "total_cases": total.count or 0,
                "voting": voting.count or 0,
                "resolved": resolved.count or 0,
                "punished": punished.count or 0,
                "dismissed": dismissed.count or 0
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/retry-chain/{case_id}")
def retry_blockchain_case(case_id: str):
    """Retry blockchain call for a case that failed"""
    resp = supabase.table("moderation_cases") \
        .select("*, messages:message_id(content)") \
        .eq("id", case_id) \
        .single() \
        .execute()
    
    if not resp.data:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case = resp.data
    
    if case.get("blockchain_case_id") is not None:
        raise HTTPException(status_code=400, detail="Case already has blockchain ID")
    
    from services.moderation import create_moderation_case
    
    result = create_moderation_case(
        message_id=case["message_id"],
        user_id=case["offender_id"],
        content=case["messages"]["content"] if case.get("messages") else "",
        severe_score=case.get("toxicity_score", 0)
    )
    
    return {"success": result["success"], "result": result}