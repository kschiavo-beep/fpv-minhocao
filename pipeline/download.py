# Baixa os blocos LiDAR escolhidos por route.py (lista em sel.json) para a pasta laz/
import json, os, urllib.request
from concurrent.futures import ThreadPoolExecutor
os.makedirs("laz", exist_ok=True)
tiles = json.load(open("sel.json"))["tiles"]
def get(k):
    dst = os.path.join("laz", k)
    if not os.path.exists(dst):
        urllib.request.urlretrieve("https://laz-m3dc-pmsp.s3.amazonaws.com/" + k, dst)
    return k
with ThreadPoolExecutor(8) as ex:
    for k in ex.map(get, tiles): print("ok", k)
