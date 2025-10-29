import { showToast } from "../features/toast.js";

const grid = document.querySelector(".category-container__grid");
const items = Array.from(
  grid?.querySelectorAll(".category-container__grid-item") ?? []
);
const nextBtn = document.querySelector(".header-cta-btn");
const footerCTA = document.querySelector(".footer-cta-btn");
const exitLink = document.querySelector(".header-left-btn");
const mobileExit = document.querySelector(".header-left-mobile-btn");

// 유틸
const norm = (s) => String(s ?? "").trim();

function getSelectedItems() {
  return items.filter((el) => el.dataset.selected === "true");
}

function getSelectedNames() {
  return getSelectedItems().map((el) => norm(el.textContent));
}

function setSelected(el, on) {
  if (!el) return;
  el.dataset.selected = on ? "true" : "false";
  el.classList.toggle("active", !!on);
  el.setAttribute("aria-pressed", on ? "true" : "false");
}

function updateNextCta() {
  const selectedCount = getSelectedItems().length;
  const enabled = selectedCount >= 1;
  if (nextBtn) {
    nextBtn.disabled = !enabled;
    nextBtn.setAttribute("aria-disabled", String(!enabled));
  }
  if (footerCTA) {
    footerCTA.disabled = !enabled;
    footerCTA.setAttribute("aria-disabled", String(!enabled));
  }
}

function handleSelect(el) {
  const already = el.dataset.selected === "true";
  const selectedCount = getSelectedItems().length;

  if (!already && selectedCount >= 2) {
    // 최대 2개 제한
    showToast("최대 2개까지만 선택 가능해요");
    return;
  }

  setSelected(el, !already);
  updateNextCta();
}

// Hover(마우스 진입 시 더 진한 톤, 진출 시 복원)
function attachHoverTone(el) {
  el.addEventListener("mouseenter", () => {
    // 선택된 경우 더 진하게
    const selected = el.dataset.selected === "true";
    el.style.filter = selected ? "brightness(0.85)" : "brightness(0.92)";
  });
  el.addEventListener("mouseleave", () => {
    el.style.filter = "";
  });
}

// 접근성/키보드 토글 (Enter/Space)
function attachKeyboardToggle(el) {
  el.setAttribute("role", "button");
  el.tabIndex = 0;
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelect(el);
    }
  });
}

function parseSelectedFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const selected = params.get("selected");
  if (!selected) return [];
  return selected.split(",").map(norm).filter(Boolean);
}

function restoreFromQuery() {
  const selectedNames = new Set(parseSelectedFromQuery());
  items.forEach((el) => {
    const on = selectedNames.has(norm(el.textContent));
    setSelected(el, on);
  });
}

function handleCTAClick(e) {
  e.preventDefault();
  if (getSelectedItems().length < 1) {
    showToast?.("카테고리를 1개 이상 선택해주세요.");
    return;
  }
  redirectWithSelected();
}

function redirectWithSelected() {
  const names = getSelectedNames();
  const qs = new URLSearchParams({ selected: names.join(",") });
  const base = "./index.html";
  window.location.href = `${base}?${qs.toString()}`;
}

function goBackToMain() {
  // 이전 화면으로 복귀 (히스토리가 없으면 index.html로)
  if (history.length > 1) {
    history.back();
  } else {
    window.location.href = "./index.html";
  }
}

function init() {
  if (!grid || items.length === 0) return;

  // 초기 바인딩
  items.forEach((el) => {
    el.addEventListener("click", () => handleSelect(el));
    attachHoverTone(el);
    attachKeyboardToggle(el);
    // 초기 상태
    setSelected(el, el.dataset.selected === "true");
  });

  // 저장 후 복귀
  if (nextBtn) {
    nextBtn.addEventListener("click", handleCTAClick);
  }
  if (footerCTA) {
    footerCTA.addEventListener("click", handleCTAClick);
  }

  // '나가기' 클릭 시 현재 쿼리파라미터를 그대로 유지하여 index.html로 이동
  if (exitLink) {
    try {
      const currentSearch = window.location.search || "";
      const href = exitLink.getAttribute("href") || "/index.html";
      const url = new URL(href, window.location.origin);
      // 현재 쿼리를 그대로 전달 (병합 아님)
      url.search = currentSearch;
      exitLink.setAttribute("href", url.pathname + url.search);
    } catch {
      // URL 생성 실패 시 폴백
      if (window.location.search) {
        exitLink.setAttribute("href", "/index.html" + window.location.search);
      }
    }
  }

  if (mobileExit) {
    try {
      const currentSearch = window.location.search || "";
      const href = mobileExit.getAttribute("href") || "/index.html";
      const url = new URL(href, window.location.origin);
      // 현재 쿼리를 그대로 전달 (병합 아님)
      url.search = currentSearch;
      mobileExit.setAttribute("href", url.pathname + url.search);
    } catch {
      // URL 생성 실패 시 폴백
      if (window.location.search) {
        mobileExit.setAttribute("href", "/index.html" + window.location.search);
      }
    }
  }

  // 저장된 상태 복원 → CTA 갱신
  restoreFromQuery();
  updateNextCta();
}

// DOM 준비 즉시 실행
init();
