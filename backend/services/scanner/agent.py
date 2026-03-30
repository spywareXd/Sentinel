# backend/services/scanner/agent.py

import os
import json
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

MAX_ITERATIONS = 10  
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
7. Return a JSON object with the following fields: 
   - flagged (boolean)
   - reason (string, 1-2 sentences)
   - confidence (float, 0.0 to 1.0)
   - threat_level ("None", "Low", "Medium", "High")
   - action_recommended ("none", "warning", "timeout", "ban")

GUIDELINES:
- **Toxicity**: Insults, aggression, hate speech, racism, sexism, homophobia, etc.
- **Threats**: Direct physical harm, intimidation, blackmail.
- **Self-Harm**: Encouraging someone to harm themselves.
"""

@traceable(name="Moderation Agent Loop")
def analyze_case(message_id: str, context_str: str) -> dict:
    """
    Step 3: Analyze the message and history
    """
    tools = [get_more_context]
    tools_dict = {t.name: t for t in tools}
    
    # Initialize the LLM
    llm = init_chat_model(f"google_genai:{MODEL}")
    llm_with_tools = llm.bind_tools(tools)
    
    query = f"Reference Message ID: {message_id}\n\n{context_str}\n\nAnalyze the case above and provide a verdict."
    
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=query)
    ]
    
    print(f"--- Starting Analysis for Case: {message_id} ---")
    
    for iteration in range(1, MAX_ITERATIONS + 1):
        print(f"--- Iteration: {iteration} ---")
        ai_message = llm_with_tools.invoke(messages)
        
        tool_calls = ai_message.tool_calls
        
        if not tool_calls:
            # Case resolved, final answer provided
            final_content = ai_message.content
            print(f"Final Decision Content: {final_content}")
            
            # If content is a list of parts (common in some Gemini versions), join them
            if isinstance(final_content, list):
                final_content = "".join([part.get("text", "") if isinstance(part, dict) else str(part) for part in final_content])
            
            # Clean up JSON from markdown if exists
            cleaned_response = final_content.strip()
            if "```json" in cleaned_response:
                cleaned_response = cleaned_response.split("```json")[-1].split("```")[0].strip()
            elif "```" in cleaned_response:
                cleaned_response = cleaned_response.split("```")[-1].split("```")[0].strip()
            
            try:
                # If there's extra text before/after the JSON block, try to find the {...}
                if not (cleaned_response.startswith("{") and cleaned_response.endswith("}")):
                    start = cleaned_response.find("{")
                    end = cleaned_response.rfind("}")
                    if start != -1 and end != -1:
                        cleaned_response = cleaned_response[start:end+1]
                
                return json.loads(cleaned_response)
            except Exception as e:
                print(f"Error parsing agent JSON: {e} | Raw: {cleaned_response}")
                return {
                    "flagged": False,
                    "reason": f"Parsing Error: {str(e)}",
                    "confidence": 0.0,
                    "threat_level": "Unknown",
                    "action_recommended": "none"
                }

        # Handle tool calls (force only one per iteration as requested)
        tool_call = tool_calls[0]
        tool_name = tool_call.get("name")
        tool_args = tool_call.get("args", {})
        tool_id = tool_call.get("id")
        
        print(f"Tool selected: {tool_name} with args: {tool_args}")
        tool_to_use = tools_dict.get(tool_name)
        
        if tool_to_use is None:
            raise ValueError(f"Error: Tool {tool_name} not found")
            
        observation = tool_to_use.invoke(tool_args)
        print(f"Tool Result received.")
        
        messages.append(ai_message)
        messages.append(ToolMessage(content=str(observation), tool_call_id=tool_id))
        
    print("WARNING: Maxed out iterations without final decision.")
    return {
        "flagged": False,
        "reason": "Max iterations reached without verdict",
        "confidence": 0.0,
        "threat_level": "Unknown",
        "action_recommended": "Manual verification"
    }
