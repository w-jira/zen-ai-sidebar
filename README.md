# Zen AI Sidebar

A privacy-first AI assistant sidebar for [Zen Browser](https://zen-browser.app) (and any Firefox-based browser). Bring your own API key — works with OpenAI, Anthropic, OpenRouter, Ollama, LiteLLM, or any OpenAI-compatible endpoint.


---

## Features

- **Streaming chat** — real-time responses with dot-wave loading animation
- **Page intelligence** — auto-summarizes the current page, extracts selected text into context
- **Model switcher** — switch between any models mid-conversation, with per-site model pinning
- **Slash commands** — `/summarize`, `/tldr`, `/eli5`, `/translate`, `/keypoints`, `/questions`
- **Chat history** — persists up to 50 conversations, restore or export any of them
- **Prompt templates** — save and reuse custom prompts
- **Token counter** — live estimate of context size in the input and page context banner
- **Full context toggle** — send full conversation history or single-turn only
- **Streaming toggle** — switch between streamed and complete responses
- **Font size & response length** — Aa sizing (S/M/L) and Concise/Detailed mode
- **Dark & light mode** — follows system preference, manually overridable
- **Keyboard shortcut** — `Cmd+Shift+A` / `Ctrl+Shift+A` to focus the input

---

## Install

### Option A — One-click (recommended)

1. **[Download zen-ai-sidebar.xpi](https://github.com/w-jira/zen-ai-sidebar/releases/latest)** from the latest release
2. Drag the `.xpi` file onto any Zen or Firefox window
3. Click **Add** when prompted
4. Press `Ctrl+Shift+A` (`Cmd+Shift+A` on Mac) to open the sidebar

> **Blocked?** Go to `about:config` → search `xpinstall.signatures.required` → set it to `false` → try again. Zen Browser typically has this off by default.

### Option B — Load from source

1. Clone or [download this repo](https://github.com/w-jira/zen-ai-sidebar/archive/refs/heads/main.zip) and unzip it
2. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on**
3. Select `manifest.json` from the unzipped folder

### Configure your API

Click the **⚙️ gear icon** inside the sidebar and enter your endpoint and API key.
Hit **Test Connection** to confirm it works.

| Field | Value |
|---|---|
| **Endpoint** | Your API base URL (e.g. `https://api.openai.com/v1`) |
| **API Key** | Your key for that service |
| **Model** | Any model ID from the list in the sidebar |

---

## Supported Backends

Any OpenAI-compatible API works. The sidebar appends `/chat/completions` to your endpoint automatically.

### OpenRouter *(easiest — access 100+ models with one key)*
```
Endpoint:  https://openrouter.ai/api/v1
API Key:   your OpenRouter key (get one at openrouter.ai)
Model:     openai/gpt-4o  or  anthropic/claude-3.5-sonnet
```

### OpenAI
```
Endpoint:  https://api.openai.com/v1
API Key:   sk-...
Model:     gpt-4o
```

### Anthropic (via proxy)
Anthropic's API is not OpenAI-compatible natively. Use [LiteLLM](https://github.com/BerriAI/litellm) or OpenRouter as a proxy.

### Ollama *(local, fully private, free)*
```
Endpoint:  http://localhost:11434/v1
API Key:   ollama
Model:     llama3  (or any model you've pulled)
```

### LiteLLM *(self-hosted proxy — recommended for VPS users)*
```
Endpoint:  https://your-server.com/v1
API Key:   your LiteLLM master key
Model:     claude-3-5-sonnet-20241022  (or any model in your config)
```

### vLLM / custom OpenAI-compatible server
```
Endpoint:  https://your-server.com/v1
API Key:   your key
Model:     the model ID your server accepts
```

---

## Project Structure

```
zen-ai-sidebar/
├── manifest.json          # Firefox MV2 extension manifest
├── background.js          # Message router (content ↔ sidebar)
├── content.js             # Page text extraction + selection listener
├── sidebar/
│   ├── panel.html         # Sidebar UI
│   ├── panel.css          # Styles (light + dark, CSS variables)
│   └── panel.js           # Full chat logic, all features
├── settings/
│   ├── settings.html      # Settings page
│   ├── settings.css
│   └── settings.js        # Config save/load, connection tester
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## How It Works

1. When the sidebar opens, `background.js` asks the active tab's `content.js` to extract the page text (capped at 6,000 chars)
2. The sidebar receives the text and shows an auto-summary card + context banner with token count
3. Every message you send optionally includes the page content in the system prompt
4. Responses stream back via SSE (`ReadableStream`) and render as markdown in real time
5. Conversations are saved to `browser.storage.local` (max 50 history entries)

---

## Privacy

Privacy is a right, not a feature. This extension was built on that belief.

- **Zero telemetry.** There is no analytics, no tracking, no crash reporting, no pings home — ever. The code is open source; you can verify this yourself.
- Your conversations go directly from your browser to your chosen API endpoint — nothing passes through any third-party server
- Page content is extracted locally and only sent to your API when you have context enabled
- All settings (endpoint, API key, chat history) are stored in your browser's local storage only — they never leave your machine
- This is open source software made to make your browsing a little easier, nothing more

---

## Contributing

PRs welcome. Main areas that could use work:

- AMO-compatible packaging (persistent background, proper permissions audit)
- Context window management for very long pages
- i18n / localization
- Mobile sidebar support

---

## License

MIT — see [LICENSE](LICENSE)
