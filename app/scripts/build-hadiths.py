"""Construit public/data/hadiths.json (hadith du jour).

Source : fawazahmed0/hadith-api (domaine public), éditions françaises et arabes
de Sahih al-Bukhari, Sahih Muslim et des 40 hadiths de an-Nawawi.
On garde les 42 hadiths de an-Nawawi et une sélection de hadiths courts de
Bukhari et Muslim (paroles du Prophète ﷺ citées, texte arabe aligné).
Usage : python3 scripts/build-hadiths.py
"""
import json, re, urllib.request

BASE = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/"
def load(e):
    with urllib.request.urlopen(BASE + e + ".min.json") as r:
        return {h["hadithnumber"]: h for h in json.load(r)["hadiths"]}

def clean(t):
    return re.sub(r"\s+", " ", t.replace("\u200f", "")).strip()

def matn(ar):
    a = clean(ar)
    i, j = a.find('"'), a.rfind('"')
    if i < 0 or j <= i: return None
    m = a[i + 1:j].replace('"', "").strip(" .،")
    return m if 12 <= len(m) <= 380 else None

SKIP = re.compile(r"(chaîne|isnad|hadith (similaire|semblable)|même hadith|ce hadith|variante|cf\.)", re.I)
# Hadith du jour : thèmes de foi, d'adoration et de bon caractère, compréhensibles hors contexte.
THEMES = re.compile(r"(Coran|récit|prière|prie |invoqu|dhikr|rappel|souvien|pardon|repent|miséricord|patien|sourire|frère|voisin|parents|mère|bon comportement|caractère|bonté|bienfait|aumône|sadaqa|charité|intention|science|savoir|apprend|enseign|vérité|sincère|honnête|humble|humilit|colère|jalous|médisance|langue|parole|aime|amour|Paradis|récompense|bonne action|bonnes actions|facilit|douceur|pudeur|foi|croyant|Allah aime|purification|ablution|jeûne|Ramadan|gratitude|remerci|salam|saluer|paix)", re.I)
AVOID = re.compile(r"(Juif|juive|\btue\b|gecko|tribu|serpent|chrétien|mage|polythé|femme|épouse|mari|esclave|tuer|tué|combat|armes|guerre|sang|vente|achet|vend|or |argent|tombe|mort|Enfer|feu|malédic|maudi|chien|porc|vin|alcool|zina|adult|fouet|lapid|main coupée|Dajjal|heure ne viendra|Antéchrist|chameau|cheval|impur|menstru|urine|selles|sexe|nu)", re.I)
out = []
fr, ar = load("fra-nawawi"), load("ara-nawawi")
for n in sorted(fr):
    if fr[n]["text"].strip() and ar.get(n, {}).get("text"):
        out.append({"id": f"nawawi-{n}", "src": "nawawi", "n": n, "fr": clean(fr[n]["text"]), "ar": clean(ar[n]["text"])})

for col, keep in (("bukhari", 140), ("muslim", 140)):
    fr, ar = load("fra-" + col), load("ara-" + col)
    pool = []
    for n in sorted(fr):
        t = clean(fr[n]["text"]); a = ar.get(n, {}).get("text")
        if not a or not (90 <= len(t) <= 320) or "«" not in t or SKIP.search(t): continue
        if not re.search(r"(Messager|Prophète)[^«]{0,40}(a dit|disait|dit)", t): continue
        if not THEMES.search(t) or AVOID.search(t): continue
        m = matn(a)
        if m: pool.append({"id": f"{col}-{n}", "src": col, "n": n, "fr": t, "ar": m})
    print(col, len(pool), "candidats")
    keep = min(keep, len(pool)); step = len(pool) / keep
    out += [pool[int(i * step)] for i in range(keep)]

json.dump(out, open("public/data/hadiths.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(len(out), "hadiths")
