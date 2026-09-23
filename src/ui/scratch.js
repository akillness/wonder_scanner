/** 스크래치 카드: 컨테이너 위에 잉크 플레이트 포일(황동 각인 해칭)을 얹고 긁어서 드러낸다. 50% 이상 긁히면 자동 공개 */
export function mountScratch(zone, { label = '긁어서 확인', onReveal = () => {}, tapOnly = false } = {}) {
  const c = document.createElement('canvas'); c.className = 'scratch'; zone.appendChild(c);
  const W = c.width = Math.max(1, zone.clientWidth) * 2, H = c.height = Math.max(1, zone.clientHeight) * 2; const x = c.getContext('2d', { willReadFrequently: true });
  // 포일: 잉크 플레이트 단색 + 뼈색 시어 1개(라디얼) + 황동 해칭선
  x.fillStyle = '#161D2B'; x.fillRect(0, 0, W, H);
  const sheen = x.createRadialGradient(W * 0.3, H * 0.2, 0, W * 0.3, H * 0.2, Math.max(W, H)); sheen.addColorStop(0, 'rgba(237,230,214,.07)'); sheen.addColorStop(1, 'rgba(237,230,214,0)');
  x.fillStyle = sheen; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(226,180,90,.16)'; x.lineWidth = 2; x.beginPath(); for (let i = -H; i < W + H; i += 14) { x.moveTo(i, 0); x.lineTo(i + H, H); } x.stroke();
  x.strokeStyle = 'rgba(226,180,90,.32)'; x.lineWidth = 2; x.beginPath(); for (let i = 0; i < 14; i++) { const sx = Math.random() * W, sy = Math.random() * H, len = 10 + Math.random() * 60; x.moveTo(sx, sy); x.lineTo(sx + len, sy + len); } x.stroke();
  x.strokeStyle = 'rgba(226,180,90,.5)'; x.lineWidth = 2; x.strokeRect(3, 3, W - 6, H - 6);
  x.fillStyle = '#EDE6D6'; x.font = `600 ${Math.round(H * 0.28)}px "IBM Plex Sans KR", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(tapOnly ? '탭해서 확인' : label, W / 2, H / 2);
  let done = false, strokes = 0;
  const finish = () => { if (done) return; done = true; c.classList.add('gone'); setTimeout(() => c.remove(), 450); onReveal(); };
  const cleared = () => { const d = x.getImageData(0, 0, W, H).data; let n = 0; for (let i = 3; i < d.length; i += 4 * 23) if (d[i] === 0) n++; return n / (d.length / (4 * 23)); };
  const erase = (e) => { if (done) return; const r = c.getBoundingClientRect(); const px = (e.clientX - r.left) * (W / r.width), py = (e.clientY - r.top) * (H / r.height); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(px, py, H * 0.22, 0, Math.PI * 2); x.fill(); x.globalCompositeOperation = 'source-over'; if (++strokes % 6 === 0 && cleared() > 0.5) finish(); };
  if (tapOnly) { c.onpointerdown = finish; return finish; }
  let down = false; c.onpointerdown = (e) => { down = true; try { c.setPointerCapture(e.pointerId); } catch {} erase(e); }; c.onpointermove = (e) => { if (down) erase(e); }; c.onpointerup = c.onpointercancel = () => { down = false; if (cleared() > 0.5) finish(); };
  return finish;
}
