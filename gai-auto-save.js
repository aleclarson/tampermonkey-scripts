// ==UserScript==
// @name         Google AI Studio: Auto-Save
// @namespace    http://tampermonkey.net/
// @version      2024-04-09
// @description  Automatically save prompts to Google Drive
// @author       Alec Larson
// @match        https://aistudio.google.com/app/prompts/*
// ==/UserScript==

;(function () {
  'use strict'

  function log(...args) {
    console.log('[auto-save]', ...args)
  }

  const saveBtnSelector = '[aria-label="Save prompt"]'
  const pageTitleSelector = 'h1.page-title'
  const untitled = 'Untitled prompt'

  let intervalId = null
  let lastPageTitle = null

  // Use a mutation observer to wait for the save button to appear. Then set an interval to save the prompt every 10 seconds, unless the page title
  // equals the untitled string.
  const observer = new MutationObserver(function () {
    const saveBtn = document.querySelector(saveBtnSelector)
    if (!saveBtn) {
      log('Save button not found')
      return
    }

    const pageTitle = document
      .querySelector(pageTitleSelector)
      ?.textContent.trim()

    if (!pageTitle) {
      log('Page title not found')
      return
    }

    if (saveBtn && pageTitle !== lastPageTitle) {
      if (intervalId) {
        if (pageTitle === untitled) {
          log('Pausing auto-save...')
        }
        clearInterval(intervalId)
        intervalId = null
      }
      if (pageTitle !== untitled) {
        log('Auto-save enabled')
        intervalId = setInterval(function () {
          log('Saving prompt...')
          saveBtn.click()
        }, 10e3)
      }
      lastPageTitle = pageTitle
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
})()
