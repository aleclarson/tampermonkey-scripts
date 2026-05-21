// ==UserScript==
// @name         X Auto Repost Likes
// @namespace    https://x.com/
// @version      1.1
// @description  Automatically reposts non-reply posts you like
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-idle
// @grant        none
// @author       Alec Larson
// ==/UserScript==

(function () {
  "use strict";

  const LIKE_SELECTOR = '[data-testid="like"]';
  const REPOST_SELECTOR = '[data-testid="retweet"]';
  const REPOST_CONFIRM_SELECTOR = '[data-testid="retweetConfirm"]';
  const TWEET_SELECTOR = 'article[role="article"], [data-testid="tweet"]';
  const LIKE_SETTLE_DELAY_MS = 250;
  const CONFIRM_TIMEOUT_MS = 3000;
  const CONFIRM_POLL_MS = 50;

  const pendingTweets = new WeakSet();

  document.addEventListener("click", handleClick, true);

  function handleClick(event) {
    const likeButton = event.target.closest?.(LIKE_SELECTOR);
    if (!likeButton) return;

    const tweet = likeButton.closest(TWEET_SELECTOR);
    if (!tweet || pendingTweets.has(tweet) || isReplyTweet(tweet)) return;

    pendingTweets.add(tweet);
    setTimeout(() => repostTweet(tweet), LIKE_SETTLE_DELAY_MS);
  }

  async function repostTweet(tweet) {
    const repostButton = tweet.querySelector(REPOST_SELECTOR);
    if (!repostButton) return;

    repostButton.click();

    const confirmButton = await waitForSelector(REPOST_CONFIRM_SELECTOR, CONFIRM_TIMEOUT_MS);
    if (!confirmButton) return;

    confirmButton.click();
  }

  function isReplyTweet(tweet) {
    if (isStatusPage()) return isReplyOnStatusPage(tweet);
    if (isHomeFeed()) return isReplyOnHomeFeed(tweet);
    return false;
  }

  function isReplyOnStatusPage(tweet) {
    return document.querySelector('[data-testid="tweet"]') !== tweet;
  }

  function isReplyOnHomeFeed(tweet) {
    const cell = tweet.closest('[data-testid="cellInnerDiv"]');
    const previousCellContent = cell?.previousElementSibling?.firstElementChild;
    if (!previousCellContent) return false;

    const { borderBottomWidth } = getComputedStyle(previousCellContent);
    return borderBottomWidth === "0px" || borderBottomWidth === "0";
  }

  function isStatusPage() {
    return /^\/[^/]+\/status\//.test(location.pathname);
  }

  function isHomeFeed() {
    return location.pathname === "/home";
  }

  function waitForSelector(selector, timeoutMs) {
    const existing = document.querySelector(selector);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve) => {
      const deadline = Date.now() + timeoutMs;
      const interval = setInterval(() => {
        const element = document.querySelector(selector);
        if (element) {
          clearInterval(interval);
          resolve(element);
          return;
        }

        if (Date.now() >= deadline) {
          clearInterval(interval);
          resolve(null);
        }
      }, CONFIRM_POLL_MS);
    });
  }

})();

/*
Changelog:

1.1
- Repost liked posts from any X page and ignore likes on identifiable replies.

1.0
- Added automatic reposting for posts liked from the /home feed.
*/
