import { register, go, app, $, $$, esc, tabsHtml, bindTabs, toast, icon, glyph } from '../shell.js';
import { WONDERS, RARITY } from '../../data/wonders.js';
import { state, save, rank, ownedCount } from '../../game/state.js';
import { cloud, cloudEnabled } from '../../cloud/provider.js';
import { listMoments } from '../../game/media.js';
import { STAGES } from '../../game/memories.js';
import * as fx from '../fx.js';

/** 탐험가 광장: 로그인한 컬렉터들의 공개 프로필과 추억을 둘러본다 */
register('collectors', async (uid = null) => {
  const me = cloudEnabled ? await cloud.user() : null;
  if (uid) return renderOne(uid);
  const list = cloudEnabled && me ? await cloud.listCollectors(30).catch(() => []) : [];
  const r = rank();
  app.innerHTML = `
  <section class="screen meta">
    <header><button class="btn icon ghost" id="back" title="뒤로">${icon('back')}</button><h2>탐험가 광장</h2>${me ? `<img class="avatar" src="${esc(me.photo || '')}" alt=""/>` : `<span class="pill" title="탐험가 광장">${icon('globe')}</span>`}</header>
    ${!cloudEnabled ? `<div class="info-card warn"><b>${icon('cloud')} 클라우드가 아직 연결되지 않았어요</b><small>Firebase 프로젝트를 만들고 Vercel 환경변수(<code>VITE_FIREBASE_*</code>)를 넣으면 Google 로그인, 사용자별 사진·클립 저장, 컬렉터 광장이 켜집니다. 지금은 모든 추억이 이 기기에만 저장됩니다. 설정 방법: <code>docs/CLOUD_SETUP.md</code></small></div>`
      : !me ? `<div class="info-card"><b>Google로 로그인</b><small>추억이 내 계정에 저장되고, 다른 기기에서도 이어집니다. 프로필을 공개하면 광장에 내 컬렉션이 보여요.</small><button class="btn primary sm" id="login">${icon('login')} Google 계정으로 로그인</button></div>`
      : `<div class="rank-card"><div class="rk">${r.level}</div><div class="grow"><b>${esc(state.name || me.name || '탐험가')}</b><small>${ownedCount()}/80 · ${esc(r.title)} · ${state.cloud.public ? `${icon('globe')} 공개` : `${icon('lock')} 비공개`}</small></div><label class="setting" style="padding:6px 10px"><small>공개</small><input type="checkbox" id="pub" ${state.cloud.public ? 'checked' : ''}><i class="sw"></i></label></div>
         <div class="row" style="margin-bottom:10px"><button class="btn ghost sm grow" id="sync">${icon('cloud')} 지금 동기화</button><button class="btn ghost sm" id="logout">로그아웃</button></div>`}
    <h3>${icon('medal')} 컬렉터 ${list.length ? `<small>${list.length}명</small>` : ''}</h3>
    ${list.length ? `<div class="quest-list ledger">${list.map((c, i) => `<button class="quest ledger-row collector stagger" data-uid="${c.uid}" style="--i:${i}"><div class="qi mono">${i < 3 ? icon('medal') : ''}#${i + 1}</div><img class="avatar" src="${esc(c.photo || '')}" alt=""/><div class="grow"><b>${esc(c.name || '탐험가')}</b><div class="progress sm"><i style="width:${(c.codexCount || 0) / 80 * 100}%"></i></div><small>${c.codexCount || 0}/80 · ${esc(c.rankTitle || '')} · 추억 ${c.momentsCount || 0}</small></div></button>`).join('')}</div>`
      : `<div class="empty">${cloudEnabled ? (me ? '아직 공개 컬렉터가 없어요. 첫 번째가 되어 보세요!' : '로그인하면 다른 탐험가들의 컬렉션이 보여요.') : '클라우드 연결 후 다른 탐험가들이 여기 나타납니다.'}<br><small>지금도 ${icon('gift')} 선물 코드로 친구와 원더를 나눌 수 있어요 (앨범 → 선물 코드).</small></div>`}
    <h3>${icon('gift')} 친구에게 받은 추억 <small>${state.stats.giftsGot || 0}</small></h3>
    <div class="info-card"><small>선물 코드는 서버 없이 동작하는 공유 방식입니다. 광장이 켜지면 컬렉터 페이지에서 바로 추억을 구경하고 코드 없이 응원할 수 있어요.</small></div>
    ${tabsHtml('profile')}
  </section>`;
  $('#back').onclick = () => go('profile'); bindTabs();
  $('#login') && ($('#login').onclick = async () => { try { const u = await cloud.signIn(); state.cloud.uid = u.uid; if (!state.name) state.name = (u.name || '').slice(0, 12); save(); await syncAll(); toast(`${icon('cloud')} ${esc(u.name || '')} 로그인 · 동기화 완료`); go('collectors'); } catch (e) { fx.denied(); toast('로그인 실패: ' + esc(e.message || e)); } });
  $('#logout') && ($('#logout').onclick = async () => { await cloud.signOut(); state.cloud.uid = null; save(); go('collectors'); });
  $('#pub') && ($('#pub').onchange = async (e) => { state.cloud.public = e.target.checked; save(); await cloud.publishProfile(profile()); toast(state.cloud.public ? `${icon('globe')} 프로필 공개` : `${icon('lock')} 비공개`); });
  const syncBtn = $('#sync');
  if (syncBtn) syncBtn.onclick = async () => { syncBtn.disabled = true; syncBtn.textContent = '동기화 중…'; await syncAll(); syncBtn.innerHTML = `${icon('check')} 완료`; setTimeout(() => go('collectors'), 600); };
  $$('.collector').forEach(b => b.onclick = () => go('collectors', b.dataset.uid));

  async function renderOne(u) {
    const ms = await cloud.collectorMoments(u, 30).catch(() => []); const cs = (await cloud.listCollectors(50).catch(() => [])).find(c => c.uid === u) ?? { name: '탐험가' };
    app.innerHTML = `<section class="screen meta"><header><button class="btn icon ghost" id="back" title="뒤로">${icon('back')}</button><h2>${esc(cs.name || '탐험가')}</h2><span class="pill mono">${cs.codexCount || 0}/80</span></header>
      <div class="album-grid">${ms.map((m, i) => { const w = WONDERS[m.label]; return `<div class="mom stagger ${m.variant ? 'variant' : ''}" style="--i:${i}"><img src="${esc(m.photoUrl)}" alt="" loading="lazy"/><span class="tag">${w ? glyph(w.emoji) : ''} ${icon(STAGES[m.stage || 0].icon)}${m.clipUrl ? icon('film') : ''}</span></div>`; }).join('') || '<div class="empty">공개된 추억이 없어요</div>'}</div>
      ${ms.filter(m => m.caption).slice(0, 5).map(m => `<div class="note">${icon('quill')} ${esc(WONDERS[m.label]?.name ?? m.label)} — ${esc(m.caption)}</div>`).join('')}
      ${tabsHtml('profile')}</section>`;
    $('#back').onclick = () => go('collectors'); bindTabs();
  }
});
export function profile() { const r = rank(); return { name: state.name || '탐험가', codexCount: ownedCount(), xp: state.xp, rankTitle: r.title, public: !!state.cloud.public, momentsCount: state.scans, photo: null }; }
export async function syncAll() {
  if (!cloudEnabled || !(await cloud.user())) return;
  const ms = await listMoments(); let n = 0;
  for (const m of ms) { if (m.cloud) continue; try { const r = await cloud.syncMoment(m); if (r) { m.cloud = r; const { updateMoment } = await import('../../game/media.js'); await updateMoment(m); n++; } } catch {} }
  const me = await cloud.user(); await cloud.publishProfile({ ...profile(), photo: me?.photo ?? null }); await cloud.saveState(state); return n;
}
