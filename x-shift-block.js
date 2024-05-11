// ==UserScript==
// @name         X.com ~ Shift+Click to Block
// @namespace    http://tampermonkey.net/
// @version      2024-04-10
// @description  Block the tweet under the cursor using the Shift key and click.
// @author       Alec Larson
// @match        https://twitter.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=twitter.com
// @grant        none
// ==/UserScript==

;(function () {
  'use strict'

  function log(...args) {
    console.log('[shift-block]', ...args)
  }

  /** @type {HTMLDivElement} */
  let tweet

  document.addEventListener(
    'mouseover',
    (e) => {
      const current = tweet
      tweet = e.target.closest('[data-testid="tweet"]')
      if (current !== tweet) {
        if (tweet) {
          log('mouseover tweet by', tweet.querySelectorAll('a')[2]?.textContent)
        } else {
          log('mouseout tweet')
        }
      }
    },
    { capture: true },
  )

  document.addEventListener(
    'mouseout',
    (e) => {
      if (tweet && !e.target.closest('[data-testid="tweet"]')) {
        log('mouseout tweet')
        tweet = null
      }
    },
    { capture: true },
  )

  // Capture click events on the document. Check if the hyper key was used (all modifiers are active). If so, trigger a click on the "More" button within the current tweet.
  document.addEventListener(
    'click',
    (e) => {
      if (!tweet) return
      if (
        e.button === 0 &&
        e.shiftKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        e.preventDefault()
        e.stopPropagation()

        const moreBtn = tweet.querySelector(
          '[aria-haspopup="menu"][aria-label="More"]',
        )

        log('shift+click detected')
        moreBtn.click()

        // Clear the text selection caused by shift-clicking.
        window.getSelection().removeAllRanges()

        setTimeout(() => {
          const muteBtn = Array.from(
            document.querySelectorAll('[role="menu"] [role="menuitem"]'),
          ).find((e) => e.textContent.includes('Block'))

          if (muteBtn) {
            muteBtn.click()
            setTimeout(() => {
              const confirmBtn = document.querySelector(
                '[data-testid="confirmationSheetConfirm"]',
              )
              if (confirmBtn) {
                confirmBtn.click()
                log('blocked %s', tweet.querySelectorAll('a')[2]?.textContent)
              } else {
                log('confirm button not found')
              }
            }, 50)
          } else {
            log('block button not found')
          }
        }, 50)
      }
    },
    { capture: true },
  )
})()
