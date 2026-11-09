import re, sys
import os
base=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
s=open(base+'build/dailylife-vorlage.html',encoding='utf8').read()
import re as _re0
def rep_opt(a,b):
    global s
    if s.count(a)==1: s=s.replace(a,b)
s=_re0.sub(r'<script id="stklib">.*?</script>\n','',s,count=1,flags=_re0.S)
def rep(a,b,cnt=1):
    global s
    assert s.count(a)==cnt,(s.count(a),a[:90]); s=s.replace(a,b)
# remove localDb + ready, insert supabase module
i=s.index("  /* ---------- Lokaler Speicher (dieses Gerät)"); j=s.index("  })();\n",s.index("  var ready = (async function () {",i))+len("  })();\n")
s=s[:i]+open(base+'src/supa.js',encoding='utf8').read()+s[j:]
# share button -> account button
i=s.index('<button type="button" class="map-btn" id="shareBtn"'); j=s.index('</button>',i)+len('</button>')
s=s[:i]+'<button type="button" class="map-btn" id="shareBtn" aria-label="Konto und Sicherung"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4"/></svg><span>Konto</span></button>'+s[j:]
rep("  $('#shareBtn').addEventListener('click', openShare);\n","")
rep("    $('#shareBtn').hidden = true;","    $('#shareBtn').hidden = false;")
rep_opt("Deine Einträge bleiben auf diesem Gerät.","Deine Einträge sind privat in deinem Konto gespeichert.")
# sticker library hook
rep_opt("  function stickerSrc(t) { return svgUrl(t.svg || fallbackSticker(t.name)); }","""  /* Vorgefertigte Stadt-Sticker: Schlüssel = Stadtname klein, ohne Akzente (z. B. 'zurich', 'paris'). Wird in einem späteren Schritt gefüllt. */
  var STICKER_LIB = window.DLS_STICKERS || {};
  function stickerKey(name) { return String(name || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function libSticker(name) {
    var k = stickerKey(name); if (!k) return '';
    if (STICKER_LIB[k]) return STICKER_LIB[k];
    var w = k.split(' ');
    for (var i = w.length; i > 0; i--) { var kk = w.slice(0, i).join(' '); if (STICKER_LIB[kk]) return STICKER_LIB[kk]; }
    return '';
  }
  function isFallbackSvg(v) { return /stroke-dasharray='2 11'/.test(v || ''); }\n  function stickerSrc(t) { var own = t.svg && !isFallbackSvg(t.svg) ? t.svg : ''; return svgUrl(own || libSticker(t.name) || t.svg || fallbackSticker(t.name)); }""")
# Sticker: zuerst Bibliothek, ohne Claude still auf Ersatz
rep_opt("    var svg = null, tried = false, why = '';\n    if (typeof sample === 'function') {","    var svg = libSticker(t.name) || null, tried = false, why = '';\n    if (!svg && typeof sample === 'function') {")
rep("    if (!svg) { svg = fallbackSticker(t.name); toast(tried ? (why || 'Der Sticker konnte nicht gezeichnet werden.') + ' Ein einfacher Ersatz ist eingesetzt.' : 'Claude steht hier nicht zur Verfügung. Ein einfacher Sticker ist eingesetzt.'); }","    if (!svg) { svg = fallbackSticker(t.name); if (tried) toast((why || 'Der Sticker konnte nicht gezeichnet werden.') + ' Ein einfacher Ersatz ist eingesetzt.'); }")
# App teilen
rep('    <div class="hbtns">','    <div class="hright"><div class="hbtns">')
rep('    </div>\n  </header>','    </div>\n    <button type="button" class="app-share" id="appShare"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>App teilen</button></div>\n  </header>')
# account sheet + auth screen html
rep('<!-- Teilen -->','''<!-- Konto -->
<div class="win" id="acct" hidden>
  <div class="sheet form-sheet" role="dialog" aria-modal="true" aria-labelledby="acT">
    <h2 id="acT">Dein Konto</h2>
    <p class="small">Angemeldet als <b id="acEmail"></b>. Deine Einträge sieht niemand außer dir.</p>
    <div class="mrows" style="margin-top:12px">
      <button type="button" class="mrow" id="acExport"><span class="mrow-ic" style="background:#2E9E5B"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14"/></svg></span><span><span class="mrow-t">Sicherung herunterladen</span><span class="mrow-d">Alle Einträge als Datei</span></span></button>
      <button type="button" class="mrow" id="acImport"><span class="mrow-ic" style="background:#3B82C4"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19h14"/></svg></span><span><span class="mrow-t">Daten importieren</span><span class="mrow-d">Sicherung oder Export-Datei einlesen</span></span></button>
      <button type="button" class="mrow" id="acLogout"><span class="mrow-ic" style="background:#56667A"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/></svg></span><span><span class="mrow-t">Abmelden</span></span></button>
    </div>
    <input type="file" id="acFile" accept="application/json,.json" hidden>
    <p class="small" id="acMsg" role="status" style="margin-top:10px"></p>
    <div class="row"><button type="button" class="btn primary" id="acClose">Fertig</button></div>
  </div>
</div>
<!-- Anmeldung -->
<div class="auth" id="auth" hidden>
  <div class="au-card">
    <img src="icon-192.png" alt="" class="au-logo" width="72" height="72">
    <h1 class="au-brand">DailyLife Safer</h1>
    <p class="au-sub">Shopping, Reisen, Restaurants, Bars, Weine und Bergwanderungen an einem Ort.</p>
    <form id="auForm" class="form" novalidate>
      <h2 id="auTitle" class="au-title">Anmelden</h2>
      <label class="fld" id="auEmailW"><span class="lbl">E-Mail</span><input id="auEmail" type="text" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="name@beispiel.ch"></label>
      <label class="fld" id="auPwW"><span class="lbl">Passwort</span><input id="auPw" type="password" autocomplete="current-password" placeholder="mindestens 8 Zeichen"></label>
      <button type="submit" class="btn primary" id="auGo">Anmelden</button>
      <button type="button" class="link" id="auForgot">Passwort vergessen?</button>
      <button type="button" class="link" id="auSwitch">Noch kein Konto? Jetzt erstellen</button>
    </form>
    <p class="au-msg" id="auMsg" role="alert"></p>
  </div>
</div>
<!-- Teilen -->''')
rep("/* Teilen */","""/* Anmeldung */
.auth { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: max(24px, env(safe-area-inset-top)) 18px max(24px, env(safe-area-inset-bottom));
  background: radial-gradient(120% 70% at 100% 0%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%), var(--bg); overflow: auto; }
.au-card { width: min(420px, 100%); padding: 28px 22px 22px; border-radius: 30px; background: var(--surface); border: 1px solid var(--line); box-shadow: var(--lift); }
.au-logo { display: block; width: 72px; height: 72px; border-radius: 20px; margin-bottom: 14px; }
.au-brand { margin: 0; font: 800 30px/1.05 var(--display); letter-spacing: -.02em; }
.au-sub { margin: 6px 0 18px; color: var(--muted); font-size: 14.5px; }
.au-title { margin: 0; font: 800 20px/1.2 var(--display); }
input[type="password"] { width: 100%; min-width: 0; min-height: 48px; padding: 0 14px; font: 16px var(--body); color: var(--ink); background: var(--bg); border: 1px solid transparent; border-radius: 14px; }
input[type="password"]:focus { outline: 0; border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent); }
#auForm .btn.primary { width: 100%; min-height: 50px; }
#auForm .link { justify-self: center; }
.au-msg { margin: 12px 0 0; font-size: 14px; font-weight: 600; color: var(--danger); }
.au-msg.ok { color: #2E9E5B; }
.au-msg:empty { display: none; }
body:not(.authed) .wrap { visibility: hidden; }
#acct { z-index: 66; }
/* Teilen */""")
import re as _re
_m=_re.search(r"'#catsheet'[^\]]*\]\.some\(",s); assert _m; s=s[:_m.end()-7]+", '#acct'"+s[_m.end()-7:]
rep("    if (S.cs) closeCatSheet(); else if (S.sh) closeShare();","    if (S.acct) closeAcct(); else if (S.cs) closeCatSheet(); else if (S.sh) closeShare();")
rep("    wform: function () { closeWform(); },","    wform: function () { closeWform(); }, acct: function () { closeAcct(); },")
# head tags extracted
title_etc=s[:s.index('<style>')]
s=s[s.index('<style>'):]
head='''<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>DailyLife Safer</title>
<meta name="theme-color" content="#0A0F15">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="DailyLife">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" href="icon-192.png">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=DM+Mono&family=Figtree:wght@400..700&display=swap">
<script src="config.js"></script>
<script src="stickers.js"></script>
<script type="module">
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.9/+esm';
window.supabase = { createClient: createClient };
window.dispatchEvent(new Event('sb-ready'));
</script>
'''
i=s.index('</style>')+len('</style>')
css=s[:i]; rest=s[i:]
css=css.replace("<style>","<style>\nhtml{-webkit-text-size-adjust:100%}\n",1)
css=css.replace("</style>",".hright{display:flex;flex-direction:column;align-items:flex-end;gap:10px;flex:none}\n.app-share{display:inline-flex;align-items:center;gap:7px;min-height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:700 13px var(--body);cursor:pointer;white-space:nowrap;box-shadow:0 6px 16px -10px rgba(0,0,0,.35)}\n.app-share:active{transform:scale(.96)}\n.app-share{background:var(--jcard,var(--surface));color:var(--jink,var(--ink));border:1.5px solid var(--jink,var(--line));box-shadow:3px 3px 0 var(--jline,transparent);font-family:var(--jtype,var(--body))}\nhtml body{padding-top:calc(env(safe-area-inset-top, 0px) + 22px)}\nbody.snapview #shareBtn{display:none!important}\n</style>",1)
out=head+css+'\n</head>\n<body>\n'+rest.strip()+'''
<script>
if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
</script>
</body>
</html>
'''
open(base+'../index.html','w',encoding='utf8').write(out)
open(base+'build/check3.js','w').write(max(re.findall(r'<script>(.*?)</script>',out,re.S),key=len))
print('ok', len(out)//1024,'KB')
