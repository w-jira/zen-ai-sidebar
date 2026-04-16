/* ╔══════════════════════════════════════════════════════════════════╗
   ║  Zen AI Sidebar — panel.js (Firefox Extension)                   ║
   ║  All browser.* calls are real; no polyfills needed               ║
   ╚══════════════════════════════════════════════════════════════════╝ */

'use strict';

/* ═══════════════════════════ STATE ═════════════════════════════════ */
const state = {
  model: 'gpt-4o',
  connectionMode: '',     // 'proxy', 'direct', 'local'
  apiKey: '',
  anthropicKey: '',       // direct Anthropic API key
  geminiKey: '',          // direct Google AI API key
  endpoint: '',           // custom endpoint, empty = auto-detect
  localEndpoint: '',      // local server URL
  discoveredModels: [],   // [{ id, name, provider }]
  enabledModels: [],      // string[] of enabled model IDs
  messages: [],           // { role:'user'|'assistant', content:string }
  generating: false,
  abortController: null,
  theme: 'dark',
  pageCtx: { url: '', title: '', content: '' },
  chatHistory: [],        // [{ id, messages, timestamp, hostname }]
  siteModels: {},         // { hostname: modelId }
  currentHostname: '',
  singleTurn: false,
  streamingEnabled: true,
  fontSize: 'm',
  responseLength: 'concise',
  pinned: false,
  systemPrompt: '',
  maxTokens: 0,
  temperature: -1,        // -1 = not set (omit from request)
  templates: [
    { id: 't1', name: 'Code review', prompt: 'Review this code for bugs, performance issues, and best practices:' },
    { id: 't2', name: 'Email draft', prompt: 'Draft a professional email about:' },
    { id: 't3', name: 'Summarize meeting', prompt: 'Summarize these meeting notes into action items:' },
  ],
  slashIdx: -1,           // keyboard navigation index in slash palette
  historyOpen: false,
  templatesPanelOpen: false,
};

/* ═══════════════════════════ DOM REFS ══════════════════════════════ */
const $ = id => document.getElementById(id);
const dom = {
  app:               $('app'),
  header:            $('header'),
  modelBtn:          $('model-btn'),
  modelName:         $('model-name'),
  modelMenu:         $('model-menu'),
  pinBtn:            $('pin-btn'),
  pageActionsBtn:    $('page-actions-btn'),
  pageActionsMenu:   $('page-actions-menu'),
  actionScreenshot:  $('action-screenshot'),
  actionCopyText:    $('action-copy-text'),
  historyBtn:        $('history-btn'),
  newChatBtn:        $('new-chat-btn'),
  settingsBtn:       $('settings-btn'),
  themeBtn:          $('theme-btn'),
  themeIconMoon:     $('theme-icon-moon'),
  themeIconSun:      $('theme-icon-sun'),
  contextBanner:     $('context-banner'),
  contextBannerText: $('context-banner-text'),
  contextDismiss:    $('context-dismiss'),
  autoSummaryCard:   $('auto-summary-card'),
  autoSummaryContent:$('auto-summary-content'),
  autoSummaryDismiss:$('auto-summary-dismiss'),
  messagesWrap:      $('messages-wrap'),
  messages:          $('messages'),
  emptyState:        $('empty-state'),
  selectionPill:     $('selection-pill'),
  selectionPillText: $('selection-pill-text'),
  selectionPillDismiss: $('selection-pill-dismiss'),
  errorBar:          $('error-bar'),
  errorText:         $('error-text'),
  errorDismiss:      $('error-dismiss'),
  slashPalette:      $('slash-palette'),
  slashList:         $('slash-list'),
  openTemplatesBtn:  $('open-templates-btn'),
  inputWrap:         $('input-wrap'),
  inputBox:          $('input-box'),
  chatInput:         $('chat-input'),
  btnSend:           $('btn-send'),
  tokenCounter:      $('token-counter'),
  contextToggle:     $('context-toggle'),
  streamToggle:      $('stream-toggle'),
  fontSizeBtn:       $('font-size-btn'),
  lengthToggle:      $('length-toggle'),
  btnStop:           $('btn-stop'),
  historyPanel:      $('history-panel'),
  historyClose:      $('history-close'),
  historyList:       $('history-list'),
  historyClearAll:   $('history-clear-all'),
  templatesPanel:    $('templates-panel'),
  templatesList:     $('templates-list'),
  saveTemplateBtn:   $('save-template-btn'),
  templatesClose:    $('templates-close'),
  setupOverlay:       $('setup-overlay'),
  apiKeyInput:        $('api-key-input'),
  setupEndpointInput: $('setup-endpoint-input'),
  setupModelSelect:   $('setup-model-select'),
  setupSaveBtn:       $('setup-save-btn'),
  toastContainer:    $('toast-container'),
};

/* ═══════════════════════════ INIT ══════════════════════════════════ */
async function init() {
  await loadStorage();
  applyTheme();
  applyFontSize();
  buildModelMenu();
  renderHistory();
  renderTemplates();
  updateFooterPills();
  updatePinUI();

  if (!state.apiKey && !state.anthropicKey && !state.geminiKey) {
    dom.setupOverlay.style.display = 'flex';
  }

  // Listen to messages from background/content scripts
  browser.runtime.onMessage.addListener(onMessage);

  // Get current tab info
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) handleTabInfo(tabs[0]);
  } catch (e) { /* noop */ }
}

/* ═══════════════════════════ STORAGE ══════════════════════════════ */
// Normalize fontSize values — settings page uses "small"/"medium"/"large",
// sidebar uses "s"/"m"/"l". Accept both, store canonical short form.
function normalizeFontSize(val) {
  if (!val) return 'm';
  const map = { small: 's', medium: 'm', large: 'l', s: 's', m: 'm', l: 'l' };
  return map[val] || 'm';
}

async function loadStorage() {
  try {
    const data = await browser.storage.local.get([
      'connectionMode', 'apiKey', 'anthropicKey', 'geminiKey', 'endpoint',
      'localEndpoint', 'discoveredModels', 'enabledModels', 'model', 'theme',
      'chatHistory', 'siteModels', 'singleTurn', 'streamingEnabled',
      'fontSize', 'responseLength', 'templates', 'systemPrompt', 'maxTokens', 'temperature',
    ]);
    state.connectionMode = data.connectionMode || 'proxy';
    if (data.apiKey)          state.apiKey          = data.apiKey;
    if (data.anthropicKey)    state.anthropicKey    = data.anthropicKey;
    if (data.geminiKey)       state.geminiKey       = data.geminiKey;
    if (data.endpoint)        state.endpoint        = data.endpoint;
    if (data.localEndpoint)   state.localEndpoint   = data.localEndpoint;
    // In local mode, use localEndpoint as the active endpoint
    if (state.connectionMode === 'local' && state.localEndpoint) {
      state.endpoint = state.localEndpoint;
    }
    if (data.discoveredModels) state.discoveredModels = data.discoveredModels;
    if (data.enabledModels)    state.enabledModels    = data.enabledModels;
    if (data.model)           state.model           = data.model;
    if (data.theme)           state.theme           = data.theme;
    if (data.chatHistory)     state.chatHistory     = data.chatHistory;
    if (data.siteModels)      state.siteModels      = data.siteModels;
    if (data.singleTurn !== undefined) state.singleTurn = data.singleTurn;
    if (data.streamingEnabled !== undefined) state.streamingEnabled = data.streamingEnabled;
    if (data.fontSize)        state.fontSize        = normalizeFontSize(data.fontSize);
    if (data.responseLength)  state.responseLength  = data.responseLength;
    if (data.templates)       state.templates       = data.templates;
    if (data.systemPrompt)    state.systemPrompt    = data.systemPrompt;
    if (data.maxTokens)       state.maxTokens       = data.maxTokens;
    if (data.temperature !== undefined && data.temperature >= 0) state.temperature = data.temperature;
    dom.modelName.textContent = modelLabel(state.model);
  } catch (e) { console.warn('Storage load failed', e); }
}

async function saveStorage(keys = {}) {
  try {
    await browser.storage.local.set(keys);
  } catch (e) { console.warn('Storage save failed', e); }
}

/* ═══════════════════════════ MESSAGES FROM CONTENT SCRIPT ═════════ */
function onMessage(msg) {
  if (!msg || !msg.type) return;
  switch (msg.type) {
    case 'PAGE_CONTENT_RELAY':
      handlePageContent(msg);
      break;
    case 'SELECTION_RELAY':
      handleSelection(msg.text);
      break;
    case 'TAB_CHANGED':
      handleTabChanged(msg);
      break;
  }
}

function handlePageContent(msg) {
  state.pageCtx = { url: msg.url || '', title: msg.title || '', content: msg.content || '' };
  dom.contextBannerText.textContent = msg.title ? `📄 ${msg.title.slice(0, 50)}` : 'Page context loaded';
  dom.contextBanner.style.display = 'flex';

  // Auto-summarize if no messages yet
  if (state.messages.length === 0) {
    triggerAutoSummary();
  }
}

function handleSelection(text) {
  if (!text || !text.trim()) return;
  const truncated = text.length > 60 ? text.slice(0, 57) + '…' : text;
  dom.selectionPillText.textContent = `Ask about: ${truncated}`;
  dom.selectionPill.style.display = 'flex';
  dom.selectionPill._fullText = text;
}

function handleTabChanged(msg) {
  clearMessages();
  state.pageCtx = { url: '', title: '', content: '' };
  dom.contextBanner.style.display = 'none';
  dom.autoSummaryCard.style.display = 'none';
  showToast('New page — context updated', 2000);

  // Per-site model pinning
  if (msg.url) {
    try {
      const hn = new URL(msg.url).hostname;
      state.currentHostname = hn;
      if (state.siteModels[hn]) {
        setModel(state.siteModels[hn]);
        state.pinned = true;
        updatePinUI();
      } else {
        state.pinned = false;
        updatePinUI();
      }
    } catch (_) {}
  }
}

function handleTabInfo(tab) {
  if (tab.url) {
    try {
      state.currentHostname = new URL(tab.url).hostname;
      if (state.siteModels[state.currentHostname]) {
        setModel(state.siteModels[state.currentHostname]);
        state.pinned = true;
        updatePinUI();
      }
    } catch (_) {}
  }
}

/* ═══════════════════════════ AUTO-SUMMARY ══════════════════════════ */
let autoSummaryCtrl = null;  // track auto-summary so it can be cancelled

function triggerAutoSummary() {
  dom.autoSummaryCard.style.display = 'block';
  dom.autoSummaryContent.textContent = 'Summarizing page…';

  setTimeout(async () => {
    if (state.messages.length > 0 || state.generating) {
      dom.autoSummaryCard.style.display = 'none';
      return;
    }
    try {
      // Cancel any previous auto-summary in flight
      if (autoSummaryCtrl) autoSummaryCtrl.abort();
      autoSummaryCtrl = new AbortController();
      const resp = await fetch(getApiEndpoint(false), {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(buildApiBody([
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: 'Please give me a brief 2-3 sentence summary of this page.' },
        ], false)),
        signal: autoSummaryCtrl.signal,
      });
      if (!resp.ok) throw new Error('API error');
      const data = await resp.json();
      const provider = providerOf(state.model);
      let summary;
      if (provider === 'anthropic') summary = data.content?.[0]?.text || '';
      else if (provider === 'gemini') summary = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      else summary = data.choices?.[0]?.message?.content || '';
      dom.autoSummaryContent.textContent = summary || 'Could not summarize this page.';
    } catch (e) {
      if (e.name !== 'AbortError') dom.autoSummaryCard.style.display = 'none';
    } finally {
      autoSummaryCtrl = null;
    }
  }, 800);
}

/* ═══════════════════════════ MODEL SELECTION ═══════════════════════ */
const MODEL_LIST = [
  // OpenAI
  {id:'gpt-5.4',                          name:'GPT-5.4',              group:'OpenAI'},
  {id:'gpt-5.4-mini',                     name:'GPT-5.4 mini',         group:'OpenAI'},
  {id:'gpt-5.4-nano',                     name:'GPT-5.4 nano',         group:'OpenAI'},
  {id:'gpt-5.3',                          name:'GPT-5.3 Instant',      group:'OpenAI'},
  {id:'o3',                               name:'o3',                   group:'OpenAI'},
  {id:'o4-mini',                          name:'o4-mini',              group:'OpenAI'},
  {id:'gpt-4o',                           name:'GPT-4o',               group:'OpenAI'},
  {id:'gpt-4o-mini',                      name:'GPT-4o mini',          group:'OpenAI'},
  // Anthropic
  {id:'claude-opus-4-6',                  name:'Claude Opus 4.6',      group:'Anthropic'},
  {id:'claude-sonnet-4-6',               name:'Claude Sonnet 4.6',    group:'Anthropic'},
  {id:'claude-haiku-4-5',                name:'Claude Haiku 4.5',     group:'Anthropic'},
  {id:'claude-sonnet-4-20250514',         name:'Claude Sonnet 4',      group:'Anthropic'},
  {id:'claude-3-7-sonnet-20250219',       name:'Claude 3.7 Sonnet',    group:'Anthropic'},
  // Google
  {id:'gemini-3.1-pro-preview',          name:'Gemini 3.1 Pro',       group:'Google'},
  {id:'gemini-3.1-flash-lite',           name:'Gemini 3.1 Flash-Lite',group:'Google'},
  {id:'gemini-3.1-flash',                name:'Gemini 3.1 Flash',     group:'Google'},
  {id:'gemini-2.5-pro',                   name:'Gemini 2.5 Pro',       group:'Google'},
  {id:'google/gemma-4-27b-it',            name:'Gemma 4 27B',          group:'Google'},
  {id:'google/gemma-4-4b-it',             name:'Gemma 4 4B',           group:'Google'},
  // Meta
  {id:'meta-llama/llama-4-maverick',      name:'Llama 4 Maverick',     group:'Meta'},
  {id:'meta-llama/llama-4-scout',         name:'Llama 4 Scout',        group:'Meta'},
  {id:'meta-llama/llama-3.3-70b-instruct',name:'Llama 3.3 70B',        group:'Meta'},
  // xAI
  {id:'grok-4.20',                        name:'Grok 4.20',            group:'xAI'},
  {id:'grok-4.1-fast',                    name:'Grok 4.1 Fast',        group:'xAI'},
  // DeepSeek
  {id:'deepseek/deepseek-r1',             name:'DeepSeek R1',          group:'DeepSeek'},
  {id:'deepseek/deepseek-chat',           name:'DeepSeek Chat',        group:'DeepSeek'},
  // Mistral
  {id:'mistral-small-2603',               name:'Mistral Small 4',      group:'Mistral'},
  {id:'mistral-large-latest',             name:'Mistral Large',        group:'Mistral'},
  {id:'codestral-latest',                 name:'Codestral',            group:'Mistral'},
];

function modelLabel(id) {
  const m = MODEL_LIST.find(m => m.id === id);
  if (m) return m.name;
  const d = state.discoveredModels.find(m => m.id === id);
  if (d) return d.name;
  return id;
}

function setModel(id) {
  state.model = id;
  dom.modelName.textContent = modelLabel(id);
  // Update active state in menu
  document.querySelectorAll('.model-item').forEach(el => {
    el.classList.toggle('active', el.dataset.model === id);
  });
  saveStorage({ model: id });
}

// Build the model dropdown menu dynamically from MODEL_LIST
// Get models available for the current connection mode
function getAvailableModels() {
  // If we have discovered models, use enabled selections (or empty if all disabled)
  if (state.discoveredModels.length > 0) {
    return state.discoveredModels
      .filter(m => state.enabledModels.includes(m.id))
      .map(m => ({ id: m.id, name: m.name, group: m.provider || 'Other' }));
  }
  // Direct mode without discovery: filter hardcoded list by configured keys
  if (state.connectionMode === 'direct') {
    return MODEL_LIST.filter(m => {
      if (m.group === 'OpenAI' && state.apiKey) return true;
      if (m.group === 'Anthropic' && state.anthropicKey) return true;
      if (m.group === 'Google' && state.geminiKey) return true;
      return false;
    });
  }
  // Fallback: full hardcoded list
  return MODEL_LIST;
}

function buildModelMenu() {
  dom.modelMenu.textContent = '';
  const models = getAvailableModels();
  if (models.length === 0) {
    const hint = document.createElement('div');
    hint.className = 'menu-section-label';
    hint.textContent = 'Configure API keys in Settings';
    hint.style.padding = '12px 10px';
    hint.style.cursor = 'pointer';
    hint.addEventListener('click', () => {
      browser.runtime.openOptionsPage().catch(() => {
        browser.tabs.create({ url: browser.runtime.getURL('settings/settings.html') });
      });
    });
    dom.modelMenu.appendChild(hint);
    return;
  }
  let lastGroup = '';
  models.forEach(m => {
    if (m.group !== lastGroup) {
      if (lastGroup) {
        const divider = document.createElement('div');
        divider.className = 'menu-divider';
        dom.modelMenu.appendChild(divider);
      }
      const label = document.createElement('div');
      label.className = 'menu-section-label';
      label.textContent = m.group;
      dom.modelMenu.appendChild(label);
      lastGroup = m.group;
    }
    const btn = document.createElement('button');
    btn.className = 'menu-item model-item' + (m.id === state.model ? ' active' : '');
    btn.dataset.model = m.id;
    btn.setAttribute('role', 'menuitem');
    const nameSpan = document.createElement('span');
    nameSpan.className = 'menu-item-name';
    nameSpan.textContent = m.name;
    btn.appendChild(nameSpan);
    dom.modelMenu.appendChild(btn);
  });
}

// Listen for storage changes from settings page
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  if (changes.connectionMode) {
    state.connectionMode = changes.connectionMode.newValue || '';
    buildModelMenu();
  }
  if (changes.apiKey)          state.apiKey          = changes.apiKey.newValue || '';
  if (changes.anthropicKey)    { state.anthropicKey = changes.anthropicKey.newValue || ''; buildModelMenu(); }
  if (changes.geminiKey)       { state.geminiKey = changes.geminiKey.newValue || ''; buildModelMenu(); }
  if (changes.endpoint)        state.endpoint        = changes.endpoint.newValue || '';
  if (changes.discoveredModels) { state.discoveredModels = changes.discoveredModels.newValue || []; buildModelMenu(); }
  if (changes.enabledModels) {
    state.enabledModels = changes.enabledModels.newValue || [];
    // If current model was disabled, switch to first enabled model
    if (state.enabledModels.length > 0 && !state.enabledModels.includes(state.model)) {
      setModel(state.enabledModels[0]);
    }
    buildModelMenu();
  }
  if (changes.localEndpoint) {
    state.localEndpoint = changes.localEndpoint.newValue || '';
    if (state.connectionMode === 'local') state.endpoint = state.localEndpoint;
  }
  if (changes.model) {
    state.model = changes.model.newValue || 'gpt-4o';
    dom.modelName.textContent = modelLabel(state.model);
    buildModelMenu();
  }
  if (changes.theme) {
    state.theme = changes.theme.newValue || 'dark';
    applyTheme();
  }
  if (changes.fontSize) {
    state.fontSize = normalizeFontSize(changes.fontSize.newValue);
    applyFontSize();
  }
  if (changes.systemPrompt)    state.systemPrompt    = changes.systemPrompt.newValue || '';
  if (changes.maxTokens)       state.maxTokens       = changes.maxTokens.newValue || 0;
  if (changes.temperature !== undefined) {
    const t = changes.temperature.newValue;
    state.temperature = (t !== undefined && t >= 0) ? t : -1;
  }
});

/* ═══════════════════════════ THEME ════════════════════════════════ */
function resolveTheme(theme) {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function applyTheme() {
  const resolved = resolveTheme(state.theme);
  document.documentElement.setAttribute('data-theme', resolved);
  const isDark = resolved === 'dark';
  dom.themeIconMoon.style.display = isDark ? 'none' : 'block';
  dom.themeIconSun.style.display  = isDark ? 'block' : 'none';
}

function toggleTheme() {
  const order = ['dark', 'light', 'system'];
  const idx = order.indexOf(state.theme);
  state.theme = order[(idx + 1) % order.length];
  applyTheme();
  saveStorage({ theme: state.theme });
  showToast('Theme: ' + state.theme.charAt(0).toUpperCase() + state.theme.slice(1), 1200);
}

/* ═══════════════════════════ FONT SIZE ═════════════════════════════ */
function applyFontSize() {
  document.documentElement.setAttribute('data-fontsize', state.fontSize);
  dom.fontSizeBtn.textContent = { s: 'Aa (S)', m: 'Aa', l: 'Aa (L)' }[state.fontSize] || 'Aa';
}

function cycleFontSize() {
  const order = ['s', 'm', 'l'];
  const idx = order.indexOf(state.fontSize);
  state.fontSize = order[(idx + 1) % order.length];
  applyFontSize();
  saveStorage({ fontSize: state.fontSize });
}

/* ═══════════════════════════ FOOTER PILLS ══════════════════════════ */
function updateFooterPills() {
  // Context toggle
  dom.contextToggle.textContent = state.singleTurn ? 'Single turn' : 'Full context';
  dom.contextToggle.classList.toggle('active', !state.singleTurn);
  dom.contextToggle.dataset.state = state.singleTurn ? 'single' : 'full';

  // Stream toggle
  dom.streamToggle.textContent = state.streamingEnabled ? 'Stream' : 'No stream';
  dom.streamToggle.classList.toggle('active', state.streamingEnabled);

  // Length toggle
  dom.lengthToggle.textContent = state.responseLength === 'detailed' ? 'Detailed' : 'Concise';
  dom.lengthToggle.classList.toggle('active', state.responseLength === 'detailed');
}

/* ═══════════════════════════ PIN SITE MODEL ════════════════════════ */
function updatePinUI() {
  dom.pinBtn.classList.toggle('pinned', state.pinned);
  dom.pinBtn.setAttribute('aria-pressed', state.pinned ? 'true' : 'false');
  dom.pinBtn.title = state.pinned
    ? `Pinned: ${modelLabel(state.model)} for ${state.currentHostname}`
    : 'Pin this model for the current site';
}

async function togglePin() {
  state.pinned = !state.pinned;
  if (state.pinned && state.currentHostname) {
    state.siteModels[state.currentHostname] = state.model;
    showToast(`Pinned ${modelLabel(state.model)} for ${state.currentHostname}`, 2000);
  } else if (state.currentHostname) {
    delete state.siteModels[state.currentHostname];
    showToast(`Unpinned model for ${state.currentHostname}`, 2000);
  }
  updatePinUI();
  await saveStorage({ siteModels: state.siteModels });
}

/* ═══════════════════════════ MESSAGES / CHAT ══════════════════════ */
function clearMessages() {
  state.messages = [];
  dom.messages.innerHTML = '';
  dom.emptyState.classList.remove('hidden');
  dom.selectionPill.style.display = 'none';
  updateTokenCounter();
}

function buildSystemPrompt() {
  let sys = state.systemPrompt
    ? state.systemPrompt + ' '
    : 'You are Zen AI, a helpful browser sidebar assistant. ';
  if (state.pageCtx.content) {
    sys += `The user is viewing: "${state.pageCtx.title}" (${state.pageCtx.url})\n\nPage content:\n${state.pageCtx.content.slice(0, 6000)}\n\n`;
  }
  if (state.responseLength === 'detailed') {
    sys += 'Provide detailed, thorough responses.';
  } else {
    sys += 'Keep responses concise.';
  }
  return sys;
}

function addMessage(role, content) {
  state.messages.push({ role, content });
  renderMessage(role, content);
  dom.emptyState.classList.add('hidden');
  updateTokenCounter();
  scrollToBottom();
}

function renderMessage(role, content, streaming = false) {
  const msgEl = document.createElement('div');
  msgEl.className = `msg ${role}`;
  msgEl.setAttribute('data-role', role);

  if (role === 'assistant') {
    const avatarEl = document.createElement('div');
    avatarEl.className = 'msg-avatar';
    avatarEl.textContent = 'Z';
    msgEl.appendChild(avatarEl);
  }

  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'msg-bubble';
  bubbleEl.innerHTML = renderMarkdown(content);

  const innerWrap = document.createElement('div');
  innerWrap.style.minWidth = '0';
  innerWrap.appendChild(bubbleEl);

  // Message actions (copy, regen)
  const actionsEl = document.createElement('div');
  actionsEl.className = 'msg-actions';
  if (role === 'assistant') {
    actionsEl.innerHTML = `
      <button class="msg-action-btn" data-action="copy" title="Copy">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy
      </button>
      <button class="msg-action-btn" data-action="regen" title="Regenerate">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        Regen
      </button>
    `;
    actionsEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'copy') {
        navigator.clipboard.writeText(content).then(() => showToast('Copied!', 1500)).catch(() => showToast('Copy failed', 1500));
      } else if (btn.dataset.action === 'regen') {
        regenerateLastResponse();
      }
    });
  } else {
    actionsEl.innerHTML = `
      <button class="msg-action-btn" data-action="copy" title="Copy">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy
      </button>
    `;
    actionsEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (btn && btn.dataset.action === 'copy') {
        navigator.clipboard.writeText(content).then(() => showToast('Copied!', 1500)).catch(() => showToast('Copy failed', 1500));
      }
    });
  }
  innerWrap.appendChild(actionsEl);

  msgEl.appendChild(innerWrap);
  dom.messages.appendChild(msgEl);
  return { msgEl, bubbleEl };
}

function renderMarkdown(text) {
  // Step 1: extract code blocks first so we don't mangle them
  const codeBlocks = [];
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = escapeHtml(code.trim());
    codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${escaped}</code></pre>`);
    return `\x00CODE${codeBlocks.length - 1}\x00`;
  });

  // Step 2: extract inline code
  const inlineCodes = [];
  text = text.replace(/`([^`\n]+)`/g, (_, code) => {
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return `\x00INLINE${inlineCodes.length - 1}\x00`;
  });

  // Step 3: escape remaining HTML
  text = escapeHtml(text);

  // Step 4: apply markdown to safe text
  // Headings
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.+)$/gm,  '<h2>$1</h2>');
  text = text.replace(/^# (.+)$/gm,   '<h1>$1</h1>');
  // Blockquotes
  text = text.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  // Bold & italic
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*([^*]+)\*\*/g,     '<strong>$1</strong>');
  text = text.replace(/\*([^*\n]+)\*/g,        '<em>$1</em>');
  // Links — [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // Unordered lists
  text = text.replace(/^[-*] (.+)$/gm, '<li class="ul">$1</li>');
  // Ordered lists
  text = text.replace(/^\d+\. (.+)$/gm, '<li class="ol">$1</li>');
  // Wrap consecutive list items in <ul> or <ol>
  text = text.replace(/(<li class="ul">.*?<\/li>\n?)+/g, m => `<ul>${m.replace(/ class="ul"/g, '')}</ul>`);
  text = text.replace(/(<li class="ol">.*?<\/li>\n?)+/g, m => `<ol>${m.replace(/ class="ol"/g, '')}</ol>`);
  // Horizontal rule
  text = text.replace(/^---+$/gm, '<hr>');
  // Paragraphs — split on double newline
  const parts = text.split(/\n{2,}/);
  text = parts.map(p => {
    p = p.trim();
    if (!p) return '';
    if (/^<(h[1-3]|ul|ol|li|hr|pre|blockquote|div)/.test(p)) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  // Step 5: restore code blocks
  text = text.replace(/\x00CODE(\d+)\x00/g, (_, i) => codeBlocks[+i]);
  text = text.replace(/\x00INLINE(\d+)\x00/g, (_, i) => inlineCodes[+i]);

  return text;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Strip potential API key patterns from error messages before display
function sanitizeErrorMsg(msg) {
  if (!msg) return 'Unknown error';
  return msg
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, 'sk-***')
    .replace(/sk-ant-[a-zA-Z0-9_-]{20,}/g, 'sk-ant-***')
    .replace(/AIza[a-zA-Z0-9_-]{20,}/g, 'AIza***')
    .replace(/key=[a-zA-Z0-9_-]{20,}/g, 'key=***');
}

// Map HTTP status codes to user-friendly messages
function friendlyApiError(status, msg) {
  switch (status) {
    case 401: return 'Invalid API key. Check your key in Settings.';
    case 402: return 'Billing issue with your API provider. Check your account.';
    case 403: return 'Access denied. This model may not be available on your plan.';
    case 429: return 'Rate limited. Wait a moment and try again.';
    case 500: case 502: case 503: return 'Provider is temporarily unavailable. Try again shortly.';
    default: return sanitizeErrorMsg(msg) || 'API error ' + status;
  }
}

const REQUEST_TIMEOUT_MS = 45000;

/* ═══════════════════════════ SEND MESSAGE ══════════════════════════ */
async function sendMessage(content) {
  content = content.trim();
  if (!content || state.generating) return;

  closeAllDropdowns();
  dom.slashPalette.style.display = 'none';

  addMessage('user', content);
  dom.chatInput.value = '';
  dom.chatInput.style.height = 'auto';
  updateSendButton();
  updateTokenCounter();

  // Cancel any auto-summary in flight
  if (autoSummaryCtrl) { autoSummaryCtrl.abort(); autoSummaryCtrl = null; }
  dom.autoSummaryCard.style.display = 'none';

  // Check if model needs a custom endpoint
  if (!state.endpoint && needsCustomEndpoint(state.model)) {
    showError(`${modelLabel(state.model)} requires a custom endpoint (e.g. OpenRouter). Set one in Settings.`);
    return;
  }

  setGenerating(true);
  showError(null);

  // Build messages array for API
  const systemMsg = { role: 'system', content: buildSystemPrompt() };
  let history;
  if (state.singleTurn) {
    history = [systemMsg, { role: 'user', content }];
  } else {
    history = [systemMsg, ...state.messages.slice(0, -1)]; // exclude the just-added user msg
    history.push({ role: 'user', content });
  }

  // Show typing indicator
  const typingEl = document.createElement('div');
  typingEl.className = 'msg assistant';
  typingEl.innerHTML = `<div class="msg-avatar">Z</div><div class="typing-dots"><span></span><span></span><span></span></div>`;
  dom.messages.appendChild(typingEl);
  scrollToBottom();

  try {
    if (state.streamingEnabled) {
      await streamResponse(history, typingEl);
    } else {
      const text = await callAI(history, false);
      typingEl.remove();
      if (text) {
        addMessage('assistant', text);
        await saveCurrentChat();
      }
    }
  } catch (err) {
    typingEl.remove();
    if (err.name === 'AbortError') { /* user cancelled */ }
    else if (err.name === 'TypeError' && err.message.includes('fetch')) {
      showError('Network error. Check your internet connection and endpoint URL.');
    } else {
      showError(sanitizeErrorMsg(err.message) || 'Request failed. Check your API key in Settings.');
    }
  } finally {
    setGenerating(false);
  }
}

async function streamResponse(history, typingEl) {
  const { bubbleEl, msgEl } = (() => {
    typingEl.remove();
    const wrap = document.createElement('div');
    wrap.className = 'msg assistant';
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = 'Z';
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    const inner = document.createElement('div');
    inner.style.minWidth = '0';
    inner.appendChild(bubble);
    wrap.appendChild(avatar);
    wrap.appendChild(inner);
    dom.messages.appendChild(wrap);
    return { bubbleEl: bubble, msgEl: wrap };
  })();

  const cursor = document.createElement('span');
  cursor.className = 'stream-cursor';
  bubbleEl.appendChild(cursor);

  state.abortController = new AbortController();
  const timeoutId = setTimeout(() => state.abortController.abort(), REQUEST_TIMEOUT_MS);
  let fullText = '';

  let resp;
  try {
    resp = await fetch(getApiEndpoint(true), {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(buildApiBody(history, true)),
      signal: state.abortController.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    let errMsg;
    try { errMsg = JSON.parse(errText)?.error?.message; } catch (_) {}
    throw new Error(friendlyApiError(resp.status, errMsg || errText.slice(0, 200)));
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  const provider = providerOf(state.model);
  let lineBuf = '';   // buffer for partial SSE lines

  function updateStreamUI() {
    cursor.remove();
    bubbleEl.textContent = '';
    const rendered = renderMarkdown(fullText);
    bubbleEl.insertAdjacentHTML('beforeend', rendered);
    bubbleEl.appendChild(cursor);
    scrollToBottom();
  }

  // SSE-based streaming (OpenAI, Anthropic, Gemini with alt=sse, OpenAI-compat)
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    lineBuf += decoder.decode(value, { stream: true });
    const lines = lineBuf.split('\n');
    lineBuf = lines.pop() || '';  // keep incomplete last line in buffer

    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith('data: ')) continue;
      const delta = parseDelta(line, provider);
      if (delta === null) continue; // [DONE]
      if (delta) {
        fullText += delta;
        updateStreamUI();
      }
    }
  }
  // Process any remaining buffered data
  if (lineBuf.trim().startsWith('data: ')) {
    const delta = parseDelta(lineBuf.trim(), provider);
    if (delta && delta !== null) fullText += delta;
  }

  cursor.remove();
  if (fullText) {
    bubbleEl.innerHTML = renderMarkdown(fullText);
    state.messages.push({ role: 'assistant', content: fullText });

    // Add actions
    const inner = msgEl.querySelector('div[style]') || msgEl;
    const actionsEl = document.createElement('div');
    actionsEl.className = 'msg-actions';
    actionsEl.innerHTML = `
      <button class="msg-action-btn" data-action="copy" title="Copy">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy
      </button>
      <button class="msg-action-btn" data-action="regen" title="Regenerate">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        Regen
      </button>
    `;
    actionsEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'copy') {
        navigator.clipboard.writeText(fullText).then(() => showToast('Copied!', 1500)).catch(() => showToast('Copy failed', 1500));
      } else if (btn.dataset.action === 'regen') {
        regenerateLastResponse();
      }
    });
    inner.appendChild(actionsEl);

    updateTokenCounter();
    await saveCurrentChat();
  }
}

async function callAI(history, streaming = false) {
  state.abortController = new AbortController();
  const timeoutId = setTimeout(() => state.abortController.abort(), REQUEST_TIMEOUT_MS);
  let resp;
  try {
    resp = await fetch(getApiEndpoint(streaming), {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(buildApiBody(history, streaming)),
      signal: state.abortController.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    let errMsg;
    try { errMsg = JSON.parse(errText)?.error?.message; } catch (_) {}
    throw new Error(friendlyApiError(resp.status, errMsg || errText.slice(0, 200)));
  }
  const data = await resp.json();
  const provider = providerOf(state.model);
  if (provider === 'anthropic') {
    // Anthropic: { content: [{type:'text', text:'...'}] }
    return data.content?.[0]?.text || '';
  }
  if (provider === 'gemini') {
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  return data.choices?.[0]?.message?.content || '';
}

/* ═══════════════════════════ API LAYER ════════════════════════════ */
function providerOf(model) {
  if (!model) return 'openai';
  // If user has a custom endpoint set, always use OpenAI-compat format
  if (state.endpoint) return 'openai-compat';
  if (model.startsWith('claude'))    return 'anthropic';
  if (model.startsWith('gemini'))    return 'gemini';
  if (model.startsWith('grok'))      return 'openai-compat'; // xAI uses OpenAI-compat
  // Meta, DeepSeek, Mistral etc. need a custom endpoint (e.g. OpenRouter)
  // but default to OpenAI-compat format so they work with any proxy
  return 'openai';
}

// Models that require a proxy/custom endpoint (not available via direct API)
function needsCustomEndpoint(model) {
  if (!model) return false;
  return model.includes('/') || // namespaced (meta-llama/, deepseek/, google/)
    model.startsWith('grok') ||
    model.startsWith('mistral') ||
    model.startsWith('codestral');
}

function getApiEndpoint(streaming = false) {
  // Custom endpoint always wins
  if (state.endpoint) {
    const base = state.endpoint.replace(/\/$/, '');
    return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
  }
  const provider = providerOf(state.model);
  if (provider === 'anthropic') return 'https://api.anthropic.com/v1/messages';
  if (provider === 'gemini') {
    const key = state.geminiKey || state.apiKey;
    const method = streaming ? 'streamGenerateContent' : 'generateContent';
    const sseParam = streaming ? '&alt=sse' : '';
    return `https://generativelanguage.googleapis.com/v1beta/models/${state.model}:${method}?key=${key}${sseParam}`;
  }
  return 'https://api.openai.com/v1/chat/completions';
}

function getApiHeaders() {
  const provider = providerOf(state.model);
  if (provider === 'anthropic') {
    return {
      'Content-Type': 'application/json',
      'x-api-key': state.anthropicKey || state.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
  }
  if (provider === 'gemini') {
    // API key is in URL for Gemini
    return { 'Content-Type': 'application/json' };
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${state.apiKey}`,
  };
}

const MAX_TOKENS_CONCISE  = 1024;
const MAX_TOKENS_DETAILED = 4096;

function buildApiBody(history, stream) {
  const maxTok = state.maxTokens > 0
    ? state.maxTokens
    : (state.responseLength === 'detailed' ? MAX_TOKENS_DETAILED : MAX_TOKENS_CONCISE);
  const provider = providerOf(state.model);

  if (provider === 'anthropic') {
    const sys  = history.find(m => m.role === 'system');
    const msgs = history.filter(m => m.role !== 'system');
    const body = {
      model: state.model,
      system: sys ? sys.content : 'You are Zen AI, a helpful browser sidebar assistant.',
      messages: msgs,
      stream,
      max_tokens: maxTok,
    };
    if (state.temperature >= 0) body.temperature = state.temperature;
    return body;
  }

  if (provider === 'gemini') {
    const contents = history
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const sys = history.find(m => m.role === 'system');
    const genConfig = { maxOutputTokens: maxTok };
    if (state.temperature >= 0) genConfig.temperature = state.temperature;
    const body = { contents, generationConfig: genConfig };
    if (sys) body.systemInstruction = { parts: [{ text: sys.content }] };
    return body;
  }

  // OpenAI-compatible (OpenAI, xAI, Meta via OpenRouter, DeepSeek, Mistral, custom VPS)
  const body = {
    model: state.model,
    messages: history,
    stream,
    max_tokens: maxTok,
  };
  if (state.temperature >= 0) body.temperature = state.temperature;
  return body;
}

// Parse SSE delta — handles OpenAI, Anthropic, and Gemini streaming formats
// Returns: string (delta text), null ([DONE]), or throws on provider error
function parseDelta(line, provider) {
  const data = line.slice(6).trim();
  if (data === '[DONE]') return null;
  try {
    const json = JSON.parse(data);
    if (provider === 'anthropic') {
      // Anthropic error events must propagate to caller
      if (json.type === 'error') {
        const err = new Error(json.error?.message || 'Anthropic streaming error');
        err.isProviderError = true;
        throw err;
      }
      // Anthropic: {type:'content_block_delta', delta:{type:'text_delta', text:'...'}}
      return json.delta?.text || json.delta?.content || '';
    }
    if (provider === 'gemini') {
      return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
    // OpenAI-compat
    return json.choices?.[0]?.delta?.content || '';
  } catch (e) {
    // Re-throw provider errors so they surface to the user
    if (e.isProviderError) throw e;
    return '';
  }
}

async function regenerateLastResponse() {
  // Remove last AI message
  const lastAiIdx = [...state.messages].reverse().findIndex(m => m.role === 'assistant');
  if (lastAiIdx === -1) return;
  state.messages.splice(state.messages.length - 1 - lastAiIdx, 1);
  // Remove from DOM
  const aiMsgs = dom.messages.querySelectorAll('.msg.assistant');
  if (aiMsgs.length > 0) aiMsgs[aiMsgs.length - 1].remove();
  // Re-send
  const userMsgs = state.messages.filter(m => m.role === 'user');
  if (!userMsgs.length) return;
  // Re-run with existing history (already has the user message)
  setGenerating(true);
  const typingEl = document.createElement('div');
  typingEl.className = 'msg assistant';
  typingEl.innerHTML = `<div class="msg-avatar">Z</div><div class="typing-dots"><span></span><span></span><span></span></div>`;
  dom.messages.appendChild(typingEl);
  scrollToBottom();
  try {
    const sysMsg = { role: 'system', content: buildSystemPrompt() };
    const history = [sysMsg, ...state.messages];
    if (state.streamingEnabled) {
      await streamResponse(history, typingEl);
    } else {
      const text = await callAI(history, false);
      typingEl.remove();
      if (text) addMessage('assistant', text);
    }
  } catch (err) {
    typingEl.remove();
    if (err.name !== 'AbortError') showError(err.message || 'Regeneration failed.');
  } finally {
    setGenerating(false);
  }
}

/* ═══════════════════════════ GENERATING STATE ══════════════════════ */
function setGenerating(val) {
  state.generating = val;
  dom.btnSend.disabled = val || !dom.chatInput.value.trim();
  dom.btnStop.style.display = val ? 'flex' : 'none';
  dom.chatInput.readOnly = val;
}

function stopGeneration() {
  if (state.abortController) {
    state.abortController.abort();
  }
  setGenerating(false);
}

/* ═══════════════════════════ CHAT HISTORY ══════════════════════════ */
async function saveCurrentChat() {
  if (state.messages.length === 0) return;
  const firstUser = state.messages.find(m => m.role === 'user');
  if (!firstUser) return;

  const entry = {
    id: `chat_${Date.now()}`,
    messages: [...state.messages],
    timestamp: Date.now(),
    hostname: state.currentHostname,
    title: firstUser.content.slice(0, 60),
  };

  // Remove old entry for same session if exists (keep only latest)
  const existingIdx = state.chatHistory.findIndex(h =>
    h.messages[0]?.content === firstUser.content && h.hostname === state.currentHostname
  );
  if (existingIdx >= 0) {
    state.chatHistory[existingIdx] = entry;
  } else {
    state.chatHistory.unshift(entry);
    if (state.chatHistory.length > 50) state.chatHistory = state.chatHistory.slice(0, 50);
  }

  renderHistory();
  await saveStorage({ chatHistory: state.chatHistory });
}

function renderHistory() {
  dom.historyList.innerHTML = '';
  if (state.chatHistory.length === 0) {
    dom.historyList.innerHTML = '<div class="history-empty">No conversations yet</div>';
    return;
  }
  state.chatHistory.forEach((entry, idx) => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.setAttribute('role', 'listitem');
    el.innerHTML = `
      <div class="history-item-body">
        <div class="history-item-title">${escapeHtml(entry.title || 'Untitled')}</div>
        <div class="history-item-time">${relativeTime(entry.timestamp)}</div>
      </div>
      <div class="history-item-actions">
        <button class="history-action-btn" data-action="export" title="Export">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button class="history-action-btn danger" data-action="delete" title="Delete">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    `;

    el.addEventListener('click', e => {
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        e.stopPropagation();
        if (actionBtn.dataset.action === 'delete') {
          deleteHistoryEntry(idx);
        } else if (actionBtn.dataset.action === 'export') {
          exportChat(entry);
        }
        return;
      }
      restoreChat(entry);
    });

    dom.historyList.appendChild(el);
  });
}

function restoreChat(entry) {
  state.messages = [...entry.messages];
  dom.messages.innerHTML = '';
  dom.emptyState.classList.add('hidden');
  entry.messages.forEach(m => renderMessage(m.role, m.content));
  closeHistoryPanel();
  updateTokenCounter();
  scrollToBottom();
}

async function deleteHistoryEntry(idx) {
  state.chatHistory.splice(idx, 1);
  renderHistory();
  await saveStorage({ chatHistory: state.chatHistory });
}

async function clearAllHistory() {
  state.chatHistory = [];
  renderHistory();
  await saveStorage({ chatHistory: [] });
  showToast('History cleared', 1500);
}

function exportChat(entry) {
  const lines = [`# Chat Export — ${new Date(entry.timestamp).toLocaleString()}`, ''];
  (entry.messages || state.messages).forEach(m => {
    lines.push(`**${m.role === 'user' ? 'You' : 'AI'}:** ${m.content}`);
    lines.push('');
  });
  const md = lines.join('\n');
  navigator.clipboard.writeText(md).then(() => showToast('Chat exported to clipboard', 2000)).catch(() => showToast('Export failed', 2000));
}

function openHistoryPanel() {
  state.historyOpen = true;
  dom.historyPanel.classList.add('open');
  dom.historyClose.focus();
}

function closeHistoryPanel() {
  state.historyOpen = false;
  dom.historyPanel.classList.remove('open');
}

/* ═══════════════════════════ TEMPLATES ═════════════════════════════ */
function renderTemplates() {
  dom.templatesList.innerHTML = '';
  state.templates.forEach((t, idx) => {
    const el = document.createElement('button');
    el.className = 'template-item';
    el.innerHTML = `
      <div style="flex:1; min-width:0;">
        <div class="template-item-name">${escapeHtml(t.name)}</div>
        <div class="template-item-preview">${escapeHtml(t.prompt)}</div>
      </div>
      <button class="template-delete-btn" data-idx="${idx}" title="Delete template">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      </button>
    `;
    el.addEventListener('click', e => {
      const delBtn = e.target.closest('.template-delete-btn');
      if (delBtn) {
        e.stopPropagation();
        deleteTemplate(parseInt(delBtn.dataset.idx));
        return;
      }
      dom.chatInput.value = t.prompt;
      dom.chatInput.dispatchEvent(new Event('input'));
      dom.chatInput.focus();
      closeTemplatesPanel();
    });
    dom.templatesList.appendChild(el);
  });
}

async function saveCurrentAsTemplate() {
  const text = dom.chatInput.value.trim();
  if (!text) { showToast('Type something first', 1500); return; }
  const name = prompt('Template name:') || `Template ${state.templates.length + 1}`;
  state.templates.push({ id: `t${Date.now()}`, name, prompt: text });
  renderTemplates();
  await saveStorage({ templates: state.templates });
  showToast('Template saved', 1500);
}

async function deleteTemplate(idx) {
  state.templates.splice(idx, 1);
  renderTemplates();
  await saveStorage({ templates: state.templates });
}

function openTemplatesPanel() {
  state.templatesPanelOpen = true;
  dom.templatesPanel.style.display = 'flex';
  dom.templatesPanel.style.flexDirection = 'column';
  dom.slashPalette.style.display = 'none';
}

function closeTemplatesPanel() {
  state.templatesPanelOpen = false;
  dom.templatesPanel.style.display = 'none';
}

/* ═══════════════════════════ SLASH COMMANDS ════════════════════════ */
function updateSlashPalette(val) {
  if (!val.startsWith('/')) {
    dom.slashPalette.style.display = 'none';
    return;
  }

  const query = val.slice(1).toLowerCase();
  const items = dom.slashPalette.querySelectorAll('.slash-item');
  let hasVisible = false;

  items.forEach(item => {
    const cmd = item.dataset.command.slice(1);
    const matches = cmd.startsWith(query);
    item.style.display = matches ? '' : 'none';
    if (matches) hasVisible = true;
  });

  dom.slashPalette.style.display = hasVisible ? 'block' : 'none';
  state.slashIdx = -1;
  updateSlashFocus();

  // Position just above input-wrap
  positionSlashPalette();
}

function positionSlashPalette() {
  const iwRect = dom.inputWrap.getBoundingClientRect();
  const appRect = dom.app.getBoundingClientRect();
  dom.slashPalette.style.bottom = (appRect.bottom - iwRect.top + 4) + 'px';
}

function getVisibleSlashItems() {
  return [...dom.slashList.querySelectorAll('.slash-item')].filter(el => el.style.display !== 'none');
}

function updateSlashFocus() {
  const items = getVisibleSlashItems();
  items.forEach((el, i) => el.classList.toggle('focused', i === state.slashIdx));
}

function navigateSlash(dir) {
  const items = getVisibleSlashItems();
  if (!items.length) return;
  state.slashIdx = (state.slashIdx + dir + items.length) % items.length;
  updateSlashFocus();
}

function selectSlashItem(item) {
  const prompt = item.dataset.prompt;
  dom.chatInput.value = prompt;
  dom.slashPalette.style.display = 'none';
  dom.chatInput.dispatchEvent(new Event('input'));
  // Send immediately
  sendMessage(prompt);
}

/* ═══════════════════════════ TOKEN COUNTER ═════════════════════════ */
function updateTokenCounter() {
  const inputTokens = Math.ceil(dom.chatInput.value.length / 4);
  const histTokens = state.messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
  const total = inputTokens + histTokens;
  dom.tokenCounter.textContent = total > 0 ? `~${total.toLocaleString()} tokens` : '';
}

/* ═══════════════════════════ SEND BUTTON ═══════════════════════════ */
function updateSendButton() {
  dom.btnSend.disabled = state.generating || !dom.chatInput.value.trim();
}

/* ═══════════════════════════ UI HELPERS ════════════════════════════ */
function scrollToBottom() {
  dom.messages.scrollTop = dom.messages.scrollHeight;
}

function showError(msg) {
  if (!msg) {
    dom.errorBar.style.display = 'none';
    return;
  }
  dom.errorText.textContent = msg;
  dom.errorBar.style.display = 'flex';
}

function showToast(msg, duration = 2000) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  dom.toastContainer.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 220);
  }, duration);
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function closeAllDropdowns() {
  dom.modelMenu.style.display     = 'none';
  dom.pageActionsMenu.style.display = 'none';
  dom.modelBtn.setAttribute('aria-expanded', 'false');
  dom.pageActionsBtn.setAttribute('aria-expanded', 'false');
}

/* ═══════════════════════════ EVENTS ════════════════════════════════ */

// Model dropdown
dom.modelBtn.addEventListener('click', e => {
  e.stopPropagation();
  const open = dom.modelMenu.style.display !== 'none';
  closeAllDropdowns();
  if (!open) {
    dom.modelMenu.style.display = 'block';
    dom.modelBtn.setAttribute('aria-expanded', 'true');
  }
});

dom.modelMenu.addEventListener('click', e => {
  const item = e.target.closest('.model-item');
  if (!item) return;
  setModel(item.dataset.model);
  closeAllDropdowns();
});

// Page actions
dom.pageActionsBtn.addEventListener('click', e => {
  e.stopPropagation();
  const open = dom.pageActionsMenu.style.display !== 'none';
  closeAllDropdowns();
  if (!open) {
    dom.pageActionsMenu.style.display = 'block';
    dom.pageActionsBtn.setAttribute('aria-expanded', 'true');
  }
});

dom.actionScreenshot.addEventListener('click', async () => {
  closeAllDropdowns();
  try {
    const dataUrl = await browser.tabs.captureVisibleTab(null, { format: 'png' });
    // Download the screenshot
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `screenshot-${Date.now()}.png`;
    a.click();
    showToast('Screenshot saved', 2000);
  } catch (e) {
    showToast('Screenshot failed — check permissions', 2000);
  }
});

dom.actionCopyText.addEventListener('click', () => {
  closeAllDropdowns();
  if (state.pageCtx.content) {
    navigator.clipboard.writeText(state.pageCtx.content).then(() => {
      showToast('Page text copied', 2000);
    }).catch(() => showToast('Copy failed', 2000));
  } else {
    showToast('No page content loaded', 2000);
  }
});

// History
dom.historyBtn.addEventListener('click', () => openHistoryPanel());
dom.historyClose.addEventListener('click', () => closeHistoryPanel());
dom.historyClearAll.addEventListener('click', () => {
  if (confirm('Clear all history?')) clearAllHistory();
});

// New chat
dom.newChatBtn.addEventListener('click', () => {
  if (state.messages.length > 0) saveCurrentChat();
  clearMessages();
  dom.autoSummaryCard.style.display = 'none';
  dom.contextBanner.style.display = 'none';
});

// Settings — open settings page in a new tab
dom.settingsBtn.addEventListener('click', () => {
  browser.runtime.openOptionsPage().catch(() => {
    browser.tabs.create({ url: browser.runtime.getURL('settings/settings.html') });
  });
});

// Theme
dom.themeBtn.addEventListener('click', () => toggleTheme());

// Pin
dom.pinBtn.addEventListener('click', () => togglePin());

// Dismiss buttons
dom.contextDismiss.addEventListener('click', () => { dom.contextBanner.style.display = 'none'; });
dom.autoSummaryDismiss.addEventListener('click', () => { dom.autoSummaryCard.style.display = 'none'; });
dom.errorDismiss.addEventListener('click', () => showError(null));
dom.selectionPillDismiss.addEventListener('click', e => {
  e.stopPropagation();
  dom.selectionPill.style.display = 'none';
});
dom.selectionPill.addEventListener('click', () => {
  const text = dom.selectionPill._fullText || '';
  if (text) {
    dom.chatInput.value = text;
    dom.chatInput.focus();
    dom.chatInput.dispatchEvent(new Event('input'));
  }
  dom.selectionPill.style.display = 'none';
});

// Footer pills
dom.contextToggle.addEventListener('click', () => {
  state.singleTurn = !state.singleTurn;
  updateFooterPills();
  saveStorage({ singleTurn: state.singleTurn });
});

dom.streamToggle.addEventListener('click', () => {
  state.streamingEnabled = !state.streamingEnabled;
  updateFooterPills();
  saveStorage({ streamingEnabled: state.streamingEnabled });
});

dom.fontSizeBtn.addEventListener('click', () => cycleFontSize());

dom.lengthToggle.addEventListener('click', () => {
  state.responseLength = state.responseLength === 'concise' ? 'detailed' : 'concise';
  updateFooterPills();
  saveStorage({ responseLength: state.responseLength });
});

dom.btnStop.addEventListener('click', () => stopGeneration());

// Templates
dom.openTemplatesBtn.addEventListener('click', () => {
  dom.slashPalette.style.display = 'none';
  openTemplatesPanel();
});
dom.saveTemplateBtn.addEventListener('click', () => saveCurrentAsTemplate());
dom.templatesClose.addEventListener('click', () => closeTemplatesPanel());

// Suggestion chips
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => sendMessage(chip.dataset.prompt));
});

// Slash command items
dom.slashList.addEventListener('click', e => {
  const item = e.target.closest('.slash-item');
  if (item) selectSlashItem(item);
});

// Send button
dom.btnSend.addEventListener('click', () => sendMessage(dom.chatInput.value));

// Input events
dom.chatInput.addEventListener('input', () => {
  // Auto-resize
  dom.chatInput.style.height = 'auto';
  dom.chatInput.style.height = Math.min(dom.chatInput.scrollHeight, 140) + 'px';

  updateSendButton();
  updateTokenCounter();
  updateSlashPalette(dom.chatInput.value);
});

dom.chatInput.addEventListener('keydown', e => {
  // Slash palette navigation
  if (dom.slashPalette.style.display !== 'none') {
    if (e.key === 'ArrowDown') { e.preventDefault(); navigateSlash(1); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); navigateSlash(-1); return; }
    if (e.key === 'Escape')    { dom.slashPalette.style.display = 'none'; return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const focused = dom.slashList.querySelector('.slash-item.focused');
      if (focused) { selectSlashItem(focused); return; }
      const first = dom.slashList.querySelector('.slash-item:not([style*="display: none"])');
      if (first) selectSlashItem(first);
      return;
    }
  }

  // Send on Enter (not shift+enter)
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!state.generating && dom.chatInput.value.trim()) {
      sendMessage(dom.chatInput.value);
    }
  }
});

// Close dropdowns on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('#model-dropdown-wrap')) {
    dom.modelMenu.style.display = 'none';
    dom.modelBtn.setAttribute('aria-expanded', 'false');
  }
  if (!e.target.closest('#page-actions-wrap')) {
    dom.pageActionsMenu.style.display = 'none';
    dom.pageActionsBtn.setAttribute('aria-expanded', 'false');
  }
  if (!e.target.closest('#slash-palette') && !e.target.closest('#chat-input')) {
    dom.slashPalette.style.display = 'none';
  }
  if (!e.target.closest('#templates-panel') && !e.target.closest('#open-templates-btn')) {
    closeTemplatesPanel();
  }
});

// Global keyboard shortcut: Cmd+Shift+A or Ctrl+Shift+A
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
    e.preventDefault();
    dom.chatInput.focus();
  }
});

// Setup form
dom.setupSaveBtn.addEventListener('click', async () => {
  const key      = dom.apiKeyInput.value.trim();
  const endpoint = dom.setupEndpointInput ? dom.setupEndpointInput.value.trim() : '';
  if (!key) { dom.apiKeyInput.focus(); showToast('Please enter an API key', 2000); return; }
  state.apiKey   = key;
  state.endpoint = endpoint;
  state.model    = dom.setupModelSelect.value;
  dom.modelName.textContent = modelLabel(state.model);
  await saveStorage({ apiKey: key, endpoint, model: state.model });
  dom.setupOverlay.style.display = 'none';
  showToast('Connected — start chatting!', 2000);
});

/* ═══════════════════════════ BOOT ══════════════════════════════════ */
init();
