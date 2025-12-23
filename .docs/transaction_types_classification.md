# Transaction Types Classification

Please classify each transaction type into the relevant category for performance metrics (e.g., Performance-relevant, Neutral, Taxes, Fees, Dividends, etc.).

| Transaction Type | ID | Classification (User Input) | Notes |
| :--- | :--- | :--- | :--- |
| **PURCHASE** | 0 | Performance-relevant | Buying securities |
| **SALE** | 1 | Performance-relevant | Selling securities |
| **INBOUND_DELIVERY** | 2 | Neutral | Transfer in of securities |
| **OUTBOUND_DELIVERY** | 3 | Neutral | Transfer out of securities |
| **SECURITY_TRANSFER** | 4 | Neutral (disregard) | Internal transfer of securities |
| **CASH_TRANSFER** | 5 | Neutral (disregard) | Internal transfer of cash |
| **DEPOSIT** | 6 | Neutral | Cash deposit (Einlage) |
| **REMOVAL** | 7 | Neutral | Cash removal (Entnahme) |
| **DIVIDEND** | 8 | Dividend | Dividend payment |
| **INTEREST** | 9 | Interest | Interest received |
| **INTEREST_CHARGE** | 10 | Interest | Interest paid (e.g. margin) |
| **TAX** | 11 | Taxes | Taxes paid |
| **TAX_REFUND** | 12 | Taxes | Taxes refunded |
| **FEE** | 13 | Fees | Fees paid |
| **FEE_REFUND** | 14 | Fees | Fees refunded |

## Additional Context
- **Units**: Transactions may contain sub-units of type `GROSS_VALUE`, `TAX`, or `FEE`.
- **Goal**: To correctly calculate:
    - **Markterfolg** (Market Gain)
    - **Erträge** (Dividends + Interest)
    - **Gebühren & Steuern** (Fees & Taxes)
    - **Performance-neutral flows** (Deposits/Removals)
