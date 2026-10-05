from pydantic import BaseModel, Field, computed_field, field_validator
from typing import Annotated, Literal
from config.city_tier import tier_1_cities, tier_2_cities

#pydantic model to validate the incoming data
class UserInput(BaseModel):
    age: Annotated[int, Field(..., gt=0, lt=120, description="Age of the user")]
    weight: Annotated[float, Field(..., gt=0, description="Weight of the user in kg")]
    height: Annotated[float, Field(..., gt=0, description="Height of the user in meters")]
    income_lpa: Annotated[float, Field(..., gt=0, description="Income of the user in LPA")]
    smoker: Annotated[bool, Field(..., description="Whether the user is a smoker or not")]
    city: Annotated[str, Field(..., description="City where the user lives")]
    occupation: Annotated[
        Literal["salaried", "student", "unemployed", "self-employed", "retired"],
        Field(..., description="Occupation of the user"),
    ]

    # computed field to calculate BMI
    @computed_field
    @property
    def bmi(self) -> float:
        return self.weight / (self.height ** 2)

    #field validator for city
    @field_validator("city")
    @classmethod
    def normalized_city(cls, v: str) -> str:
        return v.strip().title()

    # computed field for lifestyle_risk based on smoker status and BMI
    @computed_field
    @property
    def lifestyle_risk(self) -> str:
        if self.smoker and self.bmi > 30:
            return "high"
        elif self.smoker or self.bmi > 27:
            return "medium"
        else:
            return "low"

    # computed field for age_group based on age
    @computed_field
    @property
    def age_group(self) -> str:
        if self.age < 25:
            return "young"
        elif self.age < 40:
            return "adult"
        elif self.age < 60:
            return "middle_age"
        return "senior"
    
    # computed field for city_tier based on city
    @computed_field
    @property
    def city_tier(self) -> int:
        if self.city in tier_1_cities:
            return 1
        elif self.city in tier_2_cities:
            return 2
        else:
            return 3
