// units.js의 영문 타입명을 화면에 표시할 한국어 이름으로 바꿉니다.
const classLabels = {
  Fighter: "격투",
  Shooter: "사격",
  Slasher: "참격",
  Striker: "타격",
  "Free Spirit": "자유",
  Cerebral: "박식",
  Powerhouse: "강인",
  Driven: "야심",
};

// 도감 번호와 숫자 값을 목록·상세 창에서 같은 형식으로 표시합니다.
export const padId = (id) => String(id).padStart(4, "0");
export const unitFor = (id) => window.units?.[String(id)] ?? null;
// null·빈 값은 화면에서 숨길 수 있도록 null로 유지합니다. 숫자 0은 정상 값입니다.
export const hasValue = (value) => value !== null && value !== undefined && value !== "";
export const numberText = (value) => hasValue(value) ? Number(value).toLocaleString("ko-KR") : null;
export const normalize = (value) => String(value ?? "").toLocaleLowerCase("ko-KR").replace(/\s+/g, "");

// 목록·상세 창에 표시할 수 있는 정상 캐릭터 데이터인지 확인합니다.
function isValidUnit(unit) {
  return !Array.isArray(unit)
    && typeof unit === "object"
    && unit !== null
    && typeof unit.name === "string"
    && unit.name.trim().length > 0;
}

// 숫자로만 구성된 ID 중 이름이 있는 정상 캐릭터 객체만 읽습니다.
// "4324-1" 같은 파생 ID, 배열 형식의 임시 데이터, 이름 없는 레코드는 제외합니다.
export function getCharacterIds() {
  return Object.keys(window.units ?? {})
    .filter((id) => {
      const unit = window.units[id];
      return /^\d+$/.test(id) && isValidUnit(unit);
    })
    .map(Number)
    .sort((left, right) => left - right);
}

// "4003-1", "4003-2"처럼 기본 번호에 연결된 형태 데이터를 순서대로 찾습니다.
export function getCharacterVariants(baseId) {
  const prefix = `${baseId}-`;
  return Object.keys(window.units ?? {})
    .filter((id) => id.startsWith(prefix) && /^\d+-\d+$/.test(id) && isValidUnit(window.units[id]))
    .sort((left, right) => Number(left.slice(prefix.length)) - Number(right.slice(prefix.length)));
}

export function classText(unit) {
  const classes = unit?.class ? (Array.isArray(unit.class) ? unit.class : [unit.class]) : [];
  return classes.length ? classes.map((item) => classLabels[item] ?? item).join(" · ") : null;
}

// "6+"처럼 강화 표기가 붙은 등급도 별 개수와 + 기호를 그대로 보여 줍니다.
function starText(stars) {
  if (!hasValue(stars)) return null;
  const matched = String(stars).match(/^(\d+)(\+)?$/);
  return matched ? `${"★".repeat(Number(matched[1]))}${matched[2] ?? ""}` : String(stars);
}

// 카드와 상세 창이 공통으로 쓰는 기본 표시 데이터를 만듭니다.
export function cardData(unit) {
  return {
    name: unit?.name ?? "정보 준비 중",
    attribute: unit?.type ?? null,
    classes: classText(unit),
    stars: starText(unit?.stars),
    cost: numberText(unit?.cost),
  };
}

// 이미지 폴더의 천·백 단위 하위 경로를 계산합니다.
function imageDirectory(id) {
  const baseId = Number(String(id).split("-")[0]);
  return {
    thousand: Math.floor(baseId / 1000),
    hundred: String(Math.floor((baseId % 1000) / 100) * 100).padStart(3, "0"),
  };
}

// GitHub Pages는 저장소 이름 아래에 사이트를 배포하므로, 온라인에서는 저장소 경로를 이미지 주소에 포함합니다.
function imageApiBase() {
  if (!window.location.hostname.endsWith("github.io")) return "../../api";
  const [repositoryName] = window.location.pathname.split("/").filter(Boolean);
  return `/${repositoryName}/api`;
}

export function thumbnailPath(id, region = "glo") {
  const { thousand, hundred } = imageDirectory(id);
  return `${imageApiBase()}/images/thumbnail/${region}/${thousand}/${hundred}/${padId(id)}.png`;
}

export function fullImagePath(id) {
  const { thousand, hundred } = imageDirectory(id);
  return `${imageApiBase()}/images/full/transparent/${thousand}/${hundred}/${padId(id)}.png`;
}

// 목록 썸네일을 먼저 글로벌 경로에서 불러오고, 없으면 일본판 경로를 시도합니다.
export function configureThumbnail(image, placeholder, id) {
  image.hidden = false;
  placeholder.hidden = true;
  image.dataset.region = "glo";
  image.src = thumbnailPath(id);
  image.alt = `${unitFor(id)?.name ?? `No.${padId(id)}`} 썸네일`;
  image.onerror = () => {
    if (image.dataset.region === "glo") {
      image.dataset.region = "jap";
      image.src = thumbnailPath(id, "jap");
      return;
    }
    image.hidden = true;
    placeholder.hidden = false;
  };
}

// 상세 창은 transparent 원본 이미지를 사용하며, 없을 때만 안내 영역을 보여 줍니다.
export function configureDetailImage(image, placeholder, id, fallbackId = id) {
  image.hidden = false;
  placeholder.hidden = true;
  image.dataset.usedFallback = "false";
  image.src = fullImagePath(id);
  image.alt = `${unitFor(id)?.name ?? `No.${padId(id)}`} 캐릭터 이미지`;
  image.onerror = () => {
    if (id !== fallbackId && image.dataset.usedFallback === "false") {
      image.dataset.usedFallback = "true";
      image.src = fullImagePath(fallbackId);
      image.alt = `${unitFor(fallbackId)?.name ?? `No.${padId(fallbackId)}`} 캐릭터 이미지`;
      return;
    }
    image.hidden = true;
    placeholder.hidden = false;
  };
}
