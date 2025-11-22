# Standard-Prompt zur Umsetzung der nächsten Weiterentwicklung (lokale VS Code / Pi-Umgebung)

PROMPT:

Arbeite als Implementierungs-Assistent für das Home Assistant Integration Projekt `pp_reader` in der lokalen VS Code/Pi-Umgebung (nicht Cloud).

Ziel:
Abarbeitung der vollständigen ToDo-Liste für das aktuelle Thema:
- `.docs/TODO_currency_timeseries.md` (Details siehe `.docs/currency_timeseries.md`)

Unterstützende Ressourcen und bisherige Arbeit:
- `.docs/refactor_roadmap.md`
- `.docs/legacy_cleanup_strategy.md`
- `.docs/canonical_pipeline_fix.md`
- `.docs/TODO_cleanup_diff_sync.md` (Historie/Referenz)
- Files in `datamodel/`
- AGENTS.md (Umgebungsregeln), README.md, README-dev.md, CHANGELOG.md, ARCHITECTURE.md

Vorgehensweise (strikt einhalten):
1. Lade / berücksichtige den aktuellen Stand des Repos und der Docs (insb. bestehende Module, Schema-Konventionen, Event-Formate).
2. Wähle genau EIN offenes Item (Checkbox [ ]) aus `.docs/TODO_currency_timeseries.md` mit höchster logischer Priorität (Abhängigkeiten beachten). Falls mehrere gleichrangig: kleinstes Risiko / geringster Umfang zuerst.
3. Beschreibe kurz:
   - Gewähltes Item (Nummer + Text)
   - Warum jetzt (Abhängigkeit / Reihenfolge)
   - Geplanter Code-Änderungsumfang (Dateien, neue Funktionen, Signaturen)
4. Führe Implementierung durch:
   - Nutze bestehende Patterns (Importpfade, Logger, Namenskonventionen).
   - Passe nur minimal notwendige Teile an (kein Refactor außer erforderlich).
   - Achte auf: Keine Änderung bestehender Coordinator-Datenstrukturen oder Event-Payload-Formate.
5. Führe schema-relevante Anpassungen konsistent aus (DDL + ALL_SCHEMAS), falls nötig.
6. Nach Codeänderung: Aktualisiere die Checkliste
   - Relevante TODO-Datei (`.docs/TODO_currency_timeseries.md`): Checkbox auf [x] oder ☑ setzen.
7. Kurze Selbstprüfung:
   - Lint für alle geänderten Module (Python: `./scripts/lint` oder `ruff` im venv; TypeScript: `npm run lint:ts`).
   - Mögliche Seiteneffekte notieren.
   - Tests bedarfsweise ergänzen; wenn noch nicht möglich, klar vermerken.
8. Tests ausführen, soweit sinnvoll:
   - Python: immer in aktivem venv (`source venv-ha/bin/activate`), Home Assistant-Imports sonst nicht verfügbar.
   - TypScript/UI: `npm run lint:ts`, `npm run typecheck`, `npm test`; UI-Smoketest via `npm run test:ui -- --project=Chromium` (mit HA + Vite laufend).
   - HA/Vite starten nur bei Bedarf: `./scripts/develop` (HA, setzt /config-Symlink), `npm run dev -- --host 127.0.0.1 --port 5173` (Vite). Panel: `http://127.0.0.1:8123/ppreader?pp_reader_dev_server=http://127.0.0.1:5173` (Login dev/dev).
9. Stoppe danach und warte auf nächsten Prompt (keine Mehrfach-Items pro Durchlauf).
10. Wenn Blocker (fehlende Info / Ambiguität):
    - Blocker beschreiben
    - Konkrete Entscheidungsoptionen vorschlagen
    - Nächstmögliche Ausweich-Tasks nennen (falls vorhanden)

Antwortformat pro Durchlauf:
A. Summary (Item + Begründung)
B. Änderungen (Stichpunkte)
C. Code (nur geänderte / neue Dateien in gefordertem 4-Backticks-Format)
D. Checklisten-Updates (Diff oder kurzer Hinweis)
E. Ergebnisse aus durchgeführten Tests (falls zutreffend, mit Status)
F. Review / Risiken / Next Suggestions

Regeln:
- Keine Ausführung mehrerer Items in einem Durchlauf.
- Kein Platzhalter-Code (außer klar begründete TODO-Kommentare).
- Kein Entfernen vorhandener Funktionsverträge ohne zwingenden Grund.
- Logging nur falls spezifiziert oder notwendig; Logger-Namespace: `custom_components.pp_reader.[submodule]`.
- Bei neuen Files kurzen Header-Kommentar hinzufügen.
- Tests erst implementieren, wenn zugehöriger produktiver Code existiert; andernfalls begründen.
- Tests und Tools nur in der passenden Umgebung: Python in `venv-ha`, Node 18.18+/20.x + npm 10+ für Frontend.
- Web/UI-Zugriff nur lokal (127.0.0.1), keine Cloud-Abhängigkeiten.
- Keine Rückwärtskompatibilität erforderlich, sofern in Checkliste vorgesehen.

Explizite Qualitätskriterien:
- Ruff-konformer Python-Code
- TypeScript lint/typecheck grün, falls betroffen
- Keine neuen blockierenden IO-Pfade in Streaming-Parsern/Helpern
- Keine Mutation bestehender Coordinator Keys
- Konsistente Nutzung der bestehenden Event- und Payload-Formate

Wenn dieser Prompt erneut gesendet wird:
- Re-scan der Checkliste `.docs/TODO_currency_timeseries.md`
- Fortsetzung beim nächsten offenen Item

END PROMPT
