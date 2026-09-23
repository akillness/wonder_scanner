import { register, go, app, $, esc, typeInto, lupeHtml, toast, nudgeHtml, icon, rarityHtml, catalogNo, glyph } from '../shell.js';
import { RARITY } from '../../data/wonders.js';
import { CHAPTERS } from '../../data/chapters.js';
import { BALANCE, streakMultiplier } from '../../game/balance.js';
import { state, rank } from '../../game/state.js';
import { LUPE, say } from '../../game/narrative.js';
import { notesFor } from '../../game/notes.js';
import { renderCard, shareCard, shareBlob, coverBox } from '../card.js';
import { gradeInk } from '../../ar/overlay.js';
import { etchSvg, STAGING } from '../staging.js';
import * as fx from '../fx.js';
import { mountScratch } from '../scratch.js';
import { markShared } from '../../game/memories.js';
import { getMoment, swapAlt, updateMoment } from '../../game/media.js';
import { cloud, cloudEnabled } from '../../cloud/provider.js';

// 변이체(프리즘) 잉크 — DESIGN.md §2.4 Prism Rose
const VARIANT_INK = '#E39BC0', VARIANT_GLOW = 'rgba(227,155,192,.35)';

// ── GAMEPLAY_V7 §1.3 / §2 / §6.7 헬퍼 (표현층만 — res.box / res.alts 가 없으면 옛 동작 그대로)
const validBox = (b) => Array.isArray(b) && b.length === 4 && b.every(Number.isFinite) && b[2] > 0 && b[3] > 0;
/**
 * 카드 사진 위 각인 윤곽을 실제 표시 크롭에 맞춘다: 사진이 정사각(스냅샷)이면 box 그대로, 아니면 object-fit: cover 로 잘린 영역 기준으로 재계산 (card.js coverBox 와 동일 규칙).
 * 이미지 로드 후 비동기로 교체 — 첫 렌더는 etchSvg(box) 로 즉시 그린다.
 */
function fitEtch(wrap, box, src) {
  if (!wrap || !box || typeof src !== 'string') return;
  const i = new Image();
  i.onload = () => {
    const iw = i.naturalWidth, ih = i.naturalHeight;
    if (!iw || !ih || !wrap.isConnected) return;
    const cur = wrap.querySelector('.etch');
    if (iw === ih && cur) return;                              // 정사각 스냅샷: 이미 정확
    const nb = iw === ih ? box : coverBox(box, iw, ih, 1, 1);
    cur?.remove();
    if (nb) wrap.insertAdjacentHTML('beforeend', etchSvg(nb));
  };
  i.src = src;
}

register('reveal', (res) => {
  const { wonder, label, isNew, isVariant, reward, rankUp, chapterCompleted, allComplete, photo, grade, entry, depthUnlocked, questsDone = [], achs = [], usedToken, combo = 0, milestones = [], clip = null } = res;
  const rm = state.settings.reduceMotion;
  const prm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const suspense = !rm && (wonder.rarity >= 3 || isVariant);
  const clipUrl = clip ? URL.createObjectURL(clip) : null;
  const R = RARITY[wonder.rarity], G = BALANCE.capture.grades[grade] ?? BALANCE.capture.grades.GOOD, ch = CHAPTERS.find(c => c.id === wonder.chapter);
  document.documentElement.style.setProperty('--r-color', isVariant ? VARIANT_INK : R.color);
  document.documentElement.style.setProperty('--r-glow', isVariant ? VARIANT_GLOW : R.glow);
  const date = new Date().toLocaleDateString('ko-KR'), sm = streakMultiplier(state.streak.days);
  const notes = notesFor(label, wonder, entry.count);
  // ── v7 추가 필드 (옵션): box = 포획 bbox(사진 좌표 0..1), alts = 대안 컷 ≤3 (dataURL · Blob · canvas · frame 모두 허용)
  const urls = [];                                                              // 이 화면이 만든 object URL (cleanup 에서 해제)
  const srcOf = (a) => {
    try {
      if (!a) return null;
      if (typeof a === 'string') return a;
      if (typeof Blob !== 'undefined' && a instanceof Blob) { const u = URL.createObjectURL(a); urls.push(u); return u; }
      if (typeof HTMLCanvasElement !== 'undefined' && a instanceof HTMLCanvasElement) return a.toDataURL('image/jpeg', 0.86);
      if (typeof HTMLCanvasElement !== 'undefined' && a.canvas instanceof HTMLCanvasElement) return a.canvas.toDataURL('image/jpeg', 0.86); // frames.js frame
      for (const k of ['src', 'url', 'dataUrl']) if (typeof a[k] === 'string') return a[k];
    } catch {}
    return null;
  };
  const box = validBox(res.box) ? res.box.slice(0, 4) : null;
  const photoSrc = srcOf(photo) ?? photo;
  let curPhoto = photoSrc;                                                      // 컷 교체 후 카드 저장에 쓰는 현재 사진
  const altSrcs = (Array.isArray(res.alts) ? res.alts : []).filter(Boolean).slice(0, 3).map(srcOf).filter(Boolean);
  // 슬롯: 썸네일은 자리를 지키고, 각 이미지가 지금 "카드 사진"인지 "alts[i]"인지만 추적한다 (media.swapAlt 와 1:1)
  const slots = [{ src: photoSrc, loc: 'photo' }, ...altSrcs.map((src, i) => ({ src, loc: i }))];
  const hasStrip = altSrcs.length > 0;
  // §2 발견: 희귀 3성↑/변이체는 서스펜스 오브 앞에 포획 실루엣(황동 윤곽)을 먼저 띄운다 (+revealSilhouetteMs). 모션 줄이기면 생략
  const heroMs = suspense && box && !prm ? (STAGING?.revealSilhouetteMs ?? 400) : 0;
  const etch = box ? etchSvg(box) : '';                                        // 히어로는 정지 사진 기준이라 그대로 쓴다
  // 카드 위 윤곽은 정지 사진에만: 클립이 있으면 <video> 의 프레임(오버레이 합성 390×~700 / 원본 1280×720, cover)이 스냅샷 크롭 좌표계(§1.3 box)와 달라 윤곽이 어긋난다
  const etchOnCard = !!etch && !clipUrl;
  const wrapOpen = etchOnCard ? '<div class="photo-wrap" style="border-radius:var(--rad-sm)">' : '', wrapClose = etchOnCard ? `${etch}</div>` : '';
  const photoStyle = etchOnCard ? ' style="display:block"' : '';
  const timers = []; const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  app.innerHTML = `
  <section class="screen reveal ${!rm && (wonder.rarity >= 3 || isVariant) ? 'slowmo' : ''}">
    ${!rm && (wonder.rarity === 4 || isVariant) ? '<div class="rays"></div>' : ''}
    ${heroMs ? `<div class="etch-hero" id="hero" aria-hidden="true">${etch}</div>` : ''}
    ${suspense ? `<div class="suspense ${heroMs ? 'hidden' : ''}" id="sus"><div class="orb" style="--c:${isVariant ? VARIANT_INK : R.color}"></div><div class="q">?</div><small>${isVariant ? '색이… 다르다?' : '강한 공명이 느껴진다…'}</small></div>` : ''}
    ${combo >= 2 ? `<div class="combo">${icon('flame')} ${combo} COMBO</div>` : ''}
    <div class="card plate frame-${state.activeFrame} ${isVariant ? 'variant' : ''} ${entry.count >= BALANCE.depth.note2 ? 'master' : ''} ${suspense ? 'hidden' : ''}">
      <span class="stamp ${isVariant ? 'var' : isNew ? 'new' : 'dup'}">${isVariant ? '변이체' : isNew ? 'NEW' : `×${entry.count}`}</span>
      ${wrapOpen}${clipUrl ? `<video class="photo"${photoStyle} src="${clipUrl}" playsinline loop muted autoplay poster="${photoSrc}"></video>` : `<img class="photo"${photoStyle} src="${photoSrc}" alt="" />`}${wrapClose}
      <div class="rar"><span>${rarityHtml(wonder.rarity)}${isVariant ? ' · 프리즘' : ''}</span><span><img src="/img/ch/${ch.id}.svg" alt="" style="width:14px;height:14px;vertical-align:-2px"/> ${esc(ch.title)}</span></div>
      <div class="scratch-zone" id="sz"><div class="name">${glyph(wonder.emoji)} ${esc(wonder.name)}</div>
      <div class="orig mono">${catalogNo(label)} · ${esc(label)}</div></div>
      <div class="lore">${esc(wonder.lore)}</div>
      ${depthUnlocked ? `<div class="note">${icon('quill')} 관찰 노트 해금: ${esc(notes[notes.length - 1])}</div>` : ''}
      <div class="foot mono"><span>신뢰도 ${Math.round(res.confidence * 100)}%</span><span>${date}</span></div>
    </div>
    ${hasStrip ? `<div class="burst-strip ${suspense ? 'hidden' : ''}" id="burst" style="max-width:min(320px,86vw)" role="group" aria-label="다른 컷 고르기"><small>다른 컷</small>${slots.map((s, k) => `<button type="button" data-k="${k}" aria-label="컷 ${k + 1}"><img src="${esc(s.src)}" class="${k === 0 ? 'on' : ''}" alt="" /></button>`).join('')}</div>` : ''}
    <div class="rewards">
      <span>${grade !== 'AUTO' ? `<b style="color:${gradeInk(grade, G.color)}">${G.label}</b>` : '포획'}</span>
      <span>XP <b>+${reward.xp}</b></span><span>별가루 <b>+${reward.dust}</b></span>
    </div>
    <div class="multi">${[grade === 'PERFECT' ? '퍼펙트 ×1.5 XP · ×2 별가루' : grade === 'GREAT' ? '그레이트 ×1.2 XP · ×1.5 별가루' : '', sm > 1 ? `${icon('flame')} 연속 출석 ×${sm.toFixed(1)} XP` : '', usedToken ? `${icon('prism')} 프리즘 토큰 사용` : ''].filter(Boolean).join(' · ')}</div>
    ${lupeHtml('', 'lupe', 'wide')}
    <div id="toasts" style="width:min(340px,100%)"></div>
    ${!allComplete ? nudgeHtml() : ''}
    <div class="actions">
      <button class="btn primary" id="again">${icon('camera')} 계속 스캔</button>
      <button class="btn ghost" id="share">${icon('card')} 카드 저장</button>${clipUrl ? `<button class="btn ghost" id="clip">${icon('film')} 클립 공유</button>` : ''}
      <button class="btn ghost" id="codex">${icon('codex')} 도감</button>
    </div>
  </section>`;
  // 각인 윤곽을 실제 사진 크롭에 맞춘다 (정사각 스냅샷이면 그대로)
  if (box) { if (etchOnCard) fitEtch($('.card .photo-wrap'), box, photoSrc); if (heroMs) fitEtch($('#hero'), box, photoSrc); }
  const revealFx = () => { fx.flash(); fx.vibrate(isVariant || wonder.rarity === 4 ? [40, 60, 40, 60, 120] : [30, 40, 30]);
    if (isNew || isVariant) { fx.chime(wonder.rarity, isVariant); setTimeout(() => fx.burst(wonder.rarity, isVariant), 350); } else fx.thud();
    if (wonder.rarity >= 3 || isVariant) { setTimeout(() => fx.glitch(), 80); setTimeout(() => fx.shake(), 300); } else if (isNew) setTimeout(() => fx.shake(), 300);
    if (combo >= 2) fx.comboTone(combo); };
  // 스크래치: 세계관 이름 + 실제 인식 라벨을 긁어서 확인 (첫 발견만; 재발견은 바로 공개)
  const scratchable = isNew && !state.settings.autoCapture;
  const mount = () => { if (!scratchable) return; const z = $('#sz'); if (!z) return; mountScratch(z, { label: '긁어서 정체 확인', tapOnly: state.settings.reduceMotion, onReveal: () => { fx.chime(1, false); fx.vibrate([20, 30, 20]); const el = $('#lupe'); if (el && !el.textContent) typeInto(el, say.discover(res)); } }); };
  // 실루엣 히어로(+400ms) → 서스펜스 오브 + 드럼롤(1.4s) → 카드가 그 자리에서 뒤집혀 나온다
  const showCard = () => { $('#sus')?.remove(); $('.card')?.classList.remove('hidden'); $('#burst')?.classList.remove('hidden'); revealFx(); requestAnimationFrame(mount); };
  const startSuspense = () => { fx.drumroll(1300); fx.vibrate([20, 80, 20, 80, 20]); later(showCard, 1400); };
  if (suspense) {
    if (heroMs) later(() => { const h = $('#hero'); if (h) { h.classList.add('out'); later(() => h.remove(), 320); } $('#sus')?.classList.remove('hidden'); startSuspense(); }, heroMs);
    else startSuspense();
  } else { revealFx(); requestAnimationFrame(mount); }
  // 같은 추억 레코드를 고치는 작업(클라우드 동기화 · 컷 교체)은 직렬화한다 — 늦게 끝난 쪽이 앞의 변경을 덮어쓰지 않도록
  let mq = Promise.resolve(); const withMoment = (fn) => { const p = mq.then(fn); mq = p.catch(() => {}); return p; };
  if (cloudEnabled && res.momentId) withMoment(async () => { try { if (await cloud.user()) { const m = await getMoment(res.momentId); const r = await cloud.syncMoment(m); if (r) { m.cloud = r; await updateMoment(m); } } } catch {} });
  if (milestones.length) later(() => chest(milestones[0]), suspense ? 3200 + heroMs : 1800);
  function chest(m) { const el = document.createElement('div'); el.className = 'modal chest-modal'; el.innerHTML = `<div class="chest"><div class="box">${icon('chest', { size: 64 })}</div><h3>보물상자 「${esc(m.title)}」</h3><small>${m.at}종 수집 달성</small><div class="loot"><span>${icon('dust')} ${m.reward.dust}</span>${m.reward.prism ? `<span>${icon('prism')} 프리즘 ×${m.reward.prism}</span>` : ''}<span>+${m.reward.xp} XP</span></div><button class="btn primary" id="chestOk">받기!</button></div>`; app.appendChild(el); fx.chest(); setTimeout(() => { el.querySelector('.box')?.classList.add('open'); fx.burst(4, false); }, 500); $('#chestOk', el).onclick = () => { el.remove(); fx.blip(); }; }
  (async () => {
    const el = $('#lupe'); await typeInto(el, grade === 'PERFECT' ? `완벽한 타이밍이었어! ${say.discover(res)}` : say.discover(res));
    const toasts = $('#toasts'); if (!toasts) return;
    if (rankUp) { toasts.insertAdjacentHTML('beforeend', `<div class="toast">${icon('medal')} ${esc(LUPE.rankUp(rankUp.title))}</div>`); fx.chime(3, false); }
    if (chapterCompleted) { toasts.insertAdjacentHTML('beforeend', `<div class="toast">${icon(chapterCompleted.icon)} 챕터 완성: ${esc(chapterCompleted.title)} (+${BALANCE.reward.chapterBonusXp} XP)</div><div class="story">${esc(chapterCompleted.story)}</div>`); setTimeout(() => fx.burst(4, false), 300); }
    if (allComplete) toasts.insertAdjacentHTML('beforeend', `<div class="story">${esc(LUPE.allComplete)}</div>`);
    if (res.errand) toast(`${icon('event')} ${esc(res.errand.title)} — ${esc(res.errand.text)}`, 4000, 'ach');
    questsDone.forEach((q, i) => setTimeout(() => toast(`${icon('quest')} 의뢰 완료! +${q.reward.xp} XP · 별가루 +${q.reward.dust}${q.reward.prism ? ` · ${icon('prism')} 프리즘 토큰` : ''}`, 3500, 'quest'), 300 * i));
    achs.forEach((a, i) => setTimeout(() => toast(`${icon('medal')} 업적 「${esc(a.title)}」 ${icon(a.icon)} ${esc(a.desc)}`, 3500, 'ach'), 600 + 300 * i));
  })();
  // §6.7 다른 컷 고르기: 탭 → 카드 사진 교체(낙관적) + media.swapAlt(추억의 사진·썸네일 교체, alts 재배열). 각인 윤곽은 같은 box 로 유지
  const burst = $('#burst');
  if (burst) {
    let busy = false;
    const setPhoto = (src) => { const ph = $('.card .photo'); if (!ph) return; if (ph.tagName === 'VIDEO') ph.poster = src; else ph.src = src; curPhoto = src; if (etchOnCard) fitEtch($('.card .photo-wrap'), box, src); };
    burst.onclick = async (e) => {
      const b = e.target.closest('button[data-k]'); if (!b || busy) return;
      const k = Number(b.dataset.k), cur = slots.findIndex(s => s.loc === 'photo');
      if (!Number.isInteger(k) || !slots[k] || cur < 0) return;
      if (k === cur) { fx.blip(); return; }
      busy = true; fx.blip(); fx.vibrate([12]);
      const from = slots[cur], to = slots[k], i = to.loc;                       // i = 이 컷이 있던 moment.alts 인덱스
      setPhoto(to.src); burst.querySelectorAll('img').forEach((im, j) => im.classList.toggle('on', j === k));
      from.loc = i; to.loc = 'photo';
      toast(`${icon('image')} 컷을 바꿨어요`, 1600);
      if (res.momentId) await withMoment(async () => { try { const m = await getMoment(res.momentId); if (m && (m.alts || [])[i]) await swapAlt(m, i); } catch {} });
      busy = false;
    };
  }
  $('#again').onclick = () => { fx.blip(); go('scan'); };
  // 버튼 안에 인라인 SVG 가 있으므로 e.target 대신 버튼 참조를 쓴다
  if (clipUrl) { const cb = $('#clip'); cb.onclick = async () => { cb.disabled = true; cb.textContent = '…'; const r = await shareBlob(clip, `wonder-clip-${Date.now()}.${clip.type.includes('mp4') ? 'mp4' : 'webm'}`, `${wonder.name} 포획 클립`); cb.innerHTML = r === 'downloaded' ? `${icon('check')} 저장됨` : r === 'shared' ? `${icon('check')} 공유됨` : `${icon('film')} 클립 공유`; cb.disabled = false; }; }
  $('#codex').onclick = () => { fx.blip(); go('codex', wonder.chapter); };
  const cleanup = () => { timers.forEach(clearTimeout); if (clipUrl) URL.revokeObjectURL(clipUrl); urls.forEach(u => { try { URL.revokeObjectURL(u); } catch {} }); };
  const sb = $('#share');
  sb.onclick = async () => {
    sb.disabled = true; sb.textContent = '생성 중…';
    try { const c = await renderCard({ label, wonder, photo: curPhoto, isVariant, rankTitle: rank().title, date, box }); const r = await shareCard(c, wonder.name); sb.innerHTML = r === 'downloaded' ? `${icon('check')} 저장됨` : r === 'shared' ? `${icon('check')} 공유됨` : `${icon('card')} 카드 저장`; if (r !== 'cancel' && res.momentId) markShared(res.momentId); }
    catch { sb.textContent = '실패… 다시'; }
    sb.disabled = false;
  };
  return cleanup;
});
