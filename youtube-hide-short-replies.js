// ==UserScript==
// @name         Hide Short YouTube Comments
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Hides short YouTube comments (< 80 words) with no replies.
// @match        *://*.youtube.com/*
// @grant        none
// @author       Alec Larson
// ==/UserScript==

(function () {
  "use strict";

  let totalCommentCount = -1;
  let commentCountFound = false;
  let queuedComments = [];
  let hiddenComments = [];
  let isRevealedForVideo = false;
  let currentVideoId = "";

  let commentsToHide = [];
  let isHiding = false;

  function processHidingQueue() {
    if (commentsToHide.length === 0) {
      isHiding = false;
      return;
    }
    isHiding = true;
    const commentThread = commentsToHide.shift();

    // Check if it should still be hidden (user didn't click reveal in the meantime)
    if (!isRevealedForVideo) {
      commentThread.style.display = "none";
      hiddenComments.push(commentThread);
      updateHiddenCountButton();
    }

    // Rate limit to 1 comment hidden every 150ms to prevent triggering
    // excessive automatic refetches from YouTube's infinite scroll
    setTimeout(processHidingQueue, 150);
  }

  function updateHiddenCountButton() {
    const countHeader = document.querySelector(
      "ytd-comments-header-renderer #count",
    );
    if (!countHeader) return;

    let btn = document.getElementById("tm-reveal-hidden-comments-btn");
    if (!btn) {
      btn = document.createElement("span");
      btn.id = "tm-reveal-hidden-comments-btn";
      btn.style.cssText =
        "margin-left: -10px; margin-right: 20px; font-size: 1.2rem; color: #aaa; cursor: pointer; user-select: none; font-weight: 500;";
      btn.onclick = () => {
        isRevealedForVideo = true;
        hiddenComments.forEach((c) => {
          c.style.display = "";
        });
        hiddenComments = [];
        btn.style.display = "none";
      };
      countHeader.parentElement.insertBefore(btn, countHeader.nextSibling);
    }

    if (hiddenComments.length > 0 && !isRevealedForVideo) {
      btn.textContent = `[${hiddenComments.length} hidden]`;
      btn.style.display = "inline-block";
    } else {
      btn.style.display = "none";
    }
  }

  function resetStateOnNav() {
    const urlParams = new URLSearchParams(window.location.search);
    const newVideoId = urlParams.get("v");
    if (newVideoId && newVideoId !== currentVideoId) {
      currentVideoId = newVideoId;
      totalCommentCount = -1;
      commentCountFound = false;
      queuedComments = [];
      hiddenComments = [];
      commentsToHide = [];
      isRevealedForVideo = false;

      const btn = document.getElementById("tm-reveal-hidden-comments-btn");
      if (btn) btn.style.display = "none";
    }
  }

  function processQueuedComments() {
    while (queuedComments.length > 0) {
      const commentThread = queuedComments.shift();
      checkComment(commentThread);
    }
  }

  function getRequiredReplies() {
    if (!commentCountFound) return 1; // Default requirement until count is loaded
    return totalCommentCount > 1000 ? 10 : 1;
  }

  function checkComment(commentThread) {
    // Skip if we've already processed this and hid it
    if (commentThread.dataset.processedByScript === "true") return;

    // Ensure it's not a reply itself
    if (commentThread.closest("yt-sub-thread")) return;

    if (isRevealedForVideo) {
      commentThread.dataset.processedByScript = "true";
      return;
    }

    if (!commentCountFound) {
      if (!queuedComments.includes(commentThread)) {
        queuedComments.push(commentThread);
      }
      return;
    }

    // Get the main comment content
    const contentTextNode = commentThread.querySelector(
      "#comment #content-text",
    );
    if (!contentTextNode) return;

    // Handle text and emoji elements
    let wordsCount = 0;
    const text = contentTextNode.textContent.trim();
    if (text) {
      wordsCount += text.split(/\s+/).length;
    }

    // Add custom emojis which render as images to the length
    const emojis = contentTextNode.querySelectorAll("img.ytCoreImageHost");
    wordsCount += emojis.length;

    // If there's truly no text and no emojis, it might not be fully loaded or empty
    if (wordsCount === 0) return;

    // Check if there are any replies
    const repliesContainer = commentThread.querySelector("#replies");
    let replyCount = 0;

    if (repliesContainer) {
      const repliesRenderer = repliesContainer.querySelector(
        "ytd-comment-replies-renderer",
      );
      if (repliesRenderer) {
        // If it has the replies renderer, check if there's an actual button to load replies
        // or if there are already rendered sub-comments.
        const moreRepliesButton =
          repliesRenderer.querySelector("#more-replies");
        const subComments = repliesRenderer.querySelectorAll(
          "ytd-comment-view-model",
        );

        if (moreRepliesButton) {
          const buttonText = moreRepliesButton.textContent.trim();
          const match = buttonText.match(/(\d+)\s+repl(y|ies)/i);
          if (match) {
            replyCount += parseInt(match[1], 10);
          } else {
            // fallback if we can't parse the exact number
            replyCount += 1;
          }
        }
        replyCount += subComments.length;
      }
    }

    const requiredReplies = getRequiredReplies();

    if (wordsCount < 80 && replyCount < requiredReplies) {
      commentsToHide.push(commentThread);
      if (!isHiding) {
        processHidingQueue();
      }
    }

    commentThread.dataset.processedByScript = "true";
  }

  // Set up MutationObserver to detect newly loaded comments
  const observer = new MutationObserver((mutations) => {
    resetStateOnNav();

    // Try to find the total comment count if we haven't yet
    if (!commentCountFound) {
      const countHeader = document.querySelector(
        "ytd-comments-header-renderer #count yt-formatted-string span:first-child",
      );
      if (countHeader && countHeader.textContent) {
        const countText = countHeader.textContent.replace(/[^\d]/g, "");
        if (countText) {
          totalCommentCount = parseInt(countText, 10);
          commentCountFound = true;
          processQueuedComments();
        }
      }
    }

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the added node itself is a comment thread
          if (
            node.tagName &&
            node.tagName.toLowerCase() === "ytd-comment-thread-renderer"
          ) {
            // Use setTimeout or requestAnimationFrame to ensure the DOM inside the comment is fully populated
            setTimeout(() => checkComment(node), 100);
          }
          // Check for comment threads inside the added node
          else if (node.querySelectorAll) {
            const commentThreads = node.querySelectorAll(
              "ytd-comment-thread-renderer",
            );
            commentThreads.forEach((thread) => {
              setTimeout(() => checkComment(thread), 100);
            });
          }
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();

/*
Changelog:
- 1.0: Reset script version and instantiated changelog.
*/
