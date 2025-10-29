import { isValidImage } from "../util/image.js";

const SUB_IMAGES_STORAGE_KEY = "sub-images";
function loadSubImages() {
  try {
    const raw = localStorage.getItem(SUB_IMAGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((s) => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}
function saveSubImages(list) {
  try {
    localStorage.setItem(SUB_IMAGES_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore quota errors
  }
}
function clearSubImages() {
  try {
    localStorage.removeItem(SUB_IMAGES_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * sub-image-input 컴포넌트를 위한 기능 모듈 JS 입니다. *
 * @param {HTMLElement} root
 */
export function initSubImageInput(root) {
  if (!(root instanceof HTMLElement)) return;

  /** @type {string[]} data URLs */
  let images = loadSubImages();
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

  input.addEventListener("change", async () => {
    const picked = Array.from(input.files || []);
    input.value = "";
    if (picked.length === 0) return;
    // 유효한 파일만 남기고 최대 4장으로 제한 (덮어쓰기 정책)
    const valid = picked.filter(isValidImage).slice(0, MAX);
    if (valid.length === 0) {
      // 유효 파일이 없으면 기존 상태 유지
      render();
      return;
    }
    // FileList -> Base64(Data URL) 배열로 변환
    const toDataUrl = (file) =>
      new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () =>
          resolve(typeof fr.result === "string" ? fr.result : "");
        fr.readAsDataURL(file);
      });
    const dataUrls = (await Promise.all(valid.map(toDataUrl))).filter(Boolean);
    // 상태 업데이트: 새로 고른 이미지로 덮어쓰기
    images = dataUrls.slice(0, MAX);
    if (images.length === 0) {
      clearSubImages();
    } else {
      saveSubImages(images);
    }
    render();
  });

  function render() {
    // 기존 아이템 제거
    root
      .querySelectorAll(".sub-image-input__item")
      .forEach((el) => el.remove());

    // 데이터 URL 기반 이미지 아이템 렌더
    images.forEach((dataUrl, idx) => {
      const node = /** @type {HTMLElement} */ (
        tpl.content.firstElementChild.cloneNode(true)
      );
      const img = /** @type {HTMLImageElement} */ (node.querySelector("img"));
      img.classList.remove("sub-image-input__placeholder");
      img.classList.add("sub-image-input__img");
      img.src = dataUrl;
      img.alt = `선택한 이미지 ${idx + 1}`;

      // 어떤 아이템이든 클릭하면 파일 입력 열기
      attachPickHandler(node);
      root.appendChild(node);
    });

    // 파일이 0개면 플레이스홀더 1개, 1~3개면 플레이스홀더 1개 추가, 4개면 추가 없음
    if (images.length < MAX) {
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
}
