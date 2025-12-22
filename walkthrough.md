# Walkthrough - Portfolio Last Price Column

## Feature Overview
Added a new column **"Letzter Kurs"** (Last Price) to the expanded portfolio positions table in the Overview tab.

- **Content**:
  - **Native Price**: The last fetched price in the security's native currency (e.g., USD, CAD, HKD).
  - **EUR Price**: If the security is non-EUR, the second line shows the converted EUR price using the latest FX rate.
- **Layout**: Stacked cell design consistent with "Kaufwert" and other columns.
- **Sorting**: Sortable by numeric value (using EUR equivalent for consistent comparison).

## Verification success

### Visual Verification
Verified that the column appears and populates correctly for both EUR and non-EUR securities.

**Screenshot:**
![Last Price Verification](./artifacts/last_price_verification.png)

(See "Letzter Kurs" column with HKD value on top and EUR value below for Alibaba)

### Automated Tests
- Updated `src/tabs/__tests__/overview.render.test.ts` to include coverage for the new column and adjusted indices.
- Validated `npm run lint:ts` passes.
- Validated `npm test` passes.
