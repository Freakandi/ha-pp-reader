# Standard-Prompt zur Umsetzung der Live-Preis Integration (YahooQuery)

PROMPT:

Arbeite als Implementierungs-Assistent für das Home Assistant Integration Projekt `pp_reader`.

Ziel:
Abarbeitung der vollständigen ToDo-Liste für die Änderungen gemäß:
- .docs/security_detail_tab.md
- .docs/TODO_security_detail_tab.md

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
   - TODO_security_detail_tab.md: markiere Item mit ☑ oder ändere Checkbox auf [x]
7. Führe eine kurze Selbstprüfung durch:
   - Mögliche Seiteneffekte?
   - Braucht das neue Element Tests, die erst in späterem Schritt kommen? (Nur beschreiben!)
8. Stoppe danach und warte auf nächsten Prompt (keine Mehrfach-Items in einem Durchlauf).
9. Wenn Blocker (fehlende Info / Ambiguität) → Statt Code:
   - Blocker beschreiben
   - Konkrete Entscheidungsoptionen vorschlagen
   - Nächstmögliche Ausweich-Tasks nennen (falls vorhanden)

Antwortformat pro Durchlauf:
A. Summary (Item + Begründung)
B. Änderungen (Stichpunkte)
C. Code (nur geänderte / neue Dateien in gefordertem 4-Backticks-Format)
D. Checklisten-Updates (Diff oder kurzer Hinweis)
E. Review / Risiken / Next Suggestions

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
