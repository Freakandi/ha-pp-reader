# Data Model Specification & Comparison

## Overview
This document specifies the data model used in the Java "Portfolio Performance" (PP) source code and compares it with the Python/SQLite data model used in `ha-pp-reader`. It highlights structural differences, type mappings, and simplification decisions made for the integration.

## 1. Transaction Model

### A. Portfolio Performance (Java)
PP uses a polymorphic class hierarchy rooted in `Transaction`.

*   **Classes**: `AccountTransaction`, `PortfolioTransaction`.
*   **Key Concept - "Units"**: Fees, Taxes, and Gross Values are not flat fields but a list of `Unit` objects attached to the transaction. This allows multiple fee entries or complex FX breakdown.
*   **Double Entry**: Handled via `CrossEntry` object linking two separate `Transaction` instances (e.g., a Deposit in Account A linked to a Removal in Account B).

### B. HA-PP-Reader (Python/SQLite)
The integration flattens this into a single `transactions` table.

*   **Table**: `transactions`
*   **Key Concept - "Flattened Columns"**: `fees` and `taxes` are pre-aggregated sums of the underlying units.
*   **Double Entry**: Represented purely by `other_account` / `other_portfolio` fields on the row, or by matching UUIDs depending on ingestion complexity.

### Type Mapping (Critical)

| PP Enum (AccountTransaction) | PP Enum (PortfolioTransaction) | Python `type` (int) | Description |
| :--- | :--- | :--- | :--- |
| `BUY` | `BUY` | **0** | Purchase of Security |
| `SELL` | `SELL` | **1** | Sale of Security |
| `DELIVERY_INBOUND` | `DELIVERY_INBOUND` | **2** | Inbound Delivery (No Cash impact) |
| `DELIVERY_OUTBOUND` | `DELIVERY_OUTBOUND` | **3** | Outbound Delivery (No Cash impact) |
| `TRANSFER_IN` (Security) | `TRANSFER_IN` | **4** | Security Transfer In |
| `TRANSFER_IN` (Account) | - | **5** | Cash Transfer (Generic) |
| `DEPOSIT` | - | **6** | Cash Deposit |
| `REMOVAL` | - | **7** | Cash Removal |
| `DIVIDENDS` | - | **8** | Dividend Payment |
| `INTEREST` | - | **9** | Interest Income |
| `INTEREST_CHARGE` | - | **10** | Interest Charge |
| `TAXES` | - | **11** | Tax Payment |
| `TAX_REFUND` | - | **12** | Tax Refund |
| `FEES` | - | **13** | Fee Payment |
| `FEES_REFUND` | - | **14** | Fee Refund |

### Field Mapping

| Field | PP (Java) | HA-PP-Reader (Python) | Notes |
| :--- | :--- | :--- | :--- |
| **ID** | `uuid` (String) | `uuid` (TEXT) | Direct Map |
| **Date** | `date` (LocalDateTime) | `date` (TEXT ISO8601) | Timezone handling is critical (UTC vs Local) |
| **Amount** | `amount` (Long, atomic units) | `amount` (INTEGER, cents) | PP uses 10^-8 for shares? No, Amount is Currency. Shares is separate. |
| **Currency** | `currencyCode` | `currency_code` | |
| **Security** | `security` (Object Ref) | `security` (TEXT UUID) | Foreign Key |
| **Shares** | `shares` (Long) | `shares` (INTEGER) | **Warning**: PP stores shares as `10^8` scaled long. Python seems to match this scaling? Check `normalization_pipeline.py`. |
| **Fees** | `units` (List filter by Type.FEE) | `fees` (INTEGER) | Aggregated sum of all fee units |
| **Taxes** | `units` (List filter by Type.TAX) | `taxes` (INTEGER) | Aggregated sum of all tax units |
| **FX Rate** | `units` (GrossValue.exchangeRate) | `fx_rate_to_base` | Derived or Cached |

## 2. Security Model

### A. Portfolio Performance (Java)
`Security.java` is a heavy object containing prices, events, and attributes.

*   **Prices**: Stored in-memory as `List<SecurityPrice>`.
*   **Attributes**: Flexible Key-Value store (`Attributes`) for random user data.

### B. HA-PP-Reader (Python)
Split into `securities` metadata table and `historical_prices` time-series table.

| Field | PP (Java) | HA-PP-Reader (Python) | Notes |
| :--- | :--- | :--- | :--- |
| **ID** | `uuid` | `uuid` | |
| **Name** | `name` | `name` | |
| **ISIN** | `isin` | `isin` | |
| **Ticker** | `tickerSymbol` | `ticker_symbol` | |
| **Currency** | `currencyCode` | `currency_code` | |
| **Prices** | `List<SecurityPrice>` | Table `historical_prices` | `(security_uuid, date) -> close` |
| **Last Price** | `latest` (LatestSecurityPrice) | `last_price` | Cached in Security table for speed |

## 3. Account & Portfolio Model

### A. Portfolio Performance (Java)
*   **Structure**: `Client` contains list of `Account` and `Portfolio`.
*   **Reference**: `Portfolio` has a `referenceAccount` (Account Object).

### B. HA-PP-Reader (Python)
*   **Tables**: `accounts` and `portfolios`.
*   **Reference**: `portfolios.reference_account` stores the UUID of the linked account.

## 4. Implementation Gaps & Runtime Logic

The following concepts exist in PP's logic but are **NOT** persisted in the Python database. They must be calculated at runtime by the `PerformanceEngine`.

1.  **Cost Basis (FIFO)**:
    *   **PP**: Calculated recursively or via `CapitalGainsCalculation` visitor.
    *   **Python**: No specialized column. Must be derived by replaying transactions (Virtual Inventory).

2.  **Forex Gains (Realized)**:
    *   **PP**: Stored in `CapitalGainsRecord` during calculation.
    *   **Python**: Must be calculated on-the-fly.

3.  **Cross-Reference Integrity**:
    *   **PP**: Object references (`transaction.getCrossEntry()`).
    *   **Python**: Loose coupling via IDs. Queries must be robust against missing links.
