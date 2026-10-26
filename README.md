# #Dogsports

Installierbare, offlinefähige Hundesport-PWA mit THS, IBGH und dem integrierten Modul **IFH** für Planung, Dokumentation und Auswertung von Fährtentraining.

Das visuelle System basiert auf dem #Dogsports-Banner in `public/dogsports-banner.webp`: Schwarz/Anthrazit (`#111212`), Weiß (`#FEFEFE`), Stahlblau (`#1776A7`), Hauptblau (`#31ABE4`), Cyan (`#59D3F9`) und kühles Neutralblau (`#A2C0CE`).

## Implementiert

- modulares Dashboard mit THS/IBGH/IFH-Modulübersicht und iPhone-Bottom-Navigation
- CRUD für vollständige Ergebnisse und Entwürfe, eindeutige UUIDs und Zeitstempel
- automatische Formular-Zwischenspeicherung sowie dauerhafte IndexedDB-Persistenz mit Dexie
- exakte FCI-VK1/2/3-Gesamtpunkteberechnung und kumulative Qualifikationen
- Suche, Stufen-/Qualifikationsfilter, Entwurfsschalter und Sortierung
- kompakte mobile Karten und horizontal scrollbarere vollständige Ergebnistabelle
- Bestleistungen einschließlich Gleichständen
- acht Statistikfelder, Zeit- und Stufenfilter, Minimum, Maximum, Mittelwert, Stichproben-Standardabweichung, Trend und begrenzte Prognose
- interaktive Recharts-Diagramme mit Messpunkten, Tooltip, Mittelwert und Prognosepunkt
- deutsches JSON-Backup mit Schema- und Konfliktprüfung sowie Excel-kompatibler CSV-Export
- Hell-/Dunkelmodus entsprechend der Systemeinstellung
- offlinefähige PWA ohne Tracking, Konto, Server oder kostenpflichtige APIs

## Fachlogik

Die reproduzierbare Berechnung liegt in `src/domain/scoring.ts`:

```text
Gesamt = Grundwert + Unterordnung
         − Hürdenzeit − Hürdenfehler
         − Slalomzeit − Slalomfehler
         − Hinderniszeit − Hindernisfehler
```

Grundwerte: FCI-VK1 `250`, FCI-VK2 `255`, FCI-VK3 `265`. Erst ein vollständig valider Datensatz erhält Gesamtpunkte oder Qualifikationen. Aufstieg-VK3 und swhv-Quali gelten für Vereinsprüfung/Kreismeisterschaft, die dhv-Quali für die Verbandsmeisterschaft und die VDH-Quali für alle fünf Turnierarten. Auf einer Verbandsmeisterschaft schließt die dhv-Quali kumulativ die swhv-Quali ein. Nach jedem erfolgreichen Speichern wird die Eingabemaske geleert; Bearbeitungen beginnen ausschließlich über die Ergebnisübersicht.

Statistiklogik befindet sich in `src/domain/statistics.ts`. Die Standardabweichung verwendet `n − 1`; der Trend regressiert über die letzten drei, die Prognose über die letzten maximal fünf Werte. Prognosen sind ausdrücklich als Schätzung markiert.

## Architektur

```text
src/
  components/ui/       gemeinsame shadcn/ui-Primitiven
  data/
    db.ts               Dexie-Datenbank und CRUD
    backup.ts           JSON-Validierung/-Import und JSON-/CSV-Export
  domain/
    types.ts            THS-Domänenmodell
    scoring.ts          Validierung, Gesamtpunkte, Qualifikationen
    statistics.ts       Kennwerte, Regression, Trend, Prognose
    results.ts          Filter, Sortierung, Bestleistungen
  test/                 Testdaten-Fabrik
  App.tsx               App-Shell und modulare Ansichten
```

Die Startseite trennt die Sportbereiche THS und IBGH. Nach der Modulauswahl stehen in beiden Bereichen dieselben fünf Navigationsziele bereit: Dashboard, Digitaler Leistungsrichter, Ergebnisse, Neuer Eintrag und Statistik. Der aktive Modulbereich bleibt in der Kopfzeile sichtbar. Die bestehenden THS-Funktionen bleiben unverändert; Ergebnisse, neuer Eintrag und Statistik sind im Modul IBGH zunächst klar gekennzeichnete Platzhalter ohne Datenspeicherung.

Die Digitalen Leistungsrichter VDH-VK und FCI-IBGH liegen als interaktive Entwürfe mit konfigurierbaren Unteraufgaben, Detailabzügen und automatischen Wertungen vor. FCI-IBGH3 unterstützt zusätzlich fünf vorgeschriebene Übungsreihenfolgen.

Das Modul IFH bietet Übersicht, Trainingsplanung, gespeicherte Einheiten, Fortschrittsauswertung und ein versioniertes Regelwerk. Plan und tatsächlich gelegte Fährte werden getrennt gespeichert. Entwürfe, Timer-Zeitstempel, Einzelbewertungen, schematische Vorschau, Aufbauhinweise und regelbasierte Trainingsvorschläge funktionieren vollständig lokal. Vorhandene Hundenamen aus THS dienen als Auswahlhilfe; es wird keine parallele Profilverwaltung geführt.

Die IFH-Regeln enthalten Regel-ID, Stufe, Regelart, Quelle, Version und Verifikationsstatus. Da die FCI-Prüfungsordnung 2025, Seiten 67–76, bei der Implementierung nicht als PDF verfügbar war, lautet der Status derzeit **„Originalquelle noch zu prüfen“**. Die Abbildung und Tabellenlogik auf Seite 70 wird deshalb nicht als automatische Foto- oder Positionsbewertung ausgegeben.

## Lokale Datenmigration

Dexie aktualisiert die bestehende Datenbank beim ersten Start additiv von Version 1 auf Version 2 und ergänzt `ifhSessions`. Die vorhandene Tabelle `results` und alle THS-Daten bleiben unverändert. Eine manuelle Migration oder Serverkonfiguration ist nicht erforderlich.

## Lokal starten und prüfen

Voraussetzung: Node.js 20 oder neuer.

```bash
npm ci
npm run dev
```

Qualitätssicherung:

```bash
npm test
npm run lint
npm run build
npm run preview
```

Die Tests decken FCI-Berechnung, Grenzwerte, kumulative Qualifikationen, Entwürfe, ungültige Werte, Statistik, Trend, Prognose, Filter, Sortierung, Bestleistungen, Backup-Konflikte und IndexedDB-Wiederherstellung ab. GitHub Actions führt Test, Lint und Build automatisch aus.

## Bereitstellung

`npm run build` erzeugt `dist/`. Das Projekt ist für Vercel mit Framework-Preset **Vite**, Build-Befehl `npm run build` und Output-Verzeichnis `dist` ausgelegt. Das GitHub-Repository darf privat bleiben, solange die Vercel-GitHub-App Zugriff darauf besitzt; öffentliche Sichtbarkeit ist für Vercel nicht erforderlich. Alternativ kann `dist/` auf jedem statischen HTTPS-Host veröffentlicht werden.

HTTPS ist für Service Worker und Installation außerhalb von `localhost` erforderlich. Nach dem ersten vollständigen Laden funktioniert die App offline.

## Installation auf dem iPhone

1. Die bereitgestellte HTTPS-Adresse in **Safari** öffnen.
2. Auf **Teilen** tippen.
3. **Zum Home-Bildschirm** auswählen.
4. Namen bestätigen und **Hinzufügen** tippen.
5. #Dogsports einmal vom Home-Bildschirm öffnen.

Alle Fachdaten bleiben lokal auf diesem Gerät. Eine Neuinstallation oder das Löschen von Safari-Websitedaten kann sie entfernen. Deshalb regelmäßig unter **Ergebnisse → JSON** ein Backup speichern. Wiederherstellung erfolgt über **Import**; bei ID-Konflikten kann Überspringen oder Ersetzen gewählt werden.

## Bekannte technische Einschränkung

Der JavaScript-Hauptchunk liegt wegen Recharts über Vites 500-kB-Warnschwelle. Dies beeinträchtigt Funktion und Offline-Nutzung nicht; bei Wachstum weiterer Module sollte routenbasiertes Code-Splitting ergänzt werden.
