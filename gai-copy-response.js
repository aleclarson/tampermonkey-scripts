// ==UserScript==
// @name         Google AI Studio: Copy Response
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Double-click to copy a response
// @author       Alec Larson
// @match        https://aistudio.google.com/app/prompts/*
// ==/UserScript==

;(function () {
  'use strict'

  document.addEventListener(
    'dblclick',
    (event) => {
      const contents = event.target.closest('.model-response-contents')
      if (contents) {
        event.preventDefault()
        try {
          copyResponse(contents)
        } catch (e) {
          console.error(e)
        }

        const feedback = document.createElement('div')
        document.body.appendChild(feedback)
        feedback.setAttribute(
          'style',
          'position: fixed; padding: 5px 15px; background-color: #234076; color: rgb(185 210 255); border-radius: 8px; z-index: 100000000; font-size: 14px; font-weight: 500; top: 365px; left: 971px; border: 1px solid #395fa5; box-shadow: 0 1px 5px rgb(52 87 106 / 26%); font-style: italic;',
        )
        feedback.style.top = event.clientY + 'px'
        feedback.style.left = event.clientX + 'px'
        feedback.innerText = 'Response copied!'

        const easeOut = (t) => 1 - Math.pow(1 - t, 3)

        // Interpolate from +10 translateY to 0 over 800ms.
        let startTime = performance.now()
        let endTime = startTime + 800
        let id = requestAnimationFrame(function loop() {
          const t = easeOut(
            (performance.now() - startTime) / (endTime - startTime),
          )
          const translateY = 10 * Math.max(1 - t, 0)
          feedback.style.transform = `translateY(${translateY}px)`
          if (t < 1) id = requestAnimationFrame(loop)
        })

        setTimeout(() => {
          cancelAnimationFrame(id)
          feedback.remove()
        }, 1750)
      }
    },
    { capture: true },
  )

  const langExtensionMap = {
    typescript: 'ts',
    javascript: 'js',
  }

  function matchAncestors(element, selector, matches = []) {
    let node = element.parentElement
    while (node) {
      if (node.matches(selector)) {
        matches.push(node)
      }
      node = node.parentElement
    }
    return matches
  }

  function copyResponse(contents) {
    let response = ''

    const specialNodeTypes = [
      {
        selector: '.syntax-highlighted-code-wrapper',
        handler: (node) => {
          const code = node.querySelector('code')
          const langName =
            node.querySelector('.language')?.innerText.trim().toLowerCase() ??
            ''
          const langExtension = langExtensionMap[langName] ?? langName

          return '```' + langExtension + '\n' + code.innerText + '\n```'
        },
      },
      {
        selector: '.inline-code',
        handler: (node) => {
          return '`' + node.innerText + '`'
        },
        inline: true,
      },
      {
        selector: 'h1, h2, h3, h4, h5, h6',
        handler: (node) => {
          const depth = parseInt(node.tagName[1])
          return (
            (response ? '\n' : '') + '#'.repeat(depth) + ' ' + node.innerText
          )
        },
      },
    ]

    let paragraphNode
    let strongNode

    function checkForClosedNodes(node) {
      if (strongNode && !strongNode.contains(node)) {
        response += '**'
      }

      if (paragraphNode && !paragraphNode.contains(node)) {
        response += '\n'
      }
    }

    const seen = new Set()
    contents.querySelectorAll('*').forEach((node) => {
      checkForClosedNodes(node)

      paragraphNode = node.closest('p, ul')
      if (paragraphNode && !seen.has(paragraphNode)) {
        seen.add(paragraphNode)

        if (!response.endsWith('\n\n')) {
          const listItemParent = paragraphNode.closest('li')
          if (paragraphNode !== listItemParent?.querySelector('p')) {
            response += '\n'
          }
        }
      }

      const listItemNode = node.closest('li')
      if (listItemNode && !seen.has(listItemNode)) {
        seen.add(listItemNode)
        const depth = matchAncestors(node, 'li').length
        if (!response.endsWith('\n\n')) {
          response += '\n'
        }
        response += '  '.repeat(depth) + '- '
      }

      strongNode = node.closest('strong')
      if (strongNode && !seen.has(strongNode)) {
        seen.add(strongNode)
        response += '**'
      }

      const specialType = specialNodeTypes.find((type) => {
        const specialNode = node.closest(type.selector)
        if (specialNode && !seen.has(specialNode)) {
          seen.add(specialNode)
          response += type.handler(specialNode)
          if (!type.inline) {
            response += '\n'
          }
        }
        return !!specialNode
      })

      if (specialType) {
        return
      }

      const childNodes = Array.from(node.childNodes)
      if (
        childNodes.every(
          (child) =>
            child.nodeType === Node.TEXT_NODE ||
            child.nodeType === Node.COMMENT_NODE,
        )
      ) {
        response += node.textContent
      }
    })

    checkForClosedNodes(null)

    navigator.clipboard.writeText(response)
  }
})()
