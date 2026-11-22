# Etapa 4b / passo 74: busca a orientação completa reconstruída (computed_rotation, OpenSfM) das fotos candidatas.
# Token só pela variável MAPILLARY_TOKEN, no cabeçalho. Saída: mly/rot.json {id: [rx, ry, rz]} (vetor eixo-ângulo, mundo->câmera)
import json, os, sys, urllib.request, urllib.parse, glob
TOKEN = os.environ.get("MAPILLARY_TOKEN")
if not TOKEN: sys.exit("Defina MAPILLARY_TOKEN.")
HDR = {"Authorization": "OAuth " + TOKEN, "User-Agent": "fpv-sim-pipeline"}
ids = sorted(os.path.basename(f)[:-4] for f in glob.glob("mly/img/*.jpg"))
rot = json.load(open("mly/rot.json")) if os.path.exists("mly/rot.json") else {}
todo = [i for i in ids if i not in rot]
for k in range(0, len(todo), 50):
    q = urllib.parse.urlencode({"image_ids": ",".join(todo[k:k + 50]), "fields": "id,computed_rotation"})
    d = json.loads(urllib.request.urlopen(urllib.request.Request("https://graph.mapillary.com/images?" + q, headers=HDR), timeout=60).read())
    for it in d.get("data", []):
        if it.get("computed_rotation"): rot[it["id"]] = it["computed_rotation"]
json.dump(rot, open("mly/rot.json", "w"))
print("orientação completa:", len(rot), "de", len(ids), "fotos")
