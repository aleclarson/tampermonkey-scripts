// ==UserScript==
// @name         Gemini Finished Notification
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Notify when Gemini is done loading a model response
// @author       Claude 3
// @match        https://aistudio.google.com/app/prompts/*
// @grant        GM_notification
// @grant        GM_getTab
// @grant        GM_openInTab
// ==/UserScript==

;(function () {
  'use strict'

  function log(...args) {
    console.log('[gemini-notif]', ...args)
  }

  function waitForElement(selector, timeout = 10000) {
    log('waiting for element with selector', selector)
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const element = document.querySelector(selector)
        if (element) {
          clearInterval(interval)
          resolve(element)
        }
      }, 100)

      setTimeout(() => {
        clearInterval(interval)
        reject(new Error(`Timed out waiting for element: ${selector}`))
      }, timeout)
    })
  }

  async function observeLoadingIndicator() {
    const targetNode = await waitForElement('.prompt-content')
    log('observing mutations in', targetNode)

    let hasLoadingIndicator = false
    let notifyTimeout

    const notifySoon = (content) => {
      log('will notify in 1 second unless interrupted')
      notifyTimeout = setTimeout(() => {
        log('sending notification...')
        GM_notification({
          title: 'Gemini is done',
          text: content
            ? content.textContent.slice(0, 100) + '…'
            : 'Come see what Gemini wrote!',
          silent: false,
          onclick: function () {
            window.focus()
          },
        })

        // Allow another notification to be sent.
        hasLoadingIndicator = false
        notifyTimeout = null
      }, 1000)
    }

    let loggedContentNotFound = false
    let loggedNotifyInterrupted = false

    const observer = new MutationObserver(function (mutations) {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const content =
            mutation.target.querySelector('.model-response-contents') ||
            (mutation.target.matches('.model-response-contents')
              ? mutation.target
              : null)

          if (!content) {
            if (loggedContentNotFound) {
              return
            }
            loggedContentNotFound = true
            log('no content found')
            return
          }

          loggedContentNotFound = false

          if (notifyTimeout) {
            clearTimeout(notifyTimeout)
            notifyTimeout = null

            if (!loggedNotifyInterrupted) {
              loggedNotifyInterrupted = true
              log('notify interrupted')
            }

            notifySoon(content)
            break
          }

          const loadingIndicator = content.querySelector('loading-indicator')

          if (hasLoadingIndicator === !!loadingIndicator) {
            continue
          }

          hasLoadingIndicator = !!loadingIndicator

          if (hasLoadingIndicator) {
            log('loading indicator found')
          } else {
            log('loading indicator removed')
            notifySoon(content)
            break
          }
        }
      }

      loggedNotifyInterrupted = false
    })

    observer.observe(targetNode, { childList: true, subtree: true })
  }

  observeLoadingIndicator()
})()
