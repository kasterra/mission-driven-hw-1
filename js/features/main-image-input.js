import { showToast } from "./toast.js";
import { isValidImage } from "../util/image.js";

const MAIN_IMAGE_STORAGE_KEY = "main-image";
function saveMainImageToStorage(dataUrl) {
  try {
    localStorage.setItem(MAIN_IMAGE_STORAGE_KEY, dataUrl);
  } catch {
    // ignore quota / serialization errors
  }
}
function loadMainImageFromStorage() {
  try {
    return localStorage.getItem(MAIN_IMAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}
function clearMainImageFromStorage() {
  try {
    localStorage.removeItem(MAIN_IMAGE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * main-image-input 컴포넌트를 위한 기능 모듈 JS 입니다.
 * @param {HTMLElement} root
 */
export function initMainImageInput(root) {
  if (!(root instanceof HTMLElement)) return;
  /** @type {HTMLInputElement|null} */
  const input = root.querySelector('input[type="file"]');
  const img = /** @type {HTMLImageElement} */ (root.querySelector("img"));
  if (!input || !img) return;

  img.addEventListener("click", () => input.click());

  // Hydrate from localStorage (Base64 data URL)
  const saved = loadMainImageFromStorage();
  if (saved) {
    img.src = saved;
    img.hidden = false;
    img.ariaHidden = false;
    const placeholder = root.querySelector(".main-image-input__placeholder");
    if (placeholder) {
      placeholder.hidden = true;
      placeholder.ariaHidden = true;
    }
  }

  function handleInputChange() {
    const picked = input.files?.[0];
    if (!picked) {
      // cleared by user
      clearMainImageFromStorage();
      root.dispatchEvent(
        new CustomEvent("main-image-input:change", {
          detail: { dataUrl: null },
          bubbles: true,
        })
      );
      return;
    }
    if (!isValidImage(picked)) {
      showToast("이미지가 올바르지 않거나 너무 큽니다");
      // keep previous image if any; do not clear storage
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) return;
      img.src = dataUrl;
      img.hidden = false;
      img.ariaHidden = false;
      saveMainImageToStorage(dataUrl);
      const placeholder = root.querySelector(".main-image-input__placeholder");
      if (placeholder) {
        placeholder.hidden = true;
        placeholder.ariaHidden = true;
      }
      root.dispatchEvent(
        new CustomEvent("main-image-input:change", {
          detail: { dataUrl },
          bubbles: true,
        })
      );
    };
    reader.readAsDataURL(picked);
  }

  input.addEventListener("change", handleInputChange);
}
