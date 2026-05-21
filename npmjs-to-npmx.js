// ==UserScript==
// @name         npmjs Package Redirect to npmx.dev
// @namespace    https://www.npmjs.com/
// @version      1.0
// @description  Redirects npmjs package pages to npmx.dev with the same path
// @match        https://www.npmjs.com/package/*
// @match        https://npmjs.com/package/*
// @match        https://www.npmjs.org/package/*
// @match        https://npmjs.org/package/*
// @run-at       document-start
// @grant        none
// @author       Alec Larson
// ==/UserScript==

(function () {
  "use strict";

  if (!isPackageOverviewPath(window.location.pathname)) {
    console.debug("[npmjs-to-npmx] Skipping redirect because path is not a package overview", {
      pathname: window.location.pathname,
    });
    return;
  }

  if (isFromNpmx()) {
    console.debug("[npmjs-to-npmx] Skipping redirect because referrer is npmx.dev", {
      referrer: document.referrer,
    });
    return;
  }

  const activeTab = new URL(window.location.href).searchParams.get("activeTab");
  if (activeTab && activeTab !== "readme") {
    console.debug("[npmjs-to-npmx] Skipping redirect because activeTab is not readme", {
      activeTab,
      href: window.location.href,
    });
    return;
  }

  const target = new URL(window.location.href);
  target.hostname = "npmx.dev";
  target.protocol = "https:";

  window.location.replace(target.href);

  function isFromNpmx() {
    try {
      return new URL(document.referrer).hostname === "npmx.dev";
    } catch {
      return false;
    }
  }

  function isPackageOverviewPath(pathname) {
    const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    return parts[0] === "package" && (parts.length === 2 || (parts.length === 3 && parts[1].startsWith("@")));
  }
})();

/*
Changelog:
- 1.0: Reset script version and instantiated changelog.
*/
