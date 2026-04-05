# backend/services/scanner/agent.py

import os
import json
import re
from dotenv import load_dotenv
from typing import TypedDict, List, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, ToolMessage, SystemMessage
from langchain_core.tools import tool
from langsmith import traceable
from services.scanner.tools.history_tool import get_more_context

# Load environment variables
load_dotenv()

MAX_ITERATIONS = 5  
MODEL = "gemini-flash-latest"

# Punishment Durations (in minutes)
DURATION_EXTREME = 43200  # 30 days for death threats/extreme toxicity
DURATION_HIGH = 60        # 1 hour for racism/self-harm
DURATION_MEDIUM = 10      # 10 minutes for directed insults
DURATION_LOW = 2          # 2 minutes for repeated undirected profanity when context is dirty

# System prompt for the moderation agent
SYSTEM_PROMPT = f"""
You are a highly sophisticated AI Moderation Specialist for Chat Toxicity Moderation.
Your task is to analyze a message and its conversation history to determine if it violates community guidelines such as slurs, threats, harassment, self-harm.

STRICT RULES YOU MUST FOLLOW:
1. You MUST provide a structured response (JSON).
2. If the context is insufficient to make a decision, use the 'get_more_context' tool.
3. You can use the tool at most 5 times.
4. Try to provide a decision in minimum amount of context.
5. Only when you absolutely need more context due to ambiguity, call the tool.
6. If you have enough context, provide a final decision.
7. YOUR FINAL OUTPUT MUST BE ONLY THE JSON OBJECT. NO PREAMBLE. NO EXPLANATION.
8. CONTEXT CLEAN RULE: If the target message only contains low-level undirected profanity such as "shit", "fuck", or "hell", and the surrounding context is otherwise clean and non-targeted, you MUST NOT flag it.
9. REPETITION RULE: If the surrounding context shows the SAME USER repeatedly using profanity, even if the target message is undirected profanity, you MUST flag it as "Low" severity with action `timeout` and duration {DURATION_LOW}.
10. HISTORY ESCALATION RULE: If the surrounding context shows the SAME USER using stronger toxicity such as directed insults, harassment, slurs, racism, hate speech, or self-harm language, you MUST escalate the current case to at least "Medium" severity, even if the target message itself is only mild profanity.
11. SAME-USER RULE: Only use prior toxicity from the same user to escalate severity. Do not escalate based on toxic messages written by other participants.
12. SELF-DIRECTED DISTRESS RULE: First-person self-directed distress such as "i am going to kill myself", "i hate myself", "fuck my life", or similar venting about oneself MUST NOT be flagged. These are not moderation violations in this system unless the speaker is directing self-harm at someone else.
13. SELF-HARM TARGET RULE: Only flag self-harm language when it encourages, instructs, or targets ANOTHER PERSON, such as "kill yourself", "go die", or direct threats of harm.
14. CONSISTENCY RULE: If "flagged" is true, you MUST return action `timeout` or `ban` and an integer "punishment_duration". If "flagged" is false, you MUST return action `none` and duration 0.

JSON STRUCTURE:
{{
  "flagged": true/false,
  "reason": "REASON_SUMMARY (1-3 words) ||| REASON IN DETAIL (1-3 lines)",
  "confidence": 0.0 to 1.0,
  "threat_level": "None" | "Low" | "Medium" | "High" | "Extreme",
  "action_recommended": "none" | "timeout" | "ban",
  "punishment_duration": integer (in minutes)
}}

REASON FORMAT RULES:
- The `reason` field MUST contain exactly one `|||` separator.
- Left side: a concise summary of 1-3 words, examples: `Clean Context`, `Repeated Profanity`, `Targeted Harassment`, `Racial Slur`, `Self Harm Threat`.
- Right side: the detailed explanation in 1-3 lines.
- If not flagged, still follow the same format, for example: `Safe ||| Clean context with no moderation violation.`

SEVERITY & PUNISHMENT GUIDELINES:
- **Extreme**: Death threats, immediate physical harm, or instructions for self-harm. 
  - Applies to threats or instructions directed at others, not first-person self-directed distress
  - Action: `ban` | Duration: {DURATION_EXTREME} min
- **High**: Racism, hate speech, slurs, or severe targeted harassment. 
  - Action: `timeout` | Duration: {DURATION_HIGH} min
- **Medium**: Directed insults, personal attacks, or mild current profanity from a user whose recent context includes stronger toxicity. 
  - Action: `timeout` | Duration: {DURATION_MEDIUM} min
- **Low**: Repeated undirected profanity or general low-level toxicity from the same user in the current context. 
  - Action: `timeout` | Duration: {DURATION_LOW} min
- **None**: Safe content. 
  - Includes isolated, undirected low-level profanity in otherwise clean context
  - Includes self-directed distress, venting, or first-person self-harm statements about oneself
  - Action: `none` | Duration: 0
"""

def extract_json(text: str) -> str:
    """
    Robustly extracts a JSON object from a string.
    """
    # 1. Try to find markdown-wrapped JSON
    match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if match:
        return match.group(1).strip()
    
    # 2. Try to find the first '{' and last '}'
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1:
        return text[start:end+1].strip()
    
    return text.strip()

@traceable(name="Moderation Agent Loop")
def analyze_case(message_id: str, context_str: str) -> dict:
    """
    Step 3: Analyze the message and history using the Gemini Agent with a manual loop.
    """
    tools = [get_more_context]
    tools_dict = {t.name: t for t in tools}
    
    # Initialize the LLM
    llm = init_chat_model(f"google_genai:{MODEL}")
    llm_with_tools = llm.bind_tools(tools)
    
    query = f"Reference Message ID: {message_id}\n\n{context_str}\n\nAnalyze the case above and provide a verdict in JSON format."
    
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=query)
    ]
    
    print(f"--- Starting Analysis for Case: {message_id} ---")
    
    for iteration in range(1, MAX_ITERATIONS + 1):
        print(f"--- Iteration: {iteration} ---")
        try:
            ai_message = llm_with_tools.invoke(messages)
        except Exception as e:
            print(f"LLM Invoke Error: {e}")
            break
            
        tool_calls = ai_message.tool_calls
        
        if not tool_calls:
            # Case resolved, final answer provided
            content = ai_message.content
            
            # Normalize content to string
            if isinstance(content, list):
                content = "".join([part.get("text", "") if isinstance(part, dict) else str(part) for part in content])
            
            cleaned_json = extract_json(content)
            print(f"Final Decision Content: {cleaned_json}")
            
            try:
                return json.loads(cleaned_json)
            except Exception as e:
                print(f"Error parsing agent JSON: {e} | Raw: {cleaned_json}")
                return {
                    "flagged": False,
                    "reason": f"Parsing Error: {str(e)}",
                    "confidence": 0.0,
                    "threat_level": "Unknown",
                    "action_recommended": "none"
                }

        # Handle tool calls
        tool_call = tool_calls[0]
        tool_name = tool_call.get("name")
        tool_args = tool_call.get("args", {})
        tool_id = tool_call.get("id")
        
        print(f"Tool selected: {tool_name} with args: {tool_args}")
        tool_to_use = tools_dict.get(tool_name)
        
        if tool_to_use is None:
            print(f"Error: Tool {tool_name} not found")
            break
            
        try:
            observation = tool_to_use.invoke(tool_args)
            messages.append(ai_message)
            messages.append(ToolMessage(content=str(observation), tool_call_id=tool_id))
        except Exception as e:
            print(f"Tool Execution Error: {e}")
            break
        
    print("WARNING: Maxed out iterations or error occurred.")
    return {
        "flagged": False,
        "reason": "Max iterations reached or error during analysis",
        "confidence": 0.0,
        "threat_level": "Unknown",
        "action_recommended": "none"
    }
