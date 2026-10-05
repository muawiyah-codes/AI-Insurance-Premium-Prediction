import os
import time
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from schema.prediction_response import PredictionResponse
from Model.predict import (
    predict_output,
    predict_batch,
    get_model_metadata,
    MODEL_VERSION,
    model
)
from schema.user_input import UserInput

app = FastAPI(
    title="Aura Underwrite - AI Insurance Risk & Premium Prediction API",
    description="Next-generation ML platform for intelligent actuarial risk categorization, what-if lifestyle simulation, explainable underwriting, and dynamic premium quotes.",
    version="2.0.0"
)

# Ensure static directory exists
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class WhatIfRequest(BaseModel):
    age: int
    weight: float
    height: float
    income_lpa: float
    smoker: bool
    city: str
    occupation: str
    target_bmi: Optional[float] = None
    target_smoker: Optional[bool] = None


class BatchPredictionRequest(BaseModel):
    profiles: List[Dict[str, Any]] = Field(..., description="List of applicant profile dictionaries")


# Sample preset profiles for quick testing
SAMPLE_PROFILES = [
    {
        "id": "PROF-001",
        "label": "Young Active Athlete",
        "tag": "Low Risk",
        "age": 22,
        "weight": 68.0,
        "height": 1.78,
        "income_lpa": 8.5,
        "smoker": False,
        "city": "Bangalore",
        "occupation": "salaried",
        "bio": "22 y/o non-smoker software developer with regular fitness routine."
    },
    {
        "id": "PROF-002",
        "label": "Corporate Tech Lead",
        "tag": "Standard Risk",
        "age": 34,
        "weight": 76.0,
        "height": 1.74,
        "income_lpa": 24.0,
        "smoker": False,
        "city": "Mumbai",
        "occupation": "salaried",
        "bio": "34 y/o professional, healthy biometric parameters, Tier 1 metro resident."
    },
    {
        "id": "PROF-003",
        "label": "Heavy Smoker Executive",
        "tag": "High Risk",
        "age": 48,
        "weight": 96.0,
        "height": 1.72,
        "income_lpa": 32.0,
        "smoker": True,
        "city": "Delhi",
        "occupation": "self-employed",
        "bio": "48 y/o business owner, daily smoker, BMI in obese range (>32)."
    },
    {
        "id": "PROF-004",
        "label": "Retired Senior Citizen",
        "tag": "Senior Risk",
        "age": 63,
        "weight": 72.0,
        "height": 1.68,
        "income_lpa": 12.0,
        "smoker": False,
        "city": "Pune",
        "occupation": "retired",
        "bio": "63 y/o non-smoker retiree seeking comprehensive senior coverage."
    },
    {
        "id": "PROF-005",
        "label": "Student Intern",
        "tag": "Low Risk",
        "age": 20,
        "weight": 60.0,
        "height": 1.70,
        "income_lpa": 3.0,
        "smoker": False,
        "city": "Jaipur",
        "occupation": "student",
        "bio": "20 y/o college student, excellent health profile, budget-conscious."
    }
]


@app.get("/")
def index(request: Request):
    """Serves the modern frontend dashboard SPA or JSON greeting if explicitly requested."""
    accept = request.headers.get("accept", "")
    if "application/json" in accept and "text/html" not in accept:
        return {
            "message": "Welcome to Aura Underwrite - Next-Gen AI Insurance Premium Platform",
            "version": MODEL_VERSION,
            "docs_url": "/docs",
            "status": "online"
        }
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "message": "Welcome to Aura Underwrite API",
        "model_version": MODEL_VERSION
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(data: UserInput):
    """
    Standard insurance risk & premium prediction endpoint.
    100% backward-compatible with original API schema while returning rich intelligence.
    """
    user_input = {
        "age": data.age,
        "bmi": data.bmi,
        "smoker": data.smoker,
        "income_lpa": data.income_lpa,
        "occupation": data.occupation,
        "age_group": data.age_group,
        "lifestyle_risk": data.lifestyle_risk,
        "city": data.city,
        "city_tier": data.city_tier,
    }

    try:
        prediction = predict_output(user_input)
        return prediction
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.post("/api/predict", response_model=PredictionResponse)
def api_predict(data: UserInput):
    """Convenience alias endpoint for frontend and external integrations."""
    return predict(data)


@app.post("/api/simulate-what-if")
def simulate_what_if(req: WhatIfRequest):
    """
    Dynamic counterfactual simulation endpoint:
    Calculates delta between baseline customer profile and proposed healthy habits.
    """
    try:
        # 1. Baseline profile
        height_m = max(req.height, 0.5)
        base_bmi = req.weight / (height_m ** 2)
        base_input = {
            "age": req.age,
            "bmi": base_bmi,
            "smoker": req.smoker,
            "income_lpa": req.income_lpa,
            "occupation": req.occupation,
            "city": req.city
        }
        baseline_result = predict_output(base_input)

        # 2. Simulated profile
        sim_smoker = req.target_smoker if req.target_smoker is not None else False
        sim_bmi = req.target_bmi if req.target_bmi is not None else 22.5
        sim_input = {
            "age": req.age,
            "bmi": sim_bmi,
            "smoker": sim_smoker,
            "income_lpa": req.income_lpa,
            "occupation": req.occupation,
            "city": req.city
        }
        simulated_result = predict_output(sim_input)

        # 3. Compute deltas
        base_annual_inr = baseline_result["pricing"]["annual_inr"]
        sim_annual_inr = simulated_result["pricing"]["annual_inr"]
        annual_savings_inr = max(0.0, base_annual_inr - sim_annual_inr)
        annual_savings_usd = round(annual_savings_inr / 85.0, 0)

        risk_score_diff = round(baseline_result["risk_score"] - simulated_result["risk_score"], 1)

        return {
            "baseline": {
                "category": baseline_result["predicted_category"],
                "risk_score": baseline_result["risk_score"],
                "annual_inr": base_annual_inr,
                "annual_usd": baseline_result["pricing"]["annual_usd"],
                "monthly_inr": baseline_result["pricing"]["monthly_inr"],
                "monthly_usd": baseline_result["pricing"]["monthly_usd"],
            },
            "simulated": {
                "category": simulated_result["predicted_category"],
                "risk_score": simulated_result["risk_score"],
                "annual_inr": sim_annual_inr,
                "annual_usd": simulated_result["pricing"]["annual_usd"],
                "monthly_inr": simulated_result["pricing"]["monthly_inr"],
                "monthly_usd": simulated_result["pricing"]["monthly_usd"],
            },
            "savings": {
                "annual_inr": annual_savings_inr,
                "annual_usd": annual_savings_usd,
                "five_year_inr": annual_savings_inr * 5,
                "five_year_usd": annual_savings_usd * 5,
                "ten_year_inr": annual_savings_inr * 10,
                "ten_year_usd": annual_savings_usd * 10,
                "risk_score_reduction": risk_score_diff,
                "percentage_discount": round((annual_savings_inr / max(base_annual_inr, 1)) * 100.0, 1)
            }
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/predict/batch")
def batch_predict_endpoint(req: BatchPredictionRequest):
    """Executes batch risk prediction and portfolio risk analytics."""
    try:
        results = predict_batch(req.profiles)
        return results
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/sample-profiles")
def get_sample_profiles():
    """Returns curated personas for testing."""
    return SAMPLE_PROFILES


@app.get("/api/model/info")
def get_model_info():
    """Returns technical model metadata, pipeline architecture, and feature importances."""
    info = get_model_metadata()
    info["server_time"] = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    info["model_status"] = "loaded" if model is not None else "not loaded"
    return info


@app.get("/api/benchmark")
def benchmark_inference():
    """Benchmarks inference latency on 100 sample predictions."""
    if model is None:
        return {"error": "Model not loaded"}

    sample = {
        "age": 32, "bmi": 24.2, "smoker": False, "income_lpa": 14.0,
        "occupation": "salaried", "age_group": "adult", "lifestyle_risk": "low"
    }

    start = time.perf_counter()
    iterations = 50
    for _ in range(iterations):
        predict_output(sample)
    duration_ms = (time.perf_counter() - start) * 1000.0
    avg_latency_ms = round(duration_ms / iterations, 2)

    return {
        "iterations": iterations,
        "total_duration_ms": round(duration_ms, 2),
        "avg_latency_ms": avg_latency_ms,
        "throughput_req_per_sec": round(1000.0 / max(avg_latency_ms, 0.001), 1),
        "status": "optimized"
    }


@app.get("/health")
@app.get("/api/health")
def health_check():
    """Machine-readable health endpoint."""
    return {
        "status": "healthy",
        "service": "Aura Underwrite AI",
        "model_version": MODEL_VERSION,
        "model_status": "loaded" if model is not None else "not loaded"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)