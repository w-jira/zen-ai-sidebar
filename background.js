// background.js — message router between content scripts and sidebar panel

// Toolbar button toggles the sidebar
browser.browserAction.onClicked.addListener(() => {
  browser.sidebarAction.toggle();
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Relay page content from content script to sidebar
  if (message.type === "PAGE_CONTENT") {
    browser.runtime.sendMessage({ type: "PAGE_CONTENT_RELAY", content: message.content, url: message.url, title: message.title });
  }

  // Relay selected text from content script to sidebar
  if (message.type === "SELECTION") {
    browser.runtime.sendMessage({ type: "SELECTION_RELAY", text: message.text });
  }
});

// When sidebar opens, request page content from active tab's content script
browser.runtime.onMessage.addListener((message) => {
  if (message.type === "SIDEBAR_READY") {
    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs[0]) {
        browser.tabs.sendMessage(tabs[0].id, { type: "GET_PAGE_CONTENT" }).catch(() => {
          // Tab may not have content script (e.g. about: pages) — ignore
        });
      }
    });
  }
});

// When active tab changes, notify sidebar to reset context
browser.tabs.onActivated.addListener(() => {
  browser.runtime.sendMessage({ type: "TAB_CHANGED" }).catch(() => {});
});

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    browser.runtime.sendMessage({ type: "TAB_CHANGED" }).catch(() => {});
  }
});
