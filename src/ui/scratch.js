/** 스크래치 카드: 컨테이너 위에 금속 코팅 캔버스를 얹고 긁어서 드러낸다. 50% 이상 긁히면 자동 공개 */
export function mountScratch(zone, { label = '긁어서 확인', onReveal = () => {}, tapOnly = false } = {}) {
  const c = document.createElement('canvas'); c.className = 'scratch'; zone.appendChild(c);
  const W = c.width = Math.max(1, zone.clientWidth) * 2, H = c.height = Math.max(1, zone.clientHeight) * 2; const x = c.getContext('2d', { willReadFrequently: true });
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#c9d1e3'); g.addColorStop(.3, '#8b95ad'); g.addColorStop(.5, '#e8ecf5'); g.addColorStop(.7, '#7a839b'); g.addColorStop(1, '#b9c2d6');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .12})`; x.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 30, 1 + Math.random() * 2); }
  x.fillStyle = '#1a2338'; x.font = `800 ${Math.round(H * 0.28)}px system-ui`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(tapOnly ? '탭해서 확인' : `✦ ${label} ✦`, W / 2, H / 2);
  let done = false, strokes = 0;
  const finish = () => { if (done) return; done = true; c.classList.add('gone'); setTimeout(() => c.remove(), 450); onReveal(); };
  const cleared = () => { const d = x.getImageData(0, 0, W, H).data; let n = 0; for (let i = 3; i < d.length; i += 4 * 23) if (d[i] === 0) n++; return n / (d.length / (4 * 23)); };
  const erase = (e) => { if (done) return; const r = c.getBoundingClientRect(); const px = (e.clientX - r.left) * (W / r.width), py = (e.clientY - r.top) * (H / r.height); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(px, py, H * 0.22, 0, Math.PI * 2); x.fill(); x.globalCompositeOperation = 'source-over'; if (++strokes % 6 === 0 && cleared() > 0.5) finish(); };
  if (tapOnly) { c.onpointerdown = finish; return finish; }
  let down = false; c.onpointerdown = (e) => { down = true; try { c.setPointerCapture(e.pointerId); } catch {} erase(e); }; c.onpointermove = (e) => { if (down) erase(e); }; c.onpointerup = c.onpointercancel = () => { down = false; if (cleared() > 0.5) finish(); };
  return finish;
}
