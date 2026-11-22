import numpy as np, json, gzip, base64, glob, laspy, math
from scipy.ndimage import gaussian_filter1d, median_filter, rank_filter, distance_transform_edt as edt, uniform_filter1d
from scipy.spatial import cKDTree
d=np.load("dsm.npz"); X0,Y0=float(d["X0"]),float(d["Y0"]); Z=d["zmax"].astype(np.float64); RGB=d["rgb"].copy(); NY,NX=Z.shape
empty=Z<0; _,(ii,jj)=edt(empty,return_indices=True); Z=Z[ii,jj]; RGB=RGB[ii,jj]
r3=rank_filter(Z,6,size=3); sp=(Z-r3)>3; Z[sp]=median_filter(Z,size=3)[sp]
c=np.array(json.load(open("center.json")))
s=np.r_[0,np.cumsum(np.hypot(*np.diff(c,axis=0).T))]; S=np.arange(0,s[-1],1.0)
p=np.c_[np.interp(S,s,c[:,0]),np.interp(S,s,c[:,1])]
def padn(p,n):
    a=p[0]-p[30]; a/=np.linalg.norm(a); b=p[-1]-p[-31]; b/=np.linalg.norm(b)
    return np.vstack([p[0]+a*np.arange(n,0,-1)[:,None],p,p[-1]+b*np.arange(1,n+1)[:,None]])
EXT=40  # rampas: 40 m a mais em cada ponta
P=padn(p,250); q=gaussian_filter1d(P,50,axis=0,mode='nearest')[250-EXT:len(P)-250+EXT]
# reparametrize spine at exactly 1 m
sq=np.r_[0,np.cumsum(np.hypot(*np.diff(q,axis=0).T))]; Sq=np.arange(0,sq[-1],1.0)
q=np.c_[np.interp(Sq,sq,q[:,0]),np.interp(Sq,sq,q[:,1])]
tg=np.gradient(q,axis=0); tg/=np.hypot(*tg.T)[:,None]; nrm=np.c_[-tg[:,1],tg[:,0]]
# offset of true centerline from spine (signed along normal), smoothed; beyond ends follow extension
Pc=padn(p,250)[250-EXT:len(P)-250+EXT]
tree=cKDTree(Pc); _,k=tree.query(q); off=np.einsum('ij,ij->i',Pc[k]-q,nrm)
off=uniform_filter1d(median_filter(off,31,mode='nearest'),41,mode='nearest')
HALF=58; NW=2*HALF+1; NS=len(q)
J=np.arange(NW)-HALF
VX=q[:,0,None]+nrm[:,0,None]*(off[:,None]+J[None]); VY=q[:,1,None]+nrm[:,1,None]*(off[:,None]+J[None])
ci=np.clip((VX-X0).astype(int),0,NX-1); ri=np.clip((VY-Y0).astype(int),0,NY-1)
H=Z[ri,ci]; C=RGB[ri,ci]
print("strip",NS,"x",NW,"cells",NS*NW,"max|t|",np.abs(off).max()+HALF)
ox,oy=round(q[:,0].mean()),round(q[:,1].mean()); oz=float(np.floor(np.percentile(H,2)))
Hr=H-oz; hmin=float(np.floor(Hr.min()))-1
Q=np.clip(np.round((Hr-hmin)/0.01),0,65535).astype(np.uint16)
meshbuf=gzip.compress(Q.tobytes()+C.astype(np.uint8).tobytes(),9)
# spine data: x,y,nx,ny,off as float32
spine=np.c_[q[:,0]-ox,q[:,1]-oy,nrm,off].astype(np.float32)
spinebuf=gzip.compress(spine.tobytes(),9)
# points inside strip
pts=[];cols=[]
qt=cKDTree(q)
for f in sorted(glob.glob("laz/*.laz")):
    L=laspy.read(f); x=np.asarray(L.x);y=np.asarray(L.y)
    bb=(x>VX.min()-1)&(x<VX.max()+1)&(y>VY.min()-1)&(y<VY.max()+1); idx=np.where(bb)[0]
    if not len(idx): continue
    dd,kk=qt.query(np.c_[x[idx],y[idx]])
    rel=np.c_[x[idx],y[idx]]-q[kk]; u=np.einsum('ij,ij->i',rel,tg[kk]); t=np.einsum('ij,ij->i',rel,nrm[kk])-off[kk]
    ok=(np.abs(t)<=HALF)&(np.abs(u)<=0.75)&(kk>0)&(kk<NS-1); idx=idx[ok]
    if not len(idx): continue
    pts.append(np.c_[x[idx]-ox,y[idx]-oy,np.asarray(L.z)[idx]-oz]); cc=np.stack([L.red,L.green,L.blue],1)[idx]
    cols.append((cc>>8 if cc.max()>255 else cc).astype(np.uint8))
Pp=np.vstack(pts); Cc=np.vstack(cols); full=len(Pp)
# 600 mil pontos (era 1 milhão): folga para o HTML ficar abaixo de 16 MB
keep=np.random.default_rng(1).permutation(full)[:600000]; Pp=Pp[keep]; Cc=Cc[keep]
mn=Pp.min(0); step=(Pp.max(0)-mn)/65535; Qp=np.round((Pp-mn)/step).astype(np.uint16)
ptsbuf=gzip.compress(Qp.tobytes()+Cc.tobytes(),9)
# spawn
k0=EXT+150; sx,sy=q[k0]+nrm[k0]*off[k0]; cz=H[k0,HALF]; yaw=math.degrees(math.atan2(tg[k0+5,1],tg[k0+5,0]))
meta={"origin":{"crs":"EPSG:31983","x":ox,"y":oy,"z":oz,"axes":"x=leste, y=norte, z=cima (metros, relativo a origem)","count_full":int(full),
  "note":"faixa de 58 m para cada lado do eixo do Elevado Presidente João Goulart (Minhocão), guardada reta (comprimento x largura) e curvada ao longo de uma linha-guia; LiDAR PMSP"},
 "spawn":{"name":"Minhocão, perto da Praça Roosevelt","x":round(float(sx-ox),2),"y":round(float(sy-oy),2),"z":round(float(cz-oz+3.5),2),"yaw_deg":round(yaw,1)},
 "strip":{"ns":NS,"nw":NW,"half":HALF,"hmin":hmin,"layout":"mesh: uint16 altura ns*nw (h = hmin + q*0.01, linha = estação ao longo do eixo), depois uint8 rgb; spine: float32 [x,y,nx,ny,off]*ns"},
 "pts":{"count":len(Pp),"min":mn.tolist(),"step":step.tolist()}}
json.dump(meta,open("meta2.json","w"))
for n,b in (("mesh2",meshbuf),("spine2",spinebuf),("pts2",ptsbuf)): open(n+".b64","w").write(base64.b64encode(b).decode())
print(len(meshbuf)/1e6,len(spinebuf)/1e3,"KB",len(ptsbuf)/1e6, meta["spawn"])
