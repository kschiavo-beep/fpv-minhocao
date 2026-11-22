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
function makeMuralTexture(n, special = -1) {
  const data = new Uint8Array(NW * NH * 4 * n);
  for (let i = 0; i < n; i++) {
    if (i === special) { const c = document.createElement('canvas'); c.width = NW; c.height = NH; c.getContext('2d').drawImage(drawElisHi(), 0, 0, NW, NH); data.set(c.getContext('2d').getImageData(0, 0, NW, NH).data, i * NW * NH * 4); }
    else data.set(drawN64Mural(i), i * NW * NH * 4);
  }
  const t = new THREE.DataArrayTexture(data, NW, NH, n);
  t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
  return t;
}
