# 📊 Portfolio Performance Reader – Home Assistant Integration

**Portfolio Performance Reader** ist eine benutzerdefinierte Home Assistant Integration zur Auswertung von `.portfolio`-Dateien, die mit [Portfolio Performance](https://www.portfolio-performance.info/) erstellt wurden.

Die Integration liest direkt die gepackte `.portfolio`-Datei (inkl. proprietärem Header) und zeigt ausgewählte Kennzahlen aus deinem Depot als Sensoren in Home Assistant an – z. B.:

- Anzahl gehaltener Wertpapiere
- Gesamtwert des Portfolios
- Dividendenzahlungen
- Realisierte/unrealisierte Gewinne (in Entwicklung)

---

## 🚀 Installation über HACS

1. Öffne **HACS → Integrationen**
2. Klicke auf „…“ (3 Punkte oben rechts) → **Benutzerdefinierte Repositories**
3. Gib folgendes Repository ein: https://github.com/Freakandi/ha-pp-reader
Wähle Typ: **Integration**, und bestätige mit „Hinzufügen“
4. Danach erscheint die Integration unter den HACS-Integrationen → **Installieren**
5. Nach dem Neustart in Home Assistant unter „Integrationen“ hinzufügen

---

## ⚙️ Einrichtung

Die Integration fragt per UI den Pfad zur `.portfolio`-Datei ab.  
Diese Datei muss:

- im Dateisystem von Home Assistant verfügbar sein  
(z. B. per Samba, NFS, USB oder `/media`-Freigabe)
- im Originalformat (gepackt) vorliegen

**Beispielpfad:**
/media/Daten/Beispiel.portfolio

---

## 🧩 Aktuell enthaltene Sensoren

| Sensorname                      | Beschreibung                          |
|----------------------------------|----------------------------------------|
| `sensor.depot_anzahl_wertpapiere` | Zählt alle aktuell enthaltenen Wertpapiere |

---

## 🔧 Entwicklung

Dieses Projekt befindet sich in aktiver Entwicklung.

Geplante Erweiterungen:

- Sensor für **Gesamtwert** (nach Währung)
- Sensor für **Performance p.a.**
- Sensor für **realisierte Gewinne / Verluste**
- Sensor für **Dividendenzahlungen**
- Darstellung als Lovelace-Dashboard (Tabellen, Grafiken)
- Live-Berechnung von Metriken wie **Volatilität** oder **Sharpe Ratio**

---

## 🧪 Lokale Entwicklung & Tests

Für Tests außerhalb von Home Assistant steht ein separates Tooling unter `/tools` zur Verfügung.
Beispiel:

```bash
python3 tools/parser.py /pfad/zur/S-Depot.portfolio

## 🛡️  Sicherheit & Datenschutz
Diese Integration verarbeitet lokale Dateien.
Es findet kein externer Zugriff oder Upload statt.
