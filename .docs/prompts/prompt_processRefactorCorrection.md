# Prompt – Refactor Correction Execution

PROMPT:

Arbeite als Implementierungs-Assistent für das Home Assistant Integration Projekt `pp_reader`.

Ziel:
Abarbeitung der Aufgaben aus `.docs/refactor_correction.md` (Abschnitte "Canonical Writer Implementation", "Consumer Refactor", "Legacy Removal", "Documentation & Tests") mit der dort beschriebenen Architektur (Snapshots + Metrics = einzige Datenquelle, kein Übergangsmodus über legacy Tabellen).

Verfügbare Kontextquellen:
- `.docs/refactor_correction.md` (bindend)
- `.docs/TODO_cleanup_diff_sync.md`, `.docs/TODO_normalization_pipeline.md`, `.docs/backend_workstreams.md`
- Architektur/Datenflüsse aus `README.md`, `README-dev.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `AGENTS.md`

Vorgehensweise (strikt befolgen):
1. Lade/prüfe den aktuellen Stand der relevanten Dateien und halte dich an das Zielbild aus `.docs/refactor_correction.md` (Snapshottabellen, direkte Consumer-Helper, kein legacy Diff-Sync).
2. Wähle genau EIN noch offenes Item aus der Refactor-Correction-Liste. Priorität: zuerst Kanonische Writer, dann Consumer-Refactor, dann Legacy-Removal, danach Docs/Tests.
3. Beschreibe vor Implementierungsstart kurz:
   - Gewähltes Item (Abschnitt + Stichpunkt)
   - Warum jetzt (Abhängigkeit / Reihenfolge)
   - Geplanter Änderungsumfang (Dateien, neue Helper, Tests)
4. Implementiere die Änderung:
   - Verwende bestehende Patterns, Modulschnittstellen, Logger-Namespace `custom_components.pp_reader.*`.
   - Richte neue Helper-Module an den in `.docs/refactor_correction.md` geforderten APIs aus (z.B. `normalized_store` Loader, Snapshot-Persistence).
   - Legacy-Code nur anfassen, wenn der gewählte Task es verlangt (sonst unangetastet lassen).
5. Schemaänderungen nur, wenn im Task explizit nötig (aktualisiere `db_schema.py` und zugehörige Listen, MIGRATIONEN nicht erforderlich solange Refactor-Plan dies erlaubt).
6. Aktualisiere bei Bedarf die betroffenen TODO-Abschnitte direkt im Dokument (`.docs/refactor_correction.md`, andere TODO-Dateien) und markiere erledigte Punkte mit `[x]` + kurzer Begründung.
7. Führe nach jeder Implementierung eine Selbstprüfung durch:
   - `ruff` für geänderte Python-Dateien.
   - Relevante `pytest`-Module (mindestens neue/angepasste Bereiche) innerhalb `venv-ha`.
   - Bei Frontend-Dateien: `npm run lint:ts` / `npm run test` falls betroffen.
8. Dokumentiere in der Antwort mögliche Seiteneffekte, offene Risiken, und ob Folgearbeiten notwendig sind.
9. Aufgaben nur einzeln ausführen—nach Abschluss stoppen und auf neuen Prompt warten.
10. Bei Blockern: Problem beschreiben, Entscheidungsoptionen vorschlagen, mögliche Ausweich-Tasks nennen.

Antwortformat:
A. Summary (Item + Begründung)
B. Änderungen (Stichpunkte)
C. Code (nur geänderte/neue Dateien im 4-Backticks-Format)
D. TODO/Doc-Updates (Hinweis oder Diff)
E. Tests (aufgelistete Befehle + Ergebnis)
F. Review / Risiken / Next Steps

Regeln:
- Keine Mehrfach-Items pro Durchlauf.
- Kein Platzhalter-Code außer klar begründeten TODO-Kommentaren.
- Neue Dateien: kurze Header-Doku.
- Keine Rückwärtskompatibilität zu diff-sync: alte Pfade dürfen entfernt oder deaktiviert werden, sofern mit Plan kompatibel.
- Tests laufen nur in aktivierter virtueller Umgebung (`source venv-ha/bin/activate`).
- Alle Änderungen müssen ruff-compliant und im Sinne des Zielarchitektur-Dokuments sein.

END PROMPT
