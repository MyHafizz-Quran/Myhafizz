import json, sys, os
exec(open('tuhfa_verses.py').read()); exec(open('tuhfa_rules.py').read()); exec(open('tuhfa_qcm.py').read())
q=lambda s: "'"+str(s).replace("'","''")+"'"
st=[]
st.append("INSERT INTO tajwid_units (n,title,title_ar,sub,v_from,v_to) VALUES "+",".join(f"({u[0]},{q(u[1])},{q(u[2])},{q(u[3])},{u[4]},{u[5]})" for u in UNITS)+" ON CONFLICT (n) DO UPDATE SET title=EXCLUDED.title,title_ar=EXCLUDED.title_ar,sub=EXCLUDED.sub,v_from=EXCLUDED.v_from,v_to=EXCLUDED.v_to")
st.append("INSERT INTO tajwid_verses (n,unit,ar_a,ar_b,translit,fr) VALUES "+",".join(f"({v[0]},{v[1]},{q(v[2])},{q(v[3])},{q(v[4])},{q(v[5])})" for v in V)+" ON CONFLICT (n) DO UPDATE SET unit=EXCLUDED.unit,ar_a=EXCLUDED.ar_a,ar_b=EXCLUDED.ar_b,translit=EXCLUDED.translit,fr=EXCLUDED.fr,updated_at=now()")
st.append("INSERT INTO tajwid_rules (id,unit,ord,name,name_ar,label,letters,body,verses) VALUES "+",".join(f"({q(r[0])},{r[1]},{r[2]},{q(r[3])},{q(r[4])},{q(r[5])},{q(r[6])},{q(r[7])},{q(r[8])})" for r in R)+" ON CONFLICT (id) DO UPDATE SET unit=EXCLUDED.unit,ord=EXCLUDED.ord,name=EXCLUDED.name,name_ar=EXCLUDED.name_ar,label=EXCLUDED.label,letters=EXCLUDED.letters,body=EXCLUDED.body,verses=EXCLUDED.verses,updated_at=now()")
ex=json.load(open('/tmp/tj_examples.json'))
st.append("DELETE FROM tajwid_examples")
rows=[]
BAD='ۚۖۗۛۙۘ'
for r in R:
    for i,e in enumerate([e for e in ex.get(r[0],[]) if not any(c in e['t'] for c in BAD)][:30]):
        rows.append(f"({q(r[0])},{e['s']},{e['a']},{e['g']},'{{{','.join(map(str,e['w']))}}}',{q(e['t'])},{e['n']},{i})")
st.append("INSERT INTO tajwid_examples (rule,surah,ayah,g,words,txt,nwords,ord) VALUES "+",".join(rows))
st.append("INSERT INTO game_questions (id,category,difficulty,type,question,choices,answer,explanation,source,status,surah,ayah) VALUES "+",".join(
  f"({q(f'tajwid-{i+1:03d}')},'tajwid',{x[1]},'qcm',{q(x[2])},{q(json.dumps(x[3],ensure_ascii=False))}::jsonb,{x[4]},{q(x[5])},'Tuḥfat al-Aṭfāl, al-Jamzūrī','published',NULL,{x[0]})" for i,x in enumerate(Q))
  +" ON CONFLICT (id) DO UPDATE SET difficulty=EXCLUDED.difficulty,question=EXCLUDED.question,choices=EXCLUDED.choices,answer=EXCLUDED.answer,explanation=EXCLUDED.explanation,ayah=EXCLUDED.ayah,updated_at=now()")
# minutage
au=[]
for rec in sys.argv[1:]:
    fit=json.load(open(f'/tmp/{rec}.fit.json'))
    for k,x in fit.items():
        if x.get('t0') is None: continue
        if rec=='soufi':
            part,t0,t1=x['f'],x['t0'],x['t1']
            if t1>5000 or t1<=t0: t1=t0+8
        else:
            part,t0,t1=1,x['t0'],x['t1']
        au.append(f"({q(rec)},{k},{part},{max(0,t0-0.25):.2f},{t1+0.35:.2f})")
if au: st.append("INSERT INTO tajwid_audio (reciter,n,part,t0,t1) VALUES "+",".join(au)+" ON CONFLICT (reciter,n) DO UPDATE SET part=EXCLUDED.part,t0=EXCLUDED.t0,t1=EXCLUDED.t1")
open('/tmp/tajwid_seed.sql','w').write("\n--;;\n".join(st))
print(len(rows),'exemples',len(au),'minutages')
