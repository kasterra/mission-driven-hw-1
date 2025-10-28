import { initMainImageInput } from "../features/main-image-input.js";
import { initResponsiveTextarea } from "../features/responsive-textarea.js";
import { initSubImageInput } from "../features/sub-image-input.js";
import { initActivityTypeSelector } from "../features/activity-type-selector.js";

initMainImageInput(document.querySelector(".main-image-input"));
initSubImageInput(document.querySelector(".sub-image-input"));
initResponsiveTextarea(document.getElementById("content-title-wrapper"));
initActivityTypeSelector(document.querySelector(".activity-style-picker"));
