// ==UserScript==
// @name         No Unliked Replies
// @namespace    http://tampermonkey.net/
// @version      2024-04-19
// @description  Hide any X replies with no likes
// @author       Alec Larson
// @match        https://twitter.com/*
// ==/UserScript==

;(function () {
  'use strict'

  function log(...args) {
    console.log('[no-unliked-replies]', ...args)
  }

  const tweetSelector = '[data-testid="tweet"]'
  const likesSelector = '[data-testid="like"]'

  // If the text ends with "K", multiple by 1000. If it ends with "M", multiple
  // by 1000000. If empty, return zero.
  function parseLikeCount(text) {
    if (text.endsWith('K')) {
      return parseFloat(text) * 1000
    }
    if (text.endsWith('M')) {
      return parseFloat(text) * 1000000
    }
    if (text === '') {
      return 0
    }
    return parseInt(text)
  }

  function getStyleProperties(target, props) {
    const style = getComputedStyle(target)
    const result = {}
    for (const prop of props) {
      result[prop] = style[prop]
    }
    return result
  }

  function setStyle(tweet, style) {
    const oldStyle = getStyleProperties(tweet, Object.keys(style))
    Object.assign(tweet.style, style)

    tweet.addEventListener('mouseenter', () => {
      Object.assign(tweet.style, oldStyle)
      tweet.addEventListener(
        'mouseleave',
        () => {
          Object.assign(tweet.style, style)
        },
        { once: true },
      )
    })
  }

  // Create a MutationObserver that observes the entire document. For each
  // mutation record, check each added node with both `Element#matches` and
  // `Element#querySelectorAll` for the tweetSelector. For each matched tweet,
  // find the element matching the likesSelector (with querySelector) and hide
  // the tweet if its textContent is an empty string.
  const observer = new MutationObserver((mutations) => {
    const { href } = location
    if (
      !href.includes('/status/') &&
      !href.includes('/search') &&
      !href.includes('/lists')
    ) {
      return
    }
    function hideTweet(tweet) {
      const likes = tweet.querySelector(likesSelector)
      if (likes == null) return

      const likeCount = parseLikeCount(likes.textContent.trim())

      if (likeCount === 0) {
        tweet.style.display = 'none'
        log('Hiding tweet with no likes:', tweet)
      }

      if (likeCount < 5) {
        setStyle(tweet, { opacity: 0.4, maxHeight: '68px' })
      } else if (likeCount < 15) {
        setStyle(tweet, { opacity: 0.7 })
      }
    }
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          if (node.matches(tweetSelector)) {
            hideTweet(node)
          } else node.querySelectorAll(tweetSelector).forEach(hideTweet)
        }
      })
    })
  })

  observer.observe(document, {
    childList: true,
    subtree: true,
  })
})()
