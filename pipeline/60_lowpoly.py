# Etapa 3 / passo 60: prepara a cena low-poly (V 1) a partir da fusão da Etapa 2.
# "Licença poética": viaduto reto e de largura constante, prédios esquadrejados, guias retas (vetores GeoSampa),
# gramados com borda suave, faixas pintadas a partir das vias do OSM.
# Saídas: lp.json (prédios, árvores, viaduto, pilares, metadados) e lp.bin.gz (mapas em coordenadas da faixa).
import json, gzip, base64, math, numpy as np
from PIL import Image, ImageDraw
from pyproj import Transformer
from scipy import ndimage as ndi
from scipy.spatial import cKDTree
from skimage.measure import find_contours, approximate_polygon

S = np.load("strip.npz"); L2 = np.load("labels2.npz"); J = json.load(open("scene2.json", encoding="utf-8"))
meta = json.load(open("meta2.json"))
ox, oy, oz = meta["origin"]["x"], meta["origin"]["y"], meta["origin"]["z"]
ns, nw, half = meta["strip"]["ns"], meta["strip"]["nw"], meta["strip"]["half"]
sp = np.frombuffer(gzip.decompress(base64.b64decode(open("spine2.b64").read())), np.float32).reshape(ns, 5).astype(np.float64)
Q = sp[:, :2]; NRM = sp[:, 2:4]; OFF = sp[:, 4]; TG = np.c_[NRM[:, 1], -NRM[:, 0]]
r0, r1, c0, c1 = (int(S[k]) for k in ("r0", "r1", "c0", "c1")); X0, Y0 = float(S["X0"]), float(S["Y0"])
WX, WY = X0 + c0 - ox, Y0 + r0 - oy          # canto da janela em coordenadas locais
H, W = L2["dtm"].shape
dtm = L2["dtm"].astype(np.float64) - oz      # chão local (m, relativo a oz)
RES = 4                                      # mapa de tipos: 4 px por metro (25 cm)
T84 = Transformer.from_crs(4326, 31983, always_xy=True)

def strip_xy(s, j):  # s, j contínuos (arrays) -> x, y locais
    s = np.clip(s, 0, ns - 1); i0 = np.floor(s).astype(int); i1 = np.minimum(i0 + 1, ns - 1); f = s - i0
    q = Q[i0] * (1 - f)[..., None] + Q[i1] * f[..., None]
    n = NRM[i0] * (1 - f)[..., None] + NRM[i1] * f[..., None]
    o = OFF[i0] * (1 - f) + OFF[i1] * f
    t = o + j - half
    return q[..., 0] + n[..., 0] * t, q[..., 1] + n[..., 1] * t
def sample(a, x, y, order=1, res=1):  # amostra raster da janela (res px/m) em x,y locais
    return ndi.map_coordinates(a, [(y - WY) * res - .5, (x - WX) * res - .5], order=order, mode="nearest")

# ---------- 1. mapa de tipos em alta resolução (UTM, 25 cm) ----------
ROAD, WALK, PLAZA, GRASS, LOT, MARKW, MARKY = 1, 2, 3, 4, 5, 6, 7
def to_px(pts): return [((x - ox - WX) * RES, (y - oy - WY) * RES) for x, y, *_ in pts]
def gj(name): return json.load(open(f"geosampa/{name}.geojson", encoding="utf-8"))["features"]
def rings(geom):
    t, c = geom["type"], geom["coordinates"]
    return [c] if t == "Polygon" else list(c) if t == "MultiPolygon" else []
osm = json.load(open("osm.json", encoding="utf-8"))["elements"]
def osm_xy(g): return [T84.transform(p["lon"], p["lat"]) for p in g]
def osm_polys(e):
    if e["type"] == "way" and "geometry" in e:
        g = osm_xy(e["geometry"]); return [[g]] if len(g) >= 3 else []
    if e["type"] == "relation":
        outs = [osm_xy(m["geometry"]) for m in e.get("members", []) if m.get("role") == "outer" and "geometry" in m]
        return [[o] for o in outs if len(o) >= 3]
    return []
im = Image.new("L", (W * RES, H * RES), ROAD); d = ImageDraw.Draw(im)
for f in gj("quadra_viaria_editada"):
    for p in rings(f["geometry"]):
        d.polygon(to_px(p[0]), fill=LOT)
        for h_ in p[1:]: d.polygon(to_px(h_), fill=ROAD)
for e in osm:
    t = e.get("tags", {})
    if t.get("leisure") in ("park", "garden", "playground") or t.get("place") == "square" or (t.get("highway") == "pedestrian" and t.get("area") == "yes"):
        for p in osm_polys(e): d.polygon(to_px(p[0]), fill=PLAZA)
for f in gj("calcada"):
    for p in rings(f["geometry"]): d.polygon(to_px(p[0]), fill=WALK)
tm = np.array(im)
# gramados: da camada de chão (1 m), suavizados
g1 = (L2["ground"] == 4).astype(np.float32)
g4 = ndi.gaussian_filter(np.kron(g1, np.ones((RES, RES), np.float32)), 3.0) > 0.5
tm[g4 & (tm != ROAD)] = GRASS
tm[g4 & (tm == ROAD) & ndi.binary_erosion(g4, iterations=4)] = GRASS   # canteiro central gramado
# faixas pintadas (só sobre asfalto): mão dupla = amarela tracejada no eixo; mão única = brancas entre faixas
mk = Image.new("L", im.size, 0); dm = ImageDraw.Draw(mk)
def dashed(pts, off, col, dash=3.0, gap=4.0, wpx=1):
    P = np.array(pts, float)
    if len(P) < 2: return
    seg = np.diff(P, axis=0); Ls = np.hypot(*seg.T); s = np.r_[0, np.cumsum(Ls)]
    if s[-1] < 4: return
    st = np.arange(0, s[-1], 0.5)
    xy = np.c_[np.interp(st, s, P[:, 0]), np.interp(st, s, P[:, 1])]
    tg = np.gradient(xy, axis=0); tg /= np.maximum(np.hypot(*tg.T), 1e-9)[:, None]
    xy = xy + np.c_[-tg[:, 1], tg[:, 0]] * off
    on = (st % (dash + gap)) < dash
    k = 0
    while k < len(st):
        if on[k]:
            e_ = k
            while e_ + 1 < len(st) and on[e_ + 1]: e_ += 1
            if e_ > k: dm.line(to_px(xy[k:e_ + 1]), fill=col, width=wpx)
            k = e_ + 1
        else: k += 1
DEFL = {"trunk": 3, "primary": 3, "secondary": 2, "tertiary": 2, "trunk_link": 1, "primary_link": 1, "secondary_link": 1}
for r in J["roads"]:
    if r["bridge"] or r["hw"] in ("service",): continue
    n_ = r["lanes"] or DEFL.get(r["hw"], 1)
    if not r["oneway"]:
        if r["hw"] not in ("residential", "living_street", "unclassified") or n_ >= 2: dashed(r["pts"], 0, MARKY)
    elif n_ >= 2:
        for k_ in range(1, n_): dashed(r["pts"], (k_ - n_ / 2) * 3.2, MARKW)
mkA = np.array(mk)
tm = np.where((mkA > 0) & (tm == ROAD), mkA, tm).astype(np.uint8)

# ---------- 2. mapa de tipos na faixa (25 cm) e chão (1 m) ----------
pi = (np.arange(ns * RES) + .5) / RES - .5; pj = (np.arange(nw * RES) + .5) / RES - .5
SS, JJ = np.meshgrid(pi, pj, indexing="ij")
xs, ys = strip_xy(SS, JJ)
tstrip = sample(tm, xs, ys, order=0, res=RES).astype(np.uint8)
del SS, JJ, xs, ys
Si, Sj = np.meshgrid(np.arange(ns, dtype=float), np.arange(nw, dtype=float), indexing="ij")
vx, vy = strip_xy(Si, Sj)
ground = ndi.gaussian_filter(sample(dtm, vx, vy), 1.0)

# ---------- 3. viaduto principal: fita reta, largura constante ----------
deck_w = L2["deck"]; deck_top = L2["deck_top"].astype(np.float64) - oz
dS = sample(deck_w.astype(np.float32), vx, vy, order=0) > 0.5
zS = sample(deck_top, vx, vy, order=0)
cen, wid, zc = np.full(ns, np.nan), np.full(ns, np.nan), np.full(ns, np.nan)
for i in range(ns):
    row = dS[i]
    if not row.any(): continue
    lab, nl = ndi.label(row)
    best, bd = None, 99
    for k in range(1, nl + 1):
        jj = np.nonzero(lab == k)[0]
        dist = 0 if jj[0] <= half <= jj[-1] else min(abs(jj[0] - half), abs(jj[-1] - half))
        if dist < bd and len(jj) >= 6: best, bd = jj, dist
    if best is None or bd > 6: continue
    cen[i] = (best[0] + best[-1]) / 2 - half; wid[i] = best[-1] - best[0] + 1; zc[i] = np.median(zS[i, best])
ok = ~np.isnan(cen)
lab, nl = ndi.label(ok); sizes = ndi.sum(ok, lab, range(1, nl + 1)); main = lab == (np.argmax(sizes) + 1)
idx = np.nonzero(main)[0]; i0, i1 = idx[0], idx[-1]
core = slice(i0 + (i1 - i0) // 10, i1 - (i1 - i0) // 10)
DW = float(np.nanmedian(wid[core]))
rng_ = np.arange(i0, i1 + 1)
def fillnan(a):
    a = a.copy(); m = np.isnan(a)
    if m.any(): a[m] = np.interp(np.nonzero(m)[0], np.nonzero(~m)[0], a[~m])
    return a
c_s = ndi.gaussian_filter1d(fillnan(cen[rng_]), 40, mode="nearest")
z_s = ndi.gaussian_filter1d(fillnan(zc[rng_]), 6, mode="nearest")
gc = ground[rng_, np.clip(np.round(half + c_s).astype(int), 0, nw - 1)]
z_s = np.maximum(z_s, gc + 0.15)
def extend(end):  # rampa final: desce até o chão com 6% de inclinação
    sgn = 1 if end == "hi" else -1
    i = i1 if end == "hi" else i0; z = z_s[-1] if end == "hi" else z_s[0]; c = c_s[-1] if end == "hi" else c_s[0]
    pts = []
    while 0 < i + sgn < ns - 1:
        i += sgn; g_ = ground[i, int(np.clip(round(half + c), 0, nw - 1))]; z -= 0.06
        if z <= g_ + 0.1: break
        pts.append((i, c, z))
    return pts
ex_lo, ex_hi = extend("lo")[::-1], extend("hi")
stations = [(i, c, z) for i, c, z in ex_lo] + list(zip(rng_, c_s, z_s)) + ex_hi
main_r = []
for k, (i, c, z) in enumerate(stations):
    if k % 2 and k != len(stations) - 1: continue
    x, y = strip_xy(np.array([float(i)]), np.array([half + c]))
    main_r.append([round(float(x[0]), 2), round(float(y[0]), 2), round(float(z), 2)])
ribbons = [{"kind": "main", "hw": round(DW / 2, 2), "pts": main_r}]

# ---------- 4. rampas laterais e passarela (vias do OSM com bridge) ----------
ELEV = "Elevado Presidente João Goulart"
for e in osm:
    t = e.get("tags", {})
    if e["type"] != "way" or t.get("bridge") not in ("yes", "viaduct") or "geometry" not in e: continue
    if t.get("name") == ELEV and t.get("highway") == "trunk": continue
    foot = t.get("highway") in ("footway", "path", "steps", "cycleway")
    P = np.array([(x - ox, y - oy) for x, y in osm_xy(e["geometry"])])
    seg = np.diff(P, axis=0); Ls = np.hypot(*seg.T); s = np.r_[0, np.cumsum(Ls)]
    st = np.arange(0, s[-1] + 0.01, 2.0); xy = np.c_[np.interp(st, s, P[:, 0]), np.interp(st, s, P[:, 1])]
    inwin = (xy[:, 0] > WX + 2) & (xy[:, 0] < WX + W - 2) & (xy[:, 1] > WY + 2) & (xy[:, 1] < WY + H - 2)
    if inwin.sum() < 3: continue
    xy = xy[inwin]
    g_ = sample(dtm, xy[:, 0], xy[:, 1])
    dk = ndi.maximum_filter(deck_w.astype(np.uint8), 5)
    has = sample(dk.astype(np.float32), xy[:, 0], xy[:, 1], order=0) > 0.5
    zt = sample(ndi.maximum_filter(np.where(deck_w, deck_top, -1e3), 5), xy[:, 0], xy[:, 1], order=0)
    if has.mean() < 0.3 and not foot: continue
    z = np.where(has & (zt > g_ + 0.3), zt, np.nan)
    if np.isnan(z).all():
        if not foot: continue
        z = g_ + 5.5
    z = fillnan(z); z = ndi.gaussian_filter1d(z, 2, mode="nearest"); z = np.maximum(z, g_ + 0.15)
    lanes = int(t["lanes"]) if t.get("lanes", "").isdigit() else 1
    hw = 1.6 if foot else (lanes * 3.3 + 1.2) / 2
    ribbons.append({"kind": "foot" if foot else "ramp", "name": t.get("name"), "hw": round(hw, 2),
                    "pts": [[round(float(a), 2), round(float(b), 2), round(float(c), 2)] for (a, b), c in zip(xy, z)]})

# ---------- 5. pilares ----------
DECK_T = 1.5
pillars = []
def add_pillars(rb, every, minclear, size):
    P = np.array(rb["pts"]); seg = np.diff(P[:, :2], axis=0); Ls = np.hypot(*seg.T); s = np.r_[0, np.cumsum(Ls)]
    for st in np.arange(every / 2, s[-1], every):
        k = min(np.searchsorted(s, st), len(P) - 1); x, y, z = P[k]
        g_ = float(sample(dtm, np.array([x]), np.array([y]))[0])
        if z - DECK_T - g_ < minclear: continue
        a = P[min(k + 1, len(P) - 1), :2] - P[max(k - 1, 0), :2]; ang = math.atan2(a[1], a[0])
        pillars.append([round(x, 2), round(y, 2), round(g_ - 0.5, 2), round(z - DECK_T, 2), round(ang, 3), size[0], size[1], round(rb["hw"] * 1.5, 2)])
add_pillars(ribbons[0], 30, 4.0, (1.2, 3.0))
for rb in ribbons[1:]: add_pillars(rb, 20, 2.5, (0.8, 1.6) if rb["kind"] == "ramp" else (0.5, 0.5))

# ---------- 6. colisão do viaduto na faixa (1 m): topo (com guarda-corpo) e fundo ----------
allp, info = [], []
for ri, rb in enumerate(ribbons):
    P = np.array(rb["pts"])
    for k in range(len(P)):
        a = P[min(k + 1, len(P) - 1), :2] - P[max(k - 1, 0), :2]; a /= max(np.hypot(*a), 1e-9)
        allp.append(P[k, :2]); info.append((P[k, 2], rb["hw"], a[0], a[1]))
allp = np.array(allp); info = np.array(info); kt = cKDTree(allp)
V = np.c_[vx.ravel(), vy.ravel()]
dd, kk = kt.query(V, k=4)
dtop = np.full(len(V), -1e4); dbot = np.full(len(V), -1e4)
for col in range(4):
    z, hw, tx, ty = info[kk[:, col]].T
    rel = V - allp[kk[:, col]]
    lat = np.abs(-rel[:, 0] * ty + rel[:, 1] * tx); lon = np.abs(rel[:, 0] * tx + rel[:, 1] * ty)
    inside = (lat <= hw + 0.3) & (lon <= 1.6)
    top = z + np.where(lat > hw - 0.35, 1.1, 0.0)
    better = inside & (top > dtop)
    dtop[better] = top[better]; dbot[better] = z[better] - DECK_T
dtop = dtop.reshape(ns, nw); dbot = dbot.reshape(ns, nw)

# ---------- 7. prédios: esquadrejar os que vêm do LiDAR, limpar os do GeoSampa ----------
def dom_angle(P):
    e = np.diff(np.vstack([P, P[:1]]), axis=0); L_ = np.hypot(*e.T); a = np.arctan2(e[:, 1], e[:, 0])
    return math.atan2((L_ * np.sin(4 * a)).sum(), (L_ * np.cos(4 * a)).sum()) / 4
def rectify(P):
    th = dom_angle(P); c, s_ = math.cos(-th), math.sin(-th)
    R = np.c_[P[:, 0] * c - P[:, 1] * s_, P[:, 0] * s_ + P[:, 1] * c]
    mn = R.min(0) - 2; g = 2.0  # 0,5 m
    sh = (np.ceil((R.max(0) - mn + 2) * g)).astype(int)[::-1]
    im_ = Image.new("L", (int(sh[1]), int(sh[0])), 0); ImageDraw.Draw(im_).polygon([tuple((p - mn) * g) for p in R], fill=1)
    m = np.array(im_) > 0
    m = ndi.binary_closing(ndi.binary_opening(m, np.ones((3, 3))), np.ones((3, 3)))
    if m.sum() < 8: return P
    cs = find_contours(np.pad(m, 1).astype(float), 0.5)
    if not cs: return P
    cm = max(cs, key=len)[:, ::-1] - 1
    # contorno em escada -> só arestas alinhadas aos eixos, tirando degraus < 1 m
    cm = np.round(cm * 2) / 2
    cm = approximate_polygon(cm, 1.2)[:-1]
    if len(cm) < 3: return P
    A = cm / g + mn
    for k in range(len(A)):  # força cada aresta a ficar horizontal ou vertical no sistema girado
        a, b = A[k], A[(k + 1) % len(A)]
        if abs(b[0] - a[0]) > abs(b[1] - a[1]): A[(k + 1) % len(A)][1] = a[1] if k + 1 < len(A) else A[0][1]
        else: A[(k + 1) % len(A)][0] = a[0] if k + 1 < len(A) else A[0][0]
    c, s_ = math.cos(th), math.sin(th)
    out = np.c_[A[:, 0] * c - A[:, 1] * s_, A[:, 0] * s_ + A[:, 1] * c]
    return out if len(out) >= 3 else P
def clean(P):
    P = approximate_polygon(np.vstack([P, P[:1]]), 0.35)[:-1]
    return P
PAL_WALL = ["#d9cfbf", "#e8e2d6", "#c9c3b8", "#bfb5a3", "#d8c3a5", "#a9a39a", "#e3d9c6", "#cdbfae", "#b8c0c4", "#d6b49c", "#c4b8a8", "#e0d4c0"]
PAL_TOWER = ["#b9c4cc", "#a7b3bc", "#c8ccc8", "#9fa9ad", "#d5d8d6"]
# fachadas medidas nas fotos do Mapillary (Etapa 4); prédios sem foto sorteiam cor da paleta MEDIDA
import os as _os
FAC = json.load(open("facades.json")) if _os.path.exists("facades.json") else {}
def expo(c):
    """foto na sombra/subexposta: mantém o tom e corrige o brilho (x1,35, entre 105 e 235)"""
    c = np.array(c, float); l = c.mean()
    if l < 1: return c
    tgt = float(np.clip(l * 1.35, 105, 235)); c = c * tgt / l
    return np.clip(c, 0, 250)
FAC = {k: v for k, v in FAC.items() if np.mean(v["wall"]) >= 60}     # muito escuro = contraluz: descarta
POOL = [expo(v["wall"]) for v in FAC.values() if v.get("conf") in ("alta", "media")]
def hexc(c): return "#%02x%02x%02x" % tuple(int(np.clip(v, 0, 255)) for v in c)
# empenas cegas (passo 73): parede lateral acima do vizinho fica sem janela; murais só se confiáveis (desligados: GPS das fotos erra)
EMP = {}
if _os.path.exists("empenas.json"):
    for e in json.load(open("empenas.json", encoding="utf-8"))["empenas"]: EMP.setdefault(e["bid"], []).append(e)
blds, nrect, nfac = [], 0, 0
for b in J["buildings"]:
    P = np.array(b["poly"], float) - [ox, oy]
    if b["src"] == "geosampa": P = clean(P)
    else: P = rectify(P); nrect += 1
    if len(P) < 3: continue
    a2 = 0.5 * np.sum(P[:, 0] * np.roll(P[:, 1], -1) - np.roll(P[:, 0], -1) * P[:, 1])
    if abs(a2) < 6: continue
    if a2 < 0: P = P[::-1]
    gz = sample(dtm, P[:, 0], P[:, 1])
    base = float(gz.min()) - 0.4; top = (b["base"] - oz) + b["h"]
    if top - base < 2.5: top = base + 3.0
    h = b["h"]; r_, g_, b_ = b["rgb"]
    style = 0 if h < 9 else 1          # centro de SP: prédio alto é concreto/reboco com janelas; vidro só se a foto mostrar
    if h < 9 and b["area"] > 450: style = 3
    telha = (r_ > g_ + 12 and r_ > b_ + 22) and h < 16
    rng = np.random.default_rng(b["id"] * 7919)
    tint = PAL_WALL[rng.integers(0, 99) % len(PAL_WALL)]
    roof = "#%02x%02x%02x" % tuple(int(np.clip(v * 1.05, 0, 255)) for v in (r_, g_, b_))
    f = FAC.get(str(b["id"])); grid = [3.2, 3.0]; shop = None
    if f:
        nfac += 1
        wall = expo(f["wall"])
        if f["conf"] == "baixa": wall = 0.5 * wall + 0.5 * np.array([int(tint[i:i + 2], 16) for i in (1, 3, 5)], float)
        tint = hexc(wall)
        if f["floor_q"] > 0.12: grid[1] = float(np.clip(f["floorH"], 2.7, 4.2))
        if f["winSp"] and f["win_q"] > 0.12:
            w_ = f["winSp"] * (2 if f["winSp"] < 2.2 else 1)   # período curto = caixilho no meio da janela
            grid[0] = float(np.clip(w_, 2.2, 6.0))
        if f["glass"] > 0.5 and h > 30: style = 2
        elif f["glass"] < 0.12 and h < 14: style = 0
        shop = 1 if f["shop"] else 0
    elif POOL:
        tint = hexc(POOL[rng.integers(0, 10 ** 6) % len(POOL)]) if style != 2 else tint
    blds.append({"p": [[round(x, 2), round(y, 2)] for x, y in P], "b": round(base, 2), "t": round(top, 2), "s": style,
                 "rf": 1 if telha else 0, "w": tint, "r": roof, "fl": b["floors_est"], "id": b["id"],
                 "g": [round(grid[0], 2), round(grid[1], 2)], "sh": shop, "mf": 1 if f else 0,
                 "em": [[e["k"], round(e["lo"] - (base + 0.4), 2)] for e in EMP.get(b["id"], [])]})

# colisão dos prédios na faixa a 0,5 m
im_b = Image.new("I", (W * 2, H * 2), -100000); db_ = ImageDraw.Draw(im_b)
for b in sorted(blds, key=lambda b: b["t"]):
    db_.polygon([((x - WX) * 2, (y - WY) * 2) for x, y in b["p"]], fill=int(b["t"] * 100))
bt = np.array(im_b).astype(np.float64) / 100
SB, JB = np.meshgrid((np.arange(ns * 2) + .5) / 2 - .5, (np.arange(nw * 2) + .5) / 2 - .5, indexing="ij")
bx, by = strip_xy(SB, JB)
bstrip = sample(bt, bx, by, order=0, res=2)

# ---------- 8. árvores ----------
trees = []
for t in J["trees"]:
    x, y = t["x"] - ox, t["y"] - oy
    g_ = float(sample(dtm, np.array([x]), np.array([y]))[0])
    r, h = max(1.2, t["r"]), max(3.0, t["h"])
    model = 1 if h / r > 3.2 else (2 if r > 6 else 0)
    # cor da copa no LiDAR é escura/azulada (sombra): mistura com uma paleta de verdes, variando por árvore
    GREENS = [(74, 118, 52), (88, 132, 60), (62, 104, 48), (100, 128, 58), (70, 112, 72), (112, 138, 64)]
    base = np.array(GREENS[int(abs(x * 7.3 + y * 3.1)) % len(GREENS)], float)
    rgb = np.array(t["rgb"], float); rgb = np.clip(0.3 * rgb + 0.7 * base, 30, 220)
    trees.append([round(x, 2), round(y, 2), round(g_, 2), round(r, 2), round(h, 2), model, *[int(v) for v in rgb]])

# ---------- 9. empacotar ----------
allh = np.concatenate([ground.ravel(), dtop[dtop > -1e3], dbot[dbot > -1e3], bstrip[bstrip > -900]])
hmin = float(np.floor(allh.min())) - 1
def q16(a, none=None):
    out = np.clip(np.round((a - hmin) / 0.01), 1, 65535).astype(np.uint16)
    if none is not None: out[none] = 0
    return out
parts = [("ground", q16(ground)), ("dtop", q16(dtop, dtop < -1e3)), ("dbot", q16(dbot, dtop < -1e3)),
         ("bld", q16(bstrip, bstrip < -900)), ("type", tstrip)]
blob, layout, ofs = b"", {}, 0
for name, a in parts:
    by_ = a.tobytes(); layout[name] = {"ofs": ofs, "len": len(by_), "dtype": str(a.dtype), "shape": list(a.shape)}
    blob += by_; ofs += len(by_)
open("lp.bin.gz", "wb").write(gzip.compress(blob, 9))
tcount = {int(k): int(v) for k, v in zip(*np.unique(tstrip, return_counts=True))}
lp = {"hmin": hmin, "res": RES, "layout": layout, "deckT": DECK_T, "ribbons": ribbons, "pillars": pillars,
      "buildings": blds, "trees": trees, "types": {"1": "asphalt", "2": "sidewalk", "3": "plaza", "4": "grass", "5": "lot", "6": "mark white", "7": "mark yellow"}}
open("lp.json", "w", encoding="utf-8").write(json.dumps(lp, separators=(",", ":"), ensure_ascii=False))
import os
print("viaduto: largura %.1f m, estações %d..%d (+%d/%d de rampa final), rampas/passarelas %d, pilares %d" %
      (DW, i0, i1, len(ex_lo), len(ex_hi), len(ribbons) - 1, len(pillars)))
print("prédios", len(blds), "(esquadrejados do LiDAR:", nrect, "| com fachada medida no Mapillary:", nfac, ") árvores", len(trees))
print("tipos na faixa (px de 25 cm):", tcount)
print("lp.bin.gz %.2f MB, lp.json %.2f MB" % (os.path.getsize("lp.bin.gz") / 1e6, os.path.getsize("lp.json") / 1e6))
