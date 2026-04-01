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

# System prompt for the moderation agent
SYSTEM_PROMPT = """
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

JSON STRUCTURE:
{
  "flagged": true/false,
  "reason": "Detailed reason for flagging or 'Safe' if not flagged in 1-2 sentences",
  "confidence": 0.0 to 1.0,
  "threat_level": "None" | "Low" | "Medium" | "High",
  "action_recommended": "none" | "warning" | "timeout" | "ban"
}

GUIDELINES:
- **Toxicity**: Insults, aggression, hate speech, racism, sexism, homophobia, etc.
- **Threats**: Direct physical harm, intimidation, blackmail.
- **Self-Harm**: Encouraging someone to harm themselves.
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
