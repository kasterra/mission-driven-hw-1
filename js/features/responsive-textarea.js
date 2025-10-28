/**
 * responsive-textarea 컴포넌트를 위한 기능 모듈 JS 입니다.
 * @param {HTMLElement} root
 * @param {number} [minChars=8]
 * @param {number} [maxChars=80]
 */

export function initResponsiveTextarea(root, minChars = 8, maxChars = 80) {
  if (!(root instanceof HTMLElement)) return;
  /** @type {HTMLTextAreaElement | null} */
  const textarea = root.querySelector(".responsive-textarea__textarea");
  const charCounter = root.querySelector(".responsive-textarea__char-counter");
  const help = root.querySelector(".responsive-textarea__tooltip");
  if (!textarea || !charCounter || !help) return;

  textarea.maxLength = maxChars;

  function update() {
    let length = textarea.value.length;

    const newValue = textarea.value.replace(/( {2,}|\n{2,})/g, (match) => {
      if (match[0] === " ") return " ";
      if (match[0] === "\n") return "\n";
      return match[0];
    });

    if (newValue !== textarea.value) {
      textarea.value = newValue;
      length = textarea.value.length;
    }

    if (length > maxChars) {
      textarea.value = textarea.value.slice(0, maxChars);
      length = maxChars;
    }

    if (length < minChars) {
      root.classList.add("responsive-textarea--red");
      root.classList.remove("responsive-textarea--green");
      help.textContent = `최소 ${minChars}자 이상 입력해주세요.`;
    } else if (length >= minChars && length < maxChars) {
      root.classList.remove("responsive-textarea--red");
      root.classList.add("responsive-textarea--green");
      help.textContent = "";
    } else {
      root.classList.remove("responsive-textarea--red");
      root.classList.add("responsive-textarea--green");
      help.textContent = "";
    }

    charCounter.textContent = `${length} / ${maxChars}자 (최소 ${minChars}자)`;
  }

  textarea.addEventListener("input", update);
}
