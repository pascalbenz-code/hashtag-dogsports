# #Dogsports – verbindliche Entwicklungsregeln

## Vor jeder Änderung

1. Lies `docs/PROJECT_CONTEXT.md`, `docs/BUSINESS_RULES.md` und `docs/DEVELOPMENT_STATUS.md`.
2. Prüfe danach die betroffenen Domänendateien und Tests; die Dokumentation ersetzt nicht den Code.
3. Trenne nachweislich implementiertes Verhalten von Anforderungen oder Ideen. Erfinde keine Prüfungsregeln.

## Stack und Architektur

- React 19, TypeScript, Vite 8, Tailwind CSS 4, kleine shadcn/ui-artige Primitives.
- Dexie/IndexedDB ist der lokale Offline-First-Speicher; Supabase Auth/Postgres synchronisiert benutzergebunden.
- Recharts für Diagramme, vite-plugin-pwa für PWA/Offline-Installation, Vitest für Tests.
- Schichten: `domain/` enthält Typen und reine Fachlogik, `data/` Persistenz/Sync/Backup, `components/` UI, `theme/` Darstellung. Keine Berechnungslogik in UI-Komponenten duplizieren.
- Navigation ist zustandsbasiert in `App.tsx`, ohne React Router.

## Schutzregeln

- Bestehende Ergebnis-, Profil- und Sync-Daten niemals löschen, umdeuten oder still migrieren. Dexie- und Supabase-Änderungen nur additiv, nachvollziehbar und getestet; IDs, Zeitstempel, `null` und Entwurfszustände erhalten.
- Berechnungen, Vollständigkeitsprüfung, Qualifikationen, Fehlerdetails und Bewertungsmatrizen nur mit ausdrücklich bestätigter Fachgrundlage ändern. Jede Änderung braucht Grenzwert-, Kumulations- und Unvollständigkeitstests.
- Fehlende Werte sind nicht `0`. Nur vollständige Ergebnisse erhalten Gesamtpunkte und Qualifikationen.
- Supabase-RLS und Benutzerbindung nicht umgehen. Nie `service_role` oder Geheimnisse in Clientcode/Repository ablegen.
- IFH ist bewusst entfernt. Nicht aus Altcode, Chatverlauf oder Umgebungsvariablen reaktivieren.
- IBGH-Platzhalter nicht als fertige Ergebnisverwaltung darstellen. Leistungsrichter-Auswertungen sind derzeit nicht persistent und keine offiziellen Prüfungsergebnisse.
- Deutschsprachige, mobile, zugängliche UI beibehalten; Theme-Tokens und vorhandene Komponenten verwenden.
- Bestehende Module und Daten rückwärtskompatibel halten. Deployments, Branch-Merges und externe Änderungen nur bei ausdrücklichem Auftrag.

## Prüfung

Vor Übergabe mindestens `npm test`, `npm run lint` und `npm run build` ausführen. Fachlogik mit gezielten Unit-Tests absichern. Keine rein optischen Buttons oder erfundenen Statistikdaten einführen.

## Weiterführende Dokumentation

- Architektur und Dateikarte: `docs/PROJECT_CONTEXT.md`
- Fachregeln und Quellenstatus: `docs/BUSINESS_RULES.md`
- Implementierungsstand und offene Arbeit: `docs/DEVELOPMENT_STATUS.md`
- Sicherheitsbefunde und offene Freigaben: `docs/SECURITY_AUDIT.md`
