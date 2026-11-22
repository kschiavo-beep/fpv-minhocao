import urllib.request, json, struct
from concurrent.futures import ThreadPoolExecutor
keys=[k for k,_ in json.load(open("keys.json"))]
def h(k):
    for _ in range(3):
        try:
            r=urllib.request.Request("https://laz-m3dc-pmsp.s3.amazonaws.com/"+k,headers={"Range":"bytes=0-374"})
            b=urllib.request.urlopen(r,timeout=30).read()
            mx,mnx,my,mny,mz,mnz=struct.unpack("<6d",b[179:227]); n=struct.unpack("<I",b[107:111])[0]
            return k,[mnx,mny,mx,my,mnz,mz,n]
        except Exception as e: err=e
    return k,None
with ThreadPoolExecutor(48) as ex: res=dict(ex.map(h,keys))
json.dump(res,open("hdrs.json","w")); print(sum(v is None for v in res.values()), list(res.items())[:2])
