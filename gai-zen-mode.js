// ==UserScript==
// @name         Google AI Studio: Zen Mode
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Expand the chat to fill the screen.
// @author       Alec Larson
// @match        https://aistudio.google.com/app/prompts/*
// @grant        GM_addStyle
// ==/UserScript==

;(function () {
  'use strict'

  const $ = (s) => document.querySelector(s)
  const $$ = (s) => document.querySelectorAll(s)

  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const element = $(selector)
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

  async function install() {
    const contentWrapper = await waitForElement(
      '.multiturn-editor .page-content-wrapper:not(.unsupported-viewport)',
    )

    const zoomIcon = svg`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="white" d="M5.708 19H8.5q.213 0 .356.144T9 19.5t-.144.356T8.5 20H4.808q-.344 0-.576-.232T4 19.192V15.5q0-.213.144-.356q.144-.144.357-.144q.212 0 .356.144T5 15.5v2.792l3.246-3.246q.14-.14.344-.15t.364.15t.16.354t-.16.354zM19 5.708l-3.246 3.246q-.14.14-.344.15t-.364-.15t-.16-.354t.16-.354L18.292 5H15.5q-.213 0-.356-.144T15 4.499t.144-.356T15.5 4h3.692q.344 0 .576.232t.232.576V8.5q0 .213-.144.356Q19.712 9 19.5 9t-.356-.144T19 8.5z"/></svg>
      `

    const clearBtn = await waitForElement('button[mattooltip="Clear"]')
    const zoomBtn = clearBtn.cloneNode(true)
    clearBtn.before(zoomBtn)
    zoomBtn.classList.add('zoom-btn')
    zoomBtn.querySelector('.material-symbols-outlined').replaceWith(zoomIcon)
    zoomBtn.addEventListener('click', () => {
      contentWrapper.dataset.zoomed = true
      contentWrapper.addEventListener('click', function onClick(e) {
        if (e.target === contentWrapper) {
          contentWrapper.removeAttribute('data-zoomed')
          contentWrapper.removeEventListener('click', onClick)
        }
      })
    })

    css`
      .page-content-wrapper[data-zoomed] {
        padding: 0 !important;
        padding-top: 16px !important;
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 100000;
        background: #0c0e11f0;
      }

      .page-content-wrapper[data-zoomed] .zoom-btn {
        display: none;
      }

      .prompt-content {
        pointer-events: none;
      }

      .prompt-content > * {
        pointer-events: auto;
      }
    `

    /**
     * @return {HTMLStyleElement}
     */
    function css(strings, ...values) {
      return GM_addStyle(String.raw(strings, ...values))
    }

    function svg(strings, ...values) {
      const svg = String.raw(strings, ...values)
      const svgImage = document.createElement('img')
      svgImage.src = 'data:image/svg+xml,' + encodeURIComponent(svg)
      return svgImage
    }
  }

  install()
})()
