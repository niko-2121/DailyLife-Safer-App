from playwright.sync_api import sync_playwright
import json,glob,sys
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
mock=open(D+'test/mock2.js').read()
full='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+mock+open(D+'schweberegal.html',encoding='utf8').read()+'</body></html>'
seed={}
for f in glob.glob(D+'test/seed/*/*.json'):
    c=f.split('/')[-2]; i=f.split('/')[-1][:-5]; d=json.load(open(f))
    if c=='places': d.pop('photo',None); d.pop('logo',None)
    seed[c+'/'+i]=d
H=[('Glärnisch','Glarus',2904,16.5,1950,600,'T4',True),('Säntis','Appenzell',2502,9.8,1150,270,'T3',False),('Pizol 5-Seen','St. Gallen',2499,10.5,600,210,'T2',True),('Rigi Kulm','Schwyz',1798,12,1300,300,'T1',False)]
for i,x in enumerate(H): seed['hikes/h%d'%i]=dict(name=x[0],region=x[1],peak=x[2],km=x[3],up=x[4],min=x[5],diff=x[6],done=x[7],createdAt=i)
for i,(n,c) in enumerate([('Tignanello','Italien'),('Sassicaia','Italien'),('Dézaley','Schweiz')]): seed['wines/v%d'%i]={'name':n,'type':'red','country':c,'year':2020+i,'createdAt':300+i}
for i,(n,c,k) in enumerate([('Bindella','Italienisch','rest'),('Sushi Mo','Japanisch','rest'),('Kronenhalle Bar','Bar','bar')]): seed['places/q%d'%i]={'name':n,'cuisine':c,'city':'Zürich','kind':k,'createdAt':400+i}
seed['trips/bud']={'name':'Budapest','from':'2026-12-04','to':'2026-12-06','booked':'all','svg':'','createdAt':99}
for i,n in enumerate(['Paris','London','Wien','Prag','Oslo','Lissabon','Athen']): seed['trips/w%d'%i]={'name':n,'svg':'','wish':True,'createdAt':200+i}
dark='dark' in sys.argv
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,color_scheme='dark' if dark else 'light').new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*',lambda r: r.fulfill(body=full,content_type='text/html') if r.request.url.endswith('/index.html') else r.abort())
    pg.goto('http://test.local/index.html'); pg.evaluate("s=>{sessionStorage.setItem('mockdb',JSON.stringify(s));localStorage.clear()}",seed); pg.reload(); pg.wait_for_timeout(1800)
    pg.screenshot(path=D+'build/n_home.png',full_page=True)
    print('icons',pg.locator('.j-share').count())
    pg.locator('.hub[data-hub=shop]').click(); pg.wait_for_timeout(900); pg.screenshot(path=D+'build/n_shop.png'); pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
    pg.locator('.hub[data-hub=wine]').click(); pg.wait_for_timeout(900); pg.screenshot(path=D+'build/n_wine1.png')
    print(pg.evaluate("document.getElementById('vwTitle').textContent"))
    pg.locator('#vwTabs .vtab[data-l=try]').click(); pg.wait_for_timeout(500); pg.screenshot(path=D+'build/n_wine2.png')
    pg.locator('#vwGrid > *').first.click(); pg.wait_for_timeout(600); pg.screenshot(path=D+'build/n_wdet.png')
    pg.locator('#vdAct button').first.click(); pg.wait_for_timeout(800); pg.screenshot(path=D+'build/n_wine3.png'); pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
    pg.locator('.hub[data-hub=rest] .j-share').click(); pg.wait_for_timeout(700); pg.screenshot(path=D+'build/n_share.png')
    print(errs); b.close()
