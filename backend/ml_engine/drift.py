"""
AutoML-X — Data Drift Detection
Compares training data distributions with new prediction data using KS-test.
"""
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from scipy.stats import ks_2samp


def detect_drift(
    train_df: pd.DataFrame,
    new_df: pd.DataFrame,
    numeric_features: List[str],
    significance_level: float = 0.05,
) -> Dict[str, Any]:
    """
    Detect data drift between training and new data using Kolmogorov-Smirnov test.
    """
    drift_results = {
        "features": {},
        "total_features_tested": 0,
        "drifted_features": 0,
        "drift_detected": False,
    }

    common_features = [f for f in numeric_features if f in train_df.columns and f in new_df.columns]
    drift_results["total_features_tested"] = len(common_features)

    for feature in common_features:
        train_vals = train_df[feature].dropna().values
        new_vals = new_df[feature].dropna().values

        if len(train_vals) < 5 or len(new_vals) < 5:
            drift_results["features"][feature] = {
                "status": "insufficient_data",
                "message": "Not enough data points for drift test",
            }
            continue

        statistic, p_value = ks_2samp(train_vals, new_vals)
        is_drifted = p_value < significance_level

        if is_drifted:
            drift_results["drifted_features"] += 1

        drift_results["features"][feature] = {
            "ks_statistic": round(float(statistic), 4),
            "p_value": round(float(p_value), 6),
            "is_drifted": is_drifted,
            "train_mean": round(float(np.mean(train_vals)), 4),
            "train_std": round(float(np.std(train_vals)), 4),
            "new_mean": round(float(np.mean(new_vals)), 4),
            "new_std": round(float(np.std(new_vals)), 4),
            "severity": _drift_severity(statistic),
        }

    drift_results["drift_detected"] = drift_results["drifted_features"] > 0
    drift_results["drift_percentage"] = (
        round(drift_results["drifted_features"] / max(len(common_features), 1) * 100, 1)
    )

    return drift_results


def _drift_severity(ks_stat: float) -> str:
    """Categorize drift severity based on KS statistic."""
    if ks_stat > 0.5:
        return "high"
    elif ks_stat > 0.2:
        return "medium"
    elif ks_stat > 0.1:
        return "low"
    return "none"
