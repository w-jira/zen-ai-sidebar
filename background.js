"use strict";

// background.js - message router between injected page scripts and the sidebar panel

function getOriginPattern(url) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.origin + "/*";
  } catch (_) {
    return null;
  }
}

async function hasOriginAccess(origin) {
  if (!origin) return false;
  try {
    return await browser.permissions.contains({ origins: [origin] });
  } catch (_) {
    return false;
  }
}

async function ensureContentScript(tab) {
  if (!tab || !tab.id) return { ok: false, reason: "missing-tab", origin: null };

  const origin = getOriginPattern(tab.url || "");
  if (!origin) return { ok: false, reason: "unsupported-page", origin: null };
  if (!(await hasOriginAccess(origin))) {
    return { ok: false, reason: "permission-required", origin };
  }

  try {
    await browser.tabs.executeScript(tab.id, { file: "content.js" });
    return { ok: true, origin };
  } catch (_) {
    return { ok: false, reason: "unsupported-page", origin };
  }
}

async function requestActiveTabContent() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab) return;

  const access = await ensureContentScript(tab);
  if (access.ok) {
    browser.tabs.sendMessage(tab.id, { type: "GET_PAGE_CONTENT" }).catch(() => {});
    return;
  }

  if (access.reason === "permission-required" && access.origin) {
    browser.runtime.sendMessage({
      type: "PAGE_ACCESS_REQUIRED",
      origin: access.origin,
      url: tab.url || "",
    }).catch(() => {});
    return;
  }

  browser.runtime.sendMessage({
    type: "PAGE_ACCESS_UNAVAILABLE",
    url: tab.url || "",
  }).catch(() => {});
}

// Toolbar button toggles the sidebar
browser.browserAction.onClicked.addListener(() => {
  browser.sidebarAction.toggle();
});

// Single consolidated message listener
browser.runtime.onMessage.addListener((message) => {
  if (!message || !message.type) return;

  switch (message.type) {
    case "PAGE_CONTENT":
      browser.runtime.sendMessage({
        type: "PAGE_CONTENT_RELAY",
        content: message.content,
        url: message.url,
        title: message.title,
      }).catch(() => {});
      break;

    case "SELECTION":
      browser.runtime.sendMessage({
        type: "SELECTION_RELAY",
        text: message.text,
      }).catch(() => {});
      break;

    case "SIDEBAR_READY":
      requestActiveTabContent().catch(() => {});
      break;
  }
});

// When active tab changes, notify sidebar with URL for per-site model pinning
browser.tabs.onActivated.addListener((activeInfo) => {
  browser.tabs.get(activeInfo.tabId).then((tab) => {
    browser.runtime.sendMessage({ type: "TAB_CHANGED", url: tab.url || "" }).catch(() => {});
  }).catch(() => {});
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    browser.runtime.sendMessage({ type: "TAB_CHANGED", url: tab.url || "" }).catch(() => {});
  }
});
