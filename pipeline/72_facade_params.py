# Etapa 4 / passo 72: projeta a fachada escolhida na foto do Mapillary, retifica a faixa BAIXA (até ~16 m,
# onde a foto tem resolução) e mede os parâmetros que viram fachada N64. Saídas: facades.json, debug/fachadas.png
import json, math, os, numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

meta = json.load(open("meta2.json")); oz = meta["origin"]["z"]
S = np.load("strip.npz"); L2 = np.load("labels2.npz")
X0, Y0 = float(S["X0"]), float(S["Y0"]); WX, WY = X0 + int(S["c0"]) - meta["origin"]["x"], Y0 + int(S["r0"]) - meta["origin"]["y"]
dtm, deck, dtop = L2["dtm"].astype(float) - oz, L2["deck"], L2["deck_top"].astype(float) - oz
H_, W_ = dtm.shape
def at(a, x, y):
    c, r = int(np.clip(x - WX, 0, W_ - 1)), int(np.clip(y - WY, 0, H_ - 1)); return a[r, c]
PXM = 12  # px por metro na fachada retificada
from scipy.spatial.transform import Rotation as _Rot
ROT = json.load(open("mly/rot.json")) if os.path.exists("mly/rot.json") else {}   # orientação completa (OpenSfM, mundo->câmera)
choice = json.load(open("mly/choice.json"))
out, dbg = {}, []

def acf_peak(p, lo, hi):
    p = p - ndi.uniform_filter1d(p, max(3, int(hi * 1.5))); p = p - p.mean()
    if len(p) < hi * 2 or p.std() < 1e-6: return None, 0
    a = np.correlate(p, p, "full")[len(p) - 1:]; a /= a[0]
    lag = lo + int(np.argmax(a[lo:hi + 1])); return lag, float(a[lag])
def kmeans(X, k=4, it=12, seed=0):
    rng = np.random.default_rng(seed); C = X[rng.choice(len(X), k, replace=False)].astype(float)
    for _ in range(it):
        lab = np.argmin(((X[:, None, :] - C[None]) ** 2).sum(-1), 1)
        for j in range(k):
            if (lab == j).any(): C[j] = X[lab == j].mean(0)
    return C, np.bincount(lab, minlength=k)

def sample_facade(im, cand, edge, street, zhi):
    """Retifica a fachada pixel a pixel: ponto da fachada -> modelo de câmera do Mapillary (OpenSfM) -> pixel."""
    A = np.asarray(im).astype(float); Ht, Wt = A.shape[:2]; mx = max(Wt, Ht)
    cp = cand["cp"] or [0.8, 0, 0]; f, k1, k2 = (list(cp) + [0, 0])[:3]
    cx, cy = cand["cam"]; hd = math.radians(cand["hd"]); hv = np.array([math.sin(hd), math.cos(hd)]); rv = np.array([math.cos(hd), -math.sin(hd)])
    on_deck = bool(at(deck, cx, cy)); zc = (at(dtop, cx, cy) + 1.7) if on_deck else (at(dtm, cx, cy) + 2.2)
    (ax, ay), (bx, by) = edge; Lm = math.hypot(bx - ax, by - ay); hm = zhi - street
    ow, oh = max(8, int(Lm * PXM)), max(8, int(hm * PXM))
    u = (np.arange(ow) + .5) / ow; z = zhi - (np.arange(oh) + .5) / PXM
    X = ax + (bx - ax) * u[None, :]; Y = ay + (by - ay) * u[None, :]; Z = np.broadcast_to(z[:, None], (oh, ow))
    dx, dy = np.broadcast_to(X - cx, (oh, ow)), np.broadcast_to(Y - cy, (oh, ow)); zr = Z - zc
    if cand["img"] in ROT:      # usa rumo + inclinação + giro reconstruídos (câmera: x direita, y baixo, z frente)
        Rm = _Rot.from_rotvec(ROT[cand["img"]]).as_matrix()
        pc = np.einsum("ij,jhw->ihw", Rm, np.stack([dx, dy, zr]))
        dep = pc[2]; xn, yn = pc[0] / np.maximum(dep, 1e-3), pc[1] / np.maximum(dep, 1e-3)
    else:
        dep = dx * hv[0] + dy * hv[1]; xr = dx * rv[0] + dy * rv[1]
        xn, yn = xr / np.maximum(dep, 1e-3), -zr / np.maximum(dep, 1e-3)
    if cand["ct"] == "fisheye":
        rr = np.hypot(xn, yn); th = np.arctan(rr); d = th * (1 + k1 * th ** 2 + k2 * th ** 4) / np.maximum(rr, 1e-9)
    else:
        r2 = xn ** 2 + yn ** 2; d = 1 + k1 * r2 + k2 * r2 ** 2
    px = Wt / 2 + f * mx * xn * d; py = Ht / 2 + f * mx * yn * d
    M = (dep > 1) & (px >= 0) & (px < Wt - 1) & (py >= 0) & (py < Ht - 1)
    RGB = np.stack([ndi.map_coordinates(A[..., c], [py, px], order=1, mode="nearest") for c in range(3)], -1)
    corners = [(px[i, j], py[i, j]) for i, j in ((oh - 1, 0), (oh - 1, ow - 1), (0, ow - 1), (0, 0))]
    return RGB, M, Lm, oh, on_deck, corners

def measure(RGB, M, Lm, oh):
    lum = RGB.mean(-1); sky = (RGB[..., 2] > RGB[..., 0] + 12) & (lum > 140) | (lum > 235)
    green = (RGB[..., 1] > RGB[..., 0] + 10) & (RGB[..., 1] > RGB[..., 2] + 4)
    cov = M.mean(); fsky = (sky & M).sum() / max(1, M.sum()); fgreen = (green & M).sum() / max(1, M.sum())
    M = M & ~sky & ~green
    zrow = (oh - np.arange(oh)) / PXM
    up = M & (zrow[:, None] > 3.6); gf = M & (zrow[:, None] > 0.4) & (zrow[:, None] < 3.4)
    if up.sum() < 300: up = M & (zrow[:, None] > 0.4)
    if up.sum() < 150: return None, -1
    contrast = float(lum[up].std())
    loc = ndi.uniform_filter(lum, 5); locsd = np.sqrt(np.maximum(ndi.uniform_filter(lum ** 2, 5) - loc ** 2, 0))
    flat = float(((locsd < 3.0) & up).sum() / max(1, up.sum()))
    q = cov * 2 - fsky * 3 - fgreen * 2 + min(contrast, 40) / 40
    X = RGB[up][:: max(1, up.sum() // 4000)]; C, cnt = kmeans(X, 4)
    order = np.argsort(-cnt); Clum = C.mean(1)
    wall_k = next((k for k in order if Clum[k] > 70), order[0]); wall = C[wall_k]; wl = wall.mean()
    glass = float(((lum < 0.62 * wl) & up).sum() / max(1, up.sum()))
    gy = np.abs(np.diff(lum, axis=0)); mm = up[1:] & up[:-1]; rowp = np.where(mm, gy, 0).sum(1) / np.maximum(1, mm.sum(1))
    fl_lag, fl_q = acf_peak(rowp, int(2.6 * PXM), int(4.2 * PXM))
    gx = np.abs(np.diff(lum, axis=1)); mm = up[:, 1:] & up[:, :-1]; colp = np.where(mm, gx, 0).sum(0) / np.maximum(1, mm.sum(0))
    wn_lag, wn_q = acf_peak(colp, int(1.4 * PXM), int(min(6.0, Lm / 2) * PXM)) if Lm > 4 else (None, 0)
    shop = False
    if gf.sum() > 200:
        g_mean = RGB[gf].mean(0); shop = bool(np.abs(g_mean - wall).mean() > 28)
    r = {"wall": [int(v) for v in np.clip(wall, 0, 255)], "glass": round(glass, 2),
         "floorH": round(fl_lag / PXM, 2) if fl_lag and fl_q > 0.12 else 3.0, "floor_q": round(fl_q, 2),
         "winSp": round(wn_lag / PXM, 2) if wn_lag and wn_q > 0.12 else None, "win_q": round(wn_q, 2), "shop": shop,
         "q": round(q, 2), "flat": round(flat, 2), "sky": round(fsky, 2), "green": round(fgreen, 2), "cov": round(cov, 2)}
    return r, q

for ch in choice:
    street = ch["base"] + 0.4; zhi = min(ch["top"], street + 16.0)
    if zhi - street < 2.5: continue
    res = []
    for cand in ch["cands"]:
        fn = f"mly/img/{cand['img']}.jpg"
        if not os.path.exists(fn): continue
        im = Image.open(fn).convert("RGB")
        RGB, M, Lm, oh, on_deck, corners = sample_facade(im, cand, ch["edge"], street, zhi)
        r, q = measure(RGB, M, Lm, oh)
        if r is None or r["flat"] > 0.5 or r["cov"] < 0.5: continue
        tall = ch["top"] - street > 35
        if r["glass"] > 0.6 and not tall: continue         # escuro demais: sombra do viaduto/fundo de laje, não vidro
        res.append((r, q, cand, im, RGB, M, corners, on_deck))
    if not res: continue
    # consenso: duas fotos com cor de parede parecida -> confiança alta
    best, conf = max(res, key=lambda t: t[1]), "media" if len(res) == 1 else "baixa"
    if len(res) >= 2:
        pairs = [(np.abs(np.array(a[0]["wall"]) - np.array(b_[0]["wall"])).mean(), a, b_) for i, a in enumerate(res) for b_ in res[i + 1:]]
        dmin, a, b_ = min(pairs, key=lambda t: t[0])
        if dmin < 30:
            best = a if a[1] >= b_[1] else b_; conf = "alta"
            best[0]["wall"] = [int((x + y) / 2) for x, y in zip(a[0]["wall"], b_[0]["wall"])]
    r, q, cand, im, RGB, M, corners, on_deck = best
    r.update({"img": cand["img"], "year": cand["year"], "dist": cand["dist"], "on_deck": on_deck, "conf": conf, "n_fotos": len(res)})
    out[str(ch["bid"])] = r
    R = Image.fromarray(np.where(M[..., None], RGB, 0).astype(np.uint8))
    dbg.append((ch, im, R, corners, r))
json.dump(out, open("facades.json", "w"), indent=0)
fq = [v["floor_q"] for v in out.values()]; wq = [v["win_q"] for v in out.values()]
from collections import Counter
print("confiança:", Counter(v["conf"] for v in out.values()))
print("fachadas medidas:", len(out), "| andar com periodicidade clara:", sum(q > 0.12 for q in fq), "| janelas:", sum(q > 0.12 for q in wq),
      "| loja no térreo:", sum(v["shop"] for v in out.values()), "| vidro médio: %.2f" % np.mean([v["glass"] for v in out.values()]))

# prancha de conferência: foto com o contorno projetado + faixa retificada + amostra de cor
F = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 14)
sel = dbg[:: max(1, len(dbg) // 18)][:18]
sheet = Image.new("RGB", (3 * 520, 6 * 230), (15, 17, 22)); ds = ImageDraw.Draw(sheet)
for k, (ch, im, R, quad, v) in enumerate(sel):
    x0, y0 = (k % 3) * 520, (k // 3) * 230
    t = im.copy(); d = ImageDraw.Draw(t); d.polygon([tuple(p) for p in quad], outline=(255, 0, 255), width=4)
    t.thumbnail((300, 220)); sheet.paste(t, (x0 + 5, y0 + 5))
    r = R.convert("RGB"); r.thumbnail((150, 150)); sheet.paste(r, (x0 + 310, y0 + 5))
    ds.rectangle((x0 + 470, y0 + 5, x0 + 510, y0 + 45), fill=tuple(v["wall"]))
    ds.text((x0 + 310, y0 + 160), f"bid {ch['bid']} · {v['floorH']} m/andar · jan {v['winSp']} m\nvidro {v['glass']} · loja {v['shop']} · {v['conf']} · {v['year']}", font=F, fill="white")
sheet.save("debug/fachadas.png")
