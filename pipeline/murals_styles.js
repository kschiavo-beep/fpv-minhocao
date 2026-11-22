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
