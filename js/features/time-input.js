// time-input.js (refactor)
// 초기값: 시작=오전 10:00, 종료=오전 11:00
// 규칙:
// - 시작 ≤ 종료 (24h 비교)
// - 시작 AM/PM 변경 시 종료 AM/PM도 동일하게 맞춤
// - 시작 시각(시/분) 변경 시 종료 = 시작 + 60분
// - 사용자가 종료를 시작보다 빠르게 입력하면 토스트 후 종료 = 시작 + 60분로 자동 수정

// ======================= Module-scope helpers ===============================
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const pad2 = (n) => String(n).padStart(2, "0");

const getAmpmBtn = (root, val) =>
  /** @type {HTMLElement|null} */ (
    root.querySelector(`.event-schedule__ampm__btn[data-value="${val}"]`)
  );
const getHourInput = (root) =>
  /** @type {HTMLInputElement|null} */ (
    root.querySelector(".event-schedule__hour .event-schedule__input")
  );
const getMinInput = (root) =>
  /** @type {HTMLInputElement|null} */ (
    root.querySelector(".event-schedule__minute .event-schedule__input")
  );

const getAmpm = (root) => {
  const am = getAmpmBtn(root, "AM");
  return am && am.getAttribute("aria-checked") === "true" ? "AM" : "PM";
};

const setAmpm = (root, val /* 'AM'|'PM' */) => {
  const am = getAmpmBtn(root, "AM");
  const pm = getAmpmBtn(root, "PM");
  if (!am || !pm) return;
  const on = val === "AM" ? am : pm;
  const off = val === "AM" ? pm : am;

  // ARIA state
  on.setAttribute("aria-checked", "true");
  off.setAttribute("aria-checked", "false");

  // Roving tabindex
  on.tabIndex = 0;
  off.tabIndex = -1;

  // Single-visible toggle
  on.hidden = false;
  off.hidden = true;
};

// 12h → minutes since 00:00 (same-day)
const toMinutes = (ampm, h, m) => {
  h = clamp(h, 1, 12);
  m = clamp(m, 0, 59);
  const isPM = ampm === "PM";
  let H = h % 12; // 12 → 0
  if (isPM) H += 12; // PM offset
  return H * 60 + m;
};

// minutes → {ampm,h,m} (12h)
const fromMinutes = (mins) => {
  mins = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
  const H = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = H < 12 ? "AM" : "PM";
  const h12 = H % 12 === 0 ? 12 : H % 12;
  return { ampm, h: h12, m };
};

const readPicker = (root) => {
  const ampm = getAmpm(root);
  const hourEl = getHourInput(root);
  const minEl = getMinInput(root);
  const h = hourEl ? parseInt(hourEl.value.replace(/\D+/g, ""), 10) || 0 : 0;
  const m = minEl ? parseInt(minEl.value.replace(/\D+/g, ""), 10) || 0 : 0;
  return { ampm, h: clamp(h, 1, 12), m: clamp(m, 0, 59) };
};

const writePicker = (root, ampm, h, m) => {
  setAmpm(root, ampm);
  const hourEl = getHourInput(root);
  const minEl = getMinInput(root);
  if (hourEl) hourEl.value = pad2(clamp(h, 1, 12));
  if (minEl) minEl.value = pad2(clamp(m, 0, 59));
};

const showToast = (msg) => {
  //TODO: 실제 토스트로 구현해야함
  alert(msg);
};

const syncEndToStartPlus1h = (startRoot, endRoot) => {
  const s = readPicker(startRoot);
  const sMin = toMinutes(s.ampm, s.h, s.m);
  const e = fromMinutes(sMin + 60);
  writePicker(endRoot, e.ampm, e.h, e.m);
};

const validateEndNotEarlier = (startRoot, endRoot) => {
  const s = readPicker(startRoot);
  const e = readPicker(endRoot);
  const sMin = toMinutes(s.ampm, s.h, s.m);
  const eMin = toMinutes(e.ampm, e.h, e.m);
  if (eMin < sMin) {
    showToast("시작 시간보다 종료시간은 빠를 수 없습니다.");
    syncEndToStartPlus1h(startRoot, endRoot);
    return false;
  }
  return true;
};

const wireInputs = (root, { onCommit }) => {
  const hourEl = getHourInput(root);
  const minEl = getMinInput(root);

  const sanitize = (el, max, min = 0) => {
    if (!el) return 0;
    const raw = el.value.replace(/\D+/g, "");
    const num = clamp(parseInt(raw || "0", 10), min, max);
    el.value = pad2(num);
    return num;
  };

  const onInput = () => {
    if (hourEl) hourEl.value = hourEl.value.replace(/[^\d]/g, "").slice(0, 2);
    if (minEl) minEl.value = minEl.value.replace(/[^\d]/g, "").slice(0, 2);
  };

  const onBlur = () => {
    sanitize(hourEl, 12, 1);
    sanitize(minEl, 59, 0);
    onCommit && onCommit();
  };

  hourEl && hourEl.addEventListener("input", onInput);
  minEl && minEl.addEventListener("input", onInput);
  hourEl && hourEl.addEventListener("blur", onBlur);
  minEl && minEl.addEventListener("blur", onBlur);
};

const wireAmpmToggle = (startRoot, endRoot) => {
  const group = startRoot.querySelector(".event-schedule__ampm");
  if (!group) return;
  const amBtn = getAmpmBtn(startRoot, "AM");
  const pmBtn = getAmpmBtn(startRoot, "PM");
  if (!amBtn || !pmBtn) return;

  // 초기: 한 버튼만 보이도록 (마크업의 hidden 유지)
  const current = amBtn.getAttribute("aria-checked") === "true" ? "AM" : "PM";
  setAmpm(startRoot, current);

  const toggle = () => {
    const cur = getAmpm(startRoot);
    const next = cur === "AM" ? "PM" : "AM";
    setAmpm(startRoot, next);
    // 종료 AM/PM도 동일하게 맞춤 + 종료 = 시작 + 1시간
    const s = readPicker(startRoot);
    setAmpm(endRoot, s.ampm);
    syncEndToStartPlus1h(startRoot, endRoot);
  };

  const onKeyDown = (e) => {
    const key = e.key;
    if (key === " " || key === "Enter") {
      e.preventDefault();
      toggle();
      return;
    }
    if (key === "ArrowLeft" || key === "ArrowRight") {
      e.preventDefault();
      toggle();
      return;
    }
    if (key === "Home") {
      e.preventDefault();
      if (getAmpm(startRoot) !== "AM") toggle();
      return;
    }
    if (key === "End") {
      e.preventDefault();
      if (getAmpm(startRoot) !== "PM") toggle();
      return;
    }
  };

  // 현재 보이는 버튼만 포커스가 가므로, 두 버튼 모두에 리스너 부착
  [amBtn, pmBtn].forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      toggle();
    });
    btn.addEventListener("keydown", onKeyDown);
  });
};

const wireAmpmToggleEnd = (endRoot, startRoot) => {
  const group = /** @type {HTMLElement|null} */ (
    endRoot.querySelector(".event-schedule__ampm")
  );
  if (!group) return;
  const amBtn = getAmpmBtn(endRoot, "AM");
  const pmBtn = getAmpmBtn(endRoot, "PM");
  if (!amBtn || !pmBtn) return;

  // 현재 상태에 맞춰 한 버튼만 보이도록 세팅
  const current = amBtn.getAttribute("aria-checked") === "true" ? "AM" : "PM";
  setAmpm(endRoot, current);

  const toggle = () => {
    const cur = getAmpm(endRoot);
    const next = cur === "AM" ? "PM" : "AM";
    setAmpm(endRoot, next);
    // 종료 AM/PM이 바뀌었을 때 규칙: 시작 ≤ 종료 유지
    validateEndNotEarlier(startRoot, endRoot);
  };

  const onKeyDown = (e) => {
    const key = e.key;
    if (key === " " || key === "Enter") {
      e.preventDefault();
      toggle();
      return;
    }
    if (key === "ArrowLeft" || key === "ArrowRight") {
      e.preventDefault();
      toggle();
      return;
    }
    if (key === "Home") {
      e.preventDefault();
      if (getAmpm(endRoot) !== "AM") toggle();
      return;
    }
    if (key === "End") {
      e.preventDefault();
      if (getAmpm(endRoot) !== "PM") toggle();
      return;
    }
  };

  [amBtn, pmBtn].forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      toggle();
    });
    btn.addEventListener("keydown", onKeyDown);
  });
};

// ======================= Public API ========================================
/**
 * @param {HTMLElement} startRoot  .event-schedule__time-picker (시작)
 * @param {HTMLElement} endRoot    .event-schedule__time-picker (종료)
 */
export function initTimeInput(startRoot, endRoot) {
  if (!(startRoot instanceof HTMLElement) || !(endRoot instanceof HTMLElement))
    return;
  if (
    startRoot.dataset.initialized === "true" &&
    endRoot.dataset.initialized === "true"
  )
    return;

  // 기본값 세팅 (AM 10:00 ~ AM 11:00)
  writePicker(startRoot, "AM", 10, 0);
  writePicker(endRoot, "AM", 11, 0);

  // AM/PM 토글: 시작에서만 제어 → 종료에 자동 반영
  wireAmpmToggle(startRoot, endRoot);
  wireAmpmToggleEnd(endRoot, startRoot);

  // 입력 필드: 시작 변경 → 종료 = 시작+1h, 종료 변경 → 검증
  wireInputs(startRoot, {
    onCommit: () => syncEndToStartPlus1h(startRoot, endRoot),
  });
  wireInputs(endRoot, {
    onCommit: () => validateEndNotEarlier(startRoot, endRoot),
  });

  startRoot.dataset.initialized = "true";
  endRoot.dataset.initialized = "true";
}
