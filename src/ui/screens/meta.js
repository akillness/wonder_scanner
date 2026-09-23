import { register, go, app, $, $$, esc, tabsHtml, bindTabs, toast, icon, syncReduceMotion } from '../shell.js';
import { state, save, rank, resetAll, ownedCount, totalCount } from '../../game/state.js';
import { ensureDailyQuests, questText } from '../../game/quests.js';
import { ACHIEVEMENTS } from '../../game/achievements.js';
import { BALANCE, streakMultiplier } from '../../game/balance.js';
import * as fx from '../fx.js';
import { GESTURE_MAP, FACE_MAP } from '../../scanner/gesture.js';
import { SKILLS, ownsSkill } from '../../game/skills.js';

function untilMidnight() { const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0); const s = Math.floor((m - n) / 1000); return `${Math.floor(s / 3600)}시간 ${Math.floor(s % 3600 / 60)}분`; }

// skills.js / gesture.js 의 icon 필드는 여전히 이모지 → 화면 측에서 아이콘 이름으로 매핑 (UI 크롬 이모지 금지)
const SKILL_ICON = { emoji: 'image', tone: 'sun', shape: 'frame', warp: 'lens', hidden: 'scope', glow: 'dust' };
const ACTION_ICON = { tap: 'target', grab: 'fragment', record: 'rec', token: 'prism', snap: 'camera', point: 'arrow-right', inhale: 'fragment' };
const SETTING_ICON = { sound: 'rec', haptics: 'boost', reduceMotion: 'moon', autoCapture: 'target', recordClips: 'film', gestures: 'ar', faceControl: 'profile' };
const QN = ['①', '②', '③'];

register('quests', () => {
  const items = ensureDailyQuests(), sd = state.streak.days;
  app.innerHTML = `
  <section class="screen meta">
    <header><button class="btn icon ghost" id="back" title="뒤로" aria-label="뒤로">${icon('back')}</button><h2>오늘의 의뢰</h2><span class="pill mono">${icon('clock')} ${untilMidnight()}</span></header>
    <div class="streak-card"><div class="fire">${icon('flame', { size: 30 })}</div><div><b>${sd}일 연속 출석</b><small>XP 배율 ×${streakMultiplier(sd).toFixed(1)} · 내일 접속하면 ×${streakMultiplier(sd + 1).toFixed(1)}</small></div><div class="days">${Array.from({ length: 5 }, (_, i) => `<i class="${i < Math.min(sd, 5) ? 'on' : ''}"></i>`).join('')}</div></div>
    <div class="quest-list ledger">${items.map((q, i) => `<div class="quest ledger-row stagger ${q.done ? 'done' : ''}" style="--i:${i}">
      <div class="qi mono">${q.done ? icon('check', { size: 22 }) : (QN[i] ?? String(i + 1))}</div>
      <div class="grow"><b>${esc(questText(q))}</b><div class="progress sm"><i style="width:${q.progress / q.goal * 100}%"></i></div><small class="mono">${q.progress}/${q.goal}</small></div>
      <div class="qr mono">+${q.reward.xp} XP<br>+${q.reward.dust} ${icon('dust')}${q.reward.prism ? `<br><span class="prism">${icon('prism')} 프리즘 토큰</span>` : ''}</div>
    </div>`).join('')}</div>
    <div class="info-card"><b>${icon('prism')} 프리즘 토큰 ${state.prismTokens}개</b><small>스캔 화면에서 토큰을 장착하면 다음 포획이 <b>변이체 확정</b>. 3번째 의뢰 보상과 황금 정령에게서 얻습니다.</small></div>
    <div class="info-card"><b>${icon('fragment')} 정령 조각 ${state.fragments}/${BALANCE.spirits.fragmentsPerBoost} · ${icon('boost')} 공명 부스트 ${state.boost}</b><small>카메라 화면에 떠다니는 정령을 탭하면 조각을 얻고, ${BALANCE.spirits.fragmentsPerBoost}개마다 다음 공명이 2배 빨라집니다.</small></div>
    ${tabsHtml('quests')}
  </section>`;
  $('#back').onclick = () => go('title'); bindTabs();
});

register('profile', (openSettings = false) => {
  const r = rank(), s = state.stats;
  const stat = (v, ic, label) => `<div><b>${v}</b><small>${ic ? `${icon(ic, { size: 12 })} ` : ''}${label}</small></div>`;
  const settings = [
    ['sound', '효과음', '공명 틱, 발견 차임'],
    ['haptics', '햅틱', '포획·발견 시 진동'],
    ['reduceMotion', '모션 줄이기', '흔들림·글리치·플래시·후광을 끄고 안정된 표시로 대체'],
    ['autoCapture', '자동 포획', '타이밍 링을 건너뛰고 공명이 차면 바로 포획 (등급 보너스 없음)'],
    ['recordClips', '포획 클립 녹화', '공명 60%부터 발견까지 사운드 포함 짧은 영상을 앨범에 저장 (540p, 5초 ≈ 700KB)'],
    ['gestures', '손 제스처', '카메라 모드에서 손 모양으로 포획·정령·토큰·촬영 (MediaPipe, 첫 사용 시 모델 다운로드)'],
    ['faceControl', '얼굴 제어', '깜빡임·입·눈썹·미소로 조작 (전면 카메라 권장, 제스처 ON 필요)'],
  ];
  app.innerHTML = `
  <section class="screen meta">
    <header><button class="btn icon ghost" id="back" title="뒤로" aria-label="뒤로">${icon('back')}</button><h2>탐험가 프로필</h2><span class="pill mono">Lv.${r.level}</span></header>
    <div class="rank-card"><div class="rk">${r.level}</div><div class="grow"><b>${esc(r.title)}</b><div class="progress sm"><i style="width:${r.progress * 100}%"></i></div><small class="mono">${state.xp} XP${r.next ? ` · 다음 「${esc(r.next.title)}」까지 ${r.next.xp - state.xp}` : ' · 최고 랭크'}</small></div></div>
    <div class="stats">${stat(ownedCount(), '', `/${totalCount()} 수집`)}${stat(state.scans, '', '스캔')}${stat(s.perfects, 'target', '퍼펙트')}${stat(s.variants, 'prism', '변이체')}${stat(s.spirits, 'fragment', '정령')}${stat(state.completedChapters.length, '', '/6 챕터')}${stat(state.streak.days, 'flame', '연속일')}${stat(state.dust, 'dust', '별가루')}</div>
    <div class="ledger" style="margin:10px 0">
      <button class="ledger-row" id="shop">${icon('shop', { size: 24 })}<span class="lb"><b>별가루 상점 · 보물상자</b></span><span class="lr">${icon('arrow-right')}</span></button>
      <button class="ledger-row" id="album">${icon('album', { size: 24 })}<span class="lb"><b>앨범 · ${icon('gift')} 선물</b></span><span class="lr">${icon('arrow-right')}</span></button>
      <button class="ledger-row" id="plaza">${icon('globe', { size: 24 })}<span class="lb"><b>광장</b></span><span class="lr">${icon('arrow-right')}</span></button>
    </div>
    <div class="stats" style="grid-template-columns:repeat(3,1fr)">${stat(s.bestCombo || 0, 'flame', '최고 콤보')}${stat(s.giftsSent || 0, 'gift', '보낸 선물')}${stat(s.giftsGot || 0, 'gift', '받은 선물')}</div>
    <h3>${icon('lens')} 렌즈 스킬 <small class="mono">${SKILLS.filter(k => ownsSkill(k.id)).length}/${SKILLS.length}</small></h3>
    <div class="chips left">${SKILLS.map(k => `<span class="pill ${ownsSkill(k.id) ? 'on' : ''}">${icon(SKILL_ICON[k.id] ?? 'lens')} ${esc(k.name)}${ownsSkill(k.id) ? '' : ` ${icon('lock', { size: 12 })}Lv${k.unlockLevel}`}</span>`).join('')}</div>
    <h3>${icon('ar')} 제스처 표</h3>
    <div class="gest-table">${GESTURE_MAP.map(g => `<div><span>${icon(ACTION_ICON[g.action] ?? 'circle', { size: 22 })}</span><small>${esc(g.label)}</small></div>`).join('')}${FACE_MAP.map(f => `<div><span>${icon(ACTION_ICON[f.action] ?? 'circle', { size: 22 })}</span><small>${esc(f.label)}</small></div>`).join('')}</div>
    <h3>${icon('medal')} 업적 <small class="mono">${state.achievements.length}/${ACHIEVEMENTS.length}</small></h3>
    <div class="ach-grid">${ACHIEVEMENTS.map((a, i) => { const on = state.achievements.includes(a.id); return `<div class="ach stagger ${on ? 'on' : ''}" style="--i:${i}" title="${esc(a.desc)}"><span>${icon(a.icon, { size: 26 })}</span><b>${esc(a.title)}</b><small>${esc(a.desc)}</small></div>`; }).join('')}</div>
    <h3 id="settings">${icon('gear')} 설정</h3>
    <div class="settings ledger">
      ${settings.map(([k, t, d]) => `<label class="setting ledger-row"><div><b>${icon(SETTING_ICON[k] ?? 'circle')} ${t}</b><small>${d}</small></div><input type="checkbox" data-k="${k}" ${state.settings[k] ? 'checked' : ''}><i class="sw"></i></label>`).join('')}
      <label class="setting ledger-row"><div><b>${icon('quill')} 탐험가 이름</b><small>카드·콜라주·선물 코드에 표시</small></div><input type="text" id="name" maxlength="12" value="${esc(state.name || '')}" placeholder="탐험가" autocomplete="off"/></label>
      <button class="btn ghost sm" id="reset" style="margin-top:8px">도감·기록 초기화</button>
    </div>
    ${tabsHtml('profile')}
  </section>`;
  $('#back').onclick = () => go('title'); bindTabs();
  $$('input[data-k]').forEach(i => i.onchange = () => { state.settings[i.dataset.k] = i.checked; save(); fx.blip(); syncReduceMotion(); });
  $('#reset').onclick = () => { if (confirm('도감·랭크·별가루·업적을 모두 지웁니다. 정말요?')) { resetAll(); syncReduceMotion(); go('title'); } };
  $('#shop').onclick = () => { fx.blip(); go('shop'); }; $('#album').onclick = () => { fx.blip(); go('album'); }; $('#plaza').onclick = () => { fx.blip(); go('collectors'); };
  $('#name').onchange = (e) => { state.name = e.target.value.trim(); save(); fx.blip(); };
  if (openSettings) setTimeout(() => $('#settings')?.scrollIntoView({ behavior: 'smooth' }), 50);
});
