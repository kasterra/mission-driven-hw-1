import { initMainImageInput } from "../features/main-image-input.js";
import { initResponsiveTextarea } from "../features/responsive-textarea.js";
import { initSubImageInput } from "../features/sub-image-input.js";

initMainImageInput(document.querySelector(".main-image-input"));
initSubImageInput(document.querySelector(".sub-image-input"));
initResponsiveTextarea(document.getElementById("content-title-wrapper"));
