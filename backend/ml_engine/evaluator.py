"""
AutoML-X — Model Evaluator & Selector (Optimized)
Computes detailed metrics using already-fitted pipelines — no redundant CV passes.
"""
import numpy as np
from typing import List, Dict, Any, Optional
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score,
    confusion_matrix, roc_curve, auc, classification_report,
    mean_squared_error, mean_absolute_error, r2_score,
    precision_recall_curve,
)


def evaluate_models(
    trained_models: List[Dict[str, Any]],
    X: np.ndarray,
    y: np.ndarray,
    task_type: str,
    cv_folds: int = 3,
) -> Dict[str, Any]:
    """
    Evaluate all trained models with detailed metrics.
    Uses already-fitted pipelines from trainer — no redundant cross-validation.
    """
    evaluations = []

    # Use a held-out split for evaluation metrics (pipelines are already fitted on full data by RandomizedSearchCV)
    # Re-fit on train split so we can get honest test metrics
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y if task_type != "regression" else None
    )

    for model_result in trained_models:
        if model_result.get("pipeline") is None:
            evaluations.append({
                "name": model_result["name"],
                "error": model_result.get("error", "Training failed"),
                "metrics": {},
            })
            continue

        pipeline = model_result["pipeline"]

        try:
            # Fit on train split for honest evaluation
            pipeline.fit(X_train, y_train)
            y_pred = pipeline.predict(X_test)

            if task_type == "regression":
                metrics = _regression_metrics(y_test, y_pred)
            else:
                metrics = _classification_metrics(y_test, y_pred, task_type, pipeline, X_test)

            # Add CV stats from training (from RandomizedSearchCV)
            metrics["cv_mean"] = model_result.get("cv_mean", 0)
            metrics["cv_std"] = model_result.get("cv_std", 0)
            metrics["cv_scores"] = model_result.get("cv_scores", [])
            metrics["best_params"] = model_result.get("best_params", {})
            metrics["train_time"] = model_result.get("train_time_seconds", 0)

            evaluations.append({
                "name": model_result["name"],
                "metrics": metrics,
            })

        except Exception as e:
            evaluations.append({
                "name": model_result["name"],
                "error": str(e),
                "metrics": {},
            })

    # Select best model
    best_idx = _select_best(evaluations, task_type)
    best_model = trained_models[best_idx] if best_idx is not None else None

    # Re-fit the best model on full data for deployment
    if best_model and best_model.get("pipeline"):
        best_model["pipeline"].fit(X, y)

    return {
        "evaluations": evaluations,
        "best_model_index": best_idx,
        "best_model_name": evaluations[best_idx]["name"] if best_idx is not None else None,
        "best_pipeline": best_model["pipeline"] if best_model else None,
    }


def _classification_metrics(y_true, y_pred, task_type, pipeline, X_test) -> Dict:
    """Compute classification metrics using fitted pipeline predictions directly."""
    avg = "binary" if task_type == "binary" else "weighted"
    metrics = {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "f1": round(float(f1_score(y_true, y_pred, average=avg, zero_division=0)), 4),
        "precision": round(float(precision_score(y_true, y_pred, average=avg, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, y_pred, average=avg, zero_division=0)), 4),
    }

    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred)
    metrics["confusion_matrix"] = cm.tolist()
    metrics["class_labels"] = sorted(list(set(y_true)))

    # ROC curve — use fitted pipeline directly, no extra CV pass
    try:
        if task_type == "binary" and hasattr(pipeline, "predict_proba"):
            y_proba = pipeline.predict_proba(X_test)
            fpr, tpr, _ = roc_curve(y_true, y_proba[:, 1])
            metrics["roc"] = {
                "fpr": [round(float(x), 4) for x in fpr[::max(1, len(fpr)//100)]],
                "tpr": [round(float(x), 4) for x in tpr[::max(1, len(tpr)//100)]],
                "auc": round(float(auc(fpr, tpr)), 4),
            }
            # Precision-Recall curve
            prec, rec, _ = precision_recall_curve(y_true, y_proba[:, 1])
            metrics["pr_curve"] = {
                "precision": [round(float(x), 4) for x in prec[::max(1, len(prec)//100)]],
                "recall": [round(float(x), 4) for x in rec[::max(1, len(rec)//100)]],
            }
    except Exception:
        pass

    return metrics


def _regression_metrics(y_true, y_pred) -> Dict:
    """Compute regression metrics."""
    return {
        "r2": round(float(r2_score(y_true, y_pred)), 4),
        "rmse": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 4),
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 4),
        "mse": round(float(mean_squared_error(y_true, y_pred)), 4),
    }


def _select_best(evaluations: List[Dict], task_type: str) -> Optional[int]:
    """Select the best model based on primary metric."""
    primary_metric = "r2" if task_type == "regression" else "f1"
    best_score = -float("inf")
    best_idx = None

    for i, ev in enumerate(evaluations):
        score = ev.get("metrics", {}).get(primary_metric, -float("inf"))
        if isinstance(score, (int, float)) and score > best_score:
            best_score = score
            best_idx = i

    return best_idx
