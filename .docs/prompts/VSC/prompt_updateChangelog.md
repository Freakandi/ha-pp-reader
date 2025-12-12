# Prompt Template: Update `CHANGELOG.md`

**Goal**
- Aktualisiere die Datei [`CHANGELOG.md`](CHANGELOG.md), sodass sie alle Änderungen zwischen der zuletzt dokumentierten Version und der aktuellen Versionsnummer aus [`custom_components/pp_reader/manifest.json`](custom_components/pp_reader/manifest.json) widerspiegelt.

**Relevante Quellen**
- `custom_components/pp_reader/manifest.json` → liefert `version` (Soll-Zustand des Releases).
- `CHANGELOG.md` → enthält die zuletzt veröffentlichte Version und das bestehende Format (Keep a Changelog, SemVer).
- Git-Historie/Diff (`git log`, `git diff`) → dient zur Ermittlung der tatsächlichen Änderungen seit der zuletzt dokumentierten Version.
- Weitere Projektdateien, Tests und Dokumentationen → dienen als Beleg, welche Änderungen seitdem passiert sind.

**Vorgehen**
1. **Aktuelle Versionsnummer ermitteln**
   - Lies `version` aus `custom_components/pp_reader/manifest.json`.
2. **Letzte dokumentierte Version bestimmen**
   - Identifiziere den obersten Versionsblock in `CHANGELOG.md` und notiere Version + Datum.
   - Prüfe, ob die dokumentierte Version bereits der Manifest-Version entspricht.
     - Falls ja, stelle sicher, dass nur fehlende Einträge ergänzt/aktualisiert werden.
     - Falls nein, bereite einen neuen Block für die Manifest-Version vor.
3. **Änderungen seit der letzten Version sammeln**
   - Ermittle alle Commits seit dem Release der zuletzt dokumentierten Version (Tag, Branch, Commit-ID oder Zeitpunkt, an dem der entsprechende Changelog-Eintrag geschrieben wurde).
   - Analysiere Code-, Test-, Dokumentations- und Skript-Änderungen, um Features, Fixes, Breaking Changes, interne Wartungsarbeiten etc. herauszufiltern.
   - Achte auf relevante Merge Requests, neue Dateien, entfernte Funktionalität und Dependency-Anpassungen.
4. **Änderungen kategorisieren**
   - Ordne jede Änderung passenden Kategorien gemäß bestehender Changelog-Struktur zu (z. B. `Added`, `Changed`, `Fixed`, `Removed`, `Internal`, `Notable Behavior`).
   - Bei Bedarf können neue Kategorien ergänzt werden, solange sie zum Keep-a-Changelog-Stil passen.
   - Verdichte Informationen zu klaren, verständlichen Stichpunkten (kein Marketing, sondern präzise technische Beschreibung).
5. **Changelog-Eintrag formulieren**
   - Erstelle (oder aktualisiere) den Versionsblock für die aktuelle Manifest-Version:
     - Format: `## [X.Y.Z] - YYYY-MM-DD` (Datum in ISO-Format des aktuellen Tages oder Release-Datums).
     - Unterkategorien als `### Heading` mit Aufzählungslisten.
   - Stelle sicher, dass der neue Block ganz oben steht und die Chronologie (neu → alt) beibehalten wird.
   - Verweise bei Bedarf auf besondere Hinweise (Breaking Changes, Migration, bekannte Einschränkungen).
6. **Qualitätssicherung**
   - Überprüfe Rechtschreibung (Deutsch, wie bestehende Einträge).
   - Stelle sicher, dass alle identifizierten Änderungen abgedeckt sind und keine Kategorie leer bleibt.
   - Validere, dass Formatierung (Markdown-Überschriften, Listen) identisch zu vorhandenen Einträgen ist.

**Erwartete Ausgabe**
- Aktualisierte `CHANGELOG.md` mit vollständigem, sauber strukturiertem Eintrag für die aktuelle Manifest-Version (inklusive Datum) und ggf. ergänzten Unterpunkten für bestehende Versionen.
- Keine zusätzlichen Dateien oder Änderungen außerhalb des Changelogs.
