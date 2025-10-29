// category-display.js
// URL 쿼리(?selected=글쓰기%2F독서,건강%2F운동)를 내부에서 파싱해
// placeholder에 단순 텍스트로 표시하고,
// 클릭 시 선택 페이지로 이동할 때도 동일한 쿼리를 전달한다.

function parseSelectedFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("selected");
  if (!raw) return [];
  // URLSearchParams가 디코딩을 수행하므로 split만 해주면 됨
  return raw
    .split(",")
    .map((s) => String(s || "").trim())
    .filter(Boolean);
}

function renderSelectedText(root, names) {
  const placeholder = root.querySelector(".category-display__placeholder");
  if (!placeholder) return;
  const has = Array.isArray(names) && names.length > 0;
  if (!has) {
    return;
  }
  placeholder.textContent = names.join(", ");
  placeholder.classList.replace(
    "category-display__placeholder",
    "category-display__category"
  );
  root.classList.toggle("is-selected", has);
}

export function initCategoryDisplay(root) {
  if (!(root instanceof HTMLElement)) return;

  // 1) 현재 URL에서 선택값 복원 & 표시
  const selected = parseSelectedFromQuery();
  renderSelectedText(root, selected);

  // 2) 클릭 시 카테고리 선택 페이지로 이동(선택값 유지 전달)
  const base = root.dataset?.href || "/category.html";
  root.addEventListener("click", (e) => {
    // a[href] 기본 동작 대신 명시적으로 라우팅
    e.preventDefault();
    const qs = new URLSearchParams();
    if (selected.length) qs.set("selected", selected.join(","));
    const href = qs.toString() ? `${base}?${qs.toString()}` : base;
    window.location.href = href;
  });
}
