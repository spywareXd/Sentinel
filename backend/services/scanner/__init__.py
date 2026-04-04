# backend/services/scanner/__init__.py

from .classifier import is_suspicious
from .context_manager import get_initial_context, format_context_for_llm
from .agent import analyze_case

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
    
    # Step 3: Powerful Gemini Agent deep analysis with Tool Use
    analysis = analyze_case(message_id, context_str)
    
    # Combine results
    return {
        "flagged": analysis.get("flagged", False),
        "reason": analysis.get("reason", "Unknown"),
        "harmful_score": analysis.get("confidence", 0.0),
        "severe_score": (1.0 if analysis.get("threat_level") == "Extreme" else 0.8 if analysis.get("threat_level") == "High" else 0.5 if analysis.get("threat_level") == "Medium" else 0.2 if analysis.get("threat_level") == "Low" else 0.0),
        "punishment": analysis.get("action_recommended"),
        "punishment_duration": analysis.get("punishment_duration", 0),
        "step_reached": 3,
        "details": analysis
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