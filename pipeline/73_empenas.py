# Etapa 4b / passo 73: empenas cegas e murais.
# 1) detecta empenas: parede que NÃO dá para a rua, com faixa exposta (acima do vizinho ou do chão) >= 10 m x 6 m;
# 2) procura fotos do Mapillary que vejam a faixa (até 120 m, visada checada em 3D por cima dos prédios baixos);
# 3) retifica, decide se é mural (muita cor) e reduz para ~24x40 px com 12 cores (estilo N64);
# 4) monta um atlas PNG. Saídas: empenas.json, murals_atlas.png, debug/murais.png
import json, math, os, sys, urllib.request, numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi
from scipy.spatial import cKDTree
from pyproj import Transformer
from concurrent.futures import ThreadPoolExecutor

# reaproveita o modelo de câmera e os utilitários do passo 72
_src = open("72_facade_params.py", encoding="utf-8").read().split("for ch in choice:")[0]
ns = {}; exec(_src, ns)
sample_facade, kmeans, at = ns["sample_facade"], ns["kmeans"], ns["at"]
lp = json.load(open("lp.json", encoding="utf-8")); meta = json.load(open("meta2.json"))
ox, oy, oz = meta["origin"]["x"], meta["origin"]["y"], meta["origin"]["z"]
S = np.load("strip.npz"); L2 = np.load("labels2.npz")
WX = float(S["X0"]) + int(S["c0"]) - ox; WY = float(S["Y0"]) + int(S["r0"]) - oy
gnd2, dtm = L2["ground"], L2["dtm"].astype(float) - oz
H_, W_ = dtm.shape

# altura do topo de prédio por célula (0,5 m), em coordenadas locais
R2 = 2
im_t = Image.new("I", (W_ * R2, H_ * R2), -100000); im_i = Image.new("I", (W_ * R2, H_ * R2), -1)
dt_, di_ = ImageDraw.Draw(im_t), ImageDraw.Draw(im_i)
for k, b in enumerate(sorted(range(len(lp["buildings"])), key=lambda i: lp["buildings"][i]["t"])):
    bb = lp["buildings"][b]; poly = [((x - WX) * R2, (y - WY) * R2) for x, y in bb["p"]]
    dt_.polygon(poly, fill=int(bb["t"] * 100)); di_.polygon(poly, fill=b)
BT = np.array(im_t) / 100.0; BI = np.array(im_i)
def btop(x, y):
    c, r = int((x - WX) * R2), int((y - WY) * R2)
    if 0 <= r < BT.shape[0] and 0 <= c < BT.shape[1]: return BT[r, c], BI[r, c]
    return -1000, -1
def gat(a, x, y):
    c, r = int(np.clip(x - WX, 0, W_ - 1)), int(np.clip(y - WY, 0, H_ - 1)); return a[r, c]

# ---------- 1. empenas ----------
STREET = {1, 2, 3, 4}
emp = []
for bi, b in enumerate(lp["buildings"]):
    pts = np.array(b["p"]); n = len(pts); street = b["b"] + 0.4
    for k in range(n):
        a_, c_ = pts[k], pts[(k + 1) % n]; L = float(np.hypot(*(c_ - a_)))
        if L < 6: continue
        t_ = (c_ - a_) / L; nrm = np.array([t_[1], -t_[0]])
        samples = [a_ + t_ * L * f + nrm * dd for f in (0.2, 0.5, 0.8) for dd in (1.0, 2.5)]
        tops, own, gstreet, nb = [], 0, 0, 0
        for s_ in samples:
            h_, i_ = btop(*s_)
            if i_ == bi: own += 1; continue
            tops.append(h_ if i_ >= 0 else gat(dtm, *s_)); nb += i_ >= 0
            rc_ok = gat(gnd2, *s_) in STREET and i_ < 0; gstreet += rc_ok
        if own > 2 or not tops: continue
        if gstreet >= len(samples) * 0.6 and max(tops) < street + 2: continue      # dá para a rua: fachada com janelas
        if nb < len(samples) * 0.5: continue          # sem vizinho colado = fundos (tem janela), não é empena
        lo = max(float(np.median(tops)), street)
        if b["t"] - lo < 10: continue
        emp.append({"bi": bi, "bid": b["id"], "k": k, "a": a_.tolist(), "c": c_.tolist(), "L": round(L, 2), "lo": round(lo, 2),
                    "hi": b["t"], "street": street, "nrm": nrm.tolist()})
print("empenas detectadas:", len(emp), "em", len({e["bi"] for e in emp}), "prédios; área total %.0f m²" % sum(e["L"] * (e["hi"] - e["lo"]) for e in emp))

# ---------- 2. fotos que veem cada empena ----------
T = Transformer.from_crs(4326, 31983, always_xy=True)
imgs = [i for i in json.load(open("mly/images.json", encoding="utf-8")) if not i.get("is_pano")]
P, HD, MI = [], [], []
for i in imgs:
    g = (i.get("computed_geometry") or i["geometry"])["coordinates"]; a = i.get("computed_compass_angle", i.get("compass_angle"))
    if a is None: continue
    x, y = T.transform(g[0], g[1]); P.append((x - ox, y - oy)); HD.append(math.radians(a)); MI.append(i)
P = np.array(P); kt = cKDTree(P)
deck, dtop = L2["deck"], L2["deck_top"].astype(float) - oz
def cam_z(x, y): return (gat(dtop, x, y) + 1.7) if gat(deck, x, y) else (gat(dtm, x, y) + 2.2)
def sees(px, py, pz, tx, ty, tz, own):
    d = math.hypot(tx - px, ty - py); n = int(d / 1.0)
    for s in range(2, n - 2):
        f = s / n; x, y = px + (tx - px) * f, py + (ty - py) * f; z = pz + (tz - pz) * f
        h_, i_ = btop(x, y)
        if i_ >= 0 and i_ != own and h_ > z: return False
    return True
for e in emp:
    e["mlo"] = max(e["lo"], e["street"] + 6.0)       # mural: só a parte alta da empena
    e["cands"] = []
    if e["L"] < 8 or e["hi"] - e["mlo"] < 10: continue
    m = (np.array(e["a"]) + np.array(e["c"])) / 2; nrm = np.array(e["nrm"]); zm = (e["mlo"] + e["hi"]) / 2
    sc = []
    for j in kt.query_ball_point(m, 120):
        v = m - P[j]; d = float(np.hypot(*v))
        if d < 12 or np.dot(P[j] - m, nrm) < 6: continue
        f = (MI[j].get("camera_parameters") or [0.8])[0] or 0.8; fish = MI[j].get("camera_type") == "fisheye"
        half = math.degrees(0.5 / f) if fish else math.degrees(math.atan(0.5 / f))
        look = np.array([math.sin(HD[j]), math.cos(HD[j])])
        al = math.degrees(math.acos(np.clip(np.dot(look, v / d), -1, 1))); ao = math.degrees(math.acos(np.clip(np.dot(-nrm, v / d), -1, 1)))
        if al > half - 8 or ao > 65: continue
        # a faixa precisa caber na vertical da foto
        zc = cam_z(*P[j]); el_hi = math.degrees(math.atan2(e["hi"] - zc, d)); el_lo = math.degrees(math.atan2(e["mlo"] - zc, d))
        if el_hi > half * 0.8 or el_lo < -half * 0.8: continue
        sc.append((al + ao * 0.7 + abs(d - 45) * 0.15, j, d, zc))
    sc.sort(); e["cands"] = []
    for s_, j, d, zc in sc[:20]:
        if sees(P[j][0], P[j][1], zc, m[0], m[1], zm, e["bi"]):
            i = MI[j]; e["cands"].append({"img": i["id"], "cam": P[j].tolist(), "hd": math.degrees(HD[j]), "dist": round(d, 1),
                                          "cp": i.get("camera_parameters"), "ct": i.get("camera_type")})
            if len(e["cands"]) == 3: break
print("empenas com foto candidata:", sum(1 for e in emp if e["cands"]))

TOKEN = os.environ.get("MAPILLARY_TOKEN"); HDR = {"Authorization": "OAuth " + (TOKEN or ""), "User-Agent": "fpv-sim-pipeline"}
def dl(i):
    dst = f"mly/img/{i}.jpg"
    if os.path.exists(dst): return True
    try:
        u = json.loads(urllib.request.urlopen(urllib.request.Request(f"https://graph.mapillary.com/{i}?fields=thumb_1024_url", headers=HDR), timeout=60).read())["thumb_1024_url"]
        open(dst, "wb").write(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "fpv-sim-pipeline"}), timeout=60).read()); return True
    except Exception: return False
ids = sorted({c["img"] for e in emp for c in e["cands"]})
with ThreadPoolExecutor(8) as ex: ok = list(ex.map(dl, ids))
print("fotos baixadas para empenas:", sum(ok), "de", len(ids))

# ---------- 3. mural ou reboco ----------
murals, dbg = [], []
for e in emp:
    best = None
    for cand in e["cands"]:
        fn = f"mly/img/{cand['img']}.jpg"
        if not os.path.exists(fn): continue
        im = Image.open(fn).convert("RGB")
        A_ = np.asarray(im).astype(float)
        if A_[: A_.shape[0] // 4].mean() < 70: continue          # alto da foto escuro: laje do viaduto por cima
        RGB, M, Lm, oh, on_deck, corners = sample_facade(im, cand, [e["a"], e["c"]], e["mlo"], e["hi"])
        cov = M.mean()
        if cov < 0.9: continue
        ys = [c[1] for c in corners]; xs = [c[0] for c in corners]
        if max(ys) - min(ys) < 150 or min(xs) < 5 or max(xs) > im.size[0] - 5 or min(ys) < 5 or max(ys) > im.size[1] - 5: continue
        lum = RGB.mean(-1); sky = ((RGB[..., 2] > RGB[..., 0] + 12) & (lum > 140)) | (lum > 238)
        fsky = (sky & M).sum() / max(1, M.sum())
        if fsky > 0.2: continue
        mx, mn = RGB.max(-1), RGB.min(-1); sat = (mx - mn) / np.maximum(mx, 1)
        colorful = float(np.std(RGB[M].reshape(-1, 3), 0).mean()); satm = float(sat[M].mean())
        q = cov - fsky * 2 + min(colorful, 60) / 60
        if best is None or q > best[0]: best = (q, cand, im, RGB, M, corners, colorful, satm)
    e["mural"] = None
    if best is None: continue
    q, cand, im, RGB, M, corners, colorful, satm = best
    mx, mn = RGB.max(-1), RGB.min(-1); sat = (mx - mn) / np.maximum(mx, 1)
    wall = np.median(RGB[M].reshape(-1, 3), 0); e["wall"] = [int(v) for v in wall]; e["img"] = cand["img"]
    rows_col = (sat > 0.3) & M; spread = float((rows_col.mean(1) > 0.15).mean())
    if colorful > 45 and satm > 0.28 and spread > 0.6:   # muita cor, saturada e espalhada pela faixa: é mural
        w = int(np.clip(round(e["L"] / 1.0), 8, 32)); h = int(np.clip(round((e["hi"] - e["lo"]) / 1.0), 8, 48))
        small = Image.fromarray(np.where(M[..., None], RGB, wall).astype(np.uint8)).resize((w, h), Image.BOX)
        small = small.quantize(colors=12, method=Image.Quantize.MEDIANCUT).convert("RGB")
        e["mural"] = len(murals); murals.append(small)
        dbg.append((e, im, corners, small))
print("murais:", len(murals), "| empenas lisas com cor medida:", sum(1 for e in emp if e.get("wall") and e["mural"] is None),
      "| empenas sem foto boa (reboco na cor do prédio):", sum(1 for e in emp if not e.get("wall")))

# ---------- 4. atlas ----------
AW = 512; x = y = rowh = 0; rects = []
for m_ in murals:
    w, h = m_.size
    if x + w + 2 > AW: x = 0; y += rowh + 2; rowh = 0
    rects.append((x, y, w, h)); x += w + 2; rowh = max(rowh, h)
AH = max(16, 1 << int(math.ceil(math.log2(y + rowh + 2)))) if murals else 16
atlas = Image.new("RGB", (AW, AH), (128, 128, 128))
for m_, (x, y, w, h) in zip(murals, rects): atlas.paste(m_, (x, y))
atlas.save("murals_atlas.png", optimize=True)
for e in emp:
    if e["mural"] is not None:
        x, y, w, h = rects[e["mural"]]; e["rect"] = [x / AW, y / AH, w / AW, h / AH]
    e.pop("cands", None)
json.dump({"atlas": [AW, AH], "empenas": emp}, open("empenas.json", "w", encoding="utf-8"))
print("atlas %dx%d, %.1f KB" % (AW, AH, os.path.getsize("murals_atlas.png") / 1e3))

# prancha de conferência
F = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 14)
sel = dbg[:12]
sheet = Image.new("RGB", (2 * 640, max(1, (len(sel) + 1) // 2) * 250), (15, 17, 22)); ds = ImageDraw.Draw(sheet)
for k, (e, im, corners, small) in enumerate(sel):
    x0, y0 = (k % 2) * 640, (k // 2) * 250
    t = im.copy(); d = ImageDraw.Draw(t); d.polygon([tuple(c) for c in corners], outline=(255, 0, 255), width=5); t.thumbnail((400, 240))
    sheet.paste(t, (x0 + 5, y0 + 5)); s2 = small.resize((small.width * 5, small.height * 5), Image.NEAREST); s2.thumbnail((220, 240), Image.NEAREST)
    sheet.paste(s2, (x0 + 410, y0 + 5)); ds.text((x0 + 410, y0 + 225), f"prédio {e['bid']} · {e['L']:.0f}x{e['hi']-e['lo']:.0f} m", font=F, fill="white")
sheet.save("debug/murais.png")
