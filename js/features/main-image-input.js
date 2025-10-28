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

  function handleInputChange() {
    const picked = input.files?.[0];
    if (!picked) return;
    const url = URL.createObjectURL(picked);
    img.src = url;
    console.log(url);
    img.onload = () => URL.revokeObjectURL(url);
    img.hidden = false;
    img.ariaHidden = false;
    const placeholder = root.querySelector(".main-image-input__placeholder");
    placeholder.hidden = true;
    placeholder.ariaHidden = true;
  }

  input.addEventListener("change", handleInputChange);
}
