"""
Flask API server for the Explainable ML Student Performance application.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import joblib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from models import db, Student, SemesterRecord, Prediction, ModelMetadata

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend')

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'saved_models')

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


def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///students.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB
    CORS(app)
    db.init_app(app)

    # Load ML models
    loaded_models = {}
    scaler = None
    feature_importance = None
    shap_explainer = None

    try:
        scaler = joblib.load(os.path.join(MODELS_DIR, 'scaler.pkl'))
        loaded_models['Random Forest'] = joblib.load(os.path.join(MODELS_DIR, 'random_forest.pkl'))
        loaded_models['XGBoost'] = joblib.load(os.path.join(MODELS_DIR, 'xgboost.pkl'))
        loaded_models['Logistic Regression'] = joblib.load(os.path.join(MODELS_DIR, 'logistic_regression.pkl'))
        feature_importance = joblib.load(os.path.join(MODELS_DIR, 'feature_importance.pkl'))
        shap_explainer = joblib.load(os.path.join(MODELS_DIR, 'shap_explainer.pkl'))
        print("[OK] All models loaded successfully")
    except Exception as e:
        print(f"[WARNING] Could not load some models: {e}")
        print("  Run train_models.py first!")

    # ─── Health Check ─────────────────────────────────────────
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({
            'status': 'healthy',
            'models_loaded': list(loaded_models.keys()),
            'database': 'connected',
        })

    # ─── Dataset Overview ─────────────────────────────────────
    @app.route('/api/dataset/overview', methods=['GET'])
    def dataset_overview():
        total_students = Student.query.count()
        total_predictions = Prediction.query.count()
        inconsistent = Prediction.query.filter_by(inconsistency_label=1).count()
        consistent = Prediction.query.filter_by(inconsistency_label=0).count()
        departments = db.session.query(Student.department, db.func.count(Student.id)).group_by(Student.department).all()

        return jsonify({
            'total_students': total_students,
            'total_predictions': total_predictions,
            'inconsistent_count': inconsistent,
            'consistent_count': consistent,
            'inconsistent_pct': round(inconsistent / max(total_predictions, 1) * 100, 1),
            'departments': [{'name': d[0], 'count': d[1]} for d in departments],
            'features': FEATURE_COLS,
        })

    # ─── Students List ────────────────────────────────────────
    @app.route('/api/students', methods=['GET'])
    def get_students():
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '', type=str)
        filter_label = request.args.get('filter', '', type=str)  # 'inconsistent' or 'consistent'
        department = request.args.get('department', '', type=str)

        query = Student.query

        if search:
            query = query.filter(
                db.or_(
                    Student.name.ilike(f'%{search}%'),
                    Student.student_id.ilike(f'%{search}%')
                )
            )

        if department:
            query = query.filter(Student.department == department)

        # Join predictions for filtering
        if filter_label in ('inconsistent', 'consistent'):
            label_val = 1 if filter_label == 'inconsistent' else 0
            query = query.join(Prediction).filter(Prediction.inconsistency_label == label_val)

        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        students = []
        for stu in paginated.items:
            stu_dict = stu.to_dict()
            pred = Prediction.query.filter_by(student_db_id=stu.id).first()
            if pred:
                stu_dict['prediction'] = {
                    'label': pred.inconsistency_label,
                    'confidence': round(pred.confidence, 4),
                    'label_text': 'Inconsistent' if pred.inconsistency_label == 1 else 'Consistent',
                }
            else:
                stu_dict['prediction'] = None

            # Add latest GPA
            latest = SemesterRecord.query.filter_by(student_id=stu.id).order_by(
                SemesterRecord.semester.desc()
            ).first()
            if latest:
                stu_dict['latest_gpa'] = latest.gpa
            students.append(stu_dict)

        return jsonify({
            'students': students,
            'total': paginated.total,
            'page': paginated.page,
            'pages': paginated.pages,
            'per_page': per_page,
        })

    # ─── Student Detail ───────────────────────────────────────
    @app.route('/api/students/<int:student_id>', methods=['GET'])
    def get_student(student_id):
        student = Student.query.get_or_404(student_id)
        stu_dict = student.to_dict()

        # Semester records
        semesters = SemesterRecord.query.filter_by(student_id=student.id).order_by(
            SemesterRecord.semester.asc()
        ).all()
        stu_dict['semesters'] = [s.to_dict() for s in semesters]

        # Predictions with SHAP
        preds = Prediction.query.filter_by(student_db_id=student.id).all()
        stu_dict['predictions'] = [p.to_dict() for p in preds]

        # Compute feature values for this student
        if semesters:
            attendances = [s.attendance_pct for s in semesters]
            assignments = [s.assignment_score for s in semesters]
            midterms = [s.midterm_score for s in semesters]
            finals = [s.final_score for s in semesters]
            gpas = [s.gpa for s in semesters]
            study_hrs = [s.study_hours_weekly for s in semesters]

            stu_dict['computed_features'] = {
                'mean_attendance': round(np.mean(attendances), 2),
                'std_attendance': round(np.std(attendances), 2),
                'mean_assignment': round(np.mean(assignments), 2),
                'std_assignment': round(np.std(assignments), 2),
                'mean_midterm': round(np.mean(midterms), 2),
                'std_midterm': round(np.std(midterms), 2),
                'mean_final': round(np.mean(finals), 2),
                'std_final': round(np.std(finals), 2),
                'mean_gpa': round(np.mean(gpas), 2),
                'std_gpa': round(np.std(gpas), 2),
                'gpa_range': round(max(gpas) - min(gpas), 2),
                'mean_study_hours': round(np.mean(study_hrs), 2),
                'std_study_hours': round(np.std(study_hrs), 2),
                'max_gpa_drop': round(max(gpas[j] - gpas[j+1] for j in range(len(gpas)-1)) if len(gpas) > 1 else 0, 2),
                'attendance_score_corr': round(float(np.corrcoef(attendances, finals)[0, 1]) if np.std(attendances) > 0 and np.std(finals) > 0 else 0, 2),
                'avg_extracurricular': round(np.mean([s.extracurricular_activities for s in semesters]), 2),
                'has_part_time': int(any(s.part_time_job for s in semesters)),
            }

        return jsonify(stu_dict)

    # ─── Predict (manual input or single student) ─────────────
    @app.route('/api/predict', methods=['POST'])
    def predict():
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        try:
            features = np.array([[
                data.get('mean_attendance', 0),
                data.get('std_attendance', 0),
                data.get('mean_assignment', 0),
                data.get('std_assignment', 0),
                data.get('mean_midterm', 0),
                data.get('std_midterm', 0),
                data.get('mean_final', 0),
                data.get('std_final', 0),
                data.get('mean_gpa', 0),
                data.get('std_gpa', 0),
                data.get('gpa_range', 0),
                data.get('mean_study_hours', 0),
                data.get('std_study_hours', 0),
                data.get('max_gpa_drop', 0),
                data.get('attendance_score_corr', 0),
                data.get('avg_extracurricular', 0),
                data.get('has_part_time', 0),
            ]])

            results = {}
            for name, model in loaded_models.items():
                if name == 'Logistic Regression':
                    feat_scaled = scaler.transform(features)
                    pred = model.predict(feat_scaled)[0]
                    proba = model.predict_proba(feat_scaled)[0][1]
                else:
                    pred = model.predict(features)[0]
                    proba = model.predict_proba(features)[0][1]

                results[name] = {
                    'prediction': int(pred),
                    'label': 'Inconsistent' if pred == 1 else 'Consistent',
                    'confidence': round(float(proba), 4),
                }

            # SHAP explanation using Random Forest
            shap_vals = None
            if shap_explainer:
                sv = shap_explainer.shap_values(features)
                if isinstance(sv, list):
                    sv = sv[1]
                elif hasattr(sv, 'ndim') and sv.ndim == 3:
                    sv = sv[:, :, 1]
                shap_vals = {feat: round(float(sv[0][j]), 4) for j, feat in enumerate(FEATURE_COLS)}

            return jsonify({
                'predictions': results,
                'shap_values': shap_vals,
                'features_used': FEATURE_COLS,
            })

        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # ─── Upload CSV for batch prediction ──────────────────────
    @app.route('/api/upload', methods=['POST'])
    def upload_csv():
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        file = request.files['file']
        if not file.filename.endswith('.csv'):
            return jsonify({'error': 'File must be a CSV'}), 400

        try:
            df = pd.read_csv(file)

            # Check if required columns exist
            missing_cols = [c for c in FEATURE_COLS if c not in df.columns]
            if missing_cols:
                return jsonify({
                    'error': f'Missing columns: {missing_cols}',
                    'required_columns': FEATURE_COLS,
                }), 400

            X = df[FEATURE_COLS].values
            rf_model = loaded_models.get('Random Forest')
            if not rf_model:
                return jsonify({'error': 'Model not loaded'}), 500

            preds = rf_model.predict(X)
            probas = rf_model.predict_proba(X)[:, 1]

            # SHAP for batch
            shap_batch = None
            if shap_explainer:
                sv = shap_explainer.shap_values(X)
                if isinstance(sv, list):
                    sv = sv[1]
                elif hasattr(sv, 'ndim') and sv.ndim == 3:
                    sv = sv[:, :, 1]
                shap_batch = [
                    {feat: round(float(sv[i][j]), 4) for j, feat in enumerate(FEATURE_COLS)}
                    for i in range(len(X))
                ]

            results = []
            for i in range(len(df)):
                row_result = {
                    'index': i,
                    'prediction': int(preds[i]),
                    'label': 'Inconsistent' if preds[i] == 1 else 'Consistent',
                    'confidence': round(float(probas[i]), 4),
                }
                if 'student_id' in df.columns:
                    row_result['student_id'] = str(df.iloc[i]['student_id'])
                if shap_batch:
                    row_result['shap_values'] = shap_batch[i]
                results.append(row_result)

            summary = {
                'total': len(results),
                'inconsistent': int(sum(preds)),
                'consistent': int(len(preds) - sum(preds)),
            }

            return jsonify({
                'summary': summary,
                'results': results,
            })

        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # ─── Model Performance ────────────────────────────────────
    @app.route('/api/models/performance', methods=['GET'])
    def model_performance():
        models_meta = ModelMetadata.query.all()
        return jsonify({
            'models': [m.to_dict() for m in models_meta],
        })

    # ─── Feature Importance ───────────────────────────────────
    @app.route('/api/models/feature-importance', methods=['GET'])
    def get_feature_importance():
        if feature_importance:
            return jsonify({
                'feature_importance': feature_importance,
                'features': FEATURE_COLS,
            })
        return jsonify({'error': 'Feature importance not available'}), 404

    # ─── Serve Frontend ───────────────────────────────────
    @app.route('/')
    def serve_frontend():
        return send_from_directory(FRONTEND_DIR, 'index.html')

    @app.route('/<path:filename>')
    def serve_static(filename):
        return send_from_directory(FRONTEND_DIR, filename)

    return app


if __name__ == '__main__':
    app = create_app()
    print("\n>>> Starting Flask API server on http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
