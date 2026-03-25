"""
AutoML-X — Reproducible Code Generator
Generates a standalone Python script that reproduces the entire ML pipeline.
"""
from typing import Dict, Any


def generate_code(metadata: Dict[str, Any]) -> str:
    """
    Generate a full, reproducible Python script for the ML pipeline.

    """
    target = metadata.get("target_column", "target")
    task_type = metadata.get("task_type", "classification")
    best_model = metadata.get("best_model_name", "Random Forest")
    best_params = metadata.get("best_params", {})
    numeric_cols = metadata.get("numeric_columns", [])
    categorical_cols = metadata.get("categorical_columns", [])
    filename = metadata.get("filename", "dataset.csv")

    params_str = ", ".join(f"{k}={repr(v)}" for k, v in best_params.items())
    model_import, model_class = _get_model_import(best_model, task_type)

    code = f'''"""
AutoML-X — Reproducible Training Pipeline
Generated automatically by AutoML-X
=========================================
Dataset: {filename}
Target: {target}
Task Type: {task_type}
Best Model: {best_model}
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score, f1_score, classification_report,
    mean_squared_error, r2_score, mean_absolute_error
)
{model_import}
import joblib
import warnings
warnings.filterwarnings("ignore")

# ===========================================
# 1. Load Dataset
# ===========================================
print("Loading dataset...")
df = pd.read_csv("{filename}")
print(f"Dataset shape: {{df.shape}}")
print(f"Target column: {target}")

# ===========================================
# 2. Prepare Features & Target
# ===========================================
df = df.dropna(subset=["{target}"])
X = df.drop(columns=["{target}"])
y = df["{target}"]
'''

    if task_type in ("binary", "multiclass"):
        code += f'''
# Encode target if needed
if y.dtype == "object" or y.dtype.name == "category":
    le = LabelEncoder()
    y = pd.Series(le.fit_transform(y), index=y.index)
    print(f"Classes: {{le.classes_}}")
'''

    code += f'''
# ===========================================
# 3. Define Preprocessing Pipeline
# ===========================================
numeric_features = {numeric_cols}
categorical_features = {categorical_cols}

numeric_transformer = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", StandardScaler()),
])

categorical_transformer = Pipeline([
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
])

preprocessor = ColumnTransformer([
    ("num", numeric_transformer, numeric_features),
    ("cat", categorical_transformer, categorical_features),
], remainder="drop")

# ===========================================
# 4. Build & Train Model
# ===========================================
model = {model_class}({params_str})

pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("model", model),
])

# Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("\\nTraining model...")
pipeline.fit(X_train, y_train)

# =============================================
# 5. Evaluate Model
# ===========================================
y_pred = pipeline.predict(X_test)
'''

    if task_type == "regression":
        code += '''
print("\\n" + "=" * 50)
print("REGRESSION RESULTS")
print("=" * 50)
print(f"R² Score:  {r2_score(y_test, y_pred):.4f}")
print(f"RMSE:      {np.sqrt(mean_squared_error(y_test, y_pred)):.4f}")
print(f"MAE:       {mean_absolute_error(y_test, y_pred):.4f}")
'''
    else:
        code += '''
print("\\n" + "=" * 50)
print("CLASSIFICATION RESULTS")
print("=" * 50)
print(f"Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
print(f"F1 Score:  {f1_score(y_test, y_pred, average='weighted'):.4f}")
print("\\nClassification Report:")
print(classification_report(y_test, y_pred))
'''

    code += f'''
# Cross-Validation
cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring="{"r2" if task_type == "regression" else "f1_weighted"}", n_jobs=-1)
print(f"\\nCross-Validation Mean: {{cv_scores.mean():.4f}} (+/- {{cv_scores.std():.4f}})")

# ===========================================
# 6. Save Model
# ===========================================
pipeline.fit(X, y)  # Retrain on full data
joblib.dump(pipeline, "trained_model.pkl")
print("\\nModel saved to trained_model.pkl")

# ===========================================
# 7. Make Predictions (Example)
# ===========================================
# loaded_model = joblib.load("trained_model.pkl")
# prediction = loaded_model.predict(new_data)
# print(f"Prediction: {{prediction}}")
'''

    return code


def _get_model_import(model_name: str, task_type: str):
    """Get import statement and class name for a model."""
    is_reg = task_type == "regression"
    mapping = {
        "Logistic Regression": ("from sklearn.linear_model import LogisticRegression", "LogisticRegression"),
        "Ridge": ("from sklearn.linear_model import Ridge", "Ridge"),
        "Lasso": ("from sklearn.linear_model import Lasso", "Lasso"),
        "Random Forest": (
            f"from sklearn.ensemble import {'RandomForestRegressor' if is_reg else 'RandomForestClassifier'}",
            f"{'RandomForestRegressor' if is_reg else 'RandomForestClassifier'}",
        ),
        "Gradient Boosting": (
            f"from sklearn.ensemble import {'GradientBoostingRegressor' if is_reg else 'GradientBoostingClassifier'}",
            f"{'GradientBoostingRegressor' if is_reg else 'GradientBoostingClassifier'}",
        ),
        "XGBoost": (
            f"from xgboost import {'XGBRegressor' if is_reg else 'XGBClassifier'}",
            f"{'XGBRegressor' if is_reg else 'XGBClassifier'}",
        ),
        "LightGBM": (
            f"from lightgbm import {'LGBMRegressor' if is_reg else 'LGBMClassifier'}",
            f"{'LGBMRegressor' if is_reg else 'LGBMClassifier'}",
        ),
        "KNN": (
            f"from sklearn.neighbors import {'KNeighborsRegressor' if is_reg else 'KNeighborsClassifier'}",
            f"{'KNeighborsRegressor' if is_reg else 'KNeighborsClassifier'}",
        ),
        "SVM": (
            f"from sklearn.svm import {'SVR' if is_reg else 'SVC'}",
            f"{'SVR' if is_reg else 'SVC'}",
        ),
        "SVR": ("from sklearn.svm import SVR", "SVR"),
        "Decision Tree": (
            f"from sklearn.tree import {'DecisionTreeRegressor' if is_reg else 'DecisionTreeClassifier'}",
            f"{'DecisionTreeRegressor' if is_reg else 'DecisionTreeClassifier'}",
        ),
    }
    return mapping.get(model_name, ("from sklearn.ensemble import RandomForestClassifier", "RandomForestClassifier"))
