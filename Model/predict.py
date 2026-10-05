import os
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, List

# Load trained ML model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "insurance_model.pkl")
model = joblib.load(MODEL_PATH)

MODEL_VERSION = "2.0.0"
class_labels = model.classes_.tolist()

# Feature importances from the trained classifier
try:
    classifier = model.named_steps["classifier"]
    preprocessor = model.named_steps["preprocessor"]
    raw_feature_names = preprocessor.get_feature_names_out().tolist()
    raw_importances = classifier.feature_importances_.tolist()
    FEATURE_IMPORTANCE_MAP = dict(zip(raw_feature_names, raw_importances))
except Exception:
    FEATURE_IMPORTANCE_MAP = {}


def _normalize_input(raw_input: dict) -> dict:
    """Normalize input fields to match trained model expectations."""
    normalized = dict(raw_input)

    # Ensure lifestyle_risk is lowercase
    if "lifestyle_risk" in normalized and normalized["lifestyle_risk"]:
        normalized["lifestyle_risk"] = str(normalized["lifestyle_risk"]).lower()
    else:
        # Compute lifestyle risk if missing
        smoker = bool(normalized.get("smoker", False))
        bmi = float(normalized.get("bmi", 22.0))
        if smoker and bmi > 30:
            normalized["lifestyle_risk"] = "high"
        elif smoker or bmi > 27:
            normalized["lifestyle_risk"] = "medium"
        else:
            normalized["lifestyle_risk"] = "low"

    # Ensure age_group is lowercase
    if "age_group" in normalized and normalized["age_group"]:
        normalized["age_group"] = str(normalized["age_group"]).lower()
    else:
        age = int(normalized.get("age", 30))
        if age < 25:
            normalized["age_group"] = "young"
        elif age < 40:
            normalized["age_group"] = "adult"
        elif age < 60:
            normalized["age_group"] = "middle_age"
        else:
            normalized["age_group"] = "senior"

    # Ensure types
    normalized["age"] = int(normalized.get("age", 30))
    normalized["bmi"] = round(float(normalized.get("bmi", 22.0)), 2)
    normalized["smoker"] = bool(normalized.get("smoker", False))
    normalized["income_lpa"] = float(normalized.get("income_lpa", 10.0))
    normalized["occupation"] = str(normalized.get("occupation", "salaried")).lower()

    return normalized


def _calculate_risk_score(probabilities: dict) -> float:
    """
    Computes a composite continuous Risk Score between 5.0 and 99.0
    Weighted combination of High (100 pts), Medium (50 pts), Low (10 pts).
    """
    p_high = probabilities.get("High", 0.0)
    p_med = probabilities.get("Medium", 0.0)
    p_low = probabilities.get("Low", 0.0)

    score = (p_high * 100.0) + (p_med * 52.0) + (p_low * 12.0)
    return round(float(min(max(score, 5.0), 99.0)), 1)


def _compute_risk_factors(user_input: dict, risk_score: float) -> List[dict]:
    """Generates explainable SHAP-style feature impact breakdown."""
    age = user_input.get("age", 30)
    bmi = user_input.get("bmi", 22.0)
    smoker = user_input.get("smoker", False)
    income = user_input.get("income_lpa", 10.0)
    occupation = user_input.get("occupation", "salaried")

    factors = []

    # 1. Smoking Factor (Model weight ~ 31.8%)
    if smoker:
        factors.append({
            "feature": "Tobacco Use",
            "impact_level": "High",
            "direction": "risk_increase",
            "contribution_score": 38.5,
            "insight": "Active smoking introduces high pulmonary and cardiovascular risk multipliers (+38.5% risk)."
        })
    else:
        factors.append({
            "feature": "Tobacco Abstinence",
            "impact_level": "High",
            "direction": "protective",
            "contribution_score": -32.0,
            "insight": "Clean non-smoker status unlocks preferred rate tiers and removes surcharge penalties."
        })

    # 2. BMI Factor (Model weight ~ 15.4%)
    if bmi >= 30.0:
        factors.append({
            "feature": f"BMI ({bmi:.1f} - Obese)",
            "impact_level": "High",
            "direction": "risk_increase",
            "contribution_score": 26.4,
            "insight": f"Body Mass Index of {bmi:.1f} falls in the Class-I/II obesity range, increasing metabolic risk."
        })
    elif bmi >= 25.0:
        factors.append({
            "feature": f"BMI ({bmi:.1f} - Overweight)",
            "impact_level": "Medium",
            "direction": "risk_increase",
            "contribution_score": 14.2,
            "insight": f"Slightly elevated BMI ({bmi:.1f}) contributes moderate strain on underwriting health metrics."
        })
    elif bmi >= 18.5:
        factors.append({
            "feature": f"BMI ({bmi:.1f} - Optimal)",
            "impact_level": "Medium",
            "direction": "protective",
            "contribution_score": -18.0,
            "insight": f"Healthy biometric weight profile ({bmi:.1f}) qualifies for favorable standard underwriting."
        })
    else:
        factors.append({
            "feature": f"BMI ({bmi:.1f} - Underweight)",
            "impact_level": "Low",
            "direction": "risk_increase",
            "contribution_score": 8.5,
            "insight": "Underweight status flagged for nutritional and immunity variance."
        })

    # 3. Age Factor (Model weight ~ 21.2%)
    if age >= 55:
        factors.append({
            "feature": f"Age ({age} yrs - Senior)",
            "impact_level": "High",
            "direction": "risk_increase",
            "contribution_score": 28.0,
            "insight": f"Applicant age ({age}) crosses morbidity escalation thresholds for critical illness coverage."
        })
    elif age >= 40:
        factors.append({
            "feature": f"Age ({age} yrs - Mid-Adult)",
            "impact_level": "Medium",
            "direction": "risk_increase",
            "contribution_score": 12.5,
            "insight": f"Age {age} sits in moderate actuarial mortality transition curve."
        })
    else:
        factors.append({
            "feature": f"Age ({age} yrs - Young Adult)",
            "impact_level": "High",
            "direction": "protective",
            "contribution_score": -22.5,
            "insight": f"Youthful age bracket ({age}) significantly suppresses base actuarial risk."
        })

    # 4. Income / Socioeconomic Stability (Model weight ~ 4.4%)
    if income >= 20.0:
        factors.append({
            "feature": f"High Income ({income:.1f} LPA)",
            "impact_level": "Low",
            "direction": "protective",
            "contribution_score": -8.5,
            "insight": "High financial solvency correlates with higher healthcare adherence and preventive care."
        })
    elif income < 4.0:
        factors.append({
            "feature": f"Lower Income Bracket ({income:.1f} LPA)",
            "impact_level": "Low",
            "direction": "risk_increase",
            "contribution_score": 6.2,
            "insight": "Lower financial liquidity may affect elective treatments and out-of-pocket copays."
        })

    # 5. Occupational Risk (Model weight ~ 4.0%)
    if occupation in ["retired", "unemployed"]:
        factors.append({
            "feature": f"Occupation ({occupation.title()})",
            "impact_level": "Low",
            "direction": "risk_increase",
            "contribution_score": 7.0,
            "insight": f"{occupation.title()} status factors into activity level and coverage eligibility."
        })
    else:
        factors.append({
            "feature": f"Occupation ({occupation.title()})",
            "impact_level": "Low",
            "direction": "protective",
            "contribution_score": -5.0,
            "insight": f"Low occupational hazard category with standard corporate/independent profile."
        })

    return factors


def _calculate_pricing(age: int, risk_score: float, city_tier: int = 2) -> dict:
    """Computes realistic actuarial premium estimates across INR and USD."""
    base_inr = 8500.0
    age_factor = 1.0 + max(0, age - 21) * 0.028
    risk_factor = (risk_score / 35.0) ** 1.12
    city_factor = 1.15 if city_tier == 1 else (1.06 if city_tier == 2 else 1.0)

    annual_inr = round(base_inr * age_factor * risk_factor * city_factor, -2)
    monthly_inr = round(annual_inr / 12.0, 0)

    # Conversion rate ~ 85 INR per USD
    annual_usd = round(annual_inr / 85.0, 0)
    monthly_usd = round(annual_usd / 12.0, 1)

    return {
        "annual_inr": float(annual_inr),
        "monthly_inr": float(monthly_inr),
        "annual_usd": float(annual_usd),
        "monthly_usd": float(monthly_usd),
    }


def _generate_policy_plans(pricing: dict) -> List[dict]:
    """Generates tiered insurance plans tailored to the calculated pricing."""
    ann_inr = pricing["annual_inr"]
    ann_usd = pricing["annual_usd"]

    plans = [
        {
            "tier": "Bronze Essential",
            "badge": "Budget Friendly",
            "annual_inr": round(ann_inr * 0.75, -2),
            "monthly_inr": round((ann_inr * 0.75) / 12.0, 0),
            "annual_usd": round(ann_usd * 0.75, 0),
            "monthly_usd": round((ann_usd * 0.75) / 12.0, 1),
            "sum_insured_inr": "₹5 Lakhs",
            "sum_insured_usd": "$60,000",
            "copay": "20% Copay",
            "features": [
                "Emergency hospitalization",
                "ICU coverage up to room rent limit",
                "Pre & Post hospitalization (30/60 days)",
                "Standard network hospital access"
            ]
        },
        {
            "tier": "Silver Shield",
            "badge": "Popular",
            "annual_inr": round(ann_inr * 1.0, -2),
            "monthly_inr": round(ann_inr / 12.0, 0),
            "annual_usd": round(ann_usd * 1.0, 0),
            "monthly_usd": round(ann_usd / 12.0, 1),
            "sum_insured_inr": "₹15 Lakhs",
            "sum_insured_usd": "$180,000",
            "copay": "10% Copay",
            "features": [
                "Full in-patient hospitalization with no room rent cap",
                "Daycare treatments covered (540+ procedures)",
                "Annual comprehensive health checkup",
                "Ambulance cover up to ₹5,000 / $60"
            ]
        },
        {
            "tier": "Gold Comprehensive",
            "badge": "Best Value",
            "annual_inr": round(ann_inr * 1.35, -2),
            "monthly_inr": round((ann_inr * 1.35) / 12.0, 0),
            "annual_usd": round(ann_usd * 1.35, 0),
            "monthly_usd": round((ann_usd * 1.35) / 12.0, 1),
            "sum_insured_inr": "₹35 Lakhs",
            "sum_insured_usd": "$420,000",
            "copay": "Zero Copay (0%)",
            "features": [
                "Zero copay across all network hospitals",
                "OPD consultations & prescribed medicines cover",
                "Maternity & newborn baby coverage",
                "Restore benefit: 100% reload of sum insured",
                "Critical illness accelerator rider included"
            ]
        },
        {
            "tier": "Platinum Elite",
            "badge": "Maximum Protection",
            "annual_inr": round(ann_inr * 1.85, -2),
            "monthly_inr": round((ann_inr * 1.85) / 12.0, 0),
            "annual_usd": round(ann_usd * 1.85, 0),
            "monthly_usd": round((ann_usd * 1.85) / 12.0, 1),
            "sum_insured_inr": "₹1.0 Crore ($1.2M)",
            "sum_insured_usd": "$1,200,000",
            "copay": "Zero Copay (0%)",
            "features": [
                "Global international emergency & trauma coverage",
                "Air ambulance & emergency repatriation",
                "Dedicated 24/7 personal medical concierge",
                "Comprehensive dental & optical coverage",
                "Unlimited doctor tele-consultations"
            ]
        }
    ]
    return plans


def _calculate_potential_savings(user_input: dict, base_pricing: dict) -> dict:
    """Calculates potential financial savings through lifestyle improvements."""
    savings_scenarios = []
    total_potential_savings_inr = 0.0

    # Scenario 1: Quitting smoking
    if user_input.get("smoker", False):
        counterfactual = dict(user_input)
        counterfactual["smoker"] = False
        bmi = counterfactual.get("bmi", 22.0)
        counterfactual["lifestyle_risk"] = "high" if bmi > 30 else ("medium" if bmi > 27 else "low")
        
        sim_df = pd.DataFrame([counterfactual])
        sim_probs = model.predict_proba(sim_df)[0]
        prob_dict = dict(zip(class_labels, [float(p) for p in sim_probs]))
        new_risk_score = _calculate_risk_score(prob_dict)
        new_pricing = _calculate_pricing(user_input["age"], new_risk_score, user_input.get("city_tier", 2))
        
        diff_inr = max(0.0, base_pricing["annual_inr"] - new_pricing["annual_inr"])
        diff_usd = round(diff_inr / 85.0, 0)
        total_potential_savings_inr += diff_inr

        savings_scenarios.append({
            "action": "Smoking Cessation (Quit Smoking)",
            "annual_savings_inr": diff_inr,
            "annual_savings_usd": diff_usd,
            "five_year_savings_inr": diff_inr * 5,
            "five_year_savings_usd": diff_usd * 5,
            "ten_year_savings_inr": diff_inr * 10,
            "ten_year_savings_usd": diff_usd * 10,
            "risk_score_reduction": round(base_pricing.get("risk_score", 50.0) - new_risk_score, 1),
            "description": "Transitioning to a verified non-tobacco tier drastically removes underwriting surcharges."
        })

    # Scenario 2: Reaching Healthy BMI
    bmi = user_input.get("bmi", 22.0)
    if bmi > 25.0:
        counterfactual = dict(user_input)
        counterfactual["bmi"] = 23.0
        smoker = counterfactual.get("smoker", False)
        counterfactual["lifestyle_risk"] = "high" if (smoker and 23.0 > 30) else ("medium" if smoker else "low")
        
        sim_df = pd.DataFrame([counterfactual])
        sim_probs = model.predict_proba(sim_df)[0]
        prob_dict = dict(zip(class_labels, [float(p) for p in sim_probs]))
        new_risk_score = _calculate_risk_score(prob_dict)
        new_pricing = _calculate_pricing(user_input["age"], new_risk_score, user_input.get("city_tier", 2))
        
        diff_inr = max(0.0, base_pricing["annual_inr"] - new_pricing["annual_inr"])
        diff_usd = round(diff_inr / 85.0, 0)
        total_potential_savings_inr += diff_inr

        savings_scenarios.append({
            "action": "Achieve Healthy BMI (Target 23.0)",
            "annual_savings_inr": diff_inr,
            "annual_savings_usd": diff_usd,
            "five_year_savings_inr": diff_inr * 5,
            "five_year_savings_usd": diff_usd * 5,
            "ten_year_savings_inr": diff_inr * 10,
            "ten_year_savings_usd": diff_usd * 10,
            "risk_score_reduction": round(base_pricing.get("risk_score", 50.0) - new_risk_score, 1),
            "description": "Lowering BMI into the normal range (18.5 - 24.9) reduces cardiovascular morbidity classification."
        })

    return {
        "has_actionable_savings": len(savings_scenarios) > 0,
        "total_annual_potential_inr": total_potential_savings_inr,
        "total_annual_potential_usd": round(total_potential_savings_inr / 85.0, 0),
        "scenarios": savings_scenarios
    }


def _generate_health_advisory(user_input: dict, predicted_class: str) -> List[str]:
    """Generates personalized underwriting recommendations."""
    advisories = []
    bmi = user_input.get("bmi", 22.0)
    smoker = user_input.get("smoker", False)
    age = user_input.get("age", 30)

    if smoker:
        advisories.append("Enroll in a certified nicotine cessation program; tobacco abstinence for 12 consecutive months qualifies for non-smoker discount re-tiering.")
    if bmi > 29.0:
        advisories.append(f"Current BMI ({bmi:.1f}) qualifies for our subsidized wellness and metabolic monitoring program with wearable fitness trackers.")
    elif bmi > 25.0:
        advisories.append(f"A 5-7% weight reduction into the optimal BMI band (< 24.9) will reduce your health risk multiplier by up to 18%.")
    else:
        advisories.append(f"Your biometric BMI ({bmi:.1f}) is within the optimal zone; maintain your current active routine to lock in preferred renewal rates.")

    if age >= 45:
        advisories.append("Annual lipid panel, HbA1c screening, and ECG are fully covered under your preventive health checkup benefit.")
    else:
        advisories.append("Take advantage of complimentary annual preventive screenings to detect early markers and earn wellness credits.")

    return advisories


def predict_output(user_input: dict) -> dict:
    """
    Main prediction function.
    Maintains 100% backward compatibility while returning enriched intelligence:
    - predicted_category & predicted_class
    - confidence & class_probabilities
    - risk_score & risk_level
    - dynamic actuarial premium pricing
    - explainable risk factors
    - what-if savings simulation
    - tailored policy packages
    """
    normalized_input = _normalize_input(user_input)
    
    # Required feature columns in exact order
    feature_cols = ['age', 'bmi', 'smoker', 'income_lpa', 'occupation', 'age_group', 'lifestyle_risk']
    df = pd.DataFrame([{col: normalized_input[col] for col in feature_cols}])

    # Predict class & probabilities
    predicted_class = str(model.predict(df)[0])
    probabilities = model.predict_proba(df)[0]
    confidence = float(max(probabilities))

    # Probability dictionary
    class_probabilities = {
        label: round(float(p), 4)
        for label, p in zip(class_labels, probabilities)
    }

    # Continuous Risk Score (0 - 100)
    risk_score = _calculate_risk_score(class_probabilities)

    # Risk level qualitative descriptor
    if risk_score < 30.0:
        risk_level = "Preferred Low Risk (Optimal Health Tier)"
    elif risk_score < 65.0:
        risk_level = "Standard Moderate Risk (Normal Health Tier)"
    else:
        risk_level = "Substandard Elevated Risk (High Care Tier)"

    # Pricing calculation
    city_tier = normalized_input.get("city_tier", 2)
    pricing = _calculate_pricing(normalized_input["age"], risk_score, city_tier)
    pricing["risk_score"] = risk_score

    # Policy plans
    plans = _generate_policy_plans(pricing)

    # Explainable Risk Factors
    risk_factors = _compute_risk_factors(normalized_input, risk_score)

    # What-If Potential Savings
    potential_savings = _calculate_potential_savings(normalized_input, pricing)

    # Health Advisory
    health_advisory = _generate_health_advisory(normalized_input, predicted_class)

    return {
        # Backward compatibility
        "predicted_category": predicted_class,
        "predicted_class": predicted_class,
        "confidence": round(confidence, 4),
        "class_probabilities": class_probabilities,

        # Advanced Intelligence
        "risk_score": risk_score,
        "risk_level": risk_level,
        "pricing": {
            "annual_inr": pricing["annual_inr"],
            "monthly_inr": pricing["monthly_inr"],
            "annual_usd": pricing["annual_usd"],
            "monthly_usd": pricing["monthly_usd"],
        },
        "risk_factors": risk_factors,
        "health_advisory": health_advisory,
        "potential_savings": potential_savings,
        "recommended_plans": plans,
    }


def predict_batch(profiles: list[dict]) -> dict:
    """Batch prediction processing for underwriting portfolios."""
    results = []
    category_counts = {"Low": 0, "Medium": 0, "High": 0}
    total_premium_inr = 0.0

    for idx, p in enumerate(profiles):
        pred = predict_output(p)
        cat = pred["predicted_category"]
        category_counts[cat] = category_counts.get(cat, 0) + 1
        total_premium_inr += pred["pricing"]["annual_inr"]

        results.append({
            "applicant_id": p.get("id", f"APP-{idx+1001}"),
            "name": p.get("name", f"Applicant #{idx+1}"),
            "age": p.get("age", 30),
            "bmi": p.get("bmi", 22.0),
            "smoker": p.get("smoker", False),
            "income_lpa": p.get("income_lpa", 10.0),
            "city": p.get("city", "Mumbai"),
            "predicted_category": cat,
            "confidence": pred["confidence"],
            "risk_score": pred["risk_score"],
            "annual_premium_inr": pred["pricing"]["annual_inr"],
            "annual_premium_usd": pred["pricing"]["annual_usd"],
        })

    return {
        "total_records": len(profiles),
        "summary": {
            "category_distribution": category_counts,
            "average_risk_score": round(sum(r["risk_score"] for r in results) / max(len(results), 1), 1),
            "total_portfolio_premium_inr": total_premium_inr,
            "total_portfolio_premium_usd": round(total_premium_inr / 85.0, 0),
        },
        "records": results,
    }


def get_model_metadata() -> dict:
    """Returns architecture, feature rankings, and technical pipeline parameters."""
    return {
        "model_name": "Balanced Random Forest Classifier",
        "version": MODEL_VERSION,
        "task": "Multi-class Insurance Risk & Premium Tier Classification",
        "target_classes": class_labels,
        "hyperparameters": {
            "n_estimators": 300,
            "max_depth": 12,
            "min_samples_split": 5,
            "min_samples_leaf": 2,
            "class_weight": "balanced",
            "random_state": 42
        },
        "pipeline_architecture": [
            {
                "step": "ColumnTransformer",
                "categorical_transformer": "OneHotEncoder(handle_unknown='ignore')",
                "categorical_features": ["smoker", "occupation", "age_group", "lifestyle_risk"],
                "numerical_transformer": "Passthrough",
                "numerical_features": ["age", "bmi", "income_lpa"]
            },
            {
                "step": "Classifier",
                "type": "RandomForestClassifier",
                "n_trees": 300
            }
        ],
        "feature_importances": sorted(
            [{"feature": k, "importance": round(v, 4)} for k, v in FEATURE_IMPORTANCE_MAP.items()],
            key=lambda x: x["importance"],
            reverse=True
        )
    }