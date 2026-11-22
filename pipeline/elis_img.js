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
