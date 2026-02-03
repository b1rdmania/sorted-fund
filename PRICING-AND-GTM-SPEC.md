# Sorted.fund Pricing & GTM Specification

**Status:** Planning document  
**Date:** 2026-02-01  
**Target customer:** Indie web3 games

---

## 1. Current Billing Primitives Audit

### What exists today

| Table | Billing-relevant fields | Notes |
|-------|------------------------|-------|
| `projects` | `gas_tank_balance` (wei), `daily_cap`, `daily_spent`, `daily_reset_at` | Tracks gas spend, no plan/tier field |
| `developers` | `credit_balance` (wei) | Exists but unused in sponsorship flow |
| `sponsorship_events` | `estimated_gas`, `actual_gas`, `max_cost`, `status`, `completed_at` | Good metering source |
| `credit_transactions` | `amount`, `type`, `reference_type`, `reference_id`, `balance_after` | Audit trail exists |
| `gas_tank_refuels` | `amount`, `tx_hash`, `status` | Deposit tracking |

### What's missing for tiered pricing

| Missing | Purpose |
|---------|---------|
| `projects.plan` | Which tier: `starter`, `pro`, `scale`, `enterprise` |
| `projects.plan_started_at` | When current billing period started |
| `projects.fee_free_allowance_remaining` | How many fee-free tx left this month |
| `sponsorship_events.platform_fee` | USD-equivalent fee charged for this tx |
| `sponsorship_events.actual_cost_wei` | Receipt-derived gas cost (not estimated) |
| `billing_periods` table | Monthly usage snapshots for invoicing |

---

## 2. Pricing Tiers (Final Spec)

### Tier definitions

| Tier | Monthly price | Fee-free tx/mo | Overage fee/tx | Target customer |
|------|---------------|----------------|----------------|-----------------|
| **Starter** | $0 | 0 | $0.01 | Hobbyists, hackathons |
| **Pro** | $99 | 10,000 | $0.003 | Indie games in production |
| **Scale** | $499 | 250,000 | $0.0015 | Studios with multiple games |
| **Enterprise** | Custom | Custom | Custom | Large studios, white-label |

### What the customer always pays

1. **Gas (pass-through):** Customer funds their gas tank with native tokens (S on Sonic). Every sponsored tx deducts actual gas cost from their balance. This is their cost, not Sorted's revenue.

2. **Platform fee:** Sorted charges a per-tx fee in USD-equivalent. The fee is waived for the first N tx/month based on tier.

### Billing mechanics

- **Metering:** Count `sponsorship_events` where `status = 'success'` per `project_id` per calendar month.
- **Fee calculation:** At reconcile time, check project's plan + remaining allowance → compute `platform_fee` (0 if within allowance, else tier overage rate).
- **Collection (Phase 1):** Manual monthly invoice. Dashboard shows "estimated bill" based on current usage.
- **Collection (Phase 2):** Stripe subscription + metered billing for overage.

### Example scenarios

| Scenario | Plan | Tx this month | Gas spend | Platform fee |
|----------|------|---------------|-----------|--------------|
| Small game testing | Starter | 500 | $0.50 | $5.00 (500 × $0.01) |
| Indie game launch | Pro ($99) | 8,000 | $8.00 | $0 (within 10k allowance) |
| Indie game growth | Pro ($99) | 25,000 | $25.00 | $45 (15k × $0.003) |
| Studio portfolio | Scale ($499) | 400,000 | $400.00 | $225 (150k × $0.0015) |

---

## 3. Metering & Fee Calculation Design

### Monthly allowance tracking

```
On project creation or plan change:
  projects.fee_free_allowance_remaining = tier.monthly_allowance
  projects.plan_started_at = NOW()

On each successful sponsorship (reconcile time):
  IF projects.fee_free_allowance_remaining > 0:
    projects.fee_free_allowance_remaining -= 1
    sponsorship_events.platform_fee = 0
  ELSE:
    sponsorship_events.platform_fee = tier.overage_rate

On monthly reset (cron or on-demand):
  projects.fee_free_allowance_remaining = tier.monthly_allowance
  projects.plan_started_at = start of new billing period
```

### Billing period

- Calendar month (1st to last day)
- Reset runs at 00:00 UTC on the 1st
- Overage invoiced after month ends

### Schema additions (migration spec)

```sql
-- Add plan fields to projects
ALTER TABLE projects ADD COLUMN plan VARCHAR(50) NOT NULL DEFAULT 'starter';
ALTER TABLE projects ADD COLUMN plan_started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE projects ADD COLUMN fee_free_allowance_remaining INTEGER NOT NULL DEFAULT 0;

-- Add fee tracking to sponsorship_events
ALTER TABLE sponsorship_events ADD COLUMN platform_fee_usd DECIMAL(10, 6) DEFAULT 0;
ALTER TABLE sponsorship_events ADD COLUMN actual_cost_wei BIGINT;

-- Billing snapshots for invoicing
CREATE TABLE IF NOT EXISTS billing_periods (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    plan VARCHAR(50) NOT NULL,
    total_tx INTEGER NOT NULL DEFAULT 0,
    fee_free_tx INTEGER NOT NULL DEFAULT 0,
    overage_tx INTEGER NOT NULL DEFAULT 0,
    total_gas_cost_wei BIGINT NOT NULL DEFAULT 0,
    total_platform_fee_usd DECIMAL(10, 2) NOT NULL DEFAULT 0,
    invoice_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, invoiced, paid
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, period_start)
);
```

---

## 4. Fix Gas Cost Source (Receipt-Derived Pricing)

### Current problem

`GasReconciliationService.reconcileGas()` calls `provider.getFeeData()` at reconcile time to estimate gas price. This can misprice if:
- Time delay between tx execution and reconciliation
- Network congestion changes gas price

### Solution

Use the bundler receipt (`eth_getUserOperationReceipt`) or on-chain receipt to get:
- `actualGasUsed` (already available)
- `actualGasCost` (available from Pimlico receipt as `actualGasCost`)

### Implementation spec

```
On reconcile (called with bundler receipt data):
  actual_cost_wei = receipt.actualGasCost  // from bundler, already in wei
  
  // Store receipt-derived cost
  UPDATE sponsorship_events SET actual_cost_wei = :actual_cost_wei WHERE user_op_hash = :hash
  
  // Refund based on actual cost, not estimated
  refund_amount = reserved_max_cost - actual_cost_wei
  UPDATE projects SET gas_tank_balance = gas_tank_balance + refund_amount
```

### Required changes

1. **Reconcile endpoint:** Accept `actualGasCost` from caller (SDK/webhook) instead of computing internally
2. **SDK/client:** Pass `receipt.actualGasCost` when calling `/sponsor/reconcile`
3. **Fallback:** If not provided, fall back to current `getFeeData()` method (log warning)

---

## 5. Docs & Site GTM Updates

### New pages to create

| Page | Location | Content |
|------|----------|---------|
| **Pricing** | `docs/pricing.md` | Tier table, what's included, overage rates, FAQ |
| **Billing** | `docs/billing.md` | How billing works, gas vs platform fee, payment methods |

### Existing pages to update

| Page | Current | Update to |
|------|---------|-----------|
| `docs/introduction.md` | "Pricing details TBD" | Link to pricing page, brief summary |
| `docs/faq.md` | "How much does it cost?" → TBD | Actual tier info + link to pricing |

### Dashboard additions

| Feature | Location | Content |
|---------|----------|---------|
| **Cost breakdown** | Dashboard overview | Gas spent / Platform fees / Remaining allowance |
| **Usage meter** | Dashboard overview | "X of 10,000 fee-free tx used this month" |
| **Billing page** | New sidebar item | Current plan, usage history, upgrade CTA |

### Pricing page outline

```markdown
# Pricing

Sorted charges two things:
1. **Gas (pass-through)** — You fund your gas tank. We deduct actual gas cost per tx.
2. **Platform fee** — A small fee per sponsored transaction, with volume discounts.

## Plans

| | Starter | Pro | Scale | Enterprise |
|---|---------|-----|-------|------------|
| Monthly | Free | $99 | $499 | Contact us |
| Fee-free tx | 0 | 10,000 | 250,000 | Custom |
| Overage | $0.01/tx | $0.003/tx | $0.0015/tx | Custom |
| Projects | 3 | Unlimited | Unlimited | Unlimited |
| Support | Community | Email | Priority | Dedicated |

## What happens when...

**...my gas tank runs out?**
Sponsorship requests fail with 402. Fund your gas tank to continue.

**...I exceed my fee-free allowance?**
Overage fees apply. You'll see them in your dashboard and monthly invoice.

**...I want to upgrade mid-month?**
Upgrades apply immediately. Remaining allowance from new tier is prorated.
```

---

## 6. GTM Execution Playbook

### Target: Indie web3 games on Sonic (then multi-chain)

### Week 1: Foundation

| Task | Owner | Deliverable |
|------|-------|-------------|
| Finalize pricing page copy | - | `docs/pricing.md` live |
| Add cost breakdown to dashboard | - | Gas / fees / allowance visible |
| Create game template repo | - | `sorted-game-template` with one gasless action |
| Record 60-second demo video | - | Shows: signup → fund → integrate → tx works |

### Week 2: Outreach

| Task | Owner | Deliverable |
|------|-------|-------------|
| Build target list | - | 50 indie web3 games (Twitter, Discord, grant recipients) |
| Draft outreach DM/email | - | "Gasless UX in 15 min" hook, link to demo |
| Identify 3 pilot partners | - | Commit to 2-week integration sprint |
| Post in Sonic Discord | - | Announcement + link to demo |

### Week 3: Activation

| Task | Owner | Deliverable |
|------|-------|-------------|
| Onboard pilot partners | - | Each has working gasless tx in their game |
| Collect feedback | - | What's confusing, what's missing, pricing reactions |
| Iterate on docs/UX | - | Fix top 3 friction points |
| Case study draft | - | "Game X removed gas friction, onboarding +Y%" |

### Outreach script template

```
Subject: Gasless UX for [Game Name] — 15 min setup

Hey [Name],

Saw [Game Name] on [Sonic/Twitter/etc]. Love the concept.

Quick question: are your players hitting gas friction on onboarding?

We built Sorted — you fund a gas tank, we sponsor tx to your contracts. Players never see wallets or gas.

Live demo (real tx, no setup): https://sorted.fund/demo.html

If you want to try it, I can walk you through setup in 15 min.

— [Your name]
```

### Pilot offer

- **Cap:** First 10,000 sponsored tx free (no platform fee)
- **Term:** 30 days
- **Requirement:** Willing to give feedback, optional case study
- **Upgrade path:** Pro tier at $99/mo after pilot

### Success metrics

| Metric | Target (Week 3) |
|--------|-----------------|
| Pilot signups | 5 games |
| Games with live gasless tx | 3 |
| Total sponsored tx | 1,000 |
| Feedback sessions | 3 |

---

## 7. Open Questions / Decisions Needed

1. **USD pricing vs token pricing:** Platform fee in USD requires price oracle or manual conversion. Simpler: charge in USDC, or convert at billing time.

2. **Prepaid credits vs post-pay:** Current model is prepaid gas tank. Platform fees could be:
   - Prepaid: top up USD credits, deduct per tx
   - Post-pay: invoice at end of month (requires trust/limits)

3. **Multi-project pricing:** Does Pro tier apply per-project or per-account? Recommendation: per-account (all projects share 10k allowance).

4. **Plan enforcement:** Should free tier have project limits (e.g., 3 projects)? Recommendation: yes, to encourage upgrades.

5. **Mainnet pricing:** Gas costs differ by chain. Platform fee stays constant; gas pass-through varies. Document clearly.

---

## 8. Implementation Priority

| Priority | Task | Effort |
|----------|------|--------|
| P0 | Pricing page in docs | 1 day |
| P0 | Update FAQ/intro | 1 hour |
| P1 | Dashboard cost breakdown UI | 2 days |
| P1 | Receipt-derived gas cost fix | 1 day |
| P2 | Schema migration for plan/allowance | 1 day |
| P2 | Metering logic in reconcile | 1 day |
| P3 | Stripe integration | 3 days |
| P3 | Billing page in dashboard | 2 days |

---

*This document is the spec for implementing Sorted.fund's GTM and monetization. It should be updated as decisions are made and implementation progresses.*
