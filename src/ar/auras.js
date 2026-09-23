// src/ar/auras.js — 아우라 스킨 + 추적 명암 (GAMEPLAY_V7 §4.1–4.2)
// 연출 전용 모듈: 시뮬레이션(감지·게이지·등급·보상)에 관여하지 않는다.
// 의존: state(보유·장착 필드), WONDERS(챕터 기본 매핑). economy.js 는 이 모듈을 import 하므로 여기서 economy 를 import 하지 않는다.
import { state, save } from '../game/state.js';
import { WONDERS } from '../data/wonders.js';

// ── 팔레트 (DESIGN.md 2) — 스킨 2색 + 런타임 희귀도 잉크(draw 의 color)
const BONE = '#EDE6D6', BONE2 = '#CFC7B4', BRASS = '#E2B45A', BRASS_D = '#C99A3F', VERDIGRIS = '#6DB5A0', INK0 = '#0F141E', INK3 = '#273244', ROSE = '#E39BC0';
const TAU = Math.PI * 2;

/** 스킨 레지스트리. kind = 이미터 동작 (rise·drift·orbit·ink·shard). price 0 = 기본(항상 보유). */
export const AURAS = {
  ember:     { id: 'ember',     name: '잔불',     desc: '황동 불씨가 피어오르는 기본 아우라',        price: 0,   palette: [BRASS, BRASS_D],   kind: 'rise'  },
  verdigris: { id: 'verdigris', name: '녹청 안개', desc: '청록 입자가 천천히 감도는 안개',            price: 150, palette: [VERDIGRIS, BONE2], kind: 'drift' },
  orbit:     { id: 'orbit',     name: '궤도',     desc: '얇은 링 두 개가 교차하며 도는 궤도',        price: 220, palette: [BONE, BRASS],      kind: 'orbit' },
  ink:       { id: 'ink',       name: '먹번짐',   desc: '그림자가 번지며 맥동하는 먹',               price: 260, palette: [INK0, INK3],       kind: 'ink'   },
  prism:     { id: 'prism',     name: '프리즘',   desc: '장미빛 파편이 반짝이는 빛 · 변이체는 기본 장착', price: 400, palette: [ROSE, BONE],       kind: 'shard' },
};
export const AURA_IDS = Object.keys(AURAS);
export const DEFAULT_AURA_BY_CHAPTER = { desk: 'orbit', kitchen: 'ember', home: 'ink', street: 'ember', living: 'verdigris', play: 'verdigris' };
export const VARIANT_AURA = 'prism';
export const POOL_MAX = 48;
/** 연출 타이밍(ms). BALANCE 가 아니라 연출 상수. */
/** spotlightMs · spotlightAlpha 는 staging.js STAGING 의 값과 같다 (§2 포획 링 등장: 80ms 동안 bbox 밖 0.4) — 여기서 CSS 를 끌고 오지 않으려고 복제 */
export const AURA_TIMING = { fadeInMs: 160, pulseMs: 300, contractMs: 300, freezeMs: 90, scatterMs: 250, cancelMs: 400, staleMs: 400, spotlightMs: 80, spotlightAlpha: 0.4 };

const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

// ── 상태 접근 (추가 필드 — 옛 저장본에는 없을 수 있으므로 방어적으로 기본값을 심는다)
const skins = () => { if (!Array.isArray(state.auraSkins)) state.auraSkins = ['ember']; return state.auraSkins; };
const byLabel = () => { if (!state.auraByLabel || typeof state.auraByLabel !== 'object' || Array.isArray(state.auraByLabel)) state.auraByLabel = {}; return state.auraByLabel; };

/** 보유 여부 — 무료 스킨은 항상 보유 */
export const ownsAura = (id) => { const a = AURAS[id]; if (!a) return false; const list = skins(); return a.price === 0 || list.includes(id); };

/** 라벨의 아우라 id 해석: 원더별 장착 → 변이체(prism) → 전체 기본(state.auraSkin) → 챕터 기본 → ember. 미보유 스킨도 기본 매핑으로는 보인다. */
export function auraFor(label, { variant = false } = {}) {
  const pick = label != null ? byLabel()[label] : null;
  if (pick && AURAS[pick]) return pick;
  if (variant) return VARIANT_AURA;
  const g = state.auraSkin;
  if (g && AURAS[g]) return g;
  return DEFAULT_AURA_BY_CHAPTER[WONDERS[label]?.chapter] ?? 'ember';
}
/** 장착. label=null → 전체 기본(state.auraSkin). id=null → 해당 장착 해제(기본 매핑으로 복귀). 보유하지 않은 스킨이면 false. */
export function equipAura(label, id) {
  if (id != null && !ownsAura(id)) return false;
  if (label == null) state.auraSkin = id ?? null;
  else { const m = byLabel(); if (id == null) delete m[label]; else m[label] = id; }
  save(); return true;
}
/** 구매: 별가루 차감 + state.auraSkins 에 추가 */
export function buyAura(id) {
  const a = AURAS[id]; if (!a) return { ok: false, msg: '없는 스킨' };
  if (ownsAura(id)) return { ok: false, msg: '이미 보유' };
  const dust = Number(state.dust) || 0;
  if (dust < a.price) return { ok: false, msg: `별가루가 ${a.price - dust} 부족해요` };
  state.dust = dust - a.price; skins().push(id); save();
  return { ok: true, item: a, msg: `${a.name} 아우라 획득!` };
}

// ── 이미터 (풀 48, 프레임당 할당 0, draw call ≤ 3)
const mkParticle = () => ({ a: 0, d: 0, sp: 0, sz: 0, ph: 0, c: 0, ring: 0, life: 0, spin: 0, x: 0, y: 0, vx: 0, vy: 0 });
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
// 그룹 알파 [팔레트0, 팔레트1, 희귀도 잉크]
const GROUP_ALPHA = { rise: [0.85, 0.7, 0.9], drift: [0.42, 0.3, 0.38], orbit: [0.5, 0.9, 0.95], ink: [0.34, 0.28, 0.55], shard: [0.9, 0.8, 0.95] };

/** 원더 하나에 붙는 아우라 이미터. draw 의 box 는 화면 좌표 [X,Y,W,H]. */
export function createAura(id) {
  const spec = AURAS[id] ?? AURAS.ember;
  const kind = spec.kind, alphas = GROUP_ALPHA[kind];
  const pool = new Array(POOL_MAX); for (let i = 0; i < POOL_MAX; i++) pool[i] = mkParticle();
  let active = 0, phase = 'idle', phaseAt = 0, startAt = 0, lastDraw = -1e9, contract = 1, rotA = 0, rotB = 0, scattered = false;

  const spawn = (p, i) => {
    const r = Math.random;
    p.a = r() * TAU; p.d = 0.95 + r() * 0.45; p.ph = r() * TAU; p.life = r(); p.spin = r() * TAU; p.vx = 0; p.vy = 0;
    p.ring = i & 1; p.c = kind === 'orbit' ? 1 + (i & 1) : i % 3;
    if (kind === 'rise')       { p.sp = 0.35 + r() * 0.45; p.sz = 1.2 + r() * 1.6; }
    else if (kind === 'drift') { p.sp = 0.08 + r() * 0.12; p.sz = 2.2 + r() * 2.2; }
    else if (kind === 'orbit') { p.sp = 0.8 + r() * 0.9; p.sz = 1.2 + r() * 1.2; }
    else if (kind === 'ink')   { p.sp = 0.04 + r() * 0.06; p.sz = 5 + r() * 8; }
    else                       { p.sp = 0.25 + r() * 0.45; p.sz = 2 + r() * 2.5; }
  };
  const toPhase = (p, at) => { phase = p; phaseAt = at; if (p === 'capture') scattered = false; if (p === 'idle') active = 0; };

  return {
    id: spec.id,
    get phase() { return phase; },
    /** 살아 있는 파티클 수. 상실(setPhase('cancel') 또는 draw 중단) 뒤 400ms 안에 0. */
    get count() {
      if (phase === 'idle' || active === 0) return 0;
      const t = nowMs();
      if (t - lastDraw > AURA_TIMING.staleMs) return 0;
      if (phase === 'cancel' && t - phaseAt >= AURA_TIMING.cancelMs) return 0;
      if (phase === 'capture' && t - phaseAt >= AURA_TIMING.freezeMs + AURA_TIMING.scatterMs) return 0;
      return active;
    },
    reset() { toPhase('idle', nowMs()); contract = 1; },
    /** 'tracking' | 'charged' | 'capture' | 'cancel' | 'idle' — tracking↔charged 는 gauge 로도 자동 전이. at = 프레임 시각(생략 시 performance.now(); draw 의 now 와 같은 시계여야 한다) */
    setPhase(p, at) {
      const t = at ?? nowMs();
      if (p === 'idle') { toPhase('idle', t); return; }
      if (p === 'tracking' && (phase === 'idle' || phase === 'cancel' || phase === 'capture')) { startAt = t; contract = 1; if (phase !== 'cancel') active = 0; }
      if ((p === 'capture' || p === 'cancel') && active === 0) { toPhase('idle', t); return; }
      toPhase(p, t);
    },
    draw(x, { cx, cy, r, box = null, gauge = 0, dt = 1 / 60, now, color = BONE, reduceMotion = false }) {
      const t = now ?? nowMs();
      const stale = t - lastDraw > AURA_TIMING.staleMs; lastDraw = t;
      dt = clamp(dt || 1 / 60, 0, 0.05);
      const g = clamp(gauge || 0, 0, 1);
      let hw = Math.max(12, r || 12), hh = hw;
      if (box) { hw = Math.max(hw, box[2] * 0.5); hh = Math.max(hh, box[3] * 0.5); }
      // 모션 줄이기: 이미터 OFF → 정적 아우라 링 1개(스킨 색, 1px)
      if (reduceMotion) {
        active = 0; if (phase === 'idle') toPhase('tracking', t);
        x.globalAlpha = 0.7; x.lineWidth = 1; x.strokeStyle = spec.palette[0];
        x.beginPath(); x.ellipse(cx, cy, hw * 1.12 + 4, hh * 1.12 + 4, 0, 0, TAU); x.stroke(); x.globalAlpha = 1;
        return;
      }
      if (phase === 'idle' || (stale && phase !== 'capture' && phase !== 'cancel')) { toPhase('tracking', t); startAt = t; contract = 1; active = 0; }
      if (phase === 'tracking' && g >= 0.999) toPhase('charged', t);
      else if (phase === 'charged' && g < 0.9) toPhase('tracking', t);
      const el = t - phaseAt;
      let fade = 1, move = 1;
      if (phase === 'tracking' || phase === 'charged') {
        const want = phase === 'charged' ? POOL_MAX : clamp(Math.round(4 + g * 44), 4, POOL_MAX);
        while (active < want) spawn(pool[active], active++);
        if (active > want) active = want;
        const target = phase === 'charged' ? 1 - 0.3 * Math.min(1, el / AURA_TIMING.contractMs) : 1;
        contract += (target - contract) * Math.min(1, dt * 10);
        fade = Math.min(1, (t - startAt) / AURA_TIMING.fadeInMs);
      } else if (phase === 'capture') {
        if (el >= AURA_TIMING.freezeMs + AURA_TIMING.scatterMs) { toPhase('idle', t); return; }
        if (el < AURA_TIMING.freezeMs) move = 0;
        else {
          if (!scattered) { scattered = true; for (let i = 0; i < active; i++) { const p = pool[i]; const dx = p.x - cx, dy = p.y - cy, len = Math.hypot(dx, dy) || 1; p.vx = dx / len; p.vy = dy / len; } }
          const s = (el - AURA_TIMING.freezeMs) / AURA_TIMING.scatterMs; fade = 1 - s * s; move = 0;
          for (let i = 0; i < active; i++) { const p = pool[i]; p.x += p.vx * dt * 320; p.y += p.vy * dt * 320; }
        }
      } else if (phase === 'cancel') {
        if (el >= AURA_TIMING.cancelMs) { toPhase('idle', t); return; }
        fade = 1 - el / AURA_TIMING.cancelMs; move = 0.5;
      }
      if (active === 0) return;
      fade = clamp(fade, 0, 1);
      // ── 스텝 (위치 갱신)
      const rx = hw * 1.15 * contract, ry = hh * 1.15 * contract;
      if (move > 0) {
        if (kind === 'orbit') { rotA += dt * 0.55 * move; rotB -= dt * 0.38 * move; }
        for (let i = 0; i < active; i++) {
          const p = pool[i];
          if (kind === 'rise') {
            p.life += p.sp * dt * move; if (p.life > 1) p.life -= 1;
            const bx = cx + Math.cos(p.a) * rx * p.d, by = cy + Math.abs(Math.sin(p.a)) * ry * p.d * 0.8;
            p.x = bx + Math.sin(p.life * 6 + p.ph) * 4; p.y = by - p.life * ry * 1.5;
          } else if (kind === 'drift') {
            p.a += p.sp * dt * move;
            p.x = cx + Math.cos(p.a) * rx * p.d + Math.sin(t * 0.0007 + p.ph) * 6;
            p.y = cy + Math.sin(p.a) * ry * p.d + Math.cos(t * 0.0009 + p.ph) * 6;
          } else if (kind === 'orbit') {
            p.a += p.sp * dt * move; const rot = p.ring ? rotB : rotA, R = p.ring ? rx * 1.05 : rx * 1.25;
            const lx = Math.cos(p.a) * R, ly = Math.sin(p.a) * R * 0.36;
            p.x = cx + lx * Math.cos(rot) - ly * Math.sin(rot); p.y = cy + lx * Math.sin(rot) + ly * Math.cos(rot);
          } else if (kind === 'ink') {
            p.a += p.sp * dt * move;
            p.x = cx + Math.cos(p.a) * rx * p.d * 0.92; p.y = cy + Math.sin(p.a) * ry * p.d * 0.92;
          } else {
            p.a += p.sp * dt * move; p.spin += dt * 3 * move;
            p.x = cx + Math.cos(p.a) * rx * p.d; p.y = cy + Math.sin(p.a) * ry * p.d * 0.9;
          }
        }
      }
      // ── 페인트: 색 그룹당 path 1개 (≤ 3 draw call). 개별 알파 대신 크기로 깜빡임을 표현한다.
      if (kind === 'orbit') {
        x.globalAlpha = alphas[0] * fade; x.lineWidth = 1; x.strokeStyle = spec.palette[0]; x.beginPath();
        x.ellipse(cx, cy, rx * 1.25, rx * 1.25 * 0.36, rotA, 0, TAU); x.moveTo(cx + rx * 1.05 * Math.cos(rotB), cy + rx * 1.05 * Math.sin(rotB));
        x.ellipse(cx, cy, rx * 1.05, rx * 1.05 * 0.36, rotB, 0, TAU); x.stroke();
      }
      for (let gI = kind === 'orbit' ? 1 : 0; gI < 3; gI++) {
        x.fillStyle = gI < 2 ? spec.palette[gI] : color; x.globalAlpha = alphas[gI] * fade; x.beginPath();
        let any = false;
        for (let i = 0; i < active; i++) {
          const p = pool[i]; if (p.c !== gI) continue; any = true;
          if (kind === 'rise')       { const s = p.sz * Math.sin(p.life * Math.PI); if (s < 0.2) continue; x.moveTo(p.x + s, p.y); x.arc(p.x, p.y, s, 0, TAU); }
          else if (kind === 'drift') { const s = p.sz * (0.7 + 0.3 * Math.sin(t * 0.002 + p.ph)); x.moveTo(p.x + s, p.y); x.arc(p.x, p.y, s, 0, TAU); }
          else if (kind === 'orbit') { const s = p.sz * (gI === 2 ? 1.4 : 1); x.moveTo(p.x + s, p.y); x.arc(p.x, p.y, s, 0, TAU); }
          else if (kind === 'ink')   { const s = p.sz * (gI === 2 ? 0.35 : 1) * (0.72 + 0.28 * Math.sin(t * 0.003 + p.ph)) * (phase === 'charged' ? 1.15 : 1); x.moveTo(p.x + s, p.y); x.arc(p.x, p.y, s, 0, TAU); }
          else { const s = p.sz * (0.45 + 0.55 * Math.abs(Math.sin(t * 0.008 + p.ph))); const c = Math.cos(p.spin), sn = Math.sin(p.spin);
                 x.moveTo(p.x + c * s, p.y + sn * s); x.lineTo(p.x - sn * s * 0.45, p.y + c * s * 0.45); x.lineTo(p.x - c * s, p.y - sn * s); x.lineTo(p.x + sn * s * 0.45, p.y - c * s * 0.45); x.closePath(); }
        }
        if (any) x.fill();
      }
      x.globalAlpha = 1;
    },
  };
}

// ── 추적 명암 (§4.1): ① 바깥 어둠(even-odd 1회) ② 안쪽 빛(라디얼 1회). draw call 2, 파티클 0, blur 0.
let shadeSeenAt = -1e9, shadeStartAt = 0, shadeChargedAt = -1e9, shadePrevGauge = 0, shadeMode = 'scan', shadeModeAt = -1e9;
function rrPath(x, X, Y, W, H, r) { x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
/**
 * box = 화면 좌표 [X,Y,W,H]. tracking 페이드인 160ms, gauge 1 도달 시 안쪽 빛 1회 맥동 300ms(모션 줄이기면 정적).
 * opts.mode 'scan' | 'capture' | 'grade' — capture/grade 면 §2 스포트라이트와 합쳐진다: 바깥 어둠 0.10+g·0.15 → 0.4 로 80ms 램프, pad 6→8 · r 14→22.
 *   이때 호출자는 drawSpotlight 를 따로 그리지 않는다 (이중 even-odd 채움 · 반경 충돌 방지).
 * opts.now  = 프레임 시각 (overlay 가 sil/aura 에 주는 것과 같은 시계 — 헤드리스 QA 의 주입 시간도 따른다). 생략 시 performance.now().
 */
export function drawTrackingShade(x, cw, ch, box, gauge = 0, reduceMotion = false, { mode = 'scan', now } = {}) {
  if (!box) return;
  const t = now ?? nowMs();
  if (t - shadeSeenAt > 200) { shadeStartAt = t; shadeMode = 'scan'; shadeModeAt = -1e9; } shadeSeenAt = t;
  const g = clamp(gauge || 0, 0, 1);
  if (g >= 0.999 && shadePrevGauge < 0.999) shadeChargedAt = t; shadePrevGauge = g;
  const m = mode || 'scan'; if (m !== shadeMode) { shadeMode = m; shadeModeAt = t; }
  const spot = m === 'capture' || m === 'grade';
  const fadeIn = reduceMotion ? 1 : Math.min(1, (t - shadeStartAt) / AURA_TIMING.fadeInMs);
  // capture: 바깥 어둠을 spotlightAlpha(0.4) 로 80ms 램프 (모션 줄이기면 즉시) — 위상 진입 시각 기준
  const k = spot ? (reduceMotion ? 1 : Math.min(1, (t - shadeModeAt) / AURA_TIMING.spotlightMs)) : 0;
  const base = 0.10 + g * 0.15, outer = base + (AURA_TIMING.spotlightAlpha - base) * k;
  const X = box[0], Y = box[1], W = box[2], H = box[3], pad = 6 + 2 * k, PW = W + pad * 2, PH = H + pad * 2, rad = Math.min(14 + 8 * k, PW / 2, PH / 2);
  x.save();
  x.beginPath(); x.rect(0, 0, cw, ch); rrPath(x, X - pad, Y - pad, PW, PH, rad);
  x.fillStyle = INK0; x.globalAlpha = outer * Math.max(fadeIn, k); x.fill('evenodd');
  const pt = (t - shadeChargedAt) / AURA_TIMING.pulseMs;
  const pulse = !reduceMotion && pt >= 0 && pt < 1 ? 1 + Math.sin(pt * Math.PI) * 0.25 : 1;
  const cx = X + W / 2, cy = Y + H / 2, R = Math.max(24, Math.max(W, H) * (0.55 + g * 0.35) * pulse);
  const grad = x.createRadialGradient(cx, cy, 0, cx, cy, R); grad.addColorStop(0, 'rgba(237,230,214,.14)'); grad.addColorStop(1, 'rgba(237,230,214,0)');
  x.fillStyle = grad; x.globalAlpha = Math.min(1, fadeIn * pulse); x.fillRect(cx - R, cy - R, R * 2, R * 2);
  x.restore();
}
