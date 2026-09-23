// 라우트 'spots' — 주변 촬영지 (GAMEPLAY_V7 §7.2). 위치 버튼(옵트인) → 스켈레톤 → 카드 5장.
// 카드 = 장소명(Gowun Batang) · mono `320m · 북동` · 챕터 엠블럼 · 원더 글리프 3개 · 기믹 배지 · 지도 열기 / 카메라 열기.
// 상태: idle · loading · list · denied · empty. 오류는 인라인, 콘솔 오류 0. 새 CSS 는 src/ui/v7.css (.spot-list .spot-card .gimmick-badge .skeleton-card);
// 그 파일이 아직 없어도 기존 .info-card .ledger-row .pill .skeleton .empty 로 깨지지 않게 이중 클래스를 쓴다.
import { register, go, app, $, $$, esc, tabsHtml, bindTabs, toast, icon, glyph } from '../shell.js';
import { hasIcon } from '../icons.js';
import { state, save } from '../../game/state.js';
import { WONDERS } from '../../data/wonders.js';
import { refreshSpots, cachedGeo, recommend, activeGimmick, startGimmick, gimmickRemainingMs, remainLabel, spotChallenge, geoSummary, challengeProgress } from '../../game/spots.js';
import { providerName, distanceLabel, bearingLabel } from '../../geo/provider.js';
import * as fx from '../fx.js';

const PIN = hasIcon('pin') ? 'pin' : 'globe';
const WALK = hasIcon('walk') ? 'walk' : 'profile';
const ago = (at) => { const m = Math.max(0, Math.round((Date.now() - at) / 60000)); return m < 1 ? '방금' : `${m}분 전`; };
const openMaps = (url) => { try { const w = window.open(url, '_blank', 'noopener,noreferrer'); if (w) w.opener = null; } catch {} };
const wonderChips = (labels) => (labels || []).filter(l => WONDERS[l]).map(l => `<span class="wonder-chip" title="${esc(WONDERS[l].name)}">${glyph(WONDERS[l].emoji, 'sm')} ${esc(l)}</span>`).join('');

/** 활성 기믹 배너 (+ 스팟 도전 진행) */
function gimmickHtml(now = Date.now()) {
  const g = activeGimmick(now); if (!g) return '';
  const c = spotChallenge();
  const done = c ? (c.done || []).length : 0, total = c ? c.labels.length : 0;
  return `<div class="info-card gimmick-live"><b>${icon('event')} 기믹 「${esc(g.title)}」 <span class="mono" data-gim-left>${remainLabel(gimmickRemainingMs(now))} 남음</span></b>
    <small>${esc(g.desc)}${g.spotName ? ` · ${esc(g.spotName)}` : ''}</small>
    ${c ? `<div class="progress sm" style="width:100%"><i style="width:${total ? Math.round(done / total * 100) : 0}%"></i></div><small class="mono">스팟 도전 ${done}/${total} · 150m 안에서 포획</small><div class="chips left">${wonderChips(c.labels)}</div>` : ''}
    <button class="btn ghost sm" data-gim-cam>${icon('camera')} 카메라 열기</button></div>`;
}

function cardHtml(s, i, now = Date.now()) {
  const act = activeGimmick(now), live = !!(s.gimmick && act && act.id === s.gimmick.id && act.spotId === s.id);
  const badge = s.gimmick ? `<span class="gimmick-badge ${live ? 'on' : ''}">${icon('event', { size: 12 })} <b>${esc(s.gimmick.title)}</b> · ${esc(s.gimmick.desc)}${live ? `<span class="left">· ${remainLabel(gimmickRemainingMs(now))} 남음</span>` : ''}</span>` : '';
  return `<article class="spot-card stagger ${i === 0 ? 'top' : ''}" style="--i:${i}" data-id="${esc(s.id)}">
    <div class="sp-head"><span class="sp-emblem"><img src="/img/ch/${esc(s.chapter)}.svg" alt="${esc(s.chapterTitle)}" width="24" height="24"/></span>
      <div class="sp-title"><h3 class="sp-name">${esc(s.name)}</h3><div class="sp-meta">${icon(WALK, { size: 12 })} <span>${distanceLabel(s.dist_m)}</span> · <span>${bearingLabel(s.bearing_deg)}</span> · <span>${esc(s.chapterTitle)}</span></div></div></div>
    <div class="sp-wonders"><small>여기서</small>${wonderChips(s.labels)}</div>
    ${badge}
    <div class="sp-actions"><button class="btn ghost" data-map="${esc(s.mapsUrl)}">${icon('globe')} 지도 열기</button><button class="btn primary" data-cam="${esc(s.id)}">${icon('camera')} 카메라 열기</button></div>
  </article>`;
}

const skeletonHtml = () => `<div class="spot-list" aria-busy="true">${[0, 1, 2].map(i => `<div class="skeleton-card stagger" style="--i:${i}" aria-hidden="true"></div>`).join('')}</div>`;
const idleHtml = () => `<div class="empty spot-idle">${icon(PIN, { size: 48 })}<div>근처 카페·공원·역에서 찍을 수 있는 원더를 찾아 줄게</div><button class="btn primary big" data-find>${icon(PIN)} 주변 촬영지 찾기</button><small style="display:block;margin-top:10px" class="mono">위치는 탭할 때만 · 기기 밖으로 나가는 건 좌표뿐</small></div>`;
const deniedHtml = () => `<div class="info-card warn spot-fallback"><b>${icon('warn')} 위치 없이도 게임은 그대로</b><small>위치 권한이 꺼져 있어. 주소창의 사이트 설정(자물쇠) → 위치 → 허용으로 바꾼 뒤 다시 시도해 줘. 원더는 어디에나 있으니 카메라는 지금도 열려.</small><div class="row" style="width:100%"><button class="btn ghost sm grow" data-find>${icon('repeat')} 다시 시도</button><button class="btn primary sm grow" data-go="scan">${icon('camera')} 카메라 열기</button></div></div>`;
const emptyHtml = (r) => `<div class="info-card spot-fallback"><b>${icon('info')} 위치 없이도 게임은 그대로</b><small>${r?.status === 'empty' ? '반경 800m 안에서 아는 장소를 못 찾았거나, 지도 서버가 잠시 응답하지 않아.' : '지금은 위치를 잡지 못했어 (실내거나 GPS 가 꺼져 있을 수 있어).'} 원더는 어디에나 있으니 카메라를 열어 봐.</small><div class="row" style="width:100%"><button class="btn ghost sm grow" data-find>${icon('repeat')} 다시 시도</button><button class="btn primary sm grow" data-go="scan">${icon('camera')} 카메라 열기</button></div></div>`;

register('spots', () => {
  let alive = true, busy = false, last = null, timer = 0;
  const now = () => Date.now();

  const shell = () => {
    app.innerHTML = `
    <section class="screen meta spots">
      <header><button class="btn icon ghost" id="back" title="뒤로" aria-label="뒤로">${icon('back')}</button><h2>주변 촬영지</h2><span class="pill mono" id="src">${icon(PIN)} ${esc(providerName())}</span><button class="btn icon ghost" id="refresh" title="다시 찾기" aria-label="다시 찾기">${icon('repeat')}</button></header>
      <div id="gim">${gimmickHtml()}</div>
      <div id="body"></div>
      <small class="mono spot-privacy" style="display:block;color:var(--mute);font-size:11px;margin:10px 0 4px">${icon('lock', { size: 12 })} 좌표(100m 단위)만 지도에 보내고, 카메라 프레임은 기기 밖으로 나가지 않아요</small>
      ${tabsHtml('quests')}
    </section>`;
    $('#back').onclick = () => { fx.blip(); go('title'); }; bindTabs();
    $('#refresh').onclick = () => { if (!busy) { fx.blip(); run(true); } };
    bindGim();
  };

  const bindGim = () => { const b = $('[data-gim-cam]'); if (b) b.onclick = () => { fx.blip(); go('scan'); }; };
  const bindBody = () => {
    $$('[data-find]').forEach(b => b.onclick = () => { if (!busy) { fx.blip(); run(true); } });
    $$('[data-go]', $('#body') || app).forEach(b => b.onclick = () => { fx.blip(); go(b.dataset.go); });
    $$('[data-map]').forEach(b => b.onclick = () => { fx.blip(); openMaps(b.dataset.map); });
    $$('[data-cam]').forEach(b => b.onclick = () => {
      const s = last?.spots?.find(x => x.id === b.dataset.cam);
      fx.blip();
      if (s?.gimmick) { const g = startGimmick(s.gimmick, { spot: s }); if (g) toast(`${icon('event')} 기믹 「${esc(g.title)}」 시작 · ${remainLabel(gimmickRemainingMs())}`, 2400); }
      go('scan');
    });
  };

  const view = (html) => { const b = $('#body'); if (b) { b.innerHTML = html; bindBody(); } };
  const listHtml = (r) => {
    const src = r.source === 'google' ? 'Google' : r.source === 'osm' ? 'OSM' : providerName();
    const s = $('#src'); if (s) s.innerHTML = `${icon(PIN)} ${esc(src)}${r.at ? ` · ${ago(r.at)}` : ''}`;
    return `<div class="spot-list">${r.spots.map((sp, i) => cardHtml(sp, i)).join('')}</div>`;
  };
  const show = (r) => {
    last = r;
    if (!alive) return;
    if (r.status === 'denied') view(deniedHtml());
    else if (r.status === 'ok' && r.spots?.length) view(listHtml(r));
    else view(emptyHtml(r));
    const g = $('#gim'); if (g) { g.innerHTML = gimmickHtml(); bindGim(); }
  };
  const run = async (force = false) => {
    if (busy) return; busy = true;
    if (force) { view(skeletonHtml()); const b = $('#refresh'); if (b) b.disabled = true; }
    const r = await refreshSpots({ force });
    busy = false; const b = $('#refresh'); if (b) b.disabled = false;
    if (r.status === 'denied') fx.denied();
    show(r);
  };

  shell();
  const c = cachedGeo(now());
  if (c && c.spots.length) show({ status: 'ok', cached: true, source: c.spots[0]?.source, at: c.at, ...recommend(c.spots, c) });
  else view(idleHtml());
  // 기믹 남은 시간 갱신 (15초) — 만료되면 배너 제거
  timer = setInterval(() => { if (!alive) return; const el = $('[data-gim-left]'); if (!el) return; if (!activeGimmick()) { const g = $('#gim'); if (g) g.innerHTML = ''; return; } el.textContent = `${remainLabel(gimmickRemainingMs())} 남음`; }, 15000);
  if (location.search.includes('debug')) window.__spots = { run, show, recommend, refreshSpots, startGimmick, activeGimmick, challengeProgress, last: () => last };
  return () => { alive = false; clearInterval(timer); };
});

// ── 스팟 도전 진행 토스트 (spots.challengeProgress 가 dispatch — peer 의 finish() 가 호출만 하면 표시된다)
window.addEventListener('ws:spot-challenge', (e) => {
  const d = e.detail; if (!d) return;
  if (d.completed) { fx.chest(); toast(`${icon('gift')} ${esc(d.msg)}`, 3200); }
  else if (!d.already && !d.far) { fx.blip(); toast(`${icon(PIN)} ${esc(d.msg)}`, 2400); }
});

// ── 진입점 (title 카드 · 의뢰 상단 섹션 · 프로필 location 토글) — title.js/meta.js 는 다른 세션 소유라 DOM 에 덧붙인다.
// 각 화면에 [data-go="spots"] / input[data-k="location"] 이 이미 있으면(peer 가 직접 넣은 경우) 아무것도 하지 않는다.
export function spotsEntryHtml() {
  const s = geoSummary();
  const g = s.active, top = s.top;
  const name = g ? `기믹 「${esc(g.title)}」 진행 중` : top ? esc(top.name) : '근처 촬영지';
  const meta = g ? `${remainLabel(gimmickRemainingMs())} 남음 · ${esc(g.desc)}`
    : top ? `${distanceLabel(top.dist_m)} · ${bearingLabel(top.bearing_deg)} · ${esc(top.chapterTitle)}${s.suggested ? ` · 기믹 「${esc(s.suggested.title)}」` : ''}`
    : '주변 카페·공원·역에서 찍을 원더 찾기';
  const emblem = top && !g ? `<img src="/img/ch/${esc(top.chapter)}.svg" alt="" width="24" height="24"/>` : icon(g ? 'event' : PIN, { size: 24 });
  return `<button class="spot-card compact spot-entry" data-go="spots" aria-label="근처 촬영지 열기"><div class="sp-head"><span class="sp-emblem">${emblem}</span><div class="sp-title"><h3 class="sp-name">${name}</h3><div class="sp-meta">${icon(WALK, { size: 12 })} <span>${meta}</span></div></div></div><div class="sp-actions"><span class="btn ghost" aria-hidden="true">${icon('arrow-right')}</span></div></button>`;
}
export function locationSettingHtml() {
  return `<label class="setting ledger-row spot-setting"><div><b>${icon(PIN)} 위치 기반 추천</b><small>타이틀 진입 시 주변 촬영지를 1시간 캐시로 자동 새로고침. 끄면 "찾기"를 탭할 때만 위치를 써요</small></div><input type="checkbox" data-k="location" ${state.settings?.location ? 'checked' : ''}><i class="sw"></i></label>`;
}
export function mountSpotsEntries(root = app) {
  try {
    if (!root) return;
    const hasEntry = () => root.querySelector('[data-go="spots"], .spot-entry');
    // 타이틀: 행동 영역 바로 위
    const title = root.querySelector('.screen.title');
    if (title && !hasEntry()) {
      const anchor = title.querySelector('.actions') || title.querySelector('.stat-strip');
      if (anchor) anchor.insertAdjacentHTML('beforebegin', spotsEntryHtml());
    }
    // 의뢰: 출석 카드 아래 (.streak-card 는 의뢰 화면에만 있다 — 스팟 화면 자신은 제외)
    const quests = root.querySelector('.screen.meta:not(.spots)');
    const streak = quests?.querySelector('.streak-card');
    if (streak && !hasEntry()) streak.insertAdjacentHTML('afterend', spotsEntryHtml());
    root.querySelectorAll('.spot-entry[data-go="spots"], .spot-entry [data-go="spots"]').forEach(b => { if (!b.dataset.bound) { b.dataset.bound = '1'; b.onclick = () => { fx.blip(); go('spots'); }; } });
    // 프로필: 설정 장부에 location 토글
    const settings = root.querySelector('.settings.ledger');
    if (settings && !settings.querySelector('input[data-k="location"]')) {
      const nameRow = settings.querySelector('#name')?.closest('label');
      if (nameRow) nameRow.insertAdjacentHTML('beforebegin', locationSettingHtml()); else settings.insertAdjacentHTML('afterbegin', locationSettingHtml());
      const inp = settings.querySelector('.spot-setting input[data-k="location"]');
      if (inp) inp.onchange = () => { state.settings.location = inp.checked; save(); fx.blip(); if (inp.checked) refreshSpots().catch(() => {}); };
    }
  } catch {}
}
let mo = null;
export function watchSpotsEntries() {
  if (mo || !app || typeof MutationObserver !== 'function') return;
  let queued = false;
  mo = new MutationObserver(() => { if (queued) return; queued = true; queueMicrotask(() => { queued = false; mountSpotsEntries(app); }); });
  mo.observe(app, { childList: true });
  mountSpotsEntries(app);
}
watchSpotsEntries();
