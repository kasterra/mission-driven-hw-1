import { initCalendar } from "./calendar.js";
import { showModal } from "./modal.js";
import { initResponsiveTextarea } from "./responsive-textarea.js";
import { initTimeInput } from "./time-input.js";

const formatKoreanYMD = (d) =>
  `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
export function initEventSchedule(root, addBtn) {
  // --- guards ---
  if (!(root instanceof HTMLElement) || !(addBtn instanceof HTMLElement))
    return;

  const template = root.querySelector(
    "template#event-schedule-section-template"
  );
  if (!template) {
    console.error("template이 없습니다!");
    return;
  }

  ensureInitialSection(root, template);
  addBtn.addEventListener("click", () => appendSection(root, template));
  root.addEventListener("click", delegatedRemoveHandler(root));
  root.addEventListener("click", delegatedCalendarOpenHandler);
  root.addEventListener("calendar:confirm", delegatedCalendarConfirmHandler);
  root.addEventListener("focusin", delegatedResponsiveTextareaInitHandler);
  root.addEventListener("focusin", delegatedTimeInputInitHandler);
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
