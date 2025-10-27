/**
 * sub-image-input 컴포넌트를 위한 기능 모듈 JS 입니다. *
 * @param {HTMLElement} root
 */
export function initSubImageInput(root) {
  if (!(root instanceof HTMLElement)) return;

  /** @type {File[]} */
  let files = [];
  const MAX = 4;

  /** @type {HTMLInputElement|null} */
  const input = root.querySelector('input[type="file"]');
  /** @type {HTMLTemplateElement|null} */
  const tpl = root.querySelector("template.sub-image-placeholder");
  if (!input || !tpl) return;

  // 안전한 기본값 보강
  if (!input.accept) input.accept = ".jpg,.jpeg,.png,image/jpeg,image/png";
  input.hidden = true;
  input.multiple = true;

  // 초기 상태: 아무 이미지도 없으면 플레이스홀더 1개 렌더
  render();

  input.addEventListener("change", () => {
    const picked = Array.from(input.files || []);
    input.value = "";
    if (picked.length === 0) return;

    // 유효한 파일만 남기고 최대 4장으로 제한 (이 구현은 "덮어쓰기" 정책)
    files = picked.filter(isValidFile).slice(0, MAX);
    render();
  });

  /** 렌더 함수: 현재 files를 기반으로 아이템 및 플레이스홀더 구성 */
  function render() {
    // 기존 아이템 제거
    root
      .querySelectorAll(".sub-image-input__item")
      .forEach((el) => el.remove());

    // 파일 미리보기 아이템 렌더
    files.forEach((file) => {
      const node = /** @type {HTMLElement} */ (
        tpl.content.firstElementChild.cloneNode(true)
      );
      const img = /** @type {HTMLImageElement} */ (node.querySelector("img"));
      img.classList.remove("sub-image-input__placeholder");
      img.classList.add("sub-image-input__img");
      const url = URL.createObjectURL(file);
      img.src = url;
      img.alt = file.name || "선택한 이미지";
      img.onload = () => URL.revokeObjectURL(url);

      // 어떤 아이템이든 클릭하면 파일 입력 열기
      attachPickHandler(node);
      root.appendChild(node);
    });

    // 파일이 0개면 플레이스홀더 1개, 1~3개면 플레이스홀더 1개 추가, 4개면 추가 없음
    if (files.length < MAX) {
      const placeholder = /** @type {HTMLElement} */ (
        tpl.content.firstElementChild.cloneNode(true)
      );
      attachPickHandler(placeholder);
      root.appendChild(placeholder);
    }
  }

  /** 아이템 클릭 시 파일 선택창 열기 */
  /** @param {HTMLElement} el */
  function attachPickHandler(el) {
    el.setAttribute("role", "button");
    el.tabIndex = 0;
    el.addEventListener("click", () => input.click());
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        input.click();
      }
    });
  }

  /** 파일 기본 검증: 타입/용량 */
  /** @param {File} file @returns {boolean} */
  function isValidFile(file) {
    const okType =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      /\.(jpe?g|png)$/i.test(file.name);
    if (!okType) return false;
    const okSize = file.size <= 15 * 1024 * 1024; // 15MB
    return okSize;
  }
}
