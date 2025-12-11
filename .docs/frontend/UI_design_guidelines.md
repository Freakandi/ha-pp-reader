# UI Design Guidelines

This document establishes the authoritative design framework for the **Portfolio Performance Reader** frontend. It abstracts the visual style and technical implementation details of the *Overview* and *Security Detail* tabs to guide the development of new views and the refactoring of existing ones (e.g., the Analyse tab).

## 1. Core Philosophy

*   **Native Look & Feel:** The UI must blend seamlessly with Home Assistant. Rely on standard CSS variables (`--primary-text-color`, `--card-background-color`) rather than hardcoded colors.
*   **Card-Based Layout:** All content is grouped into distinct, rounded cards with shadows.
*   **Mobile-First & Responsive:** Layouts must adapt to narrow screens. Tables should scroll horizontally (`.scroll-container`) if they overflow. Sticky headers must adjust their height and content visibility on scroll.
*   **Data-Centric:** Focus on clear readability of financial numbers. Use semantic coloring (Green/Red) to indicate performance.

## 2. Technical Implementation

To ensure consistency, avoid writing raw HTML where helper functions exist.

*   **HTML Generation:** Use helpers from `src/content/elements.ts` (`makeTable`, `createHeaderCard`, `formatValue`) whenever possible.
*   **Charts:** Use `src/content/charting.ts` (`renderLineChart`) for uniform chart appearance.
*   **CSS:** Styles are defined in `css/base.css`, `css/cards.css`, and `css/nav.css`. Do not introduce inline styles.

## 3. Layout Structure

### 3.1. The Header Card
Every tab must begin with a **Header Card**.

*   **Usage:** Use `createHeaderCard(title, metaMarkup)` from `src/content/elements.ts`.
*   **Behavior:** The header card automatically becomes sticky (`.sticky`) when scrolling.
*   **Meta Section:** An optional area below the title for high-level summaries (e.g., Total Wealth). In sticky mode, this section collapses.
*   **Navigation:** Includes generic navigation arrows (Left/Right) automatically managed by the dashboard controller.

### 3.2. Content Cards
Group related information into containers with the class `.card`.

```html
<div class="card">
  <h2>Section Title</h2>
  <!-- Content goes here -->
</div>
```

*   **Headings:** Use `<h2>` for section titles within cards. The CSS handles sticky positioning of these headers within the card.
*   **Spacing:** Cards have bottom margin (`1.5rem`) to separate sections.

## 4. Typography & Data Presentation

### 4.1. Key Metrics (Grids)
For displaying high-level metrics (like in the Security Detail view), use the **Meta Grid** pattern.

*   **Container:** `<div class="security-meta-grid">` (Responsive grid).
*   **Items:** `<div class="security-meta-item">`.
*   **Labels:** `<span class="label">` (Small, Uppercase, Secondary text color).
*   **Values:** `<div class="value">` (Large, Bold).
    *   **Modifiers:** `.value--price` (Larger), `.value--percentage` (Smaller), `.positive` / `.negative` / `.neutral` (Coloring).

### 4.2. Tabular Data
Tables are the primary way to list portfolios, accounts, and positions.

*   **Construction:** Use `makeTable(rows, columns)` from `src/content/elements.ts`.
*   **Alignment:** Text columns left-aligned, numeric columns right-aligned (`align: 'right'`).
*   **Sorting:** Headers become clickable if `data-sort-key` is present. Use `sortTableRows` helper for logic.
*   **Footer:** Use `tr.footer-row` for totals.
*   **Responsiveness:** Wrap tables in `<div class="scroll-container">` to allow horizontal scrolling on mobile.

### 4.3. Formatting Values
Always use the centralized formatters to ensure correct locale (de-DE) and precision.

*   **Currency/Numbers:** `formatValue(key, value)` or `formatNumber(value)`.
*   **Trends:**
    *   **Positive (>0):** Class `.positive` (Green).
    *   **Negative (<0):** Class `.negative` (Red).
    *   **Neutral (=0):** Class `.neutral` (Grey/Secondary text).
    *   **Missing:** Em-dash (`—`) with class `.missing-value`.

## 5. Components

### 5.1. Badges
Use badges to indicate metadata or data quality issues.

*   **Classes:** `.meta-badge` combined with a modifier:
    *   `.meta-badge--info` (Blue)
    *   `.meta-badge--warning` (Orange)
    *   `.meta-badge--danger` (Red)
    *   `.meta-badge--neutral` (Grey)

### 5.2. Buttons & Interactions
*   **Range Selectors:** Use `<button class="security-range-button">`.
    *   **Active State:** Add `.active` class.
    *   **Loading State:** Add `.loading` class (shows animation).
*   **Toggle Buttons:** Use `<button class="portfolio-toggle">` with a chevron (`.caret`).

### 5.3. Charts
Charts must use the SVG-based engine in `src/content/charting.ts`.

*   **Colors:**
    *   Line: `var(--pp-reader-chart-line, #3f51b5)`
    *   Area: `var(--pp-reader-chart-area)`
    *   Baseline: `var(--pp-reader-chart-baseline)`
*   **Markers:** Use the `markers` option in `LineChartOptions` to render interaction points (e.g., Buy/Sell transactions).

## 6. CSS Variable Reference

Reuse these Home Assistant variables to ensure theming support:

| Variable | Usage |
| :--- | :--- |
| `--primary-text-color` | Main text color (Titles, Values) |
| `--secondary-text-color` | Labels, Subtitles, Neutral values |
| `--card-background-color` | Background of Cards |
| `--primary-background-color` | Page background, Table Headers |
| `--divider-color` | Borders, Separators, Shadows |
| `--accent-color` | Active states, Links |
| `--success-color` | Positive gains |
| `--error-color` | Negative gains, Errors |
| `--warning-color` | Warning badges/cards |

## 7. Checklist for New Tabs

When creating a new tab (e.g., refactoring *Analyse*):

1.  [ ] **Header:** Does it use `createHeaderCard` with a proper title?
2.  [ ] **Structure:** Is content wrapped in `.card` containers?
3.  [ ] **Consistency:** Are metrics displayed using the `.security-meta-grid` or `makeTable` patterns?
4.  [ ] **Formatting:** Are all numbers formatted via `formatValue` / `formatNumber`?
5.  [ ] **Colors:** Are colors derived strictly from CSS variables or semantic classes (`.positive`/`.negative`)?
6.  [ ] **Mobile:** Does the layout break on 360px width? (Check tables and grids).
