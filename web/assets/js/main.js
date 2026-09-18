(() => {
  const config = window.SITE_CONFIG || {};
  const databaseButton = document.querySelector("#database-button");
  const databaseNotice = document.querySelector("#database-notice");
  const dialogClose = document.querySelector(".dialog-close");
  const banner = document.querySelector("#site-banner");
  const bannerKicker = document.querySelector("#banner-kicker");
  const bannerTitle = document.querySelector("#banner-title");
  const currentYear = document.querySelector("#current-year");

  currentYear.textContent = new Date().getFullYear();

  databaseButton.addEventListener("click", () => {
    if (config.databaseUrl) {
      window.location.href = config.databaseUrl;
      return;
    }

    databaseNotice.showModal();
  });

  dialogClose.addEventListener("click", () => databaseNotice.close());

  databaseNotice.addEventListener("click", (event) => {
    if (event.target === databaseNotice) {
      databaseNotice.close();
    }
  });

  const bannerConfig = config.banner || {};
  bannerKicker.textContent = bannerConfig.kicker || "FEATURED / NOTICE";
  bannerTitle.textContent = bannerConfig.title || "새로운 소식을 위한 배너 영역";

  if (bannerConfig.linkUrl) {
    banner.href = bannerConfig.linkUrl;
    banner.target = "_blank";
    banner.rel = "noreferrer";
  } else {
    banner.removeAttribute("href");
  }

  if (bannerConfig.imageUrl) {
    const image = new Image();
    image.onload = () => {
      const safeUrl = bannerConfig.imageUrl.replace(/"/g, "%22");
      banner.style.setProperty("--banner-image", `url("${safeUrl}")`);
      banner.classList.add("has-image");
      banner.setAttribute("aria-label", bannerConfig.imageAlt || bannerConfig.title || "배너");
    };
    image.src = bannerConfig.imageUrl;
  }
})();
