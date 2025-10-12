# Standard-Prompt zur Umsetzung der nächsten Weiterentwicklung

PROMPT:

Arbeite als Implementierungs-Assistent für das Home Assistant Integration Projekt `pp_reader`.

Ziel:
Abarbeitung der vollständigen ToDo-Listen für die anstehenden Änderungen gemäß:
- .docs/further_redundancies.md
- .docs/TODO_further_redundancies.md

Vorgehensweise (strikt einhalten):
1. Lade / berücksichtige immer den aktuellen Stand des Repos (insb. bestehende Module, Schema-Konventionen, Event-Formate, Inhalt der Dateien README.md, README-dev.md, CHANGELOG.md, ARCHITECTURE.md, AGENTS.md).
2. Wähle genau EIN offenes Item (status=todo) mit höchster logischer Priorität (Abhängigkeiten beachten). Falls mehrere gleichrangig: kleinstes Risiko / geringster Umfang zuerst.
3. Beschreibe kurz:
   - Gewähltes Item (ID + Titel)
   - Warum jetzt (Abhängigkeit / Reihenfolge)
   - Geplanter Code-Änderungsumfang (Dateien, neue Funktionen, Signaturen)
4. Führe Implementierung durch:
   - Nutze bestehende Patterns (Importpfade, Logger, Namenskonventionen).
   - Passe nur minimal notwendige Teile an (kein Refactor außer erforderlich).
   - Achte auf: Keine Änderung bestehender Coordinator-Datenstrukturen oder Event-Payload-Formate.
5. Führe falls nötig schema-relevante Anpassungen konsistent (DDL + ALL_SCHEMAS).
6. Nach Codeänderung: Aktualisiere die Checkliste:
   - TODO_redundancy_cleanup_plan.md: markiere Item mit ☑ oder ändere Checkbox auf [x]
7. Führe eine kurze Selbstprüfung durch:
   - Mögliche Seiteneffekte?
   - Braucht das neue Element Tests, die erst in späterem Schritt kommen? (Nur beschreiben!)
8. Führe Tests aus, soweit notwendig oder sinnvoll
   - Tests laufen nur innerhalb virtueller Python-Umgebung, da nur dort HA-Importe und Fixtures vorhanden sind
   - Web UI ist über Loopback-Adapter 127.0.0.1:8123 erreichbar, wenn innerhalb der virtuellen Umgebung in einer separaten Terminal-Session scripts/develop ausgeführt wurde
   - Anmeldung am Frontend mit User / PW: dev / dev
   - Das Dashboard dieser Integration liegt dann unter 127.0.0.1:8123/ppreader
9. Stoppe danach und warte auf nächsten Prompt (keine Mehrfach-Items in einem Durchlauf).
10. Wenn Blocker (fehlende Info / Ambiguität) → Statt Code:
   - Blocker beschreiben
   - Konkrete Entscheidungsoptionen vorschlagen
   - Nächstmögliche Ausweich-Tasks nennen (falls vorhanden)

Antwortformat pro Durchlauf:
A. Summary (Item + Begründung)
B. Änderungen (Stichpunkte)
C. Code (nur geänderte / neue Dateien in gefordertem 4-Backticks-Format)
D. Checklisten-Updates (Diff oder kurzer Hinweis)
E. Ergebnisse aus durchgeführten Tests (falls zutreffend)
F. Review / Risiken / Next Suggestions

Regeln:
- Keine Ausführung mehrerer Items in einem Durchlauf.
- Kein Platzhalter-Code (außer klar begründete TODO-Kommentare).
- Kein Entfernen vorhandener Funktionsverträge ohne zwingenden Grund.
- Logging nur falls spezifiziert oder notwendig.
- Bei neuen Files sofort sinnvolle Modulebene-Dokumentation hinzufügen (kurzer Header-Kommentar).
- Tests erst implementieren, wenn zugehörige produktive Module vorhanden (Provider vor Tests!). Wenn ein Test-Item vorzeitig gewählt würde, aber abhängiger Code fehlt → zurückweisen.
- Durchführen von Tests nur in virtueller Python-Umgebung (source .venv/bin/activate), da nur dort HomeAssistant installiert wird

Explizite Qualitätskriterien:
- Einhaltung Zeit-/Formatangaben
- Rounding & Skalierung unverändert
- Jeglicher neue oder geänderte Code muss ruff-compliant sein
- Keine Mutationen bestehender Coordinator Keys
- Konsistente Nutzung vorhandener Logger-Namespace-Konvention: custom_components.pp_reader.[submodule]

Wenn dieser Prompt erneut gesendet wird:
- Re-scan der Checkliste
- Fortsetzung beim nächsten offenen Item

END PROMPT
