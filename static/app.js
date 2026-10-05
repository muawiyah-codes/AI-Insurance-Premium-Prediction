/* ==========================================================================
   AURA UNDERWRITE - INTERACTIVE APPLICATION CONTROLLER
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Global State
  const state = {
    currency: "INR", // "INR" or "USD"
    currencySymbol: "₹",
    exchangeRate: 85.0,
    latestPrediction: null,
    sampleProfiles: [],
    modelInfo: null,
    batchData: []
  };

  // City Tier reference
  const tier1Cities = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune"];
  const tier2Cities = [
    "Jaipur", "Chandigarh", "Indore", "Lucknow", "Patna", "Ranchi", "Visakhapatnam",
    "Coimbatore", "Bhopal", "Nagpur", "Vadodara", "Surat", "Rajkot", "Jodhpur",
    "Raipur", "Amritsar", "Varanasi", "Agra", "Dehradun", "Mysore", "Ahmedabad"
  ];

  // DOM Elements
  const ageSlider = document.getElementById("input-age");
  const ageVal = document.getElementById("val-age");
  const heightInput = document.getElementById("input-height");
  const heightVal = document.getElementById("val-height");
  const weightInput = document.getElementById("input-weight");
  const weightVal = document.getElementById("val-weight");
  const liveBmi = document.getElementById("live-bmi");
  const liveBmiBadge = document.getElementById("live-bmi-badge");
  const smokerToggle = document.getElementById("input-smoker");
  const smokerStatusText = document.getElementById("smoker-status-text");
  const incomeSlider = document.getElementById("input-income");
  const incomeVal = document.getElementById("val-income");
  const cityInput = document.getElementById("input-city");
  const cityTierBadge = document.getElementById("city-tier-badge");
  const occupationOptions = document.querySelectorAll(".occupation-option");
  const btnCalculateQuote = document.getElementById("btn-calculate-quote");

  // Telemetry Elements
  const needleLine = document.getElementById("gauge-needle-line");
  const displayRiskScore = document.getElementById("display-risk-score");
  const displayRiskTier = document.getElementById("display-risk-tier");
  const riskTierText = document.getElementById("risk-tier-text");
  const annualPriceNum = document.getElementById("annual-price-num");
  const monthlyPriceText = document.getElementById("monthly-price-text");
  const currencySymbolElem = document.getElementById("currency-symbol");
  const confidenceTag = document.getElementById("confidence-tag");
  const probValLow = document.getElementById("prob-val-low");
  const probValMed = document.getElementById("prob-val-med");
  const probValHigh = document.getElementById("prob-val-high");
  const probBarLow = document.getElementById("prob-bar-low");
  const probBarMed = document.getElementById("prob-bar-med");
  const probBarHigh = document.getElementById("prob-bar-high");
  const riskFactorsContainer = document.getElementById("risk-factors-container");

  // What-If Simulator Elements
  const simSmokerToggle = document.getElementById("sim-smoker-toggle");
  const simBmiSlider = document.getElementById("sim-bmi-slider");
  const simValBmi = document.getElementById("sim-val-bmi");
  const btnRunSimulation = document.getElementById("btn-run-simulation");
  const simBasePrice = document.getElementById("sim-base-price");
  const simBaseScore = document.getElementById("sim-base-score");
  const simNewPrice = document.getElementById("sim-new-price");
  const simNewScore = document.getElementById("sim-new-score");
  const simAnnualSavings = document.getElementById("sim-annual-savings");
  const simDiscountPct = document.getElementById("sim-discount-pct");
  const sim1yrSavings = document.getElementById("sim-1yr-savings");
  const sim5yrSavings = document.getElementById("sim-5yr-savings");
  const sim10yrSavings = document.getElementById("sim-10yr-savings");
  const simAdvisoryList = document.getElementById("sim-advisory-list");

  // Policy Plans Container
  const plansGridContainer = document.getElementById("plans-grid-container");

  // Batch Elements
  const btnLoadDemoBatch = document.getElementById("btn-load-demo-batch");
  const batchFileInput = document.getElementById("batch-file-input");
  const btnExportBatchCsv = document.getElementById("btn-export-batch-csv");
  const batchTotalCount = document.getElementById("batch-total-count");
  const batchDistVal = document.getElementById("batch-dist-val");
  const batchAvgRisk = document.getElementById("batch-avg-risk");
  const batchTotalPremium = document.getElementById("batch-total-premium");
  const batchTableBody = document.getElementById("batch-table-body");

  // Model & Benchmark Elements
  const featureImportanceBars = document.getElementById("feature-importance-bars");
  const btnRunBenchmark = document.getElementById("btn-run-benchmark");
  const benchmarkResultText = document.getElementById("benchmark-result-text");

  // Certificate Modal Elements
  const certificateModal = document.getElementById("certificate-modal");
  const btnOpenCertificate = document.getElementById("btn-open-certificate");
  const btnCloseCert = document.getElementById("btn-close-cert");
  const btnCancelModal = document.getElementById("btn-cancel-modal");
  const btnPrintCertificate = document.getElementById("btn-print-certificate");

  /* ==========================================================================
     INITIALIZATION & EVENT BINDINGS
     ========================================================================== */

  initTabs();
  initCurrencySwitcher();
  initFormListeners();
  loadSampleProfiles();
  loadModelMetadata();

  // Execute initial quote prediction on page load
  executeQuotePrediction();

  /* ==========================================================================
     TABS NAVIGATION
     ========================================================================== */
  function initTabs() {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabPanels = document.querySelectorAll(".view-panel");

    tabButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const targetTab = btn.getAttribute("data-tab");
        tabButtons.forEach(b => b.classList.remove("active"));
        tabPanels.forEach(p => p.classList.remove("active"));

        btn.classList.add("active");
        const activePanel = document.getElementById(targetTab);
        if (activePanel) activePanel.classList.add("active");

        if (targetTab === "tab-simulator") {
          runSimulation();
        }
      });
    });

    // Jump from telemetry to simulator
    const btnJumpSimulator = document.getElementById("btn-jump-simulator");
    if (btnJumpSimulator) {
      btnJumpSimulator.addEventListener("click", () => {
        const simTabBtn = document.querySelector('[data-tab="tab-simulator"]');
        if (simTabBtn) simTabBtn.click();
      });
    }
  }

  /* ==========================================================================
     CURRENCY SWITCHER (INR / USD)
     ========================================================================== */
  function initCurrencySwitcher() {
    const currencyButtons = document.querySelectorAll(".currency-btn");
    currencyButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        currencyButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.currency = btn.getAttribute("data-currency");
        state.currencySymbol = state.currency === "INR" ? "₹" : "$";
        currencySymbolElem.textContent = state.currencySymbol;

        // Re-render prices with new currency
        if (state.latestPrediction) {
          updateQuoteDisplay(state.latestPrediction);
          renderPolicyPlans(state.latestPrediction);
        }
        if (state.batchData.length > 0) {
          renderBatchTable(state.batchData);
        }
      });
    });
  }

  /* ==========================================================================
     FORM INTERACTION & LIVE BIOMETRIC CALCULATIONS
     ========================================================================== */
  function initFormListeners() {
    // Age Slider
    ageSlider.addEventListener("input", () => {
      ageVal.textContent = `${ageSlider.value} yrs`;
      updateDevCode();
    });

    // Height & Weight -> Live BMI
    function updateBmi() {
      const h = parseFloat(heightInput.value) || 1.75;
      const w = parseFloat(weightInput.value) || 72.0;
      heightVal.textContent = `${h.toFixed(2)} m`;
      weightVal.textContent = `${w.toFixed(1)} kg`;

      const bmi = w / (h * h);
      liveBmi.textContent = bmi.toFixed(1);

      // BMI category badge
      liveBmiBadge.className = "bmi-category-badge";
      if (bmi < 18.5) {
        liveBmiBadge.textContent = "Underweight";
        liveBmiBadge.classList.add("badge-standard");
      } else if (bmi < 25.0) {
        liveBmiBadge.textContent = "Healthy Normal";
        liveBmiBadge.classList.add("badge-low");
      } else if (bmi < 30.0) {
        liveBmiBadge.textContent = "Overweight";
        liveBmiBadge.classList.add("badge-senior");
      } else {
        liveBmiBadge.textContent = "Obesity Range";
        liveBmiBadge.classList.add("badge-high");
      }

      updateDevCode();
    }

    heightInput.addEventListener("input", updateBmi);
    weightInput.addEventListener("input", updateBmi);
    updateBmi();

    // Smoker Switch
    smokerToggle.addEventListener("change", () => {
      if (smokerToggle.checked) {
        smokerStatusText.textContent = "Active Tobacco Consumer (+38.5% Surcharge Risk)";
        smokerStatusText.style.color = "#f87171";
      } else {
        smokerStatusText.textContent = "Non-Smoker (Qualifies for preferred discount)";
        smokerStatusText.style.color = "var(--text-dim)";
      }
      updateDevCode();
    });

    // Income Slider
    incomeSlider.addEventListener("input", () => {
      incomeVal.textContent = `${parseFloat(incomeSlider.value).toFixed(1)} LPA`;
      updateDevCode();
    });

    // City Tier Detection
    cityInput.addEventListener("input", () => {
      const city = cityInput.value.trim().toLowerCase();
      const isTier1 = tier1Cities.some(c => c.toLowerCase() === city);
      const isTier2 = tier2Cities.some(c => c.toLowerCase() === city);

      if (isTier1) {
        cityTierBadge.textContent = "Tier 1 Metro";
        cityTierBadge.className = "label-val badge-standard";
      } else if (isTier2) {
        cityTierBadge.textContent = "Tier 2 Urban";
        cityTierBadge.className = "label-val badge-low";
      } else {
        cityTierBadge.textContent = "Tier 3 Regional";
        cityTierBadge.className = "label-val";
      }
      updateDevCode();
    });

    // Occupation Selector
    occupationOptions.forEach(opt => {
      opt.addEventListener("click", () => {
        occupationOptions.forEach(o => o.classList.remove("active"));
        opt.classList.add("active");
        updateDevCode();
      });
    });

    // Calculate Button
    btnCalculateQuote.addEventListener("click", executeQuotePrediction);

    // Simulator Slider
    simBmiSlider.addEventListener("input", () => {
      simValBmi.textContent = `${parseFloat(simBmiSlider.value).toFixed(1)} kg/m²`;
    });
    btnRunSimulation.addEventListener("click", runSimulation);

    // Benchmark Button
    btnRunBenchmark.addEventListener("click", runBenchmarkTest);

    // Modal Certificate Triggers
    btnOpenCertificate.addEventListener("click", openCertificateModal);
    btnCloseCert.addEventListener("click", closeCertificateModal);
    btnCancelModal.addEventListener("click", closeCertificateModal);
    btnPrintCertificate.addEventListener("click", () => window.print());

    // Batch Actions
    btnLoadDemoBatch.addEventListener("click", loadDemoBatch);
    batchFileInput.addEventListener("change", handleCsvUpload);
    btnExportBatchCsv.addEventListener("click", exportBatchCsv);
  }

  /* ==========================================================================
     LOAD PRESET PERSONAS
     ========================================================================== */
  async function loadSampleProfiles() {
    try {
      const res = await fetch("/api/sample-profiles");
      if (!res.ok) return;
      state.sampleProfiles = await res.json();

      const container = document.getElementById("persona-chips");
      container.innerHTML = "";

      state.sampleProfiles.forEach(prof => {
        const chip = document.createElement("div");
        chip.className = "persona-chip";
        chip.innerHTML = `
          <span>${prof.label}</span>
          <span class="persona-badge ${getBadgeClass(prof.tag)}">${prof.tag}</span>
        `;
        chip.addEventListener("click", () => {
          document.querySelectorAll(".persona-chip").forEach(c => c.classList.remove("active"));
          chip.classList.add("active");
          applyProfileToForm(prof);
        });
        container.appendChild(chip);
      });
    } catch (e) {
      console.warn("Could not load sample profiles:", e);
    }
  }

  function getBadgeClass(tag) {
    if (tag.includes("Low")) return "badge-low";
    if (tag.includes("High")) return "badge-high";
    if (tag.includes("Senior")) return "badge-senior";
    return "badge-standard";
  }

  function applyProfileToForm(prof) {
    ageSlider.value = prof.age;
    ageVal.textContent = `${prof.age} yrs`;

    heightInput.value = prof.height;
    weightInput.value = prof.weight;
    heightVal.textContent = `${prof.height.toFixed(2)} m`;
    weightVal.textContent = `${prof.weight.toFixed(1)} kg`;

    const bmi = prof.weight / (prof.height * prof.height);
    liveBmi.textContent = bmi.toFixed(1);

    smokerToggle.checked = prof.smoker;
    if (prof.smoker) {
      smokerStatusText.textContent = "Active Tobacco Consumer (+38.5% Surcharge Risk)";
      smokerStatusText.style.color = "#f87171";
    } else {
      smokerStatusText.textContent = "Non-Smoker (Qualifies for preferred discount)";
      smokerStatusText.style.color = "var(--text-dim)";
    }

    incomeSlider.value = prof.income_lpa;
    incomeVal.textContent = `${prof.income_lpa.toFixed(1)} LPA`;

    cityInput.value = prof.city;
    cityInput.dispatchEvent(new Event("input"));

    occupationOptions.forEach(opt => {
      if (opt.getAttribute("data-occupation") === prof.occupation) {
        opt.classList.add("active");
      } else {
        opt.classList.remove("active");
      }
    });

    executeQuotePrediction();
  }

  /* ==========================================================================
     EXECUTE QUOTE PREDICTION (/predict)
     ========================================================================== */
  async function executeQuotePrediction() {
    const activeOcc = document.querySelector(".occupation-option.active");
    const occupation = activeOcc ? activeOcc.getAttribute("data-occupation") : "salaried";

    const payload = {
      age: parseInt(ageSlider.value),
      weight: parseFloat(weightInput.value),
      height: parseFloat(heightInput.value),
      income_lpa: parseFloat(incomeSlider.value),
      smoker: smokerToggle.checked,
      city: cityInput.value.trim() || "Mumbai",
      occupation: occupation
    };

    btnCalculateQuote.innerHTML = `
      <svg class="pulse-dot" style="display:inline-block; margin-right:8px;"></svg>
      <span>Analyzing Risk Factors...</span>
    `;
    btnCalculateQuote.style.opacity = "0.8";

    try {
      const response = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      state.latestPrediction = data;
      updateQuoteDisplay(data);
      renderPolicyPlans(data);
      updateDevCode();

    } catch (err) {
      console.error("Prediction error:", err);
    } finally {
      btnCalculateQuote.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        <span>Calculate AI Premium Quote</span>
      `;
      btnCalculateQuote.style.opacity = "1";
    }
  }

  /* ==========================================================================
     UPDATE TELEMETRY & RESULTS DISPLAY
     ========================================================================== */
  function updateQuoteDisplay(data) {
    const score = data.risk_score || 50.0;
    displayRiskScore.textContent = score.toFixed(1);

    // Speedometer Needle Animation: (score / 100) * 180 degrees
    const needleDeg = (score / 100.0) * 180.0;
    needleLine.style.transform = `rotate(${needleDeg}deg)`;

    // Risk Tier Pill & Category
    const cat = data.predicted_category || "Standard";
    riskTierText.textContent = data.risk_level || `${cat} Risk Tier`;

    displayRiskTier.className = "risk-tier-pill";
    if (cat === "Low") {
      displayRiskTier.classList.add("badge-low");
    } else if (cat === "Medium") {
      displayRiskTier.classList.add("badge-senior");
    } else {
      displayRiskTier.classList.add("badge-high");
    }

    // Dynamic Price
    const pricing = data.pricing || {};
    const isINR = state.currency === "INR";
    const annualVal = isINR ? (pricing.annual_inr || 12000) : (pricing.annual_usd || 140);
    const monthlyVal = isINR ? (pricing.monthly_inr || 1000) : (pricing.monthly_usd || 12);

    animateNumber(annualPriceNum, annualVal);
    monthlyPriceText.textContent = `Approx. ${state.currencySymbol}${monthlyVal.toLocaleString()} / month`;

    // Confidence
    const confPct = Math.round((data.confidence || 0.95) * 1000) / 10;
    confidenceTag.textContent = `${confPct}% Confidence`;

    // Class Probabilities
    const probs = data.class_probabilities || {};
    const pLow = Math.round((probs.Low || 0) * 1000) / 10;
    const pMed = Math.round((probs.Medium || 0) * 1000) / 10;
    const pHigh = Math.round((probs.High || 0) * 1000) / 10;

    probValLow.textContent = `${pLow}%`;
    probBarLow.style.width = `${pLow}%`;

    probValMed.textContent = `${pMed}%`;
    probBarMed.style.width = `${pMed}%`;

    probValHigh.textContent = `${pHigh}%`;
    probBarHigh.style.width = `${pHigh}%`;

    // Explainable Risk Factors
    renderRiskFactors(data.risk_factors || []);
  }

  function renderRiskFactors(factors) {
    riskFactorsContainer.innerHTML = "";
    if (factors.length === 0) {
      riskFactorsContainer.innerHTML = `<div style="font-size:0.8rem; color:var(--text-dim);">No significant risk anomalies flagged.</div>`;
      return;
    }

    factors.slice(0, 4).forEach(f => {
      const isRisk = f.direction === "risk_increase";
      const iconColor = isRisk ? "var(--accent-rose)" : "var(--accent-emerald)";
      const item = document.createElement("div");
      item.style.cssText = "display:flex; align-items:flex-start; gap:0.6rem; margin-bottom:0.75rem; font-size:0.82rem;";
      item.innerHTML = `
        <span style="color:${iconColor}; font-weight:700; margin-top:1px;">${isRisk ? "▲" : "▼"}</span>
        <div style="flex:1;">
          <strong style="color:#ffffff;">${f.feature}</strong>: 
          <span style="color:var(--text-muted);">${f.insight}</span>
        </div>
      `;
      riskFactorsContainer.appendChild(item);
    });
  }

  function animateNumber(element, target) {
    const start = parseInt(element.textContent.replace(/,/g, "")) || 0;
    const duration = 600;
    const startTime = performance.now();

    function update(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const current = Math.floor(start + (target - start) * progress);
      element.textContent = current.toLocaleString();
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  /* ==========================================================================
     WHAT-IF SIMULATOR CONTROLLER
     ========================================================================== */
  async function runSimulation() {
    const isSmoker = smokerToggle.checked;
    const currentBmi = parseFloat(liveBmi.textContent) || 23.5;

    // Set simulator defaults based on current profile
    simSmokerToggle.checked = false; // default to non-smoker for what-if
    simBmiSlider.value = Math.min(22.5, currentBmi);
    simValBmi.textContent = `${parseFloat(simBmiSlider.value).toFixed(1)} kg/m²`;

    const activeOcc = document.querySelector(".occupation-option.active");
    const occupation = activeOcc ? activeOcc.getAttribute("data-occupation") : "salaried";

    const payload = {
      age: parseInt(ageSlider.value),
      weight: parseFloat(weightInput.value),
      height: parseFloat(heightInput.value),
      income_lpa: parseFloat(incomeSlider.value),
      smoker: isSmoker,
      city: cityInput.value.trim() || "Mumbai",
      occupation: occupation,
      target_bmi: parseFloat(simBmiSlider.value),
      target_smoker: simSmokerToggle.checked
    };

    try {
      const res = await fetch("/api/simulate-what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) return;
      const data = await res.json();

      const isINR = state.currency === "INR";
      const sym = state.currencySymbol;

      const baseAnnual = isINR ? data.baseline.annual_inr : data.baseline.annual_usd;
      const simAnnual = isINR ? data.simulated.annual_inr : data.simulated.annual_usd;
      const annualSavings = isINR ? data.savings.annual_inr : data.savings.annual_usd;
      const fiveYearSavings = isINR ? data.savings.five_year_inr : data.savings.five_year_usd;
      const tenYearSavings = isINR ? data.savings.ten_year_inr : data.savings.ten_year_usd;

      simBasePrice.textContent = `${sym}${baseAnnual.toLocaleString()} / yr`;
      simBaseScore.textContent = `Risk Score: ${data.baseline.risk_score.toFixed(1)} (${data.baseline.category})`;

      simNewPrice.textContent = `${sym}${simAnnual.toLocaleString()} / yr`;
      simNewScore.textContent = `Risk Score: ${data.simulated.risk_score.toFixed(1)} (${data.simulated.category})`;

      simAnnualSavings.textContent = `${sym}${annualSavings.toLocaleString()}`;
      simDiscountPct.textContent = `${data.savings.percentage_discount}% Total Premium Reduction`;

      sim1yrSavings.textContent = formatCompact(annualSavings, sym);
      sim5yrSavings.textContent = formatCompact(fiveYearSavings, sym);
      sim10yrSavings.textContent = formatCompact(tenYearSavings, sym);

      // Advisory items
      simAdvisoryList.innerHTML = "";
      const tips = [
        "Transitioning to verified non-smoker status eliminates the primary ~32% morbidity surcharge.",
        `Maintaining target BMI ${payload.target_bmi} brings metabolic metrics into favorable standard underwriting.`,
        `Enjoy cumulative long-term savings of ${sym}${tenYearSavings.toLocaleString()} over a 10-year policy horizon.`
      ];
      tips.forEach(t => {
        const li = document.createElement("li");
        li.style.cssText = "margin-bottom:0.6rem; font-size:0.88rem; color:var(--text-muted); display:flex; gap:0.5rem;";
        li.innerHTML = `<span style="color:var(--accent-emerald);">✔</span> <span>${t}</span>`;
        simAdvisoryList.appendChild(li);
      });

    } catch (e) {
      console.warn("Simulation failed:", e);
    }
  }

  function formatCompact(val, sym) {
    if (sym === "₹") {
      if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
      if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
      return `₹${val.toLocaleString()}`;
    } else {
      if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
      return `$${val.toLocaleString()}`;
    }
  }

  /* ==========================================================================
     POLICY PLANS RENDERING
     ========================================================================== */
  function renderPolicyPlans(prediction) {
    const plans = prediction.recommended_plans || [];
    plansGridContainer.innerHTML = "";

    const isINR = state.currency === "INR";
    const sym = state.currencySymbol;

    plans.forEach(plan => {
      const isFeatured = plan.badge === "Best Value" || plan.tier.includes("Gold");
      const card = document.createElement("div");
      card.className = `plan-card ${isFeatured ? "featured" : ""}`;

      const annualPrice = isINR ? plan.annual_inr : plan.annual_usd;
      const monthlyPrice = isINR ? plan.monthly_inr : plan.monthly_usd;
      const sumInsured = isINR ? plan.sum_insured_inr : plan.sum_insured_usd;

      card.innerHTML = `
        ${plan.badge ? `<div class="plan-badge-top">${plan.badge}</div>` : ""}
        <div class="plan-tier-name">${plan.tier}</div>
        <div class="plan-sum-insured">Coverage: ${sumInsured}</div>

        <div class="plan-price-wrap">
          <div style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase;">Annual Premium</div>
          <div class="plan-price-num">${sym}${annualPrice.toLocaleString()}</div>
          <div style="font-size:0.8rem; color:var(--text-highlight);">${sym}${monthlyPrice.toLocaleString()} / month</div>
        </div>

        <div style="font-size:0.8rem; font-weight:700; color:#ffffff; margin-bottom:0.6rem;">${plan.copay}</div>
        <ul class="plan-features-list">
          ${plan.features.map(f => `
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              <span>${f}</span>
            </li>
          `).join("")}
        </ul>

        <button class="btn-select-plan" onclick="alert('Plan selected: ${plan.tier}. Proceed to policy purchase.')">Select ${plan.tier}</button>
      `;
      plansGridContainer.appendChild(card);
    });
  }

  /* ==========================================================================
     BATCH CSV PROCESSING
     ========================================================================== */
  async function loadDemoBatch() {
    const demoProfiles = [
      { id: "APP-101", name: "Aarav Sharma", age: 24, weight: 68, height: 1.75, income_lpa: 10, smoker: false, city: "Bangalore", occupation: "salaried" },
      { id: "APP-102", name: "Pooja Patel", age: 38, weight: 82, height: 1.62, income_lpa: 18, smoker: false, city: "Mumbai", occupation: "self-employed" },
      { id: "APP-103", name: "Vikram Malhotra", age: 52, weight: 94, height: 1.74, income_lpa: 35, smoker: true, city: "Delhi", occupation: "salaried" },
      { id: "APP-104", name: "Rohan Gupta", age: 21, weight: 61, height: 1.70, income_lpa: 3.5, smoker: false, city: "Jaipur", occupation: "student" },
      { id: "APP-105", name: "Suresh Iyer", age: 64, weight: 70, height: 1.66, income_lpa: 14, smoker: false, city: "Chennai", occupation: "retired" }
    ];
    processBatchProfiles(demoProfiles);
  }

  function handleCsvUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const profiles = parseCsv(text);
      if (profiles.length > 0) {
        processBatchProfiles(profiles);
      } else {
        alert("No valid records found in CSV. Please verify CSV format.");
      }
    };
    reader.readAsText(file);
  }

  function parseCsv(text) {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(",").map(v => v.trim());
      if (row.length < 4) continue;

      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx];
      });

      records.push({
        id: obj.id || `APP-${1000 + i}`,
        name: obj.name || `Applicant #${i}`,
        age: parseInt(obj.age) || 30,
        weight: parseFloat(obj.weight) || 70,
        height: parseFloat(obj.height) || 1.75,
        income_lpa: parseFloat(obj.income_lpa) || 10,
        smoker: String(obj.smoker).toLowerCase() === "true" || obj.smoker === "1",
        city: obj.city || "Mumbai",
        occupation: obj.occupation || "salaried"
      });
    }
    return records;
  }

  async function processBatchProfiles(profiles) {
    btnLoadDemoBatch.innerHTML = `<span>Processing Batch (${profiles.length})...</span>`;
    try {
      const res = await fetch("/api/predict/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profiles: profiles })
      });
      if (!res.ok) throw new Error("Batch processing failed");
      const result = await res.json();
      state.batchData = result.records;

      // Update Summary Cards
      batchTotalCount.textContent = result.total_records;
      const dist = result.summary.category_distribution;
      batchDistVal.textContent = `L: ${dist.Low || 0} | M: ${dist.Medium || 0} | H: ${dist.High || 0}`;
      batchAvgRisk.textContent = `${result.summary.average_risk_score} / 100`;

      const isINR = state.currency === "INR";
      const totalVol = isINR ? result.summary.total_portfolio_premium_inr : result.summary.total_portfolio_premium_usd;
      batchTotalPremium.textContent = `${state.currencySymbol}${totalVol.toLocaleString()}`;

      renderBatchTable(state.batchData);

    } catch (err) {
      console.error(err);
      alert("Batch execution error: " + err.message);
    } finally {
      btnLoadDemoBatch.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span>Load Sample Applicants (5 Cases)</span>
      `;
    }
  }

  function renderBatchTable(records) {
    batchTableBody.innerHTML = "";
    const isINR = state.currency === "INR";
    const sym = state.currencySymbol;

    records.forEach(r => {
      const tr = document.createElement("tr");
      const catClass = r.predicted_category === "Low" ? "badge-low" : (r.predicted_category === "High" ? "badge-high" : "badge-senior");
      const annualPrice = isINR ? r.annual_premium_inr : r.annual_premium_usd;

      tr.innerHTML = `
        <td style="font-family:var(--font-mono); color:var(--text-highlight);">${r.applicant_id}</td>
        <td><strong>${r.name}</strong></td>
        <td>${r.age} yrs</td>
        <td>${r.bmi.toFixed(1)}</td>
        <td>${r.smoker ? `<span style="color:#f87171; font-weight:700;">Smoker</span>` : `<span style="color:#34d399;">Non-Smoker</span>`}</td>
        <td>${r.income_lpa.toFixed(1)} LPA</td>
        <td>${r.city}</td>
        <td><span class="persona-badge ${catClass}">${r.predicted_category} Risk</span></td>
        <td>${Math.round(r.confidence * 100)}%</td>
        <td style="font-family:var(--font-heading); font-weight:700; color:#ffffff;">${sym}${annualPrice.toLocaleString()}</td>
      `;
      batchTableBody.appendChild(tr);
    });
  }

  function exportBatchCsv() {
    if (state.batchData.length === 0) {
      alert("No batch records available to export. Please load or process data first.");
      return;
    }

    const headers = ["Applicant ID", "Name", "Age", "BMI", "Smoker", "Income_LPA", "City", "Predicted_Tier", "Confidence", "Annual_Quote_INR", "Annual_Quote_USD"];
    const rows = state.batchData.map(r => [
      r.applicant_id,
      `"${r.name}"`,
      r.age,
      r.bmi.toFixed(2),
      r.smoker,
      r.income_lpa,
      `"${r.city}"`,
      r.predicted_category,
      r.confidence,
      r.annual_premium_inr,
      r.annual_premium_usd
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Aura_Underwrite_Portfolio_Predictions_${Date.now()}.csv`;
    link.click();
  }

  /* ==========================================================================
     MODEL METADATA & LATENCY BENCHMARK
     ========================================================================== */
  async function loadModelMetadata() {
    try {
      const res = await fetch("/api/model/info");
      if (!res.ok) return;
      state.modelInfo = await res.json();

      const imps = state.modelInfo.feature_importances || [];
      featureImportanceBars.innerHTML = "";

      imps.slice(0, 7).forEach(item => {
        const pct = Math.round(item.importance * 1000) / 10;
        const cleanName = formatFeatureName(item.feature);
        const row = document.createElement("div");
        row.className = "feature-bar-row";
        row.innerHTML = `
          <div class="feature-bar-meta">
            <span>${cleanName}</span>
            <span style="font-family:var(--font-mono); color:var(--accent-cyan);">${pct}%</span>
          </div>
          <div class="feature-track">
            <div class="feature-fill" style="width: ${Math.min(pct * 2.8, 100)}%;"></div>
          </div>
        `;
        featureImportanceBars.appendChild(row);
      });
    } catch (e) {
      console.warn("Could not load model metadata:", e);
    }
  }

  function formatFeatureName(name) {
    if (name.includes("smoker_True")) return "Smoker Status (Active Tobacco)";
    if (name.includes("smoker_False")) return "Non-Smoker Status (Abstinence)";
    if (name.includes("num__age")) return "Biometric Age (Years)";
    if (name.includes("num__bmi")) return "Body Mass Index (BMI)";
    if (name.includes("age_group_senior")) return "Senior Age Bracket (60+)";
    if (name.includes("income_lpa")) return "Annual Income Solvency";
    if (name.includes("lifestyle_risk")) return "Lifestyle Risk Factor Rating";
    return name.replace("cat__", "").replace("num__", "").replace(/_/g, " ").toUpperCase();
  }

  async function runBenchmarkTest() {
    btnRunBenchmark.innerHTML = `<span>Benchmarking...</span>`;
    try {
      const res = await fetch("/api/benchmark");
      if (!res.ok) return;
      const data = await res.json();
      benchmarkResultText.innerHTML = `
        <strong>${data.avg_latency_ms} ms</strong> / req &bull; 
        <span style="color:var(--accent-emerald);">${data.throughput_req_per_sec.toLocaleString()} req/sec</span>
      `;
    } catch (e) {
      benchmarkResultText.textContent = "Benchmark timed out.";
    } finally {
      btnRunBenchmark.innerHTML = `<span>Test Again</span>`;
    }
  }

  /* ==========================================================================
     DEVELOPER CODE PLAYGROUND UPDATE
     ========================================================================== */
  function updateDevCode() {
    const age = ageSlider.value;
    const height = heightInput.value;
    const weight = weightInput.value;
    const income = incomeSlider.value;
    const smoker = smokerToggle.checked;
    const city = cityInput.value || "Mumbai";
    const activeOcc = document.querySelector(".occupation-option.active");
    const occupation = activeOcc ? activeOcc.getAttribute("data-occupation") : "salaried";

    const curlElem = document.getElementById("code-curl");
    if (curlElem) {
      curlElem.textContent = `curl -X POST "http://localhost:8000/predict" \\
  -H "Content-Type: application/json" \\
  -d '{"age": ${age}, "weight": ${weight}, "height": ${height}, "income_lpa": ${income}, "smoker": ${smoker}, "city": "${city}", "occupation": "${occupation}"}'`;
    }
  }

  /* ==========================================================================
     CERTIFICATE MODAL & PRINTING
     ========================================================================== */
  function openCertificateModal() {
    if (!state.latestPrediction) return;

    const certAge = document.getElementById("cert-age");
    const certBmi = document.getElementById("cert-bmi");
    const certSmoker = document.getElementById("cert-smoker");
    const certCity = document.getElementById("cert-city");
    const certOccupation = document.getElementById("cert-occupation");
    const certRiskScore = document.getElementById("cert-risk-score");
    const certRatingClass = document.getElementById("cert-rating-class");
    const certAnnualQuote = document.getElementById("cert-annual-quote");
    const certHash = document.getElementById("cert-hash");
    const certTimestamp = document.getElementById("cert-timestamp");

    const p = state.latestPrediction;
    certAge.textContent = `${ageSlider.value} Years`;
    certBmi.textContent = `${liveBmi.textContent} kg/m² (${liveBmiBadge.textContent})`;
    certSmoker.textContent = smokerToggle.checked ? "Active Tobacco Consumer" : "Verified Non-Smoker";
    certCity.textContent = `${cityInput.value} (${cityTierBadge.textContent})`;
    
    const activeOcc = document.querySelector(".occupation-option.active");
    certOccupation.textContent = activeOcc ? activeOcc.textContent : "Salaried";

    certRiskScore.textContent = `${(p.risk_score || 50).toFixed(1)} / 100`;
    certRatingClass.textContent = (p.risk_level || "STANDARD RISK TIER").toUpperCase();

    const inrVal = p.pricing ? p.pricing.annual_inr : 12000;
    const usdVal = p.pricing ? p.pricing.annual_usd : 140;
    certAnnualQuote.textContent = `Guaranteed Base Annual Premium: ₹${inrVal.toLocaleString()} / year ($${usdVal.toLocaleString()} USD)`;

    // Random verification hash & timestamp
    const hash = Array.from({length: 20}, () => Math.floor(Math.random() * 16).toString(16)).join("");
    certHash.textContent = `VERIFICATION HASH: ${hash}`;
    certTimestamp.textContent = `Date of Assessment: ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric", day: "numeric" })} • Certificate ID: INS-${Date.now().toString().slice(-6)}`;

    certificateModal.classList.add("active");
  }

  function closeCertificateModal() {
    certificateModal.classList.remove("active");
  }
});
