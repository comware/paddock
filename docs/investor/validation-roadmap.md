# Paddock: Assumption Validation Roadmap

**Purpose:** Define experiments, success criteria, and decision gates for validating key financial model assumptions in Phases 1-2.

---

## Validation Philosophy

> **Fail fast, learn faster.** Every assumption is a hypothesis. Every hypothesis needs an experiment. We invest incrementally based on validated learning.

### Investment Philosophy

```
┌─────────────────────────────────────────────────────────────┐
│              PHASED INVESTMENT APPROACH                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   PHASE 0 ($500)  →  PHASE 1 ($5K)  →  PHASE 2 ($35K)       │
│        ↓                  ↓                  ↓               │
│   Germination        Market Sales       Scale Operations     │
│   Validation         Validation         Validation           │
│        ↓                  ↓                  ↓               │
│   GATE: >70%         GATE: >$500/mo     GATE: >$3K/mo       │
│   germination        revenue            revenue              │
│                                                              │
│   Each gate must pass before unlocking next investment       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1 Validation (Months 1-6)

### Experiment 1: Germination Rate Validation

**Hypothesis:** We can achieve 80%+ germination rate consistently

| Parameter | Value |
|-----------|-------|
| Test Duration | 2-4 weeks |
| Sample Size | 20 trays across 5 varieties |
| Investment | $200-300 |

**Method:**
1. Plant 4 trays each of: sunflower, pea shoots, radish, broccoli, basil
2. Document germination percentage for each tray
3. Control variables: same medium, same conditions, same water schedule

**Success Criteria:**
| Result | Action |
|--------|--------|
| >80% germination | **PASS** - Proceed to market testing |
| 70-80% germination | **PASS with caution** - Identify improvement areas |
| <70% germination | **FAIL** - Diagnose issues, retry before proceeding |

**Decision Gate:** Do not invest in market presence until germination is validated.

---

### Experiment 2: Yield Validation

**Hypothesis:** Yield matches industry benchmarks (200-400g per tray)

| Parameter | Value |
|-----------|-------|
| Test Duration | 4-8 weeks |
| Sample Size | 30 trays across 5 varieties |
| Investment | $300-500 |

**Method:**
1. Grow 6 trays each of target varieties
2. Weigh total yield at harvest
3. Calculate yield per tray and yield per sqm

**Success Criteria:**
| Variety | Target Yield | Pass Threshold |
|---------|--------------|----------------|
| Sunflower | 300-400g | >250g |
| Pea Shoots | 250-350g | >200g |
| Radish | 200-300g | >150g |
| Broccoli | 150-250g | >120g |
| Basil | 100-200g | >80g |

**Decision Gate:** Yields below threshold require process adjustment before market entry.

---

### Experiment 3: Market Pricing Validation

**Hypothesis:** Customers will pay $4-6 per punnet at farmers markets

| Parameter | Value |
|-----------|-------|
| Test Duration | 4-8 weeks (8-16 market days) |
| Sample Size | 100+ transactions |
| Investment | $1,000-1,500 (market fees, transport, product) |

**Method:**
1. Attend 2 farmers markets per week
2. Price at $5/punnet (midpoint)
3. Track: units sold, revenue, customer feedback, competitor pricing

**Success Criteria:**
| Result | Interpretation | Action |
|--------|----------------|--------|
| Sell >80% of inventory | Strong demand | **PASS** - Price is validated |
| Sell 50-80% of inventory | Moderate demand | **PASS** - Adjust mix or presentation |
| Sell <50% of inventory | Weak demand | **INVESTIGATE** - Price, quality, or market issue |

**Price Sensitivity Test:**
- Week 1-2: $5.00/punnet (baseline)
- Week 3-4: $5.50/punnet (test premium)
- Week 5-6: $4.50/punnet (test budget)
- Measure elasticity: does higher price reduce volume?

**Decision Gate:** Do not scale production until pricing is validated.

---

### Experiment 4: Time-Per-Tray Validation

**Hypothesis:** Labor cost per tray aligns with model ($0.75-$1.70)

| Parameter | Value |
|-----------|-------|
| Test Duration | 4 weeks |
| Sample Size | 40+ trays |
| Investment | Time tracking only ($0) |

**Method:**
1. Use Paddock time tracking feature for every activity
2. Categories: planting, watering, harvesting, packaging, market sales
3. Calculate time per tray and implied labor cost at $25/hour

**Success Criteria:**
| Time/Tray | Implied Labor Cost | Verdict |
|-----------|-------------------|---------|
| <4 minutes | <$1.67 | **PASS** - Model validated |
| 4-8 minutes | $1.67-$3.33 | **CAUTION** - Efficiency needed |
| >8 minutes | >$3.33 | **FAIL** - Review process |

**Decision Gate:** Labor efficiency must support unit economics before scaling.

---

### Experiment 5: SaaS Interest Validation

**Hypothesis:** Hobbyist growers will sign up for free tier at scale

| Parameter | Value |
|-----------|-------|
| Test Duration | 3-6 months |
| Target | 500+ beta signups |
| Investment | Marketing budget $500-1,000 |

**Method:**
1. Launch public beta with free tier
2. Marketing channels: Reddit, YouTube, SEO, Facebook groups
3. Track: signups, activation, retention, feature usage

**Success Criteria:**
| Metric | Target | Action if Missed |
|--------|--------|------------------|
| Monthly signups | >100 | Adjust marketing strategy |
| Activation rate | >50% | Improve onboarding |
| 30-day retention | >30% | Improve core value prop |
| Feature usage | >10 trays/user | Improve UX |

**Decision Gate:** Minimum 500 beta users before paid tier launch.

---

## Phase 2 Validation (Months 7-12)

### Experiment 6: Restaurant Demand Validation

**Hypothesis:** Melbourne restaurants will buy microgreens direct from producer

| Parameter | Value |
|-----------|-------|
| Test Duration | 3-6 months |
| Target | 5+ regular accounts |
| Investment | Samples + delivery ($500-1,000) |

**Method:**
1. Identify 20 target restaurants (farm-to-table focus)
2. Deliver free samples with product info
3. Follow up within 1 week
4. Track: response rate, trial orders, repeat orders

**Success Criteria:**
| Metric | Target | Interpretation |
|--------|--------|----------------|
| Sample acceptance | >50% | Chefs are interested |
| Trial order rate | >25% | Product quality is good |
| Repeat order rate | >50% of trials | Value proposition works |

**Decision Gate:** 5+ regular accounts before expanding restaurant focus.

---

### Experiment 7: Paid Conversion Validation

**Hypothesis:** 5-15% of free users will convert to paid tier

| Parameter | Value |
|-----------|-------|
| Test Duration | 3-6 months |
| Sample Size | 500+ free users |
| Investment | None (feature development already complete) |

**Method:**
1. Launch paid tier at $9.99/month (Grower)
2. Offer annual discount (2 months free)
3. Track: conversion rate, tier distribution, churn

**Success Criteria:**
| Conversion Rate | Interpretation | Action |
|-----------------|----------------|--------|
| >15% | Exceptional | Accelerate growth investment |
| 10-15% | Strong | Continue as planned |
| 5-10% | Moderate | Investigate value prop |
| <5% | Weak | Major product/pricing pivot needed |

**Decision Gate:** Minimum 5% conversion before heavy marketing investment.

---

### Experiment 8: Scale Economics Validation

**Hypothesis:** Unit economics improve at scale (leased land operation)

| Parameter | Value |
|-----------|-------|
| Test Duration | 6 months |
| Target | 100+ trays/week production |
| Investment | Land lease + infrastructure ($25-35K) |

**Method:**
1. Lease small plot (1-2 acres) with polytunnel
2. Scale microgreens production to 100 trays/week
3. Track: all costs, revenue, labor efficiency

**Success Criteria:**
| Metric | Target | Verdict |
|--------|--------|---------|
| Gross margin | >60% | **PASS** |
| Revenue/month | >$3,000 | **PASS** |
| Labor efficiency | Improving trend | **PASS** |
| Quality consistency | >90% Grade A | **PASS** |

**Decision Gate:** All metrics must pass before Year 2 expansion investment.

---

## Decision Framework

### Gate Decision Matrix

| Gate | Pass Criteria | Fail Action |
|------|---------------|-------------|
| Germination | >70% rate | Fix process, retry |
| Yield | Within 80% of target | Adjust varieties |
| Market Price | >$4/punnet accepted | Test lower price point |
| Labor | <8 min/tray | Improve efficiency |
| SaaS Signups | >100/month | Adjust marketing |
| Restaurant | 5+ accounts | Refocus on markets |
| Conversion | >5% | Pivot pricing/features |
| Scale | All metrics pass | Extend validation period |

### Monthly Review Process

```
┌─────────────────────────────────────────────────────────────┐
│              MONTHLY VALIDATION REVIEW                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   1. Collect all experiment data                             │
│   2. Compare against success criteria                        │
│   3. Classify each assumption as:                            │
│      - VALIDATED (can proceed)                               │
│      - INCONCLUSIVE (need more data)                         │
│      - INVALIDATED (need to pivot)                           │
│   4. Update financial model with actual data                 │
│   5. Decide: proceed / extend / pivot                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Validation Timeline

### Month 1-2: Foundation
- [ ] Germination experiment (20 trays)
- [ ] Set up Paddock for personal use
- [ ] Begin yield tracking

### Month 3-4: Market Entry
- [ ] First farmers market attendance
- [ ] Price validation experiment
- [ ] Time tracking for all activities
- [ ] SaaS beta launch

### Month 5-6: Optimization
- [ ] Price sensitivity testing
- [ ] Market expansion (2nd market)
- [ ] Restaurant sample deliveries
- [ ] Beta user feedback collection

### Month 7-9: Scale Preparation
- [ ] Land lease acquisition
- [ ] Infrastructure investment
- [ ] Scale production experiment
- [ ] Paid tier launch

### Month 10-12: Scale Validation
- [ ] 100+ trays/week production
- [ ] Full unit economics tracking
- [ ] Restaurant account development
- [ ] Paid conversion tracking

---

## Risk Contingencies

### If Germination Fails (<70%)

| Cause | Solution | Timeline |
|-------|----------|----------|
| Seed quality | Source from different supplier | 1 week |
| Watering | Adjust schedule, test misting | 2 weeks |
| Temperature | Add heat mat or adjust location | 1 week |
| Medium | Try different growing medium | 2 weeks |

### If Market Pricing Fails (<$4/punnet)

| Response | Description |
|----------|-------------|
| Wholesale pivot | Focus on restaurant volume at $3/punnet |
| Premium focus | Target only high-end markets |
| Value-add | Create mixed boxes, subscriptions |
| Cost reduction | Find efficiencies to maintain margin |

### If SaaS Conversion Fails (<5%)

| Response | Description |
|----------|-------------|
| Price reduction | Test $4.99/month tier |
| Feature expansion | Add most-requested features |
| Freemium expansion | Increase free tier limits |
| Pivot to ads/affiliate | Alternative monetization |

---

## Investment Decision Gates

### Gate 1: Post-Germination ($500 → $5,000)
- **Requirement:** >70% germination, proof of process
- **Unlocks:** Market equipment, full Phase 1 setup

### Gate 2: Post-Market Validation ($5,000 → $35,000)
- **Requirement:** >$500/month revenue, validated pricing
- **Unlocks:** Land lease, infrastructure investment

### Gate 3: Post-Scale Validation ($35,000 → $70,000+)
- **Requirement:** >$3,000/month revenue, positive unit economics
- **Unlocks:** Year 2 expansion, full team operation

### Gate 4: Post-SaaS Validation ($40,000 allocated)
- **Requirement:** >500 users, >5% conversion
- **Unlocks:** Accelerated marketing investment

---

## Success Metrics Dashboard

| Metric | Baseline | Phase 1 Target | Phase 2 Target |
|--------|----------|----------------|----------------|
| Germination Rate | - | >80% | >85% |
| Yield/Tray | - | >200g | >250g |
| Market Price | $5.00 | $5.00 validated | $5.50 tested |
| Monthly Revenue | $0 | $500+ | $3,000+ |
| Gross Margin | 60% target | >55% | >65% |
| SaaS Users | 0 | 500+ | 2,000+ |
| Paid Conversion | 0% | >5% | >10% |
| Restaurant Accounts | 0 | 2+ | 5+ |

---

*Validation roadmap prepared January 2026. Update monthly based on actual experiment results.*
