# Paddock: Financial Assumptions Document

**Version:** 1.0  
**Date:** January 2026  
**Purpose:** Support investor due diligence by explicitly documenting all assumptions underlying financial projections

---

## Executive Summary

This document outlines the key assumptions in Paddock's financial model. We distinguish between **proven** assumptions (validated through research or testing), **reasonable** assumptions (industry benchmarks with strong evidence), and **speculative** assumptions (requiring validation in Phases 1-2).

**Confidence Level:** Medium-High overall, with specific validation plans for remaining uncertainties.

---

## 1. Market Assumptions

### 1.1 Market Size

| Assumption | Value | Source | Status |
|------------|-------|--------|--------|
| Australian Microgreens Market (2024) | $21.3M USD | OpenPR Report | **Reasonable** |
| Microgreens CAGR (2025-2033) | 8.6% | OpenPR Report | **Reasonable** |
| Australian Organic Food Market | $1.1B USD | IMARC Group | **Proven** |
| Organic Food CAGR | 7.49% | IMARC Group | **Proven** |

**Validation Status:** Market size figures come from industry reports with consistent methodology. However, microgreens market data is less mature than organic food data.

**Risk Factor:** Microgreens market may be smaller than reported (niche tracking is less reliable).

**Mitigation:** Our model works even with 50% smaller addressable market.

### 1.2 Target User Base (Australia)

| Segment | Estimated Size | Basis |
|---------|----------------|-------|
| Hobbyist Growers | 50,000+ | Reddit community size, farmers market vendors |
| Market Gardeners | 5,000+ | VFMA membership, ABS agriculture data |
| Commercial Operations | 500+ | Industry estimates |

**Status:** **Speculative** - These are estimates based on proxy data. Will validate through beta signups.

### 1.3 Willingness to Pay

| Tier | Assumed Conversion | Basis |
|------|-------------------|-------|
| Free to Paid | 5-15% | SaaS industry benchmark |
| Grower ($9.99/mo) | 70% of paid | Primary target segment |
| Pro ($29.99/mo) | 25% of paid | Power users |
| Team ($49.99/mo) | 5% of paid | Small businesses |

**Status:** **Speculative** - Based on comparable SaaS products. Will validate in beta.

---

## 2. Revenue Assumptions

### 2.1 SaaS Platform Revenue

| Metric | Year 1 | Year 2 | Year 3 | Basis |
|--------|--------|--------|--------|-------|
| Total Users | 2,000 | 10,000 | 30,000 | Growth projection |
| Paid Conversion | 5% | 10% | 15% | Increasing as product matures |
| ARPU (Avg Revenue Per User) | $10/mo | $10/mo | $10/mo | Blended tier pricing |
| MRR | $1,000 | $10,000 | $45,000 | Users x Conversion x ARPU |
| ARR | $12,000 | $120,000 | $540,000 | MRR x 12 |

**Status:** **Speculative** - No current revenue data. Based on SaaS benchmarks.

**Key Assumption:** 5x user growth Year 1 to Year 2 assumes successful product-market fit and marketing execution.

### 2.2 Farm Operations Revenue (If Founder Pursues)

| Revenue Stream | Year 1 | Year 2 | Year 3 | Basis |
|----------------|--------|--------|--------|-------|
| Microgreens (Home) | $7,200 | $18,000 | $24,000 | Validated pricing |
| Farmers Markets | $15,000 | $30,000 | $50,000 | Industry benchmarks |
| Restaurant Direct | $5,000 | $15,000 | $30,000 | Relationship building |
| Cut Flowers | $3,000 | $8,000 | $15,000 | Seasonal |
| **Total Farm Revenue** | **$30,200** | **$71,000** | **$119,000** | |

**Status:** **Reasonable** - Based on extensive research of Victorian market conditions and producer data.

---

## 3. Cost Assumptions

### 3.1 SaaS Operating Costs

| Cost Category | Monthly | Annual | Basis |
|---------------|---------|--------|-------|
| Hosting (Vercel) | $20-100 | $240-1,200 | Usage-based pricing |
| Domain & SSL | $2 | $24 | Standard rates |
| AI API Costs | $50-200 | $600-2,400 | Per-query pricing |
| Tools & Services | $50-100 | $600-1,200 | Various SaaS tools |
| **Total SaaS Ops** | **$122-402** | **$1,464-4,824** | |

**Status:** **Proven** - Current actual or quoted costs.

### 3.2 Farm Operating Costs (Monthly)

| Phase | Low | High | Basis |
|-------|-----|------|-------|
| Phase 1 (Home) | $429 | $1,317 | Detailed line items |
| Phase 2 (Leased Land) | $1,467 | $3,683 | Detailed line items |
| Year 3 (Full Operation) | $3,750 | $7,500 | Scaled estimates |

**Status:** **Reasonable** - Based on Victorian producer research and supplier quotes.

**Key Line Items (Phase 1):**
| Item | Low | High |
|------|-----|------|
| Seeds | $100 | $300 |
| Growing medium | $50 | $150 |
| Packaging | $50 | $150 |
| Electricity | $50 | $150 |
| Water | $20 | $50 |
| Market fees | $50 | $200 |
| Fuel/transport | $50 | $150 |
| Streatrader registration | $17 | $42 |
| Insurance | $42 | $125 |

### 3.3 Capital Expenditures

| Investment | Low | High | Timing |
|------------|-----|------|--------|
| Phase 1 (Home Setup) | $2,500 | $5,700 | Months 1-2 |
| Phase 2 (Land Infrastructure) | $24,800 | $68,100 | Months 7-12 |
| Year 2 Expansion | $7,500 | $21,000 | Year 2 |
| Product Development | $40,000 | $40,000 | Months 1-18 |
| Marketing | $25,000 | $25,000 | Months 1-18 |

**Status:** **Reasonable** - Based on supplier quotes and comparable investments.

---

## 4. Pricing Assumptions

### 4.1 Microgreens Market Pricing

| Metric | Conservative | Moderate | Optimistic | Source |
|--------|--------------|----------|------------|--------|
| Price per punnet (100-150g) | $4 | $5 | $6 | Melbourne Farmers Markets |
| Revenue per tray | $8 | $16 | $24 | 2-4 punnets per tray |
| Wholesale discount | 30-40% | 25-35% | 20-30% | Industry standard |

**Status:** **Reasonable** - Validated through market observation and producer interviews.

**Geographic Variation:**
- Melbourne metro: $5-6/punnet (premium)
- Regional Victoria: $4-5/punnet (standard)
- Wholesale/restaurant: $3-4/punnet (volume discount)

### 4.2 SaaS Pricing

| Tier | Price | Rationale |
|------|-------|-----------|
| Free | $0 | Customer acquisition |
| Grower | $9.99/mo | Below psychology threshold |
| Pro | $29.99/mo | Premium feature value |
| Team | $49.99/mo | Multi-user value |

**Status:** **Speculative** - Will validate through price testing in beta.

**Competitive Reference:**
- No direct competitors for pricing comparison
- General farm management software: $20-200/mo
- Gardening apps: $0-10/mo

---

## 5. Yield Assumptions

### 5.1 Microgreens Yield per Tray

| Variety | Yield (grams) | Days to Harvest | Confidence |
|---------|---------------|-----------------|------------|
| Sunflower | 300-400g | 8-12 days | **Proven** |
| Pea Shoots | 250-350g | 10-14 days | **Proven** |
| Radish | 200-300g | 5-8 days | **Proven** |
| Broccoli | 150-250g | 8-12 days | **Proven** |
| Basil | 100-200g | 10-14 days | **Reasonable** |

**Average Yield Assumption:** 200-400g per tray (used in financial model)

**Status:** **Reasonable** - Based on industry data and growing guide research. Will validate through founder's growing operation.

### 5.2 Germination & Success Rates

| Metric | Conservative | Target | Optimistic |
|--------|--------------|--------|------------|
| Germination Rate | 70% | 80% | 90% |
| Successful Harvest Rate | 80% | 90% | 95% |
| Effective Yield Rate | 56% | 72% | 86% |

**Status:** **Reasonable** - Industry benchmarks. Loss assumptions built into cost model.

---

## 6. Market Access Assumptions

### 6.1 Farmers Market Access

| Assumption | Value | Basis |
|------------|-------|-------|
| Markets available in Victoria | 50+ | VFMA listings |
| Average wait time for stall | 1-6 months | Producer interviews |
| Stall fee per day | $50-200 | Market fee schedules |
| Markets attended per week | 2-4 | Typical producer schedule |

**Status:** **Reasonable** - Based on VFMA data and market research.

**Risk:** Popular markets may have longer waiting lists.

**Mitigation:** Apply to multiple markets early, start with less competitive locations.

### 6.2 Restaurant Penetration

| Year | Target Accounts | Basis |
|------|-----------------|-------|
| Year 1 | 2-5 | Relationship building |
| Year 2 | 5-10 | Word of mouth |
| Year 3 | 10-20 | Established reputation |

**Status:** **Speculative** - Restaurant relationships take time to build. Conservative estimates.

---

## 7. Growth Assumptions

### 7.1 User Acquisition (SaaS)

| Channel | CAC | Volume Potential | Status |
|---------|-----|------------------|--------|
| Organic/SEO | $5-10 | High | **Reasonable** |
| Reddit/Forums | $2-5 | Medium | **Reasonable** |
| YouTube Content | $10-15 | High | **Speculative** |
| Paid Social | $15-25 | Medium | **Speculative** |
| Partnerships | $5-15 | Variable | **Speculative** |

**Blended CAC Assumption:** $5-15 (weighted toward organic channels)

**Status:** Overall **Speculative** - Will validate through actual acquisition data.

### 7.2 Revenue Growth Rates

| Period | Assumed Growth | Basis |
|--------|----------------|-------|
| Year 1 to Year 2 | 400% (5x users) | Post product-market fit |
| Year 2 to Year 3 | 200% (3x users) | Scaling |
| Year 3+ | 50-100% | Market maturation |

**Status:** **Speculative** - Aggressive early growth assumes successful execution.

---

## 8. Risk-Adjusted Scenarios

### 8.1 Scenario Definitions

| Scenario | Definition | Probability |
|----------|------------|-------------|
| Conservative | Everything takes longer, costs more | 25% |
| Moderate | Execution on plan | 50% |
| Optimistic | Better than expected results | 25% |

### 8.2 Key Variable Ranges

| Variable | Conservative | Moderate | Optimistic |
|----------|--------------|----------|------------|
| Year 3 Users | 10,000 | 30,000 | 50,000 |
| Paid Conversion | 5% | 15% | 25% |
| ARPU | $8 | $10 | $12 |
| Farm Revenue | $30,000 | $74,000 | $140,000 |
| Operating Costs | +20% | On plan | -10% |

### 8.3 Sensitivity Analysis

**Revenue Sensitivity:**
| Factor | -20% Impact | +20% Impact |
|--------|-------------|-------------|
| Pricing | -$14,000/yr | +$14,000/yr |
| Volume | -$14,000/yr | +$14,000/yr |
| Conversion | -$10,000/yr | +$10,000/yr |

**Cost Sensitivity:**
| Factor | Impact |
|--------|--------|
| Water costs +50% | -$1,500/yr |
| Fuel costs +30% | -$900/yr |
| Hired labor (20hrs/wk) | -$29,000/yr |

---

## 9. Assumptions Requiring Validation

### High Priority (Validate in Phase 1)

| Assumption | Current Value | Validation Method | Timeline |
|------------|---------------|-------------------|----------|
| Pricing acceptance | $4-6/punnet | Market sales data | Months 1-3 |
| Germination rate | 80% | Growing experiments | Months 1-2 |
| Time per tray | Estimated | Time tracking | Months 1-4 |
| SaaS interest | Assumed | Beta signups | Months 1-6 |

### Medium Priority (Validate in Phase 2)

| Assumption | Current Value | Validation Method | Timeline |
|------------|---------------|-------------------|----------|
| Restaurant demand | Assumed | Direct outreach | Months 7-12 |
| Paid conversion | 5-15% | Tier launch | Months 6-12 |
| Market growth | 8.6% CAGR | Industry monitoring | Ongoing |

---

## 10. What's Proven vs. What's Assumed

### Proven (High Confidence)

- Market exists and is growing
- Microgreens have high gross margins
- No direct software competitors
- MVP is technically functional
- Growing guides are comprehensive

### Assumed (Medium Confidence)

- Market pricing will hold
- Yields match industry benchmarks
- Costs align with research
- Market access is achievable
- Restaurant demand exists

### Speculative (Lower Confidence)

- User growth rates
- Paid conversion rates
- CAC and LTV metrics
- Scale timeline
- Team pricing tier demand

---

## Conclusion

This financial model is built on a foundation of **verified research** with **explicit assumptions** about unproven elements. We've designed the model to be robust across scenarios, with conservative estimates still delivering positive ROI.

**Key Risks Acknowledged:**
1. User growth may be slower than projected
2. Paid conversion may be lower than SaaS benchmarks
3. Market pricing pressure from increased competition
4. Drought/climate impact on farm operations

**Risk Mitigation:**
1. Phased investment approach with validation gates
2. Lean operational model with 18-month runway
3. Diversified revenue (SaaS + farm operations)
4. Water security investments
5. Focus on differentiation over price competition

---

*Financial assumptions document prepared January 2026. This document should be updated as validation data becomes available.*
