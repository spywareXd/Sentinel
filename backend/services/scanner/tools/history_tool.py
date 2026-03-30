# backend/services/scanner/tools/history_tool.py

from langchain_core.tools import tool
from core.database import supabase

@tool
def get_more_context(message_id: str, count: int = 5) -> str:
    """
    Fetch 'count' more messages from the message history before a specific message_id.
    Useful for clarifying the intent or direction of a suspicious conversation.
    """
    try:
        # First find the creation time of the target message
        target_msg = supabase.table("messages").select("created_at").eq("id", message_id).single().execute()
        if not target_msg.data:
            return "Could not find the reference message to fetch more history."
            
        ts = target_msg.data["created_at"]
        
        # Fetch older messages
        resp = supabase.table("messages") \
            .select("user_id, content, created_at") \
            .lt("created_at", ts) \
            .order("created_at", desc=True) \
            .limit(count) \
            .execute()
            
        messages = resp.data or []
        # Return in chronological order
        messages.reverse()
        
        if not messages:
            return "No more history found before this message."
            
        context_str = "--- Additional History Loaded ---\n"
        for msg in messages:
            sender = msg.get("user_id", "Unknown")
            content = msg.get("content", "")
            context_str += f"- [{sender}]: {content}\n"
            
        return context_str
    except Exception as e:
        return f"Error fetching more context: {e}"
