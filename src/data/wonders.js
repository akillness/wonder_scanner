// 80 COCO-SSD 클래스 → 원더(Wonder) 매핑
// rarity: 1 일반 / 2 희귀 / 3 영웅 / 4 전설
// chapter: desk | kitchen | home | street | living | play
export const WONDERS = {
  // ── 책상 위의 우주 (desk)
  'laptop':        { emoji:'💻', rarity:1, chapter:'desk',    name:'휴대용 사고 증폭기',      lore:'덮개를 열면 주인의 생각이 100배 빠르게 흐른다고 알려져 있다.' },
  'keyboard':      { emoji:'⌨️', rarity:1, chapter:'desk',    name:'104개의 주문 버튼',       lore:'각 버튼은 서로 다른 작은 마법을 부른다. 가장 강한 주문은 Ctrl+Z.' },
  'mouse':         { emoji:'🖱️', rarity:1, chapter:'desk',    name:'외눈 길잡이 생물',        lore:'평면 세계를 누비는 안내자. 뒤집으면 깊은 잠에 빠진다.' },
  'cell phone':    { emoji:'📱', rarity:1, chapter:'desk',    name:'주머니 속 원격 창문',     lore:'전 세계 어디로든 열리는 창. 다만 배터리라는 통행세를 요구한다.' },
  'book':          { emoji:'📖', rarity:1, chapter:'desk',    name:'접힌 시간의 다발',        lore:'누군가의 몇 년이 종이 사이에 압축돼 있다. 펼치면 천천히 풀린다.' },
  'cup':           { emoji:'☕', rarity:1, chapter:'desk',    name:'은하계 연료 탱크',        lore:'먼 은하의 여행자들이 아침마다 연료를 채우는 성스러운 용기.' },
  'tv':            { emoji:'📺', rarity:1, chapter:'desk',    name:'거실의 최면 사각형',      lore:'바라보는 자의 시간을 조용히 삼킨다. 리모컨이 유일한 해독제.' },
  'remote':        { emoji:'🎛️', rarity:1, chapter:'desk',    name:'소파 위 권력의 지팡이',   lore:'이것을 든 자가 저녁의 운명을 결정한다. 자주 실종되는 것이 특징.' },
  'clock':         { emoji:'🕰️', rarity:2, chapter:'desk',    name:'시간을 세는 둥근 파수꾼', lore:'하루 두 번만 완벽히 정확하다는 소문이 있지만 아무도 확인하지 않았다.' },
  'scissors':      { emoji:'✂️', rarity:2, chapter:'desk',    name:'쌍날 분리 의식 도구',     lore:'하나였던 것을 둘로 만드는 고대의 기술. 종이가 가장 두려워하는 존재.' },

  // ── 부엌의 연금술 (kitchen)
  'bottle':        { emoji:'🍶', rarity:1, chapter:'kitchen', name:'투명 액체 봉인구',        lore:'안에 든 것이 무엇이든, 뚜껑을 여는 순간 소리로 정체를 알린다.' },
  'bowl':          { emoji:'🥣', rarity:1, chapter:'kitchen', name:'중력 우물',               lore:'모든 것이 중앙으로 모인다. 국물이 가장 먼저 항복한다.' },
  'spoon':         { emoji:'🥄', rarity:1, chapter:'kitchen', name:'액체 운반 삽',            lore:'세상에서 가장 작은 삽. 그러나 국물을 옮기는 데는 이보다 나은 것이 없다.' },
  'fork':          { emoji:'🍴', rarity:1, chapter:'kitchen', name:'네 갈래 포획 창',         lore:'미끄러운 면발을 사냥하기 위해 발명된 소형 삼지창의 후손.' },
  'knife':         { emoji:'🔪', rarity:1, chapter:'kitchen', name:'경계 확정자',             lore:'이쪽과 저쪽을 구분한다. 부엌에서 가장 존중받아야 할 원더.' },
  'sink':          { emoji:'🚰', rarity:1, chapter:'kitchen', name:'소용돌이 제단',           lore:'모든 것이 결국 여기로 돌아온다. 설거지는 일종의 순례다.' },
  'refrigerator':  { emoji:'🧊', rarity:1, chapter:'kitchen', name:'시간 정지 금고',          lore:'문을 닫으면 안의 시간이 느려진다. 다만 뒤편의 반찬은 예외.' },
  'wine glass':    { emoji:'🍷', rarity:2, chapter:'kitchen', name:'외줄 위의 물방울 왕관',   lore:'가장 우아하고 가장 잘 깨지는 원더. 건배 소리는 사실 비명이다.' },
  'banana':        { emoji:'🍌', rarity:2, chapter:'kitchen', name:'노란 달의 조각',          lore:'하늘에서 떨어진 초승달이 껍질을 얻었다는 전설이 있다.' },
  'apple':         { emoji:'🍎', rarity:2, chapter:'kitchen', name:'중력의 첫 증인',          lore:'수백 년 전 어느 머리 위로 떨어진 그 사건 이후 명성을 얻었다.' },
  'orange':        { emoji:'🍊', rarity:2, chapter:'kitchen', name:'조각난 태양',             lore:'껍질을 벗기면 안에 작은 태양 조각들이 나란히 들어 있다.' },
  'sandwich':      { emoji:'🥪', rarity:2, chapter:'kitchen', name:'층상 문명 유적',          lore:'각 층이 하나의 시대다. 고고학자들은 토마토 층을 가장 좋아한다.' },
  'broccoli':      { emoji:'🥦', rarity:2, chapter:'kitchen', name:'미니어처 숲',             lore:'거인의 접시 위 숲. 어린이 탐험가들이 가장 피하는 지역.' },
  'carrot':        { emoji:'🥕', rarity:2, chapter:'kitchen', name:'땅속 주황 로켓',          lore:'하늘로 쏘아 올리려다 방향을 잘못 잡아 땅으로 자란 것이다.' },
  'microwave':     { emoji:'📻', rarity:2, chapter:'kitchen', name:'회전 가열 극장',          lore:'문 안의 무대가 돌며 음식이 뜨거운 공연을 펼친다. 삐 소리는 커튼콜.' },
  'oven':          { emoji:'🔥', rarity:2, chapter:'kitchen', name:'철제 용의 배',            lore:'집 안에 사는 용이 유일하게 허락한 서비스: 빵 굽기.' },
  'hot dog':       { emoji:'🌭', rarity:3, chapter:'kitchen', name:'빵 이불 속 소시지 여행자', lore:'따뜻한 빵 이불에 싸여 세계를 여행한다. 케첩은 여권 도장.' },
  'pizza':         { emoji:'🍕', rarity:3, chapter:'kitchen', name:'8분할 원반 유물',         lore:'완전한 원을 8명이 나눌 수 있게 설계된 평화의 상징.' },
  'donut':         { emoji:'🍩', rarity:3, chapter:'kitchen', name:'구멍 뚫린 달콤 포탈',     lore:'가운데 구멍을 통해 보이는 세계는 항상 조금 더 달콤하다.' },
  'cake':          { emoji:'🎂', rarity:3, chapter:'kitchen', name:'축하 에너지 결정체',      lore:'모인 사람들의 축하가 응축된 형태. 촛불은 압력 밸브.' },
  'toaster':       { emoji:'🍞', rarity:3, chapter:'kitchen', name:'빵 발사대',               lore:'아침마다 빵을 튕겨 올리는 소형 사출기. 타이밍이 생명.' },

  // ── 일상의 유물 (home)
  'chair':         { emoji:'🪑', rarity:1, chapter:'home',    name:'다리 넷 달린 휴식 제단',  lore:'앉는 순간 시간이 조금 느려진다. 일어나기 어려운 이유.' },
  'couch':         { emoji:'🛋️', rarity:1, chapter:'home',    name:'집 안의 늪',              lore:'한 번 빠지면 두 시간은 나올 수 없다. 리모컨과 공생 관계.' },
  'bed':           { emoji:'🛏️', rarity:1, chapter:'home',    name:'꿈 세계로의 정박지',      lore:'매일 밤 여기서 출항해 아침에 돌아온다. 항해 기록은 대부분 잊혀진다.' },
  'dining table':  { emoji:'🍽️', rarity:1, chapter:'home',    name:'가족 회의 평원',          lore:'이 위에서 수많은 조약과 다툼이 오갔다. 대부분 밥으로 해결됐다.' },
  'potted plant':  { emoji:'🪴', rarity:1, chapter:'home',    name:'화분에 갇힌 작은 정글',   lore:'작은 흙 감옥 안에서 조용히 숲을 꿈꾸고 있다.' },
  'backpack':      { emoji:'🎒', rarity:1, chapter:'home',    name:'등에 메는 차원 주머니',   lore:'넣은 것을 기억하는 사람은 없다. 바닥에는 늘 알 수 없는 영수증이 산다.' },
  'handbag':       { emoji:'👜', rarity:1, chapter:'home',    name:'휴대용 비밀 창고',        lore:'외부에서 보는 크기와 내부 용량이 물리 법칙을 어긴다.' },
  'toilet':        { emoji:'🚽', rarity:2, chapter:'home',    name:'백색 사색의 왕좌',        lore:'수많은 위대한 생각이 여기서 태어났다. 물 내림은 세례.' },
  'toothbrush':    { emoji:'🪥', rarity:2, chapter:'home',    name:'구강 결계 정비 도구',     lore:'하루 두 번 동굴을 청소하는 소형 빗자루. 3개월마다 은퇴한다.' },
  'vase':          { emoji:'🏺', rarity:2, chapter:'home',    name:'꽃을 위한 임시 거처',     lore:'꽃이 없을 땐 그저 예쁜 빈 집. 그래도 존재만으로 방을 바꾼다.' },
  'umbrella':      { emoji:'☂️', rarity:2, chapter:'home',    name:'휴대용 개인 하늘',        lore:'펼치면 머리 위에 작은 마른 하늘이 생긴다. 바람에 약하다.' },
  'tie':           { emoji:'👔', rarity:2, chapter:'home',    name:'목에 두르는 진지함 부여기', lore:'착용자의 진지함을 30% 올리지만 목 자유도는 50% 내린다.' },
  'suitcase':      { emoji:'🧳', rarity:2, chapter:'home',    name:'바퀴 달린 임시 인생',     lore:'며칠간의 삶을 담아 끌고 다닌다. 공항에서 종종 다른 세계로 사라진다.' },
  'teddy bear':    { emoji:'🧸', rarity:3, chapter:'home',    name:'밤의 수호 곰',            lore:'어린 탐험가의 첫 파트너. 낮엔 조용하지만 밤엔 악몽을 막는다.' },
  'hair drier':    { emoji:'💨', rarity:3, chapter:'home',    name:'휴대용 열풍 폭풍기',      lore:'손바닥 크기의 사막 바람. 젖은 머리의 천적.' },

  // ── 거리의 거인들 (street)
  'car':           { emoji:'🚗', rarity:1, chapter:'street',  name:'바퀴 넷 달린 개인 방',    lore:'사람들은 이 작은 방에 갇혀 매일 같은 길을 왕복한다.' },
  'bicycle':       { emoji:'🚲', rarity:2, chapter:'street',  name:'두 바퀴 균형 마법기',     lore:'멈추면 넘어지지만 달리면 서 있다. 물리 법칙이 눈감아주는 원더.' },
  'motorcycle':    { emoji:'🏍️', rarity:2, chapter:'street',  name:'울부짖는 두 바퀴 야수',   lore:'심장 박동이 배기음으로 들린다. 새벽에 특히 잘 울부짖는다.' },
  'bus':           { emoji:'🚌', rarity:2, chapter:'street',  name:'움직이는 공동 거실',      lore:'낯선 이들이 잠시 이웃이 되는 곳. 다음 정거장에서 헤어진다.' },
  'truck':         { emoji:'🚚', rarity:2, chapter:'street',  name:'도로 위 물류 거인',       lore:'도시의 위장이 소화하지 못한 것들을 대신 옮긴다.' },
  'bench':         { emoji:'🪑', rarity:2, chapter:'street',  name:'공공 멈춤 장치',          lore:'거리 위에 앉을 이유를 만들어 준다. 비둘기와 소유권 다툼 중.' },
  'traffic light': { emoji:'🚦', rarity:2, chapter:'street',  name:'삼색 도로 지휘자',        lore:'말 한마디 없이 온 도시의 움직임을 지휘한다. 노란빛은 그의 망설임.' },
  'fire hydrant':  { emoji:'🧯', rarity:3, chapter:'street',  name:'도로변 물의 봉인탑',      lore:'평범한 척하지만 안에는 강이 갇혀 있다. 강아지들이 존경한다.' },
  'stop sign':     { emoji:'🛑', rarity:3, chapter:'street',  name:'팔각 정지 부적',          lore:'여덟 개의 각이 지나가는 모든 것을 잠시 멈춘다. 붉은색은 경고가 아닌 존중.' },
  'parking meter': { emoji:'🅿️', rarity:3, chapter:'street',  name:'주차 시간 징수 기둥',     lore:'멈춰 있는 시간에 요금을 매기는 유일한 원더. 도시의 세금 요정.' },
  'train':         { emoji:'🚆', rarity:3, chapter:'street',  name:'철길 위 강철 뱀',         lore:'정해진 길만 따라가지만 그래서 항상 목적지에 닿는다.' },
  'boat':          { emoji:'⛵', rarity:3, chapter:'street',  name:'물 위 부유 집',           lore:'가라앉는 것이 당연한 세계에서 떠 있기를 택한 반란자.' },
  'airplane':      { emoji:'✈️', rarity:4, chapter:'street',  name:'구름 위 강철 새',         lore:'수백 명을 품고 하늘을 나는 거대한 금속 새. 원더 중에서도 가장 믿기 어려운 존재.' },

  // ── 살아있는 신비 (living)
  'person':        { emoji:'🧍', rarity:1, chapter:'living',  name:'두 발로 걷는 질문 생성기', lore:'끊임없이 "왜?"를 만들어 내는 생명체. 원더를 발견하는 유일한 종.' },
  'dog':           { emoji:'🐕', rarity:2, chapter:'living',  name:'꼬리 달린 충성 엔진',     lore:'행복을 꼬리 흔들기로 변환한다. 변환 효율 100%.' },
  'cat':           { emoji:'🐈', rarity:2, chapter:'living',  name:'액체 상태의 군주',        lore:'상자에 맞춰 형태가 변한다. 인간을 하급 집사로 고용 중.' },
  'bird':          { emoji:'🐦', rarity:3, chapter:'living',  name:'깃털 달린 하늘 조각',     lore:'하늘의 일부가 떨어져 나와 노래를 배웠다.' },
  'horse':         { emoji:'🐎', rarity:3, chapter:'living',  name:'네 발 바람 탑승체',       lore:'자동차 이전의 자동차. 마력(馬力)이라는 단위의 원본.' },
  'sheep':         { emoji:'🐑', rarity:4, chapter:'living',  name:'걸어다니는 구름',         lore:'하늘에서 내려온 구름이 네 다리를 얻어 풀을 뜯는다.' },
  'cow':           { emoji:'🐄', rarity:4, chapter:'living',  name:'얼룩무늬 우유 공장',      lore:'풀을 우유로 바꾸는 살아 있는 연금술 시설.' },
  'elephant':      { emoji:'🐘', rarity:4, chapter:'living',  name:'기억하는 회색 산',        lore:'모든 것을 기억하는 걷는 산. 코는 다섯 번째 손.' },
  'bear':          { emoji:'🐻', rarity:4, chapter:'living',  name:'숲의 겨울잠 수호자',      lore:'반년을 잠으로 보내며 숲의 시간을 지킨다. 꿀은 그의 봉급.' },
  'zebra':         { emoji:'🦓', rarity:4, chapter:'living',  name:'바코드 무늬 초원 주자',   lore:'검은 말인지 흰 말인지 아직 학계가 결론을 내리지 못했다.' },
  'giraffe':       { emoji:'🦒', rarity:4, chapter:'living',  name:'구름 맛보는 긴 목 탑',    lore:'가장 먼저 비를 알고 가장 늦게 소문을 듣는다.' },

  // ── 놀이의 파편 (play)
  'sports ball':   { emoji:'⚽', rarity:2, chapter:'play',    name:'구르는 갈등 해결기',      lore:'이것 하나로 22명이 90분간 평화롭게 싸운다.' },
  'frisbee':       { emoji:'🥏', rarity:3, chapter:'play',    name:'비행 원반 유물',          lore:'던진 사람과 받는 사람 사이의 신뢰가 궤도를 결정한다.' },
  'kite':          { emoji:'🪁', rarity:3, chapter:'play',    name:'실에 묶인 작은 하늘 배',  lore:'바람을 타고 오르지만 사람의 손을 놓지 않는다.' },
  'baseball bat':  { emoji:'🏏', rarity:3, chapter:'play',    name:'원통형 궤도 변경기',      lore:'날아오는 것의 운명을 한 방에 바꾼다.' },
  'baseball glove':{ emoji:'🧤', rarity:3, chapter:'play',    name:'가죽 포획 손',            lore:'날아오는 공을 유일하게 반갑게 맞이하는 손.' },
  'skateboard':    { emoji:'🛹', rarity:3, chapter:'play',    name:'바퀴 달린 중력 도전판',   lore:'넘어질 것을 알면서도 다시 올라서게 만드는 판자.' },
  'tennis racket': { emoji:'🎾', rarity:3, chapter:'play',    name:'그물 달린 반사 지팡이',   lore:'공을 되돌려 보내는 마법의 채. 소리로 실력을 판별한다.' },
  'skis':          { emoji:'🎿', rarity:4, chapter:'play',    name:'눈 위 쌍둥이 활주판',     lore:'두 줄로 산을 내려오는 겨울 한정 원더.' },
  'snowboard':     { emoji:'🏂', rarity:4, chapter:'play',    name:'눈 파도 서핑판',          lore:'얼어붙은 파도 위를 타는 자들의 판자.' },
  'surfboard':     { emoji:'🏄', rarity:4, chapter:'play',    name:'바다와 협상하는 판',      lore:'파도와 잠시 동맹을 맺게 해 주는 유일한 도구.' },
};

// 희귀도 잉크 (DESIGN.md 2.4): stars 는 딩뱃 ✦ (이모지 아님), sigils 는 시길 개수, glow 알파 ≤ .35
export const RARITY = {
  1: { key:'common',    label:'일반', stars:'✦'.repeat(1), sigils:1, color:'#9FA8B4', glow:'rgba(159,168,180,.3)' },
  2: { key:'rare',      label:'희귀', stars:'✦'.repeat(2), sigils:2, color:'#6DB5A0', glow:'rgba(109,181,160,.3)' },
  3: { key:'epic',      label:'영웅', stars:'✦'.repeat(3), sigils:3, color:'#A493D9', glow:'rgba(164,147,217,.3)' },
  4: { key:'legendary', label:'전설', stars:'✦'.repeat(4), sigils:4, color:'#E2B45A', glow:'rgba(226,180,90,.35)' },
};

export const ALL_LABELS = Object.keys(WONDERS);
