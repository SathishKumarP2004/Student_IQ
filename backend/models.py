from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class Student(db.Model):
    __tablename__ = 'students'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    enrollment_year = db.Column(db.Integer, nullable=False)
    department = db.Column(db.String(100), nullable=False)

    semesters = db.relationship('SemesterRecord', backref='student', lazy=True, cascade='all, delete-orphan')
    predictions = db.relationship('Prediction', backref='student', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'name': self.name,
            'enrollment_year': self.enrollment_year,
            'department': self.department,
        }


class SemesterRecord(db.Model):
    __tablename__ = 'semester_records'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    attendance_pct = db.Column(db.Float, nullable=False)
    assignment_score = db.Column(db.Float, nullable=False)
    midterm_score = db.Column(db.Float, nullable=False)
    final_score = db.Column(db.Float, nullable=False)
    gpa = db.Column(db.Float, nullable=False)
    study_hours_weekly = db.Column(db.Float, nullable=False)
    extracurricular_activities = db.Column(db.Integer, nullable=False)
    part_time_job = db.Column(db.Boolean, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'semester': self.semester,
            'attendance_pct': round(self.attendance_pct, 1),
            'assignment_score': round(self.assignment_score, 1),
            'midterm_score': round(self.midterm_score, 1),
            'final_score': round(self.final_score, 1),
            'gpa': round(self.gpa, 2),
            'study_hours_weekly': round(self.study_hours_weekly, 1),
            'extracurricular_activities': self.extracurricular_activities,
            'part_time_job': self.part_time_job,
        }


class Prediction(db.Model):
    __tablename__ = 'predictions'

    id = db.Column(db.Integer, primary_key=True)
    student_db_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    model_name = db.Column(db.String(50), nullable=False)
    inconsistency_label = db.Column(db.Integer, nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    shap_values = db.Column(db.Text, nullable=True)  # JSON string of SHAP values
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'model_name': self.model_name,
            'inconsistency_label': self.inconsistency_label,
            'confidence': round(self.confidence, 4),
            'shap_values': json.loads(self.shap_values) if self.shap_values else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ModelMetadata(db.Model):
    __tablename__ = 'model_metadata'

    id = db.Column(db.Integer, primary_key=True)
    model_name = db.Column(db.String(50), unique=True, nullable=False)
    accuracy = db.Column(db.Float, nullable=False)
    precision = db.Column(db.Float, nullable=False)
    recall = db.Column(db.Float, nullable=False)
    f1_score = db.Column(db.Float, nullable=False)
    confusion_matrix = db.Column(db.Text, nullable=True)  # JSON string
    trained_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'model_name': self.model_name,
            'accuracy': round(self.accuracy, 4),
            'precision': round(self.precision, 4),
            'recall': round(self.recall, 4),
            'f1_score': round(self.f1_score, 4),
            'confusion_matrix': json.loads(self.confusion_matrix) if self.confusion_matrix else None,
            'trained_at': self.trained_at.isoformat() if self.trained_at else None,
        }
