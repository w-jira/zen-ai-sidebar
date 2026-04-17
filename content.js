"use strict";

// content.js - extracts page text and selection on approved pages
if (!window.__zenAiSidebarInjected) {
  window.__zenAiSidebarInjected = true;

  // Respond to sidebar/background requests for page content
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === "GET_PAGE_CONTENT") {
      const content = extractPageContent();
      browser.runtime.sendMessage({
        type: "PAGE_CONTENT",
        content: content,
        url: window.location.href,
        title: document.title
      });
    }
  });

  // Listen for text selection and send to sidebar
  let selectionTimer;
  document.addEventListener("mouseup", () => {
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(() => {
      const selection = window.getSelection();
      const sel = selection ? selection.toString().trim() : "";
      if (sel.length > 10) {
        browser.runtime.sendMessage({ type: "SELECTION", text: sel });
      }
    }, 300);
  });

  function extractPageContent() {
    if (!document.body) return "";

    // Remove noise: scripts, styles, navs, ads
    const cloned = document.body.cloneNode(true);
    const unwanted = cloned.querySelectorAll(
      "script, style, nav, footer, header, aside, [role='navigation'], [role='banner'], [aria-hidden='true'], .ad, .ads, .advertisement, iframe, svg"
    );
    unwanted.forEach((el) => el.remove());

    // Prefer article/main content blocks
    const article = cloned.querySelector("article, [role='main'], main");
    const source = article || cloned;

    // Use textContent (not innerText) since the clone is not in the DOM
    const text = source.textContent
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+/g, " ")
      .trim();

    // Cap at 6000 chars to keep prompt manageable
    return text.length > 6000 ? text.slice(0, 6000) + "\n\n[content truncated]" : text;
  }
}
