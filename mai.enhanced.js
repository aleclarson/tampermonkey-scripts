// ==UserScript==
// @name         Meta AI: Enhanced
// @namespace    http://tampermonkey.net/
// @version      2024-04-19
// @description  Improved UX for Meta AI
// @author       You
// @match        https://www.meta.ai/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=meta.ai
// @grant        none
// ==/UserScript==

;(function () {
  'use strict'

  function log(first, ...args) {
    if (typeof first !== 'string') {
      args.unshift(first)
      first = '%O'
    }
    console.log(`[Meta AI Enhanced] ${first}`, ...args)
  }

  function debounce(func, wait) {
    let timeout
    return function (...args) {
      clearTimeout(timeout)
      timeout = setTimeout(() => func.apply(this, args), wait)
    }
  }

  // Use querySelectorAll('*') on the node, add the result to the subtrees array
  // and recursively call collectSubtrees on the parent chain.
  function findSubtree(
    rootNode,
    shouldStop = (subtree, rootNode) => false,
    subtrees = [],
  ) {
    const subtree = Array.from(rootNode.querySelectorAll('*'))
    subtrees.push(subtree)
    if (rootNode.parentNode && !shouldStop(subtree, rootNode)) {
      return findSubtree(rootNode.parentNode, shouldStop, subtrees)
    }
    return { rootNode, subtree }
  }

  const mutationEffects = []
  const mutationObserver = new MutationObserver(
    debounce(() => {
      mutationEffects.forEach((callback) => callback())
    }, 100),
  )

  const seen = new Set()

  mutationEffects.push(() => {
    const spanElements = Array.from(document.querySelectorAll('span'))
    const imageResponseCount = spanElements.filter(detectImageResponse).length
    log('Found %s image responses', imageResponseCount)

    function detectImageResponse(span) {
      if (span.textContent.trim() !== 'Animate') {
        return false
      }

      const { rootNode, subtree } = findSubtree(
        span,
        (subtree) => subtree.length > 100,
      )
      log(
        'Using rootNode %O with subtree of %s nodes',
        rootNode,
        subtree.length,
      )

      const images = subtree.filter((node) => node.tagName === 'IMG')
      log(
        'Found %s images',
        images.length,
        images.map((img) => img.src),
        images[0].alt,
      )

      for (const img of images) {
        if (seen.has(img)) continue
        seen.add(img)

        const onMouseEnter = (e) => {
          log('mouse entered', img)

          const src = img.src
          if (src !== images[0].src) {
            img.src = images[0].src
            images[0].src = src
          } else {
            log('Focusing image...')

            const focusWrapper = document.createElement('div')
            focusWrapper.setAttribute(
              'style',
              'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255, 255, 255, 0.9); display: flex; align-items: center; justify-content: center;',
            )

            const focusedImage = img.cloneNode()
            focusedImage.setAttribute(
              'style',
              'height: 100vh; aspect-ratio: 1/1; width: unset;',
            )

            focusWrapper.append(focusedImage)
            document.body.appendChild(focusWrapper)

            let initialX, initialY

            const onMouseMove = (e) => {
              const delta = Math.sqrt(
                Math.pow(e.clientX - (initialX ??= e.clientX), 2) +
                  Math.pow(e.clientY - (initialY ??= e.clientY), 2),
              )
              console.log('delta', delta)
              if (delta > 30) {
                log('Removing focused image')
                lastEnterTimestamp = Date.now()
                focusWrapper.remove()
                document.removeEventListener('mousemove', onMouseMove)
              }
            }

            document.addEventListener('mousemove', onMouseMove)
          }
        }

        let lastEnterTimestamp = 0
        let mouseEnterDelayId

        img.addEventListener('mouseenter', (e) => {
          const timestamp = Date.now()
          if (timestamp < lastEnterTimestamp + 250) {
            return
          }

          lastEnterTimestamp = timestamp
          mouseEnterDelayId = setTimeout(onMouseEnter.bind(null, e), 250)
        })
        img.addEventListener('mouseleave', () => {
          clearTimeout(mouseEnterDelayId)
        })
      }

      return true
    }
  })

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  })
})()
