# Claude in der App (Screenshots einlesen, Felder ergänzen, Sticker zeichnen)

Diese Supabase-Funktion leitet Anfragen der App an die Claude-API weiter.
Der API-Schlüssel liegt nur als Secret in Supabase, nie in der App.

1. API-Schlüssel erstellen: https://platform.claude.com/settings/keys (beginnt mit `sk-ant-`), Guthaben unter Billing.
2. Supabase → Edge Functions → Deploy a new function → Via Editor → Name `claude` → Inhalt von `index.ts` einfügen → Deploy.
3. Supabase → Edge Functions → Secrets:
   - `ANTHROPIC_API_KEY` = dein Schlüssel
   - `ALLOWED_EMAILS` = E-Mail(s), die Claude nutzen dürfen, mit Komma getrennt
   - optional `CLAUDE_MODEL` (Standard `claude-sonnet-5-5`) und `CLAUDE_MODEL_QUICK` (Standard `claude-haiku-5-5`)
4. App neu öffnen. Bei freigegebenen Konten erscheinen die Claude-Knöpfe automatisch.
