# Etapa 2 / passo 41: baixa camadas do GeoSampa (WFS público da PMSP) na caixa da faixa, em EPSG:31983.
# Saída: geosampa/<camada>.geojson. Dados: GeoSampa / Prefeitura de São Paulo.
import json, os, sys, time, urllib.request, urllib.parse

LAYERS = ["calcada", "edificacao", "arvore", "quadra_viaria_editada", "obra_arte", "GEOSAMPA_v_praca_largo"]
URL = "https://wms.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs"
bb = json.load(open("bbox.json"))["utm"]
os.makedirs("geosampa", exist_ok=True)
NOBBOX = {"GEOSAMPA_v_praca_largo"}  # view que recusa bbox (HTTP 400): baixa tudo e filtra aqui

def touches(f):
    def walk(c):
        if isinstance(c[0], (int, float)): yield c
        else:
            for x in c: yield from walk(x)
    pts = list(walk(f["geometry"]["coordinates"])) if f.get("geometry") else []
    return any(bb[0] <= x <= bb[2] and bb[1] <= y <= bb[3] for x, y, *_ in pts)

def get(params):
    u = URL + "?" + urllib.parse.urlencode(params)
    for k in range(4):
        try:
            req = urllib.request.Request(u, headers={"User-Agent": "fpv-sim-pipeline"})
            return urllib.request.urlopen(req, timeout=180).read()
        except Exception as e:
            err = e; time.sleep(3 * (k + 1))
    raise err

for L in LAYERS:
    dst = f"geosampa/{L}.geojson"
    if os.path.exists(dst) and "--force" not in sys.argv:
        print("já existe", dst); continue
    feats, start = [], 0
    while True:
        p = {"service": "WFS", "version": "2.0.0", "request": "GetFeature", "typeNames": "geoportal:" + L,
             "outputFormat": "application/json", "srsName": "EPSG:31983", "count": 1000, "startIndex": start}
        if L not in NOBBOX: p["bbox"] = f"{bb[0]},{bb[1]},{bb[2]},{bb[3]},EPSG:31983"
        else:  # a view também recusa srsName/paginação; já vem em EPSG:31983
            for k in ("srsName", "count", "startIndex"): p.pop(k)
        raw = get(p)
        try:
            d = json.loads(raw)
        except Exception:
            print("ERRO", L, raw[:300].decode("utf-8", "replace")); break
        f = d.get("features", []); feats += f
        if len(f) < 1000: break
        start += 1000
    if L in NOBBOX: feats = [f for f in feats if touches(f)]
    json.dump({"type": "FeatureCollection", "features": feats}, open(dst, "w", encoding="utf-8"))
    print(L, len(feats))
