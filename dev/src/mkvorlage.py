# Erzeugt dailylife-vorlage.html (lokale Version ohne Claude-Speicher) aus schweberegal.html
import os
base=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
s=open(base+'schweberegal.html',encoding='utf8').read()
loc=open(base+'src/local_part.js',encoding='utf8').read()
def rep(a,b):
    global s
    assert s.count(a)==1,(s.count(a),a[:80]); s=s.replace(a,b)
rep("$('#shareBtn').hidden = !(S.canEdit && db && !S.viewer);","$('#shareBtn').hidden = true;")
i=s.index("  var ready = (async function () {"); j=s.index("  })();\n",i)+len("  })();\n")
s=s[:i]+loc+s[j:]
open(base+'build/dailylife-vorlage.html','w',encoding='utf8').write(s)
print('vorlage ok')
