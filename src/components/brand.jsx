// Branded intro, import overlay and mark, following the Planner-analyse motion language.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { EASE_OUT, EASE_STANDARD, prefersReducedMotion, wait } from "@/lib/motion.js";
import { t } from "../../js/i18n.js";

/** Navy tile, light-blue rising line, school-red end dot. Decorative. */
export function BrandMark({ size = 40, className, animated = false }) {
  const lineRef = useRef(null);
  const dotRef = useRef(null);
  useLayoutEffect(() => {
    if (!animated || prefersReducedMotion()) return;
    const line = lineRef.current;
    const dot = dotRef.current;
    if (line?.animate && line.getTotalLength) {
      const length = line.getTotalLength();
      line.animate(
        [
          { strokeDasharray: `${length}`, strokeDashoffset: `${length}` },
          { strokeDasharray: `${length}`, strokeDashoffset: "0" },
        ],
        { duration: 620, delay: 150, easing: EASE_STANDARD, fill: "backwards" },
      );
    }
    if (dot?.animate) {
      dot.style.transformBox = "fill-box";
      dot.style.transformOrigin = "center";
      dot.animate(
        [
          { transform: "scale(0)", opacity: 0 },
          { transform: "scale(1.25)", opacity: 1, offset: 0.7 },
          { transform: "scale(1)", opacity: 1 },
        ],
        { duration: 420, delay: 700, easing: EASE_OUT, fill: "backwards" },
      );
    }
  }, [animated]);
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="14" fill="#001E2D" />
      <path d="M13 46 H51" stroke="#A4C6D7" strokeOpacity="0.35" strokeWidth="2" />
      <path ref={lineRef} d="M13 42 L24 34 L33 38 L45 22" fill="none" stroke="#A4C6D7" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle ref={dotRef} cx="47" cy="19" r="6" fill="#C62606" />
    </svg>
  );
}

export const INTRO_MS = 1800;
const INTRO_FADE_MS = 240;
let introShown = false;

/**
 * Launch intro, once per page load. Skipped under reduced motion or in a hidden tab.
 * Any key, pointer press or file drag closes it at once, so it never blocks an import.
 */
export function LaunchIntro() {
  const [visible, setVisible] = useState(() => !introShown && !prefersReducedMotion());
  const rootRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    if (!visible) return undefined;
    introShown = true;
    titleRef.current?.focus();
    const root = rootRef.current;
    [titleRef.current, root?.querySelector(".intro__tagline")].forEach((node, i) => {
      node?.animate?.(
        [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 300, delay: 400 + i * 120, easing: EASE_OUT, fill: "backwards" },
      );
    });
    let closed = false;
    let timer = null;
    const events = ["keydown", "pointerdown", "dragenter", "drop"];
    const finish = () => {
      setVisible(false);
      document.querySelector("main h1, main h2")?.focus?.();
    };
    const close = () => {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      events.forEach((name) => document.removeEventListener(name, close, true));
      if (root) root.style.pointerEvents = "none";
      if (root?.animate && !prefersReducedMotion()) {
        root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: INTRO_FADE_MS, easing: EASE_STANDARD, fill: "forwards" });
        // Timers, not animation events: background tabs must never keep the intro up.
        setTimeout(finish, INTRO_FADE_MS + 40);
      } else finish();
    };
    events.forEach((name) => document.addEventListener(name, close, true));
    timer = setTimeout(close, INTRO_MS);
    return () => {
      clearTimeout(timer);
      events.forEach((name) => document.removeEventListener(name, close, true));
    };
  }, [visible]);

  if (!visible) return null;
  return (
    <div ref={rootRef} className="intro" role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <div className="intro__content">
        <BrandMark size={128} animated className="intro__mark" />
        <h1 id="intro-title" ref={titleRef} className="intro__title" tabIndex={-1}>{t("app.brand")}</h1>
        <p className="intro__tagline">{t("intro.tagline")}</p>
      </div>
    </div>
  );
}

const MIN_VISIBLE_MS = 700;
const DONE_HOLD_MS = 300;
const FADE_OUT_MS = 150;

/** Maps an import progress event to { text, ratio }. */
export function describeProgress({ stage, fileIndex = 0, fileCount = 1 } = {}) {
  const count = Math.max(fileCount, 1);
  if (stage === "reading") return { text: t("splash.reading", { index: Math.min(fileIndex + 1, count), count }), ratio: (fileIndex / count) * 0.6 };
  if (stage === "parsing") return { text: t("splash.parsing"), ratio: 0.7 };
  if (stage === "analysing") return { text: t("splash.analysing"), ratio: 0.88 };
  if (stage === "project") return { text: t("splash.project"), ratio: 0.5 };
  if (stage === "pdf") return { text: t("splash.pdf"), ratio: 0.3 };
  if (stage === "pdfParse") return { text: t("splash.pdfParse"), ratio: 0.65 };
  if (stage === "pdfMatch") return { text: t("splash.pdfMatch"), ratio: 0.9 };
  return { text: t("splash.done"), ratio: 1 };
}

/**
 * Import overlay state. `open()` shows it, `update(progress)` moves the bar,
 * `finish()` honours the minimum display time, shows "Klaar" and fades out,
 * `close()` removes it at once (errors).
 */
export function useImportSplash() {
  const [state, setState] = useState(null); // { progress, done, leaving }
  const openedAt = useRef(0);
  const live = useRef(false);

  const open = useCallback(() => {
    openedAt.current = Date.now();
    live.current = true;
    setState({ progress: { stage: "reading", fileIndex: 0, fileCount: 1 }, done: false, leaving: false });
  }, []);
  const update = useCallback((progress) => {
    if (!live.current) return;
    setState((current) => (current ? { ...current, progress } : current));
  }, []);
  const close = useCallback(() => {
    live.current = false;
    setState(null);
  }, []);
  const finish = useCallback(async () => {
    if (!live.current) return;
    setState((current) => (current ? { ...current, progress: { stage: "done" }, done: true } : current));
    await wait(Math.max(DONE_HOLD_MS, MIN_VISIBLE_MS - (Date.now() - openedAt.current)));
    if (!prefersReducedMotion()) {
      setState((current) => (current ? { ...current, leaving: true } : current));
      await wait(FADE_OUT_MS + 20);
    }
    live.current = false;
    setState(null);
  }, []);

  return { state, open, update, finish, close };
}

export function ImportSplash({ state }) {
  const titleRef = useRef(null);
  const cardRef = useRef(null);
  const isOpen = Boolean(state);

  useEffect(() => {
    if (!isOpen) return;
    titleRef.current?.focus();
    if (!prefersReducedMotion()) {
      cardRef.current?.animate?.(
        [{ opacity: 0, transform: "scale(0.98)" }, { opacity: 1, transform: "scale(1)" }],
        { duration: 260, easing: EASE_OUT, fill: "backwards" },
      );
    }
  }, [isOpen]);

  if (!state) return null;
  const { text, ratio } = describeProgress(state.progress);
  const pct = Math.round(ratio * 100);
  return (
    <div
      className="splash"
      data-leaving={state.leaving ? "true" : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="splash-title"
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          event.preventDefault();
          titleRef.current?.focus();
        }
      }}
    >
      <span className="splash__accent" aria-hidden="true" />
      <div ref={cardRef} className="splash__card">
        <BrandMark size={48} className="splash__mark" />
        <h2 id="splash-title" ref={titleRef} className="splash__title" tabIndex={-1}>{t("app.brand")}</h2>
        <div className="splash__bar" role="progressbar" aria-label={t("splash.progressLabel")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <span className="splash__fill" style={{ transform: `scaleX(${ratio})` }} />
        </div>
        <div className="splash__row">
          {state.done ? (
            <span className="splash__check" aria-hidden="true">✓</span>
          ) : (
            <span className="splash__loader" aria-hidden="true"><span /><span /><span /></span>
          )}
          <p className="splash__step" role="status" aria-live="polite">{text}</p>
        </div>
      </div>
    </div>
  );
}
