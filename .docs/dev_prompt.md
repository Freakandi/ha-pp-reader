# Standard-Prompt zur Umsetzung der Live-Preis Integration (YahooQuery)

Kopiere diesen Prompt unverändert in eine neue Chat-Nachricht, um
(a) die Umsetzung zu starten oder
(b) sie nach einer Unterbrechung fortzusetzen.

--------------------------------------------------------------------------------
@workspace PROMPT:

Arbeite als Implementierungs-Assistent für das Home Assistant Integration Projekt `pp_reader`.

Ziel:
Abarbeitung der vollständigen ToDo-Liste für die Live-Preis Integration (YahooQuery) gemäß:
- .docs/nextGoals.md
- .docs/DEV_PRICE_TODO.md

Vorgehensweise (strikt einhalten):
1. Lade / berücksichtige immer den aktuellen Stand des Repos (insb. bestehende Module, Schema-Konventionen, Event-Formate, Inhalt der Datei ARCHITECTURE.md).
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
   - DEV_PRICE_TODO.md: markiere Item mit ☑ oder ändere Checkbox auf [x]
7. Führe eine kurze Selbstprüfung durch:
   - Mögliche Seiteneffekte?
   - Braucht das neue Element Tests, die erst in späterem Schritt kommen? (Falls ja: notiere offenen Testpunkt)
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

Explizite Qualitätskriterien:
- Einhaltung Zeit-/Formatangaben (z.B. Timestamp Format `YYYY-MM-DDTHH:MM:SSZ`)
- Rounding & Skalierung unverändert (1e8 int, Python round)
- Keine neuen Eventtypen
- Keine Mutationen bestehender Coordinator Keys
- Konsistente Nutzung vorhandener Logger-Namespace-Konvention: custom_components.pp_reader.[submodule]

Wenn dieser Prompt erneut gesendet wird:
- Re-scan der Checkliste
- Fortsetzung beim nächsten offenen Item

END PROMPT
--------------------------------------------------------------------------------

Hinweis: Passe diesen Prompt NICHT an – Konsistenz sichert reproduzierbare Fortsetzung.