# THS Performance Tracker

Mobile-first Progressive Web App für Ergebnisse im Turnierhundsport-Vierkampf. Die Anwendung funktioniert offline, speichert ausschließlich lokal im Browser und lässt sich auf dem iPhone wie eine App installieren.

## Funktionsumfang

- Ergebnisse für VK1, VK2 und VK3 erfassen, bearbeiten und löschen
- unvollständige Ergebnisse als Entwurf sichern; Zwischenstände werden nie als Gesamtergebnis oder Qualifikation gewertet
- zentrale, getestete Punkte- und Qualifikationslogik
- persistente Speicherung mit Dexie/IndexedDB und JSON-Backup
- Statistik mit Bestwert, Durchschnitt, Qualifikationsquote und Recharts-Verlauf
- responsive Oberfläche aus Tailwind CSS und shadcn/ui-Primitiven
- offlinefähige PWA mit automatischer Service-Worker-Aktualisierung

## Punkte- und Qualifikationsmodell

Die Berechnung liegt isoliert in `src/domain/scoring.ts`:

- Unterordnung: erfasste Punkte (maximal 60)
- Hürdenlauf: `max(0, 80 − Laufzeit − Fehlerpunkte)`
- Slalomlauf: `max(0, 100 − Laufzeit − Fehlerpunkte)`
- Hindernislauf: `max(0, 100 − Laufzeit − Fehlerpunkte)`
- Gesamt: Summe aller vier Disziplinen, aber nur wenn alle Eingaben vorhanden sind
- Qualifikation: vollständiges Ergebnis, mindestens 42 Punkte in der Unterordnung und klassenbezogener Gesamtwert (VK1 220, VK2 240, VK3 250)

Die Grenzwerte stehen gesammelt in `QUALIFICATION_RULES`. Da Verbands-/Prüfungsordnungen sich ändern können, müssen sie vor produktivem Einsatz gegen die für Verein, Verband, Altersklasse und Saison geltende Prüfungsordnung geprüft werden.

## Lokal starten

Voraussetzungen: Node.js 20 oder neuer und npm.

```bash
npm install
npm run dev
```

Vite zeigt anschließend die lokale URL. Für ein zweites Gerät im WLAN kann `npm run dev -- --host` verwendet werden; iOS-PWA-Funktionen verlangen außerhalb von `localhost` eine HTTPS-Verbindung.

## Qualitätssicherung

```bash
npm test
npm run lint
npm run build
npm run preview
```

Der Production-Build entsteht in `dist/`. Die Unit-Tests decken Rundung, Fehlerabzug, fehlende Disziplinen, Gesamtpunkte und Qualifikationsgrenzen ab.

## Bereitstellen

Geeignet sind GitHub Pages, Netlify, Vercel oder jeder statische HTTPS-Host. Der Host muss für unbekannte Routen auf `index.html` zurückfallen. Beispiel Netlify: Repository verbinden, Build-Befehl `npm run build`, Veröffentlichungsverzeichnis `dist`. Beispiel Vercel: Framework `Vite`, Build `npm run build`, Output `dist`.

Der Build verwendet relative Asset-URLs und kann deshalb auch unter einer GitHub-Pages-Projekt-URL veröffentlicht werden. Für GitHub Pages unter **Settings → Pages** als Quelle „GitHub Actions“ auswählen und einen Pages-Workflow verwenden, der `npm ci`, `npm run build` und den Upload von `dist/` ausführt.

## Auf dem iPhone installieren

1. Die bereitgestellte HTTPS-URL in **Safari** öffnen.
2. Unten auf **Teilen** tippen.
3. **Zum Home-Bildschirm** wählen, Namen bestätigen und **Hinzufügen** tippen.
4. Die App einmal online starten. Danach funktioniert sie offline; Daten bleiben im IndexedDB-Speicher dieses Geräts.

Wichtig: Das Löschen der Website-Daten bzw. der App kann lokale Ergebnisse entfernen. Deshalb regelmäßig unter **Ergebnisse → Export** eine JSON-Sicherung erstellen. Private Safari-Tabs sind nicht für dauerhafte Speicherung geeignet.

## Projektstruktur

```text
src/
  components/ui/     shadcn/ui-basierte UI-Primitiven
  data/db.ts          Dexie-Schema und Persistenz
  domain/             Typen, Punkte- und Qualifikationslogik plus Tests
  App.tsx             mobile Anwendungsansichten
```
