// React bindings for src/lib/motion.js. Motion plays only when the data really changed.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { countUp, drawPath, enter, growBars, popIn, prefersReducedMotion, stagger } from "./motion.js";

/** Animated number. Counts from the previous value to the new one. */
export function CountUp({ value, format = (n) => String(n), decimals = 0, className }) {
  const ref = useRef(null);
  const previous = useRef(0);
  useLayoutEffect(() => {
    countUp(ref.current, value, { from: previous.current, format, decimals });
    previous.current = Number.isFinite(value) ? value : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span ref={ref} className={className}>{Number.isFinite(value) ? format(value) : format(value)}</span>;
}

/** Fade-and-rise on mount (or when `signature` changes). */
export function useEnter(signature = "mount", options = {}) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    enter(ref.current, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return ref;
}

/** Staggered entrance for children matching `selector` when `signature` changes. */
export function useStagger(selector, signature, { step = 40, delay = 0 } = {}) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    stagger(ref.current.querySelectorAll(selector), step, { delay });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return ref;
}

/**
 * Chart reveal: lines draw in, bars grow, dots pop. Selectors are scoped to the
 * returned ref (an <svg> or wrapper). Plays when `signature` changes.
 */
export function useChartReveal(signature, { lines = "[data-draw]", bars = "[data-grow]", dots = "[data-pop]" } = {}) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return undefined;
    const run = () => {
      growBars(root.querySelectorAll(bars));
      let longest = 0;
      root.querySelectorAll(lines).forEach((path, i) => {
        longest = Math.max(longest, drawPath(path, { delay: i * 60 }));
      });
      popIn(root.querySelectorAll(dots), { delay: longest ? longest * 0.5 : 0, step: 12 });
    };
    // Charts far down the page (one per student card) play only when they scroll into view.
    if (typeof IntersectionObserver !== "function") {
      run();
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        run();
      }
    }, { threshold: 0.2 });
    observer.observe(root);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return ref;
}

/**
 * Sliding indicator: one element that glides (transform + width) under the active
 * child of `containerRef`, found by `activeSelector`. Place inside the container,
 * which must be position: relative.
 */
export function SlideIndicator({ containerRef, activeSelector = '[aria-pressed="true"], [aria-selected="true"], .is-active', className = "slide-indicator", withHeight = false, deps = [], as: Tag = "span" }) {
  const ref = useRef(null);
  const last = useRef(null);
  const [tick, force] = useState(0);

  useLayoutEffect(() => {
    const ind = ref.current;
    // Child layout effects run before the parent ref is attached: fall back to the parent element.
    const container = containerRef?.current || ind?.parentElement;
    if (!ind || !container) return;
    const active = container.querySelector(activeSelector);
    if (!active) {
      ind.style.opacity = "0";
      return;
    }
    const c = container.getBoundingClientRect();
    const a = active.getBoundingClientRect();
    const next = {
      x: a.left - c.left - container.clientLeft + container.scrollLeft,
      y: a.top - c.top - container.clientTop,
      w: a.width,
      h: a.height,
    };
    const paint = (pos) => {
      ind.style.width = `${pos.w}px`;
      ind.style.transform = `translate(${pos.x}px, ${withHeight ? pos.y : 0}px)`;
      if (withHeight) ind.style.height = `${pos.h}px`;
    };
    const prev = last.current;
    ind.style.opacity = "1";
    ind.style.transition = "none";
    if (prev && !prefersReducedMotion() && (prev.x !== next.x || prev.w !== next.w || prev.y !== next.y)) {
      paint(prev);
      void ind.offsetWidth;
      ind.style.transition = "";
    }
    paint(next);
    void ind.offsetWidth;
    ind.style.transition = "";
    last.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  // Re-measure on resize (labels may re-flow).
  useEffect(() => {
    let timer = null;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        last.current = null;
        force((n) => n + 1);
      }, 80);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <Tag ref={ref} className={className} aria-hidden="true" role={Tag === "li" ? "presentation" : undefined} />;
}
