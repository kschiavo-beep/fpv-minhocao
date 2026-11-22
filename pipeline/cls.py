import laspy, numpy as np, glob
d=np.load("dsm.npz"); X0,Y0=float(d["X0"]),float(d["Y0"]); ny,nx=d["zmax"].shape
C=np.zeros((4,ny,nx),np.uint16)  # counts for class 2,6,19,20
for f in sorted(glob.glob("laz/*.laz")):
    L=laspy.read(f); c=np.asarray(L.classification)
    k=((np.asarray(L.y)-Y0).astype(np.int64))*nx+(np.asarray(L.x)-X0).astype(np.int64)
    for i,cc in enumerate([2,6,19,20]):
        m=c==cc; C[i].reshape(-1)[:]+=np.bincount(k[m],minlength=nx*ny).astype(np.uint16)
np.save("cls.npy",C)
