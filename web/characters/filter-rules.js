// 선장 효과 필터의 화면 구조와 데이터 매칭 규칙을 한곳에서 관리합니다.
// 새 필터를 추가할 때는 아래 captainFilterGroups와 captainFilterRules에 같은 id를 추가하면 됩니다.
export const captainFilterGroups = [
  {
    id: "damage",
    label: "데미지",
    filters: [
      {
        id: "turnEndDamage",
        label: "턴 종료 시 데미지 부여",
        detailGroups: [
          {
            id: "damageBasis",
            label: "데미지 기준",
            options: [
              ["characterAttack", "캐릭터 공격력"], ["totalDamage", "총 데미지"], ["overHeal", "초과 회복량"],
              ["receivedDamage", "받은 데미지"], ["hpConsumed", "체력 소모량"],
            ],
          },
          {
            id: "damageType",
            label: "데미지 형태",
            options: [
              ["attributeDamage", "속성 데미지"], ["nonAttributeDamage", "무속성 데미지"], ["fixedDamage", "고정 데미지"],
              ["actualDamage", "실제 데미지"], ["ignoreNormalAttack", "일반 공격 외 데미지 무시"],
            ],
          },
          {
            id: "damageTarget",
            label: "대상",
            options: [["oneEnemy", "적 1명"], ["allEnemies", "모든 적"], ["randomEnemy", "랜덤 적"]],
          },
        ],
      },
    ],
  },
];

// 상위 필터: 해당 선장 효과가 존재하는지 판단하는 문장 규칙입니다.
const captainFilterRules = {
  turnEndDamage: [
    /받은데미지의[\d.]+배를?턴종료시/,
    /턴종료시.{0,180}(?:추가|고정).{0,35}데미지/,
    /턴종료시.{0,180}데미지(?:를)?(?:준|주|돌려|부여)/,
    /턴종료시.{0,180}적.{0,60}(?:HP|체력).{0,30}(?:감소|줄|깎)/,
  ],
};

// 세부 필터: 버튼 id와 실제 효과 문구를 연결합니다.
const captainDetailRules = {
  characterAttack: /(?:캐릭터의)?공격력(?:의|을기준으로|에따라)/,
  totalDamage: /(?:총|입힌|받은)데미지/,
  overHeal: /초과회복(?:량)?/,
  receivedDamage: /받은데미지(?:의|를)/,
  hpConsumed: /(?:소모한|감소한|잃은)체력|체력(?:소모|감소)량/,
  attributeDamage: /속성(?:데미지|상성)/,
  nonAttributeDamage: /무속성(?:데미지)?/,
  fixedDamage: /고정데미지/,
  actualDamage: /실제데미지/,
  ignoreNormalAttack: /일반공격외(?:의)?데미지(?:를)?무시/,
  oneEnemy: /적(?:1명|한명|하나)/,
  allEnemies: /적전체|모든적/,
  randomEnemy: /랜덤(?:한)?적/,
};

// 효과 데이터는 문자열·배열·객체 어느 형태여도 같은 방식으로 비교합니다.
function collectEffectTexts(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectEffectTexts);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectEffectTexts);
  return [];
}

function detailGroupFor(optionId) {
  for (const category of captainFilterGroups) {
    for (const filter of category.filters) {
      for (const group of filter.detailGroups ?? []) {
        if (group.options.some(([id]) => id === optionId)) return group.id;
      }
    }
  }
  return null;
}

// 선택된 상위·세부 조건을 모두 만족하는지 확인합니다. 같은 세부 분류는 OR, 분류끼리는 AND입니다.
export function matchesCaptainFilterSelections(record, selectedFilters, selectedDetails) {
  const activeFilters = [...(selectedFilters ?? [])];
  const activeDetails = [...(selectedDetails ?? [])];
  if (!activeFilters.length && !activeDetails.length) return true;

  const effects = collectEffectTexts(record?.captain)
    .map((text) => text.replace(/<[^>]*>/g, "").replace(/\s+/g, ""));
  const matchesRule = (rule) => effects.some((effect) => rule.test(effect));
  const topMatches = activeFilters.every((id) => (captainFilterRules[id] ?? []).some(matchesRule));
  if (!topMatches) return false;

  const detailsByGroup = new Map();
  activeDetails.forEach((id) => {
    const group = detailGroupFor(id);
    if (!group) return;
    detailsByGroup.set(group, [...(detailsByGroup.get(group) ?? []), id]);
  });
  return [...detailsByGroup.values()].every((ids) => ids.some((id) => matchesRule(captainDetailRules[id])));
}
