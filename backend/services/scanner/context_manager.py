# backend/services/scanner/context_manager.py

from core.database import supabase

def get_initial_context(message_id: str, chat_id: str, limit: int = 10) -> list:
    """
    Step 2: Fetch the last 10 messages before the given message_id.
    """
    try:
        # Fetch messages before the target message_id, ordered by created_at.
        # Note: If no message_id is provided, just get the most recent ones.
        query = supabase.table("messages") \
            .select("id, content, user_id, created_at") \
            .order("created_at", desc=True) \
            .limit(limit)
            
        if message_id:
            # First find the creation time of the target message
            target_msg = supabase.table("messages").select("created_at").eq("id", message_id).single().execute()
            if target_msg.data:
                ts = target_msg.data["created_at"]
                query = query.lt("created_at", ts)
                
        resp = query.execute()
        # The messages are returned in desc order (most recent first).
        # We should reverse them to be in chronological order for the LLM.
        messages = resp.data or []
        messages.reverse()
        return messages
    except Exception as e:
        print(f"Error fetching initial context: {e}")
        return []

def format_context_for_llm(messages: list, target_message: str) -> str:
    """
    Formats a list of message objects into a string for the LLM context.
    """
    context_str = "Conversation History:\n"
    for msg in messages:
        sender = msg.get("user_id", "Unknown")
        content = msg.get("content", "")
        context_str += f"- [{sender}]: {content}\n"
    
    context_str += f"\nTarget Message to Analyze:\n- {target_message}\n"
    return context_str
