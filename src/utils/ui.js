//#region Error Toast
// Stacking toast system with enter/leave animations and smooth reflow (FLIP)

let autoId = 0;
const STACK_ID = "toastStack";
const ENTER_MS = 300;
const LEAVE_MS = 300;
const MAX_TOASTS = 5; // keep the stack finite

export function showError(message, opts = {}) {
  const { autoHideMs = 3500, title = "Error" } = opts;

  const stack = document.getElementById(STACK_ID);
  if (!stack) {
    console.error("[toast] #toastStack not found in DOM");
    return;
  }

  // Enforce max stack size (remove oldest gracefully)
  while (stack.children.length >= (opts.maxToasts ?? MAX_TOASTS)) {
    removeToast(stack.lastElementChild);
  }

  const id = `toast-${++autoId}`;

  // Build toast element (Flowbite-like style with Tailwind utilities)
  const toast = document.createElement("div");
  toast.id = id;
  toast.setAttribute("role", "alert");
  toast.className = [
    // layout & colors
    "pointer-events-auto",
    "w-full",
    "max-w-sm",
    "rounded-lg",
    "shadow-lg",
    "border",
    "border-red-600/30",
    "bg-red-500",
    "text-white",
    "overflow-hidden",

    // animation base
    "transition-all",
    "duration-300",
    "ease-out",

    // start hidden (enter state)
    "opacity-0",
    "translate-x-full",
  ].join(" ");

  toast.innerHTML = `
    <div class="px-4 py-3 flex items-center gap-3">
      <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <div class="flex-1">
        ${
          title
            ? `<div class="text-sm font-semibold">${escapeHtml(title)}</div>`
            : ""
        }
        <div class="text-sm">${escapeHtml(String(message))}</div>
      </div>
      <button type="button"
              class="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-white/10 focus:outline-none"
              aria-label="Close"
              data-close="1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `;

  // Insert at the top so newer toasts appear above older ones
  stack.insertBefore(toast, stack.firstChild);

  // ENTER: slide in + fade + expand (height)
  const h = measureHeight(toast);
  toast.style.maxHeight = "0px";
  // Force reflow to apply initial state
  // eslint-disable-next-line no-unused-expressions
  toast.getBoundingClientRect();

  toast.style.transition = `transform ${ENTER_MS}ms ease-out, opacity ${ENTER_MS}ms ease-out, max-height ${ENTER_MS}ms ease-out, margin ${ENTER_MS}ms ease-out`;
  toast.style.maxHeight = `${h}px`;
  toast.classList.remove("translate-x-full", "opacity-0");

  // Bind close
  toast.querySelector("[data-close]")?.addEventListener("click", () => {
    removeToast(toast);
  });

  // Auto-hide
  if (autoHideMs > 0) {
    const t = setTimeout(() => removeToast(toast), autoHideMs);
    // If user closes manually, clear the timer
    toast._autoTimer = t;
  }

  return id;
}

export function hideError() {
  // Remove only the newest (top) toast
  const stack = document.getElementById(STACK_ID);
  if (!stack || !stack.firstElementChild) return;
  removeToast(stack.firstElementChild);
}

// -------- internals --------

function removeToast(toast) {
  if (!toast || toast._removing) return;
  toast._removing = true;

  // Clear any pending auto-hide
  if (toast._autoTimer) {
    clearTimeout(toast._autoTimer);
    toast._autoTimer = null;
  }

  const stack = toast.parentElement;
  if (!stack) return;

  // Take FIRST positions of all current toasts (for FLIP)
  const first = snapshotPositions(stack);

  // LEAVE animation on the toast: slide out + fade + collapse height
  const h = toast.offsetHeight;
  toast.style.maxHeight = `${h}px`;
  // Force reflow before animating
  // eslint-disable-next-line no-unused-expressions
  toast.getBoundingClientRect();

  toast.style.transition = `transform ${LEAVE_MS}ms ease-in, opacity ${LEAVE_MS}ms ease-in, max-height ${LEAVE_MS}ms ease-in, margin ${LEAVE_MS}ms ease-in`;
  toast.style.transform = "translateX(100%)";
  toast.style.opacity = "0";
  toast.style.maxHeight = "0px";
  toast.style.marginTop = "0px";
  toast.style.marginBottom = "0px";

  // While it collapses, animate the remaining toasts smoothly into place (FLIP)
  playFLIP(stack, first, toast);

  // Remove node after its leave transition
  setTimeout(() => {
    if (toast.parentElement === stack) {
      stack.removeChild(toast);
    }
  }, LEAVE_MS + 20);
}

function snapshotPositions(container) {
  const map = new Map();
  Array.from(container.children).forEach((el) => {
    map.set(el, el.getBoundingClientRect().top);
  });
  return map;
}

function playFLIP(container, first, removedEl) {
  Array.from(container.children).forEach((el) => {
    if (el === removedEl) return;
    const lastTop = el.getBoundingClientRect().top;
    const oldTop = first.get(el) ?? lastTop;
    const dy = oldTop - lastTop;
    if (dy) {
      el.style.transition = "none";
      el.style.transform = `translateY(${dy}px)`;
      // Force reflow
      // eslint-disable-next-line no-unused-expressions
      el.getBoundingClientRect();
      el.style.transition = `transform ${LEAVE_MS}ms ease-in-out`;
      el.style.transform = "";
    }
  });
}

function measureHeight(el) {
  const prev = el.style.maxHeight;
  el.style.maxHeight = "none";
  const h = el.scrollHeight;
  el.style.maxHeight = prev || "";
  return h;
}

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
//#endregion

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
