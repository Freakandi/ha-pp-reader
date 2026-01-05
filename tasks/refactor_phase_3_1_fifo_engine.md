# Refactor Phase 3.1: Lifecycle FIFO Engine & Neutrality

## Goal
Implement the core Transfer Neutrality verification to ensure "no-ghost" flows, and execute the complete "Lifecycle" FIFO performance engine to power the Trades Tab. This implementation runs distinct from the "Period Attribution" logic (Phase 3).

## Context
*   **Master Plan:** `tasks/refactor_calculations.md` (Phase 3 "Block 1 Step 3" & Phase 3.1)
*   **Design Decisions:** `tasks/refactor_context.md`
*   **Parent Task:** `tasks/refactor_phase_3_financial_engine.md` (Split-out for detail)

## Proposed Changes

### 1. Verification Logic (`metrics/calculator.py`)
*   **Verify** Transfer Neutrality:
    *   While Phase 1 (Ingestion) ensures `amount_eur` is balanced, Phase 3 (Period Attribution) assumes this.
    *   We need to add a test case to `tests/metrics/test_transfer_neutrality.py` that specifically models a chain: `EUR -> USD -> JPY -> EUR` to prove that the global `Net External Flow` (Invested Capital) is exactly 0.00 and no "Ghost Performance" leaks into the `System Delta`.

### 2. Lifecycle FIFO Engine (`metrics/calculator.py`)
*   **Implement Method:** `PerformanceEngine.calculate_realized_performance(scope_uuid=None)`
    *   **Input:** All transactions (Enriched), sorted by date ASC.
    *   **Logic:**
        *   Filter by `scope_uuid` (Account/Portfolio) if provided.
        *   Maintain `virtual_lots: dict[str, deque[Lot]]`.
        *   **Buy/Inbound:** Push `Lot(date, shares, cost_basis_eur)`.
        *   **Sell/Outbound:** Pop `Lot`.
            *   `Gain = (Sell_Price_EUR - Lot.Cost_Basis_EUR) * Shares`
            *   `Hold_Time = Sell_Date - Lot.Date`.
        *   **Ghost Enrichment:**
            *   For every *Closed* trade, calculate `Current_Value_EUR = Shares * MarketResolver.get_price(Today, sec_uuid)`.
            *   `Opportunity_Cost = Current_Value_EUR - Sell_Value_EUR`.
    *   **Output:** List of `RealizedTrade` objects (Dataclass to be defined/reused).

## Detailed Steps

### Step 1: Transfer Neutrality Verification
- [ ] **Create Test:** `tests/metrics/test_transfer_neutrality.py`.
- [ ] **Scenario:**
    1.  Deposit 1000 EUR.
    2.  Transfer 1000 EUR -> 1100 USD (Fx 0.91).
    3.  Transfer 1100 USD -> 150000 JPY.
    4.  Transfer 150000 JPY -> 950 EUR. (Round trip loss of 50 EUR).
- [ ] **Assertions:**
    *   `Global Net External Flow` must be +1000 (Initial Deposit) or +950 (Net)?
    *   Wait, Transfers are "Neutral". The system should see:
        *   Deposit +1000 EUR.
        *   Transfer Flow = 0 (Internal).
        *   Value at End = 950 EUR.
        *   Performance = -50 EUR (FX Loss).
        *   **Crucially:** `Net External Flow` (Invested Capital) must be exactly +1000. It must *not* be affected by the transfer steps.
- [ ] **Execution:** Run the test. Fix `calculator.py` ONLY IF it fails (it shouldn't, given the Phase 1 Ingestion averaging, but verification is mandatory).

### Step 2: Implement Realized Performance (FIFO)
- [ ] **Define Data Structure:** Ensure `RealizedTrade` dataclass exists (likely in `calculator.py` or separate DTO file).
    *   Fields: `security_uuid`, `buy_date`, `sell_date`, `shares`, `buy_cost_eur`, `sell_value_eur`, `realized_gain_eur`, `opportunity_gain_eur` (Ghost).
- [ ] **Implement Method:** `calculate_realized_performance` in `PerformanceEngine`.
    *   Use `_get_transactions_up_to(Today)`.
    *   Iterate and apply FIFO matching.
    *   Handle `TransactionType.SECURITY_TRANSFER`?
        *   If internal transfer: Maintain original cost basis (Pass the Lot).
        *   If external: Treat as Buy/Sell? Usually Internal.
        *   *Decision:* Transfers preserve cost basis.
- [ ] **Implement Ghost Lookup:**
    *   Start Date for "Today" price lookup.
    *   Call `market_resolver.get_price(sec_uuid, Now)`.

### Step 3: Verification (FIFO)
- [ ] **Create Test:** `tests/metrics/test_fifo_lifecycle.py`.
- [ ] **Scenario:**
    1.  Buy 10 @ 100.
    2.  Buy 10 @ 200.
    3.  Sell 15 @ 300.
- [ ] **Assertions:**
    *   Trade 1: 10 shares. Buy 100. Sell 300. Gain 2000.
    *   Trade 2: 5 shares. Buy 200. Sell 300. Gain 500.
    *   Remaining Inventory: 5 shares @ 200.
    *   Ghost Calc: If Current Price 400.
        *   Trade 1 Opp: (400 - 300)*10 = +1000.
        *   Trade 2 Opp: (400 - 300)*5 = +500.

## Test Plan
*   `pytest tests/metrics/test_transfer_neutrality.py`
*   `pytest tests/metrics/test_fifo_lifecycle.py`

## Complexity Rating
*   **Complexity:** Medium (Standard Algo).
*   **Risk:** Low (Isolated from Period Attribution).
