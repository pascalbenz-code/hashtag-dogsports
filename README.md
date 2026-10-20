# #Dogsport

Installierbare, offlinefähige Hundesport-PWA. Vollständig umgesetzt ist **THS → Performance Tracker THS**; IBGH und die digitalen Leistungsrichter sind als klar markierte, erweiterbare Module vorbereitet.

## Implementiert

- modulares Dashboard mit THS/IBGH-Modulübersicht und iPhone-Bottom-Navigation
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

Grundwerte: FCI-VK1 `250`, FCI-VK2 `255`, FCI-VK3 `265`. Erst ein vollständig valider Datensatz erhält Gesamtpunkte oder Qualifikationen. Die Qualifikationsregeln entsprechen dem Entwicklungsauftrag und sind kumulativ.

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

Spätere Module können eigene Domänentypen, Datenbanken, Berechnungen und Views ergänzen, ohne die THS-Logik zu verändern. Vorbereitet, aber bewusst noch nicht fachlich implementiert: Performance Tracker IBGH, Digitaler Leistungsrichter FCI-IBGH, Statistik IBGH und Digitaler Leistungsrichter FCI-VK.

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

`npm run build` erzeugt `dist/`. Dieses Verzeichnis kann unverändert auf Netlify, Vercel, GitHub Pages oder jedem statischen HTTPS-Host veröffentlicht werden. Die Konfiguration verwendet relative Asset-Pfade. Für GitHub Pages unter **Settings → Pages** als Quelle „GitHub Actions“ wählen und einen Pages-Workflow mit `npm ci`, `npm run build` und Upload von `dist/` verwenden.

HTTPS ist für Service Worker und Installation außerhalb von `localhost` erforderlich. Nach dem ersten vollständigen Laden funktioniert die App offline.

## Installation auf dem iPhone

1. Die bereitgestellte HTTPS-Adresse in **Safari** öffnen.
2. Auf **Teilen** tippen.
3. **Zum Home-Bildschirm** auswählen.
4. Namen bestätigen und **Hinzufügen** tippen.
5. #Dogsport einmal vom Home-Bildschirm öffnen.

Alle Fachdaten bleiben lokal auf diesem Gerät. Eine Neuinstallation oder das Löschen von Safari-Websitedaten kann sie entfernen. Deshalb regelmäßig unter **Ergebnisse → JSON** ein Backup speichern. Wiederherstellung erfolgt über **Import**; bei ID-Konflikten kann Überspringen oder Ersetzen gewählt werden.

## Bekannte technische Einschränkung

Der JavaScript-Hauptchunk liegt wegen Recharts über Vites 500-kB-Warnschwelle. Dies beeinträchtigt Funktion und Offline-Nutzung nicht; bei Wachstum weiterer Module sollte routenbasiertes Code-Splitting ergänzt werden.
