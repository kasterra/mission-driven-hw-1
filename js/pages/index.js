import { initMainImageInput } from "../features/main-image-input.js";
import { initResponsiveTextarea } from "../features/responsive-textarea.js";
import { initSubImageInput } from "../features/sub-image-input.js";
import { initActivityTypeSelector } from "../features/activity-type-selector.js";
import {
  mountEventScheduleWithLocalStorage,
  serializeEventSchedule,
} from "../features/event-schedule.js";

initMainImageInput(document.querySelector(".main-image-input"));
initSubImageInput(document.querySelector(".sub-image-input"));
initResponsiveTextarea(document.getElementById("content-title-wrapper"));
initActivityTypeSelector(document.querySelector(".activity-style-picker"));

const eventScheduleRoot = document.querySelector(".event-schedule");
const eventScheduleAddBtn = document.querySelector(".event-schedule__add-btn");

const { unsubscribe: unsubscribeEventSchedule } =
  mountEventScheduleWithLocalStorage({
    root: eventScheduleRoot,
    addBtn: eventScheduleAddBtn,
    storageKey: "event-schedule",
    debounceMs: 200,
  });
window.addEventListener("beforeunload", unsubscribeEventSchedule, {
  once: true,
});

// === Validation & CTA toggle ===
const headerCtaBtn = document.querySelector(".header-cta-btn");
const footerCtaBtn = document.querySelector(".footer-cta-btn");

function hasMainImage() {
  const img = document.querySelector(".main-image-input__preview");
  return !!(img && !img.hidden && img.getAttribute("src"));
}

function validTitle() {
  const ta = document.getElementById("content-title");
  const v = (ta?.value || "").trim();
  return v.length >= 8 && v.length <= 80; // 최소 8자, 최대 80자
}

function hasActivityType() {
  const picked = document.querySelector(
    '.activity-style-picker [role="radio"][aria-checked="true"]'
  );
  return !!picked;
}

function parseTimeToMinutes(t) {
  if (!t) return null;
  const h = Number.parseInt(String(t.hour || "").trim(), 10);
  const m = Number.parseInt(String(t.minute || "").trim(), 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 1 || h > 12) return null;
  if (m < 0 || m > 59) return null;
  const base = (h % 12) * 60 + m;
  const isPM = String(t.ampm || "").toUpperCase() === "PM";
  return base + (isPM ? 12 * 60 : 0);
}

function validEventSchedule() {
  const root = document.querySelector(".event-schedule");
  if (!root) return false;
  const data = serializeEventSchedule(root);
  if (!Array.isArray(data) || data.length === 0) return false;

  for (const ses of data) {
    // 날짜 필수
    if (!ses?.dateYmd) return false;

    // 시작/종료 유효성 + 순서(시작 ≤ 종료 허용)
    const s = parseTimeToMinutes(ses.start);
    const e = parseTimeToMinutes(ses.end);
    if (s == null || e == null) return false;
    if (s > e) return false;

    // 활동내역(메모/설명) 길이: 8자 이상 800자 미만
    const activityText = String(ses.desc ?? "").trim();
    if (activityText.length < 8 || activityText.length >= 800) return false;
  }
  return true;
}

function recalcAndToggleCtas() {
  const ok =
    hasMainImage() && validTitle() && hasActivityType() && validEventSchedule();

  headerCtaBtn.disabled = !ok;
  headerCtaBtn.setAttribute("aria-disabled", String(!ok));
  footerCtaBtn.disabled = !ok; // 푸터도 함께 토글 (원치 않으면 이 블록을 제거)
  footerCtaBtn.setAttribute("aria-disabled", String(!ok));
}

// ---- 이벤트 연결 ----
// 각 모듈이 내보내는 커스텀 이벤트에 훅
document.addEventListener("main-image-input:change", recalcAndToggleCtas);
document.addEventListener("activity-type-change", recalcAndToggleCtas);
document.addEventListener("event-schedule:change", recalcAndToggleCtas);

// 제목 텍스트에어리어는 input/change 둘 다 감지
const contentTitleTa = document.getElementById("content-title");
if (contentTitleTa) {
  contentTitleTa.addEventListener("input", recalcAndToggleCtas);
  contentTitleTa.addEventListener("change", recalcAndToggleCtas);
}

// 초기 1회 계산
requestAnimationFrame(recalcAndToggleCtas);
