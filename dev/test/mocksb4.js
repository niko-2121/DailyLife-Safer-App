(function(){
  function L(k,d){ if (window.__mem && k in window.__mem) return window.__mem[k]; try{ return JSON.parse(localStorage.getItem(k)) || d; }catch(e){ return d; } }
  function W(k,v){ (window.__mem=window.__mem||{})[k]=v; try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){ try{localStorage.removeItem(k);}catch(e2){} } }
  window.__sbCalls = 0;
  window.supabase = { createClient: function(url,key){
    var listeners=[];
    function sess(){ var u=L('mock_user',null); return u?{user:u,access_token:"tok123"}:null; }
    var auth = {
      getSession: function(){ return Promise.resolve({data:{session:sess()}}); },
      onAuthStateChange: function(cb){ listeners.push(cb); return {data:{subscription:{unsubscribe:function(){}}}}; },
      signUp: function(o){ var users=L('mock_users',{}); if(users[o.email]) return Promise.resolve({error:{message:'User already registered'}}); users[o.email]={pw:o.password,id:'u-'+Object.keys(users).length+'-'+o.email.length}; W('mock_users',users); return Promise.resolve({data:{session:null,user:{id:users[o.email].id,email:o.email}}}); },
      signInWithPassword: function(o){ var users=L('mock_users',{}); var u=users[o.email]; if(!u||u.pw!==o.password) return Promise.resolve({error:{message:'Invalid login credentials'}}); var user={id:u.id,email:o.email}; W('mock_user',user); listeners.forEach(function(cb){cb('SIGNED_IN',{user:user});}); return Promise.resolve({data:{session:{user:user}}}); },
      signOut: function(){ localStorage.removeItem('mock_user'); return Promise.resolve({}); },
      resetPasswordForEmail: function(){ return Promise.resolve({}); },
      updateUser: function(){ return Promise.resolve({data:{user:sess()&&sess().user}}); }
    };
    function from(t){
      if(t==='shares') return { insert: function(p){ return { then: function(res,rej){ var u=sess(); var out; if(!u) out={error:{message:'not authenticated'}}; else { var sh=L('mock_shares',{}); sh[p.id]=p.data; W('mock_shares',sh); out={error:null}; } return Promise.resolve(out).then(res,rej); } }; } };
      var rows=L('mock_docs',[]), filt=[], mode='select', payload=null, rng=null;
      var b = {
        select: function(){ mode='select'; return b; },
        eq: function(k,v){ filt.push([k,v]); return b; },
        order: function(){ return b; },
        range: function(a,z){ rng=[a,z]; return b; },
        upsert: function(p){ mode='upsert'; payload=Array.isArray(p)?p:[p]; return b; },
        delete: function(){ mode='delete'; return b; },
        then: function(res,rej){
          window.__sbCalls++;
          var u=sess(); var out;
          if(!u){ out={error:{message:'not authenticated'}}; }
          else if(mode==='select'){ var r=rows.filter(function(x){return x.user_id===u.user.id && filt.every(function(f){return x[f[0]]===f[1];});}).sort(function(a,b){return a.path<b.path?-1:1;}); if(rng) r=r.slice(rng[0],rng[1]+1); out={data:r.map(function(x){return {path:x.path,data:x.data};}),error:null}; }
          else if(mode==='upsert'){ payload.forEach(function(p){ if(p.user_id!==u.user.id) return; var i=rows.findIndex(function(x){return x.user_id===p.user_id&&x.path===p.path;}); if(i>=0) rows[i]=p; else rows.push(p); }); try{W('mock_docs',rows);}catch(e){ out={error:{message:'quota'}}; } out=out||{error:null}; }
          else { rows=rows.filter(function(x){ return !(x.user_id===u.user.id && filt.every(function(f){return x[f[0]]===f[1];})); }); W('mock_docs',rows); out={error:null}; }
          return Promise.resolve(out).then(res,rej);
        }
      };
      return b;
    }
    return {auth:auth, from:from, rpc:function(n,a){ var sh=L('mock_shares',{}); return Promise.resolve(sh[a.sid]?{data:sh[a.sid],error:null}:{data:null,error:null}); }};
  }};
})();
