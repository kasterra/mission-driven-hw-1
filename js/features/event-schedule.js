import { initCalendar } from "./calendar.js";
import { showModal } from "./modal.js";
import { initResponsiveTextarea } from "./responsive-textarea.js";
import { initTimeInput } from "./time-input.js";

const formatKoreanYMD = (d) =>
  `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;

function debounce(fn, ms = 200) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore quota or serialization errors
  }
}

/**
 * UI만 초기화(섹션 보장 + 리스너 부착). 저장/복원 책임 없음.
 */
export function setupEventSchedule(root, addBtn) {
  if (!(root instanceof HTMLElement) || !(addBtn instanceof HTMLElement))
    return;
  const template = root.querySelector(
    "template#event-schedule-section-template"
  );
  if (!template) {
    console.error("template이 없습니다!");
    return;
  }
  // 초기 섹션 보장
  ensureInitialSection(root, template);
  // 버튼 및 각종 리스너 부착
  addBtn.addEventListener("click", () => appendSection(root, template));
  root.addEventListener("click", delegatedRemoveHandler(root));
  root.addEventListener("click", delegatedCalendarOpenHandler);
  root.addEventListener("calendar:confirm", delegatedCalendarConfirmHandler);
  root.addEventListener("focusin", delegatedResponsiveTextareaInitHandler);
  root.addEventListener("focusin", delegatedTimeInputInitHandler);
  // 변경 이벤트 전파(상위에서 구독)
  root.addEventListener("input", () => emitChange(root));
  root.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest(".event-schedule__section-x-btn")) return; // remove에서 emit
    if (t.closest(".calendar-head__btn")) return; // 날짜 네비는 제외
    if (t.closest(".calendar-cta-btn")) return; // confirm에서 emit
    if (t.closest(".event-schedule__ampm__btn")) emitChange(root);
  });
}

/**
 * 저장된 데이터를 이용해 UI를 복원한다. (현재 섹션들을 대체)
 * 데이터가 없으면 아무 작업도 하지 않는다.
 */
export function restoreEventSchedule(root, data) {
  if (!(root instanceof HTMLElement)) return;
  const template = root.querySelector(
    "template#event-schedule-section-template"
  );
  if (!template) {
    console.error("template이 없습니다!");
    return;
  }
  if (Array.isArray(data) && data.length > 0) {
    hydrateEventSchedule(root, template, data);
  }
}

/**
 * 변경 이벤트를 구독한다. 핸들러는 직렬화된 데이터 배열을 인자로 받는다.
 * 반환값은 구독 해제 함수.
 */
export function subscribeEventScheduleChange(root, handler) {
  if (!(root instanceof HTMLElement)) return () => {};
  const fn = (e) => {
    const data = e?.detail?.data ?? serializeEventSchedule(root);
    try {
      handler(data);
    } catch (err) {
      console.error(err);
    }
  };
  root.addEventListener("event-schedule:change", fn);
  return () => root.removeEventListener("event-schedule:change", fn);
}

/**
 * UI 초기화 + 로컬스토리지 기반의 복원/백업까지 한 번에 연결하는 편의 함수.
 * index.js에는 최소한의 노출만 하도록 캡슐화한다.
 * 반환값: { unsubscribe }
 */
export function mountEventScheduleWithLocalStorage({
  root,
  addBtn,
  storageKey = "event-schedule",
  debounceMs = 200,
}) {
  if (!(root instanceof HTMLElement) || !(addBtn instanceof HTMLElement))
    return { unsubscribe: () => {} };
  // 1) UI 초기화
  setupEventSchedule(root, addBtn);
  // 2) 복원
  const initial = loadFromStorage(storageKey);
  if (initial) restoreEventSchedule(root, initial);
  // 3) 변경 구독 → 저장
  const debouncedSave = debounce(
    (data) => saveToStorage(storageKey, data),
    debounceMs
  );
  const unsubscribe = subscribeEventScheduleChange(root, (data) =>
    debouncedSave(data)
  );
  return { unsubscribe };
}

function ensureInitialSection(root, template) {
  if (!root.querySelector(".event-schedule__section")) {
    appendSection(root, template);
  } else {
    renumberAndToggleX(root);
  }
}

function appendSection(root, template) {
  const li = createSection(template);
  if (!li) {
    console.error("createSection이 올바른 값을 리턴하지 않았습니다");
    return;
  }
  root.append(li);
  renumberAndToggleX(root);
  emitChange(root);
}

/**
 * @param {DocumentFragment} template
 * @returns {HTMLElement | null}
 */
function createSection(template) {
  const frag = template.content.cloneNode(true);
  return frag.querySelector(".event-schedule__section");
}

function renumberAndToggleX(root) {
  const sections = Array.from(
    root.querySelectorAll(".event-schedule__section")
  );
  const showDelete = sections.length >= 2;

  // single section: title = "회차 정보" and hide X
  if (sections.length === 1) {
    const li = sections[0];
    const titleEl = li.querySelector(":scope > .event-schedule__session-title");
    if (titleEl) titleEl.textContent = "회차 정보";
    const xBtn = li.querySelector(".event-schedule__section-x-btn");
    if (xBtn) xBtn.hidden = true;
    return;
  }

  // two or more: number titles and show X
  sections.forEach((li, idx) => {
    const titleEl = li.querySelector(":scope > .event-schedule__session-title");
    if (titleEl) titleEl.textContent = `${idx + 1}회차 정보`;
    const xBtn = li.querySelector(".event-schedule__section-x-btn");
    if (xBtn) xBtn.hidden = !showDelete;
  });
}

function delegatedRemoveHandler(root) {
  return async (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const xBtn = target.closest(".event-schedule__section-x-btn");
    if (!xBtn) return;
    const result = await showModal(
      "작성된 내용을 삭제하시겠어요?",
      "삭제한 내용은 복구할 수 없습니다.",
      "취소",
      "삭제하기"
    );
    if (result !== "confirm") return;
    const li = xBtn.closest(".event-schedule__section");
    if (!li) return;
    li.remove();
    emitChange(root);
    renumberAndToggleX(root);
  };
}

function delegatedCalendarOpenHandler(e) {
  const t = e.target;
  if (!(t instanceof Element)) return;
  // Open when clicking the calendar text or its container
  const trigger = t.closest(
    ".event-schedule__session-info-content, .event-schedule__calendar-text"
  );
  if (!trigger) return;
  const section = trigger.closest(".event-schedule__section");
  if (!section) return;
  const calendar = section.querySelector(".calendar");
  if (!calendar) return;

  // Compute bounds from adjacent sessions (exclusive)
  const prev = section.previousElementSibling;
  const next = section.nextElementSibling;

  // Prefer reading adjacent sessions' persisted data-date-ymd, fallback to parsing localized text
  const parseYmd = (ymd) => {
    if (!ymd) return null;
    const [y, m, d] = String(ymd).split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };
  const parseKoreanYMD = (text) => {
    const m = String(text)
      .trim()
      .match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };
  const pickBox = (el) => el?.querySelector?.(".event-schedule__calendar-text");
  const prevBox = pickBox(prev);
  const nextBox = pickBox(next);
  const prevDate = prev
    ? parseYmd(prev?.dataset?.dateYmd) ||
      parseKoreanYMD(prevBox?.textContent || "")
    : null;
  const nextDate = next
    ? parseYmd(next?.dataset?.dateYmd) ||
      parseKoreanYMD(nextBox?.textContent || "")
    : null;

  // Init once per calendar element (must come BEFORE setting bounds)
  if (!calendar.dataset.initialized) {
    initCalendar(calendar);
    calendar.dataset.initialized = "true";
  }

  // Build exclusive bounds: (prevDate, nextDate)
  const detail = { min: prevDate, max: nextDate };
  calendar.dispatchEvent(
    new CustomEvent("calendar:set-bounds", { detail, bubbles: false })
  );

  // Show calendar
  calendar.hidden = false;
}

function delegatedCalendarConfirmHandler(e) {
  // e.target is the calendar root emitting the event
  const calendarRoot =
    e.target && e.target.closest && e.target.closest(".calendar");
  if (!calendarRoot) return;
  const section = calendarRoot.closest(".event-schedule__section");
  if (!section) return;
  const box = section.querySelector(
    ".event-schedule__session-info-content .event-schedule__calendar-text"
  );
  if (!box) return;
  const detail = e.detail || {};
  let display = "";
  if (detail.date instanceof Date && !Number.isNaN(detail.date.getTime())) {
    display = formatKoreanYMD(detail.date);
  } else {
    display = "문제가 발생하였습니다";
  }
  if (display) {
    box.textContent = display; // reflect selected date in Korean format
    box.classList.remove("event-schedule__calendar-text--placeholder");
  }
  // Persist ISO-like ymd for robust parsing later (bounds)
  if (detail.ymd) {
    section.dataset.dateYmd = String(detail.ymd);
  } else if (
    detail.date instanceof Date &&
    !Number.isNaN(detail.date.getTime())
  ) {
    const y = detail.date.getFullYear();
    const m = `${detail.date.getMonth() + 1}`.padStart(2, "0");
    const d = `${detail.date.getDate()}`.padStart(2, "0");
    section.dataset.dateYmd = `${y}-${m}-${d}`;
  }
  // notify outer to persist
  emitChange(section.closest(".event-schedule"));
  // Hide calendar after confirm
  calendarRoot.hidden = true;
}

function delegatedResponsiveTextareaInitHandler(e) {
  const t = e.target;
  if (!(t instanceof Element)) return;
  const area = t.closest(".responsive-textarea");
  if (!area || area.dataset.initialized) return;
  initResponsiveTextarea(area, 8, 800);
  area.dataset.initialized = "true";
}

function delegatedTimeInputInitHandler(e) {
  const t = e.target;
  if (!(t instanceof Element)) return;
  const timePicker = t.closest(".event-schedule__time-picker");
  if (!timePicker) return;
  const section = timePicker.closest(".event-schedule__section");
  if (!section || section.dataset.timeInitialized === "true") return;
  const pickers = section.querySelectorAll(".event-schedule__time-picker");
  if (pickers.length < 2) return;
  const startRoot = pickers[0];
  const endRoot = pickers[1];
  initTimeInput(startRoot, endRoot);
  section.dataset.timeInitialized = "true";
}

/**
 * Serialize current UI state into plain data that can be saved to storage.
 * @param {HTMLElement} root
 * @returns {Array<{dateYmd:string|null,start:{ampm:string,hour:string,minute:string},end:{ampm:string,hour:string,minute:string},desc:string}>}
 */
export function serializeEventSchedule(root) {
  if (!(root instanceof HTMLElement)) return [];
  const sections = Array.from(
    root.querySelectorAll(".event-schedule__section")
  );
  return sections.map((li) => {
    const dateYmd = li.dataset.dateYmd || null;

    // start time
    const [startPicker, endPicker] = li.querySelectorAll(
      ".event-schedule__time-picker"
    );
    const pick = (picker) => {
      if (!picker) return { ampm: "AM", hour: "", minute: "" };
      const ampmBtns = picker.querySelectorAll(".event-schedule__ampm__btn");
      const ampm =
        Array.from(ampmBtns).find(
          (b) => b.getAttribute("aria-checked") === "true"
        )?.dataset?.value || "AM";
      const hour =
        picker
          .querySelector(".event-schedule__hour .event-schedule__input")
          ?.value?.trim() || "";
      const minute =
        picker
          .querySelector(".event-schedule__minute .event-schedule__input")
          ?.value?.trim() || "";
      return { ampm, hour, minute };
    };

    const start = pick(startPicker);
    const end = pick(endPicker);

    const desc = li.querySelector("textarea#session-desc")?.value ?? "";

    return { dateYmd, start, end, desc };
  });
}

/**
 * Hydrate UI from saved plain data.
 * NOTE: This replaces all current sections with the provided data.
 * @param {HTMLElement} root
 * @param {HTMLTemplateElement} template
 * @param {Array} data
 */
function hydrateEventSchedule(root, template, data) {
  // remove existing sections
  Array.from(root.querySelectorAll(".event-schedule__section")).forEach((el) =>
    el.remove()
  );

  data.forEach((session) => {
    const li = createSection(template);
    if (!li) return;
    fillSection(li, session);
    root.append(li);
  });
  renumberAndToggleX(root);
  emitChange(root);
}

/**
 * Fill a single section's controls using a session data object.
 * @param {HTMLElement} li
 * @param {{dateYmd?:string,start?:{ampm?:string,hour?:string,minute?:string},end?:{ampm?:string,hour?:string,minute?:string},desc?:string}} session
 */
function fillSection(li, session = {}) {
  // date
  const ymd = session.dateYmd || null;
  if (ymd) {
    const [y, m, d] = String(ymd)
      .split("-")
      .map((n) => parseInt(n, 10));
    if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
      const dt = new Date(y, (m || 1) - 1, d || 1);
      const box = li.querySelector(".event-schedule__calendar-text");
      if (box) {
        box.textContent = formatKoreanYMD(dt);
        box.classList.remove("event-schedule__calendar-text--placeholder");
      }
      li.dataset.dateYmd = `${String(y).padStart(4, "0")}-${String(m).padStart(
        2,
        "0"
      )}-${String(d).padStart(2, "0")}`;
    }
  }

  // time helpers
  const applyTime = (picker, t) => {
    if (!picker || !t) return;
    const am = picker.querySelector(
      '.event-schedule__ampm__btn[data-value="AM"]'
    );
    const pm = picker.querySelector(
      '.event-schedule__ampm__btn[data-value="PM"]'
    );
    const wantPM = String(t.ampm).toUpperCase() === "PM";

    // reflect checked state and toggle visibility (single-button view)
    if (am && pm) {
      am.setAttribute("aria-checked", wantPM ? "false" : "true");
      pm.setAttribute("aria-checked", wantPM ? "true" : "false");
      am.hidden = wantPM;
      pm.hidden = !wantPM;
    }

    const hourEl = picker.querySelector(
      ".event-schedule__hour .event-schedule__input"
    );
    const minEl = picker.querySelector(
      ".event-schedule__minute .event-schedule__input"
    );
    if (hourEl) hourEl.value = (t.hour ?? "").toString().padStart(2, "0");
    if (minEl) minEl.value = (t.minute ?? "").toString().padStart(2, "0");
  };

  const pickers = li.querySelectorAll(".event-schedule__time-picker");
  applyTime(pickers[0], session.start);
  applyTime(pickers[1], session.end);

  // desc
  const ta = li.querySelector("textarea#session-desc");
  if (ta && typeof session.desc === "string") {
    ta.value = session.desc;
  }
}

/**
 * Dispatch a change event with the serialized data for outer persistence.
 * @param {HTMLElement} root
 */
function emitChange(root) {
  if (!(root instanceof HTMLElement)) return;
  const data = serializeEventSchedule(root);
  root.dispatchEvent(
    new CustomEvent("event-schedule:change", {
      detail: { data },
      bubbles: true,
    })
  );
}
