# Daybreak: Student Mental Health Score Predictor

An end-to-end machine learning project that predicts a student's **mental health score (0–10)** from daily habits such as screen time, phone unlocks, sleep, study hours, physical activity and stress level.

The model is a **Random Forest regressor** tuned with **RandomizedSearchCV** and packaged in a scikit-learn **Pipeline** with a **ColumnTransformer**. It is served through a **FastAPI** backend and used by a lightweight HTML/CSS/JavaScript frontend that shows the result as a sun rising higher in the sky as the score improves.

> **Disclaimer:** This project is for informational and educational purposes only. It is **not** a clinical or diagnostic tool. If you are struggling, please talk to someone you trust or a qualified professional.

---

## Table of contents

- [Highlights](#highlights)
- [Machine learning workflow](#machine-learning-workflow)
- [Model details](#model-details)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [API reference](#api-reference)
- [Frontend](#frontend)
- [Troubleshooting](#troubleshooting)
- [Limitations](#limitations)
- [Future improvements](#future-improvements)
- [Author](#author)

---

## Highlights

- Random Forest regression model with hyperparameter tuning (RandomizedSearchCV)
- Reproducible preprocessing with `Pipeline` and `ColumnTransformer`, so training and inference use identical steps
- Data validation and feature engineering before modelling
- FastAPI service with strict Pydantic input validation
- Responsive web UI with animated sky, tips and switchable colour themes
- No frontend build step or framework

---

## Machine learning workflow

```
Raw data
   │
   ▼
Data validation & cleaning
   │
   ▼
Feature engineering (e.g. Grouped_country)
   │
   ▼
ColumnTransformer
   ├── numeric features      → numeric preprocessing
   └── categorical features  → categorical encoding
   │
   ▼
Pipeline: preprocessing + RandomForestRegressor
   │
   ▼
RandomizedSearchCV (hyperparameter tuning, cross-validation)
   │
   ▼
Best pipeline saved as Mental_Health_Model.pkl (joblib)
   │
   ▼
FastAPI  →  /predict  →  Frontend
```

### 1. Data validation
The input data is checked before training (expected columns, data types, missing values, duplicates and value ranges). The same rules are enforced at inference time by the Pydantic model in the API, so invalid requests are rejected with a clear `422` response.

### 2. Feature engineering
- `Grouped_country`: countries outside the top list (India, USA, Canada, Australia, UK, Germany, Mexico, Turkey, France) are grouped as `Other`, which reduces the number of rare categories.
- Add any other engineered features you created here (for example ratios, bins or interaction features).

### 3. Preprocessing with ColumnTransformer
Numeric and categorical columns are processed separately inside a `ColumnTransformer`, then passed to the model in a single `Pipeline`. This keeps preprocessing and model together as one object, prevents data leakage and lets the API call `model.predict()` on a raw dataframe row.

### 4. Model training and tuning
A `RandomForestRegressor` was tuned with `RandomizedSearchCV`, which samples random combinations from a hyperparameter search space and scores each with cross-validation. It finds a good configuration much faster than an exhaustive grid search.

---

## Model details

| Item                    | Details                                                        |
| ----------------------- | -------------------------------------------------------------- |
| Task                    | Regression (predict a score from 0 to 10)                      |
| Algorithm               | Random Forest Regressor                                        |
| Tuning                  | RandomizedSearchCV                                             |
| Pipeline                | `Pipeline` + `ColumnTransformer`                               |
| Target                  | Mental health score                                            |

### Input features

| Feature                   | Type        |
| ------------------------- | ----------- |
| `Age`                     | Numeric     |
| `Gender`                  | Categorical |
| `Country`                 | Categorical |
| `Grouped_country`         | Engineered  |
| `Academic_Level`          | Categorical |
| `Most_Used_Platform`      | Categorical |
| `Purpose_Of_Use`          | Categorical |
| `Avg_Daily_Usage_Hours`   | Numeric     |
| `Daily_Unlocks`           | Numeric     |
| `Study_Hours`             | Numeric     |
| `Physical_Activity_Hours` | Numeric     |
| `Sleep_Hours_Per_Night`   | Numeric     |
| `Stress_Level`            | Categorical |

---

## Tech stack

| Layer      | Tools                                           |
| ---------- | ----------------------------------------------- |
| ML         | Python, pandas, NumPy, scikit-learn, joblib     |
| Backend    | FastAPI, Pydantic, Uvicorn                      |
| Frontend   | HTML, CSS, vanilla JavaScript                   |
| Fonts      | Bricolage Grotesque, DM Sans (Google Fonts)     |

---

## Project structure

```
.
├── notebooks/
│   └── model_training.ipynb   # EDA, validation, feature engineering, training
├── main.py                    # FastAPI app (loads the model, exposes /predict)
├── Mental_Health_Model.pkl    # trained pipeline saved with joblib
├── requirements.txt
├── README.md
└── ui/
    ├── index.html             # page structure
    ├── style.css              # styles and colour themes
    └── script.js              # form logic, API call, sky animation
```

Adjust the paths if your folders are named differently.

---

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

### 2. Create a virtual environment (recommended)

```bash
python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

Example `requirements.txt`:

```
fastapi
uvicorn
pandas
numpy
scikit-learn
joblib
pydantic
```

> **Important:** Install the same scikit-learn version that was used to train `Mental_Health_Model.pkl`. A version mismatch can cause warnings or errors when loading the model. Pin it once you know it, for example `scikit-learn==1.x.x`.

### 4. Start the API

```bash
uvicorn main:app --port 8000 --reload
```

Replace `main` with your Python filename if it differs. The API runs at `http://127.0.0.1:8000`, and interactive docs are available at `http://127.0.0.1:8000/docs`.

### 5. Open the frontend

Open `ui/index.html` in your browser (or use the VS Code **Live Server** extension), fill in the form and click **Get my score**.

If your API runs on a different port, change `API_BASE` at the top of `ui/script.js`:

```js
const API_BASE = "http://127.0.0.1:8000";
```

---

## API reference

### `POST /predict`

Returns the predicted mental health score for one student.

**Request body**

| Field                     | Type    | Allowed values / range                                                                                                                  |
| ------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `age`                     | integer | 10 to 100                                                                                                                               |
| `gender`                  | string  | `Male`, `Female`                                                                                                                        |
| `country`                 | string  | Any country. Countries outside the top list are grouped as `Other` internally                                                           |
| `academic_level`          | string  | `High School`, `Undergraduate`, `Graduate`                                                                                              |
| `most_used_platform`      | string  | `Facebook`, `Instagram`, `Snapchat`, `Twitter`, `YouTube`, `TikTok`, `LinkedIn`, `LINE`, `KakaoTalk`, `VKontakte`, `WhatsApp`, `WeChat` |
| `purpose_of_use`          | string  | `Networking`, `Education`, `Entertainment`, `News`                                                                                      |
| `avg_daily_usage_hours`   | float   | 0 to 24                                                                                                                                 |
| `daily_unlocks`           | integer | 0 or more                                                                                                                               |
| `study_hours`             | float   | 0 to 24                                                                                                                                 |
| `physical_activity_hours` | float   | 0 to 24                                                                                                                                 |
| `sleep_hours_per_night`   | float   | 0 to 24                                                                                                                                 |
| `stress_level`            | string  | `Low`, `Medium`, `High`, `Very High`                                                                                                    |

**Example request**

```bash
curl -X POST http://127.0.0.1:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "age": 21,
    "gender": "Female",
    "country": "India",
    "academic_level": "Undergraduate",
    "most_used_platform": "Instagram",
    "purpose_of_use": "Entertainment",
    "avg_daily_usage_hours": 5.5,
    "daily_unlocks": 80,
    "study_hours": 3,
    "physical_activity_hours": 1,
    "sleep_hours_per_night": 6.5,
    "stress_level": "Medium"
  }'
```

**Example response**

```json
{
  "predicted_mental_health_score": 6.78
}
```

**Errors**

| Status | Meaning                                                                 |
| ------ | ----------------------------------------------------------------------- |
| `422`  | A field is missing or outside the allowed values. The body lists which. |
| `500`  | Server error, usually a problem loading or running the model.           |

### `GET /`

Simple welcome route, useful for checking that the server is running.

---

## Frontend

The UI is a single page with a form on one side and a sky illustration on the other. The sun rises and the sky changes from night to morning as the predicted score goes up.

| Score  | Label       | Meaning                                |
| ------ | ----------- | -------------------------------------- |
| 0–3.99 | Running low | Habits point to a strained stretch     |
| 4–6.99 | Steady      | A fairly balanced routine              |
| 7–10   | Bright      | A well-supported baseline              |

Short tips appear when sleep is under 6.5 hours, screen time is over 6 hours, physical activity is under 30 minutes, phone unlocks exceed 100 a day, or stress is `High` or `Very High`. These tips are simple rules and do not come from the model.

### Themes

All colours are CSS variables in `ui/style.css`. Switch the theme with one attribute in `index.html`:

```html
<body data-theme="lagoon">  <!-- lagoon | plum | meadow -->
```

To make your own theme, copy one of the `body[data-theme="..."]` blocks in `style.css`, rename it and change the values.

---

## Troubleshooting

**"Can't reach http://127.0.0.1:8000" in the UI**
The API is not running or is on a different port. Start it with `uvicorn main:app --port 8000 --reload` and check `API_BASE` in `script.js`.

**Browser shows a CORS error**
Make sure the `CORSMiddleware` block is present in `main.py`, then restart the server.

**500 error from `/predict`**
Check the Uvicorn terminal for the traceback. Common causes are a scikit-learn version mismatch or column names that differ from those used in training.

**`GET /` returns a server error**
Return a dictionary, for example `{"message": "Welcome"}`, not a set.

---

## Limitations

- The score is a statistical estimate learned from a survey-style dataset. It reflects patterns in that data and does not measure any individual's actual mental health.
- Predictions depend on the quality, size and demographics of the training data.
- The tips shown in the UI are simple rules, not medical advice.

---

## Future improvements

- Show which inputs influenced the score most (feature importance)
- Add SHAP explanations for individual predictions
- Compare against other models (Gradient Boosting, XGBoost)
- Containerise with Docker and deploy the API and frontend online

---

## Author

Built by **Sakshith**. Feel free to open an issue or a pull request.
