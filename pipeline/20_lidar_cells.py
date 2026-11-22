# Etapa 1 / passo 20: resume os pontos LiDAR por célula de 1 m e por classe, na janela da faixa.
# Saída: cells.npz com, para cada classe em CL: n (contagem), zmin, zmax, rgb médio;
# zmean, imean (intensidade média); e para todos os pontos: nret (média de "number of returns"), multi (fração com retorno múltiplo).
import glob, numpy as np, laspy

CL = [2, 5, 6, 9, 19, 20]
S = np.load("strip.npz"); r0, r1, c0, c1 = (int(S[k]) for k in ("r0", "r1", "c0", "c1"))
X0, Y0 = float(S["X0"]), float(S["Y0"]); H, W = r1 - r0, c1 - c0; N = H * W
n = np.zeros((len(CL), N), np.int32)
zmin = np.full((len(CL), N), np.inf, np.float32); zmax = np.full((len(CL), N), -np.inf, np.float32)
rgb = np.zeros((len(CL), N, 3), np.float64)
zsum = np.zeros((len(CL), N)); isum = np.zeros((len(CL), N))
multi = np.zeros(N, np.int32); tot = np.zeros(N, np.int32)
for f in sorted(glob.glob("laz/*.laz")):
    L = laspy.read(f)
    c = (np.asarray(L.x) - X0).astype(np.int64) - c0; r = (np.asarray(L.y) - Y0).astype(np.int64) - r0
    ok = (c >= 0) & (c < W) & (r >= 0) & (r < H)
    if not ok.any(): continue
    k = (r * W + c)[ok]; z = np.asarray(L.z, np.float32)[ok]; cl = np.asarray(L.classification)[ok]
    col = np.stack([L.red, L.green, L.blue], 1)[ok]; col = (col >> 8 if col.max() > 255 else col).astype(np.float64)
    nr = np.asarray(L.number_of_returns)[ok]; it = np.asarray(L.intensity, np.float64)[ok]
    tot += np.bincount(k, minlength=N).astype(np.int32); multi += np.bincount(k[nr > 1], minlength=N).astype(np.int32)
    for i, cv in enumerate(CL):
        m = cl == cv
        if not m.any(): continue
        kk, zz = k[m], z[m]
        n[i] += np.bincount(kk, minlength=N).astype(np.int32)
        for j in range(3): rgb[i, :, j] += np.bincount(kk, col[m, j], minlength=N)
        zsum[i] += np.bincount(kk, zz.astype(np.float64), minlength=N); isum[i] += np.bincount(kk, it[m], minlength=N)
        o = np.lexsort((zz, kk)); ks, zs = kk[o], zz[o]
        first = np.r_[True, ks[1:] != ks[:-1]]; last = np.r_[ks[1:] != ks[:-1], True]
        np.minimum.at(zmin[i], ks[first], zs[first]); np.maximum.at(zmax[i], ks[last], zs[last])
    print(f, int(ok.sum()), flush=True)
rgb = (rgb / np.maximum(n, 1)[..., None]).astype(np.uint8)
sh = (len(CL), H, W)
np.savez_compressed("cells.npz", CL=np.array(CL), n=n.reshape(sh), zmin=zmin.reshape(sh), zmax=zmax.reshape(sh),
                    rgb=rgb.reshape(len(CL), H, W, 3), multi=(multi / np.maximum(tot, 1)).reshape(H, W).astype(np.float32),
                    tot=tot.reshape(H, W), zmean=(zsum / np.maximum(n, 1)).reshape(sh).astype(np.float32),
                    imean=(isum / np.maximum(n, 1)).reshape(sh).astype(np.float32))
print("ok", H, W)
