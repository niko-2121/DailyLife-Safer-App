# DailyLife Safer – Übergabe für neue Chats

Persönliche Web-App des Users (Deutsch, iPhone, Zürich): Shopping-Wunschregal, Reisen, Restaurants, Bars, Weine, Bergwanderungen und eigene Kategorien. Antworten immer auf Deutsch, kurz und ohne Fachjargon. Der User arbeitet am Handy und schickt oft Screenshots.

## Zwei Versionen – immer beide gleich halten
Jede Design- oder Funktionsänderung kommt in **beide** Versionen, gleiches Layout und Design. Die Daten sind getrennt.

1. **Claude-Artefakt** https://claude.ai/artifact/K8NqyKNwKqmA5dw6S1Ut1N
   - Quelle: `dev/schweberegal.html` (einzige Quelle der Wahrheit für Design und Logik)
   - Daten in der Artefakt-Datenbank (Sammlungen `items`, `trips` (`wish:true` = Wunschreise), `places` (`kind` rest/bar), `wines` (`list` fav/try), `hikes`, `entries` (eigene Kategorien), `lists/einkauf` (Einkaufszettel: `items[{id,t,done}]`, `trash`), `pub/layout`, `pub/meta`, `pub/<kat>/list` für Live-Freigaben)
   - Veröffentlichen: Artifact-Tool mit `file_path` = dev/schweberegal.html und `url` = Artefakt-URL oben. `capabilities` weglassen (werden übernommen). Vorher einmal `action: read` auf die URL, sonst wird der Publish abgelehnt.
2. **Eigenständige App (PWA)** https://niko-2121.github.io/DailyLife-Safer-App/ (Pfad mit Groß-/Kleinschreibung!)
   - GitHub Pages aus diesem Repo, Branch `main`, Ordner `/`. `index.html` wird **gebaut**, nicht von Hand bearbeitet.
   - Backend Supabase: `https://qkbxdfyivtmjinsdgbsl.supabase.co`, Publishable Key steht in `config.js`.
     - Tabelle `docs(user_id, path, data jsonb)` mit RLS (`supabase-setup.sql`)
     - Tabelle `shares` + Funktion `get_share(sid)` für eingefrorene Kategorie-Links `#s=<id>` (`supabase/shares.sql`, vom User am 9.11.2026 auszuführen)
     - Edge Function `claude` (`supabase/functions/claude/`, Secrets ANTHROPIC_API_KEY, ALLOWED_EMAILS) für Claude-Funktionen in der App. Ob sie deployt ist, ist unbestätigt.
   - Neue Konten starten leer; die Daten des Users bleiben privat.
   - Aus der Cloud-Umgebung ist Supabase und github.io meist nicht erreichbar (Proxy-Allowlist). Pages-Status über `gh run list` prüfen.

## Bauen und testen
```
cd dev
python3 src/mkvorlage.py   # schweberegal.html -> build/dailylife-vorlage.html (ready-Block -> src/local_part.js)
python3 src/build.py       # -> ../index.html (fügt src/supa.js, Konto-UI, PWA, stickers.js ein)
node --check build/check3.js
python3 test/ui_artifact.py  # Playwright, Artefakt mit Mock-DB, Screenshots in build/
python3 test/ui_app.py       # Playwright, App mit Supabase-Mock, testet auch Kategorie-Teilen
```
- Chromium: `/usr/bin/google-chrome` (in den Skripten gesetzt). Screenshots bei 390×844 ansehen.
- Echte Daten des Users nie ins Repo legen. `test/seed/<sammlung>/<id>.json` ist optional und lokal (per ArtifactData aus dem Artefakt holen), sonst synthetische Daten.
- `src/build.py` arbeitet mit Textersetzungen auf dem HTML. Wenn eine Ersetzung fehlschlägt, die Fundstelle in schweberegal.html prüfen; `rep_opt` für optionale Stellen.
- `stickers.js` (Stadt-Sticker) liegt im Repo-Root; im Artefakt ist dieselbe Bibliothek inline als `<script id="stklib">`. Neue Sticker an beiden Stellen ergänzen.

## Ablauf bei jeder Änderung
1. `dev/schweberegal.html` bearbeiten (bei App-spezifischem: `dev/src/supa.js` / `build.py`).
2. Bauen, Syntax prüfen, Screenshots ansehen.
3. **Vor jedem Push fremde Commits prüfen** (der User arbeitet manchmal in anderen Chats): `git fetch && git log --oneline HEAD..FETCH_HEAD`, dann `git pull --rebase`. Nie fremde Änderungen überschreiben.
4. Commit + Push (`main`), danach Artefakt veröffentlichen.

## Aufbau von schweberegal.html (Orientierung)
- Ein `<style>` mit vielen Schichten; spätere Blöcke am Ende überschreiben frühere (Notizzettel-/Post-it-Design, Klebestreifen, Pastellfarben pro Kategorie).
- Startseite „Reisetagebuch“: `jHub`, `jHead`, `jTrips` (Bordkarte), `jPlaces`, `jShop`, `jWine`, `jHike`, `jCustom`, `jList` (Einkaufszettel, Fenster `#lwin`, Funktionen `lz*`); Konstanten `JCOL`, `JNOTE`, `PHL`, `JKICK`. Teilen-Symbol pro Zettel: `catShareIcon` → `shareCategory` (App: `window.dlsSnapShare`, Artefakt: Live-Teilen-Fenster `openShare`).
- Fenster: `#swin` Shopping, `#twin` Reisen, `#rwin` Restaurants/Bars, `#vwin` Weine (Reiter `#vwTabs`, `S.wlist`), `#hwin` Wanderungen, `#cwin` eigene Kategorien.
- Flaggen: `FLAG_SVG`, `flagCode`, `cuisineIcon`.
- Zustand in `S`, Rendering über `render()`, `h()` als DOM-Helfer.

## Offene Punkte (Stand 9.11.2026)
- User muss `supabase/shares.sql` in Supabase ausführen und das Kategorie-Teilen am iPhone testen.
- Neue Einträge aus der App (z. B. „Crest nylon windbreaker“, „Ohrring Anni“, „Restaurant Bindella“) sind noch nicht im Artefakt; dafür braucht es einen vollständigen Export aus der App (Konto → Sicherung herunterladen).
