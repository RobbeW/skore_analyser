export const SAMPLE_FILES = [
  "example_data/1ste jaar Informatic.xlsx",
  "example_data/2de jaar 1 Informatic.xlsx",
  "example_data/3de jaar Design Thi.xlsx",
  "example_data/3de jaar Informatic.xlsx",
];

export const DEFAULT_THRESHOLD = 50;

export const THRESHOLD_BANDS = [
  { id: "90", label: "90 and above", min: 90, className: "band-90" },
  { id: "80", label: "80-89", min: 80, max: 89.999, className: "band-80" },
  { id: "70", label: "70-79", min: 70, max: 79.999, className: "band-70" },
  { id: "60", label: "60-69", min: 60, max: 69.999, className: "band-60" },
  { id: "50", label: "50-59", min: 50, max: 59.999, className: "band-50" },
  { id: "low", label: "Below 50", max: 49.999, className: "band-low" },
];

export const CATEGORY_COLORS = {
  DW: "#5200FF",
  EX: "#b45309",
  TOT: "#330099",
  PCT: "#5200FF",
  OTHER: "#64748b",
};

export const BRAND_COLORS = {
  purple: "#5200FF",
  purpleInk: "#330099",
  purpleSoft: "#efe7ff",
  axis: "#94a3b8",
  text: "#334155",
  muted: "#475569",
  danger: "#b91c1c",
  neutral: "#64748b",
};

export const FLAG_LABELS = {
  low_evidence_coverage: "Interpret carefully: limited score evidence",
  declining_trend: "Declining trend",
  large_dw_exam_gap: "Large DW/exam gap",
  below_threshold: "Below cut-off value",
  high_volatility: "Strongly fluctuating results",
  year_total_below_65: "Suggested negative advice",
  year_total_below_50: "Suggested strongly negative advice or reorientation",
  exam_far_below_dw: "Large learning packages are difficult",
  dw_far_below_exam: "Suggested study-attitude advice",
  consistent_good_work: "Positive work-attitude remark",
  insufficient_decision_evidence: "No conclusive advice yet",
  positive_evolution: "Positive evolution",
  category_bottleneck: "Targeted remediation needed",
};

export const RAW_CATEGORY_ALIASES = new Map([
  ["DAGELIJKS WERK", "DW"],
  ["DAILY WORK", "DW"],
  ["DW", "DW"],
  ["EX", "EX"],
  ["EXAMEN", "EX"],
  ["EXAM", "EX"],
  ["PCT", "PCT"],
  ["PCT/100", "PCT"],
  ["TOT", "TOT"],
  ["TOTAL", "TOT"],
]);

export function normaliseCategory(value, fallbackText = "") {
  const raw = String(value || "").trim();
  const upper = raw.toUpperCase();
  if (RAW_CATEGORY_ALIASES.has(upper)) return RAW_CATEGORY_ALIASES.get(upper);

  const text = `${raw} ${fallbackText}`.toUpperCase();
  if (/\bEX\b|EXAMEN|EXAM/.test(text)) return "EX";
  if (/\bDW\b|DAGELIJKS/.test(text)) return "DW";
  if (/\bPCT\b|PERCENT/.test(text)) return "PCT";
  if (/\bTOT\b|TOTAL/.test(text)) return "TOT";
  return raw || "OTHER";
}

export function thresholdBand(value) {
  if (!Number.isFinite(value)) return { id: "unknown", label: "No grade", className: "band-unknown" };
  return THRESHOLD_BANDS.find((band) => {
    const aboveMin = band.min == null || value >= band.min;
    const belowMax = band.max == null || value <= band.max;
    return aboveMin && belowMax;
  }) || THRESHOLD_BANDS[THRESHOLD_BANDS.length - 1];
}
