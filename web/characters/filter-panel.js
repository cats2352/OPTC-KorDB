import { captainFilterGroups } from "./filter-rules.js";

// 규칙 파일의 선장 효과 구조를 읽어 필터 버튼을 자동으로 만듭니다.
function renderCaptainFilterTree(tree) {
  captainFilterGroups.forEach((category) => {
    const section = document.createElement("details");
    section.className = "captain-filter-subsection";
    const summary = document.createElement("summary");
    summary.textContent = category.label;
    section.append(summary);
    const options = document.createElement("div");
    options.className = "captain-filter-options";
    category.filters.forEach((filter) => {
      // 필터마다 버튼과 세부 조건을 한 묶음으로 두어 다음 항목과 표시 상태가 섞이지 않게 합니다.
      const filterItem = document.createElement("div");
      filterItem.className = "captain-filter-item";
      const button = document.createElement("button");
      button.className = "captain-filter-option";
      button.type = "button";
      button.dataset.captainFilter = filter.id;
      button.setAttribute("aria-pressed", "false");
      button.textContent = filter.label;
      filterItem.append(button);
      const detail = document.createElement("div");
      detail.className = "captain-filter-detail";
      const content = document.createElement("div");
      content.className = "captain-detail-content";
      filter.detailGroups?.forEach((group) => {
        const groupElement = document.createElement("section");
        groupElement.className = "captain-detail-group";
        const title = document.createElement("h4");
        title.textContent = group.label;
        const detailOptions = document.createElement("div");
        detailOptions.className = "captain-detail-options";
        group.options.forEach(([id, label], index) => {
          const detailButton = document.createElement("button");
          detailButton.className = "captain-detail-option";
          detailButton.type = "button";
          detailButton.dataset.captainDetail = id;
          detailButton.dataset.captainParent = filter.id;
          detailButton.setAttribute("aria-pressed", "false");
          detailButton.textContent = label;
          if (group.options.length % 2 && index === group.options.length - 1) detailButton.classList.add("captain-detail-wide");
          detailOptions.append(detailButton);
        });
        groupElement.append(title, detailOptions);
        content.append(groupElement);
      });
      detail.append(content);
      filterItem.append(detail);
      options.append(filterItem);
    });
    section.append(options);
    tree.append(section);
  });
}

// 분리된 필터 HTML을 불러온 뒤, 열기·닫기와 선택된 조건을 목록 화면에 전달합니다.
export async function loadFilterPanel(container, openButton, onFilterChange) {
  const response = await fetch("./filter-panel.html");
  if (!response.ok) throw new Error("필터 UI를 불러오지 못했습니다.");
  container.innerHTML = await response.text();
  renderCaptainFilterTree(container.querySelector("#captain-filter-tree"));

  const layer = container.querySelector("#filter-layer");
  const closeButton = container.querySelector("#filter-close");
  const search = container.querySelector("#filter-search");
  const sections = container.querySelector("#filter-sections");
  const countBadge = openButton.querySelector(".filter-count");
  const summary = container.querySelector("#selected-summary strong");
  const selected = {
    attribute: new Set(),
    type: new Set(),
    rarity: new Set(),
    captain: new Set(),
    captainDetails: new Set(),
  };
  const typeConditions = { onlySelected: false, excludeSingleType: false };

  // 닫기 동작은 배경 클릭과 Esc 키를 포함해 한 곳에서 처리합니다.
  const close = () => {
    layer.hidden = true;
    document.body.classList.remove("drawer-open");
    openButton.setAttribute("aria-expanded", "false");
    openButton.focus();
  };
  const updateSummary = () => {
    const count = Object.values(selected).reduce((total, items) => total + items.size, 0)
      + Object.values(typeConditions).filter(Boolean).length;
    countBadge.hidden = count === 0;
    countBadge.textContent = count;
    summary.textContent = count ? `${count}개 선택` : "없음";
  };
  // 현재 지원하는 세 필터 그룹만 복사해 외부 목록 계산 함수에 전달합니다.
  const notifyFilterChange = () => onFilterChange?.({
    attributes: new Set(selected.attribute),
    types: new Set(selected.type),
    rarities: new Set(selected.rarity),
    captainEffects: new Set(selected.captain),
    captainDetails: new Set(selected.captainDetails),
    typeConditions: { ...typeConditions },
  });

  // 패널을 열면 키보드 포커스를 닫기 버튼으로 옮깁니다.
  openButton.addEventListener("click", () => {
    layer.hidden = false;
    document.body.classList.add("drawer-open");
    openButton.setAttribute("aria-expanded", "true");
    closeButton.focus();
  });
  closeButton.addEventListener("click", close);
  layer.querySelector(".filter-backdrop").addEventListener("click", close);
  container.querySelector("#filter-done").addEventListener("click", close);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !layer.hidden) close();
  });

  // 정렬은 하나만, 나머지 필터는 여러 개 선택할 수 있습니다.
  sections.addEventListener("click", (event) => {
    const button = event.target.closest(".option-button");
    if (!button) return;
    if (button.closest("#sort")) {
      sections.querySelectorAll("#sort .option-button").forEach((item) => item.classList.remove("is-selected"));
      button.classList.add("is-selected");
      return;
    }
    const group = button.closest(".filter-section")?.id;
    // 공통전투 등 다음 단계에서 구현할 필터는 현재 선택 상태에 넣지 않습니다.
    if (!selected[group]) return;
    button.classList.toggle("is-selected");
    button.classList.contains("is-selected") ? selected[group].add(button.dataset.filter) : selected[group].delete(button.dataset.filter);
    updateSummary();
    notifyFilterChange();
  });

  // 구현된 선장 효과 세부 항목은 선택 즉시 목록 필터 조건으로 전달합니다.
  sections.addEventListener("click", (event) => {
    const button = event.target.closest(".captain-filter-option");
    if (!button) return;
    const isSelected = button.getAttribute("aria-pressed") === "true";
    button.setAttribute("aria-pressed", String(!isSelected));
    isSelected ? selected.captain.delete(button.dataset.captainFilter) : selected.captain.add(button.dataset.captainFilter);
    // 상위 효과를 해제하면 그 아래 세부 선택도 함께 해제해 조건이 남지 않게 합니다.
    if (isSelected) {
      sections.querySelectorAll(`[data-captain-parent="${button.dataset.captainFilter}"]`).forEach((item) => {
        selected.captainDetails.delete(item.dataset.captainDetail);
        item.setAttribute("aria-pressed", "false");
      });
    }
    updateSummary();
    notifyFilterChange();
  });

  // 데미지 세부 조건은 같은 분류 안에서는 하나만 맞으면 되고, 분류끼리는 함께 만족해야 합니다.
  sections.addEventListener("click", (event) => {
    const button = event.target.closest(".captain-detail-option");
    if (!button) return;
    const isSelected = button.getAttribute("aria-pressed") === "true";
    button.setAttribute("aria-pressed", String(!isSelected));
    isSelected ? selected.captainDetails.delete(button.dataset.captainDetail) : selected.captainDetails.add(button.dataset.captainDetail);
    // 세부 조건은 항상 턴 종료 데미지 효과 안에서 검색합니다.
    if (!isSelected) {
      selected.captain.add(button.dataset.captainParent);
      sections.querySelector(`[data-captain-filter="${button.dataset.captainParent}"]`).setAttribute("aria-pressed", "true");
    }
    updateSummary();
    notifyFilterChange();
  });

  // 타입 추가 조건은 여러 타입 선택 여부와 별개로 켜고 끌 수 있습니다.
  sections.addEventListener("click", (event) => {
    const button = event.target.closest(".type-condition");
    if (!button) return;
    const condition = button.dataset.typeCondition;
    typeConditions[condition] = !typeConditions[condition];
    button.setAttribute("aria-pressed", String(typeConditions[condition]));
    updateSummary();
    notifyFilterChange();
  });

  container.querySelectorAll(".filter-jump button").forEach((button) => {
    button.addEventListener("click", () => {
      const section = container.querySelector(`#${button.dataset.section}`);
      section.open = true;
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  // 긴 필터 목록에서 필요한 항목만 빠르게 찾습니다.
  search.addEventListener("input", () => {
    const term = search.value.trim();
    container.querySelectorAll(".filter-section").forEach((section) => {
      const matched = !term || section.textContent.includes(term);
      section.hidden = !matched;
      if (term && matched) section.open = true;
    });
  });
  container.querySelector("#filter-reset").addEventListener("click", () => {
    Object.values(selected).forEach((items) => items.clear());
    Object.keys(typeConditions).forEach((condition) => { typeConditions[condition] = false; });
    sections.querySelectorAll(".option-button").forEach((button) => {
      button.classList.toggle("is-selected", button.closest("#sort") && button.dataset.filter === "도감 번호");
    });
    sections.querySelectorAll(".type-condition").forEach((button) => button.setAttribute("aria-pressed", "false"));
    sections.querySelectorAll(".captain-filter-option").forEach((button) => button.setAttribute("aria-pressed", "false"));
    sections.querySelectorAll(".captain-detail-option").forEach((button) => button.setAttribute("aria-pressed", "false"));
    updateSummary();
    notifyFilterChange();
  });
  updateSummary();
}
