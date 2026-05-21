// ==UserScript==
// @name         X: Hide Home Quote Posts
// @namespace    https://x.com/
// @version      1.0
// @description  Hide quote posts in the X/Twitter home feed
// @author       Alec Larson
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

;(function () {
  'use strict'

  const hiddenClass = 'x-hide-home-quotes-hidden'
  const articleSelector = 'article[role="article"]'
  const quotePostSelector = '[role="link"] [data-testid="tweetText"]'

  const style = document.createElement('style')
  style.textContent = `
    .${hiddenClass} {
      display: none !important;
    }
  `
  document.head.appendChild(style)

  let scanQueued = false

  const observer = new MutationObserver(queueScan)
  observer.observe(document.body, { childList: true, subtree: true })

  window.addEventListener('popstate', queueScan)
  document.addEventListener('scroll', queueScan, { passive: true })

  queueScan()

  function queueScan() {
    if (scanQueued) return
    scanQueued = true
    requestAnimationFrame(() => {
      scanQueued = false
      scanHomeFeed()
    })
  }

  function scanHomeFeed() {
    const isHomeFeed = location.pathname === '/home'

    for (const article of document.querySelectorAll(articleSelector)) {
      if (!isHomeFeed) {
        article.classList.remove(hiddenClass)
        continue
      }

      article.classList.toggle(hiddenClass, isQuotePost(article))
    }
  }

  function isQuotePost(article) {
    return Boolean(article.querySelector(quotePostSelector))
  }
})()

/*
Changelog:
- 1.0: Initial release. Hide X/Twitter home-feed quote posts by detecting linked tweet text inside post articles.
*/
