dev Repo for pp_reader

## Development

Run `./scripts/setup_container` once to create the virtual environment and
install dependencies. Activate the environment before running any other
scripts:

```bash
source .venv/bin/activate
```

Home Assistant can then be started with:

```bash
./scripts/develop
```

## Preparing a release PR for `main`

The `dev` branch contains tooling, fixtures, and development helpers that
should not reach `main`. Use the helper script to create a sanitized worktree
that only keeps `custom_components/` together with the required root files
(`ARCHITECTURE.md`, `CHANGELOG.md`, `hacs.json`, `LICENSE`, `README.md`).

```bash
./scripts/prepare_main_pr.sh [source_branch] [target_branch] [worktree_dir]
```

- `source_branch` defaults to `dev`.
- `target_branch` defaults to `main-release`.
- `worktree_dir` defaults to `.worktrees/<target_branch>`.

The script checks out the source branch into a separate worktree, prunes every
tracked file that is not part of the add-on payload, and leaves you with a
clean branch ready for a pull request against `main`. Review the worktree,
commit the changes, and push the `target_branch` when you are ready to open the
PR.

In Codex environments the setup script cannot keep the virtual
environment active. Run `source .venv/bin/activate` after the container
starts or use `./scripts/codex_develop` which directly runs the Hass
binary from the virtual environment.

## Live Kurse (YahooQuery)

Die Integration unterstützt optionale Live-Preise über das Python-Paket `yahooquery` (Batch Fetch).
Ziel: Aktualisierung des zuletzt bekannten Preises (`last_price`) für aktive (nicht stillgelegte) Wertpapiere. Keine historischen Zeitreihen.

Empfehlung Intervall: ≥ 900 Sekunden (15 Minuten). Kürzere Intervalle erhöhen Rate-Limit-/Blocking-Risiko ohne Mehrwert bei verzögerten Kursen.

Persistenz:
- Gespeichert werden ausschließlich: `last_price` (als Integer skaliert ×1e8), `last_price_source='yahoo'`, `last_price_fetched_at` (UTC `YYYY-MM-DDTHH:MM:SSZ`).
- Keine Persistenz zusätzlicher Felder (Volume, 52W High/Low, Dividend Yield etc.).

Felder einer Laufzeit-Quote (nur In-Memory, können `None` sein):
| Feld | Bedeutung | Persistiert |
|------|-----------|-------------|
| price | Letzter Marktpreis (>0 gefiltert) | ja (skaliert) |
| previous_close | Vorheriger Schlusskurs | nein |
| currency | Währung des Quotes (nur Drift-Prüfung) | nein |
| volume | Handelsvolumen | nein |
| market_cap | Marktkapitalisierung | nein |
| high_52w / low_52w | 52‑Wochen Hoch/Tief | nein |
| dividend_yield | Trailing Dividend Yield | nein |
| ts | Timestamp (Epoch Sekunden) | nein |
| source | Provider-Kennung (yahoo) | indirekt (als last_price_source) |

Drift-Prüfung:
- Einmalige WARN pro Symbol bei Abweichung zwischen persistierter `currency_code` und Quote-Währung.
- Fehlt die Währung (None) → keine Prüfung.

Events:
- Nur bei mindestens einer tatsächlichen Preisänderung:
  1. `portfolio_values` (aggregiert betroffene Portfolios)
  2. Danach je betroffenem Portfolio `portfolio_positions`
- Keine neuen Eventtypen; bestehende Frontend Patch-Logik bleibt unverändert.

Logging (Kurzüberblick):
- INFO: Zyklusmetadaten (Symbole, Batches, Änderungen, Dauer, Fehlerzähler).
- WARN: Chunk-Fehler, wiederholte Misserfolge (≥3), Gesamt-0 Quotes (dedupliziert), Currency Drift, Watchdog >25s.
- ERROR: Importfehler `yahooquery` (Feature deaktiviert).
- DEBUG (nur mit Debug-Option): Batch Start/Ende, akzeptierte / verworfene Symbole, Overlap-Skip, Change-Details.

Grenzen & Hinweise:
- Keine Garantie für Echtzeit / Intraday-Tiefe (Upstream-Verzögerungen möglich).
- Upstream-API / Feldänderungen können zu fehlenden Quotes führen (robustes Fehler-Logging; Funktionalität bleibt tolerant).
- Kein Retry innerhalb eines Zyklus; Robustheit durch Intervall.
- Doppelte Symbole aktualisieren alle referenzierten Securities (bewusst akzeptiert).
- Bei dauerhaften Importfehlern wird das Feature deaktiviert (Log-Hinweis).

Fehlerzähler:
- In-Memory (`price_error_counter`), Reset bei erstem erfolgreichen Zyklus mit ≥1 Quote.

Debugging:
- Aktivieren der Option → detaillierte Batch-/Symbol-Logs ohne globale Logger-Beeinflussung.

Deaktivierung:
- Importfehler `yahooquery` → Feature abgeschaltet (keine weiteren Versuche in derselben Laufzeit).

> **Hinweis:** Die Integration persistiert ausschließlich den zuletzt bekannten Preis (`last_price` mit Quelle & Zeitstempel). Es werden **keine** historischen Intraday- oder Tageskursreihen abgefragt oder gespeichert. Für konsistente und schonende Nutzung der Upstream-API wird ein Intervall von **≥ 900 Sekunden (15 Minuten)** empfohlen. Kürzere Intervalle erhöhen nur das Risiko von Limit-/Blocking ohne Mehrwert bei verzögerten Kursen.

## Architektur / Live-Preise

Der Datenfluss für Live-Preise und Portfolio-Aggregationen ist vollständig serverseitig:

- Der Preiszyklus persistiert aktualisierte `last_price` Werte und stößt eine partielle Revaluation an.
- Die Funktion `fetch_live_portfolios` aggregiert aktuelle Depotkennzahlen (Wert, Kaufwert, Positionsanzahl) direkt aus der SQLite-DB – identisch für WebSocket-Initial-Abfragen und Event-Pushes.
- WebSocket-Kommandos `pp_reader/get_portfolio_data` und `pp_reader/get_dashboard_data` nutzen diese Aggregation on-demand; der Accounts-Teil bleibt unverändert.
- Push-Events (`portfolio_values`, anschließend je Portfolio `portfolio_positions`) verwenden dieselben Ergebnisse als Single Source of Truth.
- Das Dashboard arbeitet ohne Client-Override-Cache (`__ppReaderPortfolioValueOverrides`); Summen (Header & Tabellen-Footer) werden aus den aktualisierten DOM-Zellen berechnet.
- Positionsdetails bleiben Lazy Load: Beim Expand einer Depotzeile wird `pp_reader/get_portfolio_positions` aufgerufen und das Ergebnis im Cache `window.__ppReaderPortfolioPositionsCache` gehalten.

Damit bleiben Sensor-Snapshots (`coordinator.data['portfolios']`) abwärtskompatibel, während UI und WebSocket Antworten stets die neuesten, durch Live-Preise beeinflussten Werte liefern.

