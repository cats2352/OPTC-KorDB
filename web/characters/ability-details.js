// details.js의 영문 키를 상세 창에서 사용할 한국어 제목으로 바꿉니다.
const labels = {
  special: "필살기 효과",
  specialName: "필살기 이름",
  captain: "선장 효과",
  sailor: "선원 효과",
  potential: "잠재 능력",
  support: "서포트 효과",
  limit: "한계 돌파",
  lLimit: "레벨 상한돌파",
  swap: "교체 효과",
  base: "기본 효과",
  super: "슈퍼 교체 효과",
  superTurns: "슈퍼 교체 필요 횟수",
  VSCondition: "VS 발동 조건",
  VSSpecial: "VS 필살기 효과",
  superSpecial: "EX 초월 필살기 효과",
  superSpecialCriteria: "EX 초월 발동조건",
  lastTap: "라스트 탭 효과",
  superTandem: "초연계",
  superTandemBoost: "초연계 강화",
  rush: "Rush 효과",
  memberSkills: "멤버 스킬",
  character1: "캐릭터 1",
  character2: "캐릭터 2",
  combined: "합체 상태",
  level1: "레벨 1",
  level2: "레벨 2",
  llbbase: "LLB 기본",
  llblevel1: "LLB 레벨 1",
  base1: "멤버 스킬 1",
  base2: "멤버 스킬 2",
  rAbility: "R 어빌리티 해방",
  rSpecial: "R 필살기 해방",
  rResilience: "R 회복력 해방",
  condition: "발동 조건",
  description: "효과",
  characterCondition: "캐릭터 조건",
  characters: "지원 대상",
  stats: "능력치",
  Name: "능력명",
};

const hasContent = (value) => {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.some(hasContent);
  if (typeof value === "object") return Object.values(value).some(hasContent);
  return true;
};

const characterStateKeys = new Set(["character1", "character2", "combined"]);

// 기본·-1·-2 탭에 맞춰 그 형태만의 효과만 선택합니다.
function getSelectedStateKey(characterId, baseId) {
  const id = String(characterId);
  const base = String(baseId);
  if (id === `${base}-1`) return "character1";
  if (id === `${base}-2`) return "character2";
  return "combined";
}

// 형태 전용 효과가 섞인 객체는 현재 탭에서 볼 수 있는 값이 있는지 먼저 확인합니다.
function hasRenderableContent(value, selectedStateKey) {
  if (!hasContent(value)) return false;
  if (Array.isArray(value)) return value.some((item) => hasRenderableContent(item, selectedStateKey));
  if (typeof value !== "object") return true;

  return Object.entries(value).some(([key, itemValue]) => {
    if (characterStateKeys.has(key)) {
      return key === selectedStateKey && hasRenderableContent(itemValue, selectedStateKey);
    }
    return hasRenderableContent(itemValue, selectedStateKey);
  });
}

// 게임 데이터 안의 색상·아이콘 태그는 제거하고, 읽을 수 있는 문장만 표시합니다.
function cleanText(value) {
  return String(value).replace(/<[^>]*>/g, "").trim();
}

function makeText(value, className = "ability-text") {
  const paragraph = document.createElement("p");
  paragraph.className = className;
  paragraph.textContent = cleanText(value);
  return paragraph;
}

function makeLabel(key) {
  return labels[key] ?? key;
}

// lLimit 데이터는 일반 능력과 뜻이 다르므로, 상한돌파 전용 명칭으로 표시합니다.
function renderLevelLimit(value, selectedStateKey) {
  const list = document.createElement("div");
  list.className = "ability-list";
  const levelLabels = {
    captain: "레벨 상한돌파 기본 선장효과",
    special: "초진화 시 필살기",
  };

  value.forEach((levelData, index) => {
    if (!hasRenderableContent(levelData, selectedStateKey)) return;
    const effects = Object.entries(levelData)
      // rSuperSpecial은 효과 내용이 아닌 초진화 여부를 나타내는 값이라 화면에 표시하지 않습니다.
      .filter(([itemKey, itemValue]) => itemKey !== "rSuperSpecial" && hasRenderableContent(itemValue, selectedStateKey));
    if (!effects.length) return;
    const entry = document.createElement("div");
    entry.className = "ability-list-entry";
    const level = document.createElement("strong");
    level.textContent = `${index + 1}단계`;
    entry.append(level);

    effects.forEach(([itemKey, itemValue]) => {
        const subLabel = document.createElement("span");
        subLabel.className = "ability-sub-label";
        subLabel.textContent = levelLabels[itemKey] ?? `레벨 상한돌파 ${makeLabel(itemKey)}`;
        const effect = itemKey === "captain" || itemKey === "special" ? itemValue.base : itemValue;
        entry.append(subLabel, renderValue(effect, itemKey, selectedStateKey));
      });
    list.append(entry);
  });
  return list;
}

// 상한돌파 배열에서 선장 효과·필살기처럼 기본 효과와 비교할 항목만 꺼냅니다.
function getLevelLimitEffects(value, key, selectedStateKey) {
  if (!Array.isArray(value)) return [];
  return value.reduce((effects, levelData, index) => {
    const effect = levelData?.[key]?.base ?? levelData?.[key];
    if (hasRenderableContent(effect, selectedStateKey)) effects.push({ level: index + 1, effect });
    return effects;
  }, []);
}

// 선장 효과·필살기 비교에 쓰이지 않는 상한돌파 강화 항목을 따로 모읍니다.
function getAdditionalLevelLimitEffects(value, selectedStateKey) {
  if (!Array.isArray(value)) return [];
  return value.reduce((levels, levelData, index) => {
    if (!levelData || typeof levelData !== "object") return levels;
    const effects = Object.entries(levelData)
      .filter(([key, itemValue]) => !["captain", "special", "rSuperSpecial"].includes(key) && hasRenderableContent(itemValue, selectedStateKey));
    if (effects.length) levels.push({ level: index + 1, effects });
    return levels;
  }, []);
}

// 상한돌파 선원 효과와 R 계열 해방 효과를 단계별로 표시합니다.
function renderAdditionalLevelLimitEffects(levels, selectedStateKey) {
  const list = document.createElement("div");
  list.className = "ability-list";
  levels.forEach(({ level, effects }) => {
    const entry = document.createElement("div");
    entry.className = "ability-list-entry";
    const heading = document.createElement("strong");
    heading.textContent = `${level}단계`;
    entry.append(heading);
    effects.forEach(([key, value]) => {
      const label = document.createElement("span");
      label.className = "ability-sub-label";
      label.textContent = `레벨 상한돌파 ${makeLabel(key)}`;
      // R 계열 값은 true/false 상태 값이므로, true일 때만 해방됨으로 읽기 좋게 표시합니다.
      if (typeof value === "boolean") entry.append(label, makeText(value ? "해방됨" : "미해방"));
      else entry.append(label, renderValue(value, key, selectedStateKey));
    });
    list.append(entry);
  });
  return list;
}

// 기본 효과와 상한돌파·초진화 효과를 한눈에 비교할 수 있는 카드 묶음을 만듭니다.
function makeComparisonGrid(baseTitle, baseValue, upgradeTitle, upgrades, selectedStateKey) {
  const grid = document.createElement("div");
  grid.className = "ability-comparison-grid";

  if (hasRenderableContent(baseValue, selectedStateKey)) {
    const baseCard = document.createElement("div");
    baseCard.className = "ability-comparison-card";
    const title = document.createElement("strong");
    title.textContent = baseTitle;
    baseCard.append(title, renderValue(baseValue, "base", selectedStateKey));
    grid.append(baseCard);
  }

  upgrades.forEach(({ level, effect }) => {
    const upgradeCard = document.createElement("div");
    upgradeCard.className = "ability-comparison-card is-upgrade";
    const title = document.createElement("strong");
    title.textContent = upgrades.length > 1 ? `${upgradeTitle} (${level}단계)` : upgradeTitle;
    upgradeCard.append(title, renderValue(effect, "base", selectedStateKey));
    grid.append(upgradeCard);
  });
  return grid;
}

// cooldowns.js의 [시작 턴, 최대 레벨 턴] 데이터를 현재 캐릭터에 맞춰 가져옵니다.
function getCooldown(characterId, baseId) {
  const cooldown = window.cooldowns?.[characterId] ?? window.cooldowns?.[baseId];
  const hasTwoTurns = Array.isArray(cooldown)
    && cooldown.length >= 2
    && cooldown[0] !== null && cooldown[0] !== undefined && cooldown[0] !== ""
    && cooldown[1] !== null && cooldown[1] !== undefined && cooldown[1] !== "";
  return hasTwoTurns ? cooldown : null;
}

// 필살기 효과 아래에 표시할 필살기 턴 블록을 만듭니다.
function makeCooldownBlock(cooldown) {
  const block = document.createElement("div");
  block.className = "ability-property";
  const title = document.createElement("strong");
  title.textContent = "필살기턴";
  block.append(title, makeText(`${cooldown[0]} → ${cooldown[1]}`));
  return block;
}

// 초연계와 초연계 강화는 같은 단계의 조건·효과를 하나의 카드에 함께 표시합니다.
function renderTandemLevels(value) {
  const list = document.createElement("div");
  list.className = "ability-list";
  const conditions = value.characterCondition ?? value.condition;
  const descriptions = value.description;
  const count = Math.max(Array.isArray(conditions) ? conditions.length : hasContent(conditions) ? 1 : 0, Array.isArray(descriptions) ? descriptions.length : hasContent(descriptions) ? 1 : 0);

  for (let index = 0; index < count; index += 1) {
    const condition = Array.isArray(conditions) ? conditions[index] : conditions;
    const description = Array.isArray(descriptions) ? descriptions[index] : descriptions;
    if (!hasContent(condition) && !hasContent(description)) continue;
    const entry = document.createElement("div");
    entry.className = "ability-list-entry";
    const level = document.createElement("strong");
    level.textContent = `${index + 1}단계`;
    entry.append(level);
    [["발동 조건", condition], ["효과", description]]
      .filter(([, itemValue]) => hasContent(itemValue))
      .forEach(([label, itemValue]) => {
        const subLabel = document.createElement("span");
        subLabel.className = "ability-sub-label";
        subLabel.textContent = label;
        entry.append(subLabel, makeText(itemValue));
      });
    list.append(entry);
  }
  return list;
}

// 문자열·배열·객체가 섞인 능력 데이터를 재귀적으로 읽기 좋은 블록으로 바꿉니다.
function renderValue(value, key, selectedStateKey) {
  const fragment = document.createDocumentFragment();
  if (!hasRenderableContent(value, selectedStateKey)) return fragment;

  if (typeof value === "string" || typeof value === "number") {
    fragment.append(makeText(value));
    return fragment;
  }

  if (Array.isArray(value)) {
    if (key === "lLimit") return renderLevelLimit(value, selectedStateKey);
    const list = document.createElement("div");
    list.className = "ability-list";
    value.filter((item) => hasRenderableContent(item, selectedStateKey)).forEach((item, index) => {
      const entry = document.createElement("div");
      entry.className = "ability-list-entry";
      if (typeof item === "string" || typeof item === "number") {
        const level = document.createElement("strong");
        level.textContent = `${index + 1}단계`;
        entry.append(level, makeText(item));
      } else {
        const name = item.Name ?? item.name;
        if (hasContent(name)) {
          const heading = document.createElement("strong");
          heading.textContent = cleanText(name);
          entry.append(heading);
        }
        Object.entries(item).filter(([itemKey, itemValue]) => itemKey !== "Name" && itemKey !== "name" && hasRenderableContent(itemValue, selectedStateKey)).forEach(([itemKey, itemValue]) => {
          const subLabel = document.createElement("span");
          subLabel.className = "ability-sub-label";
          subLabel.textContent = makeLabel(itemKey);
          entry.append(subLabel, renderValue(itemValue, itemKey, selectedStateKey));
        });
      }
      list.append(entry);
    });
    fragment.append(list);
    return fragment;
  }

  const entries = Object.entries(value).filter(([, itemValue]) => hasRenderableContent(itemValue, selectedStateKey));
  const states = entries.filter(([itemKey]) => characterStateKeys.has(itemKey) && itemKey === selectedStateKey);
  const otherEntries = entries.filter(([itemKey]) => !characterStateKeys.has(itemKey));

  if (states.length) {
    const stateGrid = document.createElement("div");
    stateGrid.className = "ability-state-grid";
    // 현재 탭에는 한 형태만 표시되므로, 남는 빈 칸 없이 전체 폭을 사용합니다.
    if (states.length === 1) stateGrid.classList.add("is-single-state");
    states.forEach(([itemKey, itemValue]) => {
      const state = document.createElement("div");
      state.className = "ability-state";
      const title = document.createElement("strong");
      title.textContent = makeLabel(itemKey);
      state.append(title, renderValue(itemValue, itemKey, selectedStateKey));
      stateGrid.append(state);
    });
    fragment.append(stateGrid);
  }

  otherEntries.forEach(([itemKey, itemValue]) => {
    const property = document.createElement("div");
    property.className = "ability-property";
    const title = document.createElement("strong");
    title.textContent = makeLabel(itemKey);
    property.append(title, renderValue(itemValue, itemKey, selectedStateKey));
    fragment.append(property);
  });
  return fragment;
}

// 모든 능력 항목의 열림 상태를 한 버튼으로 제어합니다.
function setupToggleAllButton(abilitySection, container) {
  const toggleButton = abilitySection.querySelector("#ability-toggle-all");
  const sections = [...container.querySelectorAll(".ability-section")];
  if (!toggleButton) return;

  const syncButton = () => {
    const allOpen = sections.length > 0 && sections.every((section) => section.open);
    toggleButton.textContent = allOpen ? "전부 접기" : "전부 열기";
    toggleButton.setAttribute("aria-label", allOpen ? "능력 정보 전부 접기" : "능력 정보 전부 열기");
  };

  toggleButton.hidden = sections.length === 0;
  toggleButton.onclick = () => {
    const shouldOpen = sections.some((section) => !section.open);
    sections.forEach((section) => { section.open = shouldOpen; });
    syncButton();
  };
  sections.forEach((section) => section.addEventListener("toggle", syncButton));
  syncButton();
}

// 선택한 캐릭터의 능력 데이터만 생성합니다. 형태 전용 데이터가 없으면 기본 번호 데이터를 사용합니다.
export function renderAbilityDetails(container, characterId, baseId) {
  const details = window.details?.[characterId] ?? window.details?.[baseId] ?? {};
  const abilitySection = container.closest(".detail-abilities");
  const selectedStateKey = getSelectedStateKey(characterId, baseId);
  const cooldown = getCooldown(characterId, baseId);
  const toggleButton = abilitySection.querySelector("#ability-toggle-all");
  // 현재 형태에서 표시할 수 있는 효과가 하나도 없으면 능력 정보 섹션도 숨깁니다.
  const shouldShow = hasRenderableContent(details, selectedStateKey) || cooldown !== null;
  container.replaceChildren();
  container.hidden = !shouldShow;
  abilitySection.hidden = !shouldShow;
  if (toggleButton) toggleButton.hidden = true;
  if (!shouldShow) return;

  const limitCaptainEffects = getLevelLimitEffects(details.lLimit, "captain", selectedStateKey);
  const limitSpecialEffects = getLevelLimitEffects(details.lLimit, "special", selectedStateKey);
  const additionalLimitEffects = getAdditionalLevelLimitEffects(details.lLimit, selectedStateKey);

  // 필살기 이름과 효과는 한 섹션에 묶어, 이름 다음 효과 순서로 보여 줍니다.
  if (hasRenderableContent(details.special, selectedStateKey) || hasRenderableContent(details.specialName, selectedStateKey) || limitSpecialEffects.length || cooldown !== null) {
    const section = document.createElement("details");
    section.className = "ability-section";
    const summary = document.createElement("summary");
    summary.textContent = "필살기";
    const content = document.createElement("div");
    content.className = "ability-section-content";
    if (hasRenderableContent(details.specialName, selectedStateKey)) {
      const name = document.createElement("div");
      name.className = "ability-property";
      const title = document.createElement("strong");
      title.textContent = "필살기 이름";
      name.append(title, renderValue(details.specialName, "specialName", selectedStateKey));
      content.append(name);
    }
    if (hasRenderableContent(details.special, selectedStateKey) || limitSpecialEffects.length) {
      if (limitSpecialEffects.length) {
        content.append(makeComparisonGrid("기본 필살기", details.special, "초진화 시 필살기", limitSpecialEffects, selectedStateKey));
      } else {
        const effect = document.createElement("div");
        effect.className = "ability-property";
        const title = document.createElement("strong");
        title.textContent = "필살기 효과";
        effect.append(title, renderValue(details.special, "special", selectedStateKey));
        content.append(effect);
      }
    }
    // 쿨타임은 필살기 효과 카드 바로 다음에, 시작 턴 → 최대 레벨 턴 순으로 표시합니다.
    if (cooldown !== null) content.append(makeCooldownBlock(cooldown));
    section.append(summary, content);
    container.append(section);
  }

  // EX 초월은 발동 조건과 필살기 효과를 하나의 접이식 영역에 순서대로 묶습니다.
  if (hasRenderableContent(details.superSpecialCriteria, selectedStateKey) || hasRenderableContent(details.superSpecial, selectedStateKey)) {
    const section = document.createElement("details");
    section.className = "ability-section";
    const summary = document.createElement("summary");
    summary.textContent = "EX 초월";
    const content = document.createElement("div");
    content.className = "ability-section-content";

    [
      ["EX 초월 발동조건", details.superSpecialCriteria, "superSpecialCriteria"],
      ["EX 초월 필살기 효과", details.superSpecial, "superSpecial"],
    ].forEach(([titleText, value, key]) => {
      if (!hasRenderableContent(value, selectedStateKey)) return;
      const property = document.createElement("div");
      property.className = "ability-property";
      const title = document.createElement("strong");
      title.textContent = titleText;
      property.append(title, renderValue(value, key, selectedStateKey));
      content.append(property);
    });

    section.append(summary, content);
    container.append(section);
  }

  Object.entries(details)
    // 선장 효과·필살기는 비교 카드로 표시하고, 멤버 스킬은 상세 창에 표시하지 않습니다.
    .filter(([key, value]) => !["special", "specialName", "superSpecial", "superSpecialCriteria", "lLimit", "memberSkills"].includes(key) && hasRenderableContent(value, selectedStateKey))
    .forEach(([key, value]) => {
    const section = document.createElement("details");
    section.className = "ability-section";
    const summary = document.createElement("summary");
    summary.textContent = makeLabel(key);
    const content = document.createElement("div");
    content.className = "ability-section-content";
    if (key === "captain" && limitCaptainEffects.length) {
      content.append(makeComparisonGrid("기본 선장효과", value, "레벨 상한돌파 기본 선장효과", limitCaptainEffects, selectedStateKey));
    } else if (key === "superTandem" || key === "superTandemBoost") {
      content.append(renderTandemLevels(value));
    } else {
      content.append(renderValue(value, key, selectedStateKey));
    }
    section.append(summary, content);
    container.append(section);
  });

  // 비교 카드에 포함되지 않는 상한돌파 강화도 누락 없이 별도 항목으로 표시합니다.
  if (additionalLimitEffects.length) {
    const section = document.createElement("details");
    section.className = "ability-section";
    const summary = document.createElement("summary");
    summary.textContent = "레벨 상한돌파 추가 강화";
    const content = document.createElement("div");
    content.className = "ability-section-content";
    content.append(renderAdditionalLevelLimitEffects(additionalLimitEffects, selectedStateKey));
    section.append(summary, content);
    container.append(section);
  }

  setupToggleAllButton(abilitySection, container);
}
