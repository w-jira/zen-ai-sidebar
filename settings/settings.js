"use strict";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║  Zen AI Sidebar — settings.js                                    ║
   ║  All logic in this file (no inline scripts — Firefox CSP)        ║
   ╚══════════════════════════════════════════════════════════════════╝ */

const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant integrated into a browser sidebar. Be concise and clear. When given page content, use it to answer questions about the page.";

const DEFAULT_PROFILES = [
  { id: "default",    name: "Default",    systemPrompt: DEFAULT_SYSTEM_PROMPT, temperature: 0.7, maxTokens: 2048 },
  { id: "creative",   name: "Creative",   systemPrompt: "You are a creative writing assistant. Be imaginative, expressive, and playful.", temperature: 1.4, maxTokens: 4096 },
  { id: "precise",    name: "Precise",    systemPrompt: "You are a precise, technical assistant. Give accurate, structured answers. Cite sources when possible.", temperature: 0.2, maxTokens: 2048 },
  { id: "coder",      name: "Coder",      systemPrompt: "You are an expert programming assistant. Write clean, well-commented code. Explain your reasoning.", temperature: 0.3, maxTokens: 4096 },
  { id: "unhinged",   name: "Unhinged",   systemPrompt: "You are an unhinged, brutally honest AI with zero filter. You cuss freely, roast without mercy, and drip with sarcasm. You still answer questions accurately and helpfully — you just do it like a foul-mouthed friend who has no chill. Be vulgar, be savage, be funny. Never hold back.", temperature: 1.0, maxTokens: 4096 },
];

// Must match MODEL_LIST in panel.js
const MODEL_LIST = [
  { id: "gpt-5.4",           name: "GPT-5.4",            group: "OpenAI" },
  { id: "gpt-5.4-mini",      name: "GPT-5.4 mini",       group: "OpenAI" },
  { id: "gpt-5.4-nano",      name: "GPT-5.4 nano",       group: "OpenAI" },
  { id: "gpt-5.3",           name: "GPT-5.3 Instant",    group: "OpenAI" },
  { id: "o3",                name: "o3",                  group: "OpenAI" },
  { id: "o4-mini",           name: "o4-mini",             group: "OpenAI" },
  { id: "gpt-4o",            name: "GPT-4o",              group: "OpenAI" },
  { id: "gpt-4o-mini",       name: "GPT-4o mini",         group: "OpenAI" },
  { id: "claude-opus-4-6",   name: "Claude Opus 4.6",     group: "Anthropic" },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6",   group: "Anthropic" },
  { id: "claude-haiku-4-5",  name: "Claude Haiku 4.5",    group: "Anthropic" },
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", group: "Anthropic" },
  { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet", group: "Anthropic" },
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro",  group: "Google" },
  { id: "gemini-3.1-flash",  name: "Gemini 3.1 Flash",    group: "Google" },
  { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash-Lite", group: "Google" },
  { id: "gemini-2.5-pro",    name: "Gemini 2.5 Pro",      group: "Google" },
  { id: "google/gemma-4-27b-it", name: "Gemma 4 27B",        group: "Google" },
  { id: "google/gemma-4-4b-it",  name: "Gemma 4 4B",         group: "Google" },
  { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick", group: "Meta" },
  { id: "meta-llama/llama-4-scout", name: "Llama 4 Scout", group: "Meta" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", group: "Meta" },
  { id: "grok-4.20",         name: "Grok 4.20",           group: "xAI" },
  { id: "grok-4.1-fast",     name: "Grok 4.1 Fast",       group: "xAI" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1",      group: "DeepSeek" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat",  group: "DeepSeek" },
  { id: "mistral-small-2603", name: "Mistral Small 4",    group: "Mistral" },
  { id: "mistral-large-latest", name: "Mistral Large",    group: "Mistral" },
  { id: "codestral-latest",  name: "Codestral",           group: "Mistral" },
];

/* ═══════════════════════════ DOM REFS ═════════════════════════════ */
const $ = (id) => document.getElementById(id);

const dom = {
  // Connection
  endpoint:     $("endpoint"),
  apiKey:       $("apiKey"),
  model:        $("model"),
  btnToggleKey: $("btn-toggle-key"),
  btnTest:      $("btn-test"),
  testResult:   $("test-result"),
  onboarding:   $("onboarding-card"),
  presetGrid:   $("preset-grid"),
  // Provider keys
  anthropicKey: $("anthropicKey"),
  geminiKey:    $("geminiKey"),
  // Behaviour
  profileSelect:  $("profile-select"),
  systemPrompt:   $("systemPrompt"),
  maxTokens:      $("maxTokens"),
  temperature:    $("temperature"),
  temperatureVal: $("temperature-val"),
  btnResetPrompt: $("btn-reset-prompt"),
  btnSaveProfile: $("btn-save-profile"),
  btnDeleteProfile: $("btn-delete-profile"),
  // Appearance
  themeSelect:    $("theme-select"),
  themeGroup:     $("theme-toggle-group"),
  fontSizeGroup:  $("font-size-toggle-group"),
  // Models
  modelList:      $("model-list"),
  modelEmpty:     $("model-empty"),
  newModelLabel:  $("new-model-label"),
  newModelId:     $("new-model-id"),
  btnAddModel:    $("btn-add-model"),
  quickAddChips:  $("quick-add-chips"),
  // Form
  settingsForm:   $("settings-form"),
  btnSave:        $("btn-save"),
  saveStatus:     $("save-status"),
};

/* ═══════════════════════════ TAB SWITCHING ═════════════════════════ */
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;
    document.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    document.querySelectorAll(".tab-panel").forEach((p) => {
      p.style.display = "none";
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    $("tab-" + target).style.display = "block";
  });
});

/* ═══════════════════════════ MODEL SELECT BUILDER ══════════════════ */
function buildModelSelect(selectedId) {
  dom.model.textContent = "";
  let lastGroup = "";
  let optgroup;
  let found = false;
  MODEL_LIST.forEach((m) => {
    if (m.group !== lastGroup) {
      optgroup = document.createElement("optgroup");
      optgroup.label = m.group;
      dom.model.appendChild(optgroup);
      lastGroup = m.group;
    }
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name;
    if (m.id === selectedId) { opt.selected = true; found = true; }
    optgroup.appendChild(opt);
  });
  // If stored model isn't in the list (custom model), add it so it stays selected
  if (!found && selectedId) {
    const customGroup = document.createElement("optgroup");
    customGroup.label = "Custom";
    const opt = document.createElement("option");
    opt.value = selectedId;
    opt.textContent = selectedId;
    opt.selected = true;
    customGroup.appendChild(opt);
    dom.model.appendChild(customGroup);
  }
}

// Auto-save model change to storage immediately (no Save button needed)
dom.model.addEventListener("change", async () => {
  const id = dom.model.value;
  await browser.storage.local.set({ model: id });
  showStatus(dom.saveStatus, "Model updated", "ok");
});

/* ═══════════════════════════ BACKEND PRESETS ═══════════════════════ */
dom.presetGrid.addEventListener("click", (e) => {
  const card = e.target.closest(".preset-card");
  if (!card) return;
  dom.presetGrid.querySelectorAll(".preset-card").forEach((c) => c.classList.remove("selected"));
  card.classList.add("selected");
  const ep = card.dataset.endpoint;
  dom.endpoint.value = ep;
  if (ep === "") {
    dom.endpoint.focus();
  } else if (ep === "https://") {
    dom.endpoint.focus();
    dom.endpoint.setSelectionRange(ep.length, ep.length);
  }
});

/* ═══════════════════════════ LOAD / SAVE ══════════════════════════ */
async function loadSettings() {
  const stored = await browser.storage.local.get([
    "endpoint", "apiKey", "anthropicKey", "geminiKey",
    "model", "systemPrompt", "maxTokens", "temperature",
    "theme", "fontSize", "profiles", "activeProfile",
  ]);

  dom.endpoint.value     = stored.endpoint     || "";
  dom.apiKey.value       = stored.apiKey       || "";
  dom.anthropicKey.value = stored.anthropicKey || "";
  dom.geminiKey.value    = stored.geminiKey    || "";
  buildModelSelect(stored.model || "gpt-4o");
  dom.systemPrompt.value = stored.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  dom.maxTokens.value    = stored.maxTokens    || 2048;
  dom.temperature.value  = stored.temperature !== undefined ? stored.temperature : 0.7;
  dom.temperatureVal.textContent = parseFloat(dom.temperature.value).toFixed(2);

  // Hide onboarding if already configured
  if (stored.apiKey || stored.anthropicKey || stored.geminiKey) {
    dom.onboarding.style.display = "none";
  }

  // Theme
  const theme = stored.theme || "dark";
  dom.themeSelect.value = theme;
  applyTheme(theme);
  syncThemeButtons(theme);

  // Font size
  const fontSize = normalizeFontSize(stored.fontSize);
  syncFontSizeButtons(fontSize);

  // Profiles
  loadProfiles(stored.profiles, stored.activeProfile);

  // Highlight matching preset card
  highlightPreset(stored.endpoint || "");
}

function normalizeFontSize(val) {
  if (!val) return "m";
  const map = { small: "s", medium: "m", large: "l", s: "s", m: "m", l: "l" };
  return map[val] || "m";
}

function highlightPreset(endpoint) {
  dom.presetGrid.querySelectorAll(".preset-card").forEach((card) => {
    card.classList.toggle("selected", card.dataset.endpoint === endpoint);
  });
}

dom.settingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await browser.storage.local.set({
      endpoint:     dom.endpoint.value.trim().replace(/\/+$/, ""),
      apiKey:       dom.apiKey.value.trim(),
      anthropicKey: dom.anthropicKey.value.trim(),
      geminiKey:    dom.geminiKey.value.trim(),
      model:        dom.model.value.trim(),
      systemPrompt: dom.systemPrompt.value.trim(),
      maxTokens:    parseInt(dom.maxTokens.value, 10),
      temperature:  parseFloat(dom.temperature.value),
      theme:        dom.themeSelect.value,
    });
    showStatus(dom.saveStatus, "Saved", "ok");
  } catch (err) {
    showStatus(dom.saveStatus, "Error saving", "err");
  }
});

/* ═══════════════════════════ AUTO-SAVE KEY FIELDS ═════════════════ */
// Save connection fields on blur so sidebar picks them up immediately
["endpoint", "apiKey", "anthropicKey", "geminiKey"].forEach((field) => {
  dom[field].addEventListener("change", async () => {
    const obj = {};
    let val = dom[field].value.trim();
    if (field === "endpoint") val = val.replace(/\/+$/, "");
    obj[field] = val;
    await browser.storage.local.set(obj);
  });
});

/* ═══════════════════════════ TEST CONNECTION ═══════════════════════ */
dom.btnTest.addEventListener("click", async () => {
  const endpoint = dom.endpoint.value.trim().replace(/\/+$/, "");
  const apiKey   = dom.apiKey.value.trim();
  const model    = dom.model.value.trim();
  const anthropicKey = dom.anthropicKey.value.trim();
  const geminiKey    = dom.geminiKey.value.trim();

  const isLocal = endpoint && (endpoint.startsWith("http://localhost") || endpoint.startsWith("http://127.0.0.1"));
  const isAnthropic = !endpoint && model.startsWith("claude");
  const isGemini = !endpoint && model.startsWith("gemini");

  // Need at least one credential for the detected provider
  const effectiveKey = isAnthropic ? (anthropicKey || apiKey)
                     : isGemini    ? (geminiKey || apiKey)
                     : apiKey;
  if (!effectiveKey && !isLocal) {
    const hint = isAnthropic ? "Enter an Anthropic key (or API key) to test Claude models"
               : isGemini    ? "Enter a Google AI key (or API key) to test Gemini models"
               : "Enter an API key to test the connection";
    showStatus(dom.testResult, hint, "err");
    return;
  }

  dom.btnTest.disabled = true;
  showStatus(dom.testResult, "Testing\u2026", "");

  try {
    let url, headers, body;

    if (isAnthropic) {
      url = "https://api.anthropic.com/v1/messages";
      headers = {
        "Content-Type": "application/json",
        "x-api-key": effectiveKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      };
      body = JSON.stringify({
        model: model || "claude-sonnet-4-6",
        messages: [{ role: "user", content: "Reply with: OK" }],
        max_tokens: 10,
      });
    } else if (isGemini) {
      url = "https://generativelanguage.googleapis.com/v1beta/models/" +
            (model || "gemini-3.1-flash") + ":generateContent?key=" + effectiveKey;
      headers = { "Content-Type": "application/json" };
      body = JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Reply with: OK" }] }],
        generationConfig: { maxOutputTokens: 10 },
      });
    } else {
      const base = endpoint || "https://api.openai.com/v1";
      url = base.endsWith("/chat/completions") ? base : base + "/chat/completions";
      headers = { "Content-Type": "application/json" };
      if (effectiveKey) headers["Authorization"] = "Bearer " + effectiveKey;
      body = JSON.stringify({
        model: model || "gpt-4o",
        messages: [{ role: "user", content: "Reply with: OK" }],
        max_tokens: 10,
        stream: false,
      });
    }

    const res = await fetch(url, { method: "POST", headers, body });

    if (res.ok) {
      const data = await res.json();
      let reply;
      if (isAnthropic) {
        reply = (data.content && data.content[0] && data.content[0].text) || "";
      } else if (isGemini) {
        reply = (data.candidates && data.candidates[0] && data.candidates[0].content &&
                 data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
                 data.candidates[0].content.parts[0].text) || "";
      } else {
        reply = (data.choices && data.choices[0] && data.choices[0].message &&
                 data.choices[0].message.content) || "";
      }
      showStatus(dom.testResult, "\u2713 Connected \u2014 \"" + reply.trim().slice(0, 40) + "\"", "ok");
    } else {
      const txt = await res.text().catch(() => "");
      showStatus(dom.testResult, "\u2717 " + res.status + ": " + txt.slice(0, 80), "err");
    }
  } catch (err) {
    showStatus(dom.testResult, "\u2717 " + err.message, "err");
  } finally {
    dom.btnTest.disabled = false;
  }
});

/* ═══════════════════════════ API KEY TOGGLE ════════════════════════ */
dom.btnToggleKey.addEventListener("click", () => {
  const isHidden = dom.apiKey.type === "password";
  dom.apiKey.type = isHidden ? "text" : "password";
});

/* ═══════════════════════════ TEMPERATURE LABEL ════════════════════ */
dom.temperature.addEventListener("input", () => {
  dom.temperatureVal.textContent = parseFloat(dom.temperature.value).toFixed(2);
});

/* ═══════════════════════════ RESET PROMPT ══════════════════════════ */
dom.btnResetPrompt.addEventListener("click", () => {
  dom.systemPrompt.value = DEFAULT_SYSTEM_PROMPT;
});

/* ═══════════════════════════ PROFILES ═════════════════════════════ */
let profiles = [];
let activeProfileId = "default";

function loadProfiles(stored, activeId) {
  profiles = Array.isArray(stored) && stored.length > 0 ? stored : [...DEFAULT_PROFILES];
  activeProfileId = activeId || "default";
  renderProfileSelect();
  applyProfile(activeProfileId);
}

function renderProfileSelect() {
  dom.profileSelect.textContent = "";
  profiles.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === activeProfileId) opt.selected = true;
    dom.profileSelect.appendChild(opt);
  });
}

function applyProfile(id) {
  const p = profiles.find((pr) => pr.id === id);
  if (!p) return;
  activeProfileId = id;
  dom.systemPrompt.value = p.systemPrompt;
  dom.temperature.value = p.temperature;
  dom.temperatureVal.textContent = parseFloat(p.temperature).toFixed(2);
  dom.maxTokens.value = p.maxTokens;
  // Show/hide delete button (can't delete defaults)
  dom.btnDeleteProfile.style.display = DEFAULT_PROFILES.some((d) => d.id === id) ? "none" : "inline";
}

dom.profileSelect.addEventListener("change", async () => {
  activeProfileId = dom.profileSelect.value;
  applyProfile(activeProfileId);
  const p = profiles.find((pr) => pr.id === activeProfileId);
  // Save both the profile selection AND its values so sidebar picks them up immediately
  await browser.storage.local.set({
    activeProfile: activeProfileId,
    systemPrompt: p ? p.systemPrompt : DEFAULT_SYSTEM_PROMPT,
    temperature: p ? p.temperature : 0.7,
    maxTokens: p ? p.maxTokens : 2048,
  });
  showStatus(dom.saveStatus, "Profile applied", "ok");
});

dom.btnSaveProfile.addEventListener("click", async () => {
  const name = prompt("Profile name:");
  if (!name) return;
  const id = "profile_" + Date.now();
  const profile = {
    id,
    name,
    systemPrompt: dom.systemPrompt.value.trim(),
    temperature: parseFloat(dom.temperature.value),
    maxTokens: parseInt(dom.maxTokens.value, 10),
  };
  profiles.push(profile);
  activeProfileId = id;
  renderProfileSelect();
  dom.btnDeleteProfile.style.display = "inline";
  await browser.storage.local.set({ profiles, activeProfile: id });
  showStatus(dom.saveStatus, "Profile saved", "ok");
});

dom.btnDeleteProfile.addEventListener("click", async () => {
  if (DEFAULT_PROFILES.some((d) => d.id === activeProfileId)) return;
  profiles = profiles.filter((p) => p.id !== activeProfileId);
  activeProfileId = "default";
  renderProfileSelect();
  applyProfile(activeProfileId);
  await browser.storage.local.set({ profiles, activeProfile: activeProfileId });
  showStatus(dom.saveStatus, "Profile deleted", "ok");
});

/* ═══════════════════════════ THEME ═════════════════════════════════ */
function applyTheme(theme) {
  const resolved = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

function syncThemeButtons(theme) {
  dom.themeGroup.querySelectorAll(".toggle-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.value === theme);
  });
}

dom.themeGroup.addEventListener("click", async (e) => {
  const btn = e.target.closest(".toggle-btn");
  if (!btn) return;
  const value = btn.dataset.value;
  dom.themeSelect.value = value;
  applyTheme(value);
  syncThemeButtons(value);
  await browser.storage.local.set({ theme: value });
});

/* ═══════════════════════════ FONT SIZE ═════════════════════════════ */
function syncFontSizeButtons(size) {
  dom.fontSizeGroup.querySelectorAll(".toggle-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.value === size);
  });
}

dom.fontSizeGroup.addEventListener("click", async (e) => {
  const btn = e.target.closest(".toggle-btn");
  if (!btn) return;
  dom.fontSizeGroup.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  await browser.storage.local.set({ fontSize: btn.dataset.value });
});

/* ═══════════════════════════ MODEL MANAGEMENT ═════════════════════ */
async function loadModels() {
  const s = await browser.storage.local.get(["models", "activeModel"]);
  const models = s.models || [];
  const active = s.activeModel || "";
  renderModelList(models, active);
}

function renderModelList(models, active) {
  dom.modelList.textContent = "";

  if (models.length === 0) {
    dom.modelEmpty.style.display = "flex";
    return;
  }
  dom.modelEmpty.style.display = "none";

  models.forEach((m, i) => {
    const row = document.createElement("div");
    row.className = "model-row" + (m.id === active ? " active" : "");

    const dot = document.createElement("span");
    dot.className = "model-active-dot";
    dot.title = m.id === active ? "Active model" : "Not active";

    const labelSpan = document.createElement("span");
    labelSpan.className = "model-label";
    labelSpan.textContent = m.label;

    const idSpan = document.createElement("span");
    idSpan.className = "model-id";
    idSpan.textContent = m.id;

    const actions = document.createElement("div");
    actions.className = "model-actions";

    if (m.id !== active) {
      const setBtn = document.createElement("button");
      setBtn.className = "btn-ghost btn-sm";
      setBtn.type = "button";
      setBtn.textContent = "Set default";
      setBtn.addEventListener("click", async () => {
        await browser.storage.local.set({ activeModel: m.id, model: m.id });
        dom.model.value = m.id;
        loadModels();
      });
      actions.appendChild(setBtn);
    } else {
      const tag = document.createElement("span");
      tag.className = "tag-active";
      tag.textContent = "Default";
      actions.appendChild(tag);
    }

    const delBtn = document.createElement("button");
    delBtn.className = "btn-icon btn-danger";
    delBtn.type = "button";
    delBtn.title = "Delete";
    delBtn.textContent = "\u00D7"; // &times;
    delBtn.addEventListener("click", async () => {
      const s = await browser.storage.local.get(["models", "activeModel"]);
      const models = s.models || [];
      const deleted = models[i];
      models.splice(i, 1);
      const updates = { models };
      if (deleted && deleted.id === s.activeModel) {
        updates.activeModel = "";
      }
      await browser.storage.local.set(updates);
      loadModels();
    });
    actions.appendChild(delBtn);

    row.appendChild(dot);
    row.appendChild(labelSpan);
    row.appendChild(idSpan);
    row.appendChild(actions);
    dom.modelList.appendChild(row);
  });
}

dom.btnAddModel.addEventListener("click", async () => {
  const label = dom.newModelLabel.value.trim();
  const id = dom.newModelId.value.trim();
  if (!label || !id) return;
  const s = await browser.storage.local.get("models");
  const models = s.models || [];
  if (models.some((m) => m.id === id)) {
    dom.newModelId.focus();
    return;
  }
  models.push({ id, label });
  await browser.storage.local.set({ models });
  dom.newModelLabel.value = "";
  dom.newModelId.value = "";
  loadModels();
});

dom.quickAddChips.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  dom.newModelId.value = chip.dataset.id;
  dom.newModelLabel.value = chip.dataset.label;
  dom.newModelId.focus();
});

/* ═══════════════════════════ HELPERS ══════════════════════════════ */
function showStatus(el, msg, type) {
  el.textContent = msg;
  el.className = type;
  if (type === "ok") {
    setTimeout(() => { el.textContent = ""; el.className = ""; }, 3000);
  }
}

/* ═══════════════════════════ BOOT ═════════════════════════════════ */
loadSettings();
loadModels();
