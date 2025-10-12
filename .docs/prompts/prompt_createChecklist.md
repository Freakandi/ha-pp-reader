# Promptvorlage: ToDo-Checkliste aus fix_native_purchase.md ableiten

**Ziel:**
Erzeuge eine detaillierte, umsetzungsfertige ToDo-Liste für die Umsetzung/Implementierung der nächsten Entwicklungsziele, basierend auf den Festlegungen in [.docs/further_redundancies.md](.docs/further_redundancies.md).

**Vorgehen:**
1. Scanne das gesamte Dokument [.docs/further_redundancies.md](.docs/further_redundancies.md) und extrahiere alle expliziten und impliziten Anpassungspunkte (Backend, Frontend, Doku).
2. Zerlege jeden Anpassungspunkt in einen klaren, atomaren ToDo-Item (eine Änderung pro Punkt).
3. Formuliere jeden Punkt so, dass er ohne weitere Rückfragen direkt umgesetzt werden kann (inkl. Dateipfad, Funktion/Abschnitt, Ziel der Änderung).
4. Markiere optionale oder nachgelagerte Optimierungen explizit als solche.
5. Die Checkliste muss alle notwendigen Code-, Test- und Doku-Änderungen enthalten, um das Zielkonzept vollständig und konsistent umzusetzen.
6. Die Checkliste soll als neue TODO_further_redundancies.md im Ordner .docs abgelegt werden.

**Format:**
- Nummerierte Hauptpunkte (1., 2., …)
- Unterpunkte für Teilschritte (a), b), …)
- Für jeden Punkt/Unterpunkt:
  - [ ] Kurzbeschreibung der Änderung
  - Dateipfad(e)
  - Betroffene Funktion(en)/Abschnitt(e)
  - Ziel/Ergebnis der Änderung

**Hinweis:**
Optionale Optimierungen als "Optional" kennzeichnen und ans Ende der Liste setzen.
