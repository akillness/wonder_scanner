import { register, go, app, $, $$, esc, tabsHtml, bindTabs, toast, grade as GI, icon, rarityHtml, catalogNo, glyph } from '../shell.js';
import { WONDERS, RARITY } from '../../data/wonders.js';
import { state, save } from '../../game/state.js';
import { listMoments, deleteMoment, toggleFav, stats, fmtBytes, renderCollage } from '../../game/media.js';
import { makeGift, redeemGift, FRAMES } from '../../game/economy.js';
import { renderCard, shareCard, shareBlob } from '../card.js';
import * as fx from '../fx.js';
import { STAGES, FILTERS, filterCss, stageFor, refine, recall, markShared, daysAgo } from '../../game/memories.js';
import { cloudEnabled } from '../../cloud/provider.js';
import { openEditor } from '../editor.js';
import { mountScratch } from '../scratch.js';

// 필터 칩: key · 아이콘 이름 · 라벨
const FILTER_CHIPS = [['all', null, '전체'], ['clip', 'film', '클립'], ['perfect', 'target', '퍼펙트'], ['fav', 'heart', '즐겨찾기'], ['friend', 'gift', '친구']];
const stageIcon = (m) => icon(STAGES[m.stage || 0].icon);
const dustHtml = (n) => `${icon('dust')}+${n}`;

register('album', async (filter = 'all', openId = null) => {
  const ms = await listMoments(), st = await stats();
  const shown = ms.filter(m => filter === 'all' || (filter === 'fav' && m.fav) || (filter === 'clip' && m.clip) || (filter === 'friend' && m.friend) || (filter === 'perfect' && m.grade === 'PERFECT'));
  const urls = [];
  app.innerHTML = `
  <section class="screen meta album">
    <header><button class="btn icon ghost" id="back" title="뒤로">${icon('back')}</button><h2>추억 앨범</h2><span class="pill mono" title="저장 용량">${st.count}장 · ${fmtBytes(st.bytes)}</span></header>
    <div class="progress sm" title="앨범 용량 ${st.pct}%"><i style="width:${st.pct}%"></i></div>
    <div class="chips left">${FILTER_CHIPS.map(([k, ic, l]) => `<button class="pill ${k === filter ? 'on' : ''}" data-f="${k}">${ic ? `${icon(ic)} ` : ''}${l}</button>`).join('')}</div>
    <div class="row" style="margin:8px 0"><button class="btn ghost sm grow" id="collage" ${shown.length ? '' : 'disabled'}>${icon('collage')} 콜라주 공유 (최근 ${Math.min(9, shown.length)}장)</button><button class="btn ghost sm grow" id="gift">${icon('gift')} 선물 코드</button></div>
    ${shown.length ? `<div class="album-grid">${shown.map((m, i) => { const w = WONDERS[m.label], u = URL.createObjectURL(m.thumb || m.photo); urls.push(u); return `<button class="mom stagger ${m.variant ? 'variant' : ''}" data-id="${m.id}" style="--sc:${RARITY[w.rarity].color};--i:${i}"><img src="${u}" alt="" loading="lazy" style="filter:${filterCss(m.filter)}${m.cover ? ' blur(8px)' : ''}"/><span class="tag">${m.cover ? icon('lock') : ''}${m.skills?.length ? icon('lens') : ''}${stageIcon(m)} ${glyph(w.emoji)}${m.clip ? icon('film') : ''}${m.fav ? icon('heart') : ''}${m.friend ? icon('gift') : ''}${m.cloud ? icon('cloud') : ''}</span></button>`; }).join('')}</div>`
      : `<div class="empty">${icon('camera', { size: 48 })}<br>아직 추억이 없어요.<br><small>원더를 포획하면 사진(과 클립)이 여기 쌓입니다.</small><br><button class="btn primary sm" data-go="scan" style="margin-top:12px">${icon('camera')} 스캔 시작</button></div>`}
    <div class="info-card"><b>${icon('seed')} 추억은 자랍니다</b><small>${STAGES.map(s => `${icon(s.icon)} ${s.name}`).join(' → ')} · 캡션 쓰기, 필터 고르기, 회상, 공유, 같은 원더 재방문, 7일 숙성이 성장 포인트. 단계가 오르면 별가루·XP 보상.</small></div>
    <div class="info-card"><b>${icon('lock')} 압축 정책</b><small>사진 640px·JPEG 74% (약 50KB) · 클립 540p·24fps·1.1Mbps (5초 ≈ 700KB) · 앨범 상한 ${fmtBytes(st.cap)}, 넘치면 즐겨찾기 아닌 오래된 것부터 정리</small></div>
    ${tabsHtml('album')}
  </section>`;
  $('#back').onclick = () => go('title'); bindTabs();
  $$('[data-f]').forEach(b => b.onclick = () => { fx.blip(); go('album', b.dataset.f); });
  $$('.mom').forEach(b => b.onclick = () => detail(ms.find(m => m.id === b.dataset.id)));
  const collageBtn = $('#collage');
  collageBtn.onclick = async () => { collageBtn.disabled = true; collageBtn.textContent = '생성 중…'; try { const c = await renderCollage(shown.slice(0, 9), { title: 'WONDER ALBUM', sub: `${state.name || '탐험가'} · ${new Date().toLocaleDateString('ko-KR')} · ${Object.keys(state.codex).length}/80 수집` }); const r = await shareCard(c, '내 원더 앨범'); collageBtn.innerHTML = r === 'cancel' ? `${icon('collage')} 콜라주 공유` : `${icon('check')} 공유됨`; } catch { collageBtn.textContent = '실패… 다시'; } collageBtn.disabled = false; };
  $('#gift').onclick = () => giftPanel();
  if (openId) { const m = ms.find(x => x.id === openId); if (m) { const r = await recall(m.id); if (r?.leveled) toast(`${icon('seed')} 추억이 「${icon(r.leveled.icon)} ${r.leveled.name}」로 자랐어요! ${dustHtml(r.leveled.reward.dust)}`, 3200, 'quest'); else toast(`${icon('album')} 회상 완료 · ${icon('dust')} +10`, 2000); detail(r?.m ?? m); } }

  function detail(m) {
    const w = WONDERS[m.label], R = RARITY[w.rarity], u = URL.createObjectURL(m.photo), cu = m.clip ? URL.createObjectURL(m.clip) : null;
    const el = document.createElement('div'); el.className = 'modal';
    el.innerHTML = `<div class="card plate frame-${m.frame || 'default'} ${m.variant ? 'variant' : ''}" style="--r-color:${R.color};--r-glow:${R.glow};animation:pop .4s both" onclick="event.stopPropagation()">
      <div class="scratch-zone photo-zone" id="pz">${cu ? `<video class="photo" src="${cu}" playsinline loop muted autoplay controls style="filter:${filterCss(m.filter)}"></video>` : `<img class="photo" src="${u}" alt="" style="filter:${filterCss(m.filter)}"/>`}</div>
      <div class="rar"><span>${rarityHtml(w.rarity)}</span><span>${icon(GI[m.grade] ?? 'circle')} ${m.grade}${m.friend ? ` · ${icon('gift')} ${esc(m.friend.name)}` : ''}</span></div>
      <div class="name">${glyph(w.emoji)} ${esc(w.name)}</div><div class="orig mono">${catalogNo(m.label)} · ${esc(m.label)} · ${daysAgo(m.ts)} · ${new Date(m.ts).toLocaleDateString('ko-KR')} · ${fmtBytes(m.bytes || 0)}${m.clip ? ` · ${icon('film')}` : ''}${m.cloud ? ` · ${icon('cloud')}` : ''}</div>
      <div class="stage-row"><span class="stage-badge">${stageIcon(m)} ${STAGES[m.stage || 0].name}</span>${STAGES.slice(1).map(s => `<i class="${(m.stage || 0) >= s.id ? 'on' : ''}" title="${s.name}"></i>`).join('')}<small>회상 ${m.recalls || 0} · 공유 ${m.shares || 0}</small></div>
      <div class="caption">${m.caption ? `${icon('quill')} ${esc(m.caption)}` : '<span class="mute">캡션을 남기면 추억이 자라요</span>'}</div>
      <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:6px">
        <button class="btn sm primary" id="mRefine">${icon('quill')} 다듬기</button><button class="btn sm primary" id="mSkill">${icon('lens')} 스킬</button><button class="btn sm ghost" id="mDuel">${icon('duel')} 대결</button>${m.hidden?.emoji && !m.hidden.found ? `<button class="btn sm ghost" id="mFind">${icon('scope')} 숨은 그림</button>` : ''}
        <button class="btn sm ghost" id="mShare">${icon('card')} 카드</button>${cu ? `<button class="btn sm ghost" id="mClip">${icon('film')} 클립 공유</button>` : ''}<button class="btn sm ghost" id="mFav">${m.fav ? `${icon('heart-off')} 해제` : `${icon('heart')} 즐겨찾기`}</button><button class="btn sm ghost" id="mGift">${icon('gift')} 선물</button><button class="btn sm ghost" id="mDel" title="삭제">${icon('trash')}</button>
      </div></div>`;
    el.onclick = () => { el.remove(); URL.revokeObjectURL(u); if (cu) URL.revokeObjectURL(cu); }; app.appendChild(el); fx.blip();
    const shareBtn = $('#mShare', el);
    shareBtn.onclick = async () => { shareBtn.textContent = '…'; const c = await renderCard({ label: m.label, wonder: w, photo: u, isVariant: m.variant, rankTitle: state.name || '탐험가', date: new Date(m.ts).toLocaleDateString('ko-KR'), frame: m.frame, caption: m.caption, filter: filterCss(m.filter) }); const r = await shareCard(c, w.name); shareBtn.innerHTML = `${icon('card')} 카드`; if (r !== 'cancel') { const ev = await markShared(m.id); if (ev?.leveled) toast(`${icon('seed')} 「${icon(ev.leveled.icon)} ${ev.leveled.name}」로 진화! ${dustHtml(ev.leveled.reward.dust)}`, 3000, 'quest'); } };
    $('#mRefine', el).onclick = () => { el.click(); refinePanel(m); };
    $('#mDuel', el).onclick = () => { el.click(); go('duel', m.id, 'shadow'); };
    $('#mSkill', el).onclick = () => { el.click(); openEditor(m.id, () => go('album', filter)); };
    if (m.cover) requestAnimationFrame(() => mountScratch($('#pz', el), { label: '가려진 추억 — 긁어서 보기', tapOnly: state.settings.reduceMotion }));
    const findBtn = $('#mFind', el);
    if (findBtn) findBtn.onclick = () => { const zone = $('#pz', el); const img = zone.querySelector('img,video'); let t = 10; const badge = document.createElement('div'); badge.className = 'find-badge'; const label = (s) => `${icon('scope')} ${glyph(m.hidden.emoji)} 찾기 · ${s}s`; badge.innerHTML = label(t); zone.appendChild(badge); const tick = setInterval(() => { t--; badge.innerHTML = label(t); if (t <= 0) { clearInterval(tick); badge.innerHTML = `${icon('clock')} 시간 초과`; setTimeout(() => badge.remove(), 1200); img.onclick = null; } }, 1000);
      img.onclick = async (e) => { const r = img.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height; if (Math.hypot(px - m.hidden.x, py - m.hidden.y) < 0.09) { clearInterval(tick); badge.innerHTML = `${icon('check')} 찾았다! ${dustHtml(15)}`; state.dust += 15; save(); fx.chime(2, false); fx.burst(2, false); const { updateMoment } = await import('../../game/media.js'); m.hidden.found = Date.now(); await updateMoment(m); img.onclick = null; setTimeout(() => badge.remove(), 1500); } else { fx.denied(); badge.classList.add('shake'); setTimeout(() => badge.classList.remove('shake'), 400); } }; };
    const clipBtn = $('#mClip', el);
    if (clipBtn) clipBtn.onclick = async () => { clipBtn.textContent = '…'; await shareBlob(m.clip, `wonder-clip-${m.id}.${m.clip.type.includes('mp4') ? 'mp4' : 'webm'}`, `${w.name} 포획 클립`); clipBtn.innerHTML = `${icon('film')} 클립 공유`; };
    $('#mFav', el).onclick = async () => { await toggleFav(m.id); fx.blip(); el.click(); go('album', filter); };
    $('#mDel', el).onclick = async () => { if (confirm('이 추억을 삭제할까요?')) { await deleteMoment(m.id); el.click(); go('album', filter); } };
    $('#mGift', el).onclick = () => { el.click(); giftPanel(m.label); };
  }
  function refinePanel(m) {
    const w = WONDERS[m.label], u = URL.createObjectURL(m.photo); const el = document.createElement('div'); el.className = 'modal';
    el.innerHTML = `<div class="sheet" onclick="event.stopPropagation()"><div class="sheet-handle"></div><h3>${icon('quill')} 추억 다듬기</h3>
      <img id="rfPrev" src="${u}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;filter:${filterCss(m.filter)}"/>
      <label>캡션 (60자) <input id="rfCap" maxlength="60" value="${esc(m.caption || '')}" placeholder="그날의 한 줄… 예) 회의 끝나고 처음 마신 커피"/></label>
      <label>빛 필터<div class="chips left">${FILTERS.map(f => `<button class="pill ${(m.filter || 'none') === f.id ? 'on' : ''}" data-flt="${f.id}">${f.name}</button>`).join('')}</div></label>
      <label>프레임<div class="chips left">${FRAMES.filter(f => state.frames.includes(f.id)).map(f => `<button class="pill ${(m.frame || 'default') === f.id ? 'on' : ''}" data-frm="${f.id}">${f.name}</button>`).join('')}</div></label>
      <button class="btn primary sm" id="rfSave">저장하고 성장 확인</button></div>`;
    let flt = m.filter || 'none', frm = m.frame || 'default';
    el.onclick = () => { el.remove(); URL.revokeObjectURL(u); }; app.appendChild(el);
    $$('[data-flt]', el).forEach(b => b.onclick = () => { flt = b.dataset.flt; $$('[data-flt]', el).forEach(x => x.classList.toggle('on', x === b)); $('#rfPrev', el).style.filter = filterCss(flt); fx.blip(); });
    $$('[data-frm]', el).forEach(b => b.onclick = () => { frm = b.dataset.frm; $$('[data-frm]', el).forEach(x => x.classList.toggle('on', x === b)); fx.blip(); });
    $('#rfSave', el).onclick = async () => { const r = await refine(m.id, { caption: $('#rfCap', el).value.trim(), filter: flt, frame: frm }); el.click(); if (r?.leveled) { fx.chest(); fx.burst(2, false); toast(`${icon('seed')} 추억이 「${icon(r.leveled.icon)} ${r.leveled.name}」로 자랐어요! ${dustHtml(r.leveled.reward.dust)} · +${r.leveled.reward.xp} XP`, 3400, 'quest'); } else toast(`${icon('quill')} 다듬기 저장`, 1600); go('album', filter); };
  }
  function giftPanel(preLabel = null) {
    const owned = Object.keys(state.codex); const el = document.createElement('div'); el.className = 'modal';
    el.innerHTML = `<div class="sheet" onclick="event.stopPropagation()"><div class="sheet-handle"></div><h3>${icon('gift')} 선물 코드</h3>
      <small>서버 없이 친구와 원더를 나눠요. 코드를 받은 친구는 <b>별가루</b>와 <b>앨범의 친구 추억</b>, 그 원더의 <b>힌트</b>를 얻습니다.</small>
      <label>내 이름 <input id="gName" maxlength="12" value="${esc(state.name || '')}" placeholder="탐험가"/></label>
      <label>보낼 원더 <select id="gSel">${owned.map(l => `<option value="${esc(l)}" ${l === preLabel ? 'selected' : ''}>${catalogNo(l)} · ${esc(WONDERS[l].name)}</option>`).join('')}</select></label>
      <button class="btn primary sm" id="gMake" ${owned.length ? '' : 'disabled'}>코드 만들기</button>
      <div id="gOut" class="code mono hidden"></div>
      <hr/>
      <label>받은 코드 <input id="gIn" placeholder="WS-…"/></label>
      <button class="btn ghost sm" id="gRedeem">선물 받기</button><div id="gMsg" class="msg"></div></div>`;
    el.onclick = () => el.remove(); app.appendChild(el);
    $('#gMake', el).onclick = async () => { state.name = $('#gName', el).value.trim(); save(); const code = makeGift($('#gSel', el).value, state.name || '탐험가'); const out = $('#gOut', el); out.classList.remove('hidden'); out.innerHTML = `<b>${code}</b><div class="row" style="margin-top:6px"><button class="btn sm ghost grow" id="gCopy">${icon('copy')} 복사</button><button class="btn sm ghost grow" id="gShare">${icon('share')} 공유</button></div>`; fx.chest();
      const copyBtn = $('#gCopy', el);
      copyBtn.onclick = async () => { try { await navigator.clipboard.writeText(code); copyBtn.innerHTML = `${icon('check')} 복사됨`; } catch { copyBtn.textContent = '길게 눌러 복사'; } };
      $('#gShare', el).onclick = async () => { const text = `WONDER SCANNER 선물 코드\n${code}\n${WONDERS[$('#gSel', el).value].name}을(를) 보여줄게! https://wonderscanner.vercel.app`; if (navigator.share) { try { await navigator.share({ text }); } catch {} } else { await navigator.clipboard.writeText(text); toast('공유 텍스트를 복사했어요'); } }; };
    $('#gRedeem', el).onclick = async () => { const r = redeemGift($('#gIn', el).value); const msg = $('#gMsg', el); if (!r.ok) { msg.innerHTML = `${icon('miss')} ${esc(r.msg)}`; fx.denied(); return; }
      msg.innerHTML = `${icon('check')} <b>${esc(r.name)}</b>의 ${glyph(r.wonder.emoji)} <b>${esc(r.wonder.name)}</b> 추억을 받았어요! 별가루 +${r.dust}${state.codex[r.label] ? '' : ' · 도감에 힌트 표시'}`; fx.chest(); fx.burst(r.wonder.rarity, r.variant);
      const { addMoment } = await import('../../game/media.js'); const ph = placeholderPhoto(r.wonder, r.label); await addMoment({ label: r.label, grade: r.grade === 'P' ? 'PERFECT' : r.grade === 'G' ? 'GOOD' : 'AUTO', variant: r.variant, frame: 'default', photoDataUrl: ph, friend: { name: r.name } }); };
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
  return () => urls.forEach(u => URL.revokeObjectURL(u));
});
