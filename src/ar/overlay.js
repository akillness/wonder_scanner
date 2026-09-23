import { WONDERS, RARITY } from '../data/wonders.js';
import { BALANCE } from '../game/balance.js';
import * as auras from './auras.js';

/** 등급 잉크 — BALANCE 등급 색을 표본 일지 팔레트로 사상 (표시 전용; 수치·판정과 무관) */
export const GRADE_INK = { PERFECT: '#E2B45A', GREAT: '#6DB5A0', GOOD: '#EDE6D6', AUTO: '#EDE6D6', MISS: '#D2706A' };
export const gradeInk = (grade, fallback = '#EDE6D6') => GRADE_INK[grade] ?? fallback;
// DESIGN.md §4.10 AR 오버레이 잉크
const BONE = '#EDE6D6', BRASS = '#E2B45A', PENCIL = '#8F8A7C';
const FONT_MONO = '500 12px "IBM Plex Mono", monospace', FONT_BODY = '600 15px "IBM Plex Sans KR", sans-serif', FONT_GRADE = '700 28px Fraunces, "Gowun Batang", serif';

/** bbox 스무딩(AR 흔들림 억제) */
export function createTracker() {
  let box = null;
  return {
    update(bbox, dt) {
      if (!bbox) { box = null; return null; }
      if (!box) { box = [...bbox]; return box; }
      const k = Math.min(1, dt * 9);
      for (let i = 0; i < 4; i++) box[i] += (bbox[i] - box[i]) * k;
      return box;
    },
    get box() { return box; },
  };
}

/** object-fit: cover 좌표 변환 */
export function coverTransform(source, cw, ch) {
  const sw = source.videoWidth || source.naturalWidth || source.width || 1, sh = source.videoHeight || source.naturalHeight || source.height || 1;
  const s = Math.max(cw / sw, ch / sh);
  return { s, ox: (cw - sw * s) / 2, oy: (ch - sh * s) / 2 };
}

const auraParticles = [];
/** 정적 요소: 뷰파인더 브래킷(뼈색 hairline) + 황동 스캔라인 */
export function drawFrame(x, cw, ch, now) {
  x.strokeStyle = 'rgba(237,230,214,.28)'; x.lineWidth = 1; const m = Math.min(cw, ch) * 0.1;
  x.beginPath(); x.moveTo(m, m + 28); x.lineTo(m, m); x.lineTo(m + 28, m); x.moveTo(cw - m - 28, m); x.lineTo(cw - m, m); x.lineTo(cw - m, m + 28);
  x.moveTo(m, ch - m - 28); x.lineTo(m, ch - m); x.lineTo(m + 28, ch - m); x.moveTo(cw - m - 28, ch - m); x.lineTo(cw - m, ch - m); x.lineTo(cw - m, ch - m - 28); x.stroke();
  const ly = (now / 12) % ch; const g = x.createLinearGradient(0, ly - 40, 0, ly + 40); g.addColorStop(0, 'transparent'); g.addColorStop(.5, 'rgba(226,180,90,.10)'); g.addColorStop(1, 'transparent');
  x.fillStyle = g; x.fillRect(0, ly - 40, cw, 80);
}

// 프레임당 할당 0 을 위한 스크래치 (화면 좌표 박스) + 진행 태그 문자열 캐시
const SCR_BOX = [0, 0, 0, 0];
const tagCache = { label: null, conf: -1, res: -1, owned: null, boosted: null, text: '' };
/** 진행 태그 텍스트 — `label · conf 87% · 공명 62%` (포획 링 단계는 `탭!`). 값이 바뀔 때만 문자열 생성 */
function progressTag(label, name, owned, conf, res, mode, boosted) {
  if (mode === 'capture') return '탭!';
  const c = tagCache;
  if (c.label === label && c.conf === conf && c.res === res && c.owned === owned && c.boosted === boosted) return c.text;
  c.label = label; c.conf = conf; c.res = res; c.owned = owned; c.boosted = boosted;
  c.text = `${owned ? name : label} · conf ${conf}% · 공명 ${res}%${boosted ? ' · 부스트' : ''}`;
  return c.text;
}

/**
 * 타깃: (명암) + 실루엣/브래킷 + 아우라 + 공명 링 + 진행 태그. 반환: 중심 좌표 { cx, cy, r, col }
 * GAMEPLAY_V7 §1·§4.1·§4.2 선택 옵션(모두 생략 가능 — 생략 시 기존 표시 그대로):
 *   sil   → createSilhouette() 인스턴스. 있으면 sil.draw 가 평범한 브래킷을 대체 (각인 윤곽 = 진행 바)
 *   mode  → 'scan' | 'capture' | 'grade'. 'capture' 면 태그가 `탭!`, 윤곽은 실선
 *   aura  → createAura(id) 인스턴스. 있으면 aura.draw 가 내장 오라 파티클을 대체
 *   shade → true 면 auras.drawTrackingShade 를 가장 먼저 그린다 (바깥 어둠 + 안쪽 빛)
 */
export function drawTarget(x, { box, label, score, gauge, cooldownMs, owned, now, dt, reduceMotion, boosted, sil = null, mode, aura = null, shade = false }, tf) {
  const [bx, by, bw, bh] = box; const X = bx * tf.s + tf.ox, Y = by * tf.s + tf.oy, W = bw * tf.s, H = bh * tf.s;
  const w = WONDERS[label], rar = RARITY[w?.rarity] ?? RARITY[1]; const col = cooldownMs != null ? PENCIL : w ? rar.color : 'rgba(237,230,214,.6)'; // 모르는 라벨 = Bone 60% (§1.2)
  const cx = X + W / 2, cy = Y + H / 2, r = Math.max(30, Math.min(W, H) * 0.32);
  const g = gauge < 0 ? 0 : gauge > 1 ? 1 : gauge, m = mode ?? 'scan';
  SCR_BOX[0] = X; SCR_BOX[1] = Y; SCR_BOX[2] = W; SCR_BOX[3] = H;
  // ⓪ 추적 명암 (§4.1) — 실루엣 아래, 가장 먼저. auras.js 가 아직 없거나 export 가 없으면 조용히 생략
  if (shade && typeof auras.drawTrackingShade === 'function') { try { auras.drawTrackingShade(x, x.canvas.width, x.canvas.height, SCR_BOX, g, reduceMotion); } catch { /* 표시 전용 */ } x.globalAlpha = 1; }
  // ① 각인 윤곽(실루엣) 또는 기존 타겟 박스: 희귀도 잉크 1.5px 외곽선 + 코너 틱 (글로우 없음)
  if (sil && typeof sil.draw === 'function') sil.draw(x, { box, gauge: g, color: col, now, mode: m, reduceMotion, tf });
  else {
    x.lineWidth = 1.5; x.strokeStyle = col; x.globalAlpha = 0.45; x.strokeRect(X, Y, W, H); x.globalAlpha = 1;
    const L = 10 + Math.min(W, H) * 0.06; x.lineWidth = 2.5; x.lineCap = 'round';
    x.beginPath(); x.moveTo(X, Y + L); x.lineTo(X, Y); x.lineTo(X + L, Y); x.moveTo(X + W - L, Y); x.lineTo(X + W, Y); x.lineTo(X + W, Y + L);
    x.moveTo(X, Y + H - L); x.lineTo(X, Y + H); x.lineTo(X + L, Y + H); x.moveTo(X + W - L, Y + H); x.lineTo(X + W, Y + H); x.lineTo(X + W, Y + H - L); x.stroke(); x.lineCap = 'butt';
  }
  // ② 아우라 (§4.2 스킨 이미터가 있으면 그것이, 없으면 내장 오라 파티클)
  if (aura && typeof aura.draw === 'function') {
    auraParticles.length = 0;
    aura.draw(x, { cx, cy, r, box: SCR_BOX, gauge: g, dt, now, color: col, reduceMotion }); x.globalAlpha = 1;
  } else if (!reduceMotion && cooldownMs == null) {
    const want = Math.floor(4 + g * 22 * ((w?.rarity ?? 1) / 2));
    while (auraParticles.length < want) auraParticles.push({ a: Math.random() * Math.PI * 2, d: 0.7 + Math.random() * 0.6, sp: 0.6 + Math.random() * 1.2, sz: 1.5 + Math.random() * 2 });
    while (auraParticles.length > want) auraParticles.pop();
    for (const p of auraParticles) { p.a += p.sp * dt; const rr = r * (1.15 + p.d * 0.5 * (1 - g * 0.5)); const px = cx + Math.cos(p.a) * rr, py = cy + Math.sin(p.a) * rr * 0.75; x.globalAlpha = 0.35 + g * 0.55; x.fillStyle = col; x.beginPath(); x.arc(px, py, p.sz, 0, Math.PI * 2); x.fill(); }
    x.globalAlpha = 1;
  } else auraParticles.length = 0;
  // ③ 공명 링: 뼈색 트랙 + 희귀도 잉크 밴드(부스트 시 뼈색). 잉크 번짐만 살짝
  x.lineWidth = 6; x.strokeStyle = 'rgba(237,230,214,.14)'; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
  x.strokeStyle = boosted ? BONE : col; x.shadowColor = col; x.shadowBlur = 4 + g * 8; x.beginPath(); x.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g); x.stroke(); x.shadowBlur = 0;
  // ④ 진행 태그 (§1.2): 잉크 플레이트 90% + Mono `label · conf NN% · 공명 NN%` + 3px 진행 바(트랙 bone 15%, 채움 희귀도 잉크). 포획 링 단계는 `탭!`
  const bob = reduceMotion ? 0 : Math.sin(now / 500) * 3;
  const conf = Math.round((score ?? 0) * 100), res = Math.round(g * 100);
  const tag = cooldownMs != null ? `쿨다운 ${Math.ceil(cooldownMs / 1000)}s` : progressTag(label, w?.name ?? label, !!owned, conf, res, m, !!boosted);
  x.font = FONT_MONO; x.textAlign = 'center'; const tw = Math.max(72, x.measureText(tag).width + 24), th = 32, ty = Y - 44 + bob, tx = cx - tw / 2;
  x.fillStyle = 'rgba(22,29,43,.9)'; roundRect(x, tx, ty, tw, th, 8); x.fill(); x.strokeStyle = col; x.lineWidth = 1; x.stroke();
  x.beginPath(); x.moveTo(cx - 6, ty + th); x.lineTo(cx, ty + th + 6); x.lineTo(cx + 6, ty + th); x.fillStyle = col; x.fill();
  x.fillStyle = m === 'capture' ? BRASS : col; x.fillText(tag, cx, ty + 17);
  const bw2 = tw - 20, bx2 = tx + 10, by2 = ty + 23;
  x.fillStyle = 'rgba(237,230,214,.15)'; x.fillRect(bx2, by2, bw2, 3);
  x.fillStyle = m === 'capture' ? BRASS : col; x.fillRect(bx2, by2, bw2 * (m === 'capture' ? 1 : g), 3);
  return { cx, cy, r, col };
}

/** 포획 타이밍 링 */
export function drawCaptureRing(x, { cx, cy, r, col }, ring, now) {
  const C = BALANCE.capture; const R0 = r * 3.2;
  // 목표 트랙 (GOOD 범위, 뼈색) + 황금 밴드 (퍼펙트 선, 황동 3px)
  x.lineWidth = r * 3.2 * (C.good * 2); x.strokeStyle = 'rgba(237,230,214,.2)'; x.beginPath(); x.arc(cx, cy, R0 * C.target, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 3; x.strokeStyle = BRASS; x.setLineDash([6, 6]); x.beginPath(); x.arc(cx, cy, R0 * C.target, 0, Math.PI * 2); x.stroke(); x.setLineDash([]);
  // 줄어드는 링 (뼈색)
  const rr = R0 * ring.r; x.lineWidth = 4; x.strokeStyle = BONE; x.shadowColor = col; x.shadowBlur = 10; x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.stroke(); x.shadowBlur = 0;
  // 원더 오브 (물체에서 떠오른 구슬)
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r * 0.8); g.addColorStop(0, BONE); g.addColorStop(0.4, col); g.addColorStop(1, 'transparent');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r * 0.8, 0, Math.PI * 2); x.fill();
  x.fillStyle = BONE; x.font = FONT_BODY; x.textAlign = 'center'; x.fillText(`링이 노란 선에 닿을 때 탭!  ${ring.cycle + 1}/${C.cycles}`, cx, cy - R0 - 14);
}

export function drawGradeBurst(x, { cx, cy }, grade, t /* 0~1 */) {
  const G = BALANCE.capture.grades[grade] ?? { label: grade === 'MISS' ? '도망쳤다!' : grade, color: BONE };
  const col = gradeInk(grade, G.color);
  const sc = 1 + (1 - t) * 0.8; x.save(); x.globalAlpha = 1 - t * t; x.translate(cx, cy - 40 - t * 40); x.scale(sc, sc);
  x.font = FONT_GRADE; x.textAlign = 'center'; x.lineWidth = 6; x.strokeStyle = 'rgba(15,20,30,.7)'; x.strokeText(G.label, 0, 0); x.fillStyle = col; x.fillText(G.label, 0, 0); x.restore();
}

export function roundRect(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
