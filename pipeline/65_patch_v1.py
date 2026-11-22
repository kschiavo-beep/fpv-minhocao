# V 1: cena low-poly sobre a V 0.1. Injeta lp_module.js, troca a física (laje do viaduto, pilares, copas),
# põe low-poly como visualização padrão (V alterna low-poly / mesh / points / mesh + points) e embute lp.json + lp.bin.gz.
# Uso: python 65_patch_v1.py fpv-minhocao-v0.1.html fpv-minhocao-v1.html
import sys, gzip, base64

src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
def rep(old, new, count=1):
    global s
    n = s.count(old); assert n == count, f"esperado {count}x, achei {n}x: {old[:80]!r}"
    s = s.replace(old, new)

import os
VER = os.environ.get("FPV_VER", "V 2")
rep("<title>FPV Minhocão V 0.1</title>", f"<title>FPV Minhocão {VER}</title>")
rep("view: 'mesh',", "view: 'lowpoly', texFilter: 'n64', balAuto: 'off',")
# módulo low-poly logo depois da faixa lateral
mod = open("lp_module.js", encoding="utf-8").read()
rep("  world.add(sk); outerObjs.push(sk); applyOuter();\n}", "  world.add(sk); outerObjs.push(sk); applyOuter();\n}\n" + mod)
# física
rep("function hmAtG(x, y, r = 0.15) {",
    "function hmAtG(x, y, r = 0.15) { return cfg.view === 'lowpoly' ? lpSurf(x, y, st.p.z, r) : hmAtGMesh(x, y, r); }\n"
    "function hmAtGMesh(x, y, r = 0.15) {")
rep("  st.flightTime += dt;\n  const h = hmAtG(st.p.x, st.p.y);",
    "  st.flightTime += dt;\n"
    "  if (cfg.view === 'lowpoly') { // teto: fundo da laje do viaduto ou de uma copa\n"
    "    const c = lpCeil(st.p.x, st.p.y, _prev.z);\n"
    "    if (st.p.z > c - 0.12) { const imp = st.v.z; st.p.z = c - 0.12;\n"
    "      if (st.v.z > 0) { st.v.z *= -0.4; if (imp > 3 && st.crashT <= 0.6) crash(`Hit at ${(imp * 3.6).toFixed(0)} km/h`); } }\n"
    "  }\n"
    "  const h = hmAtG(st.p.x, st.p.y);")
# visualizações
rep("const VIEWS = ['mesh', 'points', 'both'], VIEW_NAMES = { mesh: 'mesh', points: 'points', both: 'mesh + points' };",
    "const VIEWS = ['lowpoly', 'mesh', 'points', 'both'], VIEW_NAMES = { lowpoly: 'low-poly', mesh: 'mesh', points: 'points', both: 'mesh + points' };")
rep("  meshObj.visible = cfg.view !== 'points';\n  const want = cfg.view !== 'mesh';\n  cloud.visible = want && pointsState === 'ready';\n"
    "  if (want) ensurePoints().then(() => { cloud.visible = cfg.view !== 'mesh'; });",
    "  meshObj.visible = cfg.view === 'mesh' || cfg.view === 'both'; lpGroup.visible = cfg.view === 'lowpoly';\n"
    "  const want = cfg.view === 'points' || cfg.view === 'both';\n  cloud.visible = want && pointsState === 'ready';\n"
    "  if (want) ensurePoints().then(() => { cloud.visible = cfg.view === 'points' || cfg.view === 'both'; });")
rep("const what = cfg.view === 'mesh' ? 'mesh' :", "const what = (cfg.view === 'mesh' || cfg.view === 'lowpoly') ? VIEW_NAMES[cfg.view] :")
# opção de filtro de textura
rep('<option value="visible">visible (street level)</option></select></div>',
    '<option value="visible">visible (street level)</option></select></div>\n'
    '  <div class="f"><label>Textures</label><select id="texFilter"><option value="n64">N64 (smooth)</option><option value="pixel">pixel</option></select></div>\n'
    '  <div class="f"><label>Balloons</label><div style="display:flex;gap:4px"><button id="bBalRegen">Regenerate</button>'
    '<select id="balAuto"><option value="off">no auto-regenerate</option><option value="on">auto-regenerate (25 s)</option></select></div></div>')
rep("  $('outerGround').value = cfg.outerGround;",
    "  $('texFilter').value = cfg.texFilter; $('texFilter').onchange = e => { cfg.texFilter = e.target.value; applyTexFilter(); save(); };\n"
    "  $('bBalRegen').onclick = () => lpBal.regen(); $('balAuto').value = cfg.balAuto; $('balAuto').onchange = e => { cfg.balAuto = e.target.value; save(); };\n"
    "  $('outerGround').value = cfg.outerGround;")
rep("window.__fpv = { geo, mat, renderer, cloud, st, meshObj, scene, camera };",
    "window.__fpv = { geo, mat, renderer, cloud, st, meshObj, scene, camera, lpSurf, lpCeil, lpGroup, lpBal };")
rep("  renderer.render(scene, camera);", "  lpBal(); renderer.render(scene, camera);")
# dados
lpj = base64.b64encode(gzip.compress(open("lp.json", "rb").read(), 9)).decode()
lpb = base64.b64encode(open("lp.bin.gz", "rb").read()).decode()
elis = base64.b64encode(open("../elis/elis-a-512.jpg", "rb").read()).decode()
win = base64.b64encode(open("../audio/vitoria.mp3", "rb").read()).decode()
s = s.rstrip() + f'\n<script type="application/octet-stream" id="d-win">{win}</script>\n<script type="application/octet-stream" id="d-elis">{elis}</script>\n<script type="application/octet-stream" id="d-lpj">{lpj}</script>\n<script type="application/octet-stream" id="d-lpb">{lpb}</script>\n'
open(dst, "w", encoding="utf-8").write(s)
print("gerado", dst, round(len(s.encode()) / 1e6, 2), "MB")
