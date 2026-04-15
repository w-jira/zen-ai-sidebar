// settings.js

const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant integrated into a browser sidebar. Be concise and clear. When given page content, use it to answer questions about the page.";

const fields = {
  endpoint:     document.getElementById("endpoint"),
  apiKey:       document.getElementById("apiKey"),
  model:        document.getElementById("model"),
  maxTokens:    document.getElementById("maxTokens"),
  temperature:  document.getElementById("temperature"),
  systemPrompt: document.getElementById("systemPrompt"),
};

const elTempVal      = document.getElementById("temperature-val");
const elBtnSave      = document.getElementById("btn-save");
const elSaveStatus   = document.getElementById("save-status");
const elBtnTest      = document.getElementById("btn-test");
const elTestResult   = document.getElementById("test-result");
const elBtnToggleKey = document.getElementById("btn-toggle-key");
const elBtnReset     = document.getElementById("btn-reset-prompt");
const elTheme        = document.getElementById("theme-select");

// ─── Load saved values ────────────────────────────────────────────────────────
async function loadSettings() {
  const stored = await browser.storage.local.get([
    "endpoint", "apiKey", "model", "systemPrompt", "maxTokens", "temperature", "theme"
  ]);

  fields.endpoint.value     = stored.endpoint     || "";
  fields.apiKey.value       = stored.apiKey       || "";
  fields.model.value        = stored.model        || "gpt-4o";
  fields.systemPrompt.value = stored.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  fields.maxTokens.value    = stored.maxTokens    || 2048;
  fields.temperature.value  = stored.temperature !== undefined ? stored.temperature : 0.7;
  elTempVal.textContent     = fields.temperature.value;

  // Hide onboarding if already configured
  if (stored.apiKey) {
    const card = document.getElementById("onboarding-card");
    if (card) card.style.display = "none";
  }

  const theme = stored.theme || "dark";
  elTheme.value = theme;
  document.documentElement.setAttribute("data-theme", theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme);
}

// ─── Save ─────────────────────────────────────────────────────────────────────
document.getElementById("settings-form").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await browser.storage.local.set({
      endpoint:     fields.endpoint.value.trim().replace(/\/+$/, ""),
      apiKey:       fields.apiKey.value.trim(),
      model:        fields.model.value.trim(),
      systemPrompt: fields.systemPrompt.value.trim(),
      maxTokens:    parseInt(fields.maxTokens.value, 10),
      temperature:  parseFloat(fields.temperature.value),
      theme:        elTheme.value
    });
    showStatus(elSaveStatus, "Saved", "ok");
  } catch (err) {
    showStatus(elSaveStatus, "Error saving", "err");
  }
});

// ─── Test connection ──────────────────────────────────────────────────────────
elBtnTest.addEventListener("click", async () => {
  const endpoint = fields.endpoint.value.trim().replace(/\/+$/, "");
  const apiKey   = fields.apiKey.value.trim();
  const model    = fields.model.value.trim();

  const isLocalEndpoint = endpoint.startsWith("http://localhost") || endpoint.startsWith("http://127.0.0.1");
  if (!apiKey && !isLocalEndpoint) {
    showStatus(elTestResult, "Enter an API key first", "err");
    return;
  }

  elBtnTest.disabled = true;
  showStatus(elTestResult, "Testing…", "");

  try {
    // Detect provider from endpoint or model to use correct format
    const isAnthropic = endpoint.includes("anthropic.com") || (model && model.startsWith("claude"));
    const isGemini = endpoint.includes("generativelanguage.googleapis.com") || (model && model.startsWith("gemini"));

    let url, headers, body;

    if (!endpoint && isAnthropic) {
      // Direct Anthropic API (no custom endpoint)
      url = "https://api.anthropic.com/v1/messages";
      headers = {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      };
      body = JSON.stringify({
        model: model || "claude-sonnet-4-6",
        messages: [{ role: "user", content: "Reply with: OK" }],
        max_tokens: 10
      });
    } else if (!endpoint && isGemini) {
      // Direct Gemini API (no custom endpoint)
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-3.1-flash"}:generateContent?key=${apiKey}`;
      headers = { "Content-Type": "application/json" };
      body = JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Reply with: OK" }] }],
        generationConfig: { maxOutputTokens: 10 }
      });
    } else {
      // OpenAI-compatible (default)
      const base = endpoint || "https://api.openai.com/v1";
      url = base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
      headers = { "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
      body = JSON.stringify({
        model: model || "gpt-4o",
        messages: [{ role: "user", content: "Reply with: OK" }],
        max_tokens: 10,
        stream: false
      });
    }

    const res = await fetch(url, { method: "POST", headers, body });

    if (res.ok) {
      const data = await res.json();
      let reply;
      // Only use native response parsing when we actually used the native API
      if (!endpoint && isAnthropic) {
        reply = data.content?.[0]?.text?.trim() || "(no content)";
      } else if (!endpoint && isGemini) {
        reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "(no content)";
      } else {
        reply = data.choices?.[0]?.message?.content?.trim() || "(no content)";
      }
      showStatus(elTestResult, `✓ Connected — "${reply}"`, "ok");
    } else {
      const txt = await res.text();
      showStatus(elTestResult, `✗ ${res.status}: ${txt.slice(0, 80)}`, "err");
    }
  } catch (err) {
    showStatus(elTestResult, `✗ ${err.message}`, "err");
  } finally {
    elBtnTest.disabled = false;
  }
});

// ─── Toggle API key visibility ────────────────────────────────────────────────
elBtnToggleKey.addEventListener("click", () => {
  const isHidden = fields.apiKey.type === "password";
  fields.apiKey.type = isHidden ? "text" : "password";
  elBtnToggleKey.innerHTML = isHidden
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
});

// ─── Temperature live label ───────────────────────────────────────────────────
fields.temperature.addEventListener("input", () => {
  elTempVal.textContent = parseFloat(fields.temperature.value).toFixed(2);
});

// ─── Reset system prompt ──────────────────────────────────────────────────────
elBtnReset.addEventListener("click", () => {
  fields.systemPrompt.value = DEFAULT_SYSTEM_PROMPT;
});

// ─── Theme preview ────────────────────────────────────────────────────────────
elTheme.addEventListener("change", () => {
  const t = elTheme.value;
  document.documentElement.setAttribute("data-theme",
    t === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : t
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function showStatus(el, msg, type) {
  el.textContent = msg;
  el.className = type;
  if (type === "ok") setTimeout(() => { el.textContent = ""; el.className = ""; }, 3000);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
loadSettings();
