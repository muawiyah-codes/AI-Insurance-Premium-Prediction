from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional

class RiskFactor(BaseModel):
    feature: str = Field(..., description="Name of the risk feature")
    impact_level: str = Field(..., description="High, Medium, or Low impact on risk")
    direction: str = Field(..., description="'risk_increase' or 'protective'")
    contribution_score: float = Field(..., description="Percentage contribution to risk score")
    insight: str = Field(..., description="Human-readable explanation of impact")

class PremiumPricing(BaseModel):
    annual_inr: float = Field(..., description="Estimated annual premium in INR")
    monthly_inr: float = Field(..., description="Estimated monthly premium in INR")
    annual_usd: float = Field(..., description="Estimated annual premium in USD")
    monthly_usd: float = Field(..., description="Estimated monthly premium in USD")

class PolicyPlan(BaseModel):
    tier: str = Field(..., description="Bronze Essential, Silver Shield, Gold Comprehensive, or Platinum Elite")
    badge: Optional[str] = Field(None, description="e.g. 'Best Value' or 'Most Popular'")
    annual_inr: float
    monthly_inr: float
    annual_usd: float
    monthly_usd: float
    sum_insured_inr: str
    sum_insured_usd: str
    copay: str
    features: List[str]

class PredictionResponse(BaseModel):
    # Backward compatible fields
    predicted_category: str = Field(..., description="Predicted category of the insurance premium (Low, Medium, High)", example="High")
    predicted_class: str = Field(..., description="Alias for predicted_category for backward compatibility", example="High")
    confidence: float = Field(..., description="Confidence score of the prediction", example=0.85)
    class_probabilities: Dict[str, float] = Field(..., description="Probabilities for each class", example={"Low": 0.1, "Medium": 0.3, "High": 0.6})
    
    # Advanced Intelligence Fields
    risk_score: float = Field(default=50.0, description="Comprehensive risk score on 0-100 scale", example=35.5)
    risk_level: str = Field(default="Standard", description="Qualitative risk tier description", example="Favorable Standard Risk")
    pricing: Optional[PremiumPricing] = Field(None, description="Dynamic actuarial estimated premium quotes")
    risk_factors: Optional[List[RiskFactor]] = Field(default_factory=list, description="SHAP-style explainable feature breakdown")
    health_advisory: Optional[List[str]] = Field(default_factory=list, description="Personalized preventive health advisories")
    potential_savings: Optional[Dict[str, Any]] = Field(None, description="What-if lifestyle financial savings analysis")
    recommended_plans: Optional[List[PolicyPlan]] = Field(default_factory=list, description="Tiered policy packages")