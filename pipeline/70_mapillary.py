# Etapa 4 / passo 70: lista as imagens do Mapillary (API v4) na caixa da faixa e baixa as miniaturas úteis.
# Token SÓ pela variável de ambiente MAPILLARY_TOKEN, enviado no cabeçalho (nunca em URL, log ou arquivo).
# Imagens: Mapillary, licença CC-BY-SA. Saída: mly/images.json (metadados), mly/img/<id>.jpg (miniaturas 1024).
import json, os, sys, time, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor

TOKEN = os.environ.get("MAPILLARY_TOKEN")
if not TOKEN: sys.exit("Defina MAPILLARY_TOKEN no Windows (setx) e reabra o terminal.")
HDR = {"Authorization": "OAuth " + TOKEN, "User-Agent": "fpv-sim-pipeline"}
os.makedirs("mly/img", exist_ok=True)
la0, lo0, la1, lo1 = json.load(open("bbox.json"))["wgs"]
FIELDS = "id,geometry,computed_geometry,compass_angle,computed_compass_angle,captured_at,is_pano,camera_type,thumb_1024_url,width,height,camera_parameters,sequence,make,model"

def get(url):
    for k in range(4):
        try:
            return json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=HDR), timeout=60).read())
        except urllib.error.HTTPError as e:
            if e.code in (401, 403): sys.exit(f"Mapillary recusou o token (HTTP {e.code}).")
            err = e
        except Exception as e:
            err = e
        time.sleep(2 * (k + 1))
    raise err

if not os.path.exists("mly/images.json") or "--force" in sys.argv:
    imgs, n = {}, 6  # a API devolve no máximo 2000 por caixa: divide em 6x6
    for a in range(n):
        for b in range(n):
            bb = (lo0 + (lo1 - lo0) * b / n, la0 + (la1 - la0) * a / n, lo0 + (lo1 - lo0) * (b + 1) / n, la0 + (la1 - la0) * (a + 1) / n)
            q = urllib.parse.urlencode({"fields": FIELDS, "bbox": ",".join(f"{v:.6f}" for v in bb), "limit": 2000})
            d = get("https://graph.mapillary.com/images?" + q)
            for it in d.get("data", []): imgs[it["id"]] = it
            if len(d.get("data", [])) >= 2000: print("aviso: célula com 2000 imagens (pode ter cortado)", a, b)
    # o thumb_1024_url expira: guardamos sem ele e pedimos de novo na hora de baixar
    for it in imgs.values(): it.pop("thumb_1024_url", None)
    json.dump(list(imgs.values()), open("mly/images.json", "w", encoding="utf-8"))
imgs = json.load(open("mly/images.json", encoding="utf-8"))
from collections import Counter
print("imagens na caixa:", len(imgs), "| panorâmicas:", sum(1 for i in imgs if i.get("is_pano")),
      "| anos:", sorted(Counter(time.gmtime(i["captured_at"] / 1000).tm_year for i in imgs).items()))

def download(ids):
    def one(i):
        dst = f"mly/img/{i}.jpg"
        if os.path.exists(dst): return i, True
        try:
            u = get(f"https://graph.mapillary.com/{i}?fields=thumb_1024_url")["thumb_1024_url"]
            open(dst, "wb").write(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "fpv-sim-pipeline"}), timeout=60).read())
            return i, True
        except Exception:
            return i, False
    with ThreadPoolExecutor(8) as ex: res = list(ex.map(one, ids))
    print("miniaturas:", sum(ok for _, ok in res), "de", len(res))

if __name__ == "__main__" and len(sys.argv) > 1 and sys.argv[1] == "--download":
    ids = json.load(open("mly/selected.json"))
    download(ids)
