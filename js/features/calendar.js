export function initCalendar(root) {
  if (!(root instanceof HTMLElement)) return;

  const head = root.querySelector(".calendar-head");
  const monthLabel = head?.querySelector(".calendar-head__month-indicator");
  const [prevBtn, nextBtn] =
    head?.querySelectorAll(".calendar-head__btn") ?? [];
  const body = root.querySelector(".calendar-body");
  const confirmBtn = root.querySelector(".calendar-cta-btn");
  if (!head || !monthLabel || !body) return;

  const today = atMidnight(new Date());
  let selectedDate = new Date(today);

  /** @type {Date|null} */
  let minDate = null; // exclusive lower bound
  /** @type {Date|null} */
  let maxDate = null; // exclusive upper bound

  const withinExclusiveBounds = (d) => {
    const dm = atMidnight(d);
    if (minDate && dm <= minDate) return false;
    if (maxDate && dm >= maxDate) return false;
    return true;
  };

  const updateConfirmDisabled = () => {
    if (confirmBtn) {
      confirmBtn.disabled = !selectedDate;
    }
  };

  const render = () => {
    const firstOfView = getViewAnchor(root, monthLabel, today);
    const viewVsToday = compareYearMonth(firstOfView, today);
    // Compute starting cell (Sunday of the first week containing the 1st)
    const startWeekday = firstOfView.getDay(); // 0(Sun)-6(Sat)
    const startDate = new Date(firstOfView);
    startDate.setDate(1 - startWeekday);

    const nextOfView = shiftMonth(firstOfView, 1);
    const prevOfView = shiftMonth(firstOfView, -1);

    // Clear body first
    body.innerHTML = "";

    const frag = document.createDocumentFragment();

    const weekdayNames = ["일", "월", "화", "수", "목", "금", "토"];
    weekdayNames.forEach((name) => {
      const w = document.createElement("div");
      w.className = "calendar-day";
      w.textContent = name;
      frag.appendChild(w);
    });

    // Build 6 weeks * 7 days = 42 cells
    for (let i = 0; i < 42; i += 1) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);
      const inCurrentMonth = cellDate.getMonth() === firstOfView.getMonth();

      const inNextOfView =
        cellDate.getFullYear() === nextOfView.getFullYear() &&
        cellDate.getMonth() === nextOfView.getMonth();
      const inPrevOfView =
        cellDate.getFullYear() === prevOfView.getFullYear() &&
        cellDate.getMonth() === prevOfView.getMonth();

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "calendar-day";
      btn.dataset.date = toYMD(cellDate);
      btn.textContent = String(cellDate.getDate());

      // Selectability rules (based on the currently viewed month, not always "today's" month)
      // - Only dates in the viewed month
      // - If viewing a past month: none selectable
      // - If viewing the current month: only today or future days selectable
      // - If viewing a future month: all days selectable
      // Also allow next-of-view days selectable with similar rules
      let selectable = false;
      if (inCurrentMonth) {
        if (viewVsToday < 0) {
          selectable = false;
        } else if (viewVsToday === 0) {
          selectable = atMidnight(cellDate) >= today;
        } else {
          selectable = true;
        }
      } else if (inNextOfView) {
        const nextVsToday = compareYearMonth(nextOfView, today);
        if (nextVsToday < 0) {
          selectable = false;
        } else if (nextVsToday === 0) {
          selectable = atMidnight(cellDate) >= today;
        } else {
          selectable = true;
        }
      } else if (inPrevOfView) {
        const prevVsToday = compareYearMonth(prevOfView, today);
        if (prevVsToday < 0) {
          selectable = false;
        } else if (prevVsToday === 0) {
          selectable = atMidnight(cellDate) >= today;
        } else {
          selectable = true;
        }
      } else {
        selectable = false;
      }

      // Apply external (exclusive) bounds if provided
      if (selectable && (minDate || maxDate)) {
        selectable = withinExclusiveBounds(cellDate);
      }

      if (!selectable) {
        btn.disabled = true;
        btn.setAttribute("aria-disabled", "true");
        if (minDate || maxDate) btn.classList.add("calendar-day--disabled");
      }

      // Apply selected style only when selectable and matches selectedDate
      if (selectable && selectedDate && sameDay(cellDate, selectedDate)) {
        btn.classList.add("calendar-day--selected");
      }

      const c = atMidnight(cellDate);
      if (inPrevOfView) {
        if (selectable) {
          btn.classList.add("calendar-day--another-month-clickable");
          if (!btn.disabled) btn.removeAttribute("aria-disabled");
        } else {
          // keep specific class if OOB already set
          btn.classList.add("calendar-day--disabled");
        }
      } else if (inCurrentMonth) {
        if (c < today) btn.classList.add("calendar-day--disabled");
      } else if (inNextOfView) {
        if (!btn.disabled) {
          btn.classList.add("calendar-day--another-month-clickable");
          btn.removeAttribute("aria-disabled");
        } // else: keep disabled/oob styling
      } else {
        // any other out-of-grid month (shouldn't happen in 6x7 layout)
        btn.classList.add("calendar-day--disabled");
      }

      frag.appendChild(btn);
    }

    body.appendChild(frag);
  };

  // Helper to update navigation button disabled state
  const updateNavDisabled = () => {
    const current = getViewAnchor(root, monthLabel, today);
    const cmp = compareYearMonth(current, today);
    if (prevBtn) {
      const shouldDisablePrev = cmp <= 0; // current month or earlier
      prevBtn.disabled = shouldDisablePrev;
      prevBtn.setAttribute("aria-disabled", String(shouldDisablePrev));
    }
  };

  // Selection (via event delegation on the body)
  const onBodyClick = (e) => {
    const targetBtn = e.target.closest("button.calendar-day");
    if (!targetBtn || !body.contains(targetBtn)) return;
    const ds = targetBtn.dataset.date;
    if (!ds) return;
    const next = new Date(ds);
    if (Number.isNaN(next.getTime())) return;

    const nextMid = atMidnight(next);
    const firstOfView = getViewAnchor(root, monthLabel, today);
    const nextOfView = shiftMonth(firstOfView, 1);
    const prevOfView = shiftMonth(firstOfView, -1);
    const inNextOfView =
      nextMid.getFullYear() === nextOfView.getFullYear() &&
      nextMid.getMonth() === nextOfView.getMonth();
    const inPrevOfView =
      nextMid.getFullYear() === prevOfView.getFullYear() &&
      nextMid.getMonth() === prevOfView.getMonth();

    const viewVsToday = compareYearMonth(firstOfView, today);
    const inCurrentMonth =
      nextMid.getFullYear() === firstOfView.getFullYear() &&
      nextMid.getMonth() === firstOfView.getMonth();

    if (!inCurrentMonth && !inNextOfView && !inPrevOfView) return; // allow current/next/prev-of-view

    // determine which month rules to apply
    const monthAnchor = inCurrentMonth
      ? firstOfView
      : inNextOfView
      ? nextOfView
      : prevOfView;
    const monthVsToday = compareYearMonth(monthAnchor, today);
    if (monthVsToday < 0) return; // past month: never selectable
    if (monthVsToday === 0 && nextMid < today) return; // current month: past days blocked

    // respect external bounds (exclusive)
    if ((minDate || maxDate) && !withinExclusiveBounds(nextMid)) return;

    // If clicked a different month cell, switch view accordingly
    if (inNextOfView) {
      setViewAnchor(root, monthLabel, nextOfView);
    } else if (inPrevOfView) {
      setViewAnchor(root, monthLabel, prevOfView);
    }

    // Update state and re-render to reflect selection
    selectedDate = atMidnight(next);
    render();
    updateConfirmDisabled();
    updateNavDisabled();

    // Notify parent that selection changed
    root.dispatchEvent(
      new CustomEvent("calendar:change", {
        detail: { date: new Date(selectedDate), ymd: toYMD(selectedDate) },
        bubbles: true,
      })
    );
  };

  // Bounds setter (from parent)
  const onSetBounds = (e) => {
    const { min, max } = e.detail || {};
    minDate =
      min instanceof Date && !Number.isNaN(min.getTime())
        ? atMidnight(min)
        : null;
    maxDate =
      max instanceof Date && !Number.isNaN(max.getTime())
        ? atMidnight(max)
        : null;
    // Clear selection if now out of range
    if (selectedDate && !withinExclusiveBounds(selectedDate)) {
      selectedDate = null;
      updateConfirmDisabled();
    }
    render();
  };

  // Navigation
  const onPrev = () => {
    const current = getViewAnchor(root, monthLabel, today);
    selectedDate = null; // 이동 시 선택 해제
    setViewAnchor(root, monthLabel, shiftMonth(current, -1));
    render();
    updateConfirmDisabled();
    updateNavDisabled();
  };
  const onNext = () => {
    const current = getViewAnchor(root, monthLabel, today);
    selectedDate = null; // 이동 시 선택 해제
    setViewAnchor(root, monthLabel, shiftMonth(current, 1));
    render();
    updateConfirmDisabled();
    updateNavDisabled();
  };

  // Attach listeners once
  if (prevBtn) prevBtn.addEventListener("click", onPrev);
  if (nextBtn) nextBtn.addEventListener("click", onNext);
  root.addEventListener("calendar:set-bounds", onSetBounds);
  if (body) body.addEventListener("click", onBodyClick);
  if (confirmBtn) {
    const onConfirm = () => {
      root.dispatchEvent(
        new CustomEvent("calendar:confirm", {
          detail: { date: new Date(selectedDate), ymd: toYMD(selectedDate) },
          bubbles: true,
        })
      );
    };
    confirmBtn.addEventListener("click", onConfirm);
  }

  // Initial render synced with label
  setViewAnchor(root, monthLabel, getViewAnchor(root, monthLabel, today));
  render();
  updateConfirmDisabled();
  updateNavDisabled();
}

// --- Module-scope helpers ---------------------------------------------------
//TODO: 불필요한 헬퍼들과 DOM에 의존하는 로직들 향후 픽스 가능
const pad2 = (n) => String(n).padStart(2, "0");
const toYMD = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const atMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const parseKoreanYM = (text) => {
  // Expects e.g., "2025년 10월" (spaces optional)
  const m = String(text)
    .trim()
    .match(/(\d{4})\s*년\s*(\d{1,2})\s*월/);
  if (!m) return null;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1; // 0-11
  return new Date(year, monthIndex, 1);
};

const formatKoreanYM = (date) =>
  `${date.getFullYear()}년 ${date.getMonth() + 1}월`;

const shiftMonth = (base, delta) =>
  new Date(base.getFullYear(), base.getMonth() + delta, 1);

const sameDay = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const compareYearMonth = (a, b) => {
  // returns -1 if a<b (earlier month), 0 if same year-month, 1 if a>b
  const ay = a.getFullYear(),
    am = a.getMonth();
  const by = b.getFullYear(),
    bm = b.getMonth();
  if (ay === by && am === bm) return 0;
  return ay < by || (ay === by && am < bm) ? -1 : 1;
};

const getViewAnchor = (root, monthLabel, today) => {
  // Priority: data attribute -> label text -> today
  const ds = root.dataset.viewAnchor;
  if (ds) {
    const d = new Date(ds);
    if (!Number.isNaN(d.getTime()))
      return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  const fromLabel = parseKoreanYM(monthLabel.textContent);
  if (fromLabel)
    return new Date(fromLabel.getFullYear(), fromLabel.getMonth(), 1);
  return new Date(today.getFullYear(), today.getMonth(), 1);
};

const setViewAnchor = (root, monthLabel, firstOfMonth) => {
  root.dataset.viewAnchor = `${firstOfMonth.getFullYear()}-${pad2(
    firstOfMonth.getMonth() + 1
  )}-01`;
  monthLabel.textContent = formatKoreanYM(firstOfMonth);
};
