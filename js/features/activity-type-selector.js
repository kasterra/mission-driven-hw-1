export function initActivityTypeSelector(root) {
  if (!(root instanceof HTMLElement)) return;
  if (root.getAttribute("role") !== "radiogroup") return;

  const SEL = '.activity-style-picker__option[role="radio"]';
  let radios = Array.from(root.querySelectorAll(SEL));
  if (radios.length === 0) return;

  // Load saved selection from storage
  const saved = loadSelectionFromStorage();
  if (saved) {
    const savedBtn = radios.find((btn) => btn.dataset.value === saved);
    if (savedBtn && isSelectable(savedBtn)) {
      applySelection(root, radios, savedBtn, false);
    }
  }

  // 클릭(위임)
  root.addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest(SEL) : null;
    if (!btn || !root.contains(btn) || !isSelectable(btn)) return;
    const radiosNow = Array.from(root.querySelectorAll(SEL));
    const current = getSelected(radiosNow);
    if (btn !== current) {
      applySelection(root, radiosNow, btn, true);
    }
    btn.focus();
  });

  // 키보드
  root.addEventListener("keydown", (e) => {
    const radiosNow = Array.from(root.querySelectorAll(SEL));
    const active =
      document.activeElement instanceof Element
        ? document.activeElement.closest(SEL)
        : null;
    const current =
      active && radiosNow.includes(active)
        ? active
        : getSelected(radiosNow) || radiosNow[0];
    const currentIndex = radiosNow.indexOf(current);

    let next = null;
    switch (e.key) {
      case "ArrowRight":
      case "Right":
      case "ArrowDown":
      case "Down":
        e.preventDefault();
        next = findNextEnabled(radiosNow, currentIndex, +1);
        break;
      case "ArrowLeft":
      case "Left":
      case "ArrowUp":
      case "Up":
        e.preventDefault();
        next = findNextEnabled(radiosNow, currentIndex, -1);
        break;
      case "Home":
        e.preventDefault();
        next = findEdgeEnabled(radiosNow, +1);
        break;
      case "End":
        e.preventDefault();
        next = findEdgeEnabled(radiosNow, -1);
        break;
      case " ": // Space
      case "Enter":
        e.preventDefault();
        applySelection(root, radiosNow, current, true);
        return;
      default:
        return; // 다른 키는 무시
    }

    if (next && next !== current) {
      applySelection(root, radiosNow, next, true);
      next.focus();
    }
  });
}

function isSelectable(btn) {
  return (
    btn instanceof HTMLElement &&
    !btn.hasAttribute("disabled") &&
    !btn.hasAttribute("hidden")
  );
}

function getSelected(radios) {
  return radios.find((b) => b.getAttribute("aria-checked") === "true") || null;
}

function applySelection(group, radios, target, fireEvent) {
  radios.forEach((btn) => {
    const selected = btn === target;
    btn.setAttribute("aria-checked", String(selected));
    btn.tabIndex = selected ? 0 : -1;
    btn.classList.toggle("active", selected);
  });
  if (fireEvent) {
    saveSelectionToStorage(target?.dataset?.value ?? "");
    dispatchChange(group, target);
  }
}

function dispatchChange(group, button) {
  const value = button?.dataset?.value ?? "";
  const ev = new CustomEvent("activity-type-change", {
    bubbles: true,
    detail: { value, button },
  });
  group.dispatchEvent(ev);
}

function saveSelectionToStorage(value) {
  try {
    localStorage.setItem("activity-type", value ?? "");
  } catch {
    // ignore
  }
}

function loadSelectionFromStorage() {
  try {
    return localStorage.getItem("activity-type");
  } catch {
    return null;
  }
}

function findNextEnabled(radios, fromIndex, dir) {
  const len = radios.length;
  let i = fromIndex;
  for (let step = 0; step < len; step += 1) {
    i = (i + dir + len) % len;
    const btn = radios[i];
    if (isSelectable(btn)) return btn;
  }
  return radios[fromIndex] || null;
}

function findEdgeEnabled(radios, dir) {
  const iter = dir > 0 ? radios : [...radios].reverse();
  return iter.find(isSelectable) || iter[0] || null;
}
