"""Génère public/data/similar/{sourate}.json (versets semblables).
Source : api.alquran.cloud/v1/quran/quran-uthmani  →  python3 scripts/build-similar.py quran-uthmani.json"""
import json, re, sys, os, collections, difflib
d = json.load(open(sys.argv[1]))['data']['surahs']
DIAC = re.compile('[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u200c]')
def norm(w): return re.sub('[ٱأإآ]', 'ا', DIAC.sub('', w)).replace('ى','ي').replace('ة','ه').replace('ؤ','و').replace('ئ','ي')
V = []
for s in d:
    for a in s['ayahs']:
        w = a['text'].split(' ')
        if a['numberInSurah'] == 1 and s['number'] not in (1, 9) and norm(w[0]) == 'بسم': w = w[4:]
        V.append((s['number'], a['numberInSurah'], [x for x in map(norm, w) if x]))
idx = collections.defaultdict(set)
for i, (_, _, ws) in enumerate(V):
    for k in range(len(ws) - 2): idx[tuple(ws[k:k+3])].add(i)
out = collections.defaultdict(dict)
for i, (s, n, ws) in enumerate(V):
    if len(ws) < 3: continue
    cand = collections.Counter()
    for k in range(len(ws) - 2):
        g = tuple(ws[k:k+3])
        if len(idx[g]) <= 40:
            for j in idx[g]:
                if j != i: cand[j] += 1
    l = []
    for j, _ in cand.most_common(15):
        wj = V[j][2]
        if len(wj) < 3: continue
        sm = difflib.SequenceMatcher(None, ws, wj, autojunk=False)
        r = sm.ratio(); lm = max((b.size for b in sm.get_matching_blocks()), default=0)
        if r >= 0.6 or (lm >= 6 and lm >= 0.5 * min(len(ws), len(wj))): l.append((r, V[j][0], V[j][1]))
    if l: l.sort(reverse=True); out[s][n] = [[a, b] for _, a, b in l[:4]]
os.makedirs('public/data/similar', exist_ok=True)
for s, m in out.items(): json.dump(m, open(f'public/data/similar/{s}.json', 'w'), separators=(',', ':'))
