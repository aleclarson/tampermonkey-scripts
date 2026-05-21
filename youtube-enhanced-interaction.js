// ==UserScript==
// @name         YouTube Enhanced Interaction
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Enhanced click handling for YouTube recommendations with diagnostics
// @author       Alec Larson
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const LOG_PREFIX = "[YTEI]";

  function logFix(message, context = {}) {
    console.error(`${LOG_PREFIX} FIX NEEDED: ${message}`, context);
  }

  function logInfo(message, context = {}) {
    console.log(`${LOG_PREFIX} ${message}`, context);
  }

  function describeElement(el) {
    if (!el) return null;
    return {
      tagName: el.tagName,
      id: el.id || null,
      className: typeof el.className === "string" ? el.className : null,
      ariaLabel: el.getAttribute?.("aria-label") ?? null,
      href: el.getAttribute?.("href") ?? null,
      textPreview: (el.textContent || "").trim().slice(0, 200),
      outerHTMLPreview: el.outerHTML?.slice(0, 500) ?? null,
    };
  }

  function describeRichItem(richItem) {
    if (!richItem) return null;
    return {
      tagName: richItem.tagName,
      id: richItem.id || null,
      className:
        typeof richItem.className === "string" ? richItem.className : null,
      textPreview: (richItem.textContent || "").trim().slice(0, 300),
      outerHTMLPreview: richItem.outerHTML?.slice(0, 1000) ?? null,
    };
  }

  document.addEventListener(
    "click",
    async (event) => {
      try {
        // Skip if ctrl or meta (command) key is pressed
        if (event.ctrlKey || event.metaKey) {
          return;
        }

        // Only proceed if alt key is pressed
        if (!event.altKey) {
          return;
        }

        logInfo("Alt-click intercepted", {
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          target: describeElement(event.target),
        });

        // Check if click target is within or is a supported renderer
        let richItem = event.target.closest(
          "ytd-rich-item-renderer, ytd-compact-video-renderer",
        );

        if (!richItem) {
          const enclosingLink = event.target.closest('a[href^="/watch?"]');

          if (!enclosingLink) {
            logFix(
              "Could not find a video renderer or enclosing /watch link from the clicked element. Fix the selector used to locate the clicked video card from event.target.",
              {
                clickedTarget: describeElement(event.target),
                targetAncestorsHint: event
                  .composedPath?.()
                  .slice(0, 8)
                  .map(describeElement),
              },
            );
            alert(
              "Could not find clicked video card. Paste the console error into ChatGPT.",
            );
            return;
          }

          let parsedLink;
          try {
            parsedLink = new URL(enclosingLink.href, location.origin);
          } catch (err) {
            logFix(
              "Failed to parse enclosing video link URL. Fix URL parsing for the clicked YouTube video link.",
              {
                enclosingLink: describeElement(enclosingLink),
                href: enclosingLink.getAttribute("href"),
                resolvedHref: enclosingLink.href,
                error: String(err),
              },
            );
            alert(
              "Failed to parse clicked video link. Paste the console error into ChatGPT.",
            );
            return;
          }

          const candidateSelector = `a[href^="/watch${parsedLink.search}"]`;
          const candidateLinks = document.querySelectorAll(candidateSelector);

          logInfo("Trying fallback lookup by matching /watch link", {
            parsedSearch: parsedLink.search,
            candidateSelector,
            candidateCount: candidateLinks.length,
          });

          for (const link of candidateLinks) {
            richItem = link.closest(
              "ytd-rich-item-renderer, ytd-compact-video-renderer",
            );
            if (richItem) {
              break;
            }
          }

          if (!richItem) {
            logFix(
              "Found the clicked /watch link but could not map it back to a supported renderer. Fix the fallback selector or add support for the current YouTube card container type.",
              {
                clickedTarget: describeElement(event.target),
                enclosingLink: describeElement(enclosingLink),
                parsedSearch: parsedLink.search,
                candidateSelector,
                candidateCount: candidateLinks.length,
                firstCandidates: Array.from(candidateLinks)
                  .slice(0, 5)
                  .map(describeElement),
              },
            );
            alert(
              "Could not map clicked link to a YouTube card. Paste the console error into ChatGPT.",
            );
            return;
          }
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        logInfo("Resolved target video card", {
          richItem: describeRichItem(richItem),
        });

        // Find and click the menu button
        const menuButton = richItem.querySelector(
          'button[aria-label="Action menu"], button[aria-label="More actions"]',
        );

        if (!menuButton) {
          logFix(
            "Could not find the video action menu button inside the resolved card. Fix the menu button selector for the current YouTube layout or aria-label.",
            {
              richItem: describeRichItem(richItem),
              availableButtons: Array.from(richItem.querySelectorAll("button"))
                .slice(0, 10)
                .map(describeElement),
            },
          );
          alert(
            "Could not find menu button. Paste the console error into ChatGPT.",
          );
          return;
        }

        logInfo("Clicking menu button", {
          menuButton: describeElement(menuButton),
        });

        menuButton.click();

        // Wait for popup to appear
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Find popup container
        const popupContainer = document.querySelector("ytd-popup-container");
        if (!popupContainer) {
          logFix(
            "Menu button was clicked but no ytd-popup-container appeared. Fix popup detection or increase wait time after opening the menu.",
            {
              richItem: describeRichItem(richItem),
              menuButton: describeElement(menuButton),
              bodyChildrenPreview: Array.from(document.body.children)
                .slice(0, 20)
                .map((el) => ({
                  tagName: el.tagName,
                  id: el.id || null,
                  className:
                    typeof el.className === "string" ? el.className : null,
                })),
            },
          );
          alert(
            "No popup container found. Paste the console error into ChatGPT.",
          );
          return;
        }

        const menuPopup = popupContainer.querySelector(
          "ytd-menu-popup-renderer, yt-contextual-sheet-layout",
        );
        if (!menuPopup) {
          logFix(
            "Popup container exists but the actual menu popup selector did not match. Fix the popup selector for the current YouTube menu component.",
            {
              popupContainerHTMLPreview:
                popupContainer.outerHTML?.slice(0, 2000) ?? null,
              popupChildren: Array.from(popupContainer.children).map(
                describeElement,
              ),
            },
          );
          alert("No menu popup found. Paste the console error into ChatGPT.");
          return;
        }

        // Get all list items
        const menuItems = popupContainer.querySelectorAll(
          "yt-list-item-view-model, ytd-menu-service-item-renderer",
        );

        if (!menuItems.length) {
          logFix(
            "Menu popup opened but no actionable menu items matched the current selector. Fix the selector for YouTube menu items.",
            {
              menuPopup: describeElement(menuPopup),
              menuPopupHTMLPreview: menuPopup.outerHTML?.slice(0, 3000) ?? null,
            },
          );
          alert("No menu items found. Paste the console error into ChatGPT.");
          return;
        }

        // Determine which text to look for based on key combination
        const targetText = event.shiftKey
          ? "Don't recommend channel"
          : "Not interested";

        logInfo("Looking for menu item", {
          targetText,
          menuItemCount: menuItems.length,
          menuItems: Array.from(menuItems).map((item) => ({
            tagName: item.tagName,
            text: (item.textContent || "")
              .trim()
              .replace(/\s+/g, " ")
              .slice(0, 200),
            ariaLabel: item.getAttribute?.("aria-label") ?? null,
            outerHTMLPreview: item.outerHTML?.slice(0, 500) ?? null,
          })),
        });

        // Find and click the matching item
        let matchedItem = null;
        for (const item of menuItems) {
          if ((item.textContent || "").includes(targetText)) {
            matchedItem = item;
            break;
          }
        }

        if (!matchedItem) {
          logFix(
            `Menu opened, but the expected action text "${targetText}" was not found. Fix the action label matching for the current YouTube language or menu wording.`,
            {
              expectedText: targetText,
              actualMenuTexts: Array.from(menuItems).map((item) =>
                (item.textContent || "")
                  .trim()
                  .replace(/\s+/g, " ")
                  .slice(0, 300),
              ),
              documentLang: document.documentElement.lang,
              htmlLang: document.querySelector("html")?.lang ?? null,
            },
          );
          alert(
            `Menu action "${targetText}" not found. Paste the console error into ChatGPT.`,
          );
          return;
        }

        logInfo("Clicking matched menu item", {
          targetText,
          matchedItem: describeElement(matchedItem),
        });

        matchedItem.click();
      } catch (err) {
        logFix(
          "Unexpected runtime error occurred in the alt-click handler. Fix the exception shown in the error field.",
          {
            error: String(err),
            stack: err?.stack ?? null,
            location: location.href,
            documentReadyState: document.readyState,
          },
        );
        alert("Unexpected script error. Paste the console error into ChatGPT.");
      }
    },
    true,
  );
})();

/*
Changelog:
- 1.0: Reset script version and instantiated changelog.
*/
