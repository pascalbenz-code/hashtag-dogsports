# Community: Architektur und Produktregeln

## Aktueller Umfang

Globaler Bereich „Community · Meine Vereine“ auf Startseite und in beiden Modulen sowie Verknüpfung aus der Profilverwaltung. Vereinssuche nach Namen (maximal 50 Treffer, Suche eingrenzen), Vereinsseiten, Anlegen, offene Beitritte, eigene Vereine, Austritt und chronologischer Vereinsfeed mit Seiten zu 20 Beiträgen.

Mitgliedschaft gehört zum Supabase-Konto, nicht zu einem einzelnen lokalen Hundeführerprofil. Ein Konto kann mehrere Profile verwalten und mehreren Vereinen beitreten. Das Freitextfeld `HandlerProfile.club` bleibt eine Stammdatenangabe und liefert nur Suchvorschläge. Es erteilt keine Zugriffsrechte und löst keinen automatischen Beitritt aus. Eine Community-Mitgliedschaft bestätigt keine offizielle Vereinsmitgliedschaft.

## Datenfluss und Zugriffsmodell

- Bestehende private Ergebnisse/Profile: unverändert Dexie → Sync → `dogsports_records`, ausschließlich Eigentümerzugriff.
- Gemeinsame Daten: direkt über den bestehenden authentifizierten Supabase-Client; keine zweite Benutzerverwaltung, keine lokale Community-Datenbank oder Offline-Schreibwarteschlange.
- `dogsports_clubs`: Name, Ort, Beschreibung, Ersteller, Zeitpunkt. Für angemeldete Nutzer auffindbar, nicht anonym.
- `dogsports_club_members`: zusammengesetzter Schlüssel `(club_id,user_id)`. Benutzer sehen und verwalten nur ihre eigene Mitgliedschaft.
- `dogsports_club_posts`: explizit veröffentlichte Zusammenfassung eines vollständigen THS-Ergebnisses. Enthält Hundeführername, Hundename, Veranstaltung, Datum, Disziplin, berechneten Gesamtwert, Quellenänderungszeitpunkt, optionalen Beitragstext und Veröffentlichungszeitpunkt. Keine Geburtstage, Mitglieds-/Chip-/LU-Nummern, privaten Notizen oder vollständigen Ergebnis-/Profilobjekte.
- Feed-Lesen nur als aktuelles Vereinsmitglied; Veröffentlichen nur mit eigener `user_id` und Mitgliedschaft; Löschen nur durch Autor. Tabellen erlauben keine Updates. Doppelte Veröffentlichung desselben Ergebnisses je Konto/Verein wird durch Unique Constraint verhindert.
- Austritt entfernt über den Mitgliedschafts-Fremdschlüssel eigene Beiträge im betreffenden Verein. Private Ergebnisse bleiben erhalten. Andere Beiträge und Mitgliedschaften bleiben erhalten.
- Club-Erstellung und erster Beitritt laufen atomar über `dogsports_create_club` als SECURITY INVOKER mit RLS. Keine privilegierten RLS-Umgehungsfunktionen.

## Veröffentlichung und Aktualität

Jeder Beitrag erfordert explizite Auswahl von Verein und vollständigem Ergebnis sowie Zustimmung zur Veröffentlichung. Aktuelle und künftige Gruppenmitglieder sehen ihn. Private Ergebnisänderungen und -löschungen verändern den separat veröffentlichten Stand nicht. Zum Aktualisieren Beitrag zurückziehen und erneut teilen. Nachladen erfolgt beim Öffnen, beim Gruppenwechsel und über „Aktualisieren“; kein Realtime-Abonnement. Publizierte Ergebnisse sind Selbstauskünfte, keine serverseitig geprüften offiziellen Ergebnisse.

IBGH besitzt noch keine persistierte Ergebnisverwaltung und kann daher keine Ergebnisse veröffentlichen. Leistungsrichter-Sitzungen sind ebenfalls nicht teilbar.

## Deployment und Prüfung

Additive Migration: `supabase/migrations/20261109202434_community_clubs.sql` (auf dem bestehenden Projekt angewendet). Keine neuen Umgebungsvariablen. Tabellenrechte werden zuerst vollständig entzogen und dann minimal für `authenticated` erteilt; RLS auf allen drei Tabellen. Keine Änderung vorhandener Stores, Backups oder Scoring-Regeln.

`src/domain/community.ts`: Veröffentlichung über explizite Feldliste und vorhandenes `calculateScore`. `src/data/community.ts`: API-Zugriffe. `src/components/Community.tsx`: UI. Tests: `community.test.ts`, `community.security.test.ts` (isoliertes PostgreSQL/PGlite) und Community-Ablauf im mobilen Browser-Harness.

## Spätere Erweiterungen (nicht implementiert)

Geschlossene Gruppen/Beitrittsfreigaben, verifizierte Vereinsadministratoren, Mitgliederverzeichnis, Moderation/Melden, Kommentare/Reaktionen, Medien und Benachrichtigungen benötigen eigene Berechtigungen und Datenmodelle. Die drei separaten Tabellen bilden die Grundlage; private Leistungsdaten bleiben unabhängig.
