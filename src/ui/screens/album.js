import { register, go, app, $, $$, esc, tabsHtml, bindTabs, toast, grade as GI, icon, rarityHtml, catalogNo, glyph } from '../shell.js';
import { hasIcon } from '../icons.js';
import { WONDERS, RARITY } from '../../data/wonders.js';
import { state, save } from '../../game/state.js';
import { listMoments, getMoment, deleteMoment, undeleteMoment, toggleFav, updateMoment, stats, fmtBytes, fmtDuration, momentKind, exportMoment, swapAlt, renderCollage, addMoment } from '../../game/media.js';
import { makeGift, redeemGift, FRAMES } from '../../game/economy.js';
import { renderCard, shareCard, shareBlob, coverBox } from '../card.js';
import * as fx from '../fx.js';
import { STAGES, FILTERS, filterCss, touchMoment, recall, markShared, daysAgo } from '../../game/memories.js';
import { cloudEnabled } from '../../cloud/provider.js';
import { openEditor } from '../editor.js';
import { mountScratch } from '../scratch.js';
import { etchSvg } from '../staging.js';

// ── 앨범 (GAMEPLAY_V7 §6.6 · §1.3): 갤러리 앱 — 꺼내기 · 수정 · 공유. label 은 null 일 수 있다(스냅·영상) — WONDERS 를 null 로 인덱싱하지 않는다.
// 필터 칩: key · 아이콘 · 라벨 → listMoments 필터 인자
const FILTER_CHIPS = [['all', null, '전체'], ['photo', 'camera', '사진'], ['video', 'video', '영상'], ['wonder', 'codex', '원더'], ['perfect', 'target', '퍼펙트'], ['fav', 'heart', '즐겨찾기'], ['friend', 'gift', '친구']];
const FILTER_ARGS = { all: {}, photo: { kind: 'photo' }, video: { kind: 'video' }, wonder: { kind: 'wonder' }, perfect: { perfect: true }, fav: { fav: true }, friend: { friend: true } };
// 아직 없을 수 있는 아이콘 이름은 폴백으로 (DESIGN 9.2)
const ic = (name, fb, o) => icon(hasIcon(name) ? name : fb, o);
const stageIcon = (m) => icon(STAGES[m.stage || 0]?.icon ?? 'seed');
const dustHtml = (n) => `${icon('dust')}+${n}`;
const wonderOf = (m) => (m?.label && WONDERS[m.label]) ? WONDERS[m.label] : null;
const RM_MQ = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const reduced = () => !!state.settings?.reduceMotion || !!RM_MQ?.matches;
const touch = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const TOAST_MS = 1600, UNDO_MS = 5000, LONG_PRESS_MS = 450, SWIPE_PX = 40;

/** 파일 다운로드 폴백 (a[download]) */
function download(blob, filename) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
/** 꺼내기: Web Share(files, 터치 기기) → 다운로드 폴백. 여러 장이면 한 번에 공유하거나 순차 다운로드. → 'shared' | 'downloaded' | 'cancel' | 'none' */
async function exportMany(moments) {
  const exs = []; for (const m of moments) { try { const e = await exportMoment(m); if (e?.blob) exs.push(e); } catch {} }
  if (!exs.length) return 'none';
  if (touch() && typeof File !== 'undefined' && navigator.canShare) {
    const files = exs.map(e => new File([e.blob], e.filename, { type: e.type || e.blob.type || 'application/octet-stream' }));
    if (navigator.canShare({ files })) { try { await navigator.share({ files, title: 'Wonder Scanner' }); return 'shared'; } catch (e) { if (e?.name === 'AbortError') return 'cancel'; } }
  }
  for (let i = 0; i < exs.length; i++) { download(exs[i].blob, exs[i].filename); if (i < exs.length - 1) await wait(350); }
  return 'downloaded';
}
/** 실행 취소 토스트 (.toast.undo, 5초 카운트다운 바) — 버튼을 누르면 onUndo, 시간이 지나면 onExpire */
function undoToast(html, onUndo, { ms = UNDO_MS, onExpire = null } = {}) {
  let root = document.querySelector('.toast-stack');
  if (!root) { root = document.createElement('div'); root.className = 'toast-stack'; document.body.appendChild(root); }
  const el = document.createElement('div'); el.className = 'toast undo'; el.style.setProperty('--undo-ms', `${ms}ms`);
  el.innerHTML = `<span class="msg">${html}</span><button type="button">${icon('repeat')} 실행 취소</button>`;
  let done = false; const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 400); };
  const t = setTimeout(() => { if (done) return; done = true; kill(); onExpire?.(); }, ms);
  el.querySelector('button').onclick = async () => { if (done) return; done = true; clearTimeout(t); kill(); fx.blip(); await onUndo(); };
  root.appendChild(el); return el;
}

register('album', async (filter = 'all', openId = null, opts = {}) => {
  if (!FILTER_ARGS[filter]) filter = 'all';
  const [shown, st] = await Promise.all([listMoments(FILTER_ARGS[filter]), stats()]);
  let count = st.count;
  const urls = [];
  const byId = (id) => shown.find(m => m.id === id);

  // ── 격자 타일: 영상 = film 배지 + mono 길이, 사진(원더 없음) = camera, 원더 = 글리프
  const tileHtml = (m, i) => {
    const w = wonderOf(m), k = momentKind(m), u = URL.createObjectURL(m.thumb || m.photo); urls.push(u);
    const sc = w ? (RARITY[w.rarity]?.color ?? 'var(--line-2)') : 'var(--line-2)';
    const badge = k === 'video' ? `<span class="film-badge">${icon('film')}${fmtDuration(m.duration)}</span>` : k === 'photo' ? `<span class="kind" title="스냅">${icon('camera')}</span>` : '';
    return `<button class="mom stagger ${m.variant ? 'variant' : ''}" data-id="${m.id}" style="--sc:${sc};--i:${Math.min(i, 24)}" title="${w ? esc(w.name) : k === 'video' ? '영상' : '스냅'}"><img src="${u}" alt="" loading="lazy" style="filter:${filterCss(m.filter)}${m.cover ? ' blur(8px)' : ''}"/>${badge}<span class="tag">${m.cover ? icon('lock') : ''}${m.skills?.length ? icon('lens') : ''}${stageIcon(m)}${w ? ` ${glyph(w.emoji)}` : ''}${m.clip && k !== 'video' ? icon('film') : ''}${m.fav ? icon('heart') : ''}${m.friend ? icon('gift') : ''}${m.cloud ? icon('cloud') : ''}</span></button>`;
  };
  app.innerHTML = `
  <section class="screen meta album">
    <header><button class="btn icon ghost" id="back" title="뒤로">${icon('back')}</button><h2>추억 앨범</h2><span class="pill mono" id="cnt" title="저장 용량">${count}장 · ${fmtBytes(st.bytes)}</span></header>
    <div class="progress sm" title="앨범 용량 ${st.pct}%"><i style="width:${st.pct}%"></i></div>
    <div class="chips left">${FILTER_CHIPS.map(([k, i, l]) => `<button class="pill ${k === filter ? 'on' : ''}" data-f="${k}">${i ? `${ic(i, 'film')} ` : ''}${l}</button>`).join('')}</div>
    <div class="row" style="margin:8px 0"><button class="btn ghost sm grow" id="collage" ${shown.length ? '' : 'disabled'}>${icon('collage')} 콜라주 공유 (최근 ${Math.min(9, shown.length)}장)</button><button class="btn ghost sm grow" id="gift">${icon('gift')} 선물 코드</button></div>
    ${shown.length ? `<div class="album-grid" id="grid">${shown.map(tileHtml).join('')}</div>`
      : `<div class="empty">${icon('camera', { size: 48 })}<br>${filter === 'all' ? '아직 추억이 없어요.' : '이 필터에 맞는 추억이 없어요.'}<br><small>셔터를 누르면 사진·영상이, 원더를 포획하면 표본이 여기 쌓입니다.</small><br><button class="btn primary sm" data-go="scan" style="margin-top:12px">${icon('camera')} 카메라 열기</button></div>`}
    <div class="info-card"><b>${icon('seed')} 추억은 자랍니다</b><small>${STAGES.map(s => `${icon(s.icon)} ${s.name}`).join(' → ')} · 캡션 쓰기, 필터 고르기, 회상, 공유, 같은 원더 재방문, 7일 숙성이 성장 포인트. 단계가 오르면 별가루·XP 보상.</small></div>
    <div class="info-card"><b>${icon('lock')} 압축 정책</b><small>사진 640px·JPEG 74% (약 50KB) · 클립 540p·24fps·1.1Mbps (5초 ≈ 700KB) · 앨범 상한 ${fmtBytes(st.cap)}, 넘치면 즐겨찾기 아닌 오래된 것부터 정리. 길게 누르면 여러 장을 고를 수 있어요.</small></div>
    ${tabsHtml('album')}
  </section>`;
  const section = $('.screen.album'), grid = $('#grid');
  $('#back').onclick = () => go('title'); bindTabs();
  $$('[data-f]').forEach(b => b.onclick = () => { fx.blip(); go('album', b.dataset.f); });
  const setCount = (n) => { count = Math.max(0, n); const p = $('#cnt'); if (p) p.textContent = `${count}장 · ${fmtBytes(st.bytes)}`; };

  // ── 선택 모드 (길게 누르기 → .select-mode + .select-bar)
  const selected = new Set(); let selecting = false, bar = null, suppressUntil = 0;
  const updateBar = () => { const c = bar?.querySelector('.count'); if (c) c.textContent = `${selected.size}장 선택`; bar?.querySelectorAll('[data-need]').forEach(b => b.disabled = !selected.size); };
  const exitSelect = () => { selecting = false; selected.clear(); section?.classList.remove('select-mode'); $$('.mom.selected').forEach(t => t.classList.remove('selected')); bar?.remove(); bar = null; };
  const toggleSel = (tile) => { const id = tile.dataset.id; if (selected.has(id)) { selected.delete(id); tile.classList.remove('selected'); } else { selected.add(id); tile.classList.add('selected'); } fx.blip(); updateBar(); };
  const enterSelect = () => {
    if (selecting || !section) return; selecting = true; section.classList.add('select-mode'); fx.vibrate([20]);
    bar = document.createElement('div'); bar.className = 'select-bar';
    bar.innerHTML = `<span class="count">0장 선택</span><button class="btn ghost" id="sExport" data-need>${ic('export', 'share')} 꺼내기</button><button class="btn ghost danger" id="sDel" data-need>${icon('trash')} 삭제</button><button class="btn ghost" id="sCancel">${icon('close')} 취소</button>`;
    section.appendChild(bar);
    $('#sCancel', bar).onclick = () => { fx.blip(); exitSelect(); };
    $('#sExport', bar).onclick = async (e) => { const ms = [...selected].map(byId).filter(Boolean); if (!ms.length) return; e.currentTarget.disabled = true; fx.blip(); const r = await exportMany(ms); e.currentTarget.disabled = false; if (r === 'cancel') return; toast(r === 'none' ? `${icon('warn')} 꺼낼 파일이 없어요` : `${ic('export', 'share')} ${ms.length}장 ${r === 'shared' ? '공유했어요' : '저장했어요'}`, TOAST_MS); exitSelect(); };
    $('#sDel', bar).onclick = () => { const ms = [...selected].map(byId).filter(Boolean); if (!ms.length) return; exitSelect(); removeMoments(ms); };
    updateBar();
  };
  // ── 낙관적 삭제 + 5초 실행 취소 (undeleteMoment 로 레코드 원복)
  async function removeMoments(ms) {
    fx.blip();
    for (const m of ms) { $(`.mom[data-id="${m.id}"]`)?.remove(); const i = shown.indexOf(m); if (i >= 0) shown.splice(i, 1); }
    setCount(count - ms.length);
    if (grid && !grid.children.length) grid.innerHTML = `<div class="empty" style="grid-column:1/-1;padding:24px 10px">${icon('trash', { size: 48 })}<br>비어 있어요</div>`;
    const recs = []; for (const m of ms) { try { const r = await deleteMoment(m.id); if (r) recs.push(r); } catch {} }
    undoToast(`${icon('trash')} ${ms.length > 1 ? `${ms.length}장` : '추억'} 삭제됨`, async () => { for (const r of recs) { try { await undeleteMoment(r); } catch {} } toast(`${icon('check')} 되돌렸어요`, TOAST_MS); go('album', filter); });
  }
  const bindTile = (b) => {
    let timer = 0, sx = 0, sy = 0;
    b.onclick = () => { if (Date.now() < suppressUntil) return; const m = byId(b.dataset.id); if (!m) return; if (selecting) { toggleSel(b); return; } detail(m); };
    b.onpointerdown = (e) => { if (e.button !== 0 && e.pointerType === 'mouse') return; sx = e.clientX; sy = e.clientY; clearTimeout(timer); timer = setTimeout(() => { suppressUntil = Date.now() + 700; enterSelect(); if (!selected.has(b.dataset.id)) toggleSel(b); }, LONG_PRESS_MS); };
    b.onpointermove = (e) => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) { clearTimeout(timer); timer = 0; } };
    b.onpointerup = b.onpointercancel = b.onpointerleave = () => { clearTimeout(timer); timer = 0; };
  };
  $$('.mom').forEach(bindTile);
  grid?.addEventListener('contextmenu', (e) => { if (e.target.closest('.mom')) e.preventDefault(); });
  /** 타일 갱신(낙관적) — 즐겨찾기·컷 교체·편집 후 */
  const refreshTile = (m) => { const old = $(`.mom[data-id="${m.id}"]`); if (!old) return; const i = shown.indexOf(m); const tmp = document.createElement('div'); tmp.innerHTML = tileHtml(m, i < 0 ? 0 : i); const nb = tmp.firstElementChild; nb.style.animation = 'none'; if (selected.has(m.id)) nb.classList.add('selected'); old.replaceWith(nb); bindTile(nb); };

  const collageBtn = $('#collage');
  collageBtn.onclick = async () => { collageBtn.disabled = true; collageBtn.textContent = '생성 중…'; try { const r = await shareCollage(shown); collageBtn.innerHTML = r === 'cancel' ? `${icon('collage')} 콜라주 공유` : `${icon('check')} 공유됨`; } catch { collageBtn.textContent = '실패… 다시'; } collageBtn.disabled = false; };
  $('#gift').onclick = () => giftPanel();
  async function shareCollage(ms) {
    const c = await renderCollage(ms.slice(0, 9), { title: 'WONDER ALBUM', sub: `${state.name || '탐험가'} · ${new Date().toLocaleDateString('ko-KR')} · ${Object.keys(state.codex).length}/80 수집` });
    return shareCard(c, '내 원더 앨범');
  }
  if (openId) {
    let m = byId(openId); if (!m) { try { m = await getMoment(openId); } catch { m = null; } }
    if (m) {
      if (opts?.recall === false) detail(m);
      else { const r = await recall(m.id); if (r?.leveled) toast(`${icon('seed')} 추억이 「${icon(r.leveled.icon)} ${r.leveled.name}」로 자랐어요! ${dustHtml(r.leveled.reward.dust)}`, 3200, 'quest'); else toast(`${icon('album')} 회상 완료 · ${icon('dust')} +10`, 2000); if (r?.m) Object.assign(m, r.m); refreshTile(m); detail(m); }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 상세: .detail-swipe (드래그 translateX + 스프링 스냅, 40px 임계, 세로 스크롤 양보) · 더블탭 즐겨찾기 · 4 액션
  // ═══════════════════════════════════════════════════════════════════
  function detail(m0) {
    let list = shown.includes(m0) ? shown : [m0], idx = list.indexOf(m0), m = m0;
    const modal = document.createElement('div'); modal.className = 'modal'; modal.style.padding = '12px 20px 122px';
    const wrap = document.createElement('div'); wrap.className = 'detail-swipe';
    const acts = document.createElement('div'); acts.className = 'detail-actions';
    wrap.onclick = acts.onclick = (e) => e.stopPropagation();
    modal.append(wrap, acts);
    let urls = []; const revoke = () => { urls.forEach(u => URL.revokeObjectURL(u)); urls = []; };
    const close = () => { modal.remove(); revoke(); };
    modal.onclick = close; app.appendChild(modal);
    let finding = false, lastDragEnd = 0, lastTap = 0, tapX = 0, tapY = 0;

    const headHtml = () => { const w = wonderOf(m), k = momentKind(m); return w
      ? `<span>${rarityHtml(w.rarity)}</span><span>${m.fav ? `${icon('heart')} ` : ''}${icon(GI[m.grade] ?? 'circle')} ${esc(m.grade || 'AUTO')}${m.friend ? ` · ${icon('gift')} ${esc(m.friend.name)}` : ''}</span>`
      : `<span>${k === 'video' ? `${ic('video', 'film')} ${fmtDuration(m.duration)}` : `${icon('camera')} 스냅`}${m.label ? ` · ${esc(m.label)}` : ''}</span><span>${m.edited ? `${icon('quill')} 편집됨 ` : ''}${m.fav ? icon('heart') : ''}</span>`; };
    function render(pop = false) {
      revoke();
      const w = wonderOf(m), k = momentKind(m), R = w ? RARITY[w.rarity] : null;
      const u = URL.createObjectURL(m.photo); urls.push(u);
      const cu = m.clip ? URL.createObjectURL(m.clip) : null; if (cu) urls.push(cu);
      let pu = u; if (k === 'video' && m.poster && m.poster !== m.photo) { pu = URL.createObjectURL(m.poster); urls.push(pu); }
      const flt = `style="filter:${filterCss(m.filter)}"`;
      const media = k === 'video' && cu ? `<video class="photo" src="${cu}" poster="${pu}" controls playsinline preload="metadata" ${flt}></video>`
        : cu ? `<video class="photo" src="${cu}" poster="${u}" playsinline loop muted autoplay controls ${flt}></video>`
        : `<img class="photo" src="${u}" alt="" ${flt}/>`;
      const title = w ? `${glyph(w.emoji)} ${esc(w.name)}` : k === 'video' ? `${ic('video', 'film')} 영상` : `${icon('camera')} 스냅`;
      const meta = [w ? `${catalogNo(m.label)} · ${esc(m.label)}` : null, daysAgo(m.ts), new Date(m.ts).toLocaleDateString('ko-KR'), fmtBytes(m.bytes || 0), k === 'video' ? fmtDuration(m.duration) : null].filter(Boolean).join(' · ');
      wrap.innerHTML = `<div class="card plate frame-${m.frame || 'default'} ${m.variant ? 'variant' : ''}" style="--r-color:${R ? R.color : 'var(--mute)'};--r-glow:${R ? R.glow : 'transparent'};animation:${pop && !reduced() ? 'pop .4s both' : 'none'}">
        <div class="scratch-zone photo-zone photo-wrap" id="pz">${media}${m.box ? etchSvg(m.box) : ''}</div>
        <div class="rar">${headHtml()}</div>
        <div class="name">${title}</div><div class="orig mono">${meta}${m.clip && k !== 'video' ? ` · ${icon('film')}` : ''}${m.cloud ? ` · ${icon('cloud')}` : ''}</div>
        <div class="stage-row"><span class="stage-badge">${stageIcon(m)} ${STAGES[m.stage || 0]?.name ?? STAGES[0].name}</span>${STAGES.slice(1).map(s => `<i class="${(m.stage || 0) >= s.id ? 'on' : ''}" title="${s.name}"></i>`).join('')}<small>회상 ${m.recalls || 0} · 공유 ${m.shares || 0}${list.length > 1 ? ` · ${idx + 1}/${list.length}` : ''}</small></div>
        <div class="caption">${m.caption ? `${icon('quill')} ${esc(m.caption)}` : '<span class="mute">캡션을 남기면 추억이 자라요 · 더블탭 즐겨찾기</span>'}</div></div>`;
      acts.innerHTML = `<button class="btn ghost" id="dExport">${ic('export', 'share')}<span>꺼내기</span></button><button class="btn ghost" id="dEdit">${icon('quill')}<span>수정하기</span></button><button class="btn ghost" id="dShare">${icon('share')}<span>공유하기</span></button><button class="btn ghost" id="dMore">${ic('more', 'plus')}<span>더보기</span></button>`;
      // 각인 윤곽: cover 크롭(정사각 표시)에 맞춰 재계산 — 정사각 스냅샷이면 그대로, 풀프레임 사진이면 보정
      const ph = $('.photo', wrap);
      if (m.box && ph) {
        const fit = (iw, ih) => { if (!iw || !ih || Math.abs(iw - ih) < 2) return; const nb = coverBox(m.box, iw, ih, 1, 1); const svg = $('.etch', wrap); if (!svg) return; if (nb) svg.outerHTML = etchSvg(nb); else svg.remove(); };
        if (ph.tagName === 'IMG') { if (ph.complete && ph.naturalWidth) fit(ph.naturalWidth, ph.naturalHeight); else ph.onload = () => fit(ph.naturalWidth, ph.naturalHeight); }
        else ph.onloadedmetadata = () => fit(ph.videoWidth, ph.videoHeight);
      }
      if (m.cover) requestAnimationFrame(() => { const z = $('#pz', wrap); if (z) mountScratch(z, { label: '가려진 추억 — 긁어서 보기', tapOnly: reduced() }); });
      $('#dExport', acts).onclick = async (e) => { const b = e.currentTarget; b.disabled = true; fx.blip(); const r = await exportMany([m]); b.disabled = false; if (r === 'cancel') return; toast(r === 'none' ? `${icon('warn')} 꺼낼 파일이 없어요` : `${ic('export', 'share')} ${r === 'shared' ? '공유했어요' : '기기에 저장했어요'}`, TOAST_MS); };
      $('#dEdit', acts).onclick = () => { fx.blip(); refinePanel(m, sync); };
      $('#dShare', acts).onclick = () => { fx.blip(); shareSheet(m); };
      $('#dMore', acts).onclick = () => { fx.blip(); moreSheet(m); };
    }
    /** DB 결과를 현재 객체에 반영(격자·상세 낙관 갱신) */
    const sync = (m2) => { if (m2 && m2.id === m.id) Object.assign(m, m2); refreshTile(m); if (modal.isConnected) render(false); };
    const patchHead = () => { const h = $('.rar', wrap); if (h) h.innerHTML = headHtml(); refreshTile(m); };
    async function favToggle() {
      m.fav = !m.fav; patchHead(); fx.blip(); fx.vibrate([10]);
      toast(m.fav ? `${icon('heart')} 즐겨찾기` : `${icon('heart-off')} 즐겨찾기 해제`, TOAST_MS);
      try { const v = await toggleFav(m.id); if (typeof v === 'boolean' && v !== m.fav) { m.fav = v; patchHead(); } } catch {}
    }
    // ── 스와이프 (포인터 드래그 → --dx, 세로 이동이 크면 양보)
    let drag = null;
    const edgeOf = (dx) => (dx > 0 && idx === 0) || (dx < 0 && idx === list.length - 1);
    wrap.addEventListener('pointerdown', (e) => {
      if (finding || (e.pointerType === 'mouse' && e.button !== 0) || e.target.closest('.scratch, .find-badge, button, input, video')) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, axis: null };
    });
    wrap.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.axis) { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; } drag.axis = 'x'; wrap.classList.add('dragging'); try { wrap.setPointerCapture(e.pointerId); } catch {} }
      drag.dx = dx; wrap.style.setProperty('--dx', `${edgeOf(dx) ? Math.round(dx * 0.35) : Math.round(dx)}px`);
    });
    const endDrag = (e) => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const d = drag; drag = null; if (d.axis !== 'x') return;
      wrap.classList.remove('dragging'); lastDragEnd = performance.now();
      if (d.dx <= -SWIPE_PX && idx < list.length - 1) return nav(1);
      if (d.dx >= SWIPE_PX && idx > 0) return nav(-1);
      wrap.style.setProperty('--dx', '0px');
    };
    wrap.addEventListener('pointerup', endDrag); wrap.addEventListener('pointercancel', endDrag);
    async function nav(dir) {
      const ni = idx + dir; if (ni < 0 || ni >= list.length) return;
      const rmo = reduced();
      if (!rmo) { wrap.classList.add(dir > 0 ? 'out-left' : 'out-right'); await wait(180); }
      idx = ni; m = list[idx]; render(false);
      if (!rmo) { wrap.classList.add('dragging'); wrap.classList.remove('out-left', 'out-right'); wrap.style.setProperty('--dx', `${dir > 0 ? 72 : -72}px`); void wrap.offsetWidth; wrap.classList.remove('dragging'); }
      wrap.style.setProperty('--dx', '0px'); fx.blip();
    }
    // ── 더블탭 즐겨찾기 (사진 영역, 320ms·30px)
    wrap.addEventListener('click', (e) => {
      if (finding || !e.target.closest('#pz') || e.target.tagName === 'VIDEO' || e.target.closest('.scratch') || performance.now() - lastDragEnd < 300) return;
      const now = performance.now();
      if (now - lastTap < 320 && Math.hypot(e.clientX - tapX, e.clientY - tapY) < 30) { lastTap = 0; favToggle(); }
      else { lastTap = now; tapX = e.clientX; tapY = e.clientY; }
    });
    // ── 숨은 그림 찾기 (10초) — 진행 중엔 스와이프·더블탭 잠금
    function startFind() {
      const zone = $('#pz', wrap), img = zone?.querySelector('img,video'); if (!zone || !img || !m.hidden?.emoji) return;
      finding = true; let t = 10; const badge = document.createElement('div'); badge.className = 'find-badge';
      const label = (s) => `${icon('scope')} ${glyph(m.hidden.emoji)} 찾기 · ${s}s`; badge.innerHTML = label(t); zone.appendChild(badge);
      const stop = (html, ms) => { clearInterval(tick); img.onclick = null; finding = false; badge.innerHTML = html; setTimeout(() => badge.remove(), ms); };
      const tick = setInterval(() => { t--; badge.innerHTML = label(t); if (t <= 0) stop(`${icon('clock')} 시간 초과`, 1200); }, 1000);
      img.onclick = async (e) => { e.stopPropagation(); const r = img.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        if (Math.hypot(px - m.hidden.x, py - m.hidden.y) < 0.09) { stop(`${icon('check')} 찾았다! ${dustHtml(15)}`, 1500); state.dust += 15; save(); fx.chime(2, false); fx.burst(2, false); m.hidden.found = Date.now(); try { await updateMoment(m); } catch {} }
        else { fx.denied(); badge.classList.add('shake'); setTimeout(() => badge.classList.remove('shake'), 400); } };
    }
    // ── 공유 시트: 카드 / 원본 / 클립 / 콜라주
    function shareSheet(mm) {
      const w = wonderOf(mm), k = momentKind(mm); const el = document.createElement('div'); el.className = 'modal';
      el.innerHTML = `<div class="share-sheet" onclick="event.stopPropagation()"><div class="sheet-handle"></div><h3>${icon('share')} 공유하기</h3><small>${w ? `${esc(w.name)} 표본을` : k === 'video' ? '이 영상을' : '이 스냅을'} 어떤 모양으로 나눌까요?</small>
        <div class="opts">
          <button class="opt" data-sh="card">${icon('card')}카드<small>표본 플레이트 PNG</small></button>
          <button class="opt" data-sh="orig">${ic('export', 'share')}원본<small>${k === 'video' ? '영상 파일 그대로' : '사진 JPEG 그대로'}</small></button>
          <button class="opt" data-sh="clip" ${mm.clip ? '' : 'disabled'}>${icon('film')}클립<small>${mm.clip ? (k === 'video' ? fmtDuration(mm.duration) : '포획 클립') : '클립 없음'}</small></button>
          <button class="opt" data-sh="collage" ${list.length ? '' : 'disabled'}>${icon('collage')}콜라주<small>최근 ${Math.min(9, list.length)}장 격자</small></button>
        </div></div>`;
      el.onclick = () => el.remove(); app.appendChild(el); fx.blip();
      const done = async (r, what) => { if (r === 'cancel') return; toast(`${icon('check')} ${what} ${r === 'shared' ? '공유했어요' : '저장했어요'}`, TOAST_MS); if (what === '카드') { try { const ev = await markShared(mm.id); if (ev?.m) sync(ev.m); if (ev?.leveled) toast(`${icon('seed')} 「${icon(ev.leveled.icon)} ${ev.leveled.name}」로 진화! ${dustHtml(ev.leveled.reward.dust)}`, 3000, 'quest'); } catch {} } };
      $$('[data-sh]', el).forEach(b => b.onclick = async () => {
        const kind = b.dataset.sh; b.disabled = true; fx.blip();
        try {
          if (kind === 'card') { const u = URL.createObjectURL(mm.photo); try { const c = await renderCard({ label: mm.label, wonder: w, photo: u, isVariant: mm.variant, rankTitle: state.name || '탐험가', date: new Date(mm.ts).toLocaleDateString('ko-KR'), frame: mm.frame, caption: mm.caption, filter: filterCss(mm.filter), box: mm.box, kind: k }); await done(await shareCard(c, w?.name ?? (k === 'video' ? '영상' : '스냅')), '카드'); } finally { URL.revokeObjectURL(u); } }
          else if (kind === 'orig') { const r = await exportMany([mm]); if (r === 'none') toast(`${icon('warn')} 원본이 없어요`, TOAST_MS); else await done(r, '원본'); }
          else if (kind === 'clip' && mm.clip) { const ext = (mm.clipType || mm.clip.type || '').includes('mp4') ? 'mp4' : 'webm'; await done(await shareBlob(mm.clip, `wonder-clip-${mm.id}.${ext}`, `${w?.name ?? '영상'} 클립`), '클립'); }
          else if (kind === 'collage') { await done(await shareCollage(list), '콜라주'); }
        } catch { toast(`${icon('warn')} 공유에 실패했어요`, TOAST_MS); }
        b.disabled = false; el.remove();
      });
    }
    // ── 더보기: 다른 컷 고르기(alts) · 대결 · 선물 · 즐겨찾기 · 숨은 그림 · 삭제(실행 취소)
    function moreSheet(mm) {
      const w = wonderOf(mm), alts = Array.isArray(mm.alts) ? mm.alts.filter(a => a && a.size) : []; const el = document.createElement('div'); el.className = 'modal'; const us = [];
      const strip = () => { us.forEach(u => URL.revokeObjectURL(u)); us.length = 0; if (!alts.length) return ''; const cur = URL.createObjectURL(mm.thumb || mm.photo); us.push(cur); return `<small>${icon('image')} 다른 컷 고르기 — 포획 순간 앞뒤 프레임</small><div class="burst-strip" id="alts"><button type="button" data-alt="-1"><img class="on" src="${cur}" alt="현재 컷"/></button>${alts.map((a, i) => { const u = URL.createObjectURL(a); us.push(u); return `<button type="button" data-alt="${i}"><img src="${u}" alt="대안 ${i + 1}"/></button>`; }).join('')}<small>${alts.length}컷</small></div>`; };
      el.innerHTML = `<div class="share-sheet" onclick="event.stopPropagation()"><div class="sheet-handle"></div><h3>${ic('more', 'plus')} 더보기</h3><div id="altsWrap">${strip()}</div>
        <div class="opts">
          <button class="opt" data-mo="fav">${icon(mm.fav ? 'heart-off' : 'heart')}${mm.fav ? '즐겨찾기 해제' : '즐겨찾기'}<small>사진 더블탭으로도</small></button>
          ${w ? `<button class="opt" data-mo="duel">${icon('duel')}대결<small>그림자와 겨루기</small></button>` : ''}
          ${mm.label && state.codex[mm.label] ? `<button class="opt" data-mo="gift">${icon('gift')}선물<small>선물 코드 만들기</small></button>` : ''}
          ${mm.hidden?.emoji && !mm.hidden.found ? `<button class="opt" data-mo="find">${icon('scope')}숨은 그림<small>10초 안에 찾기 · ${dustHtml(15)}</small></button>` : ''}
        </div>
        <button class="btn ghost sm danger" data-mo="del">${icon('trash')} 삭제 <small class="mono">5초 안에 되돌릴 수 있어요</small></button></div>`;
      const closeEl = () => { el.remove(); us.forEach(u => URL.revokeObjectURL(u)); };
      el.onclick = closeEl; app.appendChild(el); fx.blip();
      const bindAlts = () => $$('[data-alt]', el).forEach(b => b.onclick = async () => { const i = +b.dataset.alt; if (i < 0) return; b.disabled = true; fx.blip(); try { const r = await swapAlt(mm, i); if (r) { sync(r); $('#altsWrap', el).innerHTML = strip(); bindAlts(); toast(`${icon('image')} 컷을 바꿨어요`, TOAST_MS); } } catch { toast(`${icon('warn')} 컷 교체 실패`, TOAST_MS); } });
      bindAlts();
      $$('[data-mo]', el).forEach(b => b.onclick = () => {
        const k = b.dataset.mo; closeEl();
        if (k === 'fav') favToggle();
        else if (k === 'duel') { fx.blip(); close(); go('duel', mm.id, 'shadow'); }
        else if (k === 'gift') { fx.blip(); close(); giftPanel(mm.label); }
        else if (k === 'find') { fx.blip(); startFind(); }
        else if (k === 'del') { close(); removeMoments([mm]); }
      });
    }
    render(true); fx.blip();
  }

  // ── 수정하기: 캡션 · 빛 필터 · 프레임 라이브 프리뷰 + 스킬 에디터 진입. 저장 시 edited:true (원본은 필터 CSS 만 바뀌므로 보존)
  function refinePanel(m, onDone = () => {}) {
    const u = URL.createObjectURL(m.photo); const el = document.createElement('div'); el.className = 'modal';
    el.innerHTML = `<div class="sheet" onclick="event.stopPropagation()"><div class="sheet-handle"></div><h3>${icon('quill')} 수정하기</h3>
      <div id="rfFrame" class="frame-${m.frame || 'default'}" style="border:2px solid var(--line-2);border-radius:var(--rad-md);overflow:hidden;line-height:0;background:var(--ink-0)"><img id="rfPrev" src="${u}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;display:block;filter:${filterCss(m.filter)}"/></div>
      <label>캡션 (60자) <input id="rfCap" maxlength="60" value="${esc(m.caption || '')}" placeholder="그날의 한 줄… 예) 회의 끝나고 처음 마신 커피"/></label>
      <label>빛 필터<div class="chips left">${FILTERS.map(f => `<button type="button" class="pill ${(m.filter || 'none') === f.id ? 'on' : ''}" data-flt="${f.id}">${f.name}</button>`).join('')}</div></label>
      <label>프레임<div class="chips left">${FRAMES.filter(f => (state.frames || ['default']).includes(f.id)).map(f => `<button type="button" class="pill ${(m.frame || 'default') === f.id ? 'on' : ''}" data-frm="${f.id}">${f.name}</button>`).join('')}</div></label>
      <div class="row"><button class="btn primary sm grow" id="rfSave">${icon('check')} 저장</button><button class="btn ghost sm" id="rfSkill">${icon('lens')} 스킬 에디터</button></div></div>`;
    let flt = m.filter || 'none', frm = m.frame || 'default';
    el.onclick = () => { el.remove(); URL.revokeObjectURL(u); }; app.appendChild(el); fx.blip();
    $$('[data-flt]', el).forEach(b => b.onclick = () => { flt = b.dataset.flt; $$('[data-flt]', el).forEach(x => x.classList.toggle('on', x === b)); $('#rfPrev', el).style.filter = filterCss(flt); fx.blip(); });
    $$('[data-frm]', el).forEach(b => b.onclick = () => { frm = b.dataset.frm; $$('[data-frm]', el).forEach(x => x.classList.toggle('on', x === b)); const fr = $('#rfFrame', el); fr.className = `frame-${frm}`; fx.blip(); });
    $('#rfSkill', el).onclick = () => { fx.blip(); el.click(); openEditor(m.id, (m2) => onDone(m2)); };
    $('#rfSave', el).onclick = async (e) => {
      e.currentTarget.disabled = true; const caption = $('#rfCap', el).value.trim().slice(0, 60);
      const changed = caption !== (m.caption || '') || flt !== (m.filter || 'none') || frm !== (m.frame || 'default');
      let r = null; try { r = await touchMoment(m.id, { caption, filter: flt, frame: frm, edited: !!(m.edited || changed) }); } catch {}
      el.click(); fx.blip();
      if (r?.leveled) { fx.chest(); fx.burst(2, false); toast(`${icon('seed')} 추억이 「${icon(r.leveled.icon)} ${r.leveled.name}」로 자랐어요! ${dustHtml(r.leveled.reward.dust)} · +${r.leveled.reward.xp} XP`, 3400, 'quest'); }
      else toast(r ? `${icon('quill')} 수정 저장` : `${icon('warn')} 저장에 실패했어요`, TOAST_MS);
      onDone(r?.m ?? null);
    };
  }
  function giftPanel(preLabel = null) {
    const owned = Object.keys(state.codex); const el = document.createElement('div'); el.className = 'modal';
    el.innerHTML = `<div class="sheet" onclick="event.stopPropagation()"><div class="sheet-handle"></div><h3>${icon('gift')} 선물 코드</h3>
      <small>서버 없이 친구와 원더를 나눠요. 코드를 받은 친구는 <b>별가루</b>와 <b>앨범의 친구 추억</b>, 그 원더의 <b>힌트</b>를 얻습니다.</small>
      <label>내 이름 <input id="gName" maxlength="12" value="${esc(state.name || '')}" placeholder="탐험가"/></label>
      <label>보낼 원더 <select id="gSel">${owned.map(l => `<option value="${esc(l)}" ${l === preLabel ? 'selected' : ''}>${catalogNo(l)} · ${esc(WONDERS[l]?.name ?? l)}</option>`).join('')}</select></label>
      <button class="btn primary sm" id="gMake" ${owned.length ? '' : 'disabled'}>코드 만들기</button>
      <div id="gOut" class="code mono hidden"></div>
      <hr/>
      <label>받은 코드 <input id="gIn" placeholder="WS-…"/></label>
      <button class="btn ghost sm" id="gRedeem">선물 받기</button><div id="gMsg" class="msg"></div></div>`;
    el.onclick = () => el.remove(); app.appendChild(el);
    $('#gMake', el).onclick = async () => { state.name = $('#gName', el).value.trim(); save(); const code = makeGift($('#gSel', el).value, state.name || '탐험가'); const out = $('#gOut', el); out.classList.remove('hidden'); out.innerHTML = `<b>${code}</b><div class="row" style="margin-top:6px"><button class="btn sm ghost grow" id="gCopy">${icon('copy')} 복사</button><button class="btn sm ghost grow" id="gShare">${icon('share')} 공유</button></div>`; fx.chest();
      const copyBtn = $('#gCopy', el);
      copyBtn.onclick = async () => { try { await navigator.clipboard.writeText(code); copyBtn.innerHTML = `${icon('check')} 복사됨`; } catch { copyBtn.textContent = '길게 눌러 복사'; } };
      $('#gShare', el).onclick = async () => { const text = `WONDER SCANNER 선물 코드\n${code}\n${WONDERS[$('#gSel', el).value]?.name ?? ''}을(를) 보여줄게! https://wonderscanner.vercel.app`; if (navigator.share) { try { await navigator.share({ text }); } catch {} } else { await navigator.clipboard.writeText(text); toast('공유 텍스트를 복사했어요', TOAST_MS); } }; };
    $('#gRedeem', el).onclick = async () => { const r = redeemGift($('#gIn', el).value); const msg = $('#gMsg', el); if (!r.ok) { msg.innerHTML = `${icon('miss')} ${esc(r.msg)}`; fx.denied(); return; }
      msg.innerHTML = `${icon('check')} <b>${esc(r.name)}</b>의 ${glyph(r.wonder.emoji)} <b>${esc(r.wonder.name)}</b> 추억을 받았어요! 별가루 +${r.dust}${state.codex[r.label] ? '' : ' · 도감에 힌트 표시'}`; fx.chest(); fx.burst(r.wonder.rarity, r.variant);
      const ph = placeholderPhoto(r.wonder, r.label); await addMoment({ label: r.label, grade: r.grade === 'P' ? 'PERFECT' : r.grade === 'G' ? 'GOOD' : 'AUTO', variant: r.variant, frame: 'default', photoDataUrl: ph, friend: { name: r.name } }); };
  }
  /** 친구 선물의 대체 사진: 잉크 플레이트 위 렌즈 접시에 원더 글리프, 아래에 Mono 카탈로그 번호 */
  function placeholderPhoto(w, label) {
    const c = document.createElement('canvas'); c.width = c.height = 320; const x = c.getContext('2d');
    x.fillStyle = '#161D2B'; x.fillRect(0, 0, 320, 320);
    x.strokeStyle = 'rgba(237,230,214,.18)'; x.lineWidth = 1; x.strokeRect(12.5, 12.5, 295, 295);
    x.beginPath(); x.arc(160, 140, 78, 0, Math.PI * 2); x.fillStyle = '#0F141E'; x.fill(); x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '96px system-ui'; x.fillStyle = '#EDE6D6'; x.fillText(w.emoji, 160, 144);
    x.textBaseline = 'alphabetic'; x.font = '600 20px "IBM Plex Sans KR", sans-serif'; x.fillStyle = '#EDE6D6'; x.fillText('친구의 추억', 160, 264);
    x.font = '500 12px "IBM Plex Mono", ui-monospace, monospace'; x.fillStyle = '#E2B45A'; x.fillText(`${catalogNo(label)} · ${label}`, 160, 290);
    return c.toDataURL('image/jpeg', 0.8);
  }
  return () => { urls.forEach(u => URL.revokeObjectURL(u)); bar?.remove(); };
});
