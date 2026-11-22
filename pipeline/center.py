import numpy as np, json
from PIL import Image, ImageDraw
d=np.load("dsm.npz"); C=np.load("cls.npy"); X0,Y0=float(d["X0"]),float(d["Y0"]); zmax=d["zmax"]; ny,nx=zmax.shape
H=[(1243,1185),(1243,860),(1225,760),(1170,630),(1120,580),(1000,510),(860,430),(760,380),(690,340),(600,335),(520,340),(430,340)]
P=np.array([(2*a,ny-2*b) for a,b in H],float)  # grid coords (col,row from south)
mask=(C[1]+C[2]+C[3]==0)&(C[0]==0)  # nothing but buildings/other
# resample polyline every 5 m
seg=np.diff(P,axis=0); L=np.hypot(*seg.T); s=np.r_[0,np.cumsum(L)]
st=np.arange(0,s[-1],5.0); pts=np.c_[np.interp(st,s,P[:,0]),np.interp(st,s,P[:,1])]
out=[]
for i,p in enumerate(pts):
    j=min(i+1,len(pts)-1); t=pts[j]-pts[max(i-1,0)]; t/=np.hypot(*t); n=np.array([-t[1],t[0]])
    offs=np.arange(-30,31,1.0); good=[]
    for o in offs:
        q=p+n*o; c,r=int(q[0]),int(q[1])
        if 0<=c<nx and 0<=r<ny and mask[r,c]: good.append(o)
    # find run of consecutive good offsets nearest center with width 8-25
    runs=[];cur=[]
    for o in offs:
        if o in good: cur.append(o)
        else:
            if cur: runs.append(cur); cur=[]
    if cur: runs.append(cur)
    runs=[r for r in runs if 7<=len(r)<=26]
    if runs:
        r=min(runs,key=lambda r:abs(np.mean(r))); out.append(p+n*np.mean(r))
    else: out.append(p+np.nan)
out=np.array(out); 
# smooth & fill
ok=~np.isnan(out[:,0]); idx=np.arange(len(out))
for k in (0,1): out[:,k]=np.interp(idx,idx[ok],out[ok,k])
from scipy.ndimage import median_filter, uniform_filter1d
for k in (0,1): out[:,k]=uniform_filter1d(median_filter(out[:,k],9,mode='nearest'),5,mode='nearest')
print(len(out), ok.mean())
utm=[(X0+c+.5,Y0+r+.5) for c,r in out]; json.dump(utm,open("center.json","w"))
im=Image.fromarray(d["rgb"][::-1].copy()); dr=ImageDraw.Draw(im)
dr.line([(c,ny-r) for c,r in out],fill=(255,0,255),width=2)
im.crop((700,500,2600,2450)).resize((950,975)).save("center.png")
im.crop((2300,1100,2600,2400)).save("center_zoom.png")
