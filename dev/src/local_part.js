  /* ---------- Lokaler Speicher (dieses Gerät): gleiche Schnittstelle wie der geteilte Speicher ---------- */
  function localDb() {
    var map = {}, csubs = {}, dsubs = {}, n = 0, idb = null, warned = false;
    function parent(p) { return p.slice(0, p.lastIndexOf('/')); }
    function clone(o) { return JSON.parse(JSON.stringify(o)); }
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
    function persist(p) {
      if (!idb) return Promise.resolve();
      return new Promise(function (res) {
        try {
          var tx = idb.transaction('docs', 'readwrite'), st = tx.objectStore('docs');
          if (p in map) st.put(map[p], p); else st.delete(p);
          tx.oncomplete = function () { res(); };
          tx.onerror = tx.onabort = function () { if (!warned) { warned = true; toast('Speichern auf diesem Gerät hat nicht geklappt. Ist der Speicher voll?'); } res(); };
        } catch (e) { res(); }
      });
    }
    function ref(p) {
      return {
        id: p.split('/').pop(), path: p,
        get: function () { return Promise.resolve(dsnap(p)); },
        set: function (d) { map[p] = clone(d); fire(p); return persist(p); },
        update: function (d) { if (!(p in map)) return Promise.reject({ code: 'invalid_argument' }); Object.assign(map[p], clone(d)); fire(p); return persist(p); },
        delete: function () { delete map[p]; fire(p); return persist(p); },
        onSnapshot: function (cb) { (dsubs[p] = dsubs[p] || []).push(cb); setTimeout(function () { cb(dsnap(p)); }, 0); return function () {}; }
      };
    }
    function col(c) {
      var q = {
        orderBy: function () { return q; }, where: function () { return q; }, limit: function () { return q; },
        onSnapshot: function (cb) { (csubs[c] = csubs[c] || []).push(cb); setTimeout(function () { cb(csnap(c)); }, 0); return function () {}; },
        add: function (d) { var id = 'l' + Date.now().toString(36) + (++n).toString(36); var p = c + '/' + id; map[p] = clone(d); fire(p); return persist(p).then(function () { return { id: id }; }); },
        doc: function (id) { return ref(c + '/' + id); }
      };
      return q;
    }
    var api = { collection: col, doc: ref, local: true, persistent: false };
    return new Promise(function (resolve) {
      var done = false;
      function finish() { if (!done) { done = true; resolve(api); } }
      setTimeout(finish, 4000);
      try {
        var rq = indexedDB.open('dailylife-safer', 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore('docs'); };
        rq.onerror = function () { finish(); };
        rq.onsuccess = function () {
          idb = rq.result;
          try {
            var tx = idb.transaction('docs', 'readonly'), st = tx.objectStore('docs'), cur = st.openCursor();
            cur.onsuccess = function () { var c2 = cur.result; if (c2) { map[c2.key] = c2.value; c2.continue(); } else { api.persistent = true; finish(); } };
            cur.onerror = function () { finish(); };
          } catch (e) { finish(); }
        };
      } catch (e) { finish(); }
    });
  }

  var ready = (async function () {
    var c = window.claude;
    function get(n) { return c && typeof c.use === 'function' ? c.use(n).catch(function () { return null; }) : Promise.resolve(null); }
    var r = await Promise.all([localDb(), get('sample'), get('downloads')]);
    db = r[0]; sample = r[1]; dl = r[2];
    S.canEdit = true; S.viewer = false;
    if (dl && typeof dl.save === 'function') $('#tcPdf').hidden = false; else dl = null;
    if (typeof sample === 'function') {
      try { var l = await Promise.race([sample.limits(), wait(3000, null)]); S.imgOK = !!(l && l.images); $('#suggest').hidden = false; } catch (e) { sample = null; S.imgOK = false; }
    } else { sample = null; }
    if (!db.persistent) note('Dieser Browser erlaubt kein dauerhaftes Speichern. Einträge gelten nur, solange die Seite offen ist.');
    db.collection('trips').orderBy('createdAt', 'desc').onSnapshot(function (snap) { setTrips(docsOf(snap)); render(); });
    db.collection('places').orderBy('createdAt', 'desc').onSnapshot(function (snap) { setPlaces(docsOf(snap)); render(); });
    db.collection('entries').orderBy('createdAt', 'desc').onSnapshot(function (snap) { S.entries = docsOf(snap).filter(function (o) { return typeof o.title === 'string' && o.title && typeof o.cat === 'string'; }); render(); });
    db.collection('hikes').orderBy('createdAt', 'desc').onSnapshot(function (snap) { S.hikes = docsOf(snap).filter(function (o) { return typeof o.name === 'string' && o.name; }); render(); });
    db.collection('wines').orderBy('createdAt', 'desc').onSnapshot(function (snap) { S.wines = docsOf(snap).filter(function (o) { return typeof o.name === 'string' && o.name; }); render(); });
    db.collection('items').orderBy('createdAt', 'desc').onSnapshot(function (snap) { setItems(docsOf(snap)); S.loaded = true; afterLoad(); render(); });
    try { watchLayout(); } catch (e) {}
  })();
