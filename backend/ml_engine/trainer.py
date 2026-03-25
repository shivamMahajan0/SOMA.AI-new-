"""
AutoML-X — Model Trainer (Optimized)
Trains multiple ML models with hyperparameter tuning.
Eliminates redundant cross-validation passes for fast training.
"""
import numpy as np
import warnings
import time
from typing import List, Dict, Any, Tuple
from sklearn.pipeline import Pipeline
from sklearn.model_selection import RandomizedSearchCV
from sklearn.linear_model import LogisticRegression, Ridge, Lasso
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor

warnings.filterwarnings("ignore")

try:
    from xgboost import XGBClassifier, XGBRegressor
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

try:
    from lightgbm import LGBMClassifier, LGBMRegressor
    HAS_LGBM = True
except ImportError:
    HAS_LGBM = False


def _get_classification_models(n_samples: int = 1000) -> List[Tuple[str, Any, Dict]]:
    """Get classification models with their hyperparameter grids.
    Adapts model selection based on dataset size.
    """
    models = [
        ("Logistic Regression", LogisticRegression(max_iter=500, random_state=42), {
            "model__C": [0.1, 1, 10],
            "model__solver": ["lbfgs", "liblinear"],
        }),
        ("Random Forest", RandomForestClassifier(random_state=42, n_jobs=-1), {
            "model__n_estimators": [50, 100],
            "model__max_depth": [5, 10, None],
            "model__min_samples_split": [2, 5],
        }),
        ("Gradient Boosting", GradientBoostingClassifier(random_state=42), {
            "model__n_estimators": [50, 100],
            "model__learning_rate": [0.05, 0.1, 0.2],
            "model__max_depth": [3, 5],
        }),
        ("KNN", KNeighborsClassifier(), {
            "model__n_neighbors": [3, 5, 7],
            "model__weights": ["uniform", "distance"],
        }),
        ("Decision Tree", DecisionTreeClassifier(random_state=42), {
            "model__max_depth": [5, 10, None],
            "model__min_samples_split": [2, 5],
        }),
    ]

    # SVM is too slow for hyperparameter search — only include for small datasets
    # and with a minimal grid
    if n_samples <= 500:
        from sklearn.svm import SVC
        models.append(("SVM", SVC(probability=True, random_state=42), {
            "model__C": [0.1, 1],
            "model__kernel": ["rbf"],
        }))

    if HAS_XGBOOST:
        models.append(("XGBoost", XGBClassifier(random_state=42, eval_metric="logloss", verbosity=0, n_jobs=-1), {
            "model__n_estimators": [50, 100],
            "model__learning_rate": [0.05, 0.1],
            "model__max_depth": [3, 5],
        }))

    if HAS_LGBM:
        models.append(("LightGBM", LGBMClassifier(random_state=42, verbose=-1, n_jobs=-1), {
            "model__n_estimators": [50, 100],
            "model__learning_rate": [0.05, 0.1],
            "model__max_depth": [3, 5],
        }))

    return models


def _get_regression_models(n_samples: int = 1000) -> List[Tuple[str, Any, Dict]]:
    """Get regression models with their hyperparameter grids."""
    models = [
        ("Ridge", Ridge(), {
            "model__alpha": [0.1, 1, 10, 100],
        }),
        ("Lasso", Lasso(max_iter=2000), {
            "model__alpha": [0.01, 0.1, 1],
        }),
        ("Random Forest", RandomForestRegressor(random_state=42, n_jobs=-1), {
            "model__n_estimators": [50, 100],
            "model__max_depth": [5, 10, None],
            "model__min_samples_split": [2, 5],
        }),
        ("Gradient Boosting", GradientBoostingRegressor(random_state=42), {
            "model__n_estimators": [50, 100],
            "model__learning_rate": [0.05, 0.1, 0.2],
            "model__max_depth": [3, 5],
        }),
        ("KNN", KNeighborsRegressor(), {
            "model__n_neighbors": [3, 5, 7],
            "model__weights": ["uniform", "distance"],
        }),
        ("Decision Tree", DecisionTreeRegressor(random_state=42), {
            "model__max_depth": [5, 10, None],
            "model__min_samples_split": [2, 5],
        }),
    ]

    # SVR only for small datasets
    if n_samples <= 500:
        from sklearn.svm import SVR
        models.append(("SVR", SVR(), {
            "model__C": [0.1, 1],
            "model__kernel": ["rbf"],
        }))

    if HAS_XGBOOST:
        models.append(("XGBoost", XGBRegressor(random_state=42, verbosity=0, n_jobs=-1), {
            "model__n_estimators": [50, 100],
            "model__learning_rate": [0.05, 0.1],
            "model__max_depth": [3, 5],
        }))

    if HAS_LGBM:
        models.append(("LightGBM", LGBMRegressor(random_state=42, verbose=-1, n_jobs=-1), {
            "model__n_estimators": [50, 100],
            "model__learning_rate": [0.05, 0.1],
            "model__max_depth": [3, 5],
        }))

    return models


def train_all_models(
    preprocessor, X: np.ndarray, y: np.ndarray, task_type: str, cv_folds: int = 3, tuning_iters: int = 10
) -> List[Dict[str, Any]]:
    """
    Train multiple models, perform hyperparameter tuning, return results.
    Optimized: uses RandomizedSearchCV scores directly — no redundant CV passes.
    """
    n_samples = X.shape[0]

    if task_type == "regression":
        model_configs = _get_regression_models(n_samples)
        scoring = "r2"
    else:
        model_configs = _get_classification_models(n_samples)
        scoring = "f1_weighted" if task_type == "multiclass" else "f1"

    results = []

    for name, model, param_grid in model_configs:
        start_time = time.time()
        try:
            pipeline = Pipeline([
                ("preprocessor", preprocessor),
                ("model", model),
            ])

            # Hyperparameter tuning with RandomizedSearchCV
            n_iter = min(tuning_iters, _param_combinations(param_grid))
            search = RandomizedSearchCV(
                pipeline,
                param_distributions=param_grid,
                n_iter=n_iter,
                cv=cv_folds,
                scoring=scoring,
                n_jobs=-1,
                random_state=42,
                error_score="raise",
                return_train_score=False,
            )
            search.fit(X, y)

            best_pipeline = search.best_estimator_
            best_params = {k.replace("model__", ""): v for k, v in search.best_params_.items()}

            # Use CV scores from the search directly — NO redundant cross_val_score
            cv_results_idx = search.best_index_
            # Extract per-fold scores for the best parameter set
            cv_scores = []
            for fold_i in range(cv_folds):
                key = f"split{fold_i}_test_score"
                if key in search.cv_results_:
                    cv_scores.append(float(search.cv_results_[key][cv_results_idx]))

            elapsed = round(time.time() - start_time, 2)

            results.append({
                "name": name,
                "pipeline": best_pipeline,
                "best_params": best_params,
                "cv_mean": float(np.round(search.best_score_, 4)),
                "cv_std": float(np.round(np.std(cv_scores), 4)) if cv_scores else 0.0,
                "cv_scores": [float(np.round(s, 4)) for s in cv_scores],
                "best_search_score": float(np.round(search.best_score_, 4)),
                "train_time_seconds": elapsed,
            })

        except Exception as e:
            elapsed = round(time.time() - start_time, 2)
            results.append({
                "name": name,
                "pipeline": None,
                "error": str(e),
                "cv_mean": 0,
                "cv_std": 0,
                "train_time_seconds": elapsed,
            })

    # Sort by cv_mean descending
    results.sort(key=lambda x: x.get("cv_mean", 0), reverse=True)
    return results


def train_single_model(
    preprocessor, X: np.ndarray, y: np.ndarray, task_type: str,
    model_name: str, hyperparameters: Dict[str, Any] = None, cv_folds: int = 3,
) -> List[Dict[str, Any]]:
    """
    Train a single user-specified model with given hyperparameters.
    Used for Custom Training Mode.
    Returns a list with one result dict (same format as train_all_models).
    """
    if hyperparameters is None:
        hyperparameters = {}

    # Map model names to sklearn classes
    model_map_clf = {
        "Random Forest": RandomForestClassifier,
        "XGBoost": None,
        "Logistic Regression": LogisticRegression,
        "Decision Tree": DecisionTreeClassifier,
        "SVM": None,
    }
    model_map_reg = {
        "Random Forest": RandomForestRegressor,
        "XGBoost": None,
        "Logistic Regression": Ridge,  # Ridge for regression equivalent
        "Decision Tree": DecisionTreeRegressor,
        "SVM": None,
    }

    # Handle special imports
    if model_name == "XGBoost":
        if not HAS_XGBOOST:
            return [{"name": model_name, "pipeline": None, "error": "XGBoost not installed", "cv_mean": 0, "cv_std": 0, "train_time_seconds": 0}]
        if task_type == "regression":
            model_map_reg["XGBoost"] = XGBRegressor
        else:
            model_map_clf["XGBoost"] = XGBClassifier

    if model_name == "SVM":
        if task_type == "regression":
            from sklearn.svm import SVR
            model_map_reg["SVM"] = SVR
        else:
            from sklearn.svm import SVC
            model_map_clf["SVM"] = SVC

    model_map = model_map_reg if task_type == "regression" else model_map_clf

    if model_name not in model_map or model_map[model_name] is None:
        return [{"name": model_name, "pipeline": None, "error": f"Unsupported model: {model_name}", "cv_mean": 0, "cv_std": 0, "train_time_seconds": 0}]

    ModelClass = model_map[model_name]

    # Clean hyperparameters: filter out empty/None values and convert types
    clean_params = {}
    for k, v in hyperparameters.items():
        if v is None or v == "" or v == "null":
            continue
        # Try to convert to int/float
        try:
            if isinstance(v, str):
                if "." in v:
                    v = float(v)
                else:
                    v = int(v)
        except (ValueError, TypeError):
            pass
        # Handle special string values
        if isinstance(v, str) and v.lower() == "none":
            v = None
        if isinstance(v, str) and v.lower() == "true":
            v = True
        if isinstance(v, str) and v.lower() == "false":
            v = False
        clean_params[k] = v

    # Add defaults
    default_kwargs = {"random_state": 42}
    if model_name in ("Random Forest",) and task_type != "regression":
        default_kwargs["n_jobs"] = -1
    if model_name == "Logistic Regression":
        default_kwargs["max_iter"] = 500
    if model_name == "XGBoost":
        default_kwargs["verbosity"] = 0
        default_kwargs["n_jobs"] = -1
        if task_type != "regression":
            default_kwargs["eval_metric"] = "logloss"
    if model_name == "SVM" and task_type != "regression":
        default_kwargs["probability"] = True

    # Merge: user params override defaults
    final_params = {**default_kwargs, **clean_params}

    start_time = time.time()
    try:
        model = ModelClass(**final_params)
        pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("model", model),
        ])

        # Use cross-validation for scoring
        scoring = "r2" if task_type == "regression" else ("f1_weighted" if task_type == "multiclass" else "f1")
        from sklearn.model_selection import cross_val_score
        cv_scores = cross_val_score(pipeline, X, y, cv=cv_folds, scoring=scoring, n_jobs=-1)

        # Fit on full data
        pipeline.fit(X, y)

        elapsed = round(time.time() - start_time, 2)

        return [{
            "name": model_name,
            "pipeline": pipeline,
            "best_params": clean_params,
            "cv_mean": float(np.round(np.mean(cv_scores), 4)),
            "cv_std": float(np.round(np.std(cv_scores), 4)),
            "cv_scores": [float(np.round(s, 4)) for s in cv_scores],
            "best_search_score": float(np.round(np.mean(cv_scores), 4)),
            "train_time_seconds": elapsed,
        }]

    except Exception as e:
        elapsed = round(time.time() - start_time, 2)
        return [{
            "name": model_name,
            "pipeline": None,
            "error": str(e),
            "cv_mean": 0,
            "cv_std": 0,
            "train_time_seconds": elapsed,
        }]


def _param_combinations(param_grid: Dict) -> int:
    """Estimate number of parameter combinations."""
    n = 1
    for v in param_grid.values():
        n *= len(v)
    return n
