# Personalisierung, Einladungen und Kennungen

## Dashboard

Die App-Einstellungen zeigen oberhalb der Darstellung eine Auswahl für THS/IBGH. Sie steuert die Modulkacheln auf der Startseite. Standard ist alles sichtbar; „Alle Module anzeigen“ setzt Ausblendungen zurück. Auch alle Module dürfen ausgeblendet werden; eine sichtbare Schaltfläche führt dann zurück zur Konfiguration. Fachliche Daten werden nicht gelöscht und Modulnavigation innerhalb einer bereits geöffneten Ansicht bleibt verfügbar.

Ausblendungen liegen kontogebunden auf dem jeweiligen Gerät unter `dogsports-hidden-modules-v1:<auth-user-id>`. Gespeichert werden ausgeschlossene Module statt einer Positivliste, damit später neue Module standardmäßig sichtbar sind. Beschädigter oder gesperrter Speicher blockiert die App nicht; ein fehlgeschlagenes Schreiben wird angezeigt. Keine Cloud-Synchronisation dieser Einstellung. Maßgeblich: `src/domain/dashboardPreferences.ts`, `ThemeSettings.tsx`, `App.tsx`.

## Freunde einladen

Button in Community und Einstellungen: `navigator.share` übergibt Titel, Einladungstext und `https://hashtag-dogsports.vercel.app` an das native Teilen-Menü. Auf iPhone werden die vom Gerät unterstützten Ziele angeboten (z. B. AirDrop, Nachrichten, WhatsApp). Ohne Web Share wird der Link kopiert; bei fehlender Clipboard-Unterstützung oder Fehler erscheint ein manuell auswählbares Linkfeld. Abbrechen des nativen Menüs ist kein Fehler. Keine Tracking-/Referralparameter oder automatische Vereinsbeitritte. `src/components/InviteFriendsButton.tsx`.

## Öffentliche Kennungen

Die Anforderung nennt sechs Ziffern, aber ein vierstelliges Beispiel. Implementierte Konvention: sechs Ziffern, Start `000001`, Ziffernbereich `000001`–`999999`, danach nächster Buchstabenblock:

| Typ | Start | Übergang |
| --- | --- | --- |
| Supabase-Benutzerkonto | `#A000001` | `#A999999` → `#B000001` |
| Hundeprofil | `+A000001` | `+A999999` → `+B000001` |
| Verein | `*A000001` | `*A999999` → `*B000001` |

Nach Z folgt AA. Jeder Typ besitzt eine eigene atomare PostgreSQL-Sequenz. Rollbacks können Nummernlücken erzeugen; Sequenzen werden nicht zurückgesetzt. Kennungen sind keine Geheimnisse oder Zugriffsberechtigungen. Alle bestehenden UUIDs/Datensatz-IDs bleiben die technischen Schlüssel.

- `dogsports_user_ids`: `user_id` → `public_id`, für Clients nur eigene Zeile lesbar. Automatische Vergabe beim Anlegen in `auth.users`. Anzeige in Einstellungen und Profilverwaltung.
- `dogsports_dog_ids`: `(user_id, record_id)` → `public_id`, für Clients nur eigene Hunde lesbar. Automatische Vergabe beim ersten Cloud-Upsert eines aktiven Hundeprofils. Bearbeiten, Tombstone und Wiederherstellen derselben technischen ID behalten die Kennung. Ein Hundeprofil unter einem anderen Konto ist ein eigenständiger Datensatz mit neuer Kennung; keine automatische Zusammenführung anhand Chipnummer o. Ä. Offline angelegte Hunde erhalten die zentrale Kennung erst beim Cloud-Abgleich; die UI zeigt das ausdrücklich an.
- `dogsports_clubs.public_id`: einmalig beim INSERT vergeben, eindeutig und unveränderlich. Vereinsseiten und Listen zeigen die Kennung. Suche unterstützt den vollständigen Vereinscode zusätzlich zum Vereinsnamen.

Vergabe ausschließlich über nicht öffentlich ausführbare Triggerfunktionen im privaten Schema; API-Rollen haben weder Schreibrecht auf die Register noch Sequenzzugriff. Club-ID-Eingaben werden beim INSERT durch die Serververgabe ersetzt. Die additive Migration `supabase/migrations/20261110053503_public_identifiers.sql` wurde auf dem bestehenden Projekt angewendet und ergänzt Kennungen für vorhandene Benutzer, aktive Cloud-Hundeprofile und Vereine. Keine Änderungen an privaten JSONB-Payloads, Dexie-Schema, Backups oder Fachberechnungen. Ein Backup behält technische Profil-IDs; nach Wiederherstellung unter demselben Konto wird dieselbe Registerkennung gefunden.

`src/data/identifiers.ts` lädt die Register nach Anmeldung und nach erfolgreichem Cloud-Abgleich. Datenbanktests prüfen Bestandsmigration, Buchstabenwechsel, automatische Vergabe, Stabilität und Benutzertrennung; der mobile Browser-Harness prüft Modulauswahl über Neuladen, native Share-Übergabe, Clipboard-Fallback und Kennungsanzeige. Das native iOS-Menü selbst wurde nicht auf einem physischen iPhone getestet.
