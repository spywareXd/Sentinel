# backend/services/scanner/__init__.py

import re

from .classifier import is_suspicious
from .context_manager import get_initial_context, format_context_for_llm
from .agent import analyze_case

LOW_TIMEOUT_DURATION = 2
MEDIUM_TIMEOUT_DURATION = 10
HIGH_TIMEOUT_DURATION = 60
EXTREME_BAN_DURATION = 43200
REASON_SEPARATOR = "|||"

OTHER_DIRECTED_SELF_HARM_PATTERNS = [
    r"\bkill yourself\b",
    r"\bgo kill yourself\b",
    r"\byou should kill yourself\b",
    r"\bend yourself\b",
    r"\byou should end yourself\b",
    r"\bhurt yourself\b",
    r"\bcut yourself\b",
    r"\bkys\b",
]

SELF_DIRECTED_DISTRESS_PATTERNS = [
    r"\bi am going to kill myself\b",
    r"\bi'm going to kill myself\b",
    r"\bi will kill myself\b",
    r"\bi want to kill myself\b",
    r"\bi wanna kill myself\b",
    r"\bi should kill myself\b",
    r"\bi could kill myself\b",
    r"\bkill myself\b",
    r"\bend myself\b",
    r"\bhurt myself\b",
    r"\bcut myself\b",
    r"\bi hate myself\b",
    r"\bfuck my life\b",
    r"\bmy life is fucked\b",
    r"\bim done with life\b",
    r"\bi am done with life\b",
    r"\bi want to die\b",
    r"\bi wanna die\b",
    r"\bi wish i was dead\b",
    r"\bkms\b",
]


def _is_self_directed_distress(message: str) -> bool:
    normalized = " ".join((message or "").strip().lower().split())
    if not normalized:
        return False

    if any(re.search(pattern, normalized) for pattern in OTHER_DIRECTED_SELF_HARM_PATTERNS):
        return False

    return any(re.search(pattern, normalized) for pattern in SELF_DIRECTED_DISTRESS_PATTERNS)


def _default_reason_summary(flagged: bool, threat_level: str) -> str:
    normalized_threat = str(threat_level or "none").strip().lower()

    if not flagged or normalized_threat == "none":
        return "Safe"
    if normalized_threat == "extreme":
        return "Extreme Risk"
    if normalized_threat == "high":
        return "High Toxicity"
    if normalized_threat == "medium":
        return "Targeted Abuse"
    if normalized_threat == "low":
        return "Low Toxicity"
    return "Moderation Flag"


def _normalize_reason(reason: str | None, flagged: bool, threat_level: str) -> str:
    raw_reason = str(reason or "").strip()

    if REASON_SEPARATOR in raw_reason:
        summary, detail = [part.strip() for part in raw_reason.split(REASON_SEPARATOR, 1)]
        summary = summary or _default_reason_summary(flagged, threat_level)
        detail = detail or ("Clean context with no moderation violation." if not flagged else "Flagged by moderation policy.")
        return f"{summary} {REASON_SEPARATOR} {detail}"

    summary = _default_reason_summary(flagged, threat_level)
    detail = raw_reason or ("Clean context with no moderation violation." if not flagged else "Flagged by moderation policy.")
    return f"{summary} {REASON_SEPARATOR} {detail}"


def _normalize_flagged_recommendation(flagged: bool, threat_level: str, action: str | None, duration: int | None):
    """
    Ensure flagged outputs always carry a concrete punishment recommendation and duration.
    """
    normalized_action = str(action or "").strip().lower()
    normalized_threat = str(threat_level or "none").strip().lower()

    if not flagged:
        return "none", 0

    if normalized_action == "warning":
        normalized_action = "timeout"

    if normalized_action not in {"timeout", "ban"}:
        if normalized_threat == "extreme":
            normalized_action = "ban"
        elif normalized_threat in {"high", "medium", "low"}:
            normalized_action = "timeout"
        else:
            normalized_action = "timeout"

    try:
        normalized_duration = int(duration) if duration is not None else 0
    except (TypeError, ValueError):
        normalized_duration = 0

    if normalized_duration <= 0:
        if normalized_action == "ban":
            normalized_duration = EXTREME_BAN_DURATION
        elif normalized_threat == "high":
            normalized_duration = HIGH_TIMEOUT_DURATION
        elif normalized_threat == "medium":
            normalized_duration = MEDIUM_TIMEOUT_DURATION
        else:
            normalized_duration = LOW_TIMEOUT_DURATION

    return normalized_action, normalized_duration


def run_3_step_scan(message: str, message_id: str = None, chat_id: str = None) -> dict:
    """
    Main entry point for the 3-step moderation scanner.
    """
    # Step 1: Rapid Light BERT Scan
    if not is_suspicious(message):
        return {
            "flagged": False,
            "reason": "Safe",
            "harmful_score": 0.0,
            "severe_score": 0.0,
            "punishment": None,
            "step_reached": 1
        }
    
    # Step 2: Context Window Creation (Default 10 messages)
    context_msgs = get_initial_context(message_id, chat_id, limit=10)
    context_str = format_context_for_llm(context_msgs, message)

    if _is_self_directed_distress(message):
        return {
            "flagged": False,
            "reason": _normalize_reason(
                "Self Distress ||| Self-directed distress or venting about oneself is not a moderation violation in this system.",
                flagged=False,
                threat_level="none",
            ),
            "harmful_score": 0.0,
            "severe_score": 0.0,
            "punishment": "none",
            "punishment_duration": 0,
            "step_reached": 2,
            "details": {
                "policy_override": "self_directed_distress",
                "context_preview": context_str[:280],
            },
        }
    
    # Step 3: Powerful Gemini Agent deep analysis with Tool Use
    analysis = analyze_case(message_id, context_str)
    
    # Combine results
    threat_level = str(analysis.get("threat_level", "None")).strip().lower()
    
    # Calculate severe_score based on normalized threat level
    if threat_level == "extreme":
        severe_score = 1.0
    elif threat_level == "high":
        severe_score = 0.8
    elif threat_level == "medium":
        severe_score = 0.5
    elif threat_level == "low":
        severe_score = 0.2
    else:
        severe_score = 0.0

    flagged = analysis.get("flagged", False)
    normalized_reason = _normalize_reason(
        analysis.get("reason"),
        flagged=flagged,
        threat_level=analysis.get("threat_level", "None"),
    )
    punishment, punishment_duration = _normalize_flagged_recommendation(
        flagged=flagged,
        threat_level=analysis.get("threat_level", "None"),
        action=analysis.get("action_recommended"),
        duration=analysis.get("punishment_duration", 0),
    )

    return {
        "flagged": flagged,
        "reason": normalized_reason,
        "harmful_score": analysis.get("confidence", 0.0),
        "severe_score": severe_score,
        "punishment": punishment,
        "punishment_duration": punishment_duration,
        "step_reached": 3,
        "details": {
            **analysis,
            "reason": normalized_reason,
            "action_recommended": punishment,
            "punishment_duration": punishment_duration,
        }
    }

def scan(message, warning_count=0, message_id=None, chat_id=None):
    """
    Wrapper for the 3-step scanner to maintain compatibility with existing API routes.
    """
    result = run_3_step_scan(message, message_id, chat_id)
    
    # Map the new structured output to the old format expected by the frontend
    return {
        "flagged": result.get("flagged", False),
        "reason": result.get("reason", "Unknown"),
        "harmful_score": result.get("harmful_score", 0.0),
        "severe_score": result.get("severe_score", 0.0),
        "punishment": result.get("punishment"),
        "punishment_duration": result.get("punishment_duration", 0),
        "step_reached": result.get("step_reached"),
        "details": result.get("details", {})
    }
