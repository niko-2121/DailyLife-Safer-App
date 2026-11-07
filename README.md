# DailyLife Safer – Einrichtung

Eigenständige Web-App mit Login pro Person. Code: dieser Ordner. Daten: Supabase. Webseite: Cloudflare Pages.
Einmalig ca. 30 Minuten. Alles mit kostenlosen Plänen.

> Wichtig: Die Datei `meine-daten-import.json` (deine Einträge) gehört **nicht** in dieses Projekt und nicht zu GitHub.
> Du liest sie nach dem ersten Login in der App ein.

## 1. Supabase (Datenbank + Login)
1. supabase.com öffnen → „Start your project“ → Konto erstellen.
2. „New project“: Name `dailylife`, ein sicheres Datenbank-Passwort (aufbewahren), Region in Europa (z. B. Frankfurt) → „Create“. 1–2 Minuten warten.
3. Links „SQL Editor“ → „New query“ → Inhalt von `supabase-setup.sql` einfügen → „Run“. Es sollte „Success“ erscheinen.
4. „Project Settings“ → „API“ bzw. „API Keys“: die **Project URL** und den **öffentlichen Schlüssel** („anon public“ oder „publishable“) kopieren.
   Den geheimen Schlüssel („service_role“ / „secret“) **nie** verwenden.
5. Beide Werte in `config.js` eintragen (oder an Claude schicken, dann kommt die fertige Datei zurück).

## 2. GitHub (Code)
1. github.com → Konto erstellen.
2. Oben rechts „+“ → „New repository“ → Name `dailylife-safer` → „Private“ → „Create repository“.
3. „uploading an existing file“ → alle Dateien aus diesem Ordner hineinziehen → „Commit changes“.

## 3. Cloudflare Pages (Webseite)
1. dash.cloudflare.com → Konto erstellen.
2. „Workers & Pages“ → „Create“ → Reiter „Pages“ → „Connect to Git“ → GitHub verbinden → `dailylife-safer` wählen.
3. Framework preset: **None**, Build command: **leer**, Build output directory: **/** → „Save and Deploy“.
4. Nach einer Minute steht die Adresse da, z. B. `https://dailylife-safer.pages.dev`.

## 4. Supabase mit der Adresse verbinden
Supabase → „Authentication“ → „URL Configuration“: bei **Site URL** und unter **Redirect URLs** die Adresse aus Schritt 3 eintragen → speichern.
Sonst führen die Links in Bestätigungs- und Passwort-E-Mails ins Leere.

## 5. Auf dem iPhone
1. Adresse in **Safari** öffnen → „Noch kein Konto? Jetzt erstellen“ → E-Mail + Passwort.
2. Bestätigungs-E-Mail öffnen und Link antippen.
3. In Safari „Teilen“ → „Zum Home-Bildschirm“ → „Hinzufügen“. Ab jetzt die App über das Symbol starten und dort **einmal anmelden** (das Symbol hat einen eigenen Speicher, getrennt von Safari).
4. Deine bisherigen Einträge: `meine-daten-import.json` in „Dateien“ speichern → in der App oben „Konto“ → „Daten importieren“ → Datei wählen.

## Andere Personen
Link schicken. Jede Person erstellt ihr eigenes Konto und sieht nur ihre eigenen Einträge.
Hinweis: Der kostenlose Supabase-Mailversand schickt nur wenige E-Mails pro Stunde. Kommt eine Bestätigung nicht, später erneut versuchen.

## Updates
GitHub mit Claude verbinden (Einstellungen → Konnektoren) und Claude den Projektnamen nennen.
Claude ändert den Code direkt im Projekt, Cloudflare veröffentlicht automatisch, alle bekommen die neue Version beim nächsten Öffnen. Daten bleiben unberührt.

## Gut zu wissen
- Kostenlose Supabase-Projekte pausieren nach längerer Nichtnutzung; dann im Supabase-Dashboard „Restore“ tippen.
- „Konto“ → „Sicherung herunterladen“ speichert alle Einträge als Datei.
- Stadt-Sticker kommen aus `stickers.js` (wird später gefüllt).
