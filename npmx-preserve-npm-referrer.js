// ==UserScript==
// @name         npmx Preserve npm Referrer
// @namespace    https://npmx.dev/
// @version      1.0
// @description  Allows npm package links from npmx.dev to send a referrer
// @match        https://npmx.dev/*
// @run-at       document-start
// @grant        none
// @author       Alec Larson
// ==/UserScript==

(function () {
  "use strict";

  const NPM_PACKAGE_LINK_SELECTOR =
    'a[href^="https://www.npmjs.com/package/"], a[href^="https://npmjs.com/package/"], a[href^="https://www.npmjs.org/package/"], a[href^="https://npmjs.org/package/"]';

  patchLinks();

  const observer = new MutationObserver(patchLinks);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("pointerdown", patchLinks, true);
  document.addEventListener("keydown", patchLinks, true);

  function patchLinks() {
    document.querySelectorAll(NPM_PACKAGE_LINK_SELECTOR).forEach((link) => {
      const rel = link.getAttribute("rel");
      if (!rel) return;

      const values = rel
        .split(/\s+/)
        .filter((value) => value && value.toLowerCase() !== "noreferrer");

      if (values.length === rel.split(/\s+/).filter(Boolean).length) {
        return;
      }

      if (values.length > 0) {
        link.setAttribute("rel", values.join(" "));
      } else {
        link.removeAttribute("rel");
      }
    });
  }
})();

/*
Changelog:
- 1.0: Reset script version and instantiated changelog.
*/
