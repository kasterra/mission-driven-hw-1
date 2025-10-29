export function showToast(msg) {
  const toast = document.querySelector(".toast");
  toast.textContent = msg;
  toast.hidden = false;
  setTimeout(() => {
    toast.hidden = true;
  }, 2000);
}
