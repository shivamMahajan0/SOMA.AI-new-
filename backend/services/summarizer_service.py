import os
import json
import requests
from backend.config import settings

# This uses the same OpenAI configuration/OpenRouter config that the rest of the application uses.
# We will construct a specific JSON prompt for restructuring.

def summarize_content(text: str) -> dict:
    """
    Sends the extracted text to the LLM and demands a structured JSON summary output.
    """
    # Truncate text if it's too long to fit into context windows.
    # 1 token ~= 4 chars roughly. If we restrict to ~100k chars we should be safe for most modern models.
    max_chars = 100000 
    if len(text) > max_chars:
        text = text[:max_chars]

    prompt = f"""
You are an expert content analyzer and summarizer. Please analyze the following content and provide a highly structured summary.

Return YOUR ENTIRE RESPONSE as a valid JSON object matching this exact structure, with no markdown formatting outside the JSON, and no code blocks. Just the raw JSON.

{{
    "overview": "A 2-3 sentence high-level overview of what the content is about.",
    "detailed_summary": "A 1-2 paragraph detailed summary covering the main points.",
    "key_points": [
        "Key point 1",
        "Key point 2",
        "Key point 3"
    ],
    "important_concepts": [
        "Concept 1",
        "Concept 2"
    ],
    "action_items": [
        "Action item or key insight 1",
        "Action item or insight 2"
    ],
    "short_summary": "A one-sentence TL;DR of the content."
}}

CONTENT:
{text}
"""
    
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": settings.OPENROUTER_MODEL,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"}
    }
    
    try:
        response = requests.post(f"{settings.OPENROUTER_BASE_URL}/chat/completions", headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()
        result_text = data["choices"][0]["message"]["content"]
        
        # In case the model responds with Markdown formatting around the JSON
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
            
        return json.loads(result_text.strip())
        
    except Exception as e:
        print(f"Error calling LLM: {e}")
        # Return a fallback structure
        return {
            "overview": "Failed to generate summary.",
            "detailed_summary": f"An error occurred while communicating with the AI service: {str(e)}",
            "key_points": [],
            "important_concepts": [],
            "action_items": [],
            "short_summary": "Error generating summary."
        }
