"use strict";

// background.js — message router between content scripts and sidebar panel

// Toolbar button toggles the sidebar
browser.browserAction.onClicked.addListener(() => {
  browser.sidebarAction.toggle();
});

// Single consolidated message listener
browser.runtime.onMessage.addListener((message, sender) => {
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
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs[0]) {
          browser.tabs.sendMessage(tabs[0].id, { type: "GET_PAGE_CONTENT" }).catch(() => {});
        }
      });
      break;
  }
});

// When active tab changes, notify sidebar with URL for per-site model pinning
browser.tabs.onActivated.addListener((activeInfo) => {
  browser.tabs.get(activeInfo.tabId).then(tab => {
    browser.runtime.sendMessage({ type: "TAB_CHANGED", url: tab.url || "" }).catch(() => {});
  }).catch(() => {});
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    browser.runtime.sendMessage({ type: "TAB_CHANGED", url: tab.url || "" }).catch(() => {});
  }
});
