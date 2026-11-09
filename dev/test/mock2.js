<script>(function(){
var store=JSON.parse(sessionStorage.getItem('mockdb')||'{}'), csubs={}, dsubs={}, n=0; window.__store=store; window.__writes=[];
function persist(){ sessionStorage.setItem('mockdb', JSON.stringify(store)); }
function parent(p){ var i=p.lastIndexOf('/'); return p.slice(0,i); }
function csnap(c){ var docs=Object.keys(store).filter(function(p){return parent(p)===c;}).map(function(p){ var o=Object.freeze(JSON.parse(JSON.stringify(store[p]))); return {id:p.slice(c.length+1), data:function(){return o;}}; });
  docs.sort(function(a,b){return (b.data().createdAt||0)-(a.data().createdAt||0);}); return {empty:!docs.length, metadata:{fromCache:false}, docs:docs}; }
function dsnap(p){ var e=p in store; var o=e?Object.freeze(JSON.parse(JSON.stringify(store[p]))):undefined; return {exists:e, id:p.split('/').pop(), data:function(){return o;}}; }
function fire(p){ persist(); var c=parent(p); setTimeout(function(){ (csubs[c]||[]).forEach(function(f){f(csnap(c));}); (dsubs[p]||[]).forEach(function(f){f(dsnap(p));}); },5); }
function ref(p){ return { id:p.split('/').pop(), path:p,
  get:function(){return Promise.resolve(dsnap(p));},
  set:function(d){ window.__writes.push(['set',p]); store[p]=JSON.parse(JSON.stringify(d)); fire(p); return Promise.resolve(); },
  update:function(d){ window.__writes.push(['update',p]); if(!(p in store)) return Promise.reject({code:'invalid_argument'}); Object.assign(store[p], JSON.parse(JSON.stringify(d))); fire(p); return Promise.resolve(); },
  delete:function(){ window.__writes.push(['delete',p]); delete store[p]; fire(p); return Promise.resolve(); },
  onSnapshot:function(cb){ (dsubs[p]=dsubs[p]||[]).push(cb); setTimeout(function(){cb(dsnap(p));},10); return function(){}; } }; }
function col(c){ var q={ orderBy:function(){return q;}, limit:function(){return q;}, where:function(){return q;},
  onSnapshot:function(cb){ (csubs[c]=csubs[c]||[]).push(cb); setTimeout(function(){cb(csnap(c));},10); return function(){}; },
  add:function(d){ var id='d'+Date.now()+(++n); store[c+'/'+id]=JSON.parse(JSON.stringify(d)); fire(c+'/'+id); return Promise.resolve({id:id}); },
  doc:function(id){ return ref(c+'/'+id); } }; return q; }
var db={collection:col, doc:ref};
var sample=function(){return Promise.resolve('')}; sample.limits=function(){return Promise.resolve({images:true})}; sample.json=function(){return Promise.resolve(JSON.parse(JSON.stringify(window.__resp||{})))};
var canEdit=sessionStorage.getItem('viewer')!=='1';
window.claude={use:function(n){return Promise.resolve(n==='db'?db:n==='user'?{canEdit:function(){return Promise.resolve(canEdit)}}:n==='sample'?sample:null)}};})();</script>
