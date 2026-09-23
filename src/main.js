import './styles.css';
import './ui/v7.css';
import { go, toast, icon, syncReduceMotion } from './ui/shell.js';
import './ui/screens/title.js';
import './ui/screens/scan.js';
import './ui/screens/reveal.js';
import './ui/screens/codex.js';
import './ui/screens/meta.js';
import './ui/screens/album.js';
import './ui/screens/shop.js';
import './ui/screens/collectors.js';
import './ui/screens/duel.js';
import './ui/screens/spots.js';
import { warmModel } from './ui/screens/scan.js';
import { state, touchStreak } from './game/state.js';
import { ensureDailyQuests } from './game/quests.js';
import { bindRarity, checkAchievements } from './game/achievements.js';
import { WONDERS, RARITY } from './data/wonders.js';
import { streakMultiplier } from './game/balance.js';
import { refreshSpots, cachedGeo } from './game/spots.js';
import { initI18n } from './i18n/index.js';

bindRarity(l => WONDERS[l]?.rarity ?? 0);
const st = touchStreak();
ensureDailyQuests();
checkAchievements();
syncReduceMotion();
// 한/영 (v8.4): 영어면 사전을 받고 번역 계층을 건 뒤에 첫 화면을 그린다 (한국어면 즉시 통과)
await initI18n();
go('title');
warmModel();
if (st.extended && st.days >= 2) setTimeout(() => toast(`${icon('flame')} ${st.days}일 연속 출석! 오늘 XP ×${streakMultiplier(st.days).toFixed(1)}`, 3500), 600);
// QA 훅: ?debug 시 상태·라우터·데이터 테이블 노출
if (location.search.includes('debug')) window.__ws = { state, go, WONDERS, RARITY };
// 위치 기반 추천 (GAMEPLAY_V7 §7.1): settings.location 이 켜져 있을 때만 타이틀 진입 시 자동 새로고침 (1시간 캐시, 백그라운드, 실패해도 조용히)
if (state.settings?.location && !cachedGeo()) setTimeout(() => { refreshSpots().catch(() => {}); }, 1500);

// ── 모바일 견고성
document.body.insertAdjacentHTML('beforeend', '<div class="rotate-plate" aria-live="polite"><div><b>세로로 돌려 주세요</b><small>Wonder Scanner는 세로 화면용 게임이에요</small></div></div>');
window.addEventListener('ws:save-failed', () => toast(`${icon('warn')} 이 브라우저(개인 모드 등)에서는 진행이 저장되지 않아요`, 4500));
document.addEventListener('gesturestart', e => e.preventDefault()); // iOS 핀치 확대 방지
let lastTouchEnd = 0; document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastTouchEnd < 300 && !e.target.closest('input,textarea,select,canvas')) e.preventDefault(); lastTouchEnd = n; }, { passive: false });
