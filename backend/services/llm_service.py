"""
AutoML-X — LLM Service (OpenRouter Integration)
AI Copilot that provides intelligent analysis of ML results.
"""
import httpx
from typing import Dict, Any, List, Optional
from backend.config import settings


SYSTEM_PROMPT = """You are AutoML-X AI Copilot — an expert ML analyst assistant embedded in an automated machine learning platform.

You have access to the user's project context including:
- Dataset metadata (shape, columns, types, missing values)
- Model training results (metrics, comparisons)
- Feature importance and SHAP explanations
- Data drift detection results

Your role:
1. Explain ML results in clear, actionable language
2. Suggest improvements to model performance
3. Interpret feature importance and SHAP values
4. Answer questions about metrics, models, and datasets
5. Provide data science best practices

Rules:
- Be concise and professional
- Use specific numbers from the context when available
- Do NOT generate code unless explicitly asked
- Do NOT claim to train models — you are an analytical assistant only
- Format responses with markdown for readability
"""


async def chat_with_copilot(
    user_message: str,
    project_context: Dict[str, Any],
    chat_history: List[Dict[str, str]],
) -> str:
    """
    Send a message to the LLM copilot with project context.
    """
    if not settings.OPENROUTER_API_KEY:
        return "⚠️ **OpenRouter API key not configured.** Please add your `OPENROUTER_API_KEY` to the `.env` file to enable AI Copilot."

    # Build context summary
    context_parts = ["## Project Context\n"]

    if "profile" in project_context:
        profile = project_context["profile"]
        context_parts.append(f"**Dataset**: {profile.get('shape', {}).get('rows', '?')} rows × {profile.get('shape', {}).get('columns', '?')} columns")
        if profile.get("missing_values"):
            context_parts.append(f"**Missing Values**: {len(profile['missing_values'])} columns with missing data")
        if profile.get("target"):
            target = profile["target"]
            context_parts.append(f"**Task Type**: {target.get('type', 'unknown')}")
            if target.get("is_imbalanced"):
                context_parts.append("⚠️ **Class imbalance detected**")

    if "results" in project_context:
        results = project_context["results"]
        if results.get("best_model_name"):
            context_parts.append(f"\n**Best Model**: {results['best_model_name']}")
        if results.get("evaluations"):
            context_parts.append("\n**Model Comparison**:")
            for ev in results["evaluations"][:8]:
                name = ev.get("name", "?")
                metrics = ev.get("metrics", {})
                score = metrics.get("f1") or metrics.get("r2") or metrics.get("accuracy", "N/A")
                context_parts.append(f"  - {name}: {score}")

    if "feature_importance" in project_context:
        fi = project_context["feature_importance"]
        if fi.get("names"):
            top5 = list(zip(fi["names"][:5], fi["values"][:5]))
            context_parts.append("\n**Top Features**: " + ", ".join(f"{n} ({v:.4f})" for n, v in top5))

    if "drift" in project_context:
        drift = project_context["drift"]
        if drift.get("drift_detected"):
            context_parts.append(f"\n⚠️ **Data Drift Detected** in {drift.get('drifted_features', 0)} features ({drift.get('drift_percentage', 0)}%)")

    context_str = "\n".join(context_parts)

    # Build messages
    messages = [{"role": "system", "content": SYSTEM_PROMPT + "\n\n" + context_str}]

    # Add chat history (last 10 messages)
    for msg in chat_history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": user_message})

    # Call OpenRouter API
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://automlx.app",
                    "X-Title": "AutoML-X Copilot",
                },
                json={
                    "model": settings.OPENROUTER_MODEL,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 1500,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    except httpx.HTTPStatusError as e:
        return f"⚠️ **API Error**: {e.response.status_code} — {e.response.text[:200]}"
    except Exception as e:
        return f"⚠️ **Connection Error**: {str(e)}"
