// ==UserScript==
// @name         X: No Lames
// @namespace    http://tampermonkey.net/
// @version      2024-04-19
// @description  Fade out or hide lame X replies
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
  const nameSelector = '[data-testid="User-Name"]'

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

  const hiddenTweets = new Set()

  let mainTweetId = null
  let mainTweetUserName = null
  let currentUserName = null

  // Create a MutationObserver that observes the entire document. For each
  // mutation record, check each added node with both `Element#matches` and
  // `Element#querySelectorAll` for the tweetSelector. For each matched tweet,
  // find the element matching the likesSelector (with querySelector) and hide
  // the tweet if its textContent is an empty string.
  const observer = new MutationObserver((mutations) => {
    const { pathname } = location
    const isStatusPage = pathname.includes('/status/')
    const isSearchPage = pathname.includes('/search')
    const isListPage = pathname.includes('/lists')

    if (isStatusPage) {
      mainTweetId = pathname.match(/\/status\/(\d+)/)[1]
    } else if (isListPage || isSearchPage) {
      mainTweetId = null
      mainTweetUserName = null
    } else return

    function hideTweet(tweet) {
      const tweetId = tweet
        .querySelector('time')
        .closest('a')
        .href.match(/\/status\/(\d+)/)[1]

      const userNameElement = tweet.querySelector(nameSelector)
      const userName = userNameElement.innerHTML.match(/@([^ <]+)/)[1]

      // The main tweet is never hidden.
      if (tweetId === mainTweetId) {
        mainTweetUserName = userName
        return
      }
      if (userName === mainTweetUserName) {
        // Ensure the tweet being replied to isn't hidden.
        const previousCell = tweet.closest(
          '[data-testid="cellInnerDiv"]',
        ).previousSibling
        if (previousCell) {
          const previousTweet = previousCell.querySelector(
            '[data-testid="tweet"]',
          )
          hiddenTweets.delete(previousTweet)
          previousTweet.style.display = ''
        }
        // Tweets from the main tweet's author are never hidden.
        return
      }

      if (currentUserName == null) {
        currentUserName = Array.from(
          document.querySelectorAll(
            'header [data-testid="SideNav_AccountSwitcher_Button"] span',
          ),
        )
          .find((span) => span.textContent.includes('@'))
          ?.textContent.match(/@([^ <]+)/)[1]

        log('Current user is', currentUserName)
      }
      if (userName === currentUserName) {
        // Tweets from the current user are never hidden.
        return
      }

      const likes = tweet.querySelector(likesSelector)
      if (likes == null) return

      const likeCount = parseLikeCount(likes.textContent.trim())

      if (likeCount === 0) {
        hiddenTweets.add(tweet)
        tweet.style.display = 'none'
        log('Hiding tweet with no likes:', { userName, element: tweet })
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
