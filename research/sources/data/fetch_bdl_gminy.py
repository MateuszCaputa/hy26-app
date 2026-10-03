"""Fetch Malopolska gminy indicators from GUS BDL API (no key: 100 req/15min, 1000/12h per IP;
free key via https://api.stat.gov.pl/Home/BdlApi -> header X-ClientId raises limits)."""
import json,urllib.request,csv,os,sys
KEY=os.environ.get('BDL_KEY'); MALOPOLSKA='011200000000'; YEAR=sys.argv[1] if len(sys.argv)>1 else '2024'
VARS={'pop_total':72305,'pop_65_69':72239,'pop_70plus':72240}
def get(u):
    h={'Accept':'application/json'}; 
    if KEY: h['X-ClientId']=KEY
    return json.load(urllib.request.urlopen(urllib.request.Request(u,headers=h),timeout=60))
rows={}
for name,v in VARS.items():
    u=f'https://bdl.stat.gov.pl/api/v1/data/by-variable/{v}?unit-parent-id={MALOPOLSKA}&unit-level=6&year={YEAR}&page-size=100&format=json'
    while u:
        d=get(u)
        for r in d['results']:
            x=rows.setdefault(r['id'],{'teryt_id':r['id'],'name':r['name']}); x[name]=r['values'][0]['val'] if r['values'] else None
        u=d.get('links',{}).get('next')
out=os.path.join(os.path.dirname(__file__),f'malopolska_gminy_{YEAR}.csv')
with open(out,'w',newline='') as f:
    w=csv.writer(f); w.writerow(['teryt_id','name','pop_total','pop_65plus','share_65plus_pct'])
    for x in rows.values():
        p=x.get('pop_total'); s=(x.get('pop_65_69') or 0)+(x.get('pop_70plus') or 0)
        w.writerow([x['teryt_id'],x['name'],p,s,round(100*s/p,2) if p else None])
print(out,len(rows))
