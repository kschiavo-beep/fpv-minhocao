# Etapa 1 / passo 10: define a faixa do simulador em células de 1 m (grade UTM do dsm.npz).
# Saída: strip.npz com a janela da grade (r0,r1,c0,c1), máscara "dentro da faixa",
# estação ao longo do eixo (s, m) e distância ao eixo (t, m) de cada célula.
import json, gzip, base64, numpy as np
from scipy.spatial import cKDTree

d = np.load("dsm.npz"); X0, Y0 = float(d["X0"]), float(d["Y0"]); NY, NX = d["zmax"].shape
meta = json.load(open("meta2.json"))
ox, oy = meta["origin"]["x"], meta["origin"]["y"]
ns, half = meta["strip"]["ns"], meta["strip"]["half"]
sp = np.frombuffer(gzip.decompress(base64.b64decode(open("spine2.b64").read())), np.float32).reshape(ns, 5).astype(np.float64)
q = sp[:, :2] + [ox, oy]; nrm = sp[:, 2:4]; off = sp[:, 4]; tg = np.c_[nrm[:, 1], -nrm[:, 0]]
ctr = q + nrm * off[:, None]  # eixo real (UTM)

M = half + 6
c0 = int(np.floor(min((q + nrm * (off[:, None] - M))[:, 0].min(), (q + nrm * (off[:, None] + M))[:, 0].min()) - X0))
c1 = int(np.ceil(max((q + nrm * (off[:, None] - M))[:, 0].max(), (q + nrm * (off[:, None] + M))[:, 0].max()) - X0))
r0 = int(np.floor(min((q + nrm * (off[:, None] - M))[:, 1].min(), (q + nrm * (off[:, None] + M))[:, 1].min()) - Y0))
r1 = int(np.ceil(max((q + nrm * (off[:, None] - M))[:, 1].max(), (q + nrm * (off[:, None] + M))[:, 1].max()) - Y0))
c0, r0 = max(c0, 0), max(r0, 0); c1, r1 = min(c1, NX), min(r1, NY)
rr, cc = np.mgrid[r0:r1, c0:c1]
P = np.c_[X0 + cc.ravel() + .5, Y0 + rr.ravel() + .5]
dist, k = cKDTree(q).query(P)
rel = P - q[k]
u = np.einsum("ij,ij->i", rel, tg[k]); t = np.einsum("ij,ij->i", rel, nrm[k]) - off[k]
inside = (np.abs(t) <= half) & (dist < half + 70) & ~((k == 0) & (u < 0)) & ~((k == ns - 1) & (u > 0))
shape = rr.shape
np.savez_compressed("strip.npz", r0=r0, r1=r1, c0=c0, c1=c1, inside=inside.reshape(shape),
                    s=(k + u).reshape(shape).astype(np.float32), t=t.reshape(shape).astype(np.float32),
                    ctr=ctr, X0=X0, Y0=Y0)
print("janela", shape, "células na faixa", int(inside.sum()), "≈", round(inside.sum() / 1e4, 1), "ha")
