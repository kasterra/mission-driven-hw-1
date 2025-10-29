import { initMainImageInput } from "../features/main-image-input.js";
import { initResponsiveTextarea } from "../features/responsive-textarea.js";
import { initSubImageInput } from "../features/sub-image-input.js";
import { initActivityTypeSelector } from "../features/activity-type-selector.js";
import { mountEventScheduleWithLocalStorage } from "../features/event-schedule.js";

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
