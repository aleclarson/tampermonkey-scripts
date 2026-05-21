// ==UserScript==
// @name         X Auto Repost Home Likes
// @namespace    https://x.com/
// @version      1.0
// @description  Automatically reposts posts you like from the X home feed
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
    if (!isHomeFeed()) return;

    const likeButton = event.target.closest?.(LIKE_SELECTOR);
    if (!likeButton) return;

    const tweet = likeButton.closest(TWEET_SELECTOR);
    if (!tweet || pendingTweets.has(tweet)) return;

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

  function isHomeFeed() {
    return location.pathname === "/home";
  }
})();

/*
Changelog:

1.0
- Added automatic reposting for posts liked from the /home feed.
*/
