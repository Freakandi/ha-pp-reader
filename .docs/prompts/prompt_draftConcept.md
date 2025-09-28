# Prompt Template: Draft Concept for Next Development Steps

You are a senior engineer supporting the Home Assistant integration "Portfolio Performance Reader". Your task is to produce a detailed concept document in German that outlines the next development steps for the functionality described below. Use the structure and level of depth found in `.docs/live_aggregation/updateGoals.md` as the reference for detail, rigor, and formatting.

---
## Eingangsdaten

### Geplante Funktionalität
{{DESCRIBE_THE_FUNCTIONALITY_HERE}}

### Bekannte Randbedingungen oder offene Fragen (optional)
{{LIST_CONSTRAINTS_OR_OPEN_QUESTIONS}}

---
## Anforderungen an die Ausarbeitung

1. **Ziel:** Erstelle ein Markdown-Dokument, das einen umsetzungsfähigen Konzeptentwurf liefert. Verwende sachlich-präzise Sprache auf Deutsch.
2. **Struktur:** Übernimm folgende Gliederung und passe Inhalte an die geplante Funktionalität an:
   - Titel ("Konzept: ...") und kurzer Zielabsatz
   - Trennlinie (`---`)
   - Abschnitt 1 "Aktueller Zustand (Ist)" mit Stichpunkten zu Status quo, relevanten Komponenten, bestehenden Workarounds oder Problemen.
   - Abschnitt 2 "Zielzustand" mit Stichpunkten zu gewünschtem Endresultat, UX-Auswirkungen und Invarianten.
   - Abschnitt 3 "Datenfluss / Architektur Neu" (nummerierte Schritte oder Diagrammtext), der die gewünschte Verarbeitung beschreibt.
   - Abschnitt 4 "Betroffene Module / Funktionen" mit mindestens einer Tabelle (Spalten: Änderung, Datei, Aktion) und ergänzenden Stichpunkten zu existierenden Hilfsfunktionen.
   - Abschnitt 5 "Nicht zu ändernde Aspekte" mit negativen Abgrenzungen.
   - Abschnitt 6 "Schrittweise Umsetzung" mit Phasen/Tasks und konkreten Arbeitsschritten (nummerierte Listen).
   - Abschnitt 7 "Performance & Risiken" als Tabelle (Spalten: Risiko, Beschreibung, Mitigation).
   - Abschnitt 8 "Validierungskriterien (Definition of Done)" als Stichpunkte.
   - Abschnitt 9 "Geplanter Minimal-Patch" mit Pseudocode oder Listen zu Backend/Frontend/Docs.
   - Abschnitt 10 "Zusätzliche Festlegungen" (z.B. Flags, Telemetrie, Debugging) falls relevant; ansonsten explizit "Keine zusätzlichen Festlegungen".
   - Abschnitt 11 "Zusammenfassung der getroffenen Entscheidungen".
3. **Verweise:** Wann immer möglich, verweise auf relevante Repository-Dateien in Klammern (z. B. `custom_components/pp_reader/...`).
4. **Detaillierungsgrad:** Der Output soll ähnlich ausführlich wie das Referenzdokument sein (mehrere Absätze, Tabellen, Listen, Pseudocode-Snippets).
5. **Kontextbezug:** Reagiere ausschließlich auf die beschriebene geplante Funktionalität und die optionalen Randbedingungen. Ergänze Annahmen explizit, falls Informationen fehlen.

---
## Ausgabeformat

Gib ausschließlich das ausgearbeitete Konzept-Dokument im beschriebenen Markdown-Format aus, ohne zusätzliche Erklärungen.
