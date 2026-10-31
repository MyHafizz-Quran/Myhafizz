# Génère public/data/adhkar.json : adhkar du matin et du soir.
# Texte arabe et nombre de répétitions : Hisn al-Muslim (Sa'id al-Qahtani), API hisnmuslim.com, chapitre 27.
# Traduction française du sens : rédigée pour MyHafizz à partir de la version anglaise de hisnmuslim.com.
import json, re, pathlib
src = json.load(open(pathlib.Path(__file__).with_name("hisnmuslim-27-ar.json"), encoding="utf-8-sig"))
A = list(src.values())[0]

# (fr, fr_soir, quand, répétitions corrigées, note)
FR = [
 ("Allah ! Pas de divinité à part Lui, le Vivant, Celui qui subsiste par Lui-même. Ni somnolence ni sommeil ne Le saisissent. À Lui appartient tout ce qui est dans les cieux et sur la terre. Qui peut intercéder auprès de Lui sans Sa permission ? Il connaît leur passé et leur futur, et de Sa science ils n'embrassent que ce qu'Il veut. Son Kursi déborde les cieux et la terre, dont la garde ne Lui coûte aucune peine. Et Il est le Très-Haut, l'Immense. (Ayat al-Kursi, sourate 2, verset 255)", None, "both", None, None),
 ("Les trois dernières sourates : Al-Ikhlas (112), Al-Falaq (113) et An-Nas (114).", None, "both", None, None),
 ("Nous voici au matin et le royaume appartient à Allah. Louange à Allah. Pas de divinité à part Allah, Seul, sans associé. À Lui la royauté, à Lui la louange, et Il est capable de toute chose. Seigneur, je Te demande le bien de ce jour et le bien de ce qui le suit, et je cherche refuge auprès de Toi contre le mal de ce jour et le mal de ce qui le suit. Seigneur, je cherche refuge auprès de Toi contre la paresse et les maux de la vieillesse. Seigneur, je cherche refuge auprès de Toi contre un châtiment dans le Feu et un châtiment dans la tombe.",
  "Le soir, on dit « Nous voici au soir et le royaume appartient à Allah » et « Seigneur, je Te demande le bien de cette nuit et le bien de ce qui la suit, et je cherche refuge auprès de Toi contre le mal de cette nuit et le mal de ce qui la suit ».", "both", None, None),
 ("Ô Allah, c'est par Toi que nous atteignons le matin et par Toi que nous atteignons le soir, par Toi nous vivons, par Toi nous mourons, et vers Toi est la résurrection.",
  "Le soir : Ô Allah, c'est par Toi que nous atteignons le soir et par Toi que nous atteignons le matin, par Toi nous vivons, par Toi nous mourons, et vers Toi est le retour.", "both", None, None),
 ("Ô Allah, Tu es mon Seigneur, pas de divinité à part Toi. Tu m'as créé et je suis Ton serviteur. Je reste fidèle à mon engagement et à Ta promesse autant que je le peux. Je cherche refuge auprès de Toi contre le mal que j'ai commis. Je reconnais Tes bienfaits envers moi et je reconnais mon péché, alors pardonne-moi, car nul ne pardonne les péchés à part Toi. (Sayyid al-istighfar)", None, "both", None, None),
 ("Ô Allah, me voici au matin : je Te prends à témoin, ainsi que les porteurs de Ton Trône, Tes anges et toute Ta création, que Tu es Allah, pas de divinité à part Toi, Seul, sans associé, et que Muhammad est Ton serviteur et Ton messager.",
  "Le soir, on dit « me voici au soir » (amsaytu) au lieu de « me voici au matin » (asbahtu).", "both", None, None),
 ("Ô Allah, tout bienfait qui m'atteint ce matin, ou qui atteint l'une de Tes créatures, vient de Toi Seul, sans associé. À Toi la louange et à Toi la gratitude. Celui qui le dit le matin a rendu grâce pour sa journée.",
  "Le soir, on dit « ce soir » (amsa) au lieu de « ce matin » (asbaha). Celui qui le dit le soir a rendu grâce pour sa nuit.", "both", None, None),
 ("Ô Allah, accorde la santé à mon corps. Ô Allah, accorde la santé à mon ouïe. Ô Allah, accorde la santé à ma vue. Pas de divinité à part Toi. Ô Allah, je cherche refuge auprès de Toi contre la mécréance et la pauvreté, et je cherche refuge auprès de Toi contre le châtiment de la tombe. Pas de divinité à part Toi.", None, "both", None, None),
 ("Allah me suffit, pas de divinité à part Lui. C'est en Lui que je place ma confiance, et Il est le Seigneur du Trône immense.", None, "both", 7, "7 fois"),
 ("Ô Allah, je Te demande le pardon et le salut dans cette vie et dans l'au-delà. Ô Allah, je Te demande le pardon et le salut dans ma religion, ma vie, ma famille et mes biens. Ô Allah, couvre mes défauts et apaise mes craintes. Ô Allah, protège-moi par-devant et par-derrière, à ma droite et à ma gauche, et d'au-dessus de moi, et je cherche refuge dans Ta grandeur pour ne pas être englouti par-dessous.", None, "both", None, None),
 ("Ô Allah, Connaisseur de l'invisible et du visible, Créateur des cieux et de la terre, Seigneur et Maître de toute chose, j'atteste qu'il n'y a pas de divinité à part Toi. Je cherche refuge auprès de Toi contre le mal de mon âme, contre le mal du diable et de son associationnisme, et contre le fait de commettre un mal contre moi-même ou de l'attirer sur un musulman.", None, "both", None, None),
 ("Au nom d'Allah, avec le nom de qui rien ne peut nuire, ni sur la terre ni dans le ciel, et Il est Celui qui entend tout, Celui qui sait tout.", None, "both", None, None),
 ("Je suis satisfait d'Allah comme Seigneur, de l'islam comme religion et de Muhammad ﷺ comme prophète.", None, "both", None, None),
 ("Ô Vivant, ô Toi qui subsistes par Toi-même, c'est Ta miséricorde que j'implore : améliore toutes mes affaires et ne me laisse pas à moi-même, ne serait-ce que le temps d'un clin d'œil.", None, "both", None, None),
 ("Nous voici au matin et le royaume appartient à Allah, Seigneur des mondes. Ô Allah, je Te demande le bien de ce jour : son ouverture, son secours, sa lumière, sa bénédiction et sa guidée, et je cherche refuge auprès de Toi contre le mal qu'il contient et le mal qui le suit.",
  "Le soir : Nous voici au soir et le royaume appartient à Allah, Seigneur des mondes. Ô Allah, je Te demande le bien de cette nuit : son ouverture, son secours, sa lumière, sa bénédiction et sa guidée, et je cherche refuge auprès de Toi contre le mal qu'elle contient et le mal qui la suit.", "both", None, None),
 ("Nous voici au matin sur la fitra de l'islam, sur la parole du monothéisme pur, sur la religion de notre Prophète Muhammad ﷺ et sur la voie de notre père Ibrahim, monothéiste et soumis à Allah, qui n'était pas du nombre des associateurs.",
  "Le soir, on dit « nous voici au soir » (amsayna) au lieu de « nous voici au matin » (asbahna).", "both", None, None),
 ("Gloire et pureté à Allah, et par Sa louange.", None, "both", None, "100 fois"),
 ("Pas de divinité à part Allah, Seul, sans associé. À Lui la royauté, à Lui la louange, et Il est capable de toute chose.", None, "both", None, "10 fois, ou une fois si l'on manque d'énergie"),
 ("Pas de divinité à part Allah, Seul, sans associé. À Lui la royauté, à Lui la louange, et Il est capable de toute chose.", None, "matin", None, "100 fois dans la journée"),
 ("Gloire et pureté à Allah, et par Sa louange, autant que le nombre de Ses créatures, autant qu'il Lui plaît, autant que le poids de Son Trône et l'encre de Ses paroles.", None, "matin", None, None),
 ("Ô Allah, je Te demande une science utile, une subsistance licite et des œuvres acceptées.", None, "matin", None, "Après la prière du Fajr"),
 ("Je demande pardon à Allah et je me repens à Lui.", None, "both", None, "100 fois dans la journée"),
 ("Je cherche refuge dans les paroles parfaites d'Allah contre le mal de ce qu'Il a créé.", None, "soir", None, None),
 ("Ô Allah, prie sur notre Prophète Muhammad et accorde-lui la paix.", None, "both", None, None),
]
assert len(FR) == len(A) == 24

def clean(t):
    m = re.findall(r"\(\((.*?)\)\)", t, re.S)
    if m: return re.sub(r"\s+", " ", " ".join(m)).strip(" .،")
    t = re.sub(r"\[[^\]]*\]", "", t)              # variantes du soir (traduites à part)
    HARAKAT = re.compile(r"[\u064B-\u0652\u0670\u0640]")
    t = re.sub(r"\([^()]*\)", lambda m: "" if re.search(r"مر|إذا|أمسى|أصبح", HARAKAT.sub("", m.group(0))) else m.group(0), t)  # « (trois fois) »
    t = t.replace("((", "").replace("))", "").replace("﴿", "﴿").strip()
    t = re.sub(r"\s+", " ", t).strip(" .،")
    return t

out = []
for i, (a, (fr, fr_soir, when, rep, note)) in enumerate(zip(A, FR)):
    soir_ar = " ".join(re.findall(r"\[([^\]]*)\]", a["ARABIC_TEXT"])).strip() or None
    out.append({"id": i + 1, "ar": clean(a["ARABIC_TEXT"]), "ar_soir": soir_ar, "fr": fr, "fr_soir": fr_soir,
                "repeat": rep or int(a["REPEAT"]), "when": when, "note": note})
pathlib.Path(__file__).resolve().parents[1].joinpath("public/data/adhkar.json").write_text(
    json.dumps({"source": "Hisn al-Muslim (Sa'id ibn Wahf al-Qahtani), chapitre « Adhkar du matin et du soir »", "items": out}, ensure_ascii=False, indent=0), encoding="utf-8")
print(len(out))
