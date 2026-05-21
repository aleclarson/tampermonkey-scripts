// ==UserScript==
// @name         X Auto Follow Frequent Home Likes
// @namespace    https://x.com/
// @version      1.0
// @description  Automatically follows users after liking three of their posts from the X home feed within 30 days
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-idle
// @grant        none
// @author       Alec Larson
// ==/UserScript==

(function () {
  "use strict";

  const STORAGE_KEY = "x-auto-follow-frequent-likes:v1";
  const LIKE_SELECTOR = '[data-testid="like"]';
  const TWEET_SELECTOR = 'article[role="article"], [data-testid="tweet"]';
  const USER_NAME_SELECTOR = '[data-testid="User-Name"]';
  const MORE_SELECTOR = '[aria-label="More"]';
  const DROPDOWN_SELECTOR = '[data-testid="Dropdown"]';
  const MENUITEM_SELECTOR = '[role="menuitem"]';
  const LIKE_THRESHOLD = 3;
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const FOLLOW_MENU_TIMEOUT_MS = 3000;
  const POLL_MS = 50;

  const pendingTweets = new WeakSet();

  document.addEventListener("click", handleClick, true);

  async function handleClick(event) {
    if (!isHomeFeed()) return;

    const likeButton = event.target.closest?.(LIKE_SELECTOR);
    if (!likeButton) return;

    const tweet = likeButton.closest(TWEET_SELECTOR);
    if (!tweet || pendingTweets.has(tweet)) return;

    const username = getUsername(tweet);
    if (!username) return;

    pendingTweets.add(tweet);

    const likeCount = recordLike(username);
    if (likeCount === LIKE_THRESHOLD) {
      await followFromTweet(tweet);
    }
  }

  function recordLike(username) {
    const now = Date.now();
    const cutoff = now - THIRTY_DAYS_MS;
    const likesByUser = readLikesByUser();
    const likes = (likesByUser[username] || []).filter((timestamp) => timestamp >= cutoff);

    likes.push(now);
    likesByUser[username] = likes;
    pruneOldLikes(likesByUser, cutoff);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(likesByUser));

    return likes.length;
  }

  function readLikesByUser() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function pruneOldLikes(likesByUser, cutoff) {
    for (const [username, timestamps] of Object.entries(likesByUser)) {
      if (!Array.isArray(timestamps)) {
        delete likesByUser[username];
        continue;
      }

      const recent = timestamps.filter((timestamp) => Number.isFinite(timestamp) && timestamp >= cutoff);
      if (recent.length > 0) {
        likesByUser[username] = recent;
      } else {
        delete likesByUser[username];
      }
    }
  }

  async function followFromTweet(tweet) {
    const moreButton = tweet.querySelector(MORE_SELECTOR);
    if (!moreButton) return;

    moreButton.click();

    const dropdown = await waitForSelector(DROPDOWN_SELECTOR, FOLLOW_MENU_TIMEOUT_MS);
    if (!dropdown) return;

    const followItem = Array.from(dropdown.querySelectorAll(MENUITEM_SELECTOR)).find((item) =>
      item.textContent.trim().startsWith("Follow "),
    );

    if (followItem) followItem.click();
  }

  function getUsername(tweet) {
    const userNameArea = tweet.querySelector(USER_NAME_SELECTOR);
    const links = userNameArea ? userNameArea.querySelectorAll('a[href^="/"]') : tweet.querySelectorAll('a[href^="/"]');

    for (const link of links) {
      const username = usernameFromPath(link.getAttribute("href"));
      if (username) return username;
    }

    return null;
  }

  function usernameFromPath(path) {
    const match = path?.match(/^\/([^/?#]+)(?:[/?#]|$)/);
    if (!match) return null;

    const username = match[1];
    if (["home", "explore", "i", "notifications", "messages", "search"].includes(username)) return null;
    return username.toLowerCase();
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
      }, POLL_MS);
    });
  }

  function isHomeFeed() {
    return location.pathname === "/home";
  }
})();

/*
Changelog:

1.0
- Added 30-day per-user home-feed like tracking and automatic follow on the third like.
*/
