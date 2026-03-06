import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

const CLONE_PATH = join(process.cwd(), "public", "clones", "landing-template", "index.html");

/**
 * Minimal client-side patcher for things Framer's JS runtime re-renders
 * dynamically after hydration. The source HTML is already fully patched
 * (colors, text, branding) — this only handles runtime-generated DOM.
 */
const TEXT_REPLACEMENTS = [
  ["Jackie Zhang", "gi", "Libraryyy"],
  ["\\bJackie\\b", "gi", "Libraryyy"],
  ["product designer", "gi", "student platform"],
  ["Product Designer", "gi", "Student Platform"],
  ["prodctuon\\s+desinger", "gi", "Student Platform"],
  ["Cape Town", "gi", "Your Campus"],
  ["South Africa", "gi", "Every University"],
  ["About me", "gi", "About Libraryyy"],
  ["What I look for", "gi", "What We Build"],
  ["Impactful work", "gi", "Verified Content"],
  ["Meaningful work", "gi", "Student Learning"],
  ["Diversed team of talented folks", "gi", "Community Contributors"],
  ["let's chat!", "gi", "Start Learning"],
  ["Software should empower\\.", "gi", "Study For All."],
  ["Software should", "gi", "Learning Should"],
  ["tirelessly pursue clarity\\.", "gi", "Keep Course Content Clear."],
  ["Design for moments", "gi", "Student Momentum"],
  ["Digital world", "gi", "Study World"],
  ["Restaurant kid", "gi", "Student Community"],
  ["Night owl", "gi", "Anytime Learning"],
  ["Even more fynbos", "gi", "Original Content"],
  ["More fynbos", "gi", "Presentations"],
  ["\\bFynbos\\b", "gi", "Courses"],
  ["Almost heaven,?\\s*West Virginia\\.?\\s*Blue Ridge Mountains\\s*Shenandoah River\\.?\\s*Life is old there\\.?", "gi", ""],
  ["Almost heaven,?\\s*West Virginia", "gi", ""],
  ["Blue Ridge Mountains", "gi", ""],
  ["Shenandoah River", "gi", ""],
  ["Life is old there", "gi", ""],
  ["TAKE ME H+O+ME!?\\s*COUNTRY R+O+A?D!?", "gi", "Start Learning Today"],
  ["Take me h+o+me!?\\s*Country r+o+a?d!?", "gi", "Start Learning Today"],
  ["Older than the trees", "gi", ""],
  ["Younger than the mountains", "gi", ""],
  ["Growin.? like a breeze", "gi", ""],
  ["Country Roads,?", "gi", ""],
] as const;

const REMOVED_IMAGE_TOKENS = ["rRKteDbgGPSRnYv0ydZFYq7DfI", "LKbBfnsJYBIcTHb37SByXysxfM"] as const;

const DOM_PATCHER_SCRIPT = `
<script id="libraryyy-dom-patcher">
(() => {
  const replacements = ${JSON.stringify(TEXT_REPLACEMENTS)};
  const removedImageTokens = ${JSON.stringify(REMOVED_IMAGE_TOKENS)};

  function applyTextReplacements(value) {
    let next = value;
    for (const [source, flags, replacement] of replacements) {
      next = next.replace(new RegExp(source, flags), replacement);
    }
    return next;
  }

  function patchTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (parent && parent.closest("script, style, noscript, template")) {
        node = walker.nextNode();
        continue;
      }
      const value = node.nodeValue || "";
      if (value.trim()) {
        const next = applyTextReplacements(value);
        if (next !== value) node.nodeValue = next;
      }
      node = walker.nextNode();
    }
  }

  function patchAttributes() {
    document.querySelectorAll("[title], [aria-label], img[alt]").forEach((el) => {
      ["title", "aria-label", "alt"].forEach((attr) => {
        if (!el.hasAttribute(attr)) return;
        const value = el.getAttribute(attr) || "";
        const next = applyTextReplacements(value);
        if (value !== next) el.setAttribute(attr, next);
      });
    });
  }

  function patchVerticalRoleText() {
    const firstWord = "Student";
    const secondWord = "Platform";
    const isDesktop = window.matchMedia("(min-width: 950px)").matches;

    document.querySelectorAll("[aria-label]").forEach((el) => {
      const label = (el.getAttribute("aria-label") || "").trim().toLowerCase();
      if (label !== "student platform" && label !== "product designer" && label !== "prodctuon desinger") return;
      el.setAttribute("aria-label", "Student Platform");

      Array.from(el.querySelectorAll("[data-framer-name='Product'] .framer-text"))
        .forEach((node, i) => { node.textContent = firstWord[i] ?? ""; });
      Array.from(el.querySelectorAll("[data-framer-name='Designer'] .framer-text"))
        .forEach((node, i) => { node.textContent = secondWord[i] ?? ""; });

      if (isDesktop) {
        const roleColumn = el.querySelector(".framer-f3lfa9");
        if (roleColumn) { roleColumn.style.transform = "translateX(4px)"; roleColumn.style.overflow = "visible"; }
        const productColumn = el.querySelector("[data-framer-name='Product']");
        if (productColumn) { productColumn.style.transform = "translateX(2px)"; productColumn.style.overflow = "visible"; }
        const designerColumn = el.querySelector("[data-framer-name='Designer']");
        if (designerColumn) { designerColumn.style.transform = "translateX(2px)"; designerColumn.style.overflow = "visible"; }
      }
    });
  }

  function patchFontsToCooper() {
    const cooperStack = '"Cooper BT", "SGKara", Georgia, "Times New Roman", serif';

    document.querySelectorAll(".framer-text[style*='Awesome Serif']").forEach((el) => {
      el.setAttribute("data-libraryyy-cooper", "1");
      el.style.fontFamily = cooperStack;
      el.style.fontWeight = "300";
      el.style.letterSpacing = "-0.01em";
      el.style.setProperty("--framer-font-family", cooperStack);
      el.style.setProperty("--framer-font-weight", "300");
      el.style.setProperty("--framer-letter-spacing", "-0.01em");
    });

    document.querySelectorAll("[data-framer-name='Checklist'] [data-framer-name='Header'] .framer-text")
      .forEach((el) => {
        el.setAttribute("data-libraryyy-cooper", "1");
        el.style.fontWeight = "300";
        el.style.letterSpacing = "-0.01em";
      });
  }

  function applyPurpleTitles() {
    const purple = "#5227FF";
    function paintPurple(node) {
      if (!(node instanceof HTMLElement)) return;
      node.style.setProperty("color", purple, "important");
      node.style.setProperty("--framer-text-color", purple, "important");
      const rich = node.closest("[data-framer-component-type='RichTextContainer']");
      if (rich instanceof HTMLElement) {
        rich.style.setProperty("--extracted-r6o4lv", purple, "important");
        rich.style.setProperty("--framer-text-color", purple, "important");
      }
    }

    const topSection = document.querySelector("[data-framer-name='Top section']");
    if (topSection) {
      topSection.querySelectorAll(".framer-text").forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.closest("[data-framer-name='About'], [data-framer-name='Work'], [data-framer-name='Connect']")) return;
        if (node.closest(".framer-W8zRt, [data-framer-name='Product'], [data-framer-name='Designer']")) {
          paintPurple(node);
          return;
        }
        const style = (node.getAttribute("style") || "").toLowerCase();
        if (style.includes("awesome serif") || style.includes("cooper bt")) paintPurple(node);
      });
    }

    document.querySelectorAll("[data-framer-name*='Book'] .framer-text, [data-framer-name*='book'] .framer-text")
      .forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.closest("[data-framer-name='About'], [data-framer-name='Work'], [data-framer-name='Connect']")) return;
        paintPurple(node);
      });

    document.querySelectorAll(".framer-text").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const text = (node.textContent || "").replace(/\\s+/g, " ").trim().toLowerCase();
      if (text.includes("your campus") || text.includes("3 things we strongly believe in")) paintPurple(node);
    });
  }

  function patchTimezone() {
    // Detect timezone info
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const offset = new Date().getTimezoneOffset();
    const absH = Math.floor(Math.abs(offset) / 60);
    const absM = Math.abs(offset) % 60;
    const sign = offset <= 0 ? "+" : "-";
    const gmtStr = "GMT " + sign + absH + (absM ? ":" + String(absM).padStart(2, "0") : ":00");

    // Extract city from timezone (e.g. "Europe/Istanbul" → "Istanbul")
    const city = tz.split("/").pop()?.replace(/_/g, " ") || "Your Campus";

    const display = city + " \\u2022 " + gmtStr;

    // Update all timezone placeholders (from source HTML)
    document.querySelectorAll(".libraryyy-tz").forEach((el) => {
      el.textContent = gmtStr;
      // Also update the parent to include city name
      const parent = el.parentElement;
      if (parent && parent.classList.contains("framer-text")) {
        parent.textContent = display;
      }
    });

    // Also catch Framer runtime re-renders that reset to the old text
    document.querySelectorAll(".framer-text").forEach((el) => {
      const text = (el.textContent || "").trim();
      if (text.includes("Your Campus") && text.includes("GMT")) {
        el.textContent = display;
      }
    });
  }

  function patchNavItems() {
    const map = { "Work": "Lets Start", "Connect": "Plans" };
    Object.entries(map).forEach(([orig, replacement]) => {
      document.querySelectorAll("[data-framer-name='" + orig + "']").forEach((el) => {
        el.querySelectorAll(".framer-text").forEach((t) => {
          if (!(t instanceof HTMLElement)) return;
          const text = (t.textContent || "").trim();
          if (text.toLowerCase() === orig.toLowerCase()) t.textContent = replacement;
        });
      });
    });
  }

  function removeSignatures() {
    document.querySelectorAll("[data-framer-name='signature']").forEach((el) => el.remove());
  }

  function removeProgressLabels() {
    const topSection = document.querySelector("[data-framer-name='Top section']");
    if (!topSection) return;
    topSection.querySelectorAll(".framer-text").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const text = (node.textContent || "").trim();
      if (!/in\\s*progress|progress/i.test(text)) return;
      const target = node.closest("[data-framer-component-type='RichTextContainer']") || node;
      if (target instanceof HTMLElement) {
        target.style.setProperty("display", "none", "important");
      }
    });
  }

  function removeSocialLinks() {
    const selector = [
      "a[href*='x.com']", "a[href*='twitter.com']", "a[href*='linkedin.com']",
      "a[href*='instagram.com']", "a[href*='behance.net']", "a[href*='dribbble.com']",
      "a[href*='github.com']", "a[href*='tiktok.com']", "a[href*='facebook.com']",
      "a[href*='threads.net']",
    ].join(", ");
    document.querySelectorAll(selector).forEach((a) => {
      const removable = a.closest("a, li, [data-framer-component-type='RichTextContainer'], [data-framer-name]");
      if (removable) removable.remove(); else a.remove();
    });
  }

  function removeBrandedImages() {
    document.querySelectorAll("img[src]").forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (!removedImageTokens.some((t) => src.includes(t))) return;
      const removable = img.closest("[data-framer-name='Slice 54'], [data-framer-name='Image'], [data-framer-background-image-wrapper]") || img;
      removable.remove();
    });
  }

  function removeChecklistGimmicks() {
    document.querySelectorAll("[data-framer-name='Checklist']").forEach((cl) => {
      cl.querySelectorAll("[data-framer-name='Call card'], [data-framer-name='Giphy'], .framer-bxtkhp, .framer-lhlfg5, .framer-17rro84, .framer-11hwspj")
        .forEach((n) => n.remove());
    });
  }

  function fixMaskedTopWord() {
    const isDesktop = window.matchMedia("(min-width: 950px)").matches;
    document.querySelectorAll("[data-libraryyy-cooper]").forEach((el) => {
      const text = (el.textContent || "").trim().toLowerCase();
      if (text !== "feel") return;
      el.style.letterSpacing = "0";
      el.style.paddingLeft = isDesktop ? "0.12em" : "0.06em";
      el.style.transform = isDesktop ? "translateX(4px)" : "translateX(1px)";
      const richText = el.closest(".framer-yqo7d6");
      if (richText) richText.style.overflow = "visible";
      const holder = el.closest(".framer-1optont");
      if (holder && isDesktop) { holder.style.width = "74px"; holder.style.overflow = "visible"; }
    });
  }

  function tuneMobileHero() {
    if (!window.matchMedia("(max-width: 809.98px)").matches) return;
    document.querySelectorAll(".framer-W8zRt").forEach((block) => {
      const topLine = block.querySelector(".framer-ybwha .framer-text");
      const feel = block.querySelector(".framer-yqo7d6 .framer-text");
      const natural = block.querySelector(".framer-ezdzs4 .framer-text");
      if (!topLine || !feel || !natural) return;
      if (!(topLine.textContent || "").toLowerCase().includes("learning should")) return;
      topLine.style.fontSize = "34px"; topLine.style.lineHeight = "1.02";
      feel.style.fontSize = "34px"; feel.style.lineHeight = "1.02";
      natural.style.fontSize = "42px"; natural.style.lineHeight = "0.95";
      const feelHolder = block.querySelector(".framer-1optont");
      if (feelHolder) { feelHolder.style.width = "64px"; feelHolder.style.height = "50px"; }
    });
  }

  function labelContentImages() {
    const MIN_SIZE = 50;
    let counter = 0;
    const refMap = [];

    document.querySelectorAll("img[src]").forEach((img) => {
      // Skip tiny icons
      const w = img.naturalWidth || img.width || parseInt(img.getAttribute("width") || "0", 10);
      const h = img.naturalHeight || img.height || parseInt(img.getAttribute("height") || "0", 10);
      if ((w > 0 && w < MIN_SIZE) || (h > 0 && h < MIN_SIZE)) return;

      // Skip SVG data URIs and noise/grain textures
      const src = img.getAttribute("src") || "";
      if (src.startsWith("data:image/svg") || src.includes("rR6HYXBrMmX4cRpXfXUOvpvpB0")) return;

      // Skip images that are already labeled
      if (img.hasAttribute("data-placeholder")) return;

      counter++;
      const n = counter;
      img.setAttribute("data-placeholder", String(n));

      // Wrap in a relative container and overlay a label
      const wrapper = img.parentElement;
      if (!wrapper) return;

      // Make parent position relative if needed
      const pos = getComputedStyle(wrapper).position;
      if (pos === "static") wrapper.style.position = "relative";

      const label = document.createElement("div");
      label.className = "libraryyy-placeholder-label";
      label.textContent = "Placeholder #" + n;
      wrapper.appendChild(label);

      refMap.push({ placeholder: n, src: src, width: w, height: h });
    });

    if (refMap.length > 0) {
      console.group("[Libraryyy] Image Placeholder Reference Map");
      refMap.forEach((r) => {
        console.log("Placeholder #" + r.placeholder + " \\u2192 " + r.src + " (" + r.width + "x" + r.height + ")");
      });
      console.groupEnd();
    }
  }

  function hideMarquees() {
    document.querySelectorAll("[data-framer-name='Loop']").forEach((loop) => {
      const footer = loop.closest("[data-framer-name='Footer']");
      if (footer) return;
      loop.style.setProperty("display", "none", "important");
    });

    document.querySelectorAll(".framer-hpeyv8-container").forEach((container) => {
      const footer = container.closest("[data-framer-name='Footer']");
      if (footer) return;
      const texts = container.querySelectorAll(".framer-text");
      if (texts.length > 4) {
        const parent = container.closest("[data-framer-component-type]") || container.parentElement;
        if (parent) parent.style.setProperty("display", "none", "important");
      }
    });
  }

  function patchFooterLoop() {
    const footer = document.querySelector("[data-framer-name='Footer']");
    if (!footer) return;

    const items = [
      "Courses", "Mock Exams", "Study Guides", "Presentations",
      "Original Content", "Open Source",
    ];

    // Find and replace the broken Framer ticker with a pure CSS marquee
    const loopContainer = footer.querySelector(".framer-hpeyv8-container");
    if (!loopContainer) return;
    if (loopContainer.getAttribute("data-libraryyy-marquee")) return;
    loopContainer.setAttribute("data-libraryyy-marquee", "1");

    // Build marquee content — duplicate items for seamless loop
    const track = items.join("  \\u2022  ") + "  \\u2022  ";
    loopContainer.innerHTML = '<div class="libraryyy-marquee"><div class="libraryyy-marquee-track">' +
      '<span>' + track + '</span><span>' + track + '</span>' +
      '</div></div>';
  }

  function injectFooter() {
    const footer = document.querySelector("[data-framer-name='Footer']");
    if (!footer) return;
    const loop = footer.querySelector(".framer-1f62q6a");
    if (!loop || loop.querySelector("[data-libraryyy-footer]")) return;

    const block = document.createElement("div");
    block.setAttribute("data-libraryyy-footer", "1");
    block.className = "libraryyy-footer-meta";

    const brand = document.createElement("p");
    brand.className = "libraryyy-footer-brand";
    brand.textContent = "Libraryyy";

    const links = document.createElement("div");
    links.className = "libraryyy-footer-links";
    [
      { label: "hello@libraryyy.com", href: "mailto:hello@libraryyy.com" },
      { label: "Privacy Policy", href: "#" },
      { label: "Terms Of Use", href: "#" },
      { label: "Contact", href: "#" },
    ].forEach((item) => {
      const a = document.createElement("a");
      a.className = "libraryyy-footer-link";
      a.textContent = item.label;
      a.href = item.href;
      links.appendChild(a);
    });

    block.appendChild(brand);
    block.appendChild(links);
    loop.appendChild(block);
  }

  function reveal() {
    document.body.classList.add("libraryyy-ready");
  }

  function patchAll() {
    patchTextNodes(document.body);
    patchAttributes();
    patchNavItems();
    patchVerticalRoleText();
    patchFontsToCooper();
    applyPurpleTitles();
    patchTimezone();
    removeSignatures();
    removeProgressLabels();
    removeSocialLinks();
    removeBrandedImages();
    removeChecklistGimmicks();
    tuneMobileHero();
    fixMaskedTopWord();
    injectFooter();
    patchFooterLoop();
    labelContentImages();
    hideMarquees();
    reveal();
  }

  let scheduled = false;
  function schedulePatch() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; patchAll(); });
  }

  // Safety: always reveal even if patcher fails
  setTimeout(reveal, 3000);

  const observer = new MutationObserver(schedulePatch);
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  window.addEventListener("resize", schedulePatch, { passive: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      patchAll();
      setTimeout(patchAll, 300);
      setTimeout(patchAll, 1200);
    });
  } else {
    patchAll();
    setTimeout(patchAll, 300);
    setTimeout(patchAll, 1200);
  }
})();
</script>
`;

const CUSTOM_STYLES = `
<style id="libraryyy-styles">
body { opacity: 0; transition: opacity 0.35s ease; }
body.libraryyy-ready { opacity: 1; }

@font-face {
  font-family: "Cooper BT";
  src: url("/fonts/cooper-bt-light.otf") format("opentype");
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}

[data-libraryyy-cooper] {
  font-family: "Cooper BT", "SGKara", Georgia, "Times New Roman", serif !important;
  font-weight: 300 !important;
  letter-spacing: -0.01em !important;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* Purple titles — only in hero block, vertical text, and book sections */
.framer-W8zRt .framer-text,
[data-framer-name="Product"] .framer-text,
[data-framer-name="Designer"] .framer-text,
[data-framer-name*="Book"] .framer-text,
[data-framer-name*="book"] .framer-text {
  --token-9d6e4be8-f5be-4ce8-81f8-c572021c0846: #5227FF !important;
  --extracted-r6o4lv: #5227FF !important;
  color: #5227FF !important;
}

/* Cursor click animation — override tokens to purple (scoped to cursor overlay only) */
.framer-vb399-container {
  --token-9d6e4be8-f5be-4ce8-81f8-c572021c0846: #5227FF !important;
  --token-e4335cd6-de9e-4f47-8941-54e0a8a1e2cc: #5227FF !important;
}

/* Book spine/binding — pink */
.framer-1a41xj5 { background-color: #ff9ffc !important; }

/* Ribbon SVGs — purple */
[data-framer-name="ribbon Left"] > [data-framer-component-type="SVG"] {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 88.5 40.5' overflow='visible'%3E%3Cpath d='M 88.5 0 L 37.5 8 L 0 28.5 L 8.5 32.5 L 8.5 40.5 L 43 23 L 88.5 17 Z' fill='rgb(82,39,255)'/%3E%3C/svg%3E") !important;
}
[data-framer-name="Ribbon right"] > [data-framer-component-type="SVG"],
[data-framer-name="ribbon right"] > [data-framer-component-type="SVG"] {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 46.5 93' overflow='visible'%3E%3Cpath d='M 0 23 L 41.5 52 L 46.5 72.5 L 23.5 85.5 L 0 93 L 0 75.5 L 18 69.5 L 28 62.5 L 21 21 L 0 0 Z' fill='rgb(82,39,255)'/%3E%3C/svg%3E") !important;
}

/* Hide social links, GIF gimmicks */
a[href*="x.com"], a[href*="twitter.com"], a[href*="linkedin.com"],
a[href*="instagram.com"], a[href*="behance.net"], a[href*="dribbble.com"],
a[href*="github.com"], a[href*="tiktok.com"], a[href*="facebook.com"],
a[href*="threads.net"] { display: none !important; }

[data-framer-name="Checklist"] [data-framer-name="Call card"],
[data-framer-name="Checklist"] [data-framer-name="Giphy"],
[data-framer-name="Checklist"] .framer-bxtkhp,
[data-framer-name="Checklist"] .framer-lhlfg5 { display: none !important; }

/* Footer */
.libraryyy-footer-meta {
  width: min(100%, 720px); margin-top: -12px; display: flex;
  flex-direction: column; align-items: center; gap: 9px; text-align: center;
}
.libraryyy-footer-brand {
  margin: 0; font-family: "Cooper BT", Georgia, serif;
  font-size: 34px; font-weight: 300; line-height: 1; letter-spacing: -0.01em;
  color: #ff9ffc;
}
.libraryyy-footer-links {
  display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 14px;
}
.libraryyy-footer-link {
  font-family: "Gochi Hand", "Delicious Handrawn", cursive;
  font-size: 16px; text-decoration: none; color: #ff9ffc; opacity: 0.92;
}
.libraryyy-footer-link:hover { text-decoration: underline; }

/* Desktop checklist/footer layout */
@media (min-width: 950px) {
  .framer-1f62q6a .framer-hpeyv8-container {
    width: min(100%, 980px) !important; height: 54px !important;
    position: relative !important; overflow: hidden !important; border-radius: 10px;
    --fade: clamp(120px, 22vw, 240px);
    -webkit-mask-image: linear-gradient(to right, transparent 0%, black var(--fade), black calc(100% - var(--fade)), transparent 100%);
    mask-image: linear-gradient(to right, transparent 0%, black var(--fade), black calc(100% - var(--fade)), transparent 100%);
  }
}

/* Footer marquee */
.libraryyy-marquee {
  width: 100%; overflow: hidden; position: relative;
}
.libraryyy-marquee-track {
  display: flex; width: max-content;
  animation: libraryyy-scroll 20s linear infinite;
  font-family: "Gochi Hand", sans-serif; font-size: 22px;
  color: var(--token-71c304aa-4c46-4675-8971-a89fbbb7900f, rgb(242, 227, 207));
  gap: 0; white-space: nowrap;
}
.libraryyy-marquee-track span { flex-shrink: 0; padding-right: 0; }
.libraryyy-marquee:hover .libraryyy-marquee-track { animation-play-state: paused; }
@keyframes libraryyy-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

/* Image placeholder labels */
.libraryyy-placeholder-label {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(82, 39, 255, 0.55); color: #fff;
  font-family: "JetBrains Mono", "Geist Mono", monospace;
  font-size: 14px; font-weight: 600; letter-spacing: 0.02em;
  pointer-events: none; z-index: 10; border-radius: inherit;
}

/* Mobile tweaks */
@media (max-width: 809.98px) {
  .libraryyy-footer-meta { width: min(100%, 94vw); margin-top: -8px; gap: 8px; }
  .libraryyy-footer-brand { font-size: 30px; }
  .libraryyy-footer-link { font-size: 15px; }
  .libraryyy-placeholder-label { font-size: 11px; }
}
</style>
`;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  let html = await readFile(CLONE_PATH, "utf8");

  // Inject styles into <head>
  if (html.includes("</head>")) {
    html = html.replace("</head>", `${CUSTOM_STYLES}</head>`);
  }

  // Inject patcher script before </body>
  if (html.includes("</body>")) {
    html = html.replace("</body>", `${DOM_PATCHER_SCRIPT}</body>`);
  }

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0, must-revalidate",
    },
  });
}
