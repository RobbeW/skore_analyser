// Motion helpers shared with Planner-analyse: CSS and the Web Animations API only,
// transform/opacity (plus stroke-dashoffset for line draws). Everything is a no-op
// under prefers-reduced-motion and in hidden tabs. Animations never touch focus
// or hide content: the final state is always the element's normal state.

const FAST = 150;
const MEDIUM = 260;
const SLOW = 520;
export const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
export const EASE_STANDARD = "cubic-bezier(0.2, 0, 0, 1)";

export const DURATION = { fast: FAST, medium: MEDIUM, slow: SLOW };

export function prefersReducedMotion() {
  // A hidden/background tab gets no animation frames: show final states at once.
  if (typeof document !== "undefined" && document.hidden) return true;
  if (typeof globalThis.matchMedia !== "function") return false;
  return Boolean(globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

function canAnimate(node) {
  return !prefersReducedMotion() && node && typeof node.animate === "function";
}

/** requestAnimationFrame never fires in a hidden tab: always race it with a timer. */
export const nextFrame = () => new Promise((resolve) => {
  let done = false;
  const finish = () => {
    if (!done) {
      done = true;
      resolve();
    }
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(finish);
  setTimeout(finish, 50);
});

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fade and rise in. */
export function enter(node, { delay = 0, y = 8, duration = MEDIUM } = {}) {
  if (!canAnimate(node)) return null;
  return node.animate(
    [
      { opacity: 0, transform: `translateY(${y}px)` },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration, delay, easing: EASE_OUT, fill: "backwards" },
  );
}

/** Plain fade in. */
export function fade(node, { delay = 0, duration = FAST } = {}) {
  if (!canAnimate(node)) return null;
  return node.animate([{ opacity: 0 }, { opacity: 1 }], { duration, delay, easing: EASE_STANDARD, fill: "backwards" });
}

/** Enters each node with an increasing delay (capped so long lists stay quick). */
export function stagger(nodes, step = 40, options = {}) {
  [...nodes].forEach((node, i) => enter(node, { ...options, delay: (options.delay ?? 0) + Math.min(i, 12) * step }));
}

/**
 * Counts the visible digits up. Assistive technology gets the final value at once
 * through a visually hidden span.
 */
export function countUp(node, to, { duration = SLOW, format = (n) => String(n), from = 0, decimals = 0 } = {}) {
  if (!node) return;
  const finalText = format(to);
  if (!Number.isFinite(to) || !Number.isFinite(from) || prefersReducedMotion() || typeof globalThis.requestAnimationFrame !== "function" || from === to) {
    node.textContent = finalText;
    return;
  }
  const hidden = document.createElement("span");
  hidden.className = "sr-only";
  hidden.textContent = finalText;
  const visible = document.createElement("span");
  visible.setAttribute("aria-hidden", "true");
  visible.textContent = format(from);
  node.replaceChildren(hidden, visible);
  const factor = 10 ** decimals;
  const start = globalThis.performance?.now?.() ?? Date.now();
  const tick = (now) => {
    const t = Math.min(1, Math.max(0, ((now ?? Date.now()) - start) / duration));
    const eased = 1 - (1 - t) ** 3;
    visible.textContent = format(Math.round((from + (to - from) * eased) * factor) / factor);
    if (t < 1 && visible.isConnected) globalThis.requestAnimationFrame(tick);
    else node.textContent = finalText;
  };
  globalThis.requestAnimationFrame(tick);
  // Safety net for tabs that stop delivering frames mid-animation.
  setTimeout(() => {
    if (visible.isConnected) node.textContent = finalText;
  }, duration + 400);
}

/** Draws an SVG path in. Returns the duration or 0. */
export function drawPath(path, { delay = 0 } = {}) {
  if (!canAnimate(path) || typeof path.getTotalLength !== "function") return 0;
  let length = 0;
  try {
    length = path.getTotalLength();
  } catch {
    return 0;
  }
  if (!length) return 0;
  path.animate(
    [
      { strokeDasharray: `${length}`, strokeDashoffset: `${length}` },
      { strokeDasharray: `${length}`, strokeDashoffset: "0" },
    ],
    { duration: SLOW, delay, easing: EASE_STANDARD, fill: "backwards" },
  );
  return SLOW;
}

/** Grows SVG shapes from their baseline (bottom), staggered. */
export function growBars(rects, { step = 15, delay = 0 } = {}) {
  [...rects].forEach((r, i) => {
    if (!canAnimate(r)) return;
    r.style.transformBox = "fill-box";
    r.style.transformOrigin = "50% 100%";
    r.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: MEDIUM, delay: delay + i * step, easing: EASE_OUT, fill: "backwards" });
  });
}

/** Pops SVG shapes in around their own centre. */
export function popIn(nodes, { step = 20, delay = 0 } = {}) {
  [...nodes].forEach((n, i) => {
    if (!canAnimate(n)) return;
    n.style.transformBox = "fill-box";
    n.style.transformOrigin = "center";
    n.animate(
      [
        { transform: "scale(0)", opacity: 0 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration: MEDIUM, delay: delay + Math.min(i, 30) * step, easing: EASE_OUT, fill: "backwards" },
    );
  });
}
