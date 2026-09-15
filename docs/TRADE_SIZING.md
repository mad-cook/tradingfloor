# Trade sizing and pacing

The live engine uses deterministic rules, not random order amounts or LLM decisions.

- Maximum swap input/equivalent value: **0.15 SOL**, excluding allowed fees and account rent.
- At least **7 minutes** between automatic order attempts.
- At least **40 minutes** after a broker's confirmed trade before its next trade.
- Maximum **50 automatic submitted orders per UTC day** across the office; failed on-chain submissions still count. The separately bounded owner test retains its own limits.
- Existing 0.03 SOL fee reserve, 15% position concentration cap, and 15% drawdown halt remain in force.

## Variable buys

Available cash is wallet SOL minus the fee reserve and maximum fee/rent allowances. Signal strength is positive observed price momentum divided by 2%, clamped to 0–1. Momentum uses the oldest retained observation in the engine's rolling one-hour price history; warm-up requires at least three observations.

A new position requests 2–3% of available cash, capped at 25–35% of the maximum trade (0.0375–0.0525 SOL). An addition requests 4–8% of available cash, capped at 40–100% of the maximum trade (0.06–0.15 SOL). Both are further limited by remaining position capacity. Orders below 0.003 SOL are skipped.

Existing entry eligibility remains unchanged: additions need at least 0.25% positive observed momentum; new positions can start after warm-up. Larger signals do not guarantee an order: quote validation, available cash, pacing and risk checks still apply.

## Partial exits

The existing exit triggers now determine the proposed fraction: a loss of at least 2% trims 75%; otherwise momentum below -0.5% trims 50%; otherwise a gain of at least 3% trims 25%. Each exit remains capped at the SOL-equivalent trade maximum and rounded down to token base units. Holdings too small to meet the minimum trade remain untouched.

## Office activity

One rotating desk emits a research observation at most once a minute, even between orders. Insufficient data produces a waiting message. An existing position without a qualifying addition or exit produces a pass and an office reaction. These events never create orders, forecasts, scores, or risk violations, and do not change trade priority. Narration explicitly identifies them as research with no submitted order.
