import { register, go, app, $, $$, esc, typeInto, lupeHtml, goalsHtml, icon, hasIcon, momentName, momentMark } from '../shell.js';
import { goals } from '../../game/economy.js';
import { recallCandidate, daysAgo, STAGES } from '../../game/memories.js';
import { advise, activeEvent, markEventSeen } from '../../game/companion.js';
import { listMoments, fmtDuration } from '../../game/media.js';
import { state, save, rank, ownedCount, totalCount } from '../../game/state.js';
import { questSummary } from '../../game/quests.js';
import { LUPE } from '../../game/narrative.js';
import { streakMultiplier } from '../../game/balance.js';
import { requestGyro } from '../../scanner/gyro.js';
import { geoSummary, gimmickRemainingMs, remainLabel } from '../../game/spots.js';
import { distanceLabel, bearingLabel } from '../../geo/provider.js';
import * as fx from '../fx.js';

// 신규 아이콘 이름은 icons.js 에 아직 없을 수 있다 — 폴백 (DESIGN 9.2)
const PIN = hasIcon('pin') ? 'pin' : 'globe';
const WALK = hasIcon('walk') ? 'walk' : 'profile';
const THUMBS = 3;

/**
 * '근처 촬영지' 카드 (GAMEPLAY_V7 7.2 진입점).
 * 캐시(state.geo.spots)가 있으면 상위 1곳 + 기믹 요약(활성 기믹이 있으면 남은 시간, 없으면 추천 기믹) → 탭하면 spots.
 * 없으면 '찾기' 버튼 → spots (위치는 그 화면에서 탭할 때만 요청한다 — 옵트인 7.1).
 * state.geo 는 옛 저장에 없을 수 있으니 전부 방어적으로 읽는다. [data-go="spots"] 가 있으면 spots.js 의 자동 마운트는 중복 삽입하지 않는다.
 * 자리: 목표 장부 아래 · 최근 촬영 행 위. 주 CTA(.actions) 는 v7.css 가 sticky 로 하단 엄지 영역에 고정하므로 이 카드가 CTA 를 밀어내지 않는다 (DESIGN 5 · 10).
 */
function spotCardHtml() {
  let s = null;
  try { s = geoSummary(); } catch { s = null; }
  const top = s?.top ?? null, active = s?.active ?? null, suggested = s?.suggested ?? null;
  const raw = !top && Array.isArray(state.geo?.spots) ? state.geo.spots[0] : null; // recommend 가 실패해도 캐시 1곳은 보여 준다
  const spot = top ?? raw;
  if (!spot && !active) {
    return `<div class="spot-card compact spot-entry" id="spotCard">
      <div class="sp-head"><span class="sp-emblem">${icon(PIN, { size: 24 })}</span><div class="sp-title"><h3 class="sp-name">근처 촬영지</h3><div class="sp-meta">${icon(WALK, { size: 12 })} <span>카페·공원·역에서 찍을 원더 찾기</span></div></div></div>
      <button class="btn primary sm" data-go="spots" aria-label="근처 촬영지 찾기">${icon(PIN)} 찾기</button>
    </div>`;
  }
  let left = '';
  try { left = active ? remainLabel(gimmickRemainingMs()) : ''; } catch { left = ''; }
  const name = active && !spot ? `기믹 「${esc(active.title)}」 진행 중` : esc(spot?.name ?? '근처 촬영지');
  const where = spot ? [Number.isFinite(spot.dist_m) ? distanceLabel(spot.dist_m) : '', Number.isFinite(spot.bearing_deg) ? bearingLabel(spot.bearing_deg) : '', spot.chapterTitle ? esc(spot.chapterTitle) : ''].filter(Boolean).join(' · ') : '';
  const gim = active ? `기믹 「${esc(active.title)}」 ${left ? `${left} 남음` : '진행 중'} · ${esc(active.desc ?? '')}`
    : suggested ? `기믹 「${esc(suggested.title)}」 · ${esc(suggested.desc ?? '')}` : '';
  const emblem = spot?.chapter ? `<img src="/img/ch/${esc(spot.chapter)}.svg" alt="" width="24" height="24"/>` : icon(active ? 'event' : PIN, { size: 24 });
  const ell = 'style="overflow:hidden;text-overflow:ellipsis;min-width:0"';
  return `<button class="spot-card compact spot-entry ${active ? 'top' : ''}" id="spotCard" data-go="spots" aria-label="근처 촬영지 열기">
    <div class="sp-head"><span class="sp-emblem">${emblem}</span><div class="sp-title"><h3 class="sp-name">${name}</h3>
      ${where ? `<div class="sp-meta">${icon(WALK, { size: 12 })} <span ${ell}>${where}</span></div>` : ''}
      ${gim ? `<div class="sp-meta">${icon('event', { size: 12 })} <span ${ell}>${gim}</span></div>` : ''}
    </div></div>
    <div class="sp-actions"><span class="btn ghost" aria-hidden="true">${icon('arrow-right')}</span></div>
  </button>`;
}

register('title', () => {
  const r = rank(), q = questSummary(), sd = state.streak.days, ev = activeEvent();
  app.innerHTML = `
  <section class="screen title">
    <canvas class="bg-spirits" aria-hidden="true"></canvas>
    <header class="masthead">
      <div class="masthead-brand">
        <span class="aperture" aria-hidden="true"></span>
        <div class="masthead-text">
          <h1 class="wordmark">Wonder Scanner</h1>
          <p class="tagline">세상은 원더로 가득하다. 당신은 그냥 "컵"이라 부른다.</p>
        </div>
      </div>
      <button class="btn icon ghost gear" id="settings" title="설정" aria-label="설정">${icon('gear')}</button>
    </header>
    ${lupeHtml('', 'lupe', 'wide')}
    <div class="chips">
      <span class="pill ${sd >= 2 ? 'fire' : ''}">${icon('flame')} ${sd}일 연속 ${sd >= 2 ? `· XP ×${streakMultiplier(sd).toFixed(1)}` : ''}</span>
      <button class="pill ${q.done === q.total ? 'gold' : ''}" data-go="quests">${icon('quest')} 오늘의 의뢰 ${q.done}/${q.total} ›</button>
      ${state.prismTokens ? `<span class="pill prism">${icon('prism')} 프리즘 토큰 ${state.prismTokens}</span>` : ''}
    </div>
    <div id="recall"></div>
    ${ev && !ev.done ? `<div class="event-card"><span>${icon('event', { size: 24 })}</span><div><b>오늘의 사건 · ${esc(ev.title)}</b><small>${esc(ev.desc)}</small></div></div>` : ''}
    ${ownedCount() ? goalsHtml(goals()) : ''}
    ${spotCardHtml()}
    <div class="thumb-row" id="thumbs" aria-label="최근 촬영" style="display:none"></div>
    <div class="actions">
      <button class="btn primary big" id="start">${icon('camera')} 카메라 열기</button>
      <div class="row">
        <button class="btn ghost grow" data-go="codex">${icon('codex')} 도감 <small class="mono">${ownedCount()}/${totalCount()}</small></button>
        <button class="btn ghost grow" data-go="album">${icon('album')} 앨범</button>
      </div>
    </div>
    <div class="stat-strip mono"><span>Lv.<b>${r.level}</b> ${esc(r.title)}</span><span>별가루 <b>${state.dust}</b></span><span>스캔 <b>${state.scans}</b></span></div>
  </section>`;
  // 루페의 대사: { icon?, text }. 아이콘은 타자 텍스트 앞 자리(#lupe-ic)에 SVG 로 그린다.
  const lines = !state.onboarded
    ? LUPE.intro.map(text => ({ text }))
    : [ev && !ev.done ? { icon: 'event', text: `오늘의 사건: ${ev.title} — ${ev.desc}` } : null, (() => { const t = advise({ screen: 'title' }); return { icon: t.icon, text: t.text }; })()].filter(Boolean);
  if (ev) markEventSeen();
  let alive = true; const urls = [];
  (async () => {
    const el = $('#lupe'), ic = $('#lupe-ic');
    for (const l of lines) {
      if (!alive) return;
      if (ic) ic.innerHTML = l.icon ? icon(l.icon) : '';
      await typeInto(el, l.text);
      await new Promise(r => setTimeout(r, 1100));
    }
  })();
  // 카메라 열기 — 스캔 라우트 (id 'scan' 불변). 온보딩 표시·자이로 권한은 기존 그대로.
  $('#start').onclick = async () => { fx.unlockAudio(); fx.blip(); state.onboarded = true; save(); requestGyro(); go('scan'); };
  $$('[data-go]').forEach(b => b.onclick = () => { fx.blip(); go(b.dataset.go); });
  $('#settings').onclick = () => { fx.blip(); go('profile', true); };
  // 최근 촬영 3장 (GAMEPLAY_V7 6.8) — 원더·사진·영상 구분 없이 최신순. 탭 → 앨범 상세. 없으면 행을 숨긴다.
  listMoments().then(ms => {
    const el = $('#thumbs'); if (!el || !alive) return;
    const latest = (ms || []).slice(0, THUMBS);
    if (!latest.length) { el.remove(); return; }
    el.innerHTML = latest.map(m => {
      let u = ''; try { u = URL.createObjectURL(m.thumb || m.photo || m.poster); urls.push(u); } catch { u = ''; }
      const video = m.kind === 'video';
      return `<button class="thumb" data-id="${esc(m.id)}" title="${esc(momentName(m))}" aria-label="${esc(momentName(m))} 추억 열기">${u ? `<img src="${u}" alt=""/>` : momentMark(m)}${video ? `<span class="film-badge">${icon('film')} ${fmtDuration(m.duration)}</span>` : ''}</button>`;
    }).join('') + `<button class="more" data-album aria-label="앨범 열기"><span>앨범 ${icon('arrow-right', { size: 14 })}</span></button>`;
    el.style.display = '';
    $$('.thumb', el).forEach(b => b.onclick = () => { fx.blip(); go('album', 'all', b.dataset.id); });
    const more = $('[data-album]', el); if (more) more.onclick = () => { fx.blip(); go('album'); };
  }).catch(() => { $('#thumbs')?.remove(); });
  recallCandidate().then(m => {
    if (!m || !alive) return;
    const src = m.thumb || m.photo; if (!src) return;
    const u = URL.createObjectURL(src), st = STAGES[m.stage || 0] ?? STAGES[0]; urls.push(u);
    const el = $('#recall'); if (!el) return;
    el.innerHTML = `<button class="recall"><img src="${u}" alt=""/><div><small class="mono">${icon('album')} ${daysAgo(m.ts)}의 추억 · ${icon(st.icon)} ${esc(st.name)}</small><b>${momentMark(m, 'sm')} ${esc(momentName(m))}</b><small>회상하면 추억이 자라고 별가루 +10</small></div><span>회상 ${icon('arrow-right')}</span></button>`;
    el.querySelector('.recall').onclick = () => { fx.blip(); go('album', 'all', m.id); };
  }).catch(() => {});
  // 배경 정령 드리프트 — 청록(Verdigris) 위습. 모션 줄이기 시 정지.
  const c = $('.bg-spirits'), x = c.getContext('2d'); let raf = 0;
  const still = state.settings?.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ps = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2.5, s: 0.02 + Math.random() * 0.05, p: Math.random() * 6 }));
  (function loop(t) {
    if (!alive) return;
    const W = c.width = c.clientWidth, H = c.height = c.clientHeight; x.clearRect(0, 0, W, H);
    for (const p of ps) {
      if (!still) { p.y -= p.s / 60; if (p.y < -0.05) p.y = 1.05; }
      const px = (p.x + (still ? 0 : Math.sin(t / 1500 + p.p) * 0.02)) * W, py = p.y * H;
      const g = x.createRadialGradient(px, py, 0, px, py, p.r * 5); g.addColorStop(0, 'rgba(109,181,160,.55)'); g.addColorStop(1, 'rgba(109,181,160,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, p.r * 5, 0, 7); x.fill();
    }
    if (still) return;
    raf = requestAnimationFrame(loop);
  })(0);
  return () => { alive = false; cancelAnimationFrame(raf); for (const u of urls) { try { URL.revokeObjectURL(u); } catch {} } };
});
