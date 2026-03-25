"""
AutoML-X — Training Pipeline Route (MongoDB Version)
Orchestrates the full ML pipeline: profile → preprocess → train → evaluate → explain → save.
Supports both AutoML (default) and Custom Training Mode.
"""
import os
import json
import joblib
import httpx
import pandas as pd
import numpy as np
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from backend.database import get_db, get_next_id
from backend.mongo_db import get_db as get_mongo_db
from backend.config import settings
from backend.ml_engine.profiler import profile_dataset
from backend.ml_engine.preprocessor import build_pipeline
from backend.ml_engine.trainer import train_all_models, train_single_model
from backend.ml_engine.evaluator import evaluate_models
from backend.ml_engine.explainer import explain_model
from backend.ml_engine.codegen import generate_code

router = APIRouter(prefix="/api/projects", tags=["Training"])


class TrainRequest(BaseModel):
    custom_mode: bool = False
    model_name: Optional[str] = None
    features: Optional[List[str]] = None
    hyperparameters: Optional[Dict[str, Any]] = None


def _run_training(project_id: int, train_config: Optional[Dict] = None):
    """Background task: runs the full ML pipeline."""
    db = get_mongo_db()

    try:
        project = db.projects.find_one({"id": project_id})
        if not project:
            return

        db.projects.update_one({"id": project_id}, {"$set": {"status": "profiling"}})

        file_path = os.path.join(settings.UPLOAD_DIR, str(project_id), project["filename"])
        df = pd.read_csv(file_path)
        target = project["target_column"]
        task_type = project["task_type"]

        # Determine features to use
        custom_mode = train_config and train_config.get("custom_mode", False)
        selected_features = None
        if custom_mode and train_config.get("features"):
            selected_features = train_config["features"]
            # Filter dataframe to only include selected features + target
            cols_to_use = [c for c in selected_features if c in df.columns]
            if target not in cols_to_use:
                cols_to_use.append(target)
            df = df[cols_to_use]

        # 1. Profile dataset
        profile = profile_dataset(df, target)
        db.projects.update_one(
            {"id": project_id},
            {"$set": {"profile_data": profile}}
        )

        # 1b. Generate AI dataset analysis
        try:
            col_info = ", ".join(df.columns[:15].tolist())
            sample_desc = f"Dataset: {project['filename']}, {len(df)} rows, {len(df.columns)} columns. Columns: {col_info}. Target: {target} ({task_type})."
            ai_prompt = (
                f"In exactly 3-4 lines, explain what this dataset represents and what key patterns might exist. "
                f"Be specific and insightful. Dataset info: {sample_desc}"
            )
            if settings.OPENROUTER_API_KEY:
                resp = httpx.post(
                    f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.OPENROUTER_MODEL,
                        "messages": [{"role": "user", "content": ai_prompt}],
                        "temperature": 0.7,
                        "max_tokens": 300,
                    },
                    timeout=30.0,
                )
                if resp.status_code == 200:
                    ai_text = resp.json()["choices"][0]["message"]["content"]
                    profile["ai_analysis"] = ai_text
                    db.projects.update_one(
                        {"id": project_id},
                        {"$set": {"profile_data": profile}}
                    )
        except Exception:
            pass  # AI analysis is non-critical

        # 2. Preprocess
        db.projects.update_one({"id": project_id}, {"$set": {"status": "preprocessing"}})
        preprocessor, X, y, metadata = build_pipeline(df, target, task_type)

        # Store feature schema
        db.projects.update_one(
            {"id": project_id},
            {"$set": {"feature_schema": metadata["feature_schema"]}}
        )

        # 3. Train models
        db.projects.update_one({"id": project_id}, {"$set": {"status": "training"}})

        if custom_mode and train_config.get("model_name"):
            # Custom Training Mode — train only the selected model
            trained_models = train_single_model(
                preprocessor, X, y, task_type,
                model_name=train_config["model_name"],
                hyperparameters=train_config.get("hyperparameters", {}),
                cv_folds=settings.CV_FOLDS,
            )
        else:
            # AutoML Mode — train all models
            trained_models = train_all_models(
                preprocessor, X, y, task_type,
                cv_folds=settings.CV_FOLDS,
                tuning_iters=settings.TUNING_ITERATIONS,
            )

        # 4. Evaluate
        db.projects.update_one({"id": project_id}, {"$set": {"status": "evaluating"}})
        eval_results = evaluate_models(trained_models, X, y, task_type, cv_folds=settings.CV_FOLDS)

        # 5. Get best model & explain
        db.projects.update_one({"id": project_id}, {"$set": {"status": "explaining"}})
        best_pipeline = eval_results.get("best_pipeline")
        explanation = {}
        if best_pipeline:
            explanation = explain_model(best_pipeline, X, list(X.columns), task_type)

        # 6. Save best model
        output_dir = os.path.join(settings.OUTPUT_DIR, str(project_id))
        os.makedirs(output_dir, exist_ok=True)

        if best_pipeline:
            model_path = os.path.join(output_dir, "best_model.pkl")
            joblib.dump(best_pipeline, model_path)

        # Save cleaned dataset
        clean_path = os.path.join(output_dir, "cleaned_dataset.csv")
        df.dropna(subset=[target]).to_csv(clean_path, index=False)

        # 7. Generate code
        code_meta = {
            "target_column": target,
            "task_type": task_type,
            "best_model_name": eval_results.get("best_model_name", ""),
            "best_params": {},
            "numeric_columns": metadata.get("numeric_columns", []),
            "categorical_columns": metadata.get("categorical_columns", []),
            "filename": project["filename"],
        }
        if eval_results.get("best_model_index") is not None:
            best_train = trained_models[eval_results["best_model_index"]]
            code_meta["best_params"] = best_train.get("best_params", {})

        generated_code = generate_code(code_meta)

        # Save code file
        code_path = os.path.join(output_dir, "pipeline_code.py")
        with open(code_path, "w") as f:
            f.write(generated_code)

        # 8. Compile results
        serializable_evals = []
        for ev in eval_results.get("evaluations", []):
            serializable_evals.append({
                "name": ev.get("name"),
                "metrics": ev.get("metrics", {}),
                "error": ev.get("error"),
            })

        full_results = {
            "evaluations": serializable_evals,
            "best_model_name": eval_results.get("best_model_name"),
            "best_model_index": eval_results.get("best_model_index"),
            "feature_importance": explanation.get("feature_importance", {}),
            "shap_global": explanation.get("shap_global", {}),
            "shap_summary": explanation.get("shap_summary", {}),
        }

        # If custom mode, tag it in results
        if custom_mode:
            full_results["training_mode"] = "custom"
            full_results["custom_config"] = {
                "model_name": train_config.get("model_name"),
                "features": train_config.get("features"),
                "hyperparameters": train_config.get("hyperparameters"),
            }
        else:
            full_results["training_mode"] = "auto"

        # Compute best score
        best_score = None
        if eval_results.get("best_model_index") is not None and serializable_evals:
            best_ev = serializable_evals[eval_results["best_model_index"]]
            best_m = best_ev.get("metrics", {})
            best_score = best_m.get("f1") or best_m.get("r2") or best_m.get("accuracy")

        # 9. Create model version
        existing_versions = db.model_versions.count_documents({"project_id": project_id})
        version_doc = {
            "id": get_next_id("model_versions"),
            "project_id": project_id,
            "version": existing_versions + 1,
            "model_name": eval_results.get("best_model_name", "unknown"),
            "is_best": True,
            "metrics": full_results,
            "created_at": datetime.utcnow(),
        }
        # Mark previous best as not best
        db.model_versions.update_many(
            {"project_id": project_id, "is_best": True},
            {"$set": {"is_best": False}}
        )
        db.model_versions.insert_one(version_doc)

        # Update project
        db.projects.update_one(
            {"id": project_id},
            {"$set": {
                "status": "completed",
                "results_data": full_results,
                "best_model_name": eval_results.get("best_model_name"),
                "best_model_score": best_score,
                "code_generated": generated_code,
                "training_config": train_config,
                "updated_at": datetime.utcnow(),
            }}
        )

    except Exception as e:
        db.projects.update_one(
            {"id": project_id},
            {"$set": {
                "status": "failed",
                "results_data": {"error": str(e)},
                "updated_at": datetime.utcnow(),
            }}
        )
        import traceback
        traceback.print_exc()


@router.post("/{project_id}/train")
async def start_training(
    project_id: int,
    background_tasks: BackgroundTasks,
    train_request: TrainRequest = None,
    db=Depends(get_db),
):
    """Start the full ML training pipeline as a background task."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    if not project.get("target_column"):
        raise HTTPException(400, "Target column not set. Update target first.")

    if project.get("status") in ("training", "profiling", "preprocessing", "evaluating", "explaining"):
        raise HTTPException(409, "Training already in progress")

    db.projects.update_one(
        {"id": project_id},
        {"$set": {"status": "profiling", "updated_at": datetime.utcnow()}}
    )

    # Build training config
    train_config = None
    if train_request and train_request.custom_mode:
        train_config = {
            "custom_mode": True,
            "model_name": train_request.model_name,
            "features": train_request.features,
            "hyperparameters": train_request.hyperparameters or {},
        }

    background_tasks.add_task(_run_training, project_id, train_config)

    return {
        "message": "Training started",
        "status": "profiling",
        "mode": "custom" if train_config else "auto",
    }


@router.get("/{project_id}/results")
def get_results(project_id: int, db=Depends(get_db)):
    """Get training results."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    return {
        "status": project.get("status"),
        "profile": project.get("profile_data", {}),
        "results": project.get("results_data", {}),
        "best_model_name": project.get("best_model_name"),
        "best_model_score": project.get("best_model_score"),
    }


@router.get("/{project_id}/status")
def get_status(project_id: int, db=Depends(get_db)):
    """Get current training status."""
    project = db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")
    return {"status": project.get("status")}
