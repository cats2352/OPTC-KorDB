import {
  cardData,
  configureDetailImage,
  configureThumbnail,
  getCharacterIds,
  getCharacterVariants,
  hasValue,
  normalize,
  numberText,
  padId,
  unitFor,
} from "./character-data.js";
import { loadFilterPanel } from "./filter-panel.js";
import { matchesCaptainFilterSelections } from "./filter-rules.js";
import { renderAbilityDetails } from "./ability-details.js";
import { renderFestivalDetails } from "./festival-details.js";

// 목록 한 페이지에 표시할 카드 수와, units.js에서 읽은 전체 캐릭터 번호입니다.
const PAGE_SIZE = 48;
const characterIds = getCharacterIds();
const grid = document.querySelector("#character-grid");
const template = document.querySelector("#character-template");
const searchInput = document.querySelector("#character-search");
const searchNote = document.querySelector("#search-note");
const rangeLabel = document.querySelector("#range-label");
const resultTotal = document.querySelector("#result-total");
const databaseRange = document.querySelector("#database-range");
const resultsPanel = document.querySelector(".results-panel");
const pageNumbers = document.querySelector("#page-numbers");
const previousPage = document.querySelector("#previous-page");
const nextPage = document.querySelector("#next-page");
const sortButtons = document.querySelectorAll("[data-sort]");
const detailDialog = document.querySelector("#character-detail");
const detailClose = document.querySelector("#detail-close");
const detailThumbnail = document.querySelector("#detail-thumbnail");
const detailThumbnailPlaceholder = document.querySelector("#detail-thumbnail-placeholder");
const detailNumber = document.querySelector("#detail-number");
const detailTitle = document.querySelector("#detail-title");
const detailTags = document.querySelector("#detail-tags");
const detailCharacterTags = document.querySelector("#detail-character-tags");
const detailVariantTabs = document.querySelector("#detail-variant-tabs");
const basicStatList = document.querySelector("#basic-stat-list");
const statList = document.querySelector("#stat-list");
const abilityList = document.querySelector("#ability-list");
const festivalList = document.querySelector("#festival-list");

let currentPage = 1;
let sortOrder = "asc";
let query = "";
const favorites = new Set();
let activeFilters = { attributes: new Set(), types: new Set(), rarities: new Set(), captainEffects: new Set(), captainDetails: new Set(), typeConditions: { onlySelected: false, excludeSingleType: false } };

// 템플릿 한 장에 units.js 데이터를 채워 목록 카드를 만듭니다.
function createCharacterCard(id) {
  const card = template.content.firstElementChild.cloneNode(true);
  const unit = unitFor(id);
  const data = cardData(unit);
  const body = card.querySelector(".character-body");
  const favoriteButton = card.querySelector(".favorite-button");
  const isFavorite = favorites.has(id);

  card.dataset.characterId = id;
  card.querySelector(".character-number").textContent = `No.${padId(id)}`;
  card.querySelector(".character-info h3").textContent = data.name;
  // 값이 없는 정보는 카드에서 빈 칸 대신 항목 전체를 숨깁니다.
  const optionalFields = [
    [card.querySelector(".character-attribute").closest("span"), card.querySelector(".character-attribute"), data.attribute],
    [card.querySelector(".character-class").closest("span"), card.querySelector(".character-class"), data.classes],
    [card.querySelector(".character-stars").closest("div"), card.querySelector(".character-stars"), data.stars],
    [card.querySelector(".character-cost").closest("div"), card.querySelector(".character-cost"), data.cost],
  ];
  optionalFields.forEach(([container, valueElement, value]) => {
    container.hidden = !hasValue(value);
    valueElement.textContent = value ?? "";
  });
  card.querySelector(".tag-row").hidden = optionalFields.slice(0, 2).every(([container]) => container.hidden);
  card.querySelector(".card-meta-grid").hidden = optionalFields.slice(2).every(([container]) => container.hidden);
  body.setAttribute("aria-label", `${data.name} 상세 정보 보기`);
  favoriteButton.classList.toggle("is-favorite", isFavorite);
  favoriteButton.setAttribute("aria-pressed", String(isFavorite));
  favoriteButton.setAttribute("aria-label", isFavorite ? "즐겨찾기에서 제거" : "즐겨찾기에 추가");
  favoriteButton.textContent = isFavorite ? "★" : "☆";
  configureThumbnail(card.querySelector(".character-thumbnail"), card.querySelector(".thumbnail-placeholder"), id);
  return card;
}

// 검색어와 선택한 속성·타입·등급 조건을 모두 적용할 대상 번호 목록을 계산합니다.
function matchingIds() {
  return characterIds.filter((id) => {
    const unit = unitFor(id);
    const matchesSearch = !query || String(id).includes(query) || normalize(unit?.name).includes(query);
    // 같은 그룹 안에서 여러 값을 고르면 OR, 서로 다른 그룹은 모두 만족해야 합니다.
    const matchesAttribute = activeFilters.attributes.size === 0 || activeFilters.attributes.has(unit?.type);
    const classes = Array.isArray(unit?.class) ? unit.class : unit?.class ? [unit.class] : [];
    const matchesType = activeFilters.types.size === 0 || classes.some((type) => activeFilters.types.has(type));
    // "선택한 타입 외" 조건은 선택된 타입 이외의 보조 타입이 있으면 제외합니다.
    const matchesOnlySelectedTypes = !activeFilters.typeConditions.onlySelected
      || activeFilters.types.size === 0
      || classes.every((type) => activeFilters.types.has(type));
    const matchesMultipleTypes = !activeFilters.typeConditions.excludeSingleType || classes.length > 1;
    const matchesRarity = activeFilters.rarities.size === 0 || activeFilters.rarities.has(String(unit?.stars));
    const matchesCaptainEffect = matchesCaptainFilterSelections(window.details?.[String(id)], activeFilters.captainEffects, activeFilters.captainDetails);
    return matchesSearch && matchesAttribute && matchesType && matchesOnlySelectedTypes && matchesMultipleTypes && matchesRarity && matchesCaptainEffect;
  });
}
function orderedIds() {
  const ids = matchingIds();
  return sortOrder === "asc" ? ids : [...ids].reverse();
}
function totalPages() { return Math.max(1, Math.ceil(orderedIds().length / PAGE_SIZE)); }
function paginationItems(pageCount) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, "end-gap", pageCount];
  if (currentPage >= pageCount - 3) return [1, "start-gap", pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
  return [1, "start-gap", currentPage - 1, currentPage, currentPage + 1, "end-gap", pageCount];
}
function renderPagination(pageCount) {
  pageNumbers.replaceChildren();
  paginationItems(pageCount).forEach((item) => {
    if (typeof item === "string") {
      const ellipsis = document.createElement("span");
      ellipsis.className = "page-ellipsis";
      ellipsis.textContent = "…";
      pageNumbers.append(ellipsis);
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "page-number";
    button.textContent = item;
    button.setAttribute("aria-label", `${item}페이지로 이동`);
    if (item === currentPage) { button.classList.add("is-current"); button.setAttribute("aria-current", "page"); }
    button.addEventListener("click", () => goToPage(item));
    pageNumbers.append(button);
  });
  previousPage.disabled = currentPage === 1;
  nextPage.disabled = currentPage === pageCount;
}
// 현재 페이지의 카드, 결과 수, 페이지 버튼을 한 번에 다시 그립니다.
function renderPage() {
  const ids = orderedIds();
  const pageCount = totalPages();
  currentPage = Math.min(currentPage, pageCount);
  const pageIds = ids.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  grid.replaceChildren(...pageIds.map(createCharacterCard));
  resultTotal.textContent = ids.length.toLocaleString("ko-KR");
  // 필터 창이 열린 상태에서도 현재 조건으로 찾은 전체 캐릭터 수를 즉시 보여 줍니다.
  const filterResultCount = document.querySelector("#filter-result-count");
  if (filterResultCount) filterResultCount.textContent = ids.length.toLocaleString("ko-KR");
  rangeLabel.textContent = pageIds.length ? `${padId(pageIds[0])}—${padId(pageIds.at(-1))}` : "—";
  searchNote.textContent = query ? `“${searchInput.value.trim()}” 검색 결과 ${ids.length.toLocaleString("ko-KR")}명입니다.` : "이름 또는 도감 번호로 검색할 수 있습니다.";
  if (!pageIds.length) {
    const empty = document.createElement("p");
    empty.className = "empty-results";
    empty.textContent = "일치하는 캐릭터가 없습니다. 다른 이름 또는 번호로 검색해 보세요.";
    grid.append(empty);
  }
  renderPagination(pageCount);
}
function goToPage(page) {
  const pageCount = totalPages();
  if (page < 1 || page > pageCount || page === currentPage) return;
  currentPage = page;
  renderPage();
  resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}
function appendStats(container, entries) {
  const visibleEntries = entries.filter(([, value]) => hasValue(value));
  container.replaceChildren();
  container.closest(".detail-section").hidden = visibleEntries.length === 0;
  visibleEntries.forEach(([label, value]) => {
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    wrapper.append(term, description);
    container.append(wrapper);
  });
}
// 선택한 형태의 기본 정보와 스탯을 상세 창에 채웁니다.
function renderDetail(id, baseId) {
  const unit = unitFor(id);
  const data = cardData(unit);
  detailNumber.textContent = `No.${padId(id)}`;
  detailTitle.textContent = data.name;
  const summaryItems = [
    hasValue(data.attribute) && `속성 ${data.attribute}`,
    hasValue(data.classes) && `타입 ${data.classes}`,
    hasValue(data.stars) && data.stars,
    hasValue(data.cost) && `코스트 ${data.cost}`,
  ].filter(Boolean);
  detailTags.hidden = summaryItems.length === 0;
  detailTags.textContent = summaryItems.join(" · ");
  renderCharacterTags(id, baseId);
  configureDetailImage(detailThumbnail, detailThumbnailPlaceholder, id, baseId);
  appendStats(basicStatList, [["속성", data.attribute], ["타입", data.classes], ["등급", data.stars], ["코스트", data.cost], ["콤보", numberText(unit?.combo)], ["슬롯", numberText(unit?.sockets)], ["최대 레벨", numberText(unit?.maxLevel)], ["최대 경험치", numberText(unit?.maxEXP)]]);
  appendStats(statList, [["최소 체력", numberText(unit?.minHP)], ["최소 공격력", numberText(unit?.minATK)], ["최소 회복력", numberText(unit?.minRCV)], ["최대 체력", numberText(unit?.maxHP)], ["최대 공격력", numberText(unit?.maxATK)], ["최대 회복력", numberText(unit?.maxRCV)]]);
  // 능력 데이터는 별도 파일에서 읽고, 해당 캐릭터에 값이 있을 때만 표시합니다.
  renderAbilityDetails(abilityList, id, baseId);
  // 해적제 데이터도 같은 캐릭터 번호에 맞춰 별도 섹션으로 표시합니다.
  renderFestivalDetails(festivalList, id, baseId);
}

// characterTags.js에서 현재 기본 캐릭터·변형 형태에 정확히 해당하는 태그 이름만 찾습니다.
function getCharacterTagNames(id, baseId) {
  const variantMatch = String(id).match(/-(\d+)$/);
  const childIndex = variantMatch ? Number(variantMatch[1]) - 1 : null;

  return Object.entries(window.characterTags ?? {})
    .filter(([, tagData]) => tagData.characterIds?.some((character) => {
      if (String(character.logbookId) !== String(baseId)) return false;
      // 기본 캐릭터는 childIndex가 없는 항목, -1·-2는 각각 0·1번 항목을 사용합니다.
      return childIndex === null
        ? character.childIndex === undefined || character.childIndex === null
        : Number(character.childIndex) === childIndex;
    }))
    .map(([tagName]) => tagName);
}

// 태그는 데이터에 새 항목이 추가되어도 자동으로 늘어나도록 작은 칩 형태로 생성합니다.
function renderCharacterTags(id, baseId) {
  const tagNames = getCharacterTagNames(id, baseId);
  detailCharacterTags.replaceChildren();
  detailCharacterTags.hidden = tagNames.length === 0;
  tagNames.forEach((tagName) => {
    const tag = document.createElement("span");
    tag.className = "detail-character-tag";
    tag.textContent = tagName;
    detailCharacterTags.append(tag);
  });
}

// 기본 카드와 연결된 -1, -2 형태를 탭으로 만들고 선택된 형태만 표시합니다.
function renderVariantTabs(baseId) {
  const variantIds = [String(baseId), ...getCharacterVariants(baseId)];
  detailVariantTabs.hidden = variantIds.length < 2;
  detailVariantTabs.replaceChildren();
  variantIds.forEach((variantId, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "detail-variant-tab";
    // 기본 형태는 고정 제목, -1·-2 형태는 각 형태의 실제 캐릭터 이름을 탭에 표시합니다.
    const variantName = unitFor(variantId)?.name;
    const tabLabel = index === 0 ? "기본" : variantName || variantId.slice(String(baseId).length);
    button.textContent = tabLabel;
    button.title = tabLabel;
    button.setAttribute("aria-label", `${tabLabel} 형태 보기`);
    button.setAttribute("aria-pressed", String(index === 0));
    button.addEventListener("click", () => {
      detailVariantTabs.querySelectorAll("button").forEach((tab) => tab.setAttribute("aria-pressed", "false"));
      button.setAttribute("aria-pressed", "true");
      renderDetail(variantId, baseId);
    });
    detailVariantTabs.append(button);
  });
}

// 카드 클릭 시 기본 형태를 먼저 표시하고, 연결된 형태가 있으면 탭을 추가합니다.
function openDetail(id) {
  renderVariantTabs(id);
  renderDetail(String(id), id);
  if (!detailDialog.open) detailDialog.showModal();
}

// 카드 클릭은 상세 창, 별 버튼 클릭은 즐겨찾기 상태 변경으로 나눕니다.
grid.addEventListener("click", (event) => {
  const card = event.target.closest(".character-card");
  if (!card) return;
  const id = Number(card.dataset.characterId);
  if (event.target.closest(".favorite-button")) { favorites.has(id) ? favorites.delete(id) : favorites.add(id); renderPage(); return; }
  if (event.target.closest(".character-body")) openDetail(id);
});
grid.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const body = event.target.closest(".character-body");
  if (!body) return;
  event.preventDefault();
  openDetail(Number(body.closest(".character-card").dataset.characterId));
});
searchInput.addEventListener("input", () => { query = normalize(searchInput.value); currentPage = 1; renderPage(); });
previousPage.addEventListener("click", () => goToPage(currentPage - 1));
nextPage.addEventListener("click", () => goToPage(currentPage + 1));
sortButtons.forEach((button) => button.addEventListener("click", () => {
  sortOrder = button.dataset.sort;
  currentPage = 1;
  sortButtons.forEach((item) => { const active = item === button; item.classList.toggle("is-active", active); item.setAttribute("aria-pressed", String(active)); });
  renderPage();
}));
detailClose.addEventListener("click", () => detailDialog.close());
detailDialog.addEventListener("click", (event) => { if (event.target === detailDialog) detailDialog.close(); });

databaseRange.textContent = characterIds.length
  ? `DATABASE / ${padId(characterIds[0])}—${padId(characterIds.at(-1))}`
  : "DATABASE";
renderPage();
loadFilterPanel(document.querySelector("#filter-panel-root"), document.querySelector("#filter-open"), (filters) => {
  activeFilters = filters;
  currentPage = 1;
  renderPage();
}).then(() => {
  // 초기 필터 창을 불러온 직후에도 전체 결과 수를 표시합니다.
  const filterResultCount = document.querySelector("#filter-result-count");
  if (filterResultCount) filterResultCount.textContent = matchingIds().length.toLocaleString("ko-KR");
}).catch(() => {
  document.querySelector("#filter-open").disabled = true;
});
