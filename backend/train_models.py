"""
Train ML models (Random Forest, XGBoost, Logistic Regression) on the student data.
Save trained models, scaler, and generate SHAP explanations.
Stores model performance metrics into the database.
"""

import os
import sys
import json
import warnings
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from xgboost import XGBClassifier
import shap

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from flask import Flask
from models import db, ModelMetadata, Prediction, Student

warnings.filterwarnings('ignore')

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'saved_models')
os.makedirs(MODELS_DIR, exist_ok=True)

FEATURE_COLS = [
    'mean_attendance', 'std_attendance',
    'mean_assignment', 'std_assignment',
    'mean_midterm', 'std_midterm',
    'mean_final', 'std_final',
    'mean_gpa', 'std_gpa', 'gpa_range',
    'mean_study_hours', 'std_study_hours',
    'max_gpa_drop', 'attendance_score_corr',
    'avg_extracurricular', 'has_part_time',
]


def load_data():
    csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'training_data.csv')
    if not os.path.exists(csv_path):
        print("ERROR: training_data.csv not found. Run generate_data.py first!")
        sys.exit(1)
    return pd.read_csv(csv_path)


def train_all_models():
    df = load_data()

    X = df[FEATURE_COLS].values
    y = df['inconsistency_label'].values
    student_ids = df['student_id'].values

    X_train, X_test, y_train, y_test, ids_train, ids_test = train_test_split(
        X, y, student_ids, test_size=0.2, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Save scaler
    joblib.dump(scaler, os.path.join(MODELS_DIR, 'scaler.pkl'))
    print("✓ Scaler saved")

    # Save feature names
    joblib.dump(FEATURE_COLS, os.path.join(MODELS_DIR, 'feature_names.pkl'))

    models = {
        'Random Forest': RandomForestClassifier(
            n_estimators=200, max_depth=10, random_state=42, class_weight='balanced'
        ),
        'XGBoost': XGBClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.1,
            random_state=42, use_label_encoder=False, eval_metric='logloss',
            scale_pos_weight=(len(y_train) - sum(y_train)) / max(sum(y_train), 1)
        ),
        'Logistic Regression': LogisticRegression(
            max_iter=1000, random_state=42, class_weight='balanced'
        ),
    }

    results = {}

    for name, model in models.items():
        print(f"\n{'='*50}")
        print(f"Training: {name}")
        print(f"{'='*50}")

        # Use scaled data for LR, raw for tree-based
        if name == 'Logistic Regression':
            model.fit(X_train_scaled, y_train)
            y_pred = model.predict(X_test_scaled)
            y_proba = model.predict_proba(X_test_scaled)[:, 1]
        else:
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            y_proba = model.predict_proba(X_test)[:, 1]

        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        cm = confusion_matrix(y_test, y_pred).tolist()

        print(f"  Accuracy:  {acc:.4f}")
        print(f"  Precision: {prec:.4f}")
        print(f"  Recall:    {rec:.4f}")
        print(f"  F1 Score:  {f1:.4f}")
        print(f"  Confusion Matrix: {cm}")

        # Save model
        model_filename = name.lower().replace(' ', '_') + '.pkl'
        joblib.dump(model, os.path.join(MODELS_DIR, model_filename))
        print(f"  ✓ Model saved: {model_filename}")

        results[name] = {
            'accuracy': acc, 'precision': prec, 'recall': rec,
            'f1_score': f1, 'confusion_matrix': cm,
            'y_pred': y_pred, 'y_proba': y_proba,
        }

    # Generate SHAP values using the best tree-based model (Random Forest)
    print(f"\n{'='*50}")
    print("Generating SHAP explanations (Random Forest)...")
    print(f"{'='*50}")

    rf_model = models['Random Forest']
    explainer = shap.TreeExplainer(rf_model)
    
    # SHAP on full dataset for global explanations
    shap_values_all = explainer.shap_values(X)
    # Handle different SHAP return formats
    if isinstance(shap_values_all, list):
        shap_values_all = shap_values_all[1]  # class 1 (inconsistent)
    elif hasattr(shap_values_all, 'ndim') and shap_values_all.ndim == 3:
        shap_values_all = shap_values_all[:, :, 1]  # class 1 for 3D arrays

    # Save SHAP explainer + values
    joblib.dump(explainer, os.path.join(MODELS_DIR, 'shap_explainer.pkl'))

    # Global feature importance from SHAP
    mean_abs_shap = np.abs(shap_values_all).mean(axis=0)
    feature_importance = {
        feat: round(float(val), 4)
        for feat, val in sorted(zip(FEATURE_COLS, mean_abs_shap), key=lambda x: -x[1])
    }
    joblib.dump(feature_importance, os.path.join(MODELS_DIR, 'feature_importance.pkl'))
    print(f"  ✓ SHAP feature importance saved")

    # Save per-student SHAP values to database
    print("\nSaving metrics & predictions to database...")
    save_to_database(results, df, X, shap_values_all)

    print("\n✓ Training complete! All models and SHAP values saved.")
    return results


def save_to_database(results, df, X, shap_values_all):
    """Save model metrics and per-student predictions/SHAP to the database."""
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///students.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)

    with app.app_context():
        # Clear old predictions and metadata
        Prediction.__table__.drop(db.engine, checkfirst=True)
        ModelMetadata.__table__.drop(db.engine, checkfirst=True)
        Prediction.__table__.create(db.engine, checkfirst=True)
        ModelMetadata.__table__.create(db.engine, checkfirst=True)

        # Save model metadata
        for name, metrics in results.items():
            meta = ModelMetadata(
                model_name=name,
                accuracy=metrics['accuracy'],
                precision=metrics['precision'],
                recall=metrics['recall'],
                f1_score=metrics['f1_score'],
                confusion_matrix=json.dumps(metrics['confusion_matrix']),
            )
            db.session.add(meta)

        # Load the best model (Random Forest) for full-dataset predictions
        rf_model = joblib.load(os.path.join(MODELS_DIR, 'random_forest.pkl'))
        full_preds = rf_model.predict(X)
        full_proba = rf_model.predict_proba(X)[:, 1]

        # Save per-student prediction + SHAP values
        for i, row in df.iterrows():
            student = Student.query.filter_by(student_id=row['student_id']).first()
            if student is None:
                continue

            shap_dict = {
                feat: round(float(shap_values_all[i][j]), 4)
                for j, feat in enumerate(FEATURE_COLS)
            }

            pred = Prediction(
                student_db_id=student.id,
                model_name='Random Forest',
                inconsistency_label=int(full_preds[i]),
                confidence=float(full_proba[i]),
                shap_values=json.dumps(shap_dict),
            )
            db.session.add(pred)

        db.session.commit()
        print(f"  ✓ Saved {len(results)} model metrics and {len(df)} predictions to database")


if __name__ == '__main__':
    train_all_models()
