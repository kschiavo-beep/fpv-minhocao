# Etapa 1 / passo 31: figuras da classificação (mapa por tipo sobre a ortofoto, árvores e prédios).
import json, numpy as np
from PIL import Image, ImageDraw, ImageFont

S = np.load("strip.npz"); L = np.load("labels1.npz"); D = np.load("dsm.npz"); J = json.load(open("scene1.json", encoding="utf-8"))
r0, r1, c0, c1 = (int(S[k]) for k in ("r0", "r1", "c0", "c1")); X0, Y0 = float(S["X0"]), float(S["Y0"])
ins = S["inside"]; top = L["top"]; s = S["s"]
H, W = top.shape
ortho = D["rgb"][r0:r1, c0:c1].astype(float)
PAL = np.array([(0, 0, 0), (70, 70, 80), (215, 200, 160), (240, 130, 40), (120, 220, 60), (20, 120, 30),
                (200, 60, 200), (40, 170, 255), (255, 230, 0)], float)
F = lambda sz: ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", sz)

def blend(alpha=0.55):
    o = ortho.copy(); m = top > 0
    o[m] = o[m] * (1 - alpha) + PAL[top[m]] * alpha
    o[~ins] *= 0.35
    return Image.fromarray(o[::-1].astype(np.uint8))

def to_px(x, y):  # UTM -> pixel na imagem (norte para cima)
    return x - X0 - c0, H - (y - Y0 - r0)

def legend(im, extra):
    d = ImageDraw.Draw(im); x, y = 18, 18
    d.rectangle((8, 8, 330, 26 + 30 * 8 + 30 * len(extra)), fill=(15, 17, 22))
    for k in range(1, 9):
        a = J["area_m2_top"][J["types"][k]]
        d.rectangle((x, y, x + 22, y + 22), fill=tuple(int(v) for v in PAL[k]))
        d.text((x + 32, y), f"{J['types'][k]}  {a/1e4:.2f} ha", font=F(18), fill="white"); y += 30
    for e in extra: d.text((x, y), e, font=F(18), fill="white"); y += 30
    return im

# visão geral: recorta a caixa da faixa
rr, cc = np.nonzero(ins); bb = (cc.min() - 5, H - rr.max() - 6, cc.max() + 6, H - rr.min() + 5)
im = blend().crop(bb)
im = legend(im, [f"árvores: {len(J['trees'])}", f"prédios: {len(J['buildings'])}"])
im.save("../etapas/01-tipos.png")

# zooms em 3 trechos (estação ao longo do eixo)
def window_at(st, size=260):
    m = ins & (np.abs(s - st) < 2); r, c = np.nonzero(m); cy, cx = r.mean(), c.mean()
    return int(cx - size / 2), int(H - cy - size / 2), int(cx + size / 2), int(H - cy + size / 2)
spots = [(300, "Praça Roosevelt"), (1400, "meio (Santa Cecília)"), (2450, "fim (Pç. Marechal)")]
tiles_t, tiles_o = [], []
base = blend(0.5); orth = Image.fromarray(np.where(ins[..., None], ortho, ortho * 0.35)[::-1].astype(np.uint8))
for st, nm in spots:
    b = window_at(st)
    t = base.crop(b).resize((520, 520), Image.NEAREST); ImageDraw.Draw(t).text((10, 8), nm, font=F(20), fill="white", stroke_width=3, stroke_fill="black")
    tiles_t.append(t)
    o = orth.crop(b).resize((520, 520), Image.LANCZOS); d = ImageDraw.Draw(o); k = 520 / (b[2] - b[0])
    for bd in J["buildings"]:
        p = [((x - b[0]) * k, (y - b[1]) * k) for x, y in (to_px(*q) for q in bd["poly"])]
        if all(-50 < u < 570 and -50 < v < 570 for u, v in p):
            rng = np.random.default_rng(bd["id"]); col = tuple(int(v) for v in rng.integers(80, 255, 3))
            d.polygon(p, outline=col, width=2)
    for tr in J["trees"]:
        u, v = to_px(tr["x"], tr["y"]); u, v = (u - b[0]) * k, (v - b[1]) * k
        if -20 < u < 540 and -20 < v < 540:
            rad = tr["r"] * k; d.ellipse((u - rad, v - rad, u + rad, v + rad), outline=(60, 255, 60), width=2)
    d.text((10, 8), nm + " · prédios (contornos) e árvores (círculos)", font=F(16), fill="white", stroke_width=3, stroke_fill="black")
    tiles_o.append(o)
sheet = Image.new("RGB", (3 * 520 + 40, 2 * 520 + 30), (15, 17, 22))
for i in range(3):
    sheet.paste(tiles_t[i], (10 + i * 530, 10)); sheet.paste(tiles_o[i], (10 + i * 530, 540))
sheet.save("../etapas/01-zoom.png")
print("ok", im.size, sheet.size)
