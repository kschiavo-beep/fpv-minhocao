import json
from pyproj import Transformer
T=Transformer.from_crs(4326,31983,always_xy=True)
R=[(-23.5480,-46.6452),(-23.5395,-46.6520),(-23.5340,-46.6562),(-23.5295,-46.6660)]
pts=[T.transform(lo,la) for la,lo in R]; print(pts)
H=json.load(open("hdrs.json")); keys=dict(json.load(open("keys.json")))
xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
bb=(min(xs)-350,min(ys)-350,max(xs)+350,max(ys)+350)
import math
def dseg(px,py,a,b):
    ax,ay=a;bx,by=b;dx,dy=bx-ax,by-ay;t=max(0,min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)));return math.hypot(px-ax-t*dx,py-ay-t*dy)
sel=[]
for k,v in H.items():
    x0,y0,x1,y1=v[:4]
    if x1<bb[0] or x0>bb[2] or y1<bb[1] or y0>bb[3]: continue
    # tile near route?
    cx,cy=(x0+x1)/2,(y0+y1)/2; r=math.hypot(x1-x0,y1-y0)/2
    # margem 300 m (era 250): com 250 o bloco 3312-442 ficava de fora por 7 m e deixava um buraco na curva de Santa Cecília
    if min(dseg(cx,cy,pts[i],pts[i+1]) for i in range(3))<r+300: sel.append(k)
print(len(sel), sum(keys[k] for k in sel)/1e6,"MB"); print(sorted(sel))
json.dump({"route":pts,"tiles":sel},open("sel.json","w"))
