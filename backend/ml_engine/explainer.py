"""
AutoML-X — Model Explainability Engine (Optimized)
SHAP-based global/local explanations and feature importance.
Skips KernelExplainer for non-tree models to avoid 10+ minute computation.
"""
import numpy as np
import warnings
from typing import Dict, Any, List, Optional

warnings.filterwarnings("ignore")


def explain_model(
    pipeline, X, feature_names: List[str], task_type: str, max_samples: int = 100
) -> Dict[str, Any]:
    """
    Generate SHAP explanations and feature importance for the best model.
    Optimized: skips KernelExplainer (O(n²)) for non-tree models.
    """
    results: Dict[str, Any] = {}

    model = pipeline.named_steps.get("model")
    preprocessor = pipeline.named_steps.get("preprocessor")

    if model is None or preprocessor is None:
        return {"error": "Pipeline structure not recognized"}

    try:
        # Transform X using preprocessor
        X_transformed = preprocessor.transform(X)

        # Get transformed feature names
        try:
            transformed_names = preprocessor.get_feature_names_out().tolist()
        except Exception:
            transformed_names = [f"feature_{i}" for i in range(X_transformed.shape[1])]

        # Subsample for performance
        if X_transformed.shape[0] > max_samples:
            indices = np.random.choice(X_transformed.shape[0], max_samples, replace=False)
            X_sample = X_transformed[indices]
        else:
            X_sample = X_transformed

        # Feature importance from tree-based models
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
            importance_dict = {
                name: round(float(imp), 6)
                for name, imp in zip(transformed_names, importances)
            }
            sorted_importance = sorted(importance_dict.items(), key=lambda x: x[1], reverse=True)
            results["feature_importance"] = {
                "names": [x[0] for x in sorted_importance[:20]],
                "values": [x[1] for x in sorted_importance[:20]],
            }
        elif hasattr(model, "coef_"):
            coefs = np.abs(model.coef_).flatten() if model.coef_.ndim > 1 else np.abs(model.coef_)
            if len(coefs) == len(transformed_names):
                importance_dict = {
                    name: round(float(c), 6)
                    for name, c in zip(transformed_names, coefs)
                }
                sorted_importance = sorted(importance_dict.items(), key=lambda x: x[1], reverse=True)
                results["feature_importance"] = {
                    "names": [x[0] for x in sorted_importance[:20]],
                    "values": [x[1] for x in sorted_importance[:20]],
                }

        # SHAP values — only for tree-based models (fast TreeExplainer)
        # KernelExplainer is O(n²) and can take 10+ minutes — skip it entirely
        try:
            model_type = type(model).__name__.lower()
            tree_models = ["randomforest", "gradientboosting", "xgb", "lgbm", "decisiontree"]
            is_tree = any(t in model_type for t in tree_models)

            if is_tree:
                import shap
                explainer = shap.TreeExplainer(model)
                shap_values = explainer.shap_values(X_sample)

                # Handle multi-class SHAP values
                if isinstance(shap_values, list):
                    shap_array = np.abs(np.array(shap_values)).mean(axis=0)
                else:
                    shap_array = np.abs(shap_values)

                # Global SHAP importance
                global_shap = shap_array.mean(axis=0)
                if len(global_shap) == len(transformed_names):
                    shap_importance = {
                        name: round(float(val), 6)
                        for name, val in zip(transformed_names, global_shap)
                    }
                    sorted_shap = sorted(shap_importance.items(), key=lambda x: x[1], reverse=True)
                    results["shap_global"] = {
                        "names": [x[0] for x in sorted_shap[:20]],
                        "values": [x[1] for x in sorted_shap[:20]],
                    }

                    # Store raw SHAP values summary for copilot context
                    results["shap_summary"] = {
                        "top_features": [x[0] for x in sorted_shap[:10]],
                        "computed": True,
                    }
            else:
                # For non-tree models, use coefficient-based importance only (already computed above)
                results["shap_summary"] = {
                    "computed": False,
                    "reason": "SHAP TreeExplainer not available for non-tree models. Using coefficient-based importance instead.",
                }

        except Exception as shap_err:
            results["shap_error"] = str(shap_err)
            results["shap_summary"] = {"computed": False, "error": str(shap_err)}

    except Exception as e:
        results["error"] = str(e)

    return results


def explain_prediction(
    pipeline, input_data: np.ndarray, feature_names: List[str], X_background: np.ndarray, max_bg: int = 50
) -> Dict[str, Any]:
    """
    Generate SHAP local explanation for a single prediction.
    Only uses TreeExplainer for tree-based models.
    """
    model = pipeline.named_steps.get("model")
    preprocessor = pipeline.named_steps.get("preprocessor")

    if model is None or preprocessor is None:
        return {"error": "Pipeline not recognized"}

    try:
        X_input = preprocessor.transform(input_data)

        try:
            transformed_names = preprocessor.get_feature_names_out().tolist()
        except Exception:
            transformed_names = [f"feature_{i}" for i in range(X_input.shape[1])]

        model_type = type(model).__name__.lower()
        tree_models = ["randomforest", "gradientboosting", "xgb", "lgbm", "decisiontree"]
        is_tree = any(t in model_type for t in tree_models)

        if not is_tree:
            return {"shap_local_error": "SHAP local explanation only available for tree-based models."}

        import shap
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_input)

        # Handle multi-class
        if isinstance(shap_values, list):
            sv = shap_values[0] if len(shap_values) > 0 else shap_values
        else:
            sv = shap_values

        if sv.ndim > 1:
            sv = sv[0]

        local_explanation = {
            name: round(float(val), 6)
            for name, val in zip(transformed_names, sv)
        }
        sorted_exp = sorted(local_explanation.items(), key=lambda x: abs(x[1]), reverse=True)

        return {
            "shap_local": {
                "names": [x[0] for x in sorted_exp[:15]],
                "values": [x[1] for x in sorted_exp[:15]],
            }
        }

    except Exception as e:
        return {"shap_local_error": str(e)}
