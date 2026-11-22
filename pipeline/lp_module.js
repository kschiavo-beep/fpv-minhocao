/* ================= low-poly (V 1) ================= */
// cena estilo N64: chão com mapa de tipos (25 cm) + texturas pequenas geradas aqui, prédios extrudados,
// árvores instanciadas, viaduto com laje, guarda-corpo e pilares. Colisão própria (passa por baixo do viaduto).
const LPJ = JSON.parse(new TextDecoder().decode(await gunzip(b64('d-lpj'))));
const LPB = await gunzip(b64('d-lpb'));
const lpArr = (name, T) => { const L = LPJ.layout[name]; return new T(LPB.buffer.slice(LPB.byteOffset + L.ofs, LPB.byteOffset + L.ofs + L.len)); };
const LPG = lpArr('ground', Uint16Array), LPDT = lpArr('dtop', Uint16Array), LPDB = lpArr('dbot', Uint16Array);
const LPBL = lpArr('bld', Uint16Array), LPTY = lpArr('type', Uint8Array);
const lpz = v => v ? LPJ.hmin + v * 0.01 : NaN;

/* ---------- texturas procedurais (64 px, filtro suave como no N64) ---------- */
const TL = { asphalt: 0, sidewalk: 1, plaza: 2, grass: 3, lot: 4, markw: 5, marky: 6, deck: 7, concrete: 8, roof: 9, telha: 10,
  facLow: 11, facRes: 12, facTower: 13, shop: 14, leaf: 15, bark: 16, facShed: 17, plaster: 18 };
const TS = 64, NL = 19;
function rng32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function makeLayer(id) {
  const P = new Uint8ClampedArray(TS * TS * 4), R = rng32(1000 + id * 77);
  const set = (x, y, r, g, b, a = 255) => { x = ((x % TS) + TS) % TS; y = ((y % TS) + TS) % TS; const k = (y * TS + x) * 4; P[k] = r; P[k + 1] = g; P[k + 2] = b; P[k + 3] = a; };
  const fill = (r, g, b, amp, a = 255) => { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { const n = (R() - 0.5) * amp; set(x, y, r + n, g + n, b + n, a); } };
  const rect = (x0, y0, x1, y1, f) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) f(x, y); };
  const get = (x, y) => { const k = (y * TS + x) * 4; return [P[k], P[k + 1], P[k + 2]]; };
  const shade = (x, y, m) => { const [r, g, b] = get(x, y); set(x, y, r * m, g * m, b * m, P[(y * TS + x) * 4 + 3]); };
  switch (id) {
    case TL.asphalt: fill(66, 68, 72, 16); for (let i = 0; i < 90; i++) { const x = R() * TS | 0, y = R() * TS | 0; set(x, y, 104, 104, 102); } break;
    case TL.sidewalk: fill(182, 178, 170, 12); for (let i = 0; i < TS; i++) { for (const c of [0, 32]) { set(c, i, 128, 124, 118); set(i, c, 128, 124, 118); } } break;
    case TL.plaza: { fill(120, 104, 94, 6); for (let row = 0; row < 8; row++) for (let b = -1; b < 5; b++) { const x0 = b * 16 + (row % 2) * 8, y0 = row * 8, c = 150 + R() * 30;
        rect(x0 + 1, y0 + 1, x0 + 15, y0 + 7, (x, y) => set(x, y, c + (R() - .5) * 10, c * 0.58 + (R() - .5) * 8, c * 0.44 + (R() - .5) * 8)); } break; }
    case TL.grass: fill(80, 126, 52, 26); for (let i = 0; i < 160; i++) { const x = R() * TS | 0, y = R() * TS | 0, l = 2 + R() * 3 | 0, c = R() < .5 ? .8 : 1.2; for (let k = 0; k < l; k++) shade(x, y - k + 64, c); } break;
    case TL.lot: fill(162, 160, 152, 14); for (let i = 0; i < 3; i++) { let x = R() * TS, y = R() * TS; for (let k = 0; k < 40; k++) { x += R() * 2 - .5; y += R() * 2 - 1; shade(x | 0, y | 0, .78); } }
      for (let i = 0; i < 2; i++) { const cx = R() * TS, cy = R() * TS; rect(0, 0, TS, TS, (x, y) => { const d = Math.hypot(x - cx, y - cy); if (d < 7) shade(x, y, .85 + d / 50); }); } break;
    case TL.markw: fill(228, 228, 222, 8); break;
    case TL.marky: fill(226, 184, 44, 8); break;
    case TL.deck: { fill(66, 68, 72, 16); const W = (x, y) => set(x, y, 225, 225, 220), Y = (x, y) => set(x, y, 224, 182, 40);
      for (let y = 0; y < TS; y++) { W(3, y); W(4, y); W(59, y); W(60, y); Y(30, y); Y(33, y); if (y < 30) { W(17, y); W(46, y); } } break; }
    case TL.concrete: fill(152, 151, 146, 14); for (let i = 0; i < 12; i++) { const x = R() * TS | 0, l = 10 + R() * 30 | 0; for (let y = 0; y < l; y++) shade(x, y, .86); } break;
    case TL.roof: fill(150, 148, 142, 18); for (let i = 0; i < 5; i++) { const cx = R() * TS, cy = R() * TS, rr = 4 + R() * 8; rect(0, 0, TS, TS, (x, y) => { if (Math.hypot(x - cx, y - cy) < rr) shade(x, y, .8); }); }
      for (let i = 0; i < TS; i++) { shade(i, 0, .7); shade(0, i, .7); } break;
    case TL.telha: fill(168, 82, 52, 14); for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) { const w = Math.sin((x + (Math.floor(y / 8) % 2) * 3) / 6 * Math.PI * 2) * .12 + 1; shade(x, y, y % 8 === 0 ? .62 : w); } break;
    case TL.facLow: fill(222, 216, 206, 8); rect(18, 14, 46, 44, (x, y) => set(x, y, 236, 236, 232, 0)); rect(21, 17, 43, 41, (x, y) => set(x, y, 58 + y * .4, 70 + y * .4, 84 + y * .3, 0));
      rect(31, 17, 33, 41, (x, y) => set(x, y, 236, 236, 232, 0)); rect(16, 44, 48, 47, (x, y) => set(x, y, 180, 176, 170, 0)); break;
    case TL.facRes: fill(218, 214, 206, 8); rect(0, 46, TS, 52, (x, y) => shade(x, y, .86)); rect(8, 16, 56, 42, (x, y) => set(x, y, 176, 178, 180, 0));
      rect(10, 18, 54, 40, (x, y) => set(x, y, 54 + y * .5, 66 + y * .5, 80 + y * .4, 0)); rect(31, 18, 33, 40, (x, y) => set(x, y, 176, 178, 180, 0)); break;
    case TL.facTower: fill(200, 202, 204, 6); rect(0, 12, TS, TS, (x, y) => set(x, y, 62 + x * .35 + y * .2, 78 + x * .3 + y * .2, 96 + y * .25, 0));
      for (let y = 12; y < TS; y++) { for (const x of [0, 1, 32, 33]) set(x, y, 150, 156, 160, 0); } break;
    case TL.shop: fill(210, 206, 200, 8); rect(0, 0, TS, 12, (x, y) => set(x, y, 190, 60 + (x > 32 ? 70 : 0), 50, 255));
      rect(4, 16, 60, TS, (x, y) => { const c = (y % 4 < 2) ? 150 : 128; set(x, y, c, c + 2, c + 4, 0); }); break;
    case TL.leaf: fill(200, 210, 190, 40); for (let i = 0; i < 60; i++) { const cx = R() * TS, cy = R() * TS, rr = 2 + R() * 4, m = R() < .5 ? .7 : 1.15; rect(0, 0, TS, TS, (x, y) => { if (Math.hypot(x - cx, y - cy) < rr) shade(x, y, m); }); } break;
    case TL.bark: fill(96, 74, 54, 18); for (let i = 0; i < 20; i++) { const x = R() * TS | 0; for (let y = 0; y < TS; y++) shade(x, y, .75); } break;
    case TL.plaster: fill(214, 210, 202, 10); for (let i = 0; i < 14; i++) { const x = R() * TS | 0, l = 8 + R() * 40 | 0; for (let y = 0; y < l; y++) shade(x, y, .93); } break;
    case TL.facShed: fill(196, 198, 196, 6); for (let x = 0; x < TS; x++) if (x % 6 < 2) for (let y = 0; y < TS; y++) shade(x, y, .84); rect(6, 6, 58, 14, (x, y) => set(x, y, 70, 82, 94, 0)); break;
  }
  return P;
}
const LAYERS = []; for (let i = 0; i < NL; i++) LAYERS.push(makeLayer(i));
const arrData = new Uint8Array(TS * TS * 4 * NL); LAYERS.forEach((P, i) => arrData.set(P, i * TS * TS * 4));
const texArr = new THREE.DataArrayTexture(arrData, TS, TS, NL);
texArr.wrapS = texArr.wrapT = THREE.RepeatWrapping; texArr.colorSpace = THREE.SRGBColorSpace; texArr.generateMipmaps = true;
const canvasTex = id => { const t = new THREE.DataTexture(LAYERS[id], TS, TS); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; t.flipY = false; return t; };
const TEX = { deck: canvasTex(TL.deck), asphalt: canvasTex(TL.asphalt), concrete: canvasTex(TL.concrete), leaf: canvasTex(TL.leaf), bark: canvasTex(TL.bark), sidewalk: canvasTex(TL.sidewalk) };
/* ---------- murais de rua (V 2): 6 linguagens x 26 assuntos, um par único por empena ---------- */
// Tese validada: arte de rua paulistana em 64x128 px; tudo liberado, exceto fonte do sistema (texto = fonte bitmap 5x7 própria).
const MW = 64, MH = 128;
const FONT = (() => {
  const G = {
    A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110', C: '01110 10001 10000 10000 10000 10001 01110',
    D: '11110 10001 10001 10001 10001 10001 11110', E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
    G: '01110 10001 10000 10111 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001', I: '01110 00100 00100 00100 00100 00100 01110',
    J: '00111 00010 00010 00010 00010 10010 01100', K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
    M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 11001 10101 10011 10001 10001 10001', O: '01110 10001 10001 10001 10001 10001 01110',
    P: '11110 10001 10001 11110 10000 10000 10000', Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
    S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100', U: '10001 10001 10001 10001 10001 10001 01110',
    V: '10001 10001 10001 10001 10001 01010 00100', W: '10001 10001 10001 10101 10101 10101 01010', X: '10001 10001 01010 00100 01010 10001 10001',
    Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
    0: '01110 10001 10011 10101 11001 10001 01110', 1: '00100 01100 00100 00100 00100 00100 01110', 2: '01110 10001 00001 00010 00100 01000 11111',
    3: '11110 00001 00001 01110 00001 00001 11110', 4: '00010 00110 01010 10010 11111 00010 00010', 5: '11111 10000 11110 00001 00001 10001 01110',
    6: '00110 01000 10000 11110 10001 10001 01110', 7: '11111 00001 00010 00100 01000 01000 01000', 8: '01110 10001 10001 01110 10001 10001 01110',
    9: '01110 10001 10001 01111 00001 00010 01100', '!': '00100 00100 00100 00100 00100 00000 00100', '?': '01110 10001 00001 00010 00100 00000 00100',
    '.': '00000 00000 00000 00000 00000 01100 01100', ',': '00000 00000 00000 00000 01100 00100 01000', '-': '00000 00000 00000 11111 00000 00000 00000',
    ':': '00000 01100 01100 00000 01100 01100 00000', '$': '00100 01111 10100 01110 00101 11110 00100', "'": '00100 00100 01000 00000 00000 00000 00000',
    '(': '00010 00100 01000 01000 01000 00100 00010', ')': '01000 00100 00010 00010 00010 00100 01000', '/': '00001 00010 00010 00100 01000 01000 10000',
    ' ': '00000 00000 00000 00000 00000 00000 00000', '♥': '00000 01010 11111 11111 01110 00100 00000', '%': '11001 11010 00010 00100 01000 01011 10011',
  };
  const out = {};
  for (const [k, v] of Object.entries(G)) out[k] = v.split(' ').map(r => [...r].map(c => c === '1'));
  const ACC = { 'Ã': ['A', '~'], 'Õ': ['O', '~'], 'Á': ['A', "'"], 'É': ['E', "'"], 'Í': ['I', "'"], 'Ó': ['O', "'"], 'Ú': ['U', "'"], 'Ê': ['E', '^'], 'Ô': ['O', '^'], 'Â': ['A', '^'], 'À': ['A', "'"], 'Ç': ['C', ','] };
  for (const [k, [b, a]] of Object.entries(ACC)) out[k] = { base: out[b], acc: a };
  return out;
})();
// desenha texto na fonte bitmap; sx/sy = tamanho do "pixel" da fonte; tall = pixo (alongado, com espora)
function bmText(g, str, x, y, sx, sy, col, opt = {}) {
  let cx = x;
  for (const ch of str) {
    let gl = FONT[ch] || FONT['?'], acc = null;
    if (gl.base) { acc = gl.acc; gl = gl.base; }
    g.fillStyle = col;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (gl[r][c]) {
      g.fillRect(cx + c * sx, y + r * sy, sx, sy);
      if (opt.tall && r === 0 && (c === 0 || c === 4)) g.fillRect(cx + c * sx, y - sy, sx, sy);           // espora do pixo
    }
    if (acc === '~') { g.fillRect(cx + sx, y - 2 * sy, sx, sy); g.fillRect(cx + 2 * sx, y - 3 * sy, sx, sy); g.fillRect(cx + 3 * sx, y - 2 * sy, sx, sy); }
    else if (acc === "'") { g.fillRect(cx + 2 * sx, y - 2 * sy, sx, sy); g.fillRect(cx + 3 * sx, y - 3 * sy, sx, sy); }
    else if (acc === '^') { g.fillRect(cx + 1 * sx, y - 2 * sy, sx, sy); g.fillRect(cx + 2 * sx, y - 3 * sy, sx, sy); g.fillRect(cx + 3 * sx, y - 2 * sy, sx, sy); }
    else if (acc === ',') { g.fillRect(cx + 2 * sx, y + 7 * sy, sx, sy); g.fillRect(cx + 1 * sx, y + 8 * sy, sx, sy); }
    cx += (opt.adv || 6) * sx;
  }
  return cx - x;
}
function wrap(str, maxc) {
  // quebra só entre palavras: palavra nunca é cortada (se não couber, quem resolve é o textBlock)
  const out = []; let line = '';
  for (const w of str.split(' ')) {
    if (!line) line = w; else if ((line + ' ' + w).length <= maxc) line += ' ' + w; else { out.push(line); line = w; }
  }
  if (line) out.push(line);
  return out;
}
// bloco de texto centrado na largura w; devolve a altura usada
function textBlock(g, str, x, y, w, s, col, opt = {}) {
  const longest = Math.max(...str.split(' ').map(t => t.length));
  const fits = sc => {
    const maxc = Math.max(1, Math.floor((w + sc) / (6 * sc))), n = wrap(str, maxc).length, lh = 7 * (opt.tall ? sc * 3 : sc) + (opt.tall ? 2 * sc : 3 * sc);
    return longest * 6 * sc - sc <= w && (!opt.maxH || n * lh <= opt.maxH);
  };
  while (s > 1 && !fits(s)) s--;                       // 1º: diminui a letra
  const sy = opt.tall ? s * 3 : s, maxc = Math.max(1, Math.floor((w + s) / (6 * s)));
  const lines = wrap(str, maxc), lh = 7 * sy + (opt.tall ? 2 * s : 3 * s);
  lines.forEach((l, i) => {
    let adv = 6, tw = l.length * adv * s - s;
    if (tw > w) { adv = 5; tw = l.length * adv * s; }   // 2º: aperta o espaço entre letras
    const sq = tw > w ? w / tw : 1;                      // 3º: comprime na horizontal (palavra inteira)
    const lx = x + Math.max(0, Math.round((w - tw * sq) / 2)), ly = y + i * lh;
    g.save(); g.translate(lx, 0); g.scale(sq, 1);
    if (opt.shadow) bmText(g, l, s, ly + s, s, sy, opt.shadow, { ...opt, adv });
    bmText(g, l, 0, ly, s, sy, col, { ...opt, adv });
    g.restore();
  });
  return lines.length * lh;
}

/* ---- assuntos: cada um desenha no centro (x,y) com escala s; cores: a = principal, b = detalhe, k = tinta/contorno ---- */
function muralPen(g, a, b, k, outline) {
  const done = () => { if (outline) { g.strokeStyle = k; g.lineWidth = outline; g.stroke(); } };
  return {
    E(x, y, rx, ry, c = a, rot = 0) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); g.fill(); done(); },
    R(x, y, w, h, c = a) { g.fillStyle = c; g.beginPath(); g.rect(x, y, w, h); g.fill(); done(); },
    P(pts, c = a) { g.fillStyle = c; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath(); g.fill(); done(); },
    L(pts, c = k, w = 2) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.stroke(); },
    D(x, y, r, c = k) { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); },
    a, b, k,
  };
}
const SUBJ = [
  ['RATO', (p, x, y, s) => { p.E(x - 2 * s, y + 4 * s, 16 * s, 10 * s); p.P([[x + 12 * s, y - 4 * s], [x + 26 * s, y + 4 * s], [x + 12 * s, y + 10 * s]]); p.D(x + 12 * s, y - 6 * s, 5 * s, p.b); p.D(x + 19 * s, y + 1 * s, 1.5 * s);
    p.L([[x - 17 * s, y + 6 * s], [x - 26 * s, y + 14 * s], [x - 20 * s, y + 22 * s]], p.b, 2 * s); },
    ['RATO CREW', 'O RATO DO METRÔ MANDA AQUI', 'RATO TAMBÉM PAGA PASSAGEM']],
  ['PÃO DE QUEIJO', (p, x, y, s) => { for (const [dx, dy, r] of [[-10, 6, 10], [10, 6, 10], [0, -8, 11]]) { p.D(x + dx * s, y + dy * s, r * s, p.a); p.D(x + (dx - 3) * s, y + (dy - 3) * s, 3 * s, p.b); } },
    ['PÃO DE QUEIJO QUENTINHO', 'UAI, SÔ', 'MAIS UM PÃO DE QUEIJO?']],
  ['GAROA', (p, x, y, s) => { p.D(x - 10 * s, y - 8 * s, 10 * s, p.a); p.D(x + 6 * s, y - 12 * s, 13 * s, p.a); p.D(x + 16 * s, y - 4 * s, 9 * s, p.a); p.R(x - 18 * s, y - 6 * s, 38 * s, 8 * s);
    for (let i = 0; i < 9; i++) p.L([[x + (-16 + i * 4) * s, y + (6 + (i % 3) * 4) * s], [x + (-18 + i * 4) * s, y + (12 + (i % 3) * 4) * s]], p.b, 1.5 * s); },
    ['TERRA DA GAROA', 'GAROA NÃO É CHUVA', 'LEVA O GUARDA-CHUVA']],
  ['DRONE', (p, x, y, s) => { p.L([[x - 18 * s, y - 14 * s], [x + 18 * s, y + 14 * s]], p.k, 4 * s); p.L([[x + 18 * s, y - 14 * s], [x - 18 * s, y + 14 * s]], p.k, 4 * s); p.R(x - 7 * s, y - 5 * s, 14 * s, 10 * s);
    for (const [dx, dy] of [[-18, -14], [18, -14], [-18, 14], [18, 14]]) p.E(x + dx * s, y + dy * s, 11 * s, 3 * s, p.b); p.D(x, y - 2 * s, 2 * s, '#e33'); },
    ['CONSERTA-SE DRONE', 'DRONE NÃO É POMBO', 'PROIBIDO DRONE (MENOS VOCÊ)']],
  ['POMBO', (p, x, y, s) => { p.E(x, y + 4 * s, 16 * s, 11 * s); p.E(x + 12 * s, y - 8 * s, 7 * s, 7 * s); p.E(x + 9 * s, y - 2 * s, 5 * s, 4 * s, p.b);
    p.P([[x + 18 * s, y - 9 * s], [x + 24 * s, y - 7 * s], [x + 18 * s, y - 5 * s]], p.k); p.D(x + 14 * s, y - 10 * s, 1.5 * s); p.L([[x - 2 * s, y + 14 * s], [x - 4 * s, y + 20 * s]]); p.L([[x + 4 * s, y + 14 * s], [x + 5 * s, y + 20 * s]]); },
    ['POMBO NÃO PAGA ALUGUEL', 'CUIDADO: POMBO ARMADO', 'POMBO DE 40M', 'O POMBO TE VIU']],
  ['CAPIVARA', (p, x, y, s) => { p.E(x - 2 * s, y + 4 * s, 20 * s, 12 * s); p.R(x + 10 * s, y - 12 * s, 16 * s, 13 * s); p.D(x + 12 * s, y - 13 * s, 3 * s, p.b); p.D(x + 22 * s, y - 7 * s, 1.5 * s); p.R(x + 23 * s, y - 4 * s, 3 * s, 3 * s, p.k);
    for (const dx of [-14, -4, 6, 12]) p.R(x + dx * s, y + 13 * s, 4 * s, 8 * s); },
    ['CAPIVARA PRESIDENTE', 'CALMA. SEJA CAPIVARA.', 'CAPIVARA NÃO TEM BOLETO']],
  ['CARAMELO', (p, x, y, s) => { p.E(x - 2 * s, y + 4 * s, 18 * s, 9 * s); p.E(x + 16 * s, y - 6 * s, 8 * s, 7 * s); p.P([[x + 11 * s, y - 12 * s], [x + 14 * s, y - 20 * s], [x + 17 * s, y - 12 * s]], p.b);
    p.L([[x - 19 * s, y], [x - 26 * s, y - 10 * s]], p.a, 3 * s); for (const dx of [-14, -6, 4, 10]) p.L([[x + dx * s, y + 10 * s], [x + dx * s, y + 20 * s]], p.a, 3 * s); p.D(x + 19 * s, y - 8 * s, 1.5 * s); p.D(x + 23 * s, y - 4 * s, 2 * s); },
    ['ADOTE UM CARAMELO', 'CARAMELO SABE O CAMINHO', 'CARAMELO, O CÃO DO POVO']],
  ['PASTEL', (p, x, y, s) => { p.R(x - 20 * s, y - 12 * s, 40 * s, 24 * s); for (let i = -18; i <= 18; i += 4) { p.D(x + i * s, y - 12 * s, 1.5 * s, p.b); p.D(x + i * s, y + 12 * s, 1.5 * s, p.b); } p.D(x - 6 * s, y - 2 * s, 3 * s, p.b); p.D(x + 7 * s, y + 3 * s, 2 * s, p.b); },
    ['PASTEL DE VENTO R$ 15', 'PROIBIDO PENSAR EM PASTEL', 'TEM PASTEL? TEM.']],
  ['COXINHA', (p, x, y, s) => { p.P([[x, y - 22 * s], [x + 15 * s, y + 4 * s], [x - 15 * s, y + 4 * s]]); p.E(x, y + 8 * s, 16 * s, 12 * s); for (let i = 0; i < 6; i++) p.D(x - 10 * s + i * 4 * s, y + 6 * s + (i % 2) * 5 * s, 1.2 * s, p.b); },
    ['COXINHA DE ONTEM: 2 POR 5', 'ACEITAMOS COXINHA COMO PAGAMENTO', 'FIADO SÓ AMANHÃ']],
  ['OVO', (p, x, y, s) => { // carro do ovo: perua com alto-falante e bandeja de ovos
    p.R(x - 24 * s, y - 8 * s, 48 * s, 20 * s); p.R(x + 6 * s, y - 18 * s, 16 * s, 10 * s); p.R(x + 8 * s, y - 16 * s, 12 * s, 6 * s, p.b);
    p.P([[x - 14 * s, y - 14 * s], [x - 4 * s, y - 22 * s], [x - 4 * s, y - 8 * s]], p.k); p.R(x - 18 * s, y - 12 * s, 5 * s, 4 * s, p.k);
    for (let i = 0; i < 5; i++) p.E(x + (-20 + i * 6) * s, y - 2 * s, 2.5 * s, 3.5 * s, '#fff'); p.D(x - 14 * s, y + 13 * s, 5 * s); p.D(x + 14 * s, y + 13 * s, 5 * s); },
    ['OLHA O OVO! 30 OVOS POR 10 REAIS', 'É O CARRO DO OVO', 'OVO GRANDE, OVO BRANCO, OVO VERMELHO']],
  ['PAMONHA', (p, x, y, s) => { p.P([[x - 14 * s, y - 20 * s], [x + 14 * s, y - 20 * s], [x + 10 * s, y + 20 * s], [x - 10 * s, y + 20 * s]]);
    for (const dx of [-8, 0, 8]) p.L([[x + dx * s, y - 20 * s], [x + dx * 0.7 * s, y + 20 * s]], p.b, 1.5 * s); p.L([[x - 13 * s, y - 4 * s], [x + 12 * s, y - 4 * s]], p.k, 2 * s); p.L([[x - 11 * s, y + 10 * s], [x + 11 * s, y + 10 * s]], p.k, 2 * s); },
    ['PAMONHAS, PAMONHAS, PAMONHAS', 'É O PURO CREME DO MILHO', 'PAMONHA DE PIRACICABA']],
  ['BONECO', (p, x, y, s) => { // boneco de posto dançando
    p.L([[x, y + 26 * s], [x - 6 * s, y + 10 * s], [x + 5 * s, y - 4 * s], [x - 2 * s, y - 18 * s]], p.a, 10 * s);
    p.L([[x + 2 * s, y - 2 * s], [x + 20 * s, y - 14 * s], [x + 24 * s, y - 26 * s]], p.a, 5 * s); p.L([[x - 2 * s, y + 2 * s], [x - 20 * s, y + 8 * s], [x - 26 * s, y - 4 * s]], p.a, 5 * s);
    p.D(x - 5 * s, y - 20 * s, 2 * s, '#fff'); p.D(x + 1 * s, y - 20 * s, 2 * s, '#fff'); p.D(x - 5 * s, y - 20 * s, 1 * s); p.D(x + 1 * s, y - 20 * s, 1 * s); p.R(x - 8 * s, y + 24 * s, 16 * s, 4 * s, p.k); },
    ['DANÇA, BONECO, DANÇA', 'BONECO DE POSTO DO MÊS', 'ELE SÓ QUERIA UM ABRAÇO']],
  ['FEIJÃO', (p, x, y, s) => { // pote de sorvete... com feijão
    p.P([[x - 22 * s, y - 8 * s], [x + 22 * s, y - 8 * s], [x + 18 * s, y + 18 * s], [x - 18 * s, y + 18 * s]], '#fff'); p.R(x - 24 * s, y - 14 * s, 48 * s, 7 * s, p.b);
    for (let i = 0; i < 16; i++) p.E(x + (-14 + (i % 8) * 4) * s, y + (-2 + Math.floor(i / 8) * 6) * s, 2 * s, 1.4 * s, '#5a2a14'); p.R(x - 10 * s, y + 8 * s, 20 * s, 6 * s, p.a); },
    ['ABRI O SORVETE: ERA FEIJÃO', 'NÃO É SORVETE', 'SORVETE SABOR FEIJÃO DA MÃE']],
  ['SACOLA', (p, x, y, s) => { p.P([[x - 16 * s, y - 10 * s], [x + 16 * s, y - 10 * s], [x + 20 * s, y + 22 * s], [x - 20 * s, y + 22 * s]], '#f4f4f4');
    p.L([[x - 10 * s, y - 10 * s], [x - 8 * s, y - 22 * s], [x - 2 * s, y - 10 * s]], '#f4f4f4', 3 * s); p.L([[x + 2 * s, y - 10 * s], [x + 8 * s, y - 22 * s], [x + 10 * s, y - 10 * s]], '#f4f4f4', 3 * s);
    for (const [dx, dy, c] of [[-8, -12, p.a], [4, -14, p.b], [-2, -16, '#e3342f']]) p.E(x + dx * s, y + dy * s, 6 * s, 4 * s, c); },
    ['SACOLA DE SACOLAS', 'GUARDE AS SACOLINHAS', 'UM DIA VOCÊ VAI PRECISAR']],
  ['CHINELO', (p, x, y, s) => { p.E(x, y, 12 * s, 24 * s, p.a, 0.5); p.L([[x - 10 * s, y + 2 * s], [x, y - 12 * s], [x + 10 * s, y + 2 * s]], p.b, 4 * s);
    for (const dy of [-20, -10, 0]) p.L([[x - 26 * s, y + (dy + 14) * s], [x - 16 * s, y + (dy + 10) * s]], p.k, 1.5 * s); },
    ['A MÃE ATIROU', 'CHINELO TELEGUIADO', 'CORRE QUE ELA CONTOU ATÉ 3']],
  ['ET', (p, x, y, s) => { p.E(x, y - 8 * s, 16 * s, 18 * s); p.E(x - 7 * s, y - 8 * s, 6 * s, 9 * s, p.k, -0.4); p.E(x + 7 * s, y - 8 * s, 6 * s, 9 * s, p.k, 0.4);
    p.R(x - 5 * s, y + 10 * s, 10 * s, 14 * s); p.L([[x - 5 * s, y + 14 * s], [x - 14 * s, y + 22 * s]], p.a, 3 * s); p.L([[x + 5 * s, y + 14 * s], [x + 14 * s, y + 22 * s]], p.a, 3 * s); },
    ['O ET ESTÁ ENTRE NÓS', 'VARGINHA 96', 'ACREDITE NO ET DE VARGINHA']],
  ['SACI', (p, x, y, s) => { // redemoinho com gorro vermelho e cachimbo (sem caricatura de pessoa)
    for (let i = 0; i < 6; i++) p.E(x + Math.sin(i) * 3 * s, y + (18 - i * 7) * s, (4 + i * 3) * s, 3 * s, 'rgba(0,0,0,0)'), p.L([[x - (4 + i * 3) * s, y + (18 - i * 7) * s], [x + (4 + i * 3) * s, y + (16 - i * 7) * s]], p.b, 2 * s);
    p.P([[x - 10 * s, y - 24 * s], [x + 12 * s, y - 24 * s], [x + 18 * s, y - 38 * s]], '#d62828'); p.R(x + 12 * s, y - 22 * s, 8 * s, 3 * s, '#7a4a22'); p.R(x + 18 * s, y - 27 * s, 4 * s, 6 * s, '#7a4a22');
    p.D(x + 21 * s, y - 31 * s, 2 * s, '#ddd'); p.D(x + 23 * s, y - 35 * s, 1.5 * s, '#ddd'); },
    ['PERDEU A MEIA? FOI O SACI', 'SACI VIU TUA MEIA', 'CUIDADO COM O REDEMOINHO']],
  ['MULA', (p, x, y, s) => { p.E(x, y + 2 * s, 20 * s, 10 * s); for (const dx of [-14, -8, 8, 14]) p.R(x + dx * s, y + 8 * s, 4 * s, 14 * s); p.R(x + 14 * s, y - 10 * s, 8 * s, 12 * s);
    p.P([[x + 13 * s, y - 10 * s], [x + 16 * s, y - 26 * s], [x + 19 * s, y - 14 * s], [x + 22 * s, y - 24 * s], [x + 23 * s, y - 10 * s]], '#ff7b00'); p.L([[x - 20 * s, y], [x - 26 * s, y + 12 * s]], p.a, 3 * s); },
    ['PROCURA-SE CABEÇA', 'MULA SEM CABEÇA, COM BONÉ', 'ACHOU UMA CABEÇA? LIGUE']],
  ['PAVÊ', (p, x, y, s) => { p.R(x - 22 * s, y - 10 * s, 44 * s, 26 * s, 'rgba(255,255,255,.35)'); p.R(x - 20 * s, y + 6 * s, 40 * s, 8 * s, '#c58b4c'); p.R(x - 20 * s, y - 2 * s, 40 * s, 8 * s, '#fff1c1'); p.R(x - 20 * s, y - 8 * s, 40 * s, 6 * s, '#5a2e12');
    for (let i = -16; i <= 16; i += 8) p.D(x + i * s, y - 9 * s, 2.5 * s, '#d62828'); p.L([[x + 16 * s, y - 14 * s], [x + 28 * s, y - 28 * s]], '#aaa', 2.5 * s); },
    ['É PAVÊ OU PRA COMER?', 'PAVÊ OU PACUMÊ?', 'CHEGOU O TIO DO PAVÊ']],
  ['UVA PASSA', (p, x, y, s) => { p.E(x, y + 6 * s, 26 * s, 9 * s, '#fff'); p.E(x, y + 2 * s, 20 * s, 9 * s, '#f6f1df'); for (let i = 0; i < 9; i++) p.D(x + (-14 + (i * 7) % 28) * s, y + (-2 + (i % 3) * 3) * s, 1.8 * s, '#3b1f3a');
    p.L([[x - 22 * s, y - 12 * s], [x + 22 * s, y + 18 * s]], '#d62828', 3 * s); p.L([[x + 22 * s, y - 12 * s], [x - 22 * s, y + 18 * s]], '#d62828', 3 * s); },
    ['UVA PASSA NO ARROZ? NÃO.', 'CRIME DE NATAL', 'TIRA A UVA PASSA']],
  ['FUSCA', (p, x, y, s) => { p.E(x, y, 24 * s, 14 * s, '#2b6cd4'); p.R(x - 26 * s, y, 52 * s, 10 * s, '#2b6cd4'); p.E(x - 2 * s, y - 6 * s, 12 * s, 7 * s, p.b);
    p.D(x - 14 * s, y + 10 * s, 6 * s); p.D(x + 14 * s, y + 10 * s, 6 * s); p.D(x + 22 * s, y + 2 * s, 2.5 * s, '#ffd23f'); },
    ['FUSCA AZUL! SEM REVIDE', 'TAPA LIBERADO', 'FUSCA AZUL A 200M']],
  ['ORELHÃO', (p, x, y, s) => { p.R(x - 2 * s, y + 6 * s, 4 * s, 22 * s, p.k); p.E(x, y - 4 * s, 16 * s, 20 * s); p.E(x, y, 10 * s, 13 * s, p.b); p.R(x - 4 * s, y - 4 * s, 8 * s, 10 * s, p.k); },
    ['ALÔ, É DA PADARIA?', 'O PÃOZINHO JÁ SAIU?', 'FICHA? QUE FICHA?']],
  ['CAFEZINHO', (p, x, y, s) => { p.P([[x - 11 * s, y - 14 * s], [x + 11 * s, y - 14 * s], [x + 8 * s, y + 16 * s], [x - 8 * s, y + 16 * s]], p.b); p.P([[x - 10 * s, y - 6 * s], [x + 10 * s, y - 6 * s], [x + 8 * s, y + 16 * s], [x - 8 * s, y + 16 * s]]);
    for (let i = -8; i <= 8; i += 4) p.L([[x + i * s, y - 13 * s], [x + i * 0.8 * s, y + 15 * s]], 'rgba(255,255,255,.5)', 1); p.L([[x - 2 * s, y - 18 * s], [x + 2 * s, y - 24 * s], [x - 1 * s, y - 30 * s]], p.b, 1.5 * s); },
    ['CAFÉ PINGADO 2 REAIS', 'COPO AMERICANO É INDESTRUTÍVEL', 'MAIS UM CAFEZINHO?']],
  ['GALINHA', (p, x, y, s) => { p.E(x, y + 4 * s, 18 * s, 14 * s, '#5b5f66'); for (let i = 0; i < 14; i++) p.D(x + (-12 + (i * 5) % 24) * s, y + (-4 + (i % 4) * 4) * s, 1.2 * s, '#fff');
    p.D(x + 16 * s, y - 10 * s, 5 * s, '#5b5f66'); p.P([[x + 20 * s, y - 11 * s], [x + 26 * s, y - 9 * s], [x + 20 * s, y - 7 * s]], '#e9a23b'); p.R(x + 14 * s, y - 18 * s, 3 * s, 4 * s, '#d62828'); },
    ['TÔ FRACO! TÔ FRACO!', 'A GALINHA D\'ANGOLA AVISOU', 'TÔ FRACO, TÔ FRACO']],
  ['PIPA', (p, x, y, s) => { p.P([[x, y - 26 * s], [x + 16 * s, y - 6 * s], [x, y + 14 * s], [x - 16 * s, y - 6 * s]]); p.L([[x, y - 26 * s], [x, y + 14 * s]], p.b, 1.5 * s); p.L([[x - 16 * s, y - 6 * s], [x + 16 * s, y - 6 * s]], p.b, 1.5 * s);
    p.L([[x, y + 14 * s], [x - 6 * s, y + 22 * s], [x + 4 * s, y + 28 * s], [x - 4 * s, y + 34 * s]], p.k, 1.5 * s); },
    ['OLHA O CEROL', 'APARA!', 'PIPA NO FIO NÃO SE PEGA']],
  ['ANTENA', (p, x, y, s) => { p.R(x - 16 * s, y + 10 * s, 32 * s, 14 * s, '#444'); p.R(x - 13 * s, y + 12 * s, 22 * s, 10 * s, '#9fb4c8');
    p.L([[x, y + 10 * s], [x - 16 * s, y - 22 * s]], '#aaa', 2 * s); p.L([[x, y + 10 * s], [x + 16 * s, y - 22 * s]], '#aaa', 2 * s);
    p.D(x - 16 * s, y - 24 * s, 5 * s, '#c9c9c9'); p.D(x + 16 * s, y - 24 * s, 5 * s, '#c9c9c9'); for (let i = 0; i < 10; i++) p.D(x + (i % 2 ? 16 : -16) * s + Math.cos(i) * 3 * s, y - 24 * s + Math.sin(i * 2) * 3 * s, 1 * s, '#888'); },
    ['PALHA DE AÇO NA ANTENA: SINAL 100%', 'MEXE A ANTENA AÍ!', 'TÁ CHIANDO']],
];
const PIXO = ['OS {S}', '{S} CREW', 'TURMA DO {S}', 'FAMÍLIA {S}', '{S}ZERA', 'REI DO {S}', '{S} ZL', 'BONDE DO {S}'];
// ---------- Elis: cartaz serigrafado gerado (gpt-image 2.6 via Higgsfield, só a partir de texto) + faixa com nome na fonte bitmap ----------
const ELIS_IMG = await new Promise(res => { const el = document.getElementById('d-elis'); if (!el) return res(null);
  const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'data:image/jpeg;base64,' + el.textContent.trim(); });
function drawElisHi() {
  const W = 512, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  g.fillStyle = '#f3e3c8'; g.fillRect(0, 0, W, H);
  if (ELIS_IMG) g.drawImage(ELIS_IMG, 0, 0, W, 912);
  g.fillStyle = '#1c1412'; g.fillRect(0, 912, W, 112); g.fillStyle = '#d7442e'; g.fillRect(0, 912, W, 6);
  textBlock(g, 'ELIS', 40, 930, W - 80, 9, '#f3e3c8', { shadow: '#d7442e' });
  textBlock(g, 'REGINA', 40, 1002, W - 80, 2, '#d7442e');
  return cv;
}

// ---------- murais N64 (V 2b): 32 murais reaproveitados, facetas low-poly + meio-tom + lowbit ----------
// Pedido do usuário: menos "Atari", mais N64; pode repetir para economizar memória; manter o nonsense.
// Técnica: o assunto é desenhado numa camada, a silhueta vira um mapa de altura (alfa borrado), a normal é
// QUANTIZADA em poucas direções (= facetas de low-poly) e iluminada; fundo em degradê com sol de meio-tom;
// letreiro extrudado com degradê (logo de jogo); no fim, posterização com dither Bayer (lowbit).
const NW = 128, NH = 256, NUM_MUR = 32;
const N64PAL = [
  ['#1b4fd8', '#68c7ff', '#ffd23f', '#ff4d6d'], ['#ff7a00', '#ffd166', '#2b2d42', '#ef233c'], ['#2a9d8f', '#e9f5db', '#f4a261', '#264653'],
  ['#6a00f4', '#ff4fd8', '#ffe66d', '#00f5d4'], ['#d00000', '#ffba08', '#03071e', '#faa307'], ['#0f5257', '#7bdff2', '#f7d6e0', '#ff5d8f'],
  ['#3a0ca3', '#4cc9f0', '#f72585', '#ffd60a'], ['#386641', '#a7c957', '#f2e8cf', '#bc4749'], ['#003049', '#fcbf49', '#d62828', '#eae2b7'],
];
function n64Blur(A, w, h, r) {
  const T = new Float32Array(w * h), O = new Float32Array(w * h);
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += A[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) { T[y * w + x] = s / (2 * r + 1); s += A[y * w + Math.min(w - 1, x + r + 1)] - A[y * w + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += T[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) { O[y * w + x] = s / (2 * r + 1); s += T[Math.min(h - 1, y + r + 1) * w + x] - T[Math.max(0, y - r) * w + x]; } }
  return O;
}
// desenha um assunto com facetas low-poly sombreadas + sombra projetada em meio-tom
function n64Subject(g, draw, x, y, s, ca, cb, ink) {
  const L = document.createElement('canvas'); L.width = NW; L.height = NH; const lg = L.getContext('2d');
  draw(muralPen(lg, ca, cb, ink, 0), x, y, s);
  const im = lg.getImageData(0, 0, NW, NH), d = im.data, A = new Float32Array(NW * NH);
  for (let i = 0; i < NW * NH; i++) A[i] = d[i * 4 + 3] / 255;
  const Hm = n64Blur(n64Blur(A, NW, NH, 3), NW, NH, 2);
  // sombra projetada: pontos de meio-tom deslocados para baixo/direita
  g.fillStyle = 'rgba(0,0,0,.45)';
  for (let yy = 0; yy < NH; yy += 3) for (let xx = (yy / 3 % 2) * 1.5; xx < NW; xx += 3) {
    const sx = Math.round(xx - 6), sy = Math.round(yy - 7); if (sx < 0 || sy < 0) continue;
    const a = A[sy * NW + sx]; if (a > 0.3) { g.beginPath(); g.arc(xx, yy, 1.3, 0, 7); g.fill(); }
  }
  const lx = -0.5, ly = -0.62, lz = 0.6, ln = Math.hypot(lx, ly, lz);
  for (let yy = 1; yy < NH - 1; yy++) for (let xx = 1; xx < NW - 1; xx++) {
    const i = yy * NW + xx; if (A[i] < 0.02) continue;
    let nx = -(Hm[i + 1] - Hm[i - 1]), ny = -(Hm[i + NW] - Hm[i - NW]), nz = 0.18;
    // quantiza a normal: 8 direções x 2 inclinações = facetas
    const ang = Math.round(Math.atan2(ny, nx) / (Math.PI / 4)) * (Math.PI / 4), sl = Math.hypot(nx, ny) > 0.05 ? 0.75 : (Math.hypot(nx, ny) > 0.012 ? 0.35 : 0);
    nx = Math.cos(ang) * sl; ny = Math.sin(ang) * sl; nz = 1 - sl * 0.55; const nn = Math.hypot(nx, ny, nz);
    const dt = (nx * lx + ny * ly + nz * lz) / (nn * ln), f = 0.42 + 0.78 * Math.max(0, dt), spec = dt > 0.97 ? 55 : 0;
    d[i * 4] = Math.min(255, d[i * 4] * f + spec); d[i * 4 + 1] = Math.min(255, d[i * 4 + 1] * f + spec); d[i * 4 + 2] = Math.min(255, d[i * 4 + 2] * f + spec);
  }
  lg.putImageData(im, 0, 0); g.drawImage(L, 0, 0);
}
// letreiro extrudado com degradê (logo de cartucho)
function n64Title(g, str, y, maxH, c1, c2, dark) {
  const tmp = document.createElement('canvas'); tmp.width = NW; tmp.height = NH; const tg = tmp.getContext('2d');
  const h = textBlock(tg, str, 8, y, NW - 16, 3, '#000', { maxH });
  const grad = g.createLinearGradient(0, y, 0, y + h); grad.addColorStop(0, c1); grad.addColorStop(1, c2);
  for (let k = 4; k >= 1; k--) textBlock(g, str, 8 + k, y + k, NW - 16, 3, dark, { maxH });
  textBlock(g, str, 8, y, NW - 16, 3, grad, { maxH });
  return h;
}
function n64Finish(g) { // lowbit: 5 níveis por canal com dither Bayer 4x4
  const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], lv = 5, im = g.getImageData(0, 0, NW, NH), d = im.data;
  for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) {
    const k = (y * NW + x) * 4, t = (B[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5;
    for (let c = 0; c < 3; c++) d[k + c] = Math.max(0, Math.min(255, Math.round((d[k + c] / 255) * (lv - 1) + t) / (lv - 1) * 255));
  }
  g.putImageData(im, 0, 0);
}
function drawN64Mural(m) {
  const cv = document.createElement('canvas'); cv.width = NW; cv.height = NH; const g = cv.getContext('2d');
  const R = rng32(4242 + m * 977), pick = a => a[Math.floor(R() * a.length)];
  // os 26 assuntos aparecem; as 6 vagas extras vão para os favoritos do usuário
  const FAV = ['BONECO', 'RATO', 'DRONE', 'GAROA', 'PÃO DE QUEIJO', 'ORELHÃO'];
  const si = m < SUBJ.length ? (m * 11) % SUBJ.length : SUBJ.findIndex(t => t[0] === FAV[m - SUBJ.length]);
  const [name, draw, lines] = SUBJ[si], [c0, c1, c2, c3] = N64PAL[m % N64PAL.length], layout = m % 4;
  const phrase = (layout === 3 && R() < 0.6) ? pick(PIXO).replace('{S}', name) : pick(lines);
  // fundo: degradê de céu de N64 + sol de meio-tom
  const bg = g.createLinearGradient(0, 0, 0, NH); bg.addColorStop(0, c0); bg.addColorStop(1, c1); g.fillStyle = bg; g.fillRect(0, 0, NW, NH);
  const sx = 20 + R() * 88, sy = layout === 0 ? 150 : 60 + R() * 120;
  for (let y = 0; y < NH; y += 5) for (let x = (y / 5 % 2) * 2.5; x < NW; x += 5) {
    const dd = Math.hypot(x - sx, y - sy), r = Math.max(0, 2.3 - dd / 34); if (r > 0.2) { g.fillStyle = c2; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  }
  if (layout === 2) { // papel de parede com o assunto miudinho
    g.globalAlpha = 0.18; for (let y = 10; y < NH; y += 28) for (let x = (y / 28 % 2) * 16 + 8; x < NW; x += 32) draw(muralPen(g, c3, c3, c3, 0), x, y, 0.28); g.globalAlpha = 1;
  }
  if (layout === 1) { // medalhão low-poly atrás do assunto
    n64Subject(g, (p, x, y, s) => p.D(x, y, 46 * s, p.a), 64, 140, 1, c3, c3, c3);
  }
  const title = layout === 3 ? 0 : n64Title(g, phrase, 10, 74, c2, c3, '#1a1012');
  const subY = layout === 3 ? 120 : Math.min(176, 40 + title + 70);
  n64Subject(g, draw, 64, subY, layout === 3 ? 1.9 : 1.45, pick([c3, c2, '#f4f1e8']), pick([c0, '#ffffff', c2]), '#1a1012');
  if (layout === 3) n64Title(g, phrase, 196, 52, c2, c3, '#1a1012');
  // moldura de tinta descascando
  g.strokeStyle = 'rgba(26,16,18,.55)'; g.lineWidth = 3; g.strokeRect(2, 2, NW - 4, NH - 4);
  n64Finish(g);
  return g.getImageData(0, 0, NW, NH).data;
}
// ---------- 8 estéticas para os 32 murais (4 de cada): variedade além do N64 ----------
const AESTH = ['n64', 'riso', 'lino', 'neon', 'lambe', 'azulejo', 'opart', 'pop'];
function mSubjectFor(m) {
  const FAV = ['BONECO', 'RATO', 'DRONE', 'GAROA', 'PÃO DE QUEIJO', 'ORELHÃO'];
  return m < SUBJ.length ? SUBJ[(m * 11) % SUBJ.length] : SUBJ[SUBJ.findIndex(t => t[0] === FAV[m - SUBJ.length])];
}
function styRiso(g, draw, phrase, R) {
  const PAPER = '#f4ecdc', PINK = '#ff48b0', BLUE = '#0078bf';
  g.fillStyle = PAPER; g.fillRect(0, 0, NW, NH);
  // meio-tom azul em degradê vertical
  for (let y = 0; y < NH; y += 4) for (let x = (y / 4 % 2) * 2; x < NW; x += 4) { const r = 1.8 * (y / NH); g.fillStyle = 'rgba(0,120,191,.55)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  g.globalCompositeOperation = 'multiply';
  g.save(); g.translate(3, 2); draw(muralPen(g, BLUE, BLUE, BLUE, 0), 64, 150, 1.45); g.restore();      // tinta 1 fora de registro
  draw(muralPen(g, PINK, PAPER, PINK, 0), 64, 150, 1.45);                                               // tinta 2
  g.globalCompositeOperation = 'source-over';
  textBlock(g, phrase, 8, 14, NW - 16, 3, BLUE, { shadow: PINK, maxH: 80 });
}
function styLino(g, draw, phrase, R) {
  const PAPER = '#efe5cf', INK = '#17120f';
  g.fillStyle = PAPER; g.fillRect(0, 0, NW, NH);
  g.fillStyle = INK; g.fillRect(4, 4, NW - 8, NH - 8); g.fillStyle = PAPER; g.fillRect(9, 9, NW - 18, NH - 18);
  for (let x = 12; x < NW - 12; x += 8) { g.fillStyle = INK; g.beginPath(); g.moveTo(x, 9); g.lineTo(x + 4, 15); g.lineTo(x + 8, 9); g.fill(); }   // barrado dentado
  draw(muralPen(g, INK, INK, INK, 0), 64, 150, 1.5);
  g.save(); g.globalCompositeOperation = 'source-atop'; g.strokeStyle = PAPER; g.lineWidth = 1.2;
  for (let y = 90; y < 220; y += 4) { g.beginPath(); g.moveTo(10, y); for (let x = 10; x < NW - 10; x += 6) g.lineTo(x, y + Math.sin(x * 0.25 + y * 0.1) * 1.6); g.stroke(); }
  g.restore();
  g.fillStyle = INK; g.fillRect(9, 196, NW - 18, NH - 205);
  textBlock(g, phrase, 12, 202, NW - 24, 2, PAPER, { maxH: 44 });
  textBlock(g, 'CORDEL', 12, 20, NW - 24, 2, INK);
}
function styNeon(g, draw, phrase, R) {
  const NEON = ['#ff2bd6', '#2bf0ff', '#ffe23b', '#47ff6a', '#ff7a1a'], c1 = NEON[Math.floor(R() * NEON.length)];
  let c2 = NEON[Math.floor(R() * NEON.length)]; if (c2 === c1) c2 = NEON[(NEON.indexOf(c1) + 2) % NEON.length];
  const rgba = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
  g.fillStyle = '#17131d'; g.fillRect(0, 0, NW, NH);
  for (let y = 0; y < NH; y += 8) for (let x = ((y / 8) % 2) * 8; x < NW; x += 16) { g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(x, y, 15, 7); }
  g.fillStyle = '#0b0a10'; g.fillRect(8, 8, NW - 16, NH - 16);
  for (const [x, y] of [[12, 12], [NW - 14, 12], [12, NH - 14], [NW - 14, NH - 14]]) { g.fillStyle = '#5b5b66'; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }
  g.shadowColor = c1; g.shadowBlur = 10;
  draw(muralPen(g, rgba(c1, 0.16), rgba(c1, 0.28), c1, 3), 64, 150, 1.35);
  g.shadowBlur = 0; draw(muralPen(g, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(255,255,255,.75)', 1), 64, 150, 1.35);
  g.shadowColor = c2; g.shadowBlur = 12; textBlock(g, phrase, 14, 22, NW - 28, 3, c2, { maxH: 76 }); g.shadowBlur = 0;
  textBlock(g, phrase, 14, 22, NW - 28, 3, 'rgba(255,255,255,.35)', { maxH: 76 });
  g.shadowColor = c2; g.shadowBlur = 8; g.strokeStyle = c2; g.lineWidth = 2; g.strokeRect(12, 12, NW - 24, NH - 24); g.shadowBlur = 0;
  g.shadowColor = '#ff3b3b'; g.shadowBlur = 8; textBlock(g, 'ABERTO', 30, NH - 30, NW - 60, 1, '#ff5a5a'); g.shadowBlur = 0;
}
function styLambe(g, draw, phrase, R) {
  g.fillStyle = '#8f8a80'; g.fillRect(0, 0, NW, NH);
  const PAP = ['#ffe600', '#ff3fa4', '#ffffff', '#3dffb0', '#ff7a00'];
  const rect = (x, y, w, h, rot, col) => { g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(rot); g.fillStyle = col; g.fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let k = -w / 2; k < w / 2; k += 3) g.fillRect(k, h / 2 - (R() * 5 | 0), 3, 5);
    g.fillStyle = 'rgba(255,255,240,.8)'; g.fillRect(-w / 2 + 2, -h / 2 - 3, 12, 5); g.fillRect(w / 2 - 14, -h / 2 - 3, 12, 5); g.restore(); };
  const a = PAP[Math.floor(R() * PAP.length)], b = PAP[(PAP.indexOf(a) + 2) % PAP.length];
  rect(6, 6, 116, 88, -0.04, a); textBlock(g, phrase, 12, 16, NW - 24, 3, '#111', { maxH: 70 });
  rect(10, 100, 110, 140, 0.03, b);
  for (let y = 104; y < 236; y += 4) for (let x = (y / 4 % 2) * 2 + 12; x < 118; x += 4) { g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(x, y, 1, 0, 7); g.fill(); }
  draw(muralPen(g, '#111', b, '#111', 0), 64, 172, 1.25);
}
function styAzulejo(g, draw, phrase, R) {
  const BLUE = '#1d4a9a', BLUE2 = '#6f97d6', WHITE = '#f6f4ec', GROUT = '#c9c6bb', T = 16;
  g.fillStyle = WHITE; g.fillRect(0, 0, NW, NH);
  // padrão português contínuo: rosácea no centro de cada azulejo + quartos de círculo nos cantos
  for (let y = 0; y < NH; y += T) for (let x = 0; x < NW; x += T) {
    const cx = x + T / 2, cy = y + T / 2;
    g.fillStyle = BLUE2; for (let a = 0; a < 4; a++) { const t = a * Math.PI / 2 + Math.PI / 4; g.beginPath(); g.ellipse(cx + Math.cos(t) * 3.2, cy + Math.sin(t) * 3.2, 2.6, 1.4, t, 0, 7); g.fill(); }
    g.fillStyle = BLUE; g.beginPath(); g.arc(cx, cy, 1.8, 0, 7); g.fill();
    for (const [qx, qy, a0] of [[x, y, 0], [x + T, y, Math.PI / 2], [x + T, y + T, Math.PI], [x, y + T, -Math.PI / 2]]) {
      g.strokeStyle = BLUE; g.lineWidth = 1.4; g.beginPath(); g.arc(qx, qy, 5, a0, a0 + Math.PI / 2); g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x + 2, y + 2, 4, 1);
    g.fillStyle = GROUT; g.fillRect(x, y, T, 1); g.fillRect(x, y, 1, T);
  }
  const cx0 = 10, cy0 = 38, cw = NW - 20, ch = 150;
  g.fillStyle = WHITE; g.fillRect(cx0, cy0, cw, ch);
  g.strokeStyle = BLUE; g.lineWidth = 3; g.strokeRect(cx0 + 2, cy0 + 2, cw - 4, ch - 4); g.lineWidth = 1; g.strokeRect(cx0 + 6, cy0 + 6, cw - 12, ch - 12);
  for (const [ax, ay] of [[cx0 + 6, cy0 + 6], [cx0 + cw - 6, cy0 + 6], [cx0 + cw - 6, cy0 + ch - 6], [cx0 + 6, cy0 + ch - 6]]) { g.fillStyle = BLUE; g.beginPath(); g.arc(ax, ay, 4, 0, 7); g.fill(); }
  g.save(); g.globalAlpha = 0.45; g.translate(2, 2); draw(muralPen(g, BLUE2, BLUE2, BLUE2, 0), 64, 112, 1.15); g.restore();
  draw(muralPen(g, 'rgba(0,0,0,0)', BLUE, BLUE, 1.6), 64, 112, 1.15);
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(29,74,154,.35)'; g.fillRect(cx0 + 10 + R() * (cw - 20), cy0 + 14 + R() * (ch - 28), 2, 1); }
  g.fillStyle = WHITE; g.fillRect(8, NH - 54, NW - 16, 40); g.strokeStyle = BLUE; g.lineWidth = 2; g.strokeRect(8, NH - 54, NW - 16, 40);
  textBlock(g, phrase, 12, NH - 48, NW - 24, 2, BLUE, { maxH: 32 });
}
function styOpart(g, draw, phrase, R) {
  const COLS = [['#ff006e', '#ffbe0b', '#3a86ff', '#8338ec', '#fb5607'], ['#06d6a0', '#ffd166', '#ef476f', '#118ab2', '#073b4c']][Math.floor(R() * 2)];
  for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) {
    const v = Math.sin(Math.hypot(x - 64, y - 130) * 0.22 + Math.sin(x * 0.05) * 2);
    g.fillStyle = COLS[Math.floor((v + 1) * 2.49) % COLS.length]; g.fillRect(x, y, 1, 1);
  }
  draw(muralPen(g, '#ffffff', '#111', '#111', 3), 64, 140, 1.4);
  g.fillStyle = '#111'; g.fillRect(0, 0, NW, 70);
  textBlock(g, phrase, 8, 10, NW - 16, 3, COLS[1], { shadow: COLS[0], maxH: 56 });
}
function styPop(g, draw, phrase, R) {
  const BG = ['#ffd400', '#ff3b30', '#00a8e8'][Math.floor(R() * 3)], DOT = BG === '#ffd400' ? '#ff3b30' : '#ffd400';
  g.fillStyle = BG; g.fillRect(0, 0, NW, NH);
  for (let y = 0; y < NH; y += 7) for (let x = (y / 7 % 2) * 3.5; x < NW; x += 7) { g.fillStyle = DOT; g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); }
  draw(muralPen(g, '#ffffff', '#111', '#111', 3.5), 64, 170, 1.35);
  // balão de fala
  g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 3;
  g.beginPath(); g.ellipse(64, 54, 56, 42, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(54, 92); g.lineTo(46, 116); g.lineTo(72, 94); g.fill(); g.stroke();
  textBlock(g, phrase, 16, 30, NW - 32, 2, '#111', { maxH: 52 });
}
function drawStyledMural(m) {
  const style = AESTH[m % AESTH.length];
  if (style === 'n64') return drawN64Mural(m);
  const cv = document.createElement('canvas'); cv.width = NW; cv.height = NH; const g = cv.getContext('2d');
  const R = rng32(7070 + m * 131), [name, draw, lines] = mSubjectFor(m), phrase = lines[Math.floor(R() * lines.length)];
  ({ riso: styRiso, lino: styLino, neon: styNeon, lambe: styLambe, azulejo: styAzulejo, opart: styOpart, pop: styPop })[style](g, draw, phrase, R);
  if (style !== 'neon') n64Finish(g);           // lowbit leve em todos (o neon fica liso para o brilho)
  return g.getImageData(0, 0, NW, NH).data;
}

function makeMuralTexture(n, special = -1) {
  const data = new Uint8Array(NW * NH * 4 * n);
  for (let i = 0; i < n; i++) {
    if (i === special) { const c = document.createElement('canvas'); c.width = NW; c.height = NH; c.getContext('2d').drawImage(drawElisHi(), 0, 0, NW, NH); data.set(c.getContext('2d').getImageData(0, 0, NW, NH).data, i * NW * NH * 4); }
    else data.set(drawStyledMural(i), i * NW * NH * 4);
  }
  const t = new THREE.DataArrayTexture(data, NW, NH, n);
  t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
  return t;
}
const ALLTEX = [texArr, ...Object.values(TEX)];
function applyTexFilter() {
  const px = cfg.texFilter === 'pixel';
  for (const t of ALLTEX) { t.magFilter = px ? THREE.NearestFilter : THREE.LinearFilter; t.minFilter = px ? THREE.NearestMipmapNearestFilter : THREE.LinearMipmapLinearFilter; t.needsUpdate = true; }
}
applyTexFilter();

/* ---------- material com luz igual ao Lambert da cena ---------- */
const LSUN = new THREE.Vector3(-60, 80, 110).normalize();
function lpMaterial(vtx, frag, extra) {
  const U = THREE.UniformsUtils.clone(THREE.UniformsLib.fog);
  Object.assign(U, { uTex: { value: texArr }, uSun: { value: LSUN }, uSunCol: { value: new THREE.Color(0xfff3e0) },
    uSky: { value: new THREE.Color(0xe4edf5) }, uGnd: { value: new THREE.Color(0x5d554a) } }, extra || {});
  const common = `precision highp sampler2DArray;\nuniform sampler2DArray uTex; uniform vec3 uSun, uSunCol, uSky, uGnd;\n#include <common>\n#include <fog_pars_fragment>\n
    vec3 lightIt(vec3 alb, vec3 n) { float ndl = max(dot(n, uSun), 0.0); vec3 hemi = mix(uGnd, uSky, 0.5 * n.z + 0.5); return alb * (hemi * 1.5 + uSunCol * 2.0 * ndl) * RECIPROCAL_PI; }\n`;
  return new THREE.ShaderMaterial({ uniforms: U, fog: true, side: THREE.DoubleSide,
    vertexShader: `#include <common>\n#include <fog_pars_vertex>\n${vtx}`, fragmentShader: common + frag });
}
const lpGroup = new THREE.Group(); world.add(lpGroup);

/* ---------- chão ---------- */
{
  const { ns, nw } = meshInfo, n = ns * nw, R4 = LPJ.res, ROWS = 4096, TW = nw * R4;
  const pos = new Float32Array(n * 3), st = new Float32Array(n * 2);
  for (let i = 0, k = 0; i < ns; i++) for (let j = 0; j < nw; j++, k++) {
    const [x, y] = stripXY(i, j); pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = lpz(LPG[k]); st[k * 2] = i; st[k * 2 + 1] = j;
  }
  const idx = new Uint32Array((ns - 1) * (nw - 1) * 6); let t = 0;
  for (let i = 0; i < ns - 1; i++) for (let j = 0; j < nw - 1; j++) { const a = i * nw + j, b = a + 1, c = a + nw, d = c + 1; idx.set([a, c, b, b, c, d], t); t += 6; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSt', new THREE.BufferAttribute(st, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals(); g.computeBoundingSphere();
  const chunks = [];
  const totalRows = ns * R4;
  for (let r0 = 0; r0 < totalRows; r0 += ROWS) {
    const rows = Math.min(ROWS, totalRows - r0);
    const tx = new THREE.DataTexture(LPTY.subarray(r0 * TW, (r0 + rows) * TW), TW, rows, THREE.RedFormat, THREE.UnsignedByteType);
    tx.unpackAlignment = 1; tx.magFilter = tx.minFilter = THREE.NearestFilter; tx.generateMipmaps = false; tx.needsUpdate = true; chunks.push(tx);
  }
  while (chunks.length < 3) chunks.push(chunks[chunks.length - 1]);
  const m = lpMaterial(
    `attribute vec2 aSt; varying vec2 vSt; varying vec3 vPos; varying vec3 vN;
     void main() { vSt = aSt; vPos = position; vN = normal; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
     #include <fog_vertex>
     }`,
    `uniform sampler2D uT0, uT1, uT2; varying vec2 vSt; varying vec3 vPos; varying vec3 vN;
     float typeAt() { int pi = int(floor((vSt.x + 0.5) * ${R4}.0)), pj = int(floor((vSt.y + 0.5) * ${R4}.0)); int k = pi / ${ROWS}; ivec2 c = ivec2(clamp(pj, 0, ${TW - 1}), pi - k * ${ROWS});
       float t = k == 0 ? texelFetch(uT0, c, 0).r : (k == 1 ? texelFetch(uT1, c, 0).r : texelFetch(uT2, c, 0).r); return floor(t * 255.0 + 0.5); }
     void main() {
       float t = typeAt(); float layer = 0.0, sc = 4.0;
       if (t > 1.5 && t < 2.5) { layer = 1.0; sc = 2.0; } else if (t < 3.5 && t > 2.5) { layer = 2.0; sc = 2.0; } else if (t < 4.5 && t > 3.5) { layer = 3.0; sc = 3.0; }
       else if (t < 5.5 && t > 4.5) { layer = 4.0; sc = 3.0; } else if (t < 6.5 && t > 5.5) { layer = 5.0; sc = 1.0; } else if (t > 6.5) { layer = 6.0; sc = 1.0; }
       vec3 alb = texture(uTex, vec3(vPos.xy / sc, layer)).rgb;
       gl_FragColor = vec4(lightIt(alb, normalize(vN)), 1.0);
       #include <colorspace_fragment>
       #include <fog_fragment>
     }`, { uT0: { value: chunks[0] }, uT1: { value: chunks[1] }, uT2: { value: chunks[2] } });
  lpGroup.add(new THREE.Mesh(g, m));
}

/* ---------- prédios ---------- */
{
  const P = [], N = [], UV = [], LY = [], TN = [], KD = [], SH = [], GR = [], BL = [], EM = [], MU = []; let murCount = 0, elisLayer = -1;
  // a maior empena (área exposta) vira o retrato da Elis
  let elisKey = '', elisA = 0;
  for (const b of LPJ.buildings) for (const [k, lo] of (b.em || [])) { const pa = b.p[k], pb = b.p[(k + 1) % b.p.length], Lw = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]), A = Lw * (b.t - b.b - 0.4 - lo); if (Lw >= 8 && A > elisA) { elisA = A; elisKey = b.id + ':' + k; } }
  const LAY = [TL.facLow, TL.facRes, TL.facTower, TL.facShed];
  const col = new THREE.Color();
  let seed = rng32(4242);
  for (const b of LPJ.buildings) {
    const pts = b.p, n = pts.length, wall = new THREE.Color(b.w), roof = new THREE.Color(b.r);
    const lay = LAY[b.s], rs = seed(), shop = b.sh != null ? b.sh : ((b.s === 1 || b.s === 2) && (b.t - b.b) > 8 && rs < 0.7 ? 1 : 0), street = b.b + 0.4;
    const gw = (b.g || [3.2, 3.0])[0], gh = (b.g || [3.2, 3.0])[1];
    const emp = new Map((b.em || []).map(([k, lo]) => [k, lo]));
    let u = 0;
    for (let k = 0; k < n; k++) {
      const [x0, y0] = pts[k], [x1, y1] = pts[(k + 1) % n], L = Math.hypot(x1 - x0, y1 - y0); if (L < 0.05) continue;
      const nx = (y1 - y0) / L, ny = -(x1 - x0) / L;
      const v0 = b.b - street, v1 = b.t - street, lo = emp.has(k) ? emp.get(k) : 1e4;
      // empena grande: 60% ganha uma pintura boba (escolha fixa por prédio/parede)
      const hsh = ((b.id * 2654435761 + k * 40503) >>> 0) % 1000, isElis = (b.id + ':' + k) === elisKey, mur = isElis ? NUM_MUR : ((emp.has(k) && L >= 8 && v1 - lo >= 10 && hsh % 10 < 6) ? hsh % NUM_MUR : -1);   // 32 murais N64 reaproveitados; a maior empena = Elis
      if (isElis) elisLayer = NUM_MUR;
      const quad = [[x0, y0, b.b, u, v0], [x1, y1, b.b, u + L, v0], [x1, y1, b.t, u + L, v1], [x0, y0, b.b, u, v0], [x1, y1, b.t, u + L, v1], [x0, y0, b.t, u, v1]];
      for (const [x, y, z, uu, vv] of quad) { P.push(x, y, z); N.push(nx, ny, 0); UV.push(uu, vv); LY.push(lay); TN.push(wall.r, wall.g, wall.b); KD.push(0); SH.push(shop); GR.push(gw, gh); BL.push(lo); EM.push(u, L, lo, v1); MU.push(mur); }
      u += L;
    }
    const tri = THREE.ShapeUtils.triangulateShape(pts.map(([x, y]) => new THREE.Vector2(x, y)), []);
    const rl = b.rf ? TL.telha : TL.roof;
    for (const f of tri) for (const v of f) { const [x, y] = pts[v]; P.push(x, y, b.t); N.push(0, 0, 1); UV.push(0, 0); LY.push(rl); TN.push(roof.r, roof.g, roof.b); KD.push(1); SH.push(0); GR.push(gw, gh); BL.push(1e4); EM.push(0, 1, 0, 1); MU.push(-1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('aUV', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('aLayer', new THREE.Float32BufferAttribute(LY, 1));
  g.setAttribute('aTint', new THREE.Float32BufferAttribute(TN, 3)); g.setAttribute('aKind', new THREE.Float32BufferAttribute(KD, 1));
  const murTex = makeMuralTexture(NUM_MUR + 1, NUM_MUR); ALLTEX.push(murTex);
  // Elis em alta resolução (256x512) numa textura própria, só para o mural de destaque
  const elisTex = new THREE.CanvasTexture(drawElisHi()); elisTex.colorSpace = THREE.SRGBColorSpace; elisTex.generateMipmaps = true; ALLTEX.push(elisTex); applyTexFilter();
  g.setAttribute('aShop', new THREE.Float32BufferAttribute(SH, 1)); g.setAttribute('aGrid', new THREE.Float32BufferAttribute(GR, 2)); g.setAttribute('aBlank', new THREE.Float32BufferAttribute(BL, 1)); g.setAttribute('aEmp', new THREE.Float32BufferAttribute(EM, 4)); g.setAttribute('aMural', new THREE.Float32BufferAttribute(MU, 1)); g.computeBoundingSphere();
  const m = lpMaterial(
    `attribute vec2 aUV, aGrid; attribute float aLayer, aKind, aShop, aBlank, aMural; attribute vec3 aTint; attribute vec4 aEmp;
     varying vec2 vUV, vGrid; varying float vLayer, vKind, vShop, vBlank, vMural; varying vec3 vTint, vPos, vN; varying vec4 vEmp;
     void main() { vUV = aUV; vGrid = aGrid; vBlank = aBlank; vMural = aMural; vEmp = aEmp; vLayer = aLayer; vKind = aKind; vShop = aShop; vTint = aTint; vPos = position; vN = normal;
       vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
       #include <fog_vertex>
     }`,
    `uniform sampler2DArray uMur; uniform sampler2D uElis; uniform float uElisIdx; varying vec2 vUV, vGrid; varying float vLayer, vKind, vShop, vBlank, vMural; varying vec3 vTint, vPos, vN; varying vec4 vEmp;
     void main() {
       vec3 c;
       if (vKind < 0.5 && vUV.y > vBlank) { // empena cega: reboco liso, sem janelas
         vec4 tx = texture(uTex, vec3(vUV.x / 3.0, vUV.y / 3.0, ${TL.plaster}.0)); c = tx.rgb * vTint * 1.05;
         if (vMural > -0.5) { // pintura boba com margem de reboco
           // proporção 1:2 preservada: o mural cabe na faixa (largura vEmp.y x altura hi-lo), centrado, com margem
           float bw = vEmp.y, bh = vEmp.w - vEmp.z, mw = min(bw * 0.86, bh * 0.9 * 0.5), mh = mw * 2.0;
           float x0 = (bw - mw) * 0.5, y0 = vEmp.z + (bh - mh) * 0.5;
           float uu = (vUV.x - vEmp.x - x0) / mw, vv = (vUV.y - y0) / mh;
           if (uu > 0.0 && uu < 1.0 && vv > 0.0 && vv < 1.0) {
             vec2 t = vec2(uu, 1.0 - vv);
             vec4 mc = abs(vMural - uElisIdx) < 0.5 ? texture(uElis, vec2(t.x, 1.0 - t.y)) : texture(uMur, vec3(t, floor(vMural + 0.5))); c = mix(c, mc.rgb * 0.92, mc.a);
           }
         }
       } else if (vKind < 0.5) {
         float L = vLayer; if (vShop > 0.5 && vUV.y < 3.6 && vUV.y > 0.0) L = ${TL.shop}.0;
         // grade da fachada: espaçamento das janelas e altura do andar medidos na foto (ou padrão); térreo de 3,6 m
         float fy = vUV.y < 3.6 ? vUV.y / 3.6 : 1.0 + (vUV.y - 3.6) / vGrid.y;
         vec4 tx = texture(uTex, vec3(vUV.x / vGrid.x, L == ${TL.shop}.0 ? vUV.y / 3.6 : fy, L));
         c = mix(tx.rgb, tx.rgb * vTint * 1.15, tx.a);
         if (vUV.y < 0.0) c *= 0.55;
       } else { vec4 tx = texture(uTex, vec3(vPos.xy / 4.0, vLayer)); c = tx.rgb * mix(vec3(1.0), vTint * 1.6, 0.75); }
       gl_FragColor = vec4(lightIt(c, normalize(vN)), 1.0);
       #include <colorspace_fragment>
       #include <fog_fragment>
     }`, { uMur: { value: murTex }, uElis: { value: elisTex }, uElisIdx: { value: elisLayer } });
  lpGroup.add(new THREE.Mesh(g, m));
}

/* ---------- árvores ---------- */
const lpTrees = LPJ.trees.map(([x, y, z, r, h, model, cr, cg, cb]) => {
  const rv = Math.min(r * 0.85, h * 0.45), cz = z + h - rv; return { x, y, z, r, h, rv, cz, model, cr, cg, cb };
});
{
  const crownG = [new THREE.IcosahedronGeometry(1, 0), new THREE.ConeGeometry(1, 2, 6).rotateX(Math.PI / 2), new THREE.DodecahedronGeometry(1, 0)];
  const trunkG = new THREE.CylinderGeometry(0.16, 0.24, 1, 5).rotateX(Math.PI / 2).translate(0, 0, 0.5);
  const leafM = new THREE.MeshLambertMaterial({ map: TEX.leaf, flatShading: true }), barkM = new THREE.MeshLambertMaterial({ map: TEX.bark, flatShading: true });
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pv = new THREE.Vector3(), c = new THREE.Color(), zAx = new THREE.Vector3(0, 0, 1);
  for (let mdl = 0; mdl < 3; mdl++) {
    const list = lpTrees.filter(t => t.model === mdl); if (!list.length) continue;
    const cm = new THREE.InstancedMesh(crownG[mdl], leafM, list.length), tm = new THREE.InstancedMesh(trunkG, barkM, list.length);
    list.forEach((t, i) => {
      q.setFromAxisAngle(zAx, (t.x * 13.1 + t.y * 7.7) % 6.28);
      sc.set(t.r, t.r, mdl === 1 ? t.rv : t.rv); pv.set(t.x, t.y, t.cz); mtx.compose(pv, q, sc); cm.setMatrixAt(i, mtx);
      c.setRGB(t.cr / 255, t.cg / 255, t.cb / 255, THREE.SRGBColorSpace); cm.setColorAt(i, c);
      const th = Math.max(0.5, t.cz - t.z), tw = Math.max(0.6, t.r / 4); sc.set(tw, tw, th); pv.set(t.x, t.y, t.z - 0.2); mtx.compose(pv, q, sc); tm.setMatrixAt(i, mtx);
    });
    lpGroup.add(cm, tm);
  }
}

/* ---------- viaduto: laje, guarda-corpo, rampas, passarela, pilares ---------- */
{
  const T = LPJ.deckT, PH = 1.1, PW = 0.3;
  const topP = { main: [], ramp: [], foot: [] }, topUV = { main: [], ramp: [], foot: [] }, cP = [], cUV = [];
  const tri = (arrP, arrUV, a, b, c) => { for (const v of [a, b, c]) { arrP.push(v[0], v[1], v[2]); arrUV.push(v[3], v[4]); } };
  const quad = (arrP, arrUV, a, b, c, d) => { tri(arrP, arrUV, a, b, c); tri(arrP, arrUV, a, c, d); };
  for (const rb of LPJ.ribbons) {
    const pts = rb.pts, n = pts.length, hw = rb.hw; if (n < 2) continue;
    const L = [], Rr = [], NN = []; let s = 0; const S = [];
    for (let k = 0; k < n; k++) {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(n - 1, k + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      NN.push([-ty, tx]); if (k) s += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); S.push(s);
    }
    const at = (k, off, dz) => [pts[k][0] + NN[k][0] * off, pts[k][1] + NN[k][1] * off, pts[k][2] + dz];
    const tp = topP[rb.kind], tu = topUV[rb.kind];
    for (let k = 0; k < n - 1; k++) {
      const v0 = S[k] / 8, v1 = S[k + 1] / 8;
      const A = at(k, hw - PW, 0), B = at(k, -hw + PW, 0), C = at(k + 1, -hw + PW, 0), D = at(k + 1, hw - PW, 0);
      quad(tp, tu, [...A, 0.06, v0], [...B, 0.94, v0], [...C, 0.94, v1], [...D, 0.06, v1]);
      // fundo
      const e = (kk, off) => at(kk, off, -T);
      quad(cP, cUV, [...e(k, hw), 0, S[k] / 3], [...e(k + 1, hw), 0, S[k + 1] / 3], [...e(k + 1, -hw), hw * 2 / 3, S[k + 1] / 3], [...e(k, -hw), hw * 2 / 3, S[k] / 3]);
      for (const sg of [1, -1]) {
        const o = sg * hw, i_ = sg * (hw - PW);
        // face externa (do fundo até o topo do guarda-corpo)
        quad(cP, cUV, [...at(k, o, -T), S[k] / 3, 0], [...at(k + 1, o, -T), S[k + 1] / 3, 0], [...at(k + 1, o, PH), S[k + 1] / 3, (T + PH) / 3], [...at(k, o, PH), S[k] / 3, (T + PH) / 3]);
        // face interna e topo do guarda-corpo
        quad(cP, cUV, [...at(k, i_, 0), S[k] / 3, 0], [...at(k + 1, i_, 0), S[k + 1] / 3, 0], [...at(k + 1, i_, PH), S[k + 1] / 3, PH / 3], [...at(k, i_, PH), S[k] / 3, PH / 3]);
        quad(cP, cUV, [...at(k, i_, PH), S[k] / 3, 0], [...at(k + 1, i_, PH), S[k + 1] / 3, 0], [...at(k + 1, o, PH), S[k + 1] / 3, .1], [...at(k, o, PH), S[k] / 3, .1]);
      }
    }
    for (const k of [0, n - 1]) quad(cP, cUV, [...at(k, hw, -T), 0, 0], [...at(k, -hw, -T), hw * 2 / 3, 0], [...at(k, -hw, 0), hw * 2 / 3, T / 3], [...at(k, hw, 0), 0, T / 3]);
  }
  const mk = (P, UV, map, rep) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 })); return m; };
  lpGroup.add(mk(topP.main, topUV.main, TEX.deck), mk(cP, cUV, TEX.concrete));
  // rampas: asfalto com uv em metros/4; passarela: calçada
  const rUV = topUV.ramp.map((v, i) => i % 2 === 0 ? v * 4 : v * 2), fUV = topUV.foot.map((v, i) => i % 2 === 0 ? v * 2 : v * 4);
  if (topP.ramp.length) lpGroup.add(mk(topP.ramp, rUV, TEX.asphalt));
  if (topP.foot.length) lpGroup.add(mk(topP.foot, fUV, TEX.sidewalk));
  // pilares + travessa
  const pl = LPJ.pillars; if (pl.length) {
    const box = new THREE.BoxGeometry(1, 1, 1), cm = new THREE.MeshLambertMaterial({ map: TEX.concrete });
    const pm = new THREE.InstancedMesh(box, cm, pl.length), bm = new THREE.InstancedMesh(box, cm, pl.length);
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pv = new THREE.Vector3(), zA = new THREE.Vector3(0, 0, 1);
    pl.forEach(([x, y, zb, zt, ang, sa, sb, cw], i) => {
      q.setFromAxisAngle(zA, ang); sc.set(sa, sb, zt - zb); pv.set(x, y, (zb + zt) / 2); mtx.compose(pv, q, sc); pm.setMatrixAt(i, mtx);
      sc.set(sa * 1.3, cw, 0.9); pv.set(x, y, zt - 0.45); mtx.compose(pv, q, sc); bm.setMatrixAt(i, mtx);
    });
    lpGroup.add(pm, bm);
  }
}

/* ---------- colisão low-poly ---------- */
const lpBucket = (items, key) => { const m = new Map(); for (const it of items) { const k = key(it); for (const kk of k) { if (!m.has(kk)) m.set(kk, []); m.get(kk).push(it); } } return m; };
const B20 = (x, y) => Math.floor(x / 20) + ',' + Math.floor(y / 20);
const lpTreeB = lpBucket(lpTrees, t => { const out = new Set(); for (const dx of [-t.r, t.r]) for (const dy of [-t.r, t.r]) out.add(B20(t.x + dx, t.y + dy)); return out; });
const lpPil = LPJ.pillars.map(([x, y, zb, zt, ang, sa, sb]) => ({ x, y, zb, zt, c: Math.cos(ang), s: Math.sin(ang), ha: sa / 2, hb: sb / 2 }));
const lpPilB = lpBucket(lpPil, p => [B20(p.x, p.y), B20(p.x + 3, p.y), B20(p.x - 3, p.y), B20(p.x, p.y + 3), B20(p.x, p.y - 3)]);
function lpCell(arr, s, j, nw) { const i = Math.round(s), k = Math.round(j); return arr[i * nw + k]; }
function lpGroundAt(s, j) {
  const { ns, nw } = meshInfo; const i0 = Math.min(ns - 2, Math.max(0, Math.floor(s))), j0 = Math.min(nw - 2, Math.max(0, Math.floor(j))), fs = s - i0, fj = j - j0;
  const g = (i, k) => lpz(LPG[i * nw + k]);
  return (g(i0, j0) * (1 - fj) + g(i0, j0 + 1) * fj) * (1 - fs) + (g(i0 + 1, j0) * (1 - fj) + g(i0 + 1, j0 + 1) * fj) * fs;
}
function lpSurf(x, y, z, r = 0.15) {
  const { ns, nw } = meshInfo; const [s, j] = locate(x, y);
  if (s < 0 || s > ns - 1 || j < 0 || j > nw - 1) return hmAtGMesh(x, y, r);
  let h = lpGroundAt(s, j);
  const W2 = nw * 2, i0 = Math.max(0, Math.floor((s - r + 0.5) * 2)), i1 = Math.min(ns * 2 - 1, Math.floor((s + r + 0.5) * 2));
  const k0 = Math.max(0, Math.floor((j - r + 0.5) * 2)), k1 = Math.min(W2 - 1, Math.floor((j + r + 0.5) * 2));
  for (let i = i0; i <= i1; i++) for (let k = k0; k <= k1; k++) { const v = LPBL[i * W2 + k]; if (v) h = Math.max(h, lpz(v)); }
  const dt = lpCell(LPDT, s, j, nw);
  if (dt) { const top = lpz(dt), bot = lpz(lpCell(LPDB, s, j, nw)); if (z > bot + 0.4) h = Math.max(h, top); }
  for (const p of lpPilB.get(B20(x, y)) || []) {
    const dx = x - p.x, dy = y - p.y, a = Math.abs(dx * p.c + dy * p.s), b = Math.abs(-dx * p.s + dy * p.c);
    if (a < p.ha + r && b < p.hb + r && z < p.zt + 0.2) h = Math.max(h, p.zt);
  }
  for (const t of lpTreeB.get(B20(x, y)) || []) {
    const d = Math.hypot(x - t.x, y - t.y);
    if (d < t.r) { const k = Math.sqrt(1 - (d / t.r) ** 2), top = t.cz + t.rv * k, bot = t.cz - t.rv * k; if (z > bot - 0.1) h = Math.max(h, top); }
    else if (d < 0.35 && z < t.cz) h = Math.max(h, t.cz);
  }
  return h;
}
function lpCeil(x, y, z) {
  const { ns, nw } = meshInfo; const [s, j] = locate(x, y);
  if (s < 0 || s > ns - 1 || j < 0 || j > nw - 1) return Infinity;
  let c = Infinity; const dt = lpCell(LPDT, s, j, nw);
  if (dt) { const bot = lpz(lpCell(LPDB, s, j, nw)); if (z <= bot + 0.4) c = bot; }
  for (const t of lpTreeB.get(B20(x, y)) || []) {
    const d = Math.hypot(x - t.x, y - t.y);
    if (d < t.r) { const bot = t.cz - t.rv * Math.sqrt(1 - (d / t.r) ** 2); if (z < bot - 0.1) c = Math.min(c, bot); }
  }
  return c;
}

/* ---------- balões coloridos: estouram em confete quando o drone encosta ---------- */
const lpBal = (() => {
  const { ns, nw } = meshInfo, R = rng32(777), N = 150, list = [];
  const COLS = ['#ff2d55', '#ffcc00', '#2f80ff', '#22c55e', '#ff7ab6', '#ff8a00', '#8b5cf6', '#00d1d1', '#ffffff', '#e11d48'];
  // nada de balão dentro de prédio ou da laje (checa direto nos mapas da faixa; locate() ainda não existe na carga)
  const blocked = (ii, j, z) => {
    const jj = Math.round(j), W2 = nw * 2;
    for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) {
      const bi = Math.min(ns * 2 - 1, Math.max(0, ii * 2 + di)), bj = Math.min(W2 - 1, Math.max(0, jj * 2 + dj)), v = LPBL[bi * W2 + bj];
      if (v && lpz(v) > z - 2) return true;
    }
    const dtv = LPDT[ii * nw + jj]; return !!(dtv && z > lpz(LPDB[ii * nw + jj]) - 2.5 && z < lpz(dtv) + 3);
  };
  // nem dentro de copa de árvore (com folga de 1,5 m)
  const inCrown = (x, y, z) => lpTrees.some(t => ((x - t.x) / (t.r + 1.5)) ** 2 + ((y - t.y) / (t.r + 1.5)) ** 2 + ((z - t.cz) / (t.rv + 1.5)) ** 2 < 1);
  // #50 e #76 caíram dentro de copas grandes (pedido do usuário em 22/11/2026): só eles são sorteados de novo,
  // com um sorteio à parte, para que os outros 148 fiquem onde sempre estiveram
  const MOVE = new Set([50, 76]), R2 = rng32(4242);
  for (let tries = 0; list.length < N && tries < N * 20; tries++) {
    const i = 15 + R() * (ns - 30), j = 6 + R() * (nw - 12); let [x, y] = stripXY(Math.floor(i), j);
    let z = lpGroundAt(Math.floor(i), j) + 4 + R() * 32;
    if (blocked(Math.floor(i), j, z)) continue;
    if (MOVE.has(list.length)) for (let k = 0; k < 500; k++) {
      const i2 = 15 + R2() * (ns - 30), j2 = 6 + R2() * (nw - 12), [x2, y2] = stripXY(Math.floor(i2), j2), z2 = lpGroundAt(Math.floor(i2), j2) + 4 + R2() * 32;
      if (!blocked(Math.floor(i2), j2, z2) && !inCrown(x2, y2, z2)) { x = x2; y = y2; z = z2; break; }
    }
    list.push({ x, y, z, r: 0.75 + R() * 0.35, ph: R() * 6.28, col: COLS[Math.floor(R() * COLS.length)], alive: true, back: 0 });
  }
  const geo = new THREE.SphereGeometry(1, 12, 10); geo.scale(0.9, 0.9, 1.12);
  const mat = new THREE.MeshPhongMaterial({ shininess: 60, specular: 0x666666 });
  const mesh = new THREE.InstancedMesh(geo, mat, list.length); const c = new THREE.Color();
  list.forEach((b, k) => { c.set(b.col); mesh.setColorAt(k, c); });
  const sPos = new Float32Array(list.length * 6), sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const strings = new THREE.LineSegments(sGeo, new THREE.LineBasicMaterial({ color: 0xdddddd }));
  // confete: papelzinho girando (pool fixo, sem alocar no loop)
  const CN = 1800, cGeo = new THREE.PlaneGeometry(0.16, 0.1), cMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const conf = new THREE.InstancedMesh(cGeo, cMat, CN), cp = new Float32Array(CN * 3), cv = new Float32Array(CN * 3), ca = new Float32Array(CN * 3), cl = new Float32Array(CN);
  const PCOL = ['#ff2d55', '#ffcc00', '#2f80ff', '#22c55e', '#ff7ab6', '#ff8a00', '#8b5cf6', '#00d1d1'];
  for (let k = 0; k < CN; k++) { c.set(PCOL[k % PCOL.length]); conf.setColorAt(k, c); }
  conf.frustumCulled = false; mesh.frustumCulled = false;
  world.add(mesh, strings, conf);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), zero = new THREE.Vector3(0, 0, 0);
  let next = 0, last = performance.now(), actx = null, won = false, lastPopped = -1;
  // contador de balões
  const hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;left:8px;bottom:22px;font:600 12px/1.3 ui-monospace,monospace;color:#fff;text-shadow:0 1px 2px #000;pointer-events:none;z-index:3';
  document.body.append(hud);
  // tela de vitória: transparente sobre o último quadro, simulador pausado
  const winBox = document.createElement('div');
  winBox.style.cssText = 'position:fixed;inset:0;z-index:20;display:none;place-items:center;background:rgba(8,10,14,.38);padding:16px';
  winBox.innerHTML = '<div style="max-width:560px;background:rgba(14,17,22,.82);border:1px solid #2a313c;border-radius:14px;padding:22px 24px;color:#e8ecf1;font:16px/1.5 system-ui,sans-serif;text-align:center">'
    + '<div style="font:800 30px/1.1 system-ui,sans-serif;color:#ffb020;margin-bottom:10px">Congratulations! You Win!</div>'
    + '<p style="margin:0">Your prize is: <b>real life</b>. Turn this simulator off and go have a nice sunbath. A glass of water. Maybe something nice to read.</p>'
    + '<p style="margin:12px 0 0">You&rsquo;ve earned it!</p>'
    + '</div>';
  document.body.append(winBox);
  // musiquinha de vitória (mp3 embutido). O navegador só libera som depois de um clique ou tecla:
  // destrava o áudio no primeiro gesto e, se ainda estiver mudo na vitória, um clique na tela toca.
  let winBuf = null;
  const unlock = () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state !== 'running') actx.resume(); } catch (e_) {} };
  addEventListener('pointerdown', unlock); addEventListener('keydown', unlock);
  async function playWin() {
    try {
      unlock();
      if (!winBuf) { const b64 = document.getElementById('d-win').textContent.trim(), bin = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0)); winBuf = await actx.decodeAudioData(bin.buffer); }
      if (actx.state !== 'running') { winBox.onclick = () => { winBox.onclick = null; actx.resume().then(playWin); }; return; }
      const n = actx.createBufferSource(), gn = actx.createGain(); gn.gain.value = 0.7; n.buffer = winBuf; n.connect(gn).connect(actx.destination); n.start();
    } catch (e_) {}
  }
  function popSound() {
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const n = actx.createBufferSource(), b = actx.createBuffer(1, 2205, 22050), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4); n.buffer = b; const gn = actx.createGain(); gn.gain.value = 0.5; n.connect(gn).connect(actx.destination); n.start(); } catch (e_) {}
  }
  function burst(b) {
    for (let n = 0; n < 120; n++) {
      const k = next; next = (next + 1) % CN; const a = Math.random() * 6.28, el = Math.random() * 3.14 - 1.57, sp = 2 + Math.random() * 5;
      cp[k * 3] = b.x; cp[k * 3 + 1] = b.y; cp[k * 3 + 2] = b.z;
      cv[k * 3] = Math.cos(a) * Math.cos(el) * sp; cv[k * 3 + 1] = Math.sin(a) * Math.cos(el) * sp; cv[k * 3 + 2] = Math.sin(el) * sp + 2;
      ca[k * 3] = Math.random() * 6; ca[k * 3 + 1] = Math.random() * 6; ca[k * 3 + 2] = Math.random() * 6; cl[k] = 3 + Math.random() * 2;
    }
    popSound();
  }
  function update() {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000), t = now / 1000; last = now;
    const on = cfg.view === 'lowpoly' || cfg.view === 'mesh' || cfg.view === 'both'; mesh.visible = strings.visible = conf.visible = on;
    const dp = st.p;
    for (let k = 0; k < list.length; k++) {
      const b = list[k];
      if (!b.alive && cfg.balAuto === 'on') { b.back -= dt; if (b.back <= 0) b.alive = true; }   // só volta sozinho se o usuário ligar
      const bz = b.z + Math.sin(t * 0.9 + b.ph) * 0.35, bx = b.x + Math.sin(t * 0.5 + b.ph * 2) * 0.2;
      if (b.alive && st.mode !== 'held' && (dp.x - bx) ** 2 + (dp.y - b.y) ** 2 + (dp.z - bz) ** 2 < (b.r + 0.45) ** 2) { b.alive = false; b.back = 25; burst({ x: bx, y: b.y, z: bz }); }
      if (b.alive) { v.set(bx, b.y, bz); sc.set(b.r, b.r, b.r); m4.compose(v, q.identity(), sc); } else m4.compose(v.set(0, 0, -1e4), q.identity(), sc.set(0.001, 0.001, 0.001));
      mesh.setMatrixAt(k, m4);
      const o = k * 6; sPos[o] = bx; sPos[o + 1] = b.y; sPos[o + 2] = b.alive ? bz - b.r * 1.1 : -1e4; sPos[o + 3] = bx; sPos[o + 4] = b.y; sPos[o + 5] = b.alive ? bz - b.r * 1.1 - 2.2 : -1e4;
    }
    mesh.instanceMatrix.needsUpdate = true; sGeo.attributes.position.needsUpdate = true;
    let alive = 0; for (const b of list) alive += b.alive;
    const popped = list.length - alive;
    if (popped !== lastPopped) { lastPopped = popped; hud.textContent = `Balloons popped: ${popped}`; }
    if (alive === 0 && !won) { won = true; paused = true; winBox.style.display = 'grid'; playWin(); }
    let any = false;
    for (let k = 0; k < CN; k++) {
      if (cl[k] <= 0) { if (cl[k] > -1) { cl[k] = -1; m4.compose(v.set(0, 0, -1e4), q.identity(), sc.set(0.001, 0.001, 0.001)); conf.setMatrixAt(k, m4); any = true; } continue; }
      any = true; cl[k] -= dt; const o = k * 3;
      cv[o + 2] -= 4.0 * dt; cv[o] *= 1 - 1.6 * dt; cv[o + 1] *= 1 - 1.6 * dt; cv[o + 2] *= 1 - 1.2 * dt;     // gravidade + arrasto do papel
      cp[o] += (cv[o] + Math.sin(t * 6 + k) * 0.6) * dt; cp[o + 1] += cv[o + 1] * dt; cp[o + 2] += cv[o + 2] * dt;
      ca[o] += dt * 7; ca[o + 1] += dt * 5;
      e.set(ca[o], ca[o + 1], ca[o + 2]); q.setFromEuler(e); m4.compose(v.set(cp[o], cp[o + 1], cp[o + 2]), q, sc.set(1, 1, 1)); conf.setMatrixAt(k, m4);
    }
    if (any) conf.instanceMatrix.needsUpdate = true;
  }
  update.list = list; update.alive = () => cl.reduce((n, v) => n + (v > 0), 0);
  update.regen = () => { for (const b of list) { b.alive = true; b.back = 0; } won = false; winBox.style.display = 'none'; };
  return update;
})();
// atribuição dos dados (ODbL do OSM pede crédito visível)
{ const a = document.createElement('div'); a.id = 'lpAttr';
  a.style.cssText = 'position:fixed;left:8px;bottom:6px;font:10px/1.3 ui-sans-serif,system-ui,sans-serif;color:rgba(255,255,255,.75);text-shadow:0 1px 2px #000;pointer-events:none;z-index:3';
  a.textContent = 'Map data: PMSP LiDAR · GeoSampa (PMSP) · © OpenStreetMap contributors · Facade colours from Mapillary images (CC-BY-SA) · Wall paintings are made up · Elis tribute illustration made with an image AI'; document.body.append(a); }
if (cfg.lpv !== 1) { cfg.view = 'lowpoly'; cfg.lpv = 1; save(); }
