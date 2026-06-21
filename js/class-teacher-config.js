export const CLASS_TEACHER_PERIOD_SCHEMAS = {
  year_1_2: {
    id: "year_1_2",
    appliesToYears: [1, 2],
    requiredFiles: 4,
    periods: [
      {
        id: "trimester_1",
        label: "Trimester 1",
        patterns: [/trimester\s*1/i, /\btrim\s*1\b/i, /\bt1\b/i],
        subjectScorePriority: ["TOT1", "PCT", "EX1", "DW1"],
        overallScorePriority: ["PCT"],
      },
      {
        id: "trimester_2",
        label: "Trimester 2",
        patterns: [/trimester\s*2/i, /\btrim\s*2\b/i, /\bt2\b/i],
        subjectScorePriority: ["TOT2", "PCT", "EX2", "DW2"],
        overallScorePriority: ["PCT"],
      },
      {
        id: "trimester_3",
        label: "Trimester 3",
        patterns: [/trimester\s*3/i, /\btrim\s*3\b/i, /\bt3\b/i],
        subjectScorePriority: ["TOT3", "PCT", "EX3", "DW3"],
        overallScorePriority: ["PCT"],
      },
      {
        id: "year",
        label: "Jaar",
        patterns: [/jaarrapport/i, /\bjaar\b/i],
        subjectScorePriority: ["PCT", "TOT", "EX", "DW"],
        overallScorePriority: ["PCT"],
      },
    ],
  },
  year_3_4: {
    id: "year_3_4",
    appliesToYears: [3, 4],
    requiredFiles: 4,
    periods: [
      {
        id: "semester_1",
        label: "Semester 1",
        patterns: [/semester\s*1/i, /\bsem\s*1\b/i, /\bs1\b/i],
        subjectScorePriority: ["TOT1", "PCT", "EX1", "DW1"],
        overallScorePriority: ["PCT"],
      },
      {
        id: "semester_2_prelim",
        label: "Semester 2 voorlopig resultaat",
        patterns: [/semester\s*2.*voorlopig/i, /voorlopig(?:\s+resultaat)?/i],
        subjectScorePriority: ["TOT2", "PCT", "EX2", "DW2"],
        overallScorePriority: ["PCT"],
        optionalOverallScore: true,
      },
      {
        id: "semester_2",
        label: "Semester 2",
        patterns: [/semester\s*2/i, /\bsem\s*2\b/i, /\bs2\b/i],
        subjectScorePriority: ["TOT2", "PCT", "EX2", "DW2"],
        overallScorePriority: ["PCT"],
      },
      {
        id: "year",
        label: "Jaar",
        patterns: [/jaarrapport/i, /\bjaar\b/i],
        subjectScorePriority: ["PCT", "TOT", "EX", "DW"],
        overallScorePriority: ["PCT"],
      },
    ],
  },
  year_5_6: {
    id: "year_5_6",
    appliesToYears: [5, 6],
    requiredFiles: 3,
    periods: [
      {
        id: "semester_1",
        label: "Semester 1",
        patterns: [/semester\s*1/i, /\bsem\s*1\b/i, /\bs1\b/i],
        subjectScorePriority: ["TOT1", "PCT", "EX1", "DW1"],
        overallScorePriority: ["PCT"],
      },
      {
        id: "semester_2",
        label: "Semester 2",
        patterns: [/semester\s*2/i, /\bsem\s*2\b/i, /\bs2\b/i],
        subjectScorePriority: ["TOT2", "PCT", "EX2", "DW2"],
        overallScorePriority: ["PCT"],
      },
      {
        id: "year",
        label: "Jaar",
        patterns: [/jaarrapport/i, /\bjaar\b/i],
        subjectScorePriority: ["PCT", "TOT", "EX", "DW"],
        overallScorePriority: ["PCT"],
      },
    ],
  },
};

export const SUBJECT_ALIASES = new Map([
  ["ALGTO", "Algemeen totaal"],
  ["ALGEMEEN TOTAAL", "Algemeen totaal"],
  ["TOTAAL", "Algemeen totaal"],
  ["AARD", "Aardrijkskunde"],
  ["AARDRIJKSKUNDE", "Aardrijkskunde"],
  ["BIO", "Biologie"],
  ["BIOLOGIE", "Biologie"],
  ["BLD", "Beeld"],
  ["BEELD", "Beeld"],
  ["CHEM", "Chemie"],
  ["CHEMIE", "Chemie"],
  ["DT", "Design Thinking"],
  ["DESIGN THINKING", "Design Thinking"],
  ["DIGI", "Digiwiskunde"],
  ["DIGIWISKUNDE", "Digiwiskunde"],
  ["DUI", "Duits"],
  ["DUITS", "Duits"],
  ["ECO", "Economie"],
  ["ECON", "Economie"],
  ["ECONOMIE", "Economie"],
  ["ENG", "Engels"],
  ["ENGELS", "Engels"],
  ["FRA", "Frans"],
  ["FRANS", "Frans"],
  ["FYS", "Fysica"],
  ["FYSICA", "Fysica"],
  ["GES", "Geschiedenis"],
  ["GESCHIEDENIS", "Geschiedenis"],
  ["GRI", "Grieks"],
  ["GRIEKS", "Grieks"],
  ["IW", "Informaticawetenschappen"],
  ["INF", "Informaticawetenschappen"],
  ["INFORMATICA", "Informaticawetenschappen"],
  ["INFORMATICAWETENSCHAPPEN", "Informaticawetenschappen"],
  ["LAT", "Latijn"],
  ["LATIJN", "Latijn"],
  ["LO", "Lichamelijke opvoeding"],
  ["LICHAMELIJKE OPVOEDING", "Lichamelijke opvoeding"],
  ["NED", "Nederlands"],
  ["NEDERLANDS", "Nederlands"],
  ["SPA", "Spaans"],
  ["SPAANS", "Spaans"],
  ["WIS", "Wiskunde"],
  ["WISKUNDE", "Wiskunde"],
]);

export const TRACK_KEY_SUBJECTS = {
  Latijn: {
    years: [1, 2],
    label: "Latijn",
    aliases: ["LAT", "LATIJN", "1LAT", "2LAT"],
    keySubjects: ["Wiskunde", "Frans", "Nederlands", "Latijn"],
  },
  Grieks_Latijn: {
    years: [2, 3, 4, 5, 6],
    label: "Grieks-Latijn",
    aliases: ["GL", "GLA", "GRIEKS LATIJN", "GRIEKS-LATIJN"],
    keySubjects: ["Wiskunde", "Frans", "Nederlands", "Latijn", "Grieks"],
  },
  STEaM: {
    years: [1, 2],
    label: "STEaM",
    aliases: ["STEAM", "STEM"],
    keySubjects: ["Wiskunde", "Frans", "Nederlands", "Informaticawetenschappen", "Design Thinking", "Digiwiskunde"],
  },
  Taal_en_Cultuur: {
    years: [1, 2],
    label: "Taal & cultuur",
    aliases: ["TC", "TAAL EN CULTUUR", "TAAL CULTUUR"],
    keySubjects: ["Wiskunde", "Frans", "Nederlands", "Engels", "Geschiedenis"],
  },
  Moderne_Talen_Wetenschappen_2A: {
    years: [2],
    label: "Moderne talen en wetenschappen",
    aliases: ["MTW", "MODERNE TALEN WETENSCHAPPEN"],
    keySubjects: ["Wiskunde", "Frans", "Nederlands", "Engels", "Aardrijkskunde"],
  },
  Grieks_Latijn_STEaM: {
    years: [3, 4],
    label: "Grieks-Latijn STEaM",
    aliases: ["GLS", "GL STEAM", "GRIEKS LATIJN STEAM", "GRIEKS-LATIJN STEAM"],
    keySubjects: ["Wiskunde", "Frans", "Nederlands", "Latijn", "Grieks", "Informaticawetenschappen"],
  },
  Grieks_Latijn_TC: {
    years: [3, 4],
    label: "Grieks-Latijn Taal & Cultuur",
    aliases: ["GLTC", "GLT", "GRIEKS LATIJN TC", "GRIEKS-LATIJN TAAL CULTUUR"],
    keySubjects: ["Wiskunde", "Frans", "Nederlands", "Latijn", "Grieks", "Engels", "Geschiedenis"],
  },
  NW: {
    years: [3, 4],
    label: "Natuurwetenschappen",
    aliases: ["NW", "NATUURWETENSCHAPPEN", "NATUUR WETENSCHAPPEN"],
    keySubjects: ["Wiskunde", "Frans", "Nederlands", "Chemie", "Biologie", "Fysica", "Informaticawetenschappen", "Aardrijkskunde"],
  },
  Latijn_TC: {
    years: [3, 4],
    label: "Latijn Taal & Cultuur",
    aliases: ["LAT TC", "LATIJN TC", "LATIJN TAAL EN CULTUUR"],
    keySubjects: ["Wiskunde", "Frans", "Nederlands", "Engels", "Geschiedenis", "Latijn"],
  },
  Latijn_STEaM: {
    years: [3, 4],
    label: "Latijn STEaM",
    aliases: ["LAT STEAM", "LATIJN STEAM"],
    keySubjects: ["Wiskunde", "Frans", "Nederlands", "Informaticawetenschappen", "Latijn"],
  },
  Economische_Wetenschappen: {
    years: [3, 4],
    label: "Economische Wetenschappen",
    aliases: ["EW", "ECW", "ECONOMISCHE WETENSCHAPPEN"],
    keySubjects: ["Wiskunde", "Frans", "Nederlands", "Economie", "Engels"],
  },
  Humane_Wetenschappen: {
    years: [3, 4, 5, 6],
    label: "Humane Wetenschappen",
    aliases: ["HW", "HUMANE WETENSCHAPPEN"],
    keySubjects: ["Nederlands", "Frans", "Engels", "Geschiedenis", "Wiskunde"],
  },
  Moderne_Talen: {
    years: [3, 4, 5, 6],
    label: "Moderne Talen",
    aliases: ["MT", "MODERNE TALEN"],
    keySubjects: ["Nederlands", "Frans", "Engels", "Duits", "Geschiedenis"],
  },
  Grieks_Wiskunde: {
    years: [5, 6],
    label: "Grieks-Wiskunde",
    aliases: ["GWI", "GRIEKS WISKUNDE", "GRIEKS-WISKUNDE"],
    keySubjects: ["Wiskunde", "Grieks", "Latijn", "Nederlands", "Frans", "Fysica"],
  },
  Latijn_Moderne_Talen: {
    years: [5, 6],
    label: "Latijn-Moderne talen",
    aliases: ["LMT", "LATIJN MODERNE TALEN", "LATIJN-MODERNE TALEN"],
    keySubjects: ["Latijn", "Nederlands", "Frans", "Engels", "Duits"],
  },
  Latijn_Wetenschappen: {
    years: [5, 6],
    label: "Latijn-Wetenschappen",
    aliases: ["LWE", "LWE6", "LATIJN WETENSCHAPPEN", "LATIJN-WETENSCHAPPEN"],
    keySubjects: ["Latijn", "Wiskunde", "Chemie", "Biologie", "Fysica", "Nederlands", "Frans"],
  },
  Latijn_Wiskunde: {
    years: [5, 6],
    label: "Latijn-Wiskunde",
    aliases: ["LWI", "LATIJN WISKUNDE", "LATIJN-WISKUNDE"],
    keySubjects: ["Wiskunde", "Nederlands", "Frans", "Latijn", "Fysica", "Chemie"],
    confidence: "needs_school_validation",
  },
  Wetenschappen_Wiskunde: {
    years: [5, 6],
    label: "Wetenschappen-Wiskunde",
    aliases: ["WWI", "WEWI", "WETENSCHAPPEN WISKUNDE", "WETENSCHAPPEN-WISKUNDE"],
    keySubjects: ["Wiskunde", "Chemie", "Biologie", "Fysica", "Nederlands", "Frans"],
  },
  Economie_Wiskunde: {
    years: [5, 6],
    label: "Economie-Wiskunde",
    aliases: ["EWI", "EWI6", "EWI8", "ECWI", "ECONOMIE WISKUNDE", "ECONOMIE-WISKUNDE"],
    keySubjects: ["Wiskunde", "Economie", "Nederlands", "Frans", "Engels"],
  },
  Moderne_Talen_Wetenschappen: {
    years: [5, 6],
    label: "Moderne talen-Wetenschappen",
    aliases: ["MTWE", "MTWET", "MODERNE TALEN WETENSCHAPPEN", "MODERNE TALEN-WETENSCHAPPEN"],
    keySubjects: ["Nederlands", "Frans", "Engels", "Chemie", "Biologie", "Fysica"],
  },
  Economie_Moderne_Talen: {
    years: [5, 6],
    label: "Economie-Moderne talen",
    aliases: ["EMT", "ECMT", "ECONOMIE MODERNE TALEN", "ECONOMIE-MODERNE TALEN"],
    keySubjects: ["Economie", "Nederlands", "Frans", "Engels", "Duits"],
  },
};

export function inferYearFromClassCode(classCode) {
  const match = String(classCode || "").match(/\d/);
  return match ? Number(match[0]) : null;
}

export function periodSchemaForYear(year) {
  return Object.values(CLASS_TEACHER_PERIOD_SCHEMAS).find((schema) => schema.appliesToYears.includes(Number(year))) || null;
}

export function inferPeriodFromText(value, schema) {
  const text = normaliseKey(value);
  if (!schema) return null;
  return schema.periods.find((period) => period.patterns.some((pattern) => pattern.test(text))) || null;
}

export function inferTrackFromClassCode(classCode, year = inferYearFromClassCode(classCode)) {
  const text = normaliseKey(classCode);
  const options = trackOptionsForYear(year);
  const candidates = options.flatMap((option) => option.aliases.map((alias) => ({
    option,
    alias,
    key: normaliseKey(alias).replace(/\s+/g, ""),
  }))).sort((a, b) => b.key.length - a.key.length);
  const compactText = text.replace(/\s+/g, "");

  for (const candidate of candidates) {
    if (candidate.key && compactText.includes(candidate.key)) {
      return {
        id: candidate.option.id,
        label: candidate.option.label,
        keySubjects: candidate.option.keySubjects,
        confidence: candidate.option.confidence || "inferred",
      };
    }
  }
  return {
    id: null,
    label: "",
    keySubjects: [],
    confidence: "unknown",
  };
}

export function trackOptionsForYear(year) {
  return Object.entries(TRACK_KEY_SUBJECTS)
    .filter(([, config]) => !config.years?.length || config.years.includes(Number(year)))
    .map(([id, config]) => ({
      id,
      label: config.label || id.replace(/_/g, " "),
      years: config.years || [],
      aliases: config.aliases || [],
      keySubjects: config.keySubjects || [],
      confidence: config.confidence || "school_offer",
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

export function trackById(trackId) {
  const config = TRACK_KEY_SUBJECTS[trackId];
  if (!config) return null;
  return {
    id: trackId,
    label: config.label || trackId.replace(/_/g, " "),
    keySubjects: config.keySubjects || [],
    confidence: config.confidence || "manual",
  };
}

export function canonicalSubject(value) {
  const stripped = String(value || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const key = normaliseKey(stripped);
  return SUBJECT_ALIASES.get(key) || stripped;
}

export function isKnownSubject(value) {
  return SUBJECT_ALIASES.has(normaliseKey(value));
}

export function normaliseReportMetric(value) {
  const text = normaliseKey(value).replace(/\s+/g, "");
  if (/^PCT(?:\/100)?$/.test(text)) return "PCT";
  if (/^TOT\d*$/.test(text)) return text;
  if (/^DW\d*$/.test(text)) return text;
  if (/^EX\d*$/.test(text)) return text;
  if (text === "JAAR") return "PCT";
  return "";
}

export function normaliseKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,:;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
