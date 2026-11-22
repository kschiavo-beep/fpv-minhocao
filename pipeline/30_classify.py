# Etapa 1 / passo 30: classifica a faixa só com o LiDAR e separa árvores e prédios individuais.
# Entradas: dsm.npz, strip.npz, cells.npz
# Saídas: labels1.npz (tipo por célula, camada de chão, máscara do tabuleiro, DTM),
#         scene1.json (árvores, prédios, áreas por tipo), imagens em ../etapas/
import json, numpy as np
from scipy import ndimage as ndi
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from skimage.feature import peak_local_max
from skimage.segmentation import watershed
from skimage.measure import find_contours, approximate_polygon

TYPES = ["fora", "rua/asfalto", "calçada", "praça/canteiro", "gramado", "árvore (copa)", "prédio",
         "tabuleiro do viaduto", "outros"]
OUT, ROAD, WALK, PLAZA, GRASS, TREE, BLDG, DECK, OTHER = range(9)

S = np.load("strip.npz"); C = np.load("cells.npz"); D = np.load("dsm.npz")
r0, r1, c0, c1 = (int(S[k]) for k in ("r0", "r1", "c0", "c1")); X0, Y0 = float(S["X0"]), float(S["Y0"])
ins = S["inside"]; t = S["t"]; CL = list(C["CL"]); I = CL.index
n, zmax, zmin, zmean, imean, rgbc = C["n"], C["zmax"], C["zmin"], C["zmean"], C["imean"], C["rgb"]
ortho = D["rgb"][r0:r1, c0:c1].copy()
H, W = ins.shape

# ---------- chão (DTM) por convolução normalizada ----------
gn = (n[I(2)] + n[I(20)]).astype(float)
zg = (zmean[I(2)] * n[I(2)] + zmean[I(20)] * n[I(20)]) / np.maximum(gn, 1)
has = gn > 0
def nconv(v, w, s):
    return ndi.gaussian_filter(v * w, s) / np.maximum(ndi.gaussian_filter(w, s), 1e-6), ndi.gaussian_filter(w, s)
w = has.astype(float)
dtm = np.where(has, zg, 0.0)
for s in (2, 5, 12, 30):
    f, wf = nconv(np.where(has, zg, 0), w, s)
    hole = ~has if s == 2 else hole
    fill = hole & (wf > 0.02)
    dtm[fill] = f[fill]; hole = hole & ~fill
dtm[hole] = np.nanmedian(zg[has])
dtm = np.where(has, ndi.gaussian_filter(dtm, 0.7), dtm)

def hab(ci):
    return np.where(n[ci] > 0, zmax[ci] - dtm, -99)
h5, h6, h9, h19 = hab(I(5)), hab(I(6)), hab(I(9)), hab(I(19))

# ---------- tabuleiro do viaduto (classe 9) ----------
deck0 = (n[I(9)] > 0) & (h9 > 0.8)
deck0 = ndi.binary_closing(deck0, np.ones((3, 3)), iterations=2) & (ndi.binary_dilation(n[I(9)] > 0, np.ones((5, 5))))
lab, nl = ndi.label(deck0)
keep = np.zeros(nl + 1, bool)
near_axis = ndi.maximum(np.abs(t) < 6, lab, range(nl + 1)).astype(bool)
area = ndi.sum(np.ones_like(lab), lab, range(nl + 1))
keep[(near_axis) | (area > 300)] = True; keep[0] = False
deck = keep[lab]
deck = ndi.binary_fill_holes(deck)
# cota do topo do tabuleiro (preenche buracos com vizinhos)
dz = np.where(n[I(9)] > 0, zmax[I(9)], np.nan)
_, (ia, ja) = ndi.distance_transform_edt(np.isnan(dz), return_indices=True)
deck_top = ndi.median_filter(dz[ia, ja], 3)

# ---------- prédios e árvores (camada de cima) ----------
top5 = np.where(n[I(5)] > 0, zmax[I(5)], -1e9); top6 = np.where(n[I(6)] > 0, zmax[I(6)], -1e9)
bldg = (n[I(6)] >= 3) & (h6 > 2.5) & (top6 >= top5 - 0.3)
bldg = ndi.binary_opening(bldg, np.ones((2, 2)))
bldg = ndi.binary_fill_holes(bldg) & ~(deck & (np.where(deck, deck_top, 0) >= top6 - 0.5))
tree = (n[I(5)] >= 2) & (h5 > 2.0) & ~bldg & ((~deck) | (top5 > deck_top + 1.5))
tree = ndi.binary_opening(tree, np.ones((2, 2))) | (tree & (n[I(5)] >= 6))
other = (n[I(19)] > 0) & (h19 > 3.0) & ~bldg & ~tree & ~deck

# ---------- tipos de chão ----------
# altura relativa = resíduo de um plano local de 15 m (independe da ladeira): calçada fica ~+0,15 m acima da rua
yy, xx = np.mgrid[0:H, 0:W].astype(float)
def plane_residual(z, w, size):
    U = lambda a: ndi.uniform_filter(a, size)
    zc = np.where(w > 0, z, 0); m = U(w) + 1e-9
    mx, my, mz = U(w * xx) / m, U(w * yy) / m, U(w * zc) / m
    sxx = U(w * xx * xx) / m - mx * mx; syy = U(w * yy * yy) / m - my * my; sxy = U(w * xx * yy) / m - mx * my
    sxz = U(w * xx * zc) / m - mx * mz; syz = U(w * yy * zc) / m - my * mz
    det = sxx * syy - sxy ** 2 + 1e-9
    b = (sxz * syy - syz * sxy) / det; c = (syz * sxx - sxz * sxy) / det
    return z - (mz + b * (xx - mx) + c * (yy - my))
rel = plane_residual(zg, has.astype(float), 15)
rel = np.where(has, rel, 0)
rel = ndi.median_filter(rel, 3)
g = ortho.astype(float)
gex = g[..., 1] - (g[..., 0] + g[..., 2]) / 2
it = (imean[I(2)] * n[I(2)] + imean[I(20)] * n[I(20)]) / np.maximum(gn, 1)
it = np.where(has, it, np.nan)
cars = ndi.uniform_filter(((n[I(19)] > 0) & (h19 > 0.8) & (h19 < 2.6)).astype(float), 5)
dbld = ndi.distance_transform_edt(~bldg)
grass = ndi.median_filter((gex > 9) & (h5 < 1.0), 3)
walk = (rel > 0.05) | (dbld <= 1.5)
walk &= ~(cars > 0.35)
walk = ndi.median_filter(walk, 5)
lab, nl = ndi.label(~walk)
small = ndi.sum(np.ones_like(lab), lab, range(nl + 1)) < 40
walk |= small[lab] & (lab > 0)
lab, nl = ndi.label(walk)
small = ndi.sum(np.ones_like(lab), lab, range(nl + 1)) < 10
walk &= ~(small[lab] & (lab > 0))
ground = np.where(walk, WALK, ROAD)
ground = np.where(walk & (dbld > 7) & ~(cars > 0.15), PLAZA, ground)
ground = np.where(grass, GRASS, ground)
# canteiros: piso não-rua coberto por copa e longe de prédio vira praça/canteiro
ground = np.where((ground == WALK) & tree & (dbld > 4), PLAZA, ground)
# onde não há medida de chão (sob tabuleiro/copa), herda do vizinho medido
_, (ia, ja) = ndi.distance_transform_edt(~(has & ~bldg), return_indices=True)
ground = np.where(has & ~bldg, ground, ground[ia, ja])

top = ground.copy()
top[other] = OTHER; top[tree] = TREE; top[deck & ~((tree) & (top5 > deck_top + 1.5))] = DECK; top[bldg] = BLDG
top[~ins] = OUT; ground[~ins] = OUT

# ---------- árvores individuais ----------
chm = ndi.gaussian_filter(np.where(tree, h5, 0), 1.0)
pk = peak_local_max(chm, min_distance=3, threshold_abs=3.0, labels=(tree & ins).astype(int), exclude_border=False)
mk = np.zeros((H, W), int); mk[tuple(pk.T)] = np.arange(1, len(pk) + 1)
seg = watershed(-chm, mk, mask=tree & ins)
trees = []
idx = np.arange(1, len(pk) + 1)
areas = ndi.sum(np.ones_like(seg), seg, idx)
cy, cx = np.array(ndi.center_of_mass(np.ones_like(seg), seg, idx)).T if len(idx) else ([], [])
hmaxs = ndi.maximum(np.where(tree, h5, 0), seg, idx)
cols = [ndi.mean(rgbc[I(5)][..., k].astype(float), seg, idx) for k in range(3)]
for i in range(len(idx)):
    if areas[i] < 3: continue
    trees.append({"x": round(X0 + c0 + cx[i] + .5, 2), "y": round(Y0 + r0 + cy[i] + .5, 2),
                  "z": round(float(dtm[int(cy[i]), int(cx[i])]), 2), "r": round(float(np.sqrt(areas[i] / np.pi)), 2),
                  "h": round(float(hmaxs[i]), 2), "rgb": [int(cols[k][i]) for k in range(3)]})

# ---------- prédios individuais (divididos por diferença de altura) ----------
hb = np.where(bldg, ndi.median_filter(np.where(bldg, h6, 0), 3), 0)
hb = np.where(bldg & (hb < 2.5), h6, hb)
ids = -np.ones((H, W), int); cells = np.flatnonzero(bldg & ins); ids.ravel()[cells] = np.arange(len(cells))
rows, colsE = [], []
for dr, dc in ((0, 1), (1, 0)):
    a = ids[:H - dr, :W - dc]; b = ids[dr:, dc:]
    ha = hb[:H - dr, :W - dc]; hb2 = hb[dr:, dc:]
    m = (a >= 0) & (b >= 0) & (np.abs(ha - hb2) < 2.0)
    rows.append(a[m]); colsE.append(b[m])
rows = np.concatenate(rows); colsE = np.concatenate(colsE)
G = coo_matrix((np.ones(len(rows)), (rows, colsE)), shape=(len(cells), len(cells)))
ncomp, cl = connected_components(G, directed=False)
blab = np.zeros((H, W), int); blab.ravel()[cells] = cl + 1
sz = np.bincount(blab.ravel(), minlength=ncomp + 1)
tiny = (sz < 15); tiny[0] = False
big = (blab > 0) & ~tiny[blab]
_, (ia, ja) = ndi.distance_transform_edt(~big, return_indices=True)
blab = np.where((blab > 0) & tiny[blab], blab[ia, ja], blab)
uniq = np.unique(blab[blab > 0]); remap = np.zeros(blab.max() + 1, int); remap[uniq] = np.arange(1, len(uniq) + 1)
blab = remap[blab]
buildings = []
objs = ndi.find_objects(blab)
for i, sl in enumerate(objs, 1):
    if sl is None: continue
    m = blab[sl] == i; a = int(m.sum())
    if a < 15: continue
    hh = hb[sl][m]; col = np.median(rgbc[I(6)][sl][m], 0)
    pad = np.pad(m, 1).astype(float)
    cs = find_contours(pad, 0.5)
    if not cs: continue
    cmax = max(cs, key=len); poly = approximate_polygon(cmax, 0.9)
    pts = [[round(X0 + c0 + sl[1].start + p[1] - 1 + .5, 2), round(Y0 + r0 + sl[0].start + p[0] - 1 + .5, 2)] for p in poly[:-1]]
    if len(pts) < 3: continue
    rr, cc_ = np.nonzero(m)
    buildings.append({"id": i, "area": a, "h": round(float(np.percentile(hh, 90)), 2), "h50": round(float(np.median(hh)), 2),
                      "base": round(float(np.median(dtm[sl][m])), 2), "rgb": [int(v) for v in col], "poly": pts,
                      "floors_est": int(max(1, round(np.percentile(hh, 90) / 3.0)))})

areas_t = {TYPES[k]: int((top == k).sum()) for k in range(1, 9)}
areas_g = {TYPES[k]: int((ground == k).sum()) for k in range(1, 5)}
np.savez_compressed("labels1.npz", top=top.astype(np.uint8), ground=ground.astype(np.uint8), deck=deck & ins,
                    deck_top=deck_top.astype(np.float32), dtm=dtm.astype(np.float32), blab=blab.astype(np.int32),
                    tseg=seg.astype(np.int32), has_ground=has)
json.dump({"crs": "EPSG:31983", "types": TYPES, "area_m2_top": areas_t, "area_m2_ground": areas_g,
           "trees": trees, "buildings": buildings}, open("scene1.json", "w", encoding="utf-8"), ensure_ascii=False)
print("árvores", len(trees), "prédios", len(buildings))
print("área por tipo (vista de cima, m²):", areas_t)
print("chão por baixo de tudo (m²):", areas_g)
print("tabuleiro sem copa por cima (m²):", int((top == DECK).sum()), " tabuleiro total:", int((deck & ins).sum()))
hs = np.array([b["h"] for b in buildings]); rs = np.array([t_["r"] for t_ in trees]); ht = np.array([t_["h"] for t_ in trees])
print("prédios: altura p10/50/90/max", np.percentile(hs, [10, 50, 90, 100]).round(1), " área mediana", int(np.median([b['area'] for b in buildings])))
print("árvores: raio p10/50/90", np.percentile(rs, [10, 50, 90]).round(1), " altura p10/50/90", np.percentile(ht, [10, 50, 90]).round(1))
