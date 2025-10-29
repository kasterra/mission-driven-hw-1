export function showModal(
  title,
  content,
  cancelText = "취소",
  ctaText = "계속"
) {
  const dialog = document.querySelector("dialog");
  const xBtn = dialog.querySelector(".modal-x");
  const cancelBtn = dialog.querySelector(".modal-cancel-btn");
  const ctaBtn = dialog.querySelector(".modal-cta-btn");
  const modalTitle = dialog.querySelector(".modal-title");
  const modalSubTitle = dialog.querySelector(".modal-subtitle");

  modalTitle.textContent = title;
  modalSubTitle.textContent = content;

  cancelBtn.textContent = cancelText;
  ctaBtn.textContent = ctaText;

  return new Promise((resolve) => {
    dialog.showModal();

    const handleBackdropClick = (event) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        rect.left <= event.clientX &&
        event.clientX <= rect.right &&
        rect.top <= event.clientY &&
        event.clientY <= rect.bottom;

      if (!isInDialog) dialog.close("backdrop");
    };

    const cleanup = () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("click", handleBackdropClick);
      ctaBtn.removeEventListener("click", onCtaClick);
      cancelBtn.removeEventListener("click", onCancelClick);
      xBtn.removeEventListener("click", onXClick);
    };

    const handleClose = () => {
      const reason = dialog.returnValue;
      cleanup();
      resolve(reason);
    };

    const onCtaClick = () => dialog.close("confirm");
    const onCancelClick = () => dialog.close("cancel");
    const onXClick = () => dialog.close("x");

    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("click", handleBackdropClick);

    ctaBtn.addEventListener("click", onCtaClick, { once: true });
    cancelBtn.addEventListener("click", onCancelClick, { once: true });
    xBtn.addEventListener("click", onXClick, { once: true });
  });
}
