# Etapa 4 / passo 71: estima parâmetros de fachada a partir das fotos do Mapillary (CC-BY-SA).
# Para cada prédio, pega a maior fachada voltada para a rua, escolhe a foto que olha para ela de frente
# (6–35 m, sem prédio no meio), retifica a parte BAIXA da fachada (térreo + até 4 andares, onde a foto é boa)
# e mede: cor dominante da parede, altura do andar, espaçamento das janelas, fração de vidro, loja no térreo.
# O resto do prédio é inferido (padrão repetido até a altura do LiDAR). Saídas: mly/selected.json, facades.json
import json, math, os, sys, numpy as np
from PIL import Image
from pyproj import Transformer
from scipy import ndimage as ndi
from scipy.spatial import cKDTree

lp = json.load(open("lp.json", encoding="utf-8")); meta = json.load(open("meta2.json"))
ox, oy, oz = meta["origin"]["x"], meta["origin"]["y"], meta["origin"]["z"]
S = np.load("strip.npz"); L2 = np.load("labels2.npz")
r0, c0 = int(S["r0"]), int(S["c0"]); X0, Y0 = float(S["X0"]), float(S["Y0"])
WX, WY = X0 + c0 - ox, Y0 + r0 - oy
top2, bid, dtm, gnd2 = L2["top"], L2["bid"], L2["dtm"].astype(float) - oz, L2["ground"]
Hh, Ww = top2.shape
T = Transformer.from_crs(4326, 31983, always_xy=True)
def cell(x, y):
    c, r = int(x - WX), int(y - WY)
    return (r, c) if 0 <= r < Hh and 0 <= c < Ww else None

# ---------- imagens ----------
imgs = [i for i in json.load(open("mly/images.json", encoding="utf-8")) if not i.get("is_pano")]
P, HD, meta_i = [], [], []
for i in imgs:
    g = (i.get("computed_geometry") or i["geometry"])["coordinates"]; x, y = T.transform(g[0], g[1])
    a = i.get("computed_compass_angle", i.get("compass_angle"))
    if a is None: continue
    P.append((x - ox, y - oy)); HD.append(a); meta_i.append(i)
P = np.array(P); HD = np.radians(np.array(HD)); kt = cKDTree(P)
year = np.array([time_y for time_y in (__import__("time").gmtime(i["captured_at"] / 1000).tm_year for i in meta_i)])

# ---------- fachada de rua de cada prédio + melhor foto ----------
STREET = {1, 2, 3, 4}  # rua, calçada, praça, gramado (camada de chão: ignora copa/marquise na frente)
def visible(px, py, cx, cy, own):
    d = math.hypot(cx - px, cy - py); n = int(d / 0.7)
    for k in range(1, n - 2):
        x = px + (cx - px) * k / n; y = py + (cy - py) * k / n; rc = cell(x, y)
        if rc is None: continue
        b = bid[rc]
        if b and b != own: return False
    return True
choice = []; nstreet = nfront = nvis = 0
for b in lp["buildings"]:
    pts = np.array(b["p"]); n = len(pts); best = None
    for k in range(n):
        a_, c_ = pts[k], pts[(k + 1) % n]; L = np.hypot(*(c_ - a_))
        if L < 4: continue
        nrm = np.array([(c_ - a_)[1], -(c_ - a_)[0]]) / L
        m = (a_ + c_) / 2
        hits = [cell(*(m + nrm * dd + (c_ - a_) / L * tt)) for dd in (2, 4, 6) for tt in (-L / 4, 0, L / 4)]
        hits = [h for h in hits if h is not None]
        if not hits or sum((gnd2[h] in STREET) and not bid[h] for h in hits) < len(hits) * 0.6: continue
        if best is None or L > best[2]: best = (a_, c_, L, nrm, m)
    if best is None: continue
    a_, c_, L, nrm, m = best; nstreet += 1
    cand = kt.query_ball_point(m, 35); sc = []
    for j in cand:
        v = m - P[j]; d = np.hypot(*v)
        if d < 6 or np.dot(P[j] - m, nrm) < 4: continue
        look = np.array([math.sin(HD[j]), math.cos(HD[j])])     # bússola: 0 = norte, horário
        ang_look = math.degrees(math.acos(np.clip(np.dot(look, v / d), -1, 1)))
        ang_obl = math.degrees(math.acos(np.clip(np.dot(-nrm, v / d), -1, 1)))
        f = (meta_i[j].get("camera_parameters") or [0.8])[0] or 0.8
        fish = meta_i[j].get("camera_type") == "fisheye"
        half_fov = math.degrees(0.5 / f) if fish else math.degrees(math.atan(0.5 / f))  # metade do campo horizontal
        if ang_look > half_fov - 6 or ang_obl > 72: continue
        sc.append((ang_look * 1.0 + ang_obl * 0.6 + abs(d - 15) * 0.8 - (year[j] - 2015) * 1.5, j, d))
    sc.sort(); nfront += bool(sc)
    cands = []
    for s_, j, d in sc[:12]:
        if visible(P[j][0], P[j][1], m[0], m[1], b["id"] if "id" in b else -1):
            cands.append({"img": meta_i[j]["id"], "cam": P[j].tolist(), "hd": float(math.degrees(HD[j])), "dist": round(float(d), 1),
                          "cp": meta_i[j].get("camera_parameters"), "ct": meta_i[j].get("camera_type"), "year": int(year[j])})
            if len(cands) == 4: break
    if cands:
        nvis += 1
        choice.append({"bid": b["id"], "edge": [a_.tolist(), c_.tolist()], "base": b["b"], "top": b["t"], "cands": cands})
json.dump(sorted({c["img"] for ch in choice for c in ch["cands"]}), open("mly/selected.json", "w"))
json.dump(choice, open("mly/choice.json", "w"))
print("fachada de rua:", nstreet, "| com foto apontando:", nfront, "| sem prédio no meio:", nvis)
print("prédios com fachada de rua e foto escolhida:", len(choice), "de", len(lp["buildings"]))
