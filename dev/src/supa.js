  /* ---------- Speicher in Supabase: gleiche Schnittstelle wie zuvor, Daten pro angemeldeter Person ---------- */
  var SB = null, UID = null, EMAIL = '';
  function supaDb(sb, uid) {
    var map = {}, csubs = {}, dsubs = {}, n = 0, warned = false;
    function parent(p) { return p.slice(0, p.lastIndexOf('/')); }
    function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
    function csnap(c) {
      var docs = Object.keys(map).filter(function (p) { return parent(p) === c; }).map(function (p) { var o = Object.freeze(clone(map[p])); return { id: p.slice(c.length + 1), data: function () { return o; } }; });
      docs.sort(function (a, b) { return (b.data().createdAt || 0) - (a.data().createdAt || 0); });
      return { empty: !docs.length, metadata: { fromCache: false }, docs: docs };
    }
    function dsnap(p) { var e = p in map, o = e ? Object.freeze(clone(map[p])) : undefined; return { exists: e, id: p.split('/').pop(), data: function () { return o; } }; }
    function fire(p) {
      var c = parent(p);
      setTimeout(function () { (csubs[c] || []).forEach(function (f) { f(csnap(c)); }); (dsubs[p] || []).forEach(function (f) { f(dsnap(p)); }); }, 0);
    }
    function fireAll() {
      setTimeout(function () {
        Object.keys(csubs).forEach(function (c) { csubs[c].forEach(function (f) { f(csnap(c)); }); });
        Object.keys(dsubs).forEach(function (p) { dsubs[p].forEach(function (f) { f(dsnap(p)); }); });
      }, 0);
    }
    async function persist(p, prev, had) {
      var r;
      if (p in map) r = await sb.from('docs').upsert({ user_id: uid, path: p, data: map[p], updated_at: new Date().toISOString() }, { onConflict: 'user_id,path' });
      else r = await sb.from('docs').delete().eq('user_id', uid).eq('path', p);
      if (r && r.error) {
        if (had) map[p] = prev; else delete map[p];
        fire(p);
        if (!warned) { warned = true; setTimeout(function () { warned = false; }, 8000); toast('Speichern hat nicht geklappt. Bist du online?'); }
        throw { code: 'save_failed', message: r.error.message };
      }
    }
    function ref(p) {
      return {
        id: p.split('/').pop(), path: p,
        get: function () { return Promise.resolve(dsnap(p)); },
        set: function (d) { var had = p in map, prev = clone(map[p]); map[p] = clone(d); fire(p); return persist(p, prev, had); },
        update: function (d) { if (!(p in map)) return Promise.reject({ code: 'invalid_argument' }); var prev = clone(map[p]); Object.assign(map[p], clone(d)); fire(p); return persist(p, prev, true); },
        delete: function () { var had = p in map, prev = clone(map[p]); delete map[p]; fire(p); return persist(p, prev, had); },
        onSnapshot: function (cb) { (dsubs[p] = dsubs[p] || []).push(cb); setTimeout(function () { cb(dsnap(p)); }, 0); return function () {}; }
      };
    }
    function col(c) {
      var q = {
        orderBy: function () { return q; }, where: function () { return q; }, limit: function () { return q; },
        onSnapshot: function (cb) { (csubs[c] = csubs[c] || []).push(cb); setTimeout(function () { cb(csnap(c)); }, 0); return function () {}; },
        add: function (d) { var id = 'd' + Date.now().toString(36) + (++n).toString(36); var p = c + '/' + id; map[p] = clone(d); fire(p); return persist(p, undefined, false).then(function () { return { id: id }; }); },
        doc: function (id) { return ref(c + '/' + id); }
      };
      return q;
    }
    async function load() {
      var all = {}, from = 0, step = 200;
      for (;;) {
        var r = await sb.from('docs').select('path,data').eq('user_id', uid).order('path').range(from, from + step - 1);
        if (r.error) throw r.error;
        (r.data || []).forEach(function (row) { all[row.path] = row.data; });
        if (!r.data || r.data.length < step) break;
        from += step;
      }
      map = all;
    }
    var api = {
      collection: col, doc: ref,
      reload: async function () { await load(); fireAll(); },
      dump: function () { return clone(map); },
      importDocs: async function (docs, onStep) {
        var keys = Object.keys(docs), done = 0;
        for (var i = 0; i < keys.length; i += 8) {
          var rows = keys.slice(i, i + 8).map(function (k) { return { user_id: uid, path: k, data: docs[k], updated_at: new Date().toISOString() }; });
          var r = await sb.from('docs').upsert(rows, { onConflict: 'user_id,path' });
          if (r.error) throw r.error;
          rows.forEach(function (row) { map[row.path] = clone(row.data); });
          done += rows.length; if (onStep) onStep(done, keys.length);
        }
        fireAll();
      }
    };
    return load().then(function () { return api; });
  }

  /* ---------- Anmeldung ---------- */
  var CFG = window.DLS_CONFIG || {};
  function cfgOk() { return /^https:\/\/.+/.test(CFG.supabaseUrl || '') && (CFG.supabaseKey || '').length > 20 && !/HIER/.test(CFG.supabaseUrl + CFG.supabaseKey); }
  var AU = { mode: 'login', busy: false };
  function authShow(on) { $('#auth').hidden = !on; document.body.classList.toggle('authed', !on); }
  function authMsg(t, ok) { var m = $('#auMsg'); m.textContent = t || ''; m.classList.toggle('ok', !!ok); }
  function authMode(m) {
    AU.mode = m; authMsg('');
    $('#auTitle').textContent = m === 'signup' ? 'Konto erstellen' : m === 'reset' ? 'Passwort zurücksetzen' : m === 'newpw' ? 'Neues Passwort' : 'Anmelden';
    $('#auEmailW').hidden = m === 'newpw';
    $('#auPwW').hidden = m === 'reset';
    $('#auPw').autocomplete = m === 'login' ? 'current-password' : 'new-password';
    $('#auGo').textContent = m === 'signup' ? 'Konto erstellen' : m === 'reset' ? 'Link senden' : m === 'newpw' ? 'Passwort speichern' : 'Anmelden';
    $('#auSwitch').textContent = m === 'login' ? 'Noch kein Konto? Jetzt erstellen' : 'Zurück zur Anmeldung';
    $('#auForgot').hidden = m !== 'login';
    $('#auSwitch').hidden = m === 'newpw';
  }
  $('#auSwitch').addEventListener('click', function () { authMode(AU.mode === 'login' ? 'signup' : 'login'); });
  $('#auForgot').addEventListener('click', function () { authMode('reset'); });
  function appUrl() { return location.origin + location.pathname; }
  $('#auForm').addEventListener('submit', async function (e) {
    e.preventDefault(); if (AU.busy || !SB) return;
    var email = $('#auEmail').value.trim(), pw = $('#auPw').value, r;
    if (AU.mode !== 'newpw' && !/^\S+@\S+\.\S+$/.test(email)) { authMsg('Bitte gib eine gültige E-Mail-Adresse ein.'); return; }
    if (AU.mode !== 'reset' && pw.length < 8) { authMsg('Das Passwort braucht mindestens 8 Zeichen.'); return; }
    AU.busy = true; $('#auGo').disabled = true; authMsg('');
    try {
      if (AU.mode === 'login') {
        r = await SB.auth.signInWithPassword({ email: email, password: pw });
        if (r.error) authMsg(/confirm/i.test(r.error.message) ? 'Bitte bestätige zuerst deine E-Mail-Adresse über den Link im Postfach.' : 'E-Mail oder Passwort stimmt nicht.');
      } else if (AU.mode === 'signup') {
        r = await SB.auth.signUp({ email: email, password: pw, options: { emailRedirectTo: appUrl() } });
        if (r.error) authMsg(/registered|exists/i.test(r.error.message) ? 'Für diese E-Mail gibt es schon ein Konto. Melde dich an.' : 'Konto konnte nicht erstellt werden: ' + r.error.message);
        else if (!r.data.session) { authMsg('Fast geschafft: Wir haben dir eine E-Mail geschickt. Tippe auf den Link darin und melde dich danach hier an.', true); authMode('login'); authMsg('Bestätigungs-E-Mail ist unterwegs. Danach hier anmelden.', true); }
      } else if (AU.mode === 'reset') {
        r = await SB.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
        authMsg(r.error ? 'Das hat nicht geklappt: ' + r.error.message : 'Falls ein Konto existiert, ist ein Link unterwegs. Öffne ihn und vergib ein neues Passwort.', !r.error);
      } else if (AU.mode === 'newpw') {
        r = await SB.auth.updateUser({ password: pw });
        if (r.error) authMsg('Speichern hat nicht geklappt: ' + r.error.message);
        else { toast('Neues Passwort gespeichert.'); authMode('login'); startApp(r.data.user); }
      }
    } catch (x) { authMsg('Keine Verbindung. Bist du online?'); }
    finally { AU.busy = false; $('#auGo').disabled = false; }
  });

  /* Konto-Blatt: Sicherung, Import, Abmelden */
  function openAcct() { $('#acEmail').textContent = EMAIL; $('#acct').hidden = false; S.acct = true; syncLock(); }
  function closeAcct() { $('#acct').hidden = true; S.acct = false; syncLock(); }
  $('#shareBtn').addEventListener('click', function (e) { e.stopImmediatePropagation(); openAcct(); }, true);
  $('#acClose').addEventListener('click', closeAcct);
  $('#acct').addEventListener('click', function (e) { if (e.target === this) closeAcct(); });
  function saveFile(name, blob) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  $('#acExport').addEventListener('click', function () {
    if (!db) return;
    var json = JSON.stringify({ app: 'dailylife-safer', version: 1, exported: todayIso(), docs: db.dump() });
    saveFile('DailyLife-Sicherung-' + todayIso() + '.json', new Blob([json], { type: 'application/json' }));
  });
  $('#acImport').addEventListener('click', function () { $('#acFile').click(); });
  $('#acFile').addEventListener('change', async function (e) {
    var f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f || !db) return;
    var msg = $('#acMsg');
    try {
      var j = JSON.parse(await f.text()), docs = j && j.docs, ok = {};
      if (!docs || typeof docs !== 'object') throw new Error('format');
      Object.keys(docs).forEach(function (k) { if (/^(items|trips|places|wines|hikes|entries|lists)\/[A-Za-z0-9_\-.~:@+]+$/.test(k) || k === 'pub/layout') if (docs[k] && typeof docs[k] === 'object') ok[k] = docs[k]; });
      var n = Object.keys(ok).length; if (!n) throw new Error('leer');
      $('#acImport').disabled = true; msg.textContent = 'Importiere 0 von ' + n + ' …';
      await db.importDocs(ok, function (d, t) { msg.textContent = 'Importiere ' + d + ' von ' + t + ' …'; });
      msg.textContent = n + ' Einträge importiert.'; toast('Import fertig.');
    } catch (x) { msg.textContent = x && x.message === 'format' || x && x.message === 'leer' ? 'Die Datei enthält keine DailyLife-Einträge.' : 'Import fehlgeschlagen: ' + (x && x.message || 'unbekannt'); }
    finally { $('#acImport').disabled = false; }
  });
  $('#acLogout').addEventListener('click', async function () {
    try { await SB.auth.signOut(); } catch (x) {}
    location.reload();
  });

  /* PDF ohne Claude: direkt als Datei */
  dl = { save: function (o) { saveFile(o.filename, o.data); return Promise.resolve({ status: 'saved' }); } };
  $('#tcPdf').hidden = false;

  var started = false;
  /* Claude über die eigene Supabase-Funktion (nur wenn eingerichtet und freigegeben) */
  function b64OfBlob(b) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1] || ''); }; r.onerror = rej; r.readAsDataURL(b); }); }
  function looseJson(t) {
    t = String(t || '').trim();
    try { return JSON.parse(t); } catch (e) {}
    var m = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) { try { return JSON.parse(m[1]); } catch (e) {} }
    var a = t.indexOf('{'), b = t.lastIndexOf('}'), c = t.indexOf('['), d = t.lastIndexOf(']');
    if (c >= 0 && (a < 0 || c < a) && d > c) { try { return JSON.parse(t.slice(c, d + 1)); } catch (e) {} }
    if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) {} }
    var er = new Error('Antwort war kein JSON'); er.code = 'bad_json'; throw er;
  }
  async function aiCall(input, opts) {
    opts = opts || {};
    var ss = await SB.auth.getSession(), tok = ss && ss.data && ss.data.session && ss.data.session.access_token;
    if (!tok) { var e0 = new Error('nicht angemeldet'); e0.code = 'not_granted'; throw e0; }
    var imgs = [];
    var il = opts.images ? (Array.isArray(opts.images) ? opts.images : [opts.images]) : [];
    for (var i = 0; i < il.length; i++) if (il[i]) imgs.push({ media_type: il[i].type || 'image/jpeg', data: await b64OfBlob(il[i]) });
    var messages = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
    var r = await fetch(CFG.supabaseUrl.replace(/\/$/, '') + '/functions/v1/claude', { method: 'POST', signal: opts.signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, apikey: CFG.supabaseKey },
      body: JSON.stringify({ messages: messages, images: imgs, tier: opts.modelTier || 'default' }) });
    if (!r.ok) { var e1 = new Error('Claude nicht erreichbar (' + r.status + ')'); e1.code = r.status === 403 ? 'not_granted' : r.status === 429 ? 'rate_limited' : 'failed'; throw e1; }
    var j = await r.json(), text = String(j && j.text || '');
    if (opts.onText) try { opts.onText({ text: text, delta: text }); } catch (e) {}
    return { text: text, truncated: !!(j && j.truncated) };
  }
  function makeSample() {
    var f = function (input, opts) { return aiCall(input, opts); };
    f.json = async function (input, opts) { var r = await aiCall(input, opts); return looseJson(r.text); };
    f.limits = async function () { return { images: true }; };
    return f;
  }
  async function aiInit() {
    try {
      var ss = await SB.auth.getSession(), tok = ss && ss.data && ss.data.session && ss.data.session.access_token; if (!tok) return;
      var r = await Promise.race([fetch(CFG.supabaseUrl.replace(/\/$/, '') + '/functions/v1/claude', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, apikey: CFG.supabaseKey }, body: JSON.stringify({ ping: true }) }), wait(8000, null)]);
      if (!r || !r.ok) return;
      var j = await r.json(); if (!j || !j.ok) return;
      sample = makeSample(); S.imgOK = true;
      var sg = document.getElementById('suggest'); if (sg) sg.hidden = false;
      render();
    } catch (e) {}
  }
  async function startApp(u) {
    if (started || !u) return; started = true;
    UID = u.id; EMAIL = u.email || '';
    authShow(false);
    S.canEdit = true; S.viewer = false;
    try { db = await supaDb(SB, UID); }
    catch (x) { started = false; authShow(true); authMsg('Deine Daten konnten nicht geladen werden: ' + (x && x.message || 'Verbindung') + '. Ist die Datenbank eingerichtet?'); return; }
    db.collection('trips').orderBy('createdAt', 'desc').onSnapshot(function (snap) { setTrips(docsOf(snap)); render(); });
    db.collection('places').orderBy('createdAt', 'desc').onSnapshot(function (snap) { setPlaces(docsOf(snap)); render(); });
    db.collection('entries').orderBy('createdAt', 'desc').onSnapshot(function (snap) { S.entries = docsOf(snap).filter(function (o) { return typeof o.title === 'string' && o.title && typeof o.cat === 'string'; }); render(); });
    db.collection('hikes').orderBy('createdAt', 'desc').onSnapshot(function (snap) { S.hikes = docsOf(snap).filter(function (o) { return typeof o.name === 'string' && o.name; }); render(); });
    db.collection('wines').orderBy('createdAt', 'desc').onSnapshot(function (snap) { S.wines = docsOf(snap).filter(function (o) { return typeof o.name === 'string' && o.name; }); render(); });
    db.collection('items').orderBy('createdAt', 'desc').onSnapshot(function (snap) { setItems(docsOf(snap)); S.loaded = true; afterLoad(); render(); });
    try { watchLayout(); } catch (x) {}
    try { watchList(); } catch (x) {}
    aiInit();
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && db && !S.pf && !S.rf && !S.tf) db.reload().catch(function () {}); });
  }
  /* Kategorie teilen: eingefrorener Stand in der Tabelle shares, Link mit #s=<id> */
  function snapId() { var a = new Uint8Array(12); crypto.getRandomValues(a); return Array.from(a, function (b) { return 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 56]; }).join(''); }
  window.dlsSnapShare = function (cat, payload) {
    if (!SB || !UID) { toast('Melde dich zuerst an.'); return; }
    var id = snapId(), url = location.origin + location.pathname.replace(/index\.html$/, '') + '#s=' + id;
    var title = (payload && payload.title) || 'Kategorie';
    var saved = SB.from('shares').insert({ id: id, cat: cat, data: payload }).then(function (r) { if (r && r.error) throw r.error; return true; });
    saved.catch(function (e) {
      var m = e && (e.code === '42P01' || /relation|does not exist|schema cache/i.test(e.message || '')) ? 'Teilen ist noch nicht eingerichtet: Die Tabelle „shares“ fehlt in Supabase.' : 'Der Link konnte nicht gespeichert werden.';
      toast(m);
    });
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).catch(function () {}); } catch (e) {}
    if (navigator.share) {
      navigator.share({ title: title + ' · DailyLife Safer', text: 'Schau dir meine Liste „' + title + '“ an:', url: url }).catch(function () { saved.then(function () { toast('Link kopiert. Er zeigt den heutigen Stand.'); }, function () {}); });
    } else {
      saved.then(function () { toast('Link kopiert. Er zeigt den heutigen Stand.'); }, function () {});
    }
  };
  async function openSnapshot(sid) {
    authShow(false); document.body.classList.add('snapview');
    S.canEdit = false; S.viewer = true; sample = null; db = null;
    try {
      var r = await Promise.race([SB.rpc('get_share', { sid: sid }), wait(12000, { error: { message: 'timeout' } })]);
      if (r && !r.error && r.data && window.dlsLoadSnap && window.dlsLoadSnap(r.data)) return;
    } catch (e) {}
    S.loaded = true; S.shareLoaded = true; afterLoad(); render();
    note('Dieser Link ist ungültig oder wurde gelöscht.');
  }
  var ready = (async function () {
    sample = null; S.canEdit = true; S.viewer = false;
    if (cfgOk() && !window.supabase) await new Promise(function (res) { window.addEventListener('sb-ready', res, { once: true }); setTimeout(res, 12000); });
    if (!cfgOk() || !window.supabase) {
      authShow(true); $('#auForm').hidden = true;
      authMsg(!window.supabase ? 'Die Anmeldung konnte nicht geladen werden. Bist du online?' : 'Die App ist noch nicht eingerichtet: In config.js fehlen Supabase-Adresse und Schlüssel.');
      return;
    }
    SB = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    var snapM = /^#s=([A-Za-z0-9]{8,40})$/.exec(location.hash || '');
    if (snapM) { await openSnapshot(snapM[1]); return; }
    SB.auth.onAuthStateChange(function (ev, session) {
      if (ev === 'PASSWORD_RECOVERY') { authShow(true); authMode('newpw'); return; }
      if (session && session.user && AU.mode !== 'newpw') startApp(session.user);
    });
    var s = await SB.auth.getSession();
    if (s && s.data && s.data.session && AU.mode !== 'newpw') startApp(s.data.session.user);
    else if (AU.mode !== 'newpw') { authShow(true); authMode('login'); }
  })();

  /* App teilen: Link kopieren und Teilen-Menü öffnen */
  (function () {
    var b = document.getElementById('appShare'); if (!b) return;
    b.addEventListener('click', function () {
      var url = location.origin + location.pathname.replace(/index\.html$/, '');
      var copied = false;
      try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { copied = true; }, function () {}); } catch (e) {}
      if (navigator.share) {
        navigator.share({ title: 'DailyLife Safer', text: 'Schau dir DailyLife Safer an: Shopping, Reisen, Restaurants, Bars, Weine und mehr an einem Ort. Erstell dir einfach ein eigenes Konto.', url: url })
          .then(function () {}, function () { setTimeout(function () { toast(copied ? 'Link kopiert. Du kannst ihn jetzt versenden.' : 'Link: ' + url); }, 50); });
      } else {
        setTimeout(function () { toast(copied ? 'Link kopiert. Du kannst ihn jetzt versenden.' : 'Link: ' + url); }, 120);
      }
    });
  })();

