// festival.js의 해적제 데이터를 상세 창에서 읽기 쉬운 항목으로 분류합니다.
const battleStyleLabels = {
  ATK: "공격형",
  DEF: "방어형",
  HEAL: "회복형",
  SUPPORT: "지원형",
  DEBUFF: "방해형",
  BALANCE: "균형형",
  UNKNOWN: "미분류",
};

const hasValue = (value) => {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.some(hasValue);
  return true;
};

// 데이터의 장식 태그를 제거해 모든 해적제 설명을 같은 방식으로 표시합니다.
function cleanText(value) {
  return String(value).replace(/<[^>]*>/g, "").trim();
}

function makeText(value) {
  const text = document.createElement("p");
  text.className = "festival-text";
  text.textContent = cleanText(value);
  return text;
}

function makeAccordion(title, content) {
  const details = document.createElement("details");
  details.className = "festival-item";
  const summary = document.createElement("summary");
  summary.textContent = title;
  const body = document.createElement("div");
  body.className = "festival-item-content";
  body.append(content);
  details.append(summary, body);
  return details;
}

// 레벨별 문자열 배열을 Lv. 번호와 함께 표시합니다.
function makeLevelList(values) {
  const list = document.createElement("div");
  list.className = "festival-level-list";
  values.filter(hasValue).forEach((value, index) => {
    const item = document.createElement("div");
    item.className = "festival-level-item";
    const level = document.createElement("strong");
    level.textContent = `Lv.${index + 1}`;
    item.append(level, makeText(value));
    list.append(item);
  });
  return list;
}

// 액티브 스킬은 레벨별 효과와 충전 시간을 한 카드에 묶습니다.
function makeSpecialList(values) {
  const list = document.createElement("div");
  list.className = "festival-level-list";
  values.filter(hasValue).forEach((value, index) => {
    const item = document.createElement("div");
    item.className = "festival-level-item";
    const heading = document.createElement("div");
    heading.className = "festival-level-heading";
    const level = document.createElement("strong");
    level.textContent = `Lv.${index + 1}`;
    heading.append(level);
    if (hasValue(value.cooldown)) {
      const cooldown = document.createElement("span");
      cooldown.textContent = `충전 ${value.cooldown}`;
      heading.append(cooldown);
    }
    item.append(heading);
    if (hasValue(value.description)) item.append(makeText(value.description));
    list.append(item);
  });
  return list;
}

// GP 리더 효과·버스트·사용 횟수를 레벨별로 정리합니다.
function makeGrandPartyList(values) {
  const list = document.createElement("div");
  list.className = "festival-level-list";
  values.filter(hasValue).forEach((value, index) => {
    const item = document.createElement("div");
    item.className = "festival-level-item";
    const level = document.createElement("strong");
    level.textContent = `Lv.${index + 1}`;
    item.append(level);
    [
      ["GP 리더 효과", value.festGPAbility],
      ["GP 버스트", value.festGPSpecial],
      ["사용 가능 횟수", hasValue(value.uses) ? `${value.uses}회` : null],
    ].filter(([, content]) => hasValue(content)).forEach(([label, content]) => {
      const property = document.createElement("div");
      property.className = "festival-property";
      const title = document.createElement("span");
      title.textContent = label;
      property.append(title, makeText(content));
      item.append(property);
    });
    list.append(item);
  });
  return list;
}

function makeStats(stats, attackTarget, attackPattern) {
  const list = document.createElement("dl");
  list.className = "festival-stat-grid";
  [
    ["속도", stats?.spd],
    ["방어력", stats?.def],
    ["전투 스타일", stats?.style && (battleStyleLabels[stats.style] ?? stats.style)],
    ["공격 대상", attackTarget],
    ["공격 패턴", Array.isArray(attackPattern) ? attackPattern.join(" · ") : attackPattern],
  ].filter(([, value]) => hasValue(value)).forEach(([label, value]) => {
    const item = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    item.append(term, description);
    list.append(item);
  });
  return list;
}

// 해적제 슈퍼 필살기는 기본·레벨 상한돌파별 발동 조건과 효과를 한 카드에 묶습니다.
function makeSuperSpecial(value) {
  const list = document.createElement("div");
  list.className = "festival-level-list";
  // 새 데이터는 base·llbbase 안에 효과를 저장하고, 이전 형식은 바로 condition·description을 가집니다.
  const variants = hasValue(value.condition) || hasValue(value.description)
    ? [["기본", value]]
    : [["기본", value.base], ["레벨 상한돌파", value.llbbase]];

  variants.filter(([, effect]) => hasValue(effect)).forEach(([titleText, effect]) => {
    const item = document.createElement("div");
    item.className = "festival-level-item";
    const title = document.createElement("strong");
    title.textContent = titleText;
    item.append(title);
    [["발동 조건", effect.condition], ["효과", effect.description]]
      .filter(([, content]) => hasValue(content))
      .forEach(([label, content]) => {
      const property = document.createElement("div");
      property.className = "festival-property";
        const labelElement = document.createElement("span");
        labelElement.textContent = label;
        property.append(labelElement, makeText(content));
        item.append(property);
      });
    list.append(item);
  });
  return list;
}

// 해적제 일반 정보와 그랜드 파티 정보를 독립된 탭으로 전환합니다.
function makeFestivalTabs(container, festivalPanel, grandPartyPanel) {
  const tabs = document.createElement("nav");
  tabs.className = "festival-tabs";
  tabs.setAttribute("aria-label", "해적제 정보 구분");
  const festivalTab = document.createElement("button");
  const grandPartyTab = document.createElement("button");
  festivalTab.type = "button";
  grandPartyTab.type = "button";
  festivalTab.textContent = "해적제";
  grandPartyTab.textContent = "그랜드 파티";

  const selectPanel = (panel) => {
    const isFestival = panel === festivalPanel;
    festivalPanel.hidden = !isFestival;
    grandPartyPanel.hidden = isFestival;
    festivalTab.setAttribute("aria-pressed", String(isFestival));
    grandPartyTab.setAttribute("aria-pressed", String(!isFestival));
  };
  festivalTab.addEventListener("click", () => selectPanel(festivalPanel));
  grandPartyTab.addEventListener("click", () => selectPanel(grandPartyPanel));
  tabs.append(festivalTab, grandPartyTab);
  selectPanel(festivalPanel);
  container.append(tabs, festivalPanel, grandPartyPanel);
}

// 선택한 형태 데이터가 없을 때는 기본 캐릭터 번호의 해적제 데이터를 사용합니다.
export function renderFestivalDetails(container, characterId, baseId) {
  const data = window.festivalDetails?.[characterId] ?? window.festivalDetails?.[baseId];
  const section = container.closest(".detail-festival");
  const hasFestivalData = hasValue(data);
  container.replaceChildren();
  container.hidden = !hasFestivalData;
  section.hidden = !hasFestivalData;
  if (!hasFestivalData) return;

  const festivalPanel = document.createElement("div");
  festivalPanel.className = "festival-panel";
  // 기본 능력치와 함께 공격 대상·패턴도 새 데이터 형식에 맞춰 표시합니다.
  if (hasValue(data.festStats) || hasValue(data.festAttackTarget) || hasValue(data.festAttackPattern)) {
    festivalPanel.append(makeStats(data.festStats, data.festAttackTarget, data.festAttackPattern));
  }
  if (hasValue(data.festResistance)) festivalPanel.append(makeAccordion("해적제 내성", makeText(data.festResistance)));
  if (hasValue(data.festAbility)) festivalPanel.append(makeAccordion("적제 능력", makeLevelList(data.festAbility)));
  if (hasValue(data.festSpecial)) festivalPanel.append(makeAccordion("적제 필살기", makeSpecialList(data.festSpecial)));
  if (hasValue(data.festSuperSpecial)) festivalPanel.append(makeAccordion("적제 초필살기", makeSuperSpecial(data.festSuperSpecial)));

  const hasGrandPartyData = hasValue(data.festAbilityGP) || hasValue(data.festAbilityGPCondition);
  if (hasGrandPartyData) {
    const grandParty = document.createElement("div");
    grandParty.className = "festival-panel";
    if (hasValue(data.festAbilityGPCondition)) {
      const condition = document.createElement("div");
      condition.className = "festival-condition";
      const label = document.createElement("strong");
      label.textContent = "GP 버스트 발동 조건";
      condition.append(label, makeText(data.festAbilityGPCondition));
      grandParty.append(condition);
    }
    if (hasValue(data.festAbilityGP)) grandParty.append(makeGrandPartyList(data.festAbilityGP));
    // 일반 해적제 데이터가 함께 있을 때만 두 탭을 표시합니다.
    if (festivalPanel.childElementCount > 0) makeFestivalTabs(container, festivalPanel, grandParty);
    else container.append(grandParty);
  } else {
    container.append(festivalPanel);
  }
}
