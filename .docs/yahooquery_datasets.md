# YahooQuery data set reference for Portfolio Performance Reader

## Integration touchpoints
- The Home Assistant integration wraps Yahoo Finance access through `yahooquery` in `YahooQueryProvider`.
  - Quotes are fetched in batches (size 10) via the blocking `Ticker(...).quotes` helper that returns a per-symbol mapping of Yahoo fields.
  - Only entries with a strictly positive `regularMarketPrice` are accepted and mapped onto the runtime `Quote` dataclass, which carries price, previous close, currency, volume, market capitalisation, 52-week range, dividend yield, and a timestamp supplied by the provider.【F:custom_components/pp_reader/prices/yahooquery_provider.py†L2-L175】【F:custom_components/pp_reader/prices/provider_base.py†L1-L89】
- All other modules documented below are directly available on the `Ticker` instance for ad-hoc diagnostics or future feature work.

## Core quote endpoints

### `Ticker.quotes`
- **Structure**: dictionary keyed by symbol; each value is a nested dictionary of the raw Yahoo Finance quote snapshot.
- **Key fields**: `regularMarketPrice` (float), `regularMarketPreviousClose` (float), `currency` (ISO string), `regularMarketVolume` (int), `marketCap` (int), `fiftyTwoWeekHigh/Low` (floats), `trailingAnnualDividendYield` (float), `regularMarketTime` (Unix epoch, seconds), `postMarketTime` (Unix epoch), `quoteType` (string), plus descriptive metadata such as `longName`, `marketState`, and exchange identifiers.
- **Notes**: includes analyst metrics (EPS, forward PE), trading ranges, volume statistics, dividend schedule, and market-session specific fields (`preMarket`, `postMarket`). Numeric prices are returned as Python floats, volumes and share counts as integers.

### `Ticker.price`
- **Structure**: dictionary keyed by symbol with a narrower summary of live price attributes.
- **Key fields**: `regularMarketPrice`, `regularMarketChange`, `regularMarketChangePercent`, `regularMarketDayHigh/Low`, `regularMarketOpen`, `regularMarketPreviousClose`, `regularMarketVolume` (all floats/ints), `regularMarketTime` and `postMarketTime` formatted as `%Y-%m-%d %H:%M:%S` strings, `marketCap` (int), and identifiers (`exchange`, `quoteType`, `currency`).
- **Notes**: all timestamps arrive as human-readable strings rather than raw epochs; `priceHint` conveys the decimal precision used on Yahoo.

### `Ticker.summary_detail`
- **Structure**: dictionary keyed by symbol with trading summary statistics.
- **Key fields**: `previousClose`, `open`, `dayLow/dayHigh`, `dividendRate/dividendYield`, `exDividendDate` (string timestamp), `payoutRatio`, `fiveYearAvgDividendYield`, `beta`, `trailingPE`, `forwardPE`, `volume`, `averageVolume` (ints), `bid/ask` (floats with `bidSize/askSize` ints), `marketCap` (int), `fiftyTwoWeekHigh/Low` (floats), `priceToSalesTrailing12Months`, `fiftyDayAverage`, `twoHundredDayAverage`, `trailingAnnualDividendRate/Yield`, `currency` metadata.
- **Notes**: duplicates some `quotes` data but adds historical averages and payout ratios; volumes are integers, rates are floats.

## Supplementary valuation and fundamentals

### `Ticker.financial_data`
- **Structure**: dictionary keyed by symbol summarising analyst targets and cash-flow metrics.
- **Fields**: target price statistics (`targetHighPrice`, `targetLowPrice`, `targetMeanPrice`, `targetMedianPrice`), recommendation data (`recommendationMean`, `recommendationKey`, `numberOfAnalystOpinions`), liquidity ratios (`currentRatio`, `quickRatio`), leverage (`debtToEquity`), cash balances, revenue, and margin metrics (`grossMargins`, `operatingMargins`, `profitMargins`). All numeric values are floats or ints (USD-based) and `financialCurrency` states the currency.

### `Ticker.key_stats`
- **Structure**: dictionary keyed by symbol with share structure and ratio data.
- **Fields**: `enterpriseValue`, `forwardPE`, `profitMargins`, `floatShares`, `sharesOutstanding`, short-interest metrics (`sharesShort`, `sharesShortPriorMonth`, `shortRatio`), ownership percentages (`heldPercentInsiders`, `heldPercentInstitutions`), valuation ratios (`priceToBook`), fiscal period markers (`lastFiscalYearEnd`, `mostRecentQuarter`), EPS fields, split history, enterprise ratios, benchmark comparisons (`52WeekChange`, `SandP52WeekChange`), and dividend metadata. Numbers are floats/ints; dates arrive as `%Y-%m-%d 00:00:00` strings or Unix epochs for recent dividend dates.

### `Ticker.valuation_measures`
- **Structure**: pandas `DataFrame` indexed by symbol and `asOfDate` with `periodType` (TTM, 3M, etc.).
- **Columns**: enterprise value metrics, EBITDA ratios, and multiples such as `ForwardPe`, `PbRatio`, `PeRatio`, `PegRatio`, `PsRatio`. Values are floats; `asOfDate` is an ISO date string.

### `Ticker.earnings`
- **Structure**: dictionary keyed by symbol; contains nested dictionaries.
- **Content**: `financialsChart` holds quarterly and yearly arrays with each entry providing `date`, `fiscalQuarter`, `earnings`, and `revenue` (ints); `earningsChart` includes estimates (`current`, `historical`, `trends`). Earnings call dates are provided as Unix epoch arrays or formatted strings depending on the key.

### `Ticker.asset_profile` and `Ticker.summary_profile`
- **Structure**: dictionaries keyed by symbol with corporate descriptors.
- **Content**: address details, sector/industry descriptors, headcount, governance risk scores, investor-relations URLs, long business summaries, and officer rosters including compensation figures (ints) and metadata (strings, booleans).

### `Ticker.calendar_events`
- **Structure**: dictionary keyed by symbol summarising upcoming events.
- **Fields**: `dividendDate`, `exDividendDate` (strings), `earnings` sub-dictionary covering average/high/low earnings estimates (floats), revenue estimates (ints), and call timestamps either as epoch lists or formatted strings.

## Historical series

### `Ticker.history()`
- **Structure**: pandas `DataFrame` with a multi-index (`symbol`, `date`).
- **Columns**: OHLCV data (`open`, `high`, `low`, `close`, `volume`) plus `adjclose`. Prices are floats, volume is int. The `date` level is a pandas `DatetimeIndex` (timezone-naive, in exchange local time). Parameters such as `period`, `interval`, `start`, `end` determine coverage.

### `Ticker.dividend_history(start=...)`
- **Structure**: pandas `DataFrame` indexed by `symbol` and ex-dividend `date` (datetime).
- **Columns**: `dividends` (float per share). Requires an explicit start date; values are decimal USD amounts.

### `Ticker.option_chain`
- **Structure**: pandas `DataFrame` aggregated across expirations with a multi-index of `symbol`, `expiration`, and `optionType`.
- **Columns**: contract identifiers (`contractSymbol`), `strike` (float), `currency`, pricing metrics (`lastPrice`, `bid`, `ask`, `change`, `percentChange`), open interest, volume (ints), `impliedVolatility` (float), `inTheMoney` (bool), `lastTradeDate` (timestamp string). The dataset spans both calls and puts; filter by index for a specific expiry.

## Financial statements

### `Ticker.income_statement(freq)`
- **Structure**: pandas `DataFrame` indexed by symbol with `asOfDate` (ISO string) and `periodType` (TTM, 3M, 12M).
- **Columns**: GAAP line items such as `TotalRevenue`, `GrossProfit`, `OperatingIncome`, EPS measures, share counts, and total expenses. Values are floats/ints; statement currency is provided via `currencyCode`.

### `Ticker.balance_sheet(freq)`
- **Structure**: pandas `DataFrame` indexed by symbol with `asOfDate` and `periodType`.
- **Columns**: asset, liability, and equity accounts (`CashAndCashEquivalents`, `TotalAssets`, `TotalLiab`, `ShareholderEquity`, etc.), plus working-capital and treasury-share figures. Numeric values are ints/floats representing base currency amounts.

### `Ticker.cash_flow(freq)`
- **Structure**: pandas `DataFrame` indexed by symbol with `asOfDate` and `periodType`.
- **Columns**: cash-flow components (`OperatingCashFlow`, `InvestingCashFlow`, `FinancingCashFlow`, `CapitalExpenditure`, `Depreciation`, `DividendsPaid`), beginning/ending cash positions, and share-based compensation. All numeric entries are floats/ints; currency indicated via `currencyCode`.

## Ownership and insider activity

### `Ticker.insider_holders`
- **Structure**: pandas `DataFrame` with multi-index (`symbol`, `row`).
- **Columns**: `name`, `relation`, `transactionDescription`, `latestTransDate` (string), `positionDirect` (int shares), `positionDirectDate` (string). Ideal for verifying insider holdings and latest filings.

### `Ticker.insider_transactions`
- **Structure**: pandas `DataFrame` (similar indexing) capturing transactions.
- **Columns**: trade date, ownership change, shares traded, transaction value, and filing metadata. Amounts are ints/floats; dates appear as ISO strings.

### `Ticker.institution_ownership`
- **Structure**: pandas `DataFrame` with multi-index (`symbol`, `row`).
- **Columns**: `organization` (string), `reportDate` (string), `pctHeld` (float fraction), `position` (int shares), `value` (int currency units), `pctChange` (float). Provides institutional stake tracking.

### `Ticker.fund_ownership` and related fund datasets
- **Structure**: pandas `DataFrame` variants covering mutual fund positions (`fund_ownership`), sector weightings (`fund_sector_weightings`), and top holdings (`fund_top_holdings`). Columns include organisation names, weight percentages (floats), share counts, and valuation fields.

## ESG, news, and other modules

- `Ticker.esg_scores`: dictionary keyed by symbol with environmental/social/governance risk metrics, controversy level, and sustainability scores (floats/ints with descriptive strings).
- `Ticker.news`: list of dictionaries per article containing `title`, `publisher`, `link`, `providerPublishTime` (Unix epoch), and preview text.
- `Ticker.technical_insights` / `Ticker.p_technical_insights`: dictionaries summarising trend signals, technical event triggers, and support/resistance levels.
- `Ticker.recommendation_trend` and `Ticker.recommendations`: pandas tables with analyst ratings history (counts for `strongBuy`, `buy`, etc.) per month or recommendation note.
- `Ticker.sec_filings`: list of filing metadata (form type, date, URL).
- `Ticker.page_views`: dictionary with traffic metrics (`shortTermTrend`, `longTermTrend`, percentages as floats).

## Timestamp and numeric conventions
- Yahoo Finance data mixes Unix epoch integers (`postMarketTime` in `quotes`), formatted strings (`regularMarketTime` in `price`, `exDividendDate` in summaries), and pandas datetime indices (`history`, `dividend_history`). Consumers should normalise times explicitly when persisting data.
- Monetary fields are floats when representing per-share prices or ratios, and integers for aggregated amounts (cash, revenue, market cap) already scaled to base currency units (USD in samples). Volumes and share counts are integers. Ratio fields (`payoutRatio`, `profitMargins`, `pctHeld`) are decimal fractions (e.g., `0.2429` representing 24.29%).

## Practical considerations for Home Assistant
- Batched access via `.quotes` already provides all fields needed for the runtime `Quote` mapping, but the API exposes richer datasets for historical analytics, dividends, options, and ownership should future sensors require them.
- When accessing pandas-based datasets, remember that `yahooquery` returns multi-indexed frames; filter on the index (e.g., `.xs('calls', level='optionType')`) to work with a single subset.
- Several modules (notably option chains and statement data) can be large; cache or throttle requests if integrating them into Home Assistant updates.
