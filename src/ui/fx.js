import confetti from 'canvas-confetti';
import { RARITY } from '../data/wonders.js';
import { state } from '../game/state.js';

// ── 파티클
export function burst(rarity, isVariant = false) {
  const colors = isVariant ? ['#E39BC0', '#6DB5A0', '#E2B45A', '#EDE6D6'] : [RARITY[rarity].color, '#EDE6D6'];
  if (state.settings.reduceMotion) return;
  const base = { origin: { y: 0.55 }, colors, zIndex: 50, disableForReducedMotion: true };
  confetti({ ...base, particleCount: 40 + rarity * 30, spread: 60 + rarity * 15, startVelocity: 35 + rarity * 8 });
  if (rarity >= 3) setTimeout(() => confetti({ ...base, particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: .7 } }), 200);
  if (rarity >= 3) setTimeout(() => confetti({ ...base, particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: .7 } }), 200);
  if (rarity === 4 || isVariant) {
    const end = Date.now() + 1800;
    (function rain() {
      confetti({ ...base, particleCount: 6, spread: 120, startVelocity: 20, gravity: 0.6, scalar: 1.3, shapes: ['star'], origin: { x: Math.random(), y: -0.1 } });
      if (Date.now() < end) requestAnimationFrame(rain);
    })();
  }
}

// ── 화면 연출
export function flash() { if (state.settings.reduceMotion) return;
  const el = document.createElement('div'); el.className = 'flash';
  document.body.appendChild(el); setTimeout(() => el.remove(), 600);
}
export function shake(el = document.getElementById("app")) { if (state.settings.reduceMotion) return; retrigger(el, "shake"); }
export function glitch(el = document.getElementById("app")) { if (state.settings.reduceMotion) return; retrigger(el, "glitch"); }
function retrigger(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); el.addEventListener('animationend', () => el.classList.remove(cls), { once: true }); }
export function vibrate(pattern) { if (!state.settings.haptics) return; try { navigator.vibrate?.(pattern); } catch {} }

// ── Web Audio (에셋 없이 합성)
let ctx = null, master = null, tapDest = null;
function ac() { if (!state.settings.sound) return null; if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination); } if (ctx.state === 'suspended') ctx.resume(); return ctx; }
/** 녹화기가 게임 사운드를 믹스할 수 있도록 MediaStream 제공 */
export function audioStream() { const c = ac(); if (!c) return null; if (!tapDest) { tapDest = c.createMediaStreamDestination(); master.connect(tapDest); } return tapDest.stream; }
export function unlockAudio() { ac(); }
function tone(freq, { type = 'sine', dur = 0.12, vol = 0.18, at = 0, slide = 0 } = {}) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, c.currentTime + at);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + at + dur);
  g.gain.setValueAtTime(0, c.currentTime + at);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + at + dur);
  o.connect(g).connect(master); o.start(c.currentTime + at); o.stop(c.currentTime + at + dur + 0.02);
}
let lastTick = 0;
export function tick(progress) { // 게이지가 차오를수록 빨라지고 높아짐
  const now = performance.now(); const gap = 260 - progress * 190;
  if (now - lastTick < gap) return; lastTick = now;
  tone(440 + progress * 660, { type: 'square', dur: 0.05, vol: 0.05 });
}
export function chime(rarity, isVariant) {
  const scale = isVariant ? [523, 659, 784, 1047, 1319, 1568] : [[523, 659], [523, 659, 784], [523, 659, 784, 1047], [392, 523, 659, 784, 1047, 1319]][rarity - 1];
  scale.forEach((f, i) => tone(f, { type: 'triangle', dur: 0.35, vol: 0.16, at: i * 0.09 }));
  if (rarity === 4 || isVariant) tone(130, { type: 'sawtooth', dur: 1.2, vol: 0.08, at: 0.1, slide: -60 });
}
export function thud() { tone(160, { type: 'sine', dur: 0.2, vol: 0.2, slide: -90 }); }
export function blip() { tone(880, { type: 'square', dur: 0.06, vol: 0.06 }); }
export function denied() { tone(220, { type: 'square', dur: 0.15, vol: 0.08 }); tone(180, { type: 'square', dur: 0.2, vol: 0.08, at: 0.15 }); }

export function heartbeat() { tone(55, { type: 'sine', dur: 0.18, vol: 0.25, slide: -20 }); tone(50, { type: 'sine', dur: 0.22, vol: 0.2, at: 0.22, slide: -20 }); }
export function comboTone(n) { tone(520 + Math.min(n, 8) * 70, { type: 'triangle', dur: 0.12, vol: 0.12 }); tone(780 + Math.min(n, 8) * 70, { type: 'triangle', dur: 0.16, vol: 0.1, at: 0.08 }); }
export function chest() { [330, 415, 494, 660].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.3, vol: 0.14, at: i * 0.08 })); tone(880, { type: 'sine', dur: 0.6, vol: 0.12, at: 0.35 }); }
export function drumroll(ms = 1200) { const n = Math.floor(ms / 70); for (let i = 0; i < n; i++) tone(90 + (i % 2) * 20, { type: 'square', dur: 0.05, vol: 0.05 + (i / n) * 0.08, at: i * 0.07 }); }
