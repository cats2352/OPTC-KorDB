// 시스템 테마를 기본값으로 사용하고, 사용자가 고른 테마는 다음 방문에도 유지합니다.
(() => {
  const storageKey = "optc-db-theme";
  const getSavedTheme = () => {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  };
  const getSystemTheme = () => window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

  const applyTheme = (theme) => {
    const isDark = theme === "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", String(isDark));
      button.setAttribute("aria-label", isDark ? "라이트 모드로 전환" : "다크 모드로 전환");
      const label = button.querySelector("[data-theme-label]");
      if (label) label.textContent = isDark ? "라이트 모드" : "다크 모드";
      const icon = button.querySelector("[data-theme-icon]");
      if (icon) icon.textContent = isDark ? "☀" : "☾";
    });
  };

  const initialTheme = getSavedTheme() || getSystemTheme();
  applyTheme(initialTheme);
  window.optcTheme = { applyTheme };

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        try { localStorage.setItem(storageKey, nextTheme); } catch { /* 저장을 지원하지 않는 환경에서는 현재 화면에만 적용합니다. */ }
        applyTheme(nextTheme);
      });
    });
  });
})();
