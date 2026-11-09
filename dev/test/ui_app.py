from playwright.sync_api import sync_playwright
import os, sys
import os
B=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
site=B+'../'
mock=open(B+'test/mocksb4.js').read()
CALLS=[]
def handler(r):
    u=r.request.url
    if 'supabase-js' in u: return r.fulfill(body=mock+'\nexport const createClient = window.supabase.createClient;',content_type='application/javascript')
    if '/functions/v1/claude' in u:
        import json as J
        body=J.loads(r.request.post_data or '{}')
        CALLS.append(body)
        if body.get('ping'): return r.fulfill(body='{"ok":true}',content_type='application/json')
        txt='{"orte":[{"name":"Testlokal Bella","kueche":"Italienisch","ort":"Zürich","bewertung":"4,6","preis":"20–30 CHF","foto":[0,0,0,0],"geschlossen":false}]}'
        return r.fulfill(body=J.dumps({'text':'Hier: ```json\n'+txt+'\n```'}),content_type='application/json')
    if u.startswith('http://test.local/'):
        name=u.split('http://test.local/')[1].split('?')[0] or 'index.html'
        if name=='config.jsX': return r.fulfill(body="window.DLS_CONFIG={supabaseUrl:'https://abcdefghijkl.supabase.co',supabaseKey:'sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx'};",content_type='application/javascript')
        p=site+name
        if os.path.exists(p):
            ct={'html':'text/html','js':'application/javascript','png':'image/png','webmanifest':'application/manifest+json'}[name.rsplit('.',1)[1]]
            return r.fulfill(body=open(p,'rb').read(),content_type=ct)
    return r.abort()
dark='dark' in sys.argv
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,color_scheme='dark' if dark else 'light',service_workers='block')
    pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*',handler)
    import json
    docs=[]
    for k,d in [('places/p1',{'name':'Bindella','cuisine':'Italienisch','city':'Zürich','kind':'rest','createdAt':1}),('places/p2',{'name':'Sushi Mo','cuisine':'Japanisch','city':'Zürich','kind':'rest','createdAt':2}),('wines/w1',{'name':'Tignanello','type':'red','country':'Italien','createdAt':3})]:
        docs.append({'user_id':'u-0-11','path':k,'data':d})
    pg.goto('http://test.local/index.html')
    pg.evaluate("d=>{localStorage.clear();localStorage.setItem('mock_users',JSON.stringify({'ich@test.ch':{pw:'x',id:'u-0-11'}}));localStorage.setItem('mock_user',JSON.stringify({id:'u-0-11',email:'ich@test.ch'}));localStorage.setItem('mock_docs',JSON.stringify(d))}",docs)
    pg.add_init_script("navigator.share=function(o){window.__shared=o;return Promise.resolve();}")
    pg.reload(); pg.wait_for_timeout(2500)
    pg.screenshot(path=B+'build/p_home.png')
    pg.locator('.hub[data-hub=rest] .j-share').click(); pg.wait_for_timeout(800)
    sh=pg.evaluate("window.__shared"); print('shared',sh)
    pg.evaluate("localStorage.removeItem('mock_user')")
    url=sh['url']; pg2=ctx.new_page(); pg2.on('pageerror',lambda e:errs.append(str(e)))
    pg2.route('**/*',handler); pg2.goto(url); pg2.wait_for_timeout(2500)
    pg2.screenshot(path=B+'build/p_snap.png')
    pg2.keyboard.press('Escape'); pg2.wait_for_timeout(500); pg2.screenshot(path=B+'build/p_snap2.png')
    print('auth hidden',pg2.locator('#auth').is_hidden())
    print('errors',errs); b.close()
