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
// ---------- Elis em alta (256x512): cartaz serigrafado de palco, ilustração original só com formas ----------
// Técnica (skill canvas-generative): simplex noise com seed para grão de papel e falha de registro;
// meio-tom AM em trama de 45° (raio do ponto = luz do facho); 4 tintas: preto, creme, dourado, vermelho.
const ElisNoise = (() => {
  const perm = new Uint8Array(512), pm12 = new Uint8Array(512);
  const g2 = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  const p = new Uint8Array(256); for (let i = 0; i < 256; i++) p[i] = i;
  let v = 1945 * 1664525 + 1013904223; for (let i = 255; i > 0; i--) { v = (v * 1664525 + 1013904223) | 0; const j = (v >>> 0) % (i + 1); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm12[i] = perm[i] % 12; }
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  return (xin, yin) => {
    const s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s), t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t), i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2, ii = i & 255, jj = j & 255;
    const c = (tt, gi, x, y) => tt < 0 ? 0 : (tt *= tt, tt * tt * (g2[gi][0] * x + g2[gi][1] * y));
    return 70 * (c(0.5 - x0 * x0 - y0 * y0, pm12[ii + perm[jj]], x0, y0) + c(0.5 - x1 * x1 - y1 * y1, pm12[ii + i1 + perm[jj + j1]], x1, y1) + c(0.5 - x2 * x2 - y2 * y2, pm12[ii + 1 + perm[jj + 1]], x2, y2));
  };
})();
function drawElisHi() {
  const W = 256, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const INK = '#0e0b09', CREAM = '#f3e8d0', SHADE = '#c9b38c', GOLD = '#f2b632', RED = '#a4161a', SKIN = '#eed6b4', SKIN2 = '#cda882', HAIR = '#120d0b';
  const path = (pts, close = true) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) { const q = pts[k]; q.length === 6 ? g.bezierCurveTo(...q) : g.lineTo(q[0], q[1]); } if (close) g.closePath(); };
  const fill = (pts, c) => { path(pts); g.fillStyle = c; g.fill(); };
  const stroke = (pts, c, w) => { path(pts, false); g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); };
  const ell = (x, y, rx, ry, rot, c) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fillStyle = c; g.fill(); };
  // luz do facho (vem de cima à direita, em diagonal até a figura): 0..1
  const LX = 236, LY = 0, beam = (x, y) => {
    const dx = x - LX, dy = y - LY, ax = -0.52, ay = 0.85, along = dx * ax + dy * ay, across = Math.abs(dx * ay - dy * ax);
    if (along < 0) return 0; const wdt = 30 + along * 0.42; return Math.max(0, 1 - across / wdt) * Math.max(0, 1 - along / 560);
  };
  // 1. palco preto + halo vermelho atrás da cabeça + facho em meio-tom AM (trama 45°)
  g.fillStyle = INK; g.fillRect(0, 0, W, H);
  ell(146, 150, 92, 92, 0, RED);
  for (let r = 0; r < 4; r++) { g.strokeStyle = 'rgba(14,11,9,.55)'; g.lineWidth = 3; g.beginPath(); g.arc(146, 150, 60 + r * 9, 0, Math.PI * 2); g.stroke(); }
  const step = 7;
  for (let u = -H; u < W + H; u += step) for (let w = -H; w < W + H; w += step) {
    const x = (u - w) * 0.7071, y = (u + w) * 0.7071; if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
    const I = beam(x, y) * (0.82 + 0.18 * ElisNoise(x * 0.03, y * 0.03)); if (I < 0.04) continue;
    g.fillStyle = GOLD; g.beginPath(); g.arc(x, y, Math.min(3.9, 4.2 * Math.sqrt(I)), 0, Math.PI * 2); g.fill();
  }
  // 2. figura (luz da direita/cima: lado esquerdo em sombra)
  // braço erguido: manga larga + antebraço + punho fechado
  stroke([[86, 262], [56, 214, 40, 170, 58, 132]], CREAM, 40);
  stroke([[64, 126], [74, 96, 84, 66, 98, 44]], SKIN, 20);
  ell(102, 36, 15, 13, -0.3, SKIN); stroke([[92, 30], [98, 26], [108, 28]], SKIN2, 2);   // dedos dobrados
  stroke([[50, 220], [40, 184, 44, 156, 52, 140]], SHADE, 6); stroke([[70, 236], [62, 210, 60, 186, 66, 168]], SHADE, 3);   // dobras da manga
  // tronco: blusa drapeada e cintura marcada
  fill([[84, 252], [104, 236, 124, 228, 140, 230], [160, 232, 178, 238, 186, 252], [200, 300, 196, 360, 178, 404], [100, 404], [88, 360, 80, 300, 84, 252]], CREAM);
  fill([[84, 252], [96, 300, 104, 360, 100, 404], [88, 360, 80, 300, 84, 252]], SHADE);                       // lado da sombra
  for (const [a, b] of [[[112, 262], [104, 330, 116, 380, 122, 400]], [[132, 252], [128, 320, 140, 370, 146, 400]], [[118, 288], [150, 310, 168, 350, 174, 392]], [[150, 252], [162, 290, 170, 340, 172, 372]]]) stroke([a, b], SHADE, 3);
  fill([[98, 400], [180, 400], [182, 420], [96, 420]], SHADE); stroke([[98, 410], [182, 410]], '#a8916b', 2);           // cinto
  fill([[96, 420], [182, 420], [192, 470], [86, 470]], CREAM); stroke([[118, 424], [112, 468]], SHADE, 3); stroke([[150, 424], [156, 468]], SHADE, 3);
  // pescoço esticado (cabeça para trás)
  fill([[122, 232], [128, 210, 134, 194, 138, 182], [160, 186], [158, 206, 156, 222, 156, 236]], SKIN);
  fill([[122, 232], [128, 212, 134, 196, 138, 184], [144, 186], [140, 206, 136, 222, 134, 234]], SKIN2);
  // rosto de perfil virado para a luz
  fill([[140, 186], [126, 168, 128, 136, 150, 118], [168, 108, 184, 118, 188, 130], [192, 136, 196, 140, 200, 146], [192, 150], [194, 158, 192, 164, 186, 166],
        [190, 172, 186, 180, 176, 184], [166, 192, 152, 194, 140, 186]], SKIN);
  fill([[140, 186], [128, 168, 130, 140, 146, 124], [150, 150, 152, 172, 158, 192]], SKIN2);                      // sombra da face
  stroke([[160, 132], [168, 128, 176, 128, 182, 132]], HAIR, 3);                                                     // sobrancelha
  stroke([[164, 142], [170, 146, 176, 146, 180, 142]], HAIR, 2.5); for (const x of [166, 171, 176]) stroke([[x, 145], [x - 2, 149]], HAIR, 1.5);   // olho fechado + cílios
  fill([[180, 166], [190, 166, 194, 170, 192, 176], [186, 180, 180, 176, 178, 170]], '#5e1414'); fill([[182, 166], [190, 166], [188, 169], [183, 169]], '#f6eee3');   // boca cantando
  ell(160, 160, 7, 4, -0.4, 'rgba(164,22,26,.28)');                                                                   // bochecha
  // orelha + brinco longo dourado
  ell(146, 160, 6, 9, -0.3, SKIN2); stroke([[146, 170], [145, 196], [144, 214]], GOLD, 2.5); for (const y of [182, 198, 214]) ell(144.5 + (y - 182) * -0.03, y, 3.2, 4.4, 0, GOLD);
  // cabelo curtinho: volume atrás, nuca curta, franja repicada sobre a testa
  fill([[128, 176], [116, 160, 114, 128, 128, 108], [142, 92, 168, 90, 186, 104], [192, 110, 194, 116, 192, 122], [184, 116], [186, 126], [176, 118], [176, 130], [166, 118],
        [162, 132], [154, 120], [150, 140], [146, 126], [140, 150], [138, 170]], HAIR);
  fill([[126, 172], [118, 184], [132, 182]], HAIR);
  stroke([[140, 104], [158, 96, 176, 100, 186, 108]], 'rgba(242,182,50,.55)', 2);                                   // brilho de luz no cabelo
  // braço do microfone: manga, mão perto da boca, microfone com grade e anel dourado
  stroke([[184, 254], [222, 280, 230, 300, 214, 262], [204, 238, 200, 224, 198, 216]], CREAM, 30);
  stroke([[200, 268], [214, 280, 220, 290, 214, 262]], SHADE, 3);
  ell(196, 214, 12, 11, 0.3, SKIN);
  stroke([[198, 216], [204, 198, 208, 186, 210, 180]], '#262626', 9);
  ell(214, 168, 14, 15, 0.35, '#2e2e2e');
  for (let a = 0; a < 18; a++) { const r = 4 + (a % 3) * 3.4, t = a * 2.1; g.fillStyle = '#5a5a5a'; g.fillRect(214 + Math.cos(t) * r - 1, 168 + Math.sin(t) * r - 1, 2, 2); }
  g.strokeStyle = GOLD; g.lineWidth = 3; g.beginPath(); g.ellipse(212, 180, 9, 3.5, 0.35, 0, Math.PI * 2); g.stroke();
  stroke([[192, 224], [228, 290, 200, 360, 226, 430], [238, 470, 224, 492, 236, 512]], '#6a6a6a', 2.5);              // fio caindo
  // 3. luz de contorno dourada (lado do facho), levemente fora de registro como no silk
  g.save(); g.translate(2, -1);
  stroke([[186, 252], [200, 300, 196, 360, 178, 404]], GOLD, 3);
  stroke([[150, 118], [168, 108, 184, 118, 188, 130], [192, 136, 196, 140, 200, 146]], GOLD, 2.5);
  stroke([[98, 44], [84, 66, 74, 96, 64, 126]], GOLD, 2);
  stroke([[222, 280], [230, 300, 214, 262]], GOLD, 2.5);
  g.restore();
  // 4. meio-tom de impressão: a ilustração vira pontos (trama 45°) em preto + 1 cor-spot sobre papel creme
  const sd = g.getImageData(0, 0, W, H).data, out = document.createElement('canvas'); out.width = W; out.height = H; const o = out.getContext('2d');
  o.fillStyle = '#efe4cc'; o.fillRect(0, 0, W, H);
  const S = 4.2;
  for (let u = -H; u < W + H; u += S) for (let w = -H; w < W + H; w += S) {
    const x = (u - w) * 0.7071, y = (u + w) * 0.7071; if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const k = ((y | 0) * W + (x | 0)) * 4, r = sd[k], gg = sd[k + 1], b = sd[k + 2], L = (0.3 * r + 0.59 * gg + 0.11 * b) / 255;
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), sat = (mx - mn) / (mx + 1), spot = sat > 0.45 && mx > 90;
    const cov = spot ? 0.62 + 0.3 * (1 - L) : 1 - L, rad = S * 0.66 * Math.sqrt(Math.max(0, cov));
    if (rad < 0.4) continue;
    o.fillStyle = spot ? (r > gg * 1.6 ? '#b3121b' : '#d99a14') : '#141012'; o.beginPath(); o.arc(x, y, rad, 0, Math.PI * 2); o.fill();
  }
  // 5. nome nítido por cima (fonte bitmap) + leve grão
  o.fillStyle = '#141012'; o.fillRect(0, 446, W, 66);
  textBlock(o, 'ELIS', 16, 450, W - 32, 6, '#efe4cc', { shadow: '#b3121b' });
  textBlock(o, 'REGINA 1945-1982', 16, 501, W - 32, 1, '#d99a14');
  for (let i = 0; i < 2500; i++) { const x = Math.random() * W | 0, y = Math.random() * 446 | 0; o.fillStyle = 'rgba(20,16,18,.06)'; o.fillRect(x, y, 1, 1); }
  return out;
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
