# Etapa 2 / passo 40: baixa do OpenStreetMap (Overpass API) o que interessa na caixa da faixa.
# Saída: osm.json (resposta crua do Overpass, com geometria). Dados © colaboradores do OpenStreetMap (ODbL).
import json, os, sys, time, urllib.request, urllib.parse

la0, lo0, la1, lo1 = json.load(open("bbox.json"))["wgs"]
bb = f"{la0},{lo0},{la1},{lo1}"
Q = f"""[out:json][timeout:180];
(
  way["highway"]({bb});
  way["area:highway"]({bb});
  way["building"]({bb}); relation["building"]({bb});
  way["building:part"]({bb});
  way["leisure"~"park|garden|playground|pitch"]({bb}); relation["leisure"="park"]({bb});
  way["place"="square"]({bb}); relation["place"="square"]({bb});
  way["landuse"~"grass|recreation_ground|village_green"]({bb});
  way["natural"~"grass|scrub|wood"]({bb});
  node["natural"="tree"]({bb});
  way["man_made"="bridge"]({bb});
  way["barrier"~"wall|fence"]({bb});
);
out geom;"""
SERVERS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
if os.path.exists("osm.json") and "--force" not in sys.argv:
    print("já existe osm.json"); sys.exit()
for srv in SERVERS:
    try:
        req = urllib.request.Request(srv, data=urllib.parse.urlencode({"data": Q}).encode(),
                                     headers={"User-Agent": "fpv-sim-pipeline"})
        raw = urllib.request.urlopen(req, timeout=240).read()
        d = json.loads(raw); break
    except Exception as e:
        print("falhou", srv, e); time.sleep(5)
else:
    sys.exit("Overpass indisponível")
json.dump(d, open("osm.json", "w", encoding="utf-8"))
from collections import Counter
c = Counter()
for e in d["elements"]:
    t = e.get("tags", {})
    for k in ("highway", "building", "building:part", "leisure", "place", "landuse", "natural", "man_made", "area:highway", "barrier"):
        if k in t: c[k + ("=" + t[k] if k in ("highway", "leisure", "natural", "landuse") else "")] += 1; break
print(len(d["elements"]), "elementos"); print(c.most_common(30))
