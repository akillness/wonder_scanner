// 세계관 레지스트리: 같은 80개 COCO 라벨에 다른 이름·설정·챕터·안내자를 씌우면 새 세계가 된다.
// 새 세계 추가: worlds/<id>.js 에서 { id, name, tagline, wonders, chapters, guide } 를 export 하고 여기 등록.
import { WONDERS, RARITY } from '../wonders.js';
import { CHAPTERS } from '../chapters.js';
import { LUPE } from '../../game/narrative.js';

export const WORLDS = {
  prime: { id: 'prime', name: '원더 프라임', tagline: '세상은 원더로 가득하다. 당신은 그냥 "컵"이라 부른다.', wonders: WONDERS, chapters: CHAPTERS, guide: { name: 'LUPE', img: '/img/lupe.svg', lines: LUPE }, rarity: RARITY, unlocked: true },
  // 예: nocturne: { id:'nocturne', name:'야상곡 세계', tagline:'밤이 되면 물건들은 다른 이름을 쓴다', wonders: NOCTURNE_WONDERS, chapters: NOCTURNE_CHAPTERS, guide: {...}, unlocked: false, unlockRule: '프라임 챕터 3개 완성' }
};
export const worldIds = () => Object.keys(WORLDS);
export const getWorld = (id = 'prime') => WORLDS[id] ?? WORLDS.prime;
