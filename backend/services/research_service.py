import httpx
import json
import logging
from typing import List, Dict, Any, Tuple
from bs4 import BeautifulSoup

from backend.config import settings
from backend.services.llm_service import chat_with_copilot
from backend.services.content_loader import process_input

logger = logging.getLogger(__name__)

async def generate_search_queries(topic: str) -> List[str]:
    """Use Copilot to break down a topic into 3 specific search queries."""
    prompt = f"Given the research topic: '{topic}', generate exactly 3 specific search queries to gather comprehensive information. Return a JSON array of strings and nothing else."
    
    try:
        response = await chat_with_copilot(prompt, {}, [])
        # Extract JSON array from response
        import re
        match = re.search(r'\[.*\]', response, re.DOTALL)
        if match:
            queries = json.loads(match.group(0))
            return queries[:3]
        return [topic]
    except Exception as e:
        logger.error(f"Failed to generate queries: {e}")
        return [topic]

async def execute_tavily_search(queries: List[str]) -> List[Dict[str, Any]]:
    """Execute Tavily search for the given queries."""
    if not settings.TAVILY_API_KEY:
        logger.warning("Tavily API key not found. Skipping web search.")
        return []

    results = []
    seen_urls = set()

    async with httpx.AsyncClient(timeout=30.0) as client:
        for q in queries:
            try:
                response = await client.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key": settings.TAVILY_API_KEY,
                        "query": q,
                        "search_depth": "basic",
                        "include_answer": False,
                        "max_results": 2
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                for item in data.get("results", []):
                    if item["url"] not in seen_urls:
                        seen_urls.add(item["url"])
                        results.append({
                            "url": item["url"],
                            "title": item["title"],
                            "content_snippet": item.get("content", "")
                        })
            except Exception as e:
                logger.error(f"Tavily search failed for '{q}': {e}")
                
    return results

async def compile_research_report(topic: str, aggregated_content: str) -> Dict[str, Any]:
    """Generate final research report and summaries."""
    # Chunk content if it's too large (openrouter has ~128k context but good to limit)
    safe_content = aggregated_content[:40000] 
    
    prompt = f"""
You are an AI Research Analyst. Your task is to generate a professional, detailed Final Research Report based on the provided research content collected from multiple sources such as websites, documents, PDFs, and videos.

Generate a comprehensive research report with clear structure, analysis, and insights. The report should not be a simple summary. It should look like a professional research or analyst report.

Given the following accumulated research content for the topic "{topic}", generate a comprehensive research output in JSON format.
Ensure the response is ONLY a valid JSON object matching the requested schema.

Schema required:
{{
  "short_summary": "A 2-3 sentence overview.",
  "key_points": ["point 1", "point 2", "point 3"],
  "notes": "Extracted important notes and entities.",
  "final_report": "The markdown generated report."
}}

For the `final_report` field, follow this structure strictly:

1. Title
2. Abstract (short overview of the entire report)
3. Introduction
4. Background and Historical Context
5. Key Concepts and Definitions
6. Research Methodology (how the research/content was collected)
7. Timeline or Major Events (if applicable)
8. Key Findings
9. Detailed Analysis and Discussion
10. Applications / Real-World Use Cases
11. Advantages and Benefits
12. Limitations / Challenges
13. Comparative Analysis (compare with similar concepts/events/technologies if relevant)
14. Future Scope / Future Trends
15. Key Insights / Summary Points
16. Conclusion
17. References / Sources

Report Writing Guidelines:
* Use clear headings and subheadings.
* Write in professional research report style.
* Avoid repeating the same information.
* Use bullet points and tables where useful.
* Make the report detailed, analytical, and informative.
* Include examples where possible.
* The report should feel like a professional research paper or industry report.

RESEARCH CONTENT:
{safe_content}
"""

    try:
         # Use the explicit instruction to avoid boilerplate
         response = await chat_with_copilot(prompt, {}, [])
         import re
         match = re.search(r'\{.*\}', response, re.DOTALL)
         if match:
             return json.loads(match.group(0))
         else:
             return {"final_report": "Could not parse JSON report format.", "key_points": [], "short_summary": "", "notes": ""}
    except Exception as e:
         logger.error(f"Report generation failed: {e}")
         return {
             "final_report": f"Failed to generate report due to an error: {e}",
             "short_summary": "Error generating summary.",
             "key_points": [],
             "notes": ""
         }
