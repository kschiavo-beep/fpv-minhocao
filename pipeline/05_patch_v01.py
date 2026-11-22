# V 0.1: ajustes no simulador atual (malha 2.5D), aplicados como substituições exatas no HTML.
#  - <meta charset="utf-8"> (acentos)
#  - chão fora do mapa invisível por padrão (física continua no nível da rua); opção em Settings
#  - eixo da câmera (axis 4) relativo: defletir muda o ângulo, soltar deixa onde está; T e presets em degraus
# Uso: python 05_patch_v01.py novo.html fpv-minhocao-v0.1.html
import sys

src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, f"esperado {count}x, achei {n}x: {old[:70]!r}"
    s = s.replace(old, new)

# 1) charset + versão no título
rep('<title>FPV Minhocão</title>', '<meta charset="utf-8">\n<title>FPV Minhocão V 0.1</title>')

# 2) chão fora do mapa: invisível por padrão
rep("tiltAxis: 4, tiltEdge: 'rise',", "tiltAxis: 4, tiltEdge: 'rise', camMode: 'relative', camRate: 25, camMin: 0, camMax: 60, outerGround: 'hidden',")
rep("groundObj.position.z = GROUND_Z; world.add(groundObj);",
    "groundObj.position.z = GROUND_Z; world.add(groundObj);\nconst outerObjs = [groundObj];\n"
    "function applyOuter() { for (const o of outerObjs) o.visible = cfg.outerGround === 'visible'; }")
rep("  world.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x5f5d5a, side: THREE.DoubleSide })));\n}",
    "  const sk = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x5f5d5a, side: THREE.DoubleSide }));\n"
    "  world.add(sk); outerObjs.push(sk); applyOuter();\n}")
rep('<div id="tiltPre" style="display:flex;gap:4px;flex-wrap:wrap;margin:2px 0 6px"></div>',
    '<div id="tiltPre" style="display:flex;gap:4px;flex-wrap:wrap;margin:2px 0 6px"></div>\n'
    '  <div class="f"><label>Outside ground</label><select id="outerGround"><option value="hidden">hidden (sky all around)</option>'
    '<option value="visible">visible (street level)</option></select></div>')
rep("  $('crashMode').value = cfg.crashMode;",
    "  $('outerGround').value = cfg.outerGround; $('outerGround').onchange = e => { cfg.outerGround = e.target.value; applyOuter(); save(); };\n"
    "  $('crashMode').value = cfg.crashMode;")

# 3) eixo da câmera: "relative" (padrão) = o eixo MUDA o ângulo enquanto defletido e solta deixa onde está;
#    "absolute" = posição do eixo vira o ângulo; "steps" = comportamento antigo (degraus 20/25/…/45°)
rep('<div class="f"><label>Switches on</label><select id="tiltEdge">',
    '<div class="f"><label>Camera axis</label><select id="camMode">'
    '<option value="relative">relative (push to tilt, release to keep)</option>'
    '<option value="absolute">absolute (axis position = angle)</option>'
    '<option value="steps">steps (switch: 20/25/…/45°)</option></select></div>\n'
    '      <div class="f"><label>Tilt speed °/s</label><input type="number" id="camRate" min="2" max="120" step="1"></div>\n'
    '      <div class="f"><label>Tilt limits °</label><div style="display:flex;gap:4px"><input type="number" id="camMin" min="0" max="80" step="1">'
    '<input type="number" id="camMax" min="0" max="80" step="1"></div></div>\n'
    '      <div class="f"><label>Switches on</label><select id="tiltEdge">')
rep("  $('tiltEdge').value = cfg.tiltEdge;",
    "  $('camMode').value = cfg.camMode; $('camMode').onchange = e => { cfg.camMode = e.target.value; lastTiltAx = null; tiltAxPrev = null; save(); };\n"
    "  for (const k of ['camRate', 'camMin', 'camMax']) { $(k).value = cfg[k]; $(k).oninput = e => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) { cfg[k] = k === 'camRate' ? Math.max(2, Math.min(120, v)) : Math.max(0, Math.min(80, v)); tiltAxPrev = null; save(); } }; }\n"
    "  $('tiltEdge').value = cfg.tiltEdge;")
rep("  if (pad && !tiltDetect && cfg.tiltAxis >= 0 && pad.axes[cfg.tiltAxis] !== undefined) {",
    "  const camLo = Math.min(cfg.camMin, cfg.camMax), camHi = Math.max(cfg.camMin, cfg.camMax);\n"
    "  if (pad && !tiltDetect && cfg.tiltAxis >= 0 && pad.axes[cfg.tiltAxis] !== undefined && cfg.camMode === 'relative') {\n"
    "    // velocidade: fora da zona morta o ângulo anda; no centro fica parado onde está\n"
    "    const v = normAxis(pad, cfg.tiltAxis), a = Math.abs(v), DZ = 0.06;\n"
    "    if (a > DZ) { const d = Math.sign(v) * (a - DZ) / (1 - DZ); tiltMoving = true;\n"
    "      setTiltSoft(Math.max(camLo, Math.min(camHi, cfg.tilt + d * cfg.camRate * dt))); }\n"
    "    else if (tiltMoving) { tiltMoving = false; save(); }\n"
    "  } else if (pad && !tiltDetect && cfg.tiltAxis >= 0 && pad.axes[cfg.tiltAxis] !== undefined && cfg.camMode === 'absolute') {\n"
    "    // absoluto: só assume quando o eixo se mexe, para a tecla T/presets valerem até a próxima mexida\n"
    "    const v = normAxis(pad, cfg.tiltAxis);\n"
    "    if (tiltAxPrev === null || Math.abs(v - tiltAxPrev) > 0.004) { tiltAxPrev = v; setTiltSoft(camLo + (v + 1) / 2 * (camHi - camLo)); }\n"
    "  } else if (pad && !tiltDetect && cfg.tiltAxis >= 0 && pad.axes[cfg.tiltAxis] !== undefined) {")
rep("let lastRstPressed = false, lastTiltPressed = true, lastTiltAx = null, tiltBase = [];",
    "let lastRstPressed = false, lastTiltPressed = true, lastTiltAx = null, tiltBase = [], tiltAxPrev = null, tiltSaveT = 0, tiltMoving = false;")
rep("function markTilt() {",
    "function setTiltSoft(v) { // eixo: sem degrau, aviso discreto, salva no máximo 2x/s\n"
    "  if (Math.abs(v - cfg.tilt) < 1e-4) return;\n"
    "  cfg.tilt = v; $('tilt').value = v; $('vTilt').textContent = v.toFixed(1) + '°'; applyCamera(); markTilt();\n"
    "  flash(`Camera ${Math.round(v)}°`);\n"
    "  const now = performance.now(); if (now - tiltSaveT > 500) { tiltSaveT = now; save(); }\n"
    "}\n"
    "function markTilt() {")
# T: a partir de um ângulo contínuo, vai para o próximo degrau acima
rep("if (e.code === 'KeyT') { const i = TILTS.indexOf(cfg.tilt); setTilt(TILTS[(i + 1) % TILTS.length]); return; }",
    "if (e.code === 'KeyT') { setTilt(TILTS.find(t => t > cfg.tilt + 0.05) ?? TILTS[0]); return; }")
rep("if (hi || cfg.tiltEdge === 'any') { const i = TILTS.indexOf(cfg.tilt); setTilt(TILTS[(i + 1) % TILTS.length]); }",
    "if (hi || cfg.tiltEdge === 'any') { setTilt(TILTS.find(t => t > cfg.tilt + 0.05) ?? TILTS[0]); }")
rep("if (pr && !lastTiltPressed) { const i = TILTS.indexOf(cfg.tilt); setTilt(TILTS[(i + 1) % TILTS.length]); }",
    "if (pr && !lastTiltPressed) { setTilt(TILTS.find(t => t > cfg.tilt + 0.05) ?? TILTS[0]); }")
# "Reset settings" mantém os novos campos do rádio
rep("tiltEdge: cfg.tiltEdge, spawn: cfg.spawn };",
    "tiltEdge: cfg.tiltEdge, camMode: cfg.camMode, camRate: cfg.camRate, camMin: cfg.camMin, camMax: cfg.camMax, spawn: cfg.spawn };")

open(dst, "w", encoding="utf-8").write(s)
print("gerado", dst, round(len(s) / 1e6, 1), "MB")
