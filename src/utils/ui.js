export function showError(message) {
  const errorToast = document.getElementById("errorToast");
  const errorMessage = document.getElementById("errorMessage");

  errorMessage.textContent = message;
  errorToast.classList.remove("translate-x-full");

  setTimeout(() => {
    errorToast.classList.add("translate-x-full");
  }, 5000);
}

export function hideError() {
  document.getElementById("errorToast").classList.add("translate-x-full");
}

export function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDateLong(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
