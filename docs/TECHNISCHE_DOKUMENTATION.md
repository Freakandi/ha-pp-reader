# Technische Dokumentation: Portfolio Performance Reader

Diese Dokumentation beschreibt den Aufbau und die Funktionsweise der Home-Assistant-Integration `pp_reader` in diesem Repository. Alle relevanten Module liegen unter `custom_components/pp_reader`.

## Inhaltsverzeichnis
1. [Überblick](#überblick)
2. [Datei- und Modulstruktur](#datei--und-modulstruktur)
3. [Konfigurationsablauf](#konfigurationsablauf)
4. [Datenfluss](#datenfluss)
5. [Datenbank](#datenbank)
6. [Sensoren](#sensoren)
7. [Websocket-API und Dashboard](#websocket-api-und-dashboard)
8. [Backup-System](#backup-system)
9. [Lokale Entwicklung](#lokale-entwicklung)

## Überblick
`pp_reader` liest eine gepackte `.portfolio`-Datei aus *Portfolio Performance*, extrahiert die enthaltenen Daten per Protobuf und legt sie in einer lokalen SQLite-Datenbank ab. Die Integration stellt verschiedene Sensoren bereit (Kontostände, Depotwerte, Gewinne etc.) und bietet ein Dashboard auf Basis von Websocket-Events.

## Datei- und Modulstruktur
```
custom_components/pp_reader/
├── __init__.py            # Einbindung in Home Assistant und Initialisierung
├── manifest.json          # Metadaten und Abhängigkeiten
├── config_flow.py         # UI-gestützte Einrichtung (Pfad zur .portfolio-Datei)
├── const.py               # Konstanten wie DOMAIN und Config-Keys
├── sensor.py              # Registrierung der Sensorsammlungen
├── sensors/               # Einzelne Sensorklassen
├── data/                  # Datenbankzugriff, Parser und Sync-Logik
├── logic/                 # Berechnungsfunktionen (Portfoliowerte, Validierung)
├── currencies/            # Abruf und Cache von Wechselkursen
├── translations/          # Lokalisierung (de/en)
└── www/                   # Dashboard-Frontend (JS/CSS)
```
Dateien im Verzeichnis `root/` außerhalb von `custom_components/` (z. B. `tools/`, `tests/` oder `testdata/`) sind nur Hilfsmittel für Entwicklung und Tests und werden von der Integration selbst nicht benötigt.

## Konfigurationsablauf
1. Installation via HACS gemäß README.
2. Bei der Einrichtung fragt der `config_flow` nach dem Pfad zur `.portfolio`‑Datei. Optional kann ein eigenes Verzeichnis für die SQLite-Datenbank angegeben werden, ansonsten landet sie in `/config/pp_reader_data/<Dateiname>.db`.
3. Beim ersten Start initialisiert `db_init.py` das Datenbankschema (siehe [Datenbank](#datenbank)).
4. Über den `PPReaderCoordinator` wird anschließend in regelmäßigen Abständen geprüft, ob sich die Portfolio-Datei geändert hat. Bei Änderungen wird die Datei erneut eingelesen und mit der Datenbank synchronisiert.

## Datenfluss
1. `reader.py` entpackt die `.portfolio`-Datei, entfernt den `PPPBV1`-Header und parst sie mithilfe der generierten Protobuf-Klassen (`name.abuchen.portfolio.client_pb2`).
2. `sync_from_pclient.py` schreibt sämtliche Inhalte (Wertpapiere, Konten, Transaktionen usw.) in die SQLite-DB. Dabei werden auch Fremdwährungsdaten berücksichtigt und Event-Updates an das Dashboard gesendet.
3. `coordinator.py` lädt zyklisch Konten, Portfolios und Transaktionen aus der Datenbank, berechnet aktuelle Werte (unter Zuhilfenahme von `logic/portfolio.py` und `logic/accounting.py`) und stellt sie anderen Komponenten zur Verfügung.
4. Über `currencies/fx.py` werden bei Bedarf Wechselkurse von *frankfurter.app* geholt und im DB-Cache (`fx_rates` Tabelle) gespeichert.

## Datenbank
Das Schema befindet sich in `data/db_schema.py`. Wichtige Tabellen:
- **accounts** – Konten mit aktuellem Saldo
- **securities** – Wertpapiere und historische Kurse
- **portfolios** – Depots
- **portfolio_securities** – Zuordnung Wertpapier ↔ Depot inkl. Bestände
- **transactions** + **transaction_units** – Alle Transaktionen
- **fx_rates** – Zwischengespeicherte Wechselkurse
- **metadata** – u. a. Zeitstempel der letzten Dateiaktualisierung

`db_access.py` enthält Hilfsfunktionen zum Laden dieser Daten. `db_init.py` legt beim ersten Start sämtliche Tabellen an.

## Sensoren
Im Verzeichnis `sensors/` befinden sich spezialisierte Sensorklassen:
- **PortfolioAccountSensor** – Kontostände aktiver Konten
- **PortfolioDepotSensor** – aktueller Depotwert und Positionsanzahl
- **PortfolioPurchaseSensor** – aufgelaufene Kaufsummen
- **PortfolioGainAbsSensor** und **PortfolioGainPctSensor** – unrealisierte Gewinne
Alle Sensoren beziehen ihre Werte über den `PPReaderCoordinator`.

## Websocket-API und Dashboard
`data/websocket.py` implementiert Websocket-Kommandos, um Dashboard-Daten (Konten, Depots, letzter Datei-Import usw.) abzurufen. Das Frontend liegt in `www/pp_reader_dashboard` und wird beim Laden der Integration über einen statischen Pfad bereitgestellt. Änderungen an der Datenbank triggern entsprechende Events, sodass das Dashboard seine Daten live aktualisieren kann.

## Backup-System
`data/backup_db.py` registriert einen periodischen Service, der alle sechs Stunden ein Backup der SQLite-Datenbank erzeugt. Über den Service `pp_reader.trigger_backup_debug` kann in Home Assistant manuell ein Backup angestoßen werden. Backups werden im Unterverzeichnis `backups/` neben der Datenbank abgelegt.

## Lokale Entwicklung
Die Verzeichnisse `tools/` und `testdata/` enthalten Skripte zum Parsen von Portfolio-Dateien und zum Testen einzelner Funktionen außerhalb von Home Assistant. Für Unit-Tests wird `pytest` verwendet (siehe `tests/`).


