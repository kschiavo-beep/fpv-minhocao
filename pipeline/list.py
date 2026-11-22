import urllib.request, re, urllib.parse, json
keys=[];tok=None
while True:
    u="https://laz-m3dc-pmsp.s3.amazonaws.com/?list-type=2&max-keys=1000"+("&continuation-token="+urllib.parse.quote(tok) if tok else "")
    x=urllib.request.urlopen(u).read().decode()
    keys+=list(zip(re.findall(r"<Key>(.*?)</Key>",x),map(int,re.findall(r"<Size>(\d+)</Size>",x))))
    m=re.search(r"<NextContinuationToken>(.*?)</NextContinuationToken>",x)
    if not m: break
    tok=m.group(1)
json.dump(keys,open("keys.json","w"))
print(len(keys)); import collections
print(collections.Counter(k.split('_')[0]+'_'+k.split('_')[1] if k.count('_')>1 else k[:8] for k,_ in keys).most_common(10))
print(keys[:3],keys[-3:])
