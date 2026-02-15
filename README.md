# ⚡ StudentIQ — Explainable ML for Student Performance

A full-stack web application that uses **Machine Learning** with **SHAP explanations** to identify and explain inconsistent academic performance among students.

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.0-000000?logo=flask)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.3-F7931E?logo=scikit-learn&logoColor=white)
![XGBoost](https://img.shields.io/badge/XGBoost-2.0-006600)
![SHAP](https://img.shields.io/badge/SHAP-0.44-blueviolet)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🎯 Overview

StudentIQ analyzes student academic data across multiple semesters and uses three ML models to classify students as **Consistent** or **Inconsistent** performers. Unlike black-box approaches, every prediction is accompanied by **SHAP-based explanations** showing exactly which factors contributed to the decision.

### Key Features

- 📊 **Interactive Dashboard** — Animated stat cards, distribution charts, and feature importance visualizations
- 🔍 **Student Explorer** — Search, filter, and drill into individual student profiles with semester trend charts
- 🤖 **3 ML Models** — Random Forest, XGBoost, and Logistic Regression with side-by-side comparison
- 💡 **SHAP Explanations** — Visual bar charts showing how each feature pushed the prediction
- 📤 **CSV Upload** — Batch predict on your own datasets
- 📥 **CSV Export** — Download student data with predictions
- 🔔 **Toast Notifications** — Real-time feedback for all actions
- 🌙 **Premium Dark UI** — Glassmorphism design with smooth animations

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Python · Flask · SQLAlchemy · SQLite |
| **ML Models** | Random Forest · XGBoost · Logistic Regression |
| **Explainability** | SHAP (SHapley Additive exPlanations) |
| **Frontend** | HTML · CSS · JavaScript · Chart.js |
| **Data Processing** | pandas · NumPy · scikit-learn |
| **Deployment** | Gunicorn · Render |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- pip

### Setup

```bash
# Clone the repo
git clone https://github.com/SathishKumarP2004/Student_IQ.git
cd Student_IQ

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run the app
python backend/app.py
```

Open **http://localhost:5000** in your browser.

---

## 📁 Project Structure

```
Student_IQ/
├── backend/
│   ├── app.py              # Flask API server
│   ├── models.py           # SQLAlchemy database models
│   ├── generate_data.py    # Synthetic data generator
│   ├── train_models.py     # ML model training pipeline
│   ├── training_data.csv   # Training dataset
│   └── saved_models/       # Trained model files (.pkl)
├── frontend/
│   ├── index.html          # Single-page application
│   ├── styles.css          # Premium dark theme CSS
│   └── app.js              # Frontend logic
├── wsgi.py                 # Production WSGI entry point
├── render.yaml             # Render deployment config
├── requirements.txt        # Python dependencies
└── README.md
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/dataset/overview` | Dashboard statistics |
| GET | `/api/students` | Paginated student list (search, filter) |
| GET | `/api/students/:id` | Individual student details + SHAP |
| GET | `/api/models/performance` | Model metrics + confusion matrices |
| GET | `/api/models/feature-importance` | Feature importance scores |
| POST | `/api/predict` | Manual single-student prediction |
| POST | `/api/upload` | Batch CSV prediction |

---

## 🧠 ML Features (17 Engineered)

The model uses these computed statistical features:

| Category | Features |
|----------|----------|
| **Academic Means** | Mean Attendance, Mean Assignment, Mean Midterm, Mean Final, Mean GPA |
| **Variability** | Std Attendance, Std Assignment, Std Midterm, Std Final, Std GPA |
| **Trends** | GPA Range, Max GPA Drop |
| **Behavioral** | Mean Study Hours, Std Study Hours, Attendance-Score Correlation |
| **External** | Avg Extracurricular, Has Part-time Job |

---

## 🌐 Deployment

This project is configured for **one-click deployment** on [Render](https://render.com):

1. Fork this repo
2. Sign up on [render.com](https://render.com) with GitHub
3. New → Web Service → Connect this repo
4. Render auto-detects `render.yaml` — just click Deploy
5. Get a free public URL!

---

## 📄 License

This project is built as a **Final Year College Project** for academic purposes.

---

<p align="center">
  Built with ❤️ using Python, Flask, and SHAP
</p>
