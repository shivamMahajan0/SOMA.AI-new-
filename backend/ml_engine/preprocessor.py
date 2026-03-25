"""
AutoML-X — Preprocessing Pipeline Builder
Automatically builds sklearn ColumnTransformer + Pipeline from dataset characteristics.
"""
import numpy as np
import pandas as pd
from typing import Tuple, List, Dict, Any
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder, OrdinalEncoder
from sklearn.impute import SimpleImputer


def build_pipeline(
    df: pd.DataFrame, target: str, task_type: str
) -> Tuple[Pipeline, pd.DataFrame, pd.Series, Dict[str, Any]]:
    """
    Build preprocessing pipeline from dataset.
    Returns (preprocessing_pipeline, X_transformed, y, metadata).
    """
    df_clean = df.copy()

    # Drop rows where target is missing
    df_clean = df_clean.dropna(subset=[target])

    y = df_clean[target].copy()
    X = df_clean.drop(columns=[target])

    # Encode target if classification
    label_encoder = None
    if task_type in ("binary", "multiclass"):
        if y.dtype == "object" or y.dtype.name == "category":
            label_encoder = LabelEncoder()
            y = pd.Series(label_encoder.fit_transform(y), index=y.index)

    # Identify column types
    numeric_cols = list(X.select_dtypes(include=[np.number]).columns)
    categorical_cols = list(X.select_dtypes(include=["object", "category", "bool"]).columns)

    # Drop high-cardinality categorical columns (>50 unique values)
    low_card_cat = [c for c in categorical_cols if X[c].nunique() <= 50]
    dropped_cols = [c for c in categorical_cols if X[c].nunique() > 50]

    # Build transformers
    transformers = []

    if numeric_cols:
        numeric_transformer = Pipeline(steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ])
        transformers.append(("num", numeric_transformer, numeric_cols))

    if low_card_cat:
        categorical_transformer = Pipeline(steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False, max_categories=20)),
        ])
        transformers.append(("cat", categorical_transformer, low_card_cat))

    if not transformers:
        raise ValueError("No valid features found for training.")

    preprocessor = ColumnTransformer(
        transformers=transformers,
        remainder="drop",
        verbose_feature_names_out=False,
    )

    # Build feature schema for prediction form
    feature_schema = {}
    for col in numeric_cols:
        feature_schema[col] = {
            "type": "numeric",
            "dtype": str(X[col].dtype),
            "min": round(float(X[col].min()), 4) if not X[col].isna().all() else 0,
            "max": round(float(X[col].max()), 4) if not X[col].isna().all() else 0,
            "mean": round(float(X[col].mean()), 4) if not X[col].isna().all() else 0,
        }
    for col in low_card_cat:
        feature_schema[col] = {
            "type": "categorical",
            "categories": X[col].dropna().unique().tolist()[:20],
        }

    metadata = {
        "numeric_columns": numeric_cols,
        "categorical_columns": low_card_cat,
        "dropped_columns": dropped_cols,
        "feature_schema": feature_schema,
        "label_encoder_classes": label_encoder.classes_.tolist() if label_encoder else None,
        "target_column": target,
        "task_type": task_type,
    }

    return preprocessor, X, y, metadata
