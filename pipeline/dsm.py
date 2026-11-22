import laspy, numpy as np, glob, json, collections
fs=sorted(glob.glob("laz/*.laz"))
X0,Y0,X1,Y1=1e9,1e9,-1e9,-1e9
for f in fs:
    h=laspy.read_header(f) if hasattr(laspy,'read_header') else laspy.open(f).header
    X0=min(X0,h.mins[0]);Y0=min(Y0,h.mins[1]);X1=max(X1,h.maxs[0]);Y1=max(Y1,h.maxs[1])
X0,Y0=np.floor(X0),np.floor(Y0); nx,ny=int(X1-X0)+1,int(Y1-Y0)+1
print(nx,ny)
zmax=np.full(nx*ny,-1e9,np.float32); zmin=np.full(nx*ny,1e9,np.float32); rgb=np.zeros((nx*ny,3),np.uint8)
cls=collections.Counter()
for f in fs:
    L=laspy.read(f); x=np.asarray(L.x);y=np.asarray(L.y);z=np.asarray(L.z,np.float32)
    c=np.asarray(L.classification); cls.update(dict(zip(*np.unique(c,return_counts=True))))
    k=((y-Y0).astype(np.int64))*nx+(x-X0).astype(np.int64)
    o=np.lexsort((z,k)); ks=k[o]; last=np.r_[ks[1:]!=ks[:-1],True]
    kk=ks[last]; zz=z[o][last]; better=zz>zmax[kk]; zmax[kk[better]]=zz[better]
    r=(np.stack([L.red,L.green,L.blue],1)[o][last]); r=(r>>8 if r.max()>255 else r).astype(np.uint8); rgb[kk[better]]=r[better]
    np.minimum.at(zmin,k,z)
    print(f,len(x),flush=True)
np.savez("dsm.npz",zmax=zmax.reshape(ny,nx),zmin=zmin.reshape(ny,nx),rgb=rgb.reshape(ny,nx,3),X0=X0,Y0=Y0)
print({int(a):int(b) for a,b in cls.items()})
