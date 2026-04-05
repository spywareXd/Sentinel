# backend/routes/moderation.py

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from core.database import supabase
from services.blockchain import get_case_from_chain, get_case_count, verify_vote_on_chain
from services.moderation import create_moderation_case, finalize_case_resolution

router = APIRouter(prefix="/moderation", tags=["Moderation"])

CASE_BASE_SELECT = (
    "id, message_id, offender_id, moderator_1, moderator_2, moderator_3, "
    "status, decision, created_at, toxicity_score, ai_reason, "
    "punishment_type, punishment_duration, blockchain_case_id, tx_hash"
)


class VoteSyncRequest(BaseModel):
    case_id: str          # UUID of the moderation case in Supabase
    moderator_address: str  # wallet address of the moderator who voted
    vote: int              # 1 = punish, 2 = dismiss
    tx_hash: str           # transaction hash from MetaMask


def _vote_label(vote: int) -> str:
    if vote == 1:
        return "punish"
    if vote == 2:
        return "dismiss"
    return "pending"


def _log_vote_event(case: dict, chain_case: dict | None, source: str, moderator_address: str | None = None, vote: int | None = None):
    """
    Emit a readable vote event log with the current moderator breakdown.
    """
    blockchain_case_id = case.get("blockchain_case_id")
    moderators = [case.get("moderator_1"), case.get("moderator_2"), case.get("moderator_3")]
    punish_count = 0
    dismiss_count = 0
    breakdown: list[str] = []

    if blockchain_case_id is not None:
        for moderator in moderators:
            if not moderator:
                continue
            vote_value = verify_vote_on_chain(blockchain_case_id, moderator).get("vote", 0)
            if vote_value == 1:
                punish_count += 1
            elif vote_value == 2:
                dismiss_count += 1
            breakdown.append(f"{moderator[:10]}...={_vote_label(vote_value)}")

    parts = [f"[VOTE EVENT] {source}", f"case={blockchain_case_id}"]
    if moderator_address:
        parts.append(f"moderator={moderator_address[:10]}...")
    if vote is not None:
        parts.append(f"vote={_vote_label(vote)}")
    if chain_case and chain_case.get("vote_count") is not None:
        parts.append(f"vote_count={chain_case['vote_count']}/3")

    print(" | ".join(parts))
    print(
        f"   punish={punish_count} | dismiss={dismiss_count} | "
        f"resolved={chain_case.get('resolved') if chain_case else '?'} | "
        f"decision={_vote_label(chain_case.get('decision', 0)) if chain_case else 'unknown'}"
    )
    if breakdown:
        print(f"   breakdown: {', '.join(breakdown)}")


def _hydrate_cases(cases: list[dict]) -> list[dict]:
    """
    Enrich cases without relying on old FK-based nested selects.
    """
    if not cases:
        return []

    message_ids = sorted({case["message_id"] for case in cases if case.get("message_id")})
    offender_ids = sorted({case["offender_id"] for case in cases if case.get("offender_id")})

    messages_by_id: dict[str, dict] = {}
    offenders_by_id: dict[str, dict] = {}

    if message_ids:
        message_resp = supabase.table("messages") \
            .select("id, content") \
            .in_("id", message_ids) \
            .execute()
        messages_by_id = {
            row["id"]: {"content": row.get("content")}
            for row in (message_resp.data or [])
        }

    if offender_ids:
        offender_resp = supabase.table("profiles") \
            .select("id, username, wallet_address") \
            .in_("id", offender_ids) \
            .execute()
        offenders_by_id = {
            row["id"]: {
                "username": row.get("username"),
                "wallet_address": row.get("wallet_address"),
            }
            for row in (offender_resp.data or [])
        }

    return [
        {
            **case,
            "messages": messages_by_id.get(case.get("message_id")),
            "offender": offenders_by_id.get(case.get("offender_id")),
        }
        for case in cases
    ]


def _sync_case_resolution(case: dict) -> tuple[dict, dict | None]:
    """
    Sync a moderation case with on-chain votes.
    Resolves at 3/3 on-chain contract resolution or proactively at 2/3 majority.
    Returns the possibly-updated case and the fetched chain data.
    """
    blockchain_case_id = case.get("blockchain_case_id")
    if blockchain_case_id is None:
        return case, None

    chain_data = get_case_from_chain(blockchain_case_id)
    if not chain_data or case.get("status") != "voting":
        return case, chain_data

    determined_decision = None

    if chain_data.get("resolved"):
        determined_decision = "punish" if chain_data.get("decision") == 1 else "dismiss"
    else:
        mods = [case.get("moderator_1"), case.get("moderator_2"), case.get("moderator_3")]
        v_punish = 0
        v_dismiss = 0

        for moderator in mods:
            if not moderator:
                continue
            vote = verify_vote_on_chain(blockchain_case_id, moderator).get("vote", 0)
            if vote == 1:
                v_punish += 1
            elif vote == 2:
                v_dismiss += 1

        if v_punish >= 2:
            determined_decision = "punish"
        elif v_dismiss >= 2:
            determined_decision = "dismiss"

    if determined_decision:
        case = finalize_case_resolution(case, determined_decision)

    return case, chain_data


@router.post("/vote/sync")
def sync_vote(body: VoteSyncRequest):
    """
    Called by frontend AFTER a moderator submits their vote via MetaMask.
    Verifies the vote on-chain, then updates the moderation case in Supabase.
    If 2+ votes agree (majority), marks the case resolved.
    """
    resp = supabase.table("moderation_cases").select("*").eq("id", body.case_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Case not found")
    case = resp.data
    print(
        f"[VOTE SYNC] case_id={body.case_id} | "
        f"blockchain_case_id={case.get('blockchain_case_id')} | "
        f"moderator={body.moderator_address[:10]}... | "
        f"vote={_vote_label(body.vote)} | tx={body.tx_hash}"
    )

    case, chain_case = _sync_case_resolution(case)
    if case.get("status") == "resolved":
        _log_vote_event(case, chain_case, "post-sync resolved", body.moderator_address, body.vote)
        return {"success": True, "case_resolved": True, "decision": case.get("decision")}

    if case.get("status") == "resolved":
        raise HTTPException(status_code=400, detail="Case already resolved")

    blockchain_case_id = case.get("blockchain_case_id")
    if blockchain_case_id is None:
        raise HTTPException(status_code=400, detail="Case has no blockchain ID yet")

    on_chain = verify_vote_on_chain(blockchain_case_id, body.moderator_address)
    if not on_chain.get("has_voted"):
        raise HTTPException(
            status_code=422,
            detail="On-chain verification failed: vote not found on blockchain"
        )

    chain_case = get_case_from_chain(blockchain_case_id)
    _log_vote_event(case, chain_case, "vote recorded", body.moderator_address, body.vote)

    if chain_case and chain_case.get("resolved"):
        decision_code = chain_case.get("decision", 0)
        decision = "punish" if decision_code == 1 else "dismiss"
        case = finalize_case_resolution(case, decision)
        return {
            "success": True,
            "vote_recorded": True,
            "case_resolved": True,
            "decision": case.get("decision"),
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
        .select(CASE_BASE_SELECT) \
        .order("created_at", desc=True) \
        .limit(limit)

    if status:
        query = query.eq("status", status)

    try:
        resp = query.execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load moderation cases: {e}")

    cases = _hydrate_cases(resp.data or [])

    return {
        "success": True,
        "count": len(cases),
        "cases": cases
    }


@router.get("/my-cases")
def get_my_cases(
    wallet_address: str = Query(..., description="Moderator wallet address"),
    include_chain: bool = Query(False, description="When true, also fetch on-chain state for each case"),
):
    """Get cases assigned to a specific moderator wallet"""
    addr = wallet_address.lower()

    try:
        resp = supabase.table("moderation_cases") \
            .select(CASE_BASE_SELECT) \
            .or_(f"moderator_1.eq.{addr},moderator_2.eq.{addr},moderator_3.eq.{addr}") \
            .order("created_at", desc=True) \
            .execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load assigned cases: {e}")

    cases = _hydrate_cases(resp.data or [])

    if not include_chain:
        return {
            "success": True,
            "count": len(cases),
            "cases": cases
        }

    enriched = []
    for case in cases:
        case, chain_data = _sync_case_resolution(case)
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
    """Get full details and ensure status is synced with blockchain"""
    try:
        resp = supabase.table("moderation_cases") \
            .select(CASE_BASE_SELECT) \
            .eq("id", case_id) \
            .single() \
            .execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load case detail: {e}")

    if not resp.data:
        raise HTTPException(status_code=404, detail="Case not found")

    case = resp.data
    case, chain_data = _sync_case_resolution(case)
    case = _hydrate_cases([case])[0]
    return {"success": True, "case": {**case, "on_chain": chain_data}}


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
    try:
        resp = supabase.table("moderation_cases") \
            .select(CASE_BASE_SELECT) \
            .eq("id", case_id) \
            .single() \
            .execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load retry-chain case: {e}")

    if not resp.data:
        raise HTTPException(status_code=404, detail="Case not found")

    case = _hydrate_cases([resp.data])[0]

    if case.get("blockchain_case_id") is not None:
        raise HTTPException(status_code=400, detail="Case already has blockchain ID")

    result = create_moderation_case(
        message_id=case["message_id"],
        user_id=case["offender_id"],
        content=case["messages"]["content"] if case.get("messages") else "",
        toxicity_score=case.get("toxicity_score", 0)
    )

    return {"success": result["success"], "result": result}
