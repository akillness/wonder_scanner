// 안내 AI '루페(Lupe)'의 대사
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const LUPE = {
  intro: [
    '안녕, 탐험가. 나는 이 렌즈에 사는 루페야.',
    '세상은 원더로 가득한데, 사람들은 그냥 "컵"이라고 불러.',
    '카메라를 물건에 대고 가만히 있어 봐. 공명이 차오르면 진짜 모습이 보일 거야.',
  ],
  scanning: ['좋아, 그대로… 움직이지 마.', '공명이 느껴져. 조금만 더.', '뭔가 있어. 렌즈를 고정해.'],
  lost: ['놓쳤어. 다시 비춰 봐.', '흔들렸어. 천천히.'],
  newByRarity: {
    1: ['첫 발견이야! 흔하다고 시시한 건 아니지.', '도감에 새 페이지가 열렸어.'],
    2: ['오, 희귀한 원더야. 잘 찾았어.', '이건 쉽게 보이지 않는 종류인데!'],
    3: ['영웅급이야!! 렌즈가 떨리는 거 느껴져?', '와… 이 등급은 나도 오래 못 봤어.'],
    4: ['전설… 전설이야. 이건 기록에 남겨야 해.', '믿을 수 없어. 오늘은 특별한 날이야.'],
  },
  duplicate: ['다시 만났네. 별가루로 돌려줄게.', '이미 아는 친구야. 그래도 반가워.'],
  variant: ['잠깐… 색이 달라. 프리즘 변이체야!!', '이건 확률적으로 거의 불가능한데… 변이체!'],
  cooldown: ['같은 원더는 잠시 쉬게 해 주자.', '방금 만났잖아. 다른 걸 찾아볼까?'],
  rankUp: (title) => `랭크 업! 이제 당신은 「${title}」.`,
  allComplete: '…80개 전부. 당신은 이제 나보다 세상을 잘 봐. 고마워, 탐험가.',
};

export const say = {
  intro: () => LUPE.intro,
  scanning: () => pick(LUPE.scanning),
  lost: () => pick(LUPE.lost),
  discover: (r) => r.isVariant ? pick(LUPE.variant) : r.isNew ? pick(LUPE.newByRarity[r.wonder.rarity]) : pick(LUPE.duplicate),
  cooldown: () => pick(LUPE.cooldown),
};
