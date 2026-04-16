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

let connectionMode = "proxy";  // "proxy" | "direct" | "local"

const dom = {
  // Mode toggle
  modeToggle:     $("mode-toggle"),
  modeProxy:      $("mode-proxy"),
  modeDirect:     $("mode-direct"),
  modeLocal:      $("mode-local"),
  // Proxy fields
  endpoint:       $("endpoint"),
  apiKey:         $("apiKey"),
  model:          $("model"),
  btnToggleKey:   $("btn-toggle-key"),
  btnTest:        $("btn-test"),
  testResult:     $("test-result"),
  presetGrid:     $("preset-grid"),
  btnDetectModels: $("btn-detect-models"),
  // Direct fields
  openaiKey:      $("openaiKey"),
  anthropicKey:   $("anthropicKey"),
  geminiKey:      $("geminiKey"),
  modelDirect:    $("model-direct"),
  btnTestDirect:  $("btn-test-direct"),
  testResultDirect: $("test-result-direct"),
  // Local fields
  localProviderToggle: $("local-provider-toggle"),
  localEndpoint:  $("localEndpoint"),
  modelLocal:     $("model-local"),
  btnDetectLocal: $("btn-detect-local"),
  btnTestLocal:   $("btn-test-local"),
  testResultLocal: $("test-result-local"),
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
  // Models tab
  modelList:      $("model-list"),
  modelEmpty:     $("model-empty"),
  btnRedetect:    $("btn-redetect"),
  btnEnableAll:   $("btn-enable-all"),
  btnDisableAll:  $("btn-disable-all"),
  modelCount:     $("model-count"),
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

/* ═══════════════════════════ CONNECTION MODE ═══════════════════════ */
function inferConnectionMode(stored) {
  if (stored.connectionMode) return stored.connectionMode;
  if (stored.endpoint && stored.endpoint.includes("localhost")) return "local";
  if (stored.endpoint) return "proxy";
  if (stored.anthropicKey || stored.geminiKey) return "direct";
  if (stored.apiKey) return "direct";
  return "proxy"; // default for new users
}

function syncModeToggle(mode) {
  connectionMode = mode;
  // Update toggle buttons
  dom.modeToggle.querySelectorAll(".toggle-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.value === mode);
  });
  // Show/hide mode sections
  dom.modeProxy.style.display  = mode === "proxy"  ? "block" : "none";
  dom.modeDirect.style.display = mode === "direct" ? "block" : "none";
  dom.modeLocal.style.display  = mode === "local"  ? "block" : "none";
}

// Mode toggle click handler
dom.modeToggle.addEventListener("click", async (e) => {
  const btn = e.target.closest(".toggle-btn");
  if (!btn) return;
  const mode = btn.dataset.value;
  syncModeToggle(mode);
  await browser.storage.local.set({ connectionMode: mode });
});

// Local provider toggle (Ollama / LM Studio / Custom)
if (dom.localProviderToggle) {
  dom.localProviderToggle.addEventListener("click", async (e) => {
    const btn = e.target.closest(".toggle-btn");
    if (!btn) return;
    const provider = btn.dataset.value;
    dom.localProviderToggle.querySelectorAll(".toggle-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.value === provider);
    });
    const urls = { ollama: "http://localhost:11434/v1", lmstudio: "http://localhost:1234/v1", custom: "" };
    dom.localEndpoint.value = urls[provider] || "";
    dom.localEndpoint.readOnly = provider !== "custom";
    await browser.storage.local.set({ localProvider: provider, localEndpoint: dom.localEndpoint.value });
  });
}

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

// Build a filtered model select for direct/local modes
function buildFilteredModelSelect(selectEl, selectedId, mode) {
  selectEl.textContent = "";
  if (mode === "direct") {
    // Only show models for providers with keys configured
    const hasOpenAI = dom.openaiKey && dom.openaiKey.value.trim();
    const hasAnthropic = dom.anthropicKey && dom.anthropicKey.value.trim();
    const hasGemini = dom.geminiKey && dom.geminiKey.value.trim();
    const filtered = MODEL_LIST.filter((m) => {
      if (m.group === "OpenAI" && hasOpenAI) return true;
      if (m.group === "Anthropic" && hasAnthropic) return true;
      if (m.group === "Google" && hasGemini) return true;
      return false;
    });
    if (filtered.length === 0) {
      const opt = document.createElement("option");
      opt.textContent = "Enter at least one API key above";
      opt.disabled = true;
      selectEl.appendChild(opt);
      return;
    }
    let lastGroup = "";
    let optgroup;
    filtered.forEach((m) => {
      if (m.group !== lastGroup) {
        optgroup = document.createElement("optgroup");
        optgroup.label = m.group;
        selectEl.appendChild(optgroup);
        lastGroup = m.group;
      }
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      if (m.id === selectedId) opt.selected = true;
      optgroup.appendChild(opt);
    });
  } else if (mode === "local") {
    // Local models are discovered, show placeholder
    const opt = document.createElement("option");
    opt.textContent = "Click 'Detect installed models' above";
    opt.disabled = true;
    selectEl.appendChild(opt);
  }
}

// Auto-save model change to storage immediately (no Save button needed)
function setupModelAutoSave(selectEl) {
  selectEl.addEventListener("change", async () => {
    await browser.storage.local.set({ model: selectEl.value });
    showStatus(dom.saveStatus, "Model updated", "ok");
  });
}
setupModelAutoSave(dom.model);
if (dom.modelDirect) setupModelAutoSave(dom.modelDirect);
if (dom.modelLocal) setupModelAutoSave(dom.modelLocal);

// Auto-save direct mode keys on change
["openaiKey", "anthropicKey", "geminiKey"].forEach((field) => {
  const el = dom[field];
  if (!el) return;
  el.addEventListener("change", async () => {
    const obj = {};
    obj[field] = el.value.trim();
    // In direct mode, also set apiKey to the OpenAI key for panel.js compatibility
    if (field === "openaiKey") obj.apiKey = el.value.trim();
    await browser.storage.local.set(obj);
    // Rebuild direct model select when keys change
    if (dom.modelDirect) {
      const current = dom.modelDirect.value;
      buildFilteredModelSelect(dom.modelDirect, current, "direct");
    }
  });
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
    "connectionMode", "endpoint", "apiKey", "openaiKey", "anthropicKey", "geminiKey",
    "localEndpoint", "localProvider",
    "model", "systemPrompt", "maxTokens", "temperature",
    "theme", "fontSize", "profiles", "activeProfile",
    "discoveredModels", "enabledModels",
  ]);

  dom.endpoint.value     = stored.endpoint     || "";
  dom.apiKey.value       = stored.apiKey       || "";
  if (dom.openaiKey) dom.openaiKey.value = stored.openaiKey || stored.apiKey || "";
  dom.anthropicKey.value = stored.anthropicKey || "";
  dom.geminiKey.value    = stored.geminiKey    || "";
  if (dom.localEndpoint) dom.localEndpoint.value = stored.localEndpoint || "http://localhost:11434/v1";
  buildModelSelect(stored.model || "gpt-4o");
  // Also build direct/local model selects
  if (dom.modelDirect) buildFilteredModelSelect(dom.modelDirect, stored.model || "gpt-4o", "direct");
  if (dom.modelLocal) buildFilteredModelSelect(dom.modelLocal, stored.model || "", "local");
  dom.systemPrompt.value = stored.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  dom.maxTokens.value    = stored.maxTokens    || 2048;
  dom.temperature.value  = stored.temperature !== undefined ? stored.temperature : 0.7;
  dom.temperatureVal.textContent = parseFloat(dom.temperature.value).toFixed(2);

  // Connection mode
  connectionMode = stored.connectionMode || inferConnectionMode(stored);
  syncModeToggle(connectionMode);

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

  // Load discovered models into Models tab
  discoveredModels = stored.discoveredModels || [];
  enabledModels = stored.enabledModels || [];
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
    // Get active model from whichever mode's select is visible
    const activeModel = connectionMode === "direct" && dom.modelDirect
      ? dom.modelDirect.value
      : connectionMode === "local" && dom.modelLocal
        ? dom.modelLocal.value
        : dom.model.value;
    await browser.storage.local.set({
      connectionMode: connectionMode,
      endpoint:     dom.endpoint.value.trim().replace(/\/+$/, ""),
      apiKey:       dom.apiKey.value.trim(),
      openaiKey:    dom.openaiKey ? dom.openaiKey.value.trim() : "",
      anthropicKey: dom.anthropicKey.value.trim(),
      geminiKey:    dom.geminiKey.value.trim(),
      localEndpoint: dom.localEndpoint ? dom.localEndpoint.value.trim() : "",
      localProvider: dom.localProviderToggle ? (dom.localProviderToggle.querySelector(".toggle-btn.active") || {}).dataset?.value || "ollama" : "ollama",
      model:        activeModel,
      systemPrompt: dom.systemPrompt.value.trim(),
      maxTokens:    parseInt(dom.maxTokens.value, 10) || 2048,
      temperature:  isNaN(parseFloat(dom.temperature.value)) ? 0.7 : parseFloat(dom.temperature.value),
      theme:        dom.themeSelect.value,
    });
    showStatus(dom.saveStatus, "Saved", "ok");
  } catch (err) {
    showStatus(dom.saveStatus, "Error saving", "err");
  }
});

/* ═══════════════════════════ AUTO-SAVE KEY FIELDS ═════════════════ */
// Save connection fields on blur so sidebar picks them up immediately
["endpoint", "apiKey", "anthropicKey", "geminiKey", "localEndpoint"].forEach((field) => {
  if (!dom[field]) return;
  dom[field].addEventListener("change", async () => {
    const obj = {};
    let val = dom[field].value.trim();
    if (field === "endpoint" || field === "localEndpoint") val = val.replace(/\/+$/, "");
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

/* ═══════════════════════════ TEST DIRECT CONNECTION ═══════════════ */
if (dom.btnTestDirect) {
  dom.btnTestDirect.addEventListener("click", async () => {
    const openaiKey = dom.openaiKey ? dom.openaiKey.value.trim() : "";
    const anthropicKey = dom.anthropicKey.value.trim();
    const geminiKey = dom.geminiKey.value.trim();
    const model = dom.modelDirect ? dom.modelDirect.value.trim() : "";

    if (!openaiKey && !anthropicKey && !geminiKey) {
      showStatus(dom.testResultDirect, "Enter at least one API key to test", "err");
      return;
    }

    dom.btnTestDirect.disabled = true;
    showStatus(dom.testResultDirect, "Testing\u2026", "");

    const results = [];

    try {
      // Test each configured provider
      if (anthropicKey) {
        try {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": anthropicKey,
              "anthropic-version": "2023-06-01",
              "anthropic-dangerous-direct-browser-access": "true",
            },
            body: JSON.stringify({
              model: "claude-haiku-4-5",
              messages: [{ role: "user", content: "Reply with: OK" }],
              max_tokens: 10,
            }),
          });
          results.push(res.ok ? "\u2713 Anthropic" : "\u2717 Anthropic (" + res.status + ")");
        } catch (err) {
          results.push("\u2717 Anthropic: " + err.message);
        }
      }

      if (geminiKey) {
        try {
          const res = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=" + geminiKey,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: "Reply with: OK" }] }],
                generationConfig: { maxOutputTokens: 10 },
              }),
            }
          );
          results.push(res.ok ? "\u2713 Google" : "\u2717 Google (" + res.status + ")");
        } catch (err) {
          results.push("\u2717 Google: " + err.message);
        }
      }

      if (openaiKey) {
        try {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + openaiKey,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: "Reply with: OK" }],
              max_tokens: 10,
              stream: false,
            }),
          });
          results.push(res.ok ? "\u2713 OpenAI" : "\u2717 OpenAI (" + res.status + ")");
        } catch (err) {
          results.push("\u2717 OpenAI: " + err.message);
        }
      }

      showStatus(dom.testResultDirect, results.join("  |  "), results.every((r) => r.startsWith("\u2713")) ? "ok" : "err");
    } catch (err) {
      showStatus(dom.testResultDirect, "\u2717 " + err.message, "err");
    } finally {
      dom.btnTestDirect.disabled = false;
    }
  });
}

/* ═══════════════════════════ TEST LOCAL CONNECTION ════════════════ */
if (dom.btnTestLocal) {
  dom.btnTestLocal.addEventListener("click", async () => {
    const endpoint = dom.localEndpoint ? dom.localEndpoint.value.trim().replace(/\/+$/, "") : "";

    if (!endpoint) {
      showStatus(dom.testResultLocal, "No local endpoint configured", "err");
      return;
    }

    dom.btnTestLocal.disabled = true;
    showStatus(dom.testResultLocal, "Testing\u2026", "");

    try {
      // Try to list models (works for both Ollama and LM Studio)
      const modelsUrl = endpoint.includes("11434")
        ? endpoint.replace(/\/v1$/, "") + "/api/tags"
        : endpoint.endsWith("/v1") ? endpoint + "/models" : endpoint + "/v1/models";

      const res = await fetch(modelsUrl, { method: "GET" });

      if (res.ok) {
        const data = await res.json();
        const count = data.models ? data.models.length : data.data ? data.data.length : 0;
        showStatus(dom.testResultLocal, "\u2713 Connected \u2014 " + count + " model" + (count !== 1 ? "s" : "") + " found", "ok");
      } else {
        showStatus(dom.testResultLocal, "\u2717 " + res.status + ": " + (await res.text()).slice(0, 80), "err");
      }
    } catch (err) {
      showStatus(dom.testResultLocal, "\u2717 " + err.message + " \u2014 is the local server running?", "err");
    } finally {
      dom.btnTestLocal.disabled = false;
    }
  });
}

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

/* ═══════════════════════════ MODEL DISCOVERY ═════════════════════ */
// Popular models to pre-enable after discovery
const POPULAR_MODELS = new Set([
  "gpt-5.4", "gpt-5.4-mini", "gpt-4o",
  "claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5",
  "gemini-3.1-pro-preview", "gemini-3.1-flash", "gemini-3.1-flash-lite",
  "o3", "o4-mini",
]);

function guessProvider(modelId) {
  const id = modelId.toLowerCase();
  if (id.startsWith("claude") || id.includes("anthropic")) return "Anthropic";
  if (id.startsWith("gpt") || id.startsWith("o1") || id.startsWith("o3") || id.startsWith("o4") || id.startsWith("chatgpt") || id.includes("openai")) return "OpenAI";
  if (id.startsWith("gemini") || id.startsWith("gemma") || id.includes("google")) return "Google";
  if (id.startsWith("grok") || id.includes("xai")) return "xAI";
  if (id.includes("llama") || id.includes("meta")) return "Meta";
  if (id.includes("deepseek")) return "DeepSeek";
  if (id.includes("mistral") || id.includes("codestral")) return "Mistral";
  return "Other";
}

function modelDisplayName(id) {
  // Try to find a nice name from MODEL_LIST
  const known = MODEL_LIST.find((m) => m.id === id);
  if (known) return known.name;
  // Generate from ID: strip prefixes, capitalize
  return id.replace(/^[^/]+\//, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function discoverProxyModels(endpoint, apiKey) {
  const base = endpoint.replace(/\/+$/, "");
  const headers = {};
  if (apiKey) headers["Authorization"] = "Bearer " + apiKey;

  // Try /v1/models first, then /models
  for (const path of ["/v1/models", "/models"]) {
    try {
      const res = await fetch(base + path, { headers });
      if (!res.ok) continue;
      const data = await res.json();
      const list = data.data || data.models || [];
      return list.map((m) => ({
        id: m.id || m.name,
        name: modelDisplayName(m.id || m.name),
        provider: guessProvider(m.id || m.name),
      }));
    } catch { /* try next */ }
  }
  throw new Error("Could not fetch models from " + base);
}

async function discoverDirectModels(openaiKey, anthropicKey, geminiKey) {
  const models = [];

  // Anthropic: hardcoded (no models endpoint)
  if (anthropicKey) {
    ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5"].forEach((id) => {
      models.push({ id, name: modelDisplayName(id), provider: "Anthropic" });
    });
  }

  // OpenAI: fetch models endpoint
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { "Authorization": "Bearer " + openaiKey },
      });
      if (res.ok) {
        const data = await res.json();
        const chatModels = (data.data || []).filter((m) =>
          m.id.startsWith("gpt") || m.id.startsWith("o1") || m.id.startsWith("o3") || m.id.startsWith("o4") || m.id.startsWith("chatgpt")
        );
        chatModels.forEach((m) => {
          models.push({ id: m.id, name: modelDisplayName(m.id), provider: "OpenAI" });
        });
      }
    } catch { /* skip */ }
  }

  // Google: fetch models endpoint
  if (geminiKey) {
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + geminiKey);
      if (res.ok) {
        const data = await res.json();
        (data.models || []).forEach((m) => {
          const id = m.name.replace("models/", "");
          if (id.startsWith("gemini")) {
            models.push({ id, name: m.displayName || modelDisplayName(id), provider: "Google" });
          }
        });
      }
    } catch { /* skip */ }
  }

  return models;
}

async function discoverLocalModels(endpoint) {
  const base = endpoint.replace(/\/+$/, "");

  // Try Ollama /api/tags first
  if (base.includes("11434")) {
    try {
      const res = await fetch(base.replace(/\/v1$/, "") + "/api/tags");
      if (res.ok) {
        const data = await res.json();
        return (data.models || []).map((m) => ({
          id: m.name || m.model,
          name: modelDisplayName(m.name || m.model),
          provider: "Local",
        }));
      }
    } catch { /* try fallback */ }
  }

  // LM Studio / generic: /v1/models
  const modelsUrl = base.endsWith("/v1") ? base + "/models" : base + "/v1/models";
  try {
    const res = await fetch(modelsUrl);
    if (res.ok) {
      const data = await res.json();
      return (data.data || []).map((m) => ({
        id: m.id,
        name: modelDisplayName(m.id),
        provider: "Local",
      }));
    }
  } catch { /* skip */ }

  throw new Error("Could not discover models from " + base);
}

async function runDiscovery() {
  const stored = await browser.storage.local.get([
    "connectionMode", "endpoint", "apiKey", "openaiKey", "anthropicKey", "geminiKey", "localEndpoint",
  ]);
  const mode = stored.connectionMode || connectionMode;

  if (mode === "proxy") {
    return discoverProxyModels(stored.endpoint || "", stored.apiKey || "");
  } else if (mode === "direct") {
    return discoverDirectModels(stored.openaiKey || stored.apiKey || "", stored.anthropicKey || "", stored.geminiKey || "");
  } else if (mode === "local") {
    return discoverLocalModels(stored.localEndpoint || "http://localhost:11434/v1");
  }
  return [];
}

/* ═══════════════════════════ MODEL MANAGEMENT (Phase 2) ═════════ */
let discoveredModels = [];
let enabledModels = [];

async function loadModels() {
  const s = await browser.storage.local.get(["discoveredModels", "enabledModels"]);
  discoveredModels = s.discoveredModels || [];
  enabledModels = s.enabledModels || [];
  renderModelToggles();
}

function renderModelToggles() {
  dom.modelList.textContent = "";

  // Update count badge
  if (dom.modelCount) {
    dom.modelCount.textContent = discoveredModels.length > 0
      ? enabledModels.length + "/" + discoveredModels.length
      : "";
  }

  if (discoveredModels.length === 0) {
    dom.modelEmpty.style.display = "flex";
    return;
  }
  dom.modelEmpty.style.display = "none";

  // Group by provider
  const groups = {};
  discoveredModels.forEach((m) => {
    const g = m.provider || "Other";
    if (!groups[g]) groups[g] = [];
    groups[g].push(m);
  });

  Object.keys(groups).sort().forEach((provider) => {
    const heading = document.createElement("div");
    heading.className = "model-group-heading";
    heading.textContent = provider;
    dom.modelList.appendChild(heading);

    groups[provider].forEach((m) => {
      const row = document.createElement("div");
      row.className = "model-row";

      const info = document.createElement("div");
      info.className = "model-info";

      const labelSpan = document.createElement("span");
      labelSpan.className = "model-label";
      labelSpan.textContent = m.name;

      const idSpan = document.createElement("span");
      idSpan.className = "model-id";
      idSpan.textContent = m.id;

      info.appendChild(labelSpan);
      info.appendChild(idSpan);

      const toggle = document.createElement("label");
      toggle.className = "model-toggle";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = enabledModels.includes(m.id);
      checkbox.setAttribute("aria-label", "Toggle " + m.name);
      checkbox.addEventListener("change", async () => {
        if (checkbox.checked) {
          if (!enabledModels.includes(m.id)) enabledModels.push(m.id);
        } else {
          enabledModels = enabledModels.filter((id) => id !== m.id);
        }
        await browser.storage.local.set({ enabledModels });
      });

      const slider = document.createElement("span");
      slider.className = "toggle-slider";

      toggle.appendChild(checkbox);
      toggle.appendChild(slider);

      row.appendChild(info);
      row.appendChild(toggle);
      dom.modelList.appendChild(row);
    });
  });
}

// "Detect models" buttons in Connection tab
if (dom.btnDetectModels) {
  dom.btnDetectModels.addEventListener("click", async () => {
    const ep = dom.endpoint.value.trim().replace(/\/+$/, "");
    if (!ep) {
      dom.btnDetectModels.textContent = "Enter a proxy URL first";
      setTimeout(() => { dom.btnDetectModels.textContent = "Detect models from endpoint"; }, 3000);
      return;
    }
    dom.btnDetectModels.textContent = "Detecting\u2026";
    try {
      const models = await discoverProxyModels(ep, dom.apiKey.value.trim());
      discoveredModels = models;
      enabledModels = models.filter((m) => POPULAR_MODELS.has(m.id)).map((m) => m.id);
      if (enabledModels.length === 0) enabledModels = models.slice(0, 5).map((m) => m.id);
      await browser.storage.local.set({ discoveredModels, enabledModels });
      renderModelToggles();
      // Update proxy model select with discovered models
      buildModelSelect(dom.model.value);
      dom.btnDetectModels.textContent = "\u2713 " + models.length + " models found";
      setTimeout(() => { dom.btnDetectModels.textContent = "Detect models from endpoint"; }, 3000);
    } catch (err) {
      dom.btnDetectModels.textContent = "\u2717 " + err.message;
      setTimeout(() => { dom.btnDetectModels.textContent = "Detect models from endpoint"; }, 3000);
    }
  });
}

if (dom.btnDetectLocal) {
  dom.btnDetectLocal.addEventListener("click", async () => {
    dom.btnDetectLocal.textContent = "Detecting\u2026";
    try {
      const endpoint = dom.localEndpoint ? dom.localEndpoint.value.trim().replace(/\/+$/, "") : "http://localhost:11434/v1";
      const models = await discoverLocalModels(endpoint);
      discoveredModels = models;
      enabledModels = models.map((m) => m.id); // enable all local models by default
      await browser.storage.local.set({ discoveredModels, enabledModels });
      renderModelToggles();
      // Populate local model select
      if (dom.modelLocal) {
        dom.modelLocal.textContent = "";
        models.forEach((m) => {
          const opt = document.createElement("option");
          opt.value = m.id;
          opt.textContent = m.name;
          dom.modelLocal.appendChild(opt);
        });
      }
      dom.btnDetectLocal.textContent = "\u2713 " + models.length + " models found";
      setTimeout(() => { dom.btnDetectLocal.textContent = "Detect installed models"; }, 3000);
    } catch (err) {
      dom.btnDetectLocal.textContent = "\u2717 " + err.message;
      setTimeout(() => { dom.btnDetectLocal.textContent = "Detect installed models"; }, 3000);
    }
  });
}

// "Re-detect" button on Models tab
if (dom.btnRedetect) {
  dom.btnRedetect.addEventListener("click", async () => {
    dom.btnRedetect.disabled = true;
    dom.btnRedetect.textContent = "Detecting\u2026";
    try {
      const models = await runDiscovery();
      discoveredModels = models;
      // Keep existing enabled selections, add popular new ones
      const newIds = models.map((m) => m.id);
      const existingEnabled = enabledModels.filter((id) => newIds.includes(id));
      const newModels = models.filter((m) => !enabledModels.includes(m.id) && POPULAR_MODELS.has(m.id));
      enabledModels = [...existingEnabled, ...newModels.map((m) => m.id)];
      if (enabledModels.length === 0) enabledModels = models.slice(0, 5).map((m) => m.id);
      await browser.storage.local.set({ discoveredModels, enabledModels });
      renderModelToggles();
      dom.btnRedetect.textContent = "\u2713 " + models.length + " found";
      setTimeout(() => { dom.btnRedetect.textContent = "Re-detect Models"; }, 3000);
    } catch (err) {
      dom.btnRedetect.textContent = "\u2717 " + err.message;
      setTimeout(() => { dom.btnRedetect.textContent = "Re-detect Models"; }, 3000);
    } finally {
      dom.btnRedetect.disabled = false;
    }
  });
}

// "Enable All" / "Disable All" buttons
if (dom.btnEnableAll) {
  dom.btnEnableAll.addEventListener("click", async () => {
    enabledModels = discoveredModels.map((m) => m.id);
    await browser.storage.local.set({ enabledModels });
    renderModelToggles();
  });
}
if (dom.btnDisableAll) {
  dom.btnDisableAll.addEventListener("click", async () => {
    enabledModels = [];
    await browser.storage.local.set({ enabledModels });
    renderModelToggles();
  });
}

// Manual "Add Model" for custom IDs
dom.btnAddModel.addEventListener("click", async () => {
  const label = dom.newModelLabel.value.trim();
  const id = dom.newModelId.value.trim();
  if (!label || !id) return;
  if (discoveredModels.some((m) => m.id === id)) {
    dom.newModelId.focus();
    return;
  }
  discoveredModels.push({ id, name: label, provider: guessProvider(id) });
  enabledModels.push(id);
  await browser.storage.local.set({ discoveredModels, enabledModels });
  dom.newModelLabel.value = "";
  dom.newModelId.value = "";
  renderModelToggles();
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
