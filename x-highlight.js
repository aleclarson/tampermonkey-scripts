// ==UserScript==
// @name         X Low Comment Ratio Highlighter
// @namespace    https://x.com/
// @version      1.0
// @description  Adds a green border to posts whose comment-to-view ratio is low
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-idle
// @grant        none
// @author       Alec Larson
// ==/UserScript==

(function () {
  "use strict";

  const LOW_RATIO_THRESHOLD = 0.002; // 0.2%
  const MIN_VIEWS = 500;
  const BORDER_CLASS = "low-comment-ratio-border";
  const CHECK_COOLDOWN_MS = 2000;

  const style = document.createElement("style");
  style.textContent = `
    .${BORDER_CLASS} {
      box-shadow: 0 0 0 3px #16a34a !important;
      border-radius: 16px !important;
    }
  `;
  document.head.appendChild(style);

  const lastChecked = new WeakMap();
  const issueLog = new WeakMap();
  let scanQueued = false;

  const observer = new MutationObserver(queueScan);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("scroll", queueScan, { passive: true });

  queueScan();

  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(() => {
      scanQueued = false;
      scanArticles();
    });
  }

  function scanArticles() {
    const now = Date.now();
    const articles = document.querySelectorAll('article[role="article"]');
    articles.forEach((article) => {
      const last = lastChecked.get(article) || 0;
      if (now - last < CHECK_COOLDOWN_MS) return;
      lastChecked.set(article, now);
      evaluateArticle(article);
    });
  }

  function evaluateArticle(article) {
    const commentCount = readMetric(article, "reply");
    if (commentCount == null) {
      logIssue(article, "missing_comment_count");
      return;
    }

    const viewCount = readViews(article);
    if (viewCount == null) {
      logIssue(article, "missing_view_count");
      return;
    }

    if (commentCount == null || viewCount == null) return;
    if (viewCount < MIN_VIEWS) return;

    const ratio = commentCount / viewCount;
    if (ratio < LOW_RATIO_THRESHOLD) {
      article.classList.add(BORDER_CLASS);
    }
  }

  function readMetric(article, testId) {
    const el =
      article.querySelector(`div[data-testid="${testId}"]`) ||
      article.querySelector(`button[data-testid="${testId}"]`);
    if (!el) {
      logIssue(article, `metric_missing_${testId}`);
      return null;
    }

    const ariaSource = el.getAttribute("aria-label")
      ? el
      : el.querySelector("[aria-label]");
    const text = ariaSource?.getAttribute("aria-label") || el.textContent || "";
    const numberMatch = text.match(/[0-9][0-9.,]*\s*[kKmMbB]?/);
    if (!numberMatch) {
      logIssue(article, `metric_unparsed_${testId}`, { text });
      return null;
    }
    const parsed = parseCount(numberMatch[0]);
    if (parsed == null) {
      logIssue(article, `metric_parse_failed_${testId}`, { raw: numberMatch[0] });
      return null;
    }
    return parsed;
  }

  function readViews(article) {
    const analyticsLink = Array.from(
      article.querySelectorAll('a[href*="/status/"][href$="/analytics"]')
    ).find((el) => /views/i.test(el.textContent));
    if (analyticsLink) {
      const num = extractFirstNumber(analyticsLink.textContent);
      if (num != null) return num;
      logIssue(article, "view_unparsed_analytics", {
        text: analyticsLink.textContent?.trim(),
      });
    }

    const ariaView = article.querySelector('[aria-label*="Views"], [aria-label*="views"]');
    if (ariaView) {
      const num = extractFirstNumber(
        ariaView.getAttribute("aria-label") || ariaView.textContent || ""
      );
      if (num != null) return num;
      logIssue(article, "view_unparsed_aria", {
        text: ariaView.getAttribute("aria-label") || ariaView.textContent || "",
      });
    }

    const spanView = Array.from(article.querySelectorAll("span")).find((span) =>
      /views/i.test(span.textContent)
    );
    if (spanView) {
      const num = extractFirstNumber(spanView.parentElement?.textContent || spanView.textContent);
      if (num != null) return num;
      logIssue(article, "view_unparsed_span", {
        text: spanView.parentElement?.textContent || spanView.textContent || "",
      });
    }

    logIssue(article, "view_missing");
    return null;
  }

  function extractFirstNumber(text) {
    if (!text) return null;
    const match = text.match(/[0-9][0-9.,]*\s*[kKmMbB]?/);
    if (!match) return null;
    return parseCount(match[0]);
  }

  function parseCount(raw) {
    const cleaned = raw.replace(/,/g, "").trim();
    let multiplier = 1;
    if (/k$/i.test(cleaned)) multiplier = 1_000;
    else if (/m$/i.test(cleaned)) multiplier = 1_000_000;
    else if (/b$/i.test(cleaned)) multiplier = 1_000_000_000;
    const numeric = parseFloat(cleaned.replace(/[kKmMbB]/, ""));
    if (Number.isNaN(numeric)) return null;
    return Math.round(numeric * multiplier);
  }

  function logIssue(article, reason, context = {}) {
    let seen = issueLog.get(article);
    if (!seen) {
      seen = new Set();
      issueLog.set(article, seen);
    }
    if (seen.has(reason)) return;
    seen.add(reason);
    console.debug("[low-comment-ratio]", reason, context);
  }
})();

/*
Changelog:
- 1.0: Reset script version and instantiated changelog.
*/
