"""
AutoML-X — Business Report AI Route (MongoDB Version)
Generates AI-powered business insights and recommendations.
"""
from fastapi import APIRouter, Depends, HTTPException

from backend.database import get_db
from backend.services.llm_service import chat_with_copilot

router = APIRouter(prefix="/api/projects", tags=["Business Report"])


@router.get("/{project_id}/business-report")
async def get_business_report(project_id: int, db=Depends(get_db)):
    """Generate a business-focused report with AI insights."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    profile = project.get("profile_data", {})
    results = project.get("results_data", {})
    evaluations = results.get("evaluations", [])

    # Build dataset overview
    shape = profile.get("shape", {})
    missing = profile.get("missing_values", {})

    dataset_overview = {
        "rows": shape.get("rows", project.get("num_rows")),
        "columns": shape.get("columns", project.get("num_features")),
        "target": project.get("target_column"),
        "task_type": project.get("task_type"),
        "missing_count": len(missing),
        "missing_columns": list(missing.keys())[:10],
        "feature_types": profile.get("dtypes", {}),
    }

    # Build model performance
    model_performance = {
        "models": [],
        "best_model": project.get("best_model_name"),
        "best_score": project.get("best_model_score"),
    }
    for ev in evaluations:
        m = ev.get("metrics", {})
        model_performance["models"].append({
            "name": ev.get("name"),
            "accuracy": m.get("accuracy"),
            "f1": m.get("f1"),
            "r2": m.get("r2"),
            "rmse": m.get("rmse"),
        })

    ai_analysis = profile.get("ai_analysis", "")

    # Build data insights from profile
    correlations = profile.get("correlations", {})
    target_col = project.get("target_column")
    top_correlations = []
    if correlations.get("matrix") and target_col and target_col in correlations["matrix"]:
        target_corr = correlations["matrix"][target_col]
        entries = sorted(
            [(k, v) for k, v in target_corr.items() if k != target_col],
            key=lambda x: abs(x[1]),
            reverse=True,
        )[:5]
        top_correlations = [{"feature": k, "correlation": round(v, 4)} for k, v in entries]

    class_balance = profile.get("target", {}).get("class_balance", {})
    is_imbalanced = profile.get("target", {}).get("is_imbalanced", False)

    data_insights = {
        "top_correlations": top_correlations,
        "class_balance": class_balance,
        "is_imbalanced": is_imbalanced,
    }

    # Generate AI business insights and recommendations
    business_insights = ""
    recommendations = ""

    context = {
        "profile": profile,
        "results": results,
        "feature_importance": results.get("feature_importance", {}),
    }

    try:
        business_prompt = (
            f"Based on this ML project analysis:\n"
            f"- Dataset: {project['filename']} with {dataset_overview['rows']} rows, {dataset_overview['columns']} columns\n"
            f"- Target: {project.get('target_column')} ({project.get('task_type')})\n"
            f"- Best model: {project.get('best_model_name')} (score: {project.get('best_model_score')})\n"
            f"- Top features: {', '.join([c['feature'] for c in top_correlations[:3]])}\n\n"
            f"Write 3-4 lines of BUSINESS INSIGHTS explaining what the model results mean for business decision-making. "
            f"Focus on practical business value, not technical metrics. Be specific to this dataset."
        )
        business_insights = await chat_with_copilot(business_prompt, context, [])
    except Exception:
        business_insights = "Business insights could not be generated. Please ensure your OpenRouter API key is configured."

    try:
        rec_prompt = (
            f"Based on this ML project analysis:\n"
            f"- Dataset: {project['filename']}, Target: {project.get('target_column')} ({project.get('task_type')})\n"
            f"- Best model: {project.get('best_model_name')} (score: {project.get('best_model_score')})\n"
            f"- Top important features: {', '.join([c['feature'] for c in top_correlations[:5]])}\n\n"
            f"Provide exactly 4-5 specific, actionable RECOMMENDATIONS as bullet points. "
            f"Each recommendation should be one concise sentence. "
            f"Focus on what business actions to take based on these findings."
        )
        recommendations = await chat_with_copilot(rec_prompt, context, [])
    except Exception:
        recommendations = "Recommendations could not be generated. Please ensure your OpenRouter API key is configured."

    return {
        "dataset_overview": dataset_overview,
        "ai_analysis": ai_analysis,
        "data_insights": data_insights,
        "model_performance": model_performance,
        "business_insights": business_insights,
        "recommendations": recommendations,
    }
