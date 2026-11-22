# Etapa 2 / passo 50: cruza a classificação da Etapa 1 (LiDAR) com GeoSampa e OpenStreetMap.
# Regras: o LiDAR decide o que existe hoje (alturas, copas, tabuleiro); GeoSampa/OSM dão o desenho
# (contorno de prédio, calçada, quadra = limite da via pública, praças).
# Saídas: labels2.npz, scene2.json, ../etapas/02-*.png
import json, os, numpy as np
from PIL import Image, ImageDraw, ImageFont
from pyproj import Transformer
from scipy import ndimage as ndi
from skimage.measure import find_contours, approximate_polygon

S = np.load("strip.npz"); L1 = np.load("labels1.npz"); C = np.load("cells.npz"); D = np.load("dsm.npz")
J1 = json.load(open("scene1.json", encoding="utf-8"))
r0, r1, c0, c1 = (int(S[k]) for k in ("r0", "r1", "c0", "c1")); X0, Y0 = float(S["X0"]), float(S["Y0"])
ins = S["inside"]; H, W = ins.shape
top1, ground1, deck, dtm, blab1 = L1["top"], L1["ground"], L1["deck"], L1["dtm"], L1["blab"]
CL = list(C["CL"]); I = CL.index; n, zmax, rgbc = C["n"], C["zmax"], C["rgb"]
OUT, ROAD, WALK, PLAZA, GRASS, TREE, BLDG, DECK, OTHER = range(9)
TYPES = J1["types"]
ox, oy = X0 + c0, Y0 + r0
T = Transformer.from_crs(4326, 31983, always_xy=True)

# ---------- leitura das fontes ----------
def gj(name):
    p = f"geosampa/{name}.geojson"
    return json.load(open(p, encoding="utf-8"))["features"] if os.path.exists(p) else []
def rings_of(geom):  # -> lista de polígonos, cada um [anel externo, buracos...]
    t, c = geom["type"], geom["coordinates"]
    if t == "Polygon": return [c]
    if t == "MultiPolygon": return list(c)
    return []
osm = json.load(open("osm.json", encoding="utf-8"))["elements"]
def osm_xy(geom): return [T.transform(p["lon"], p["lat"]) for p in geom]
def osm_polys(e):
    if e["type"] == "way" and "geometry" in e:
        g = osm_xy(e["geometry"]); return [[g]] if len(g) >= 3 else []
    if e["type"] == "relation":
        outs = [osm_xy(m["geometry"]) for m in e.get("members", []) if m.get("role") == "outer" and "geometry" in m]
        inns = [osm_xy(m["geometry"]) for m in e.get("members", []) if m.get("role") == "inner" and "geometry" in m]
        return [[o] + inns for o in outs if len(o) >= 3]
    return []

def px(pts): return [(x - ox - .5, y - oy - .5) for x, y, *_ in pts]
def raster(polys, mode="1", values=None):
    im = Image.new("I" if mode == "I" else "L", (W, H), 0); d = ImageDraw.Draw(im)
    for k, poly in enumerate(polys):
        v = values[k] if values is not None else 1
        d.polygon(px(poly[0]), fill=v)
        for hole in poly[1:]: d.polygon(px(hole), fill=0)
    a = np.array(im); return a if mode == "I" else a > 0
def raster_lines(lines, widths):
    im = Image.new("L", (W, H), 0); d = ImageDraw.Draw(im)
    for ln, w in zip(lines, widths): d.line(px(ln), fill=1, width=max(1, int(round(w))), joint="curve")
    return np.array(im) > 0

quadra = raster([p for f in gj("quadra_viaria_editada") for p in rings_of(f["geometry"])])
calc = raster([p for f in gj("calcada") for p in rings_of(f["geometry"])])
praca_gs = raster([p for f in gj("GEOSAMPA_v_praca_largo") for p in rings_of(f["geometry"])])
park_osm = raster([p for e in osm if (e.get("tags", {}).get("leisure") in ("park", "garden", "playground", "pitch")
                    or e.get("tags", {}).get("place") == "square" or e.get("tags", {}).get("highway") == "pedestrian"
                    and e.get("tags", {}).get("area") == "yes") for p in osm_polys(e)])
grass_osm = raster([p for e in osm if e.get("tags", {}).get("landuse") == "grass" or e.get("tags", {}).get("natural") == "grass"
                    for p in osm_polys(e)])
park = praca_gs | park_osm

# vias de carro do OSM (linhas, para faixas pintadas na Etapa 3)
CAR = {"motorway", "trunk", "primary", "secondary", "tertiary", "residential", "unclassified", "living_street",
       "trunk_link", "primary_link", "secondary_link", "tertiary_link", "busway", "service"}
roads = []
for e in osm:
    t = e.get("tags", {})
    if e["type"] == "way" and t.get("highway") in CAR and "geometry" in e:
        xy = osm_xy(e["geometry"])
        roads.append({"hw": t["highway"], "name": t.get("name"), "lanes": int(t["lanes"]) if t.get("lanes", "").isdigit() else None,
                      "oneway": t.get("oneway") == "yes", "bridge": t.get("bridge") in ("yes", "viaduct"), "layer": t.get("layer"),
                      "pts": [[round(x, 2), round(y, 2)] for x, y in xy]})
bridge_lines = [r for r in roads if r["bridge"]]
deck_osm = raster_lines([r["pts"] for r in bridge_lines], [(r["lanes"] or 2) * 3.3 + 1.5 for r in bridge_lines])

# ---------- chão (camada de baixo de tudo) ----------
row = ~quadra                         # fora das quadras = via pública
lidar_walk = ground1 == WALK
g = ndi.gaussian_filter(D["rgb"][r0:r1, c0:c1].astype(float), (1, 1, 0))
gex = g[..., 1] - (g[..., 0] + g[..., 2]) / 2
grass_lidar = (gex > 9) & np.isin(top1, [ROAD, WALK, PLAZA, GRASS])  # só chão visível (não copa, não prédio)
ground2 = np.full((H, W), ROAD, np.uint8)
ground2[row & park] = PLAZA
ground2[row & park & (grass_lidar | grass_osm)] = GRASS
ground2[row & ~park & ~calc & grass_lidar & (ndi.binary_opening(grass_lidar, np.ones((3, 3))))] = GRASS  # canteiros gramados
lot = quadra
ground2[lot] = OTHER                                   # pátio/área livre dentro do lote
ground2[lot & park] = PLAZA
ground2[lot & (grass_lidar | grass_osm)] = GRASS
ground2[calc & ~park] = WALK   # a quadra viária vai até a guia: a calçada do GeoSampa fica dentro dela
ground2[~ins] = OUT

# ---------- prédios ----------
bl_lidar = (top1 == BLDG) | (blab1 > 0)
gs_feats = [f for f in gj("edificacao") if f.get("geometry")]
gs_polys = [rings_of(f["geometry"]) for f in gs_feats]
flat, owner = [], []
for i, ps in enumerate(gs_polys):
    for p in ps: flat.append(p); owner.append(i + 1)
gs_id = raster(flat, "I", owner)
# andares do OSM (raros): por sobreposição
osm_b = [(e, osm_polys(e)) for e in osm if "building" in e.get("tags", {})]
osm_lv_id = raster([p for e, ps in osm_b for p in ps], "I", [k + 1 for k, (e, ps) in enumerate(osm_b) for p in ps])
h6 = np.where(n[I(6)] > 0, zmax[I(6)] - dtm, 0)
hb = np.where(bl_lidar, ndi.median_filter(np.where(bl_lidar, h6, 0), 3), 0)
roof_rgb = rgbc[I(6)]

def poly_from_mask(m, sl):
    pad = np.pad(m, 1).astype(float); cs = find_contours(pad, 0.5)
    if not cs: return None
    cm = approximate_polygon(max(cs, key=len), 0.8)
    pts = [[round(ox + sl[1].start + p[1] - 1 + .5, 2), round(oy + sl[0].start + p[0] - 1 + .5, 2)] for p in cm[:-1]]
    return pts if len(pts) >= 3 else None

buildings, dropped, new_b, split_n = [], [], [], 0
bl_final = np.zeros((H, W), np.int32); nid = 0
objs = ndi.find_objects(gs_id)
for i, sl in enumerate(objs, 1):
    if sl is None: continue
    m = gs_id[sl] == i; a = int(m.sum())
    if a < 6 or not (ins[sl] & m).any(): continue
    frac = float((bl_lidar[sl] & m).sum()) / a
    gsh = gs_feats[i - 1]["properties"].get("qt_altura_edificacao")
    if frac < 0.35:
        dropped.append({"gs": i, "area": a, "frac_lidar": round(frac, 2), "gs_h": gsh}); continue
    hh = hb[sl][m & bl_lidar[sl]]; hp = float(np.percentile(hh, 90)) if len(hh) else (gsh or 6.0)
    # partes com altura bem diferente (pela segmentação LiDAR da Etapa 1) viram blocos separados
    parts = []
    sub = blab1[sl] * (m & bl_lidar[sl])
    ids, cnt = np.unique(sub[sub > 0], return_counts=True)
    big = [(j, c) for j, c in zip(ids, cnt) if c >= 40]
    if len(big) >= 2:
        hs = [float(np.percentile(hb[sl][sub == j], 90)) for j, _ in big]
        if max(hs) - min(hs) > 3.0:
            _, (ia, ja) = ndi.distance_transform_edt(~np.isin(sub, [j for j, _ in big]), return_indices=True)
            lab = np.where(m, sub[ia, ja], 0)
            for j, _ in big: parts.append(lab == j)
    if not parts: parts = [m]
    else: split_n += 1
    lv = None
    o = osm_lv_id[sl][m]; o = o[o > 0]
    if len(o):
        e = osm_b[np.bincount(o).argmax() - 1][0]["tags"]; lv = e.get("building:levels")
    for pm in parts:
        if pm.sum() < 6: continue
        poly = gs_polys[i - 1][0][0] if len(parts) == 1 and len(gs_polys[i - 1]) == 1 else poly_from_mask(pm, sl)
        if poly is None: continue
        if len(parts) == 1: poly = [[round(x, 2), round(y, 2)] for x, y, *_ in poly[:-1]]
        hh = hb[sl][pm & bl_lidar[sl]]
        hp = float(np.percentile(hh, 90)) if len(hh) >= 3 else hp
        col = np.median(roof_rgb[sl][pm & (n[I(6)][sl] > 0)], 0) if (pm & (n[I(6)][sl] > 0)).any() else np.array([150, 150, 150])
        nid += 1; bl_final[sl][pm] = nid
        buildings.append({"id": nid, "src": "geosampa" + ("+lidar-split" if len(parts) > 1 else ""), "gs": i,
                          "area": int(pm.sum()), "h": round(hp, 2), "gs_h": gsh, "base": round(float(np.median(dtm[sl][pm])), 2),
                          "rgb": [int(v) for v in col], "levels_osm": lv, "poly": poly})
# prédios que o LiDAR vê e o GeoSampa não tem (novos)
cover = ndi.binary_dilation(gs_id > 0, np.ones((3, 3)))
lid_only = bl_lidar & ~cover & ins
lab, nl = ndi.label(lid_only)
for k, sl in enumerate(ndi.find_objects(lab), 1):
    m = lab[sl] == k
    if m.sum() < 30 or np.percentile(hb[sl][m], 90) < 3: continue
    poly = poly_from_mask(m, sl)
    if poly is None: continue
    col = np.median(roof_rgb[sl][m & (n[I(6)][sl] > 0)], 0) if (m & (n[I(6)][sl] > 0)).any() else np.array([150, 150, 150])
    nid += 1; bl_final[sl][m] = nid
    b = {"id": nid, "src": "lidar", "gs": None, "area": int(m.sum()), "h": round(float(np.percentile(hb[sl][m], 90)), 2), "gs_h": None,
         "base": round(float(np.median(dtm[sl][m])), 2), "rgb": [int(v) for v in col], "levels_osm": None, "poly": poly}
    buildings.append(b); new_b.append(b)
for b in buildings: b["floors_est"] = int(b["levels_osm"]) if (b["levels_osm"] or "").isdigit() else max(1, round(b["h"] / 3.0))

# ---------- árvores: LiDAR x inventário do GeoSampa ----------
inv = [f["geometry"]["coordinates"][:2] for f in gj("arvore") if f.get("geometry")]
inv = np.array(inv) if inv else np.zeros((0, 2))
inv_in = np.array([ins[int(y - oy), int(x - ox)] if 0 <= int(y - oy) < H and 0 <= int(x - ox) < W else False for x, y in inv], bool) if len(inv) else np.zeros(0, bool)
from scipy.spatial import cKDTree
trees = [dict(t, src="lidar") for t in J1["trees"]]
tp = np.array([[t["x"], t["y"]] for t in trees]); matched_inv = np.zeros(len(inv), bool)
if len(inv) and len(tp):
    kt = cKDTree(inv)
    for t in trees:
        ids = kt.query_ball_point([t["x"], t["y"]], max(t["r"], 2.5))
        t["inventario"] = len(ids); matched_inv[ids] = True
added = 0
veg_any = ndi.binary_dilation(n[I(5)] > 0, np.ones((5, 5)))
for (x, y), m_, ii in zip(inv, matched_inv, inv_in):
    if m_ or not ii: continue
    r_, c_ = int(y - oy), int(x - ox)
    if bl_final[r_, c_] or deck[r_, c_] or not veg_any[r_, c_]: continue
    trees.append({"x": round(float(x), 2), "y": round(float(y), 2), "z": round(float(dtm[r_, c_]), 2), "r": 1.6, "h": 4.5,
                  "rgb": [70, 100, 60], "src": "geosampa-inventario (copa pequena, sem medida LiDAR)", "inventario": 1}); added += 1

# ---------- camada de cima, fundida ----------
top2 = ground2.copy()
tree_m = top1 == TREE
top2[(top1 == OTHER) & ~(bl_final > 0)] = OTHER
top2[tree_m] = TREE
top2[(top1 == DECK)] = DECK
top2[bl_final > 0] = BLDG
top2[~ins] = OUT

# ---------- comparações ----------
def iou(a, b): return float((a & b).sum()) / max(1, (a | b).sum())
row_vis = ins & np.isin(top1, [ROAD, WALK, PLAZA, GRASS]) & ~(bl_final > 0)  # chão visível (nome antigo mantido)
stats = {
    "predios": {"total": len(buildings), "do_geosampa": sum(b["src"].startswith("geosampa") for b in buildings),
                "divididos_por_altura": split_n, "novos_so_lidar": len(new_b), "geosampa_descartados_sem_lidar": len(dropped),
                "com_andares_osm": sum(1 for b in buildings if b["levels_osm"])},
    "altura_lidar_menos_geosampa_m": None,
    "arvores": {"lidar": len(J1["trees"]), "inventario_na_faixa": int(inv_in.sum()), "lidar_com_ponto_no_inventario": int(sum(1 for t in trees if t.get("inventario"))),
                "inventario_sem_copa_lidar": int((inv_in & ~matched_inv).sum()), "acrescentadas_do_inventario": added},
    "calcada": {"iou_lidar_x_geosampa": round(iou(lidar_walk & row_vis, calc & row_vis), 3),
                "area_geosampa_m2": int((calc & ins).sum()), "area_lidar_m2": int((lidar_walk & row_vis).sum()), "area_geosampa_visivel_m2": int((calc & row_vis).sum())},
    "tabuleiro": {"iou_lidar_x_osm": round(iou(deck & ins, deck_osm & ins), 3), "lidar_m2": int((deck & ins).sum()), "osm_m2": int((deck_osm & ins).sum())},
    "area_m2_top": {TYPES[k]: int((top2 == k).sum()) for k in range(1, 9)},
    "area_m2_chao": {TYPES[k] if k != OTHER else "pátio/lote": int((ground2 == k).sum()) for k in (1, 2, 3, 4, 8)},
}
dh = [b["h"] - b["gs_h"] for b in buildings if b["gs_h"] and b["src"] == "geosampa"]
stats["altura_lidar_menos_geosampa_m"] = {"mediana": round(float(np.median(dh)), 2), "p10": round(float(np.percentile(dh, 10)), 2),
                                          "p90": round(float(np.percentile(dh, 90)), 2), "dif_maior_que_5m": int(sum(abs(x) > 5 for x in dh)), "n": len(dh)}
np.savez_compressed("labels2.npz", top=top2, ground=ground2, deck=deck & ins, deck_osm=deck_osm, bid=bl_final, quadra=quadra,
                    calc=calc, park=park, dtm=dtm, deck_top=L1["deck_top"])
json.dump({"crs": "EPSG:31983", "types": TYPES, "stats": stats, "buildings": buildings, "trees": trees, "roads": roads,
           "dropped_geosampa": dropped,
           "fontes": ["LiDAR PMSP (MDS_color)", "GeoSampa/PMSP: edificacao, calcada, quadra_viaria_editada, arvore, praca_largo",
                      "© colaboradores do OpenStreetMap (ODbL)"]},
          open("scene2.json", "w", encoding="utf-8"), ensure_ascii=False)
print(json.dumps(stats, ensure_ascii=False, indent=1))

# ---------- figuras ----------
PAL = np.array([(0, 0, 0), (70, 70, 80), (215, 200, 160), (240, 130, 40), (120, 220, 60), (20, 120, 30),
                (200, 60, 200), (40, 170, 255), (255, 230, 0)], float)
F = lambda sz: ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", sz)
ortho = D["rgb"][r0:r1, c0:c1].astype(float)
def blend(lab, alpha=0.55, pal=PAL):
    o = ortho.copy(); m = lab > 0; o[m] = o[m] * (1 - alpha) + pal[lab[m]] * alpha; o[~ins] *= 0.35
    return Image.fromarray(o[::-1].astype(np.uint8))
rr, cc = np.nonzero(ins); bb = (cc.min() - 5, H - rr.max() - 6, cc.max() + 6, H - rr.min() + 5)
im = blend(top2).crop(bb); d = ImageDraw.Draw(im)
names = dict(enumerate(TYPES)); names[OTHER] = "outros / pátio de lote"
d.rectangle((8, 8, 360, 26 + 30 * 10), fill=(15, 17, 22)); y = 18
for k in range(1, 9):
    d.rectangle((18, y, 40, y + 22), fill=tuple(int(v) for v in PAL[k]))
    d.text((50, y), f"{names[k]}  {stats['area_m2_top'][TYPES[k]]/1e4:.2f} ha", font=F(18), fill="white"); y += 30
d.text((18, y), f"árvores: {len(trees)}   prédios: {len(buildings)}", font=F(18), fill="white")
im.save("../etapas/02-tipos.png")

# painel de discordâncias em 3 trechos
s_ = S["s"]
def window_at(st, size=240):
    m = ins & (np.abs(s_ - st) < 2); r, c = np.nonzero(m); cy, cx = r.mean(), c.mean()
    return int(cx - size / 2), int(H - cy - size / 2), int(cx + size / 2), int(H - cy + size / 2)
# prédios: 1 ambos, 2 só LiDAR, 3 só GeoSampa
pb = np.zeros((H, W), np.uint8)
pb[(gs_id > 0) & bl_lidar] = 1; pb[bl_lidar & ~(gs_id > 0)] = 2; pb[(gs_id > 0) & ~bl_lidar] = 3
PB = np.array([(0, 0, 0), (90, 200, 90), (255, 60, 60), (60, 120, 255)], float)
# calçada: 1 ambos, 2 só LiDAR, 3 só GeoSampa (só onde o chão é visível na via pública)
pc = np.zeros((H, W), np.uint8)
pc[row_vis & lidar_walk & calc] = 1; pc[row_vis & lidar_walk & ~calc] = 2; pc[row_vis & ~lidar_walk & calc] = 3
spots = [(300, "Praça Roosevelt"), (1400, "Santa Cecília"), (2450, "fim do elevado")]
tiles = []
for st, nm in spots:
    b = window_at(st); k = 480 / (b[2] - b[0])
    t1 = blend(pb, 0.6, PB).crop(b).resize((480, 480), Image.NEAREST); dd = ImageDraw.Draw(t1)
    dd.text((8, 6), f"{nm} · prédios", font=F(17), fill="white", stroke_width=3, stroke_fill="black")
    t2 = blend(pc, 0.7, PB).crop(b).resize((480, 480), Image.NEAREST); dd = ImageDraw.Draw(t2)
    dd.text((8, 6), f"{nm} · calçadas", font=F(17), fill="white", stroke_width=3, stroke_fill="black")
    t3 = Image.fromarray(np.where(ins[..., None], ortho, ortho * .35)[::-1].astype(np.uint8)).crop(b).resize((480, 480), Image.LANCZOS)
    dd = ImageDraw.Draw(t3)
    for x, yy in inv:
        u, v = (x - ox - b[0]) * k, (H - (yy - oy) - b[1]) * k
        if 0 < u < 480 and 0 < v < 480: dd.ellipse((u - 3, v - 3, u + 3, v + 3), fill=(60, 120, 255))
    for t in trees:
        u, v = (t["x"] - ox - b[0]) * k, (H - (t["y"] - oy) - b[1]) * k
        if -20 < u < 500 and -20 < v < 500:
            rad = t["r"] * k; col = (90, 230, 90) if t.get("inventario") else ((255, 200, 0) if t["src"] != "lidar" else (255, 60, 60))
            dd.ellipse((u - rad, v - rad, u + rad, v + rad), outline=col, width=2)
    dd.text((8, 6), f"{nm} · árvores", font=F(17), fill="white", stroke_width=3, stroke_fill="black")
    tiles.append((t1, t2, t3))
sheet = Image.new("RGB", (3 * 490 + 10, 3 * 490 + 60), (15, 17, 22)); ds = ImageDraw.Draw(sheet)
for i, row_t in enumerate(tiles):
    for j, t in enumerate(row_t): sheet.paste(t, (10 + j * 490, 10 + i * 490))
ds.text((12, 3 * 490 + 16), "verde = as duas fontes concordam   vermelho = só LiDAR   azul = só GeoSampa/inventário   "
        "amarelo = árvore acrescentada do inventário", font=F(18), fill="white")
sheet.save("../etapas/02-discordancias.png")
print("figuras ok")
