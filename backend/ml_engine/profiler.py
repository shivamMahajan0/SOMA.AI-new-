"""
AutoML-X — Dataset Profiler
Analyzes dataset structure, distributions, missing values, correlations, outliers, and class balance.
"""
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional


def profile_dataset(df: pd.DataFrame, target: str) -> Dict[str, Any]:
    """
    Generate a comprehensive profile of the dataset.
    Returns a dict with all EDA insights.
    """
    profile = {
        "shape": {"rows": int(df.shape[0]), "columns": int(df.shape[1])},
        "columns": list(df.columns),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "numeric_columns": list(df.select_dtypes(include=[np.number]).columns),
        "categorical_columns": list(df.select_dtypes(include=["object", "category", "bool"]).columns),
    }

    # Missing values
    missing = df.isnull().sum()
    profile["missing_values"] = {
        col: {"count": int(missing[col]), "percentage": round(float(missing[col] / len(df) * 100), 2)}
        for col in df.columns if missing[col] > 0
    }
    profile["total_missing"] = int(missing.sum())

    # Basic statistics
    numeric_df = df.select_dtypes(include=[np.number])
    if not numeric_df.empty:
        stats = numeric_df.describe().round(3).to_dict()
        profile["statistics"] = {col: {k: float(v) for k, v in s.items()} for col, s in stats.items()}
    else:
        profile["statistics"] = {}

    # Correlations (numeric only)
    if len(numeric_df.columns) > 1:
        corr = numeric_df.corr().round(3)
        profile["correlations"] = {
            "matrix": corr.to_dict(),
            "labels": list(corr.columns),
        }
    else:
        profile["correlations"] = {"matrix": {}, "labels": []}

    # Feature distributions (top 20 numeric features)
    profile["distributions"] = {}
    for col in numeric_df.columns[:20]:
        vals = df[col].dropna()
        if len(vals) > 0:
            hist, bin_edges = np.histogram(vals, bins=min(30, len(vals.unique())))
            profile["distributions"][col] = {
                "counts": hist.tolist(),
                "bin_edges": [round(float(b), 4) for b in bin_edges],
                "mean": round(float(vals.mean()), 4),
                "median": round(float(vals.median()), 4),
                "std": round(float(vals.std()), 4),
            }

    # Skewness
    profile["skewness"] = {}
    for col in numeric_df.columns:
        try:
            skew_val = float(df[col].skew())
            profile["skewness"][col] = round(skew_val, 4)
        except Exception:
            pass

    # Outliers (IQR method)
    profile["outliers"] = {}
    for col in numeric_df.columns:
        q1 = float(df[col].quantile(0.25))
        q3 = float(df[col].quantile(0.75))
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        outlier_count = int(((df[col] < lower) | (df[col] > upper)).sum())
        if outlier_count > 0:
            profile["outliers"][col] = {
                "count": outlier_count,
                "percentage": round(outlier_count / len(df) * 100, 2),
                "lower_bound": round(lower, 4),
                "upper_bound": round(upper, 4),
            }

    # Categorical value counts
    profile["categorical_distributions"] = {}
    cat_cols = df.select_dtypes(include=["object", "category", "bool"]).columns
    for col in cat_cols[:15]:
        vc = df[col].value_counts().head(20)
        profile["categorical_distributions"][col] = {
            "values": vc.index.tolist(),
            "counts": vc.values.tolist(),
            "unique_count": int(df[col].nunique()),
        }

    # Target analysis
    profile["target"] = _analyze_target(df, target)

    return profile


def _analyze_target(df: pd.DataFrame, target: str) -> Dict[str, Any]:
    """Analyze the target column."""
    if target not in df.columns:
        return {"error": f"Target column '{target}' not found"}

    target_series = df[target].dropna()
    info: Dict[str, Any] = {"column": target, "dtype": str(df[target].dtype)}

    if df[target].dtype in [np.float64, np.float32, np.int64, np.int32, float, int]:
        unique_count = target_series.nunique()
        if unique_count <= 20:
            # Classification
            vc = target_series.value_counts()
            info["type"] = "binary" if unique_count == 2 else "multiclass"
            info["classes"] = vc.index.tolist()
            info["class_counts"] = vc.values.tolist()
            info["class_balance"] = {str(k): int(v) for k, v in vc.items()}
            majority = vc.max() / vc.sum()
            info["is_imbalanced"] = bool(majority > 0.8 or (vc.min() / vc.max()) < 0.2)
        else:
            info["type"] = "regression"
            info["mean"] = round(float(target_series.mean()), 4)
            info["std"] = round(float(target_series.std()), 4)
            info["min"] = round(float(target_series.min()), 4)
            info["max"] = round(float(target_series.max()), 4)
    elif df[target].dtype == "object" or df[target].dtype.name == "category":
        vc = target_series.value_counts()
        unique_count = target_series.nunique()
        info["type"] = "binary" if unique_count == 2 else "multiclass"
        info["classes"] = vc.index.tolist()
        info["class_counts"] = vc.values.tolist()
        info["class_balance"] = {str(k): int(v) for k, v in vc.items()}
        majority = vc.max() / vc.sum()
        info["is_imbalanced"] = bool(majority > 0.8 or (vc.min() / vc.max()) < 0.2)
    else:
        info["type"] = "unknown"

    return info


def detect_task_type(df: pd.DataFrame, target: str) -> str:
    """Auto-detect whether the task is binary, multiclass, or regression."""
    if target not in df.columns:
        return "unknown"

    target_series = df[target].dropna()
    unique_count = target_series.nunique()

    if df[target].dtype == "object" or df[target].dtype.name == "category":
        return "binary" if unique_count == 2 else "multiclass"

    if unique_count <= 20:
        return "binary" if unique_count == 2 else "multiclass"

    return "regression"
















































































