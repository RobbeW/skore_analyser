const PRESET_KEY = "skore-analyser-weighting-presets";
const PREFERENCES_KEY = "skore-analyser-preferences";
const NOTES_KEY = "skore-analyser-teacher-notes";
const DECISIONS_KEY = "skore-analyser-teacher-decisions";

export function loadPresets() {
  try {
    return JSON.parse(localStorage.getItem(PRESET_KEY) || "[]");
  } catch {
    return [];
  }
}

export function savePreset(name, config) {
  const presets = loadPresets().filter((preset) => preset.name !== name);
  presets.unshift({
    name,
    savedAt: new Date().toISOString(),
    subject: config.subject,
    threshold: config.threshold,
    categories: config.categories,
  });
  localStorage.setItem(PRESET_KEY, JSON.stringify(presets.slice(0, 20)));
  return presets;
}

export function applyPreset(config, preset) {
  if (!preset) return config;
  return {
    ...config,
    subject: preset.subject || config.subject,
    threshold: preset.threshold ?? config.threshold,
    categories: preset.categories?.length ? preset.categories : config.categories,
  };
}

export function loadPreferences() {
  try {
    return JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "{}");
  } catch {
    return {};
  }
}

export function savePreferences(patch) {
  const preferences = {
    ...loadPreferences(),
    ...patch,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  return preferences;
}

export function loadNotes(workspaceKey) {
  try {
    const allNotes = JSON.parse(localStorage.getItem(NOTES_KEY) || "{}");
    return allNotes[workspaceKey] || {};
  } catch {
    return {};
  }
}

export function saveNotes(workspaceKey, notes) {
  let allNotes = {};
  try {
    allNotes = JSON.parse(localStorage.getItem(NOTES_KEY) || "{}");
  } catch {
    allNotes = {};
  }
  allNotes[workspaceKey] = notes || {};
  localStorage.setItem(NOTES_KEY, JSON.stringify(allNotes));
  return allNotes[workspaceKey];
}

export function saveNote(workspaceKey, studentId, note) {
  let allNotes = {};
  try {
    allNotes = JSON.parse(localStorage.getItem(NOTES_KEY) || "{}");
  } catch {
    allNotes = {};
  }
  allNotes[workspaceKey] = {
    ...(allNotes[workspaceKey] || {}),
    [studentId]: note,
  };
  localStorage.setItem(NOTES_KEY, JSON.stringify(allNotes));
  return allNotes[workspaceKey];
}

export function loadDecisions(workspaceKey) {
  try {
    const allDecisions = JSON.parse(localStorage.getItem(DECISIONS_KEY) || "{}");
    return allDecisions[workspaceKey] || {};
  } catch {
    return {};
  }
}

export function saveDecisions(workspaceKey, decisions) {
  let allDecisions = {};
  try {
    allDecisions = JSON.parse(localStorage.getItem(DECISIONS_KEY) || "{}");
  } catch {
    allDecisions = {};
  }
  allDecisions[workspaceKey] = decisions || {};
  localStorage.setItem(DECISIONS_KEY, JSON.stringify(allDecisions));
  return allDecisions[workspaceKey];
}

export function saveDecision(workspaceKey, studentId, patch) {
  const current = loadDecisions(workspaceKey);
  current[studentId] = {
    ...(current[studentId] || {}),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  return saveDecisions(workspaceKey, current);
}
