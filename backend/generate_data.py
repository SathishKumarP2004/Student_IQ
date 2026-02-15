"""
Generate synthetic student data and seed it into the SQLite database.
Also exports a CSV snapshot for ML model training.
"""

import os
import sys
import random
import numpy as np
import pandas as pd
from faker import Faker

# Add parent dir to path so we can import from the same package
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from models import db, Student, SemesterRecord

fake = Faker()
Faker.seed(42)
random.seed(42)
np.random.seed(42)

DEPARTMENTS = [
    'Computer Science', 'Information Technology', 'Electronics',
    'Mechanical Engineering', 'Civil Engineering', 'Data Science',
    'Electrical Engineering', 'Mathematics'
]

NUM_STUDENTS = 500
SEMESTERS = 6


def generate_student_records():
    """Generate realistic student data with inconsistency patterns."""
    students_data = []
    semester_data = []

    for i in range(NUM_STUDENTS):
        student_id_str = f"STU{2020 + random.randint(0, 3)}{i+1:04d}"
        name = fake.name()
        enrollment_year = random.randint(2020, 2023)
        department = random.choice(DEPARTMENTS)

        # Decide if this student is inconsistent (about 30% inconsistent)
        is_inconsistent = random.random() < 0.30

        base_ability = random.gauss(70, 12)  # base academic ability
        base_attendance = random.gauss(78, 10)
        base_study_hours = random.gauss(15, 5)

        semester_records = []

        for sem in range(1, SEMESTERS + 1):
            if is_inconsistent:
                # Inconsistent students: large random swings between semesters
                swing = random.choice([-1, 1]) * random.gauss(18, 8)
                attendance = np.clip(base_attendance + random.gauss(0, 18), 30, 100)
                assignment = np.clip(base_ability + swing + random.gauss(0, 12), 15, 100)
                midterm = np.clip(base_ability + random.choice([-25, 20]) + random.gauss(0, 10), 10, 100)
                final = np.clip(base_ability + random.choice([-20, 25]) + random.gauss(0, 10), 10, 100)
                study_hours = np.clip(base_study_hours + random.gauss(0, 8), 0, 40)
            else:
                # Consistent students: gradual improvement, low variance
                improvement = sem * random.gauss(1.0, 0.5)
                attendance = np.clip(base_attendance + random.gauss(improvement, 3), 40, 100)
                assignment = np.clip(base_ability + improvement + random.gauss(0, 4), 20, 100)
                midterm = np.clip(base_ability + improvement + random.gauss(0, 5), 20, 100)
                final = np.clip(base_ability + improvement + random.gauss(0, 5), 20, 100)
                study_hours = np.clip(base_study_hours + random.gauss(0, 2), 2, 35)

            # GPA derived from scores
            avg_score = (assignment * 0.25 + midterm * 0.35 + final * 0.40)
            gpa = np.clip(avg_score / 25.0, 0, 4.0)

            extracurriculars = random.randint(0, 5)
            part_time = random.random() < 0.25

            semester_records.append({
                'semester': sem,
                'attendance_pct': round(float(attendance), 1),
                'assignment_score': round(float(assignment), 1),
                'midterm_score': round(float(midterm), 1),
                'final_score': round(float(final), 1),
                'gpa': round(float(gpa), 2),
                'study_hours_weekly': round(float(study_hours), 1),
                'extracurricular_activities': extracurriculars,
                'part_time_job': part_time,
            })

        students_data.append({
            'student_id': student_id_str,
            'name': name,
            'enrollment_year': enrollment_year,
            'department': department,
            'is_inconsistent': int(is_inconsistent),
            'semesters': semester_records,
        })

    return students_data


def compute_features_for_csv(students_data):
    """Flatten student data into per-student feature rows for ML training."""
    rows = []
    for stu in students_data:
        sems = stu['semesters']
        attendances = [s['attendance_pct'] for s in sems]
        assignments = [s['assignment_score'] for s in sems]
        midterms = [s['midterm_score'] for s in sems]
        finals = [s['final_score'] for s in sems]
        gpas = [s['gpa'] for s in sems]
        study_hrs = [s['study_hours_weekly'] for s in sems]

        rows.append({
            'student_id': stu['student_id'],
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
            'avg_extracurricular': round(np.mean([s['extracurricular_activities'] for s in sems]), 2),
            'has_part_time': int(any(s['part_time_job'] for s in sems)),
            'inconsistency_label': stu['is_inconsistent'],
        })

    return pd.DataFrame(rows)


def seed_database(students_data):
    """Insert generated data into the SQLite database."""
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///students.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)

    with app.app_context():
        db.drop_all()
        db.create_all()

        for stu in students_data:
            student = Student(
                student_id=stu['student_id'],
                name=stu['name'],
                enrollment_year=stu['enrollment_year'],
                department=stu['department'],
            )
            db.session.add(student)
            db.session.flush()  # get the auto-ID

            for sem in stu['semesters']:
                record = SemesterRecord(
                    student_id=student.id,
                    semester=sem['semester'],
                    attendance_pct=sem['attendance_pct'],
                    assignment_score=sem['assignment_score'],
                    midterm_score=sem['midterm_score'],
                    final_score=sem['final_score'],
                    gpa=sem['gpa'],
                    study_hours_weekly=sem['study_hours_weekly'],
                    extracurricular_activities=sem['extracurricular_activities'],
                    part_time_job=sem['part_time_job'],
                )
                db.session.add(record)

        db.session.commit()
        print(f"✓ Seeded {NUM_STUDENTS} students × {SEMESTERS} semesters into database")


if __name__ == '__main__':
    print("Generating synthetic student data...")
    data = generate_student_records()

    # Seed into database
    seed_database(data)

    # Export CSV for model training
    df = compute_features_for_csv(data)
    csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'training_data.csv')
    df.to_csv(csv_path, index=False)
    print(f"✓ Exported training CSV with {len(df)} rows to {csv_path}")

    inconsistent_count = df['inconsistency_label'].sum()
    print(f"  → Inconsistent: {inconsistent_count} ({inconsistent_count/len(df)*100:.1f}%)")
    print(f"  → Consistent:   {len(df) - inconsistent_count} ({(len(df)-inconsistent_count)/len(df)*100:.1f}%)")
