import { WONDERS } from './wonders.js';

// icon = 챕터 엠블럼 아이콘 이름 (src/ui/icons.js `ch-<id>`), 파일은 public/img/ch/<id>.svg
export const CHAPTERS = [
  { id:'desk',    order:1, icon:'ch-desk', title:'책상 위의 우주',   hint:'책상 주변을 둘러보세요',
    story:'루페: "책상은 가장 작은 우주예요. 당신은 매일 이 행성들 사이에 앉아 있었죠. 이제 그들의 이름을 알게 되었네요."' },
  { id:'kitchen', order:2, icon:'ch-kitchen', title:'부엌의 연금술',    hint:'냉장고와 식탁 주변',
    story:'루페: "부엌의 연금술사들은 매일 재료를 기억으로 바꿔요. 당신이 모은 원더들은 그 실험 도구였어요."' },
  { id:'home',    order:3, icon:'ch-home', title:'일상의 유물',      hint:'거실, 침실, 현관, 욕실',
    story:'루페: "유물은 오래된 것이 아니라, 오래 곁에 있던 것이에요. 이 방의 모든 것이 당신의 유물이었네요."' },
  { id:'street',  order:4, icon:'ch-street', title:'거리의 거인들',    hint:'밖으로 나가 보세요',
    story:'루페: "거인들은 늘 거기 있었어요. 너무 커서 아무도 원더라고 부르지 않았을 뿐. 당신은 올려다봤죠."' },
  { id:'living',  order:5, icon:'ch-living', title:'살아있는 신비',    hint:'사람, 반려동물, 그리고 더 먼 곳',
    story:'루페: "살아 있는 것들은 렌즈 없이도 원더를 봐요. 특히 개는요. 당신도 이제 조금은 그렇게 보고 있어요."' },
  { id:'play',    order:6, icon:'ch-play', title:'놀이의 파편',      hint:'공원, 운동장, 바다와 산',
    story:'루페: "놀이는 세상을 잠시 다르게 쓰는 방법이에요. 이 도감을 채운 당신이 지금 한 일도 그거였고요."' },
];

export function chapterLabels(chapterId) {
  return Object.entries(WONDERS).filter(([, w]) => w.chapter === chapterId).map(([label]) => label);
}
