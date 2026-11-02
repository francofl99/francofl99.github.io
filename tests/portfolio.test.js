import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { initPortfolio } from "../assets/app.js";
import { projects, translations } from "../assets/content.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(repo, "index.html"), "utf8");
const normalize = (text) => text.replace(/\s+/g, " ").trim();
function fixture({
  saved = {},
  storageBlocked = false,
  dialogSupported = true,
} = {}) {
  const dom = new JSDOM(html, {
    url: "https://francofl99.github.io/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const view = dom.window,
    doc = view.document,
    root = doc.querySelector(".portfolio");
  for (const [key, value] of Object.entries(saved))
    view.localStorage.setItem(key, value);
  if (storageBlocked)
    Object.defineProperty(view, "localStorage", {
      get() {
        throw new Error("Storage blocked");
      },
    });
  view.scrollTo = (x, y) => {
    Object.defineProperty(view, "scrollX", { value: x, configurable: true });
    Object.defineProperty(view, "scrollY", { value: y, configurable: true });
  };
  const modal = doc.querySelector("dialog");
  if (dialogSupported) {
    modal.showModal = () => {
      modal.open = true;
    };
    modal.close = () => {
      modal.open = false;
      modal.dispatchEvent(new view.Event("close"));
    };
  } else modal.showModal = undefined;
  modal.getBoundingClientRect = () => ({
    left: 100,
    top: 100,
    right: 690,
    bottom: 600,
  });
  root.querySelector(".case-close").getClientRects = () => [
    { width: 36, height: 36 },
  ];
  root.querySelector(".case-body").getClientRects = () => [
    { width: 500, height: 300 },
  ];
  const app = initPortfolio(root);
  return {
    dom,
    view,
    doc,
    root,
    modal,
    app,
    dispose() {
      app.destroy();
      dom.window.close();
    },
  };
}

test("static document contains the approved identity, semantic projects and one integrated About section", () => {
  const doc = new JSDOM(html).window.document;
  assert.equal(doc.querySelectorAll("h1").length, 1);
  assert.equal(doc.querySelectorAll(".header-portrait").length, 1);
  assert.equal(doc.querySelectorAll(".header-experience").length, 1);
  assert.deepEqual(
    [...doc.querySelectorAll(".header-experience dd")].map(
      (x) => x.textContent,
    ),
    ["15", "6"],
  );
  assert.equal(
    doc.querySelectorAll(".logo,.hero-foot,.experience-grid,.profile-strip")
      .length,
    0,
  );
  assert.equal(doc.querySelector("#ai").closest("section").id, "about");
  assert.deepEqual(
    [...doc.querySelectorAll("main>section")].map((x) => x.id || "hero"),
    ["hero", "projects", "approach", "about", "contact"],
  );
  assert.equal(
    doc.querySelectorAll("article.project-card button.project-open").length,
    8,
  );
  for (const button of doc.querySelectorAll("button"))
    assert.equal(
      button.disabled,
      true,
      "controls are honest before enhancement",
    );
  assert.ok(doc.querySelector("noscript"));
  assert.doesNotMatch(
    html,
    /FF \/ 01|Ficha descriptiva|Sin enlaces obligatorios|10M\+|-45%|99\.9%|5x|AUTHOR’S NOTE/,
  );
});

test("all anchors, accessibility references and local assets resolve without a CDN", () => {
  const doc = new JSDOM(html).window.document;
  const ids = [...doc.querySelectorAll("[id]")].map((el) => el.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const a of doc.querySelectorAll('a[href^="#"]'))
    assert.ok(doc.querySelector(a.getAttribute("href")), a.href);
  for (const el of doc.querySelectorAll("[aria-labelledby],[aria-describedby]"))
    for (const attr of ["aria-labelledby", "aria-describedby"])
      for (const id of (el.getAttribute(attr) || "")
        .split(/\s+/)
        .filter(Boolean))
        assert.ok(doc.getElementById(id), id);
  for (const [selector, attribute] of [
    ["script[src]", "src"],
    ['link[rel="stylesheet"]', "href"],
    ["img", "src"],
  ])
    for (const el of doc.querySelectorAll(selector)) {
      const path = el.getAttribute(attribute).split("?")[0];
      assert.ok(path.startsWith("./"), path);
      assert.ok(existsSync(resolve(repo, path)), path);
    }
  assert.doesNotMatch(
    html,
    /storage\.magicpath|cdn\.tailwind|fonts\.googleapis|react-dom/,
  );
  assert.equal(
    doc.querySelector('link[rel="canonical"]').href,
    "https://francofl99.github.io/",
  );
  assert.deepEqual(
    [...doc.querySelectorAll("#contact .contact-link")].map((a) => a.href),
    [
      "mailto:francofernandezlorio@gmail.com",
      "https://www.linkedin.com/in/franco-fernandez-lorio-38b2b122a/",
      "https://github.com/francofl99",
    ],
  );
  for (const a of doc.querySelectorAll('#contact a[target="_blank"]')) {
    assert.ok(a.rel.includes("noopener") && a.rel.includes("noreferrer"));
    assert.ok(a.querySelector(".contact-icon svg"));
  }
});

test("all annotated copy exists, default Spanish matches it, and both locales translate text and attributes", () => {
  const rawDoc = new JSDOM(html).window.document;
  for (const el of rawDoc.querySelectorAll("[data-i18n]")) {
    const copy = translations[el.dataset.i18n];
    assert.ok(copy, el.dataset.i18n);
    assert.equal(normalize(el.textContent), normalize(copy.es));
  }
  const f = fixture();
  for (const language of ["en", "es"]) {
    f.app.setLanguage(language);
    assert.equal(f.doc.documentElement.lang, language);
    for (const el of f.root.querySelectorAll("[data-i18n]"))
      assert.equal(el.textContent, translations[el.dataset.i18n][language]);
    for (const attr of ["aria-label", "title", "alt"])
      for (const el of f.root.querySelectorAll(`[data-i18n-${attr}]`))
        assert.equal(
          el.getAttribute(attr),
          translations[el.getAttribute(`data-i18n-${attr}`)][language],
        );
    assert.equal(
      f.root
        .querySelector(`[data-language="${language}"]`)
        .getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(f.view.localStorage.getItem("portfolio-language"), language);
  }
  f.dispose();
});

test("published preferences take precedence, prototype preferences migrate, invalid values fall back safely", () => {
  for (const [saved, expected] of [
    [
      {
        "portfolio-language": "en",
        "portfolio-theme": "dark",
        "ff-portfolio-lang-1": "es",
      },
      ["en", "dark"],
    ],
    [
      { "ff-portfolio-lang-1": "en", "ff-portfolio-theme-1": "dark" },
      ["en", "dark"],
    ],
    [
      { "portfolio-language": "<script>", "portfolio-theme": "unknown" },
      ["es", "light"],
    ],
  ]) {
    const f = fixture({ saved });
    assert.deepEqual(
      [f.app.getState().language, f.app.getState().theme],
      expected,
    );
    assert.deepEqual(
      [
        f.view.localStorage.getItem("portfolio-language"),
        f.view.localStorage.getItem("portfolio-theme"),
      ],
      expected,
    );
    f.dispose();
  }
});

test("language, theme, SEO and filters remain independent with storage blocked", () => {
  const f = fixture({ storageBlocked: true });
  assert.ok(f.app.setLanguage("en"));
  assert.ok(f.app.setTheme("dark"));
  f.app.filterProjects("ai");
  assert.deepEqual(f.app.getState(), {
    language: "en",
    theme: "dark",
    filter: "ai",
    selected: null,
  });
  assert.equal(f.doc.documentElement.dataset.theme, "dark");
  assert.equal(
    f.doc.querySelector('meta[name="theme-color"]').content,
    "#08141C",
  );
  assert.match(f.doc.title, /Senior Full-Stack Developer/);
  assert.match(
    f.doc.querySelector('meta[name="description"]').content,
    /6 in the industry/,
  );
  assert.equal(
    f.root.querySelector("#theme-toggle").getAttribute("aria-label"),
    "Switch to light theme",
  );
  assert.equal(f.root.querySelectorAll("button:disabled").length, 0);
  assert.equal(f.app.setLanguage("fr"), false);
  assert.equal(f.app.setTheme("purple"), false);
  assert.equal(f.app.filterProjects("invalid"), false);
  assert.equal(f.app.getState().theme, "dark");
  f.dispose();
});

test("all eight projects have bilingual cases and filters show 2 developer, 2 AI and 4 macOS tools", () => {
  assert.deepEqual(
    projects.map((p) => p.name),
    [
      "benv",
      "agent-board",
      "llm-context-export",
      "git-manager",
      "mac-optimizer",
      "personal-console",
      "mac-alarm",
      "blur-selection",
    ],
  );
  const f = fixture();
  for (const [filter, count] of [
    ["dev", 2],
    ["ai", 2],
    ["mac", 4],
    ["all", 8],
  ]) {
    f.root.querySelector(`[data-filter="${filter}"]`).click();
    assert.equal(
      f.root.querySelectorAll(".project-card:not([hidden])").length,
      count,
    );
    assert.match(
      f.root.querySelector("#project-status").textContent,
      new RegExp(String(count)),
    );
  }
  for (const language of ["es", "en"])
    for (const project of projects) {
      f.app.setLanguage(language);
      const trigger = f.root.querySelector(
        `[data-project-id="${project.name}"]`,
      );
      trigger.click();
      assert.equal(f.app.getState().selected, project.name);
      assert.equal(
        f.doc.getElementById("project-case-title").textContent,
        project.name,
      );
      assert.equal(
        f.doc.getElementById("project-case-summary").textContent,
        project[language],
      );
      assert.equal(
        f.doc.getElementById("case-solution").textContent,
        project.solution[language === "es" ? 0 : 1],
      );
      f.app.closeProject();
      assert.equal(f.doc.activeElement, trigger);
    }
  assert.equal(f.app.openProject("not-a-project"), false);
  f.dispose();
});

test("modal locks and restores scroll/styles, contains keyboard focus and closes through Escape or button", () => {
  const f = fixture();
  f.view.scrollTo(0, 900);
  f.doc.body.style.setProperty("overflow", "auto", "important");
  f.doc.body.style.position = "relative";
  const trigger = f.root.querySelector('[data-project-id="benv"]');
  trigger.click();
  assert.equal(f.modal.open, true);
  assert.equal(f.doc.body.style.top, "-900px");
  assert.equal(f.doc.body.style.position, "fixed");
  assert.equal(f.doc.activeElement, f.root.querySelector(".case-close"));
  const closeButton = f.root.querySelector(".case-close");
  const body = f.root.querySelector(".case-body");
  for (const [start, shiftKey, expected] of [
    [body, false, closeButton],
    [closeButton, true, body],
  ]) {
    start.focus();
    const event = new f.view.KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey,
      bubbles: true,
      cancelable: true,
    });
    f.doc.activeElement.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(f.doc.activeElement, expected);
  }
  const cancel = new f.view.Event("cancel", { cancelable: true });
  f.modal.dispatchEvent(cancel);
  assert.equal(cancel.defaultPrevented, true);
  assert.equal(f.modal.open, false);
  assert.equal(f.view.scrollY, 900);
  assert.equal(f.doc.body.style.position, "relative");
  assert.equal(f.doc.body.style.overflow, "auto");
  assert.equal(f.doc.body.style.getPropertyPriority("overflow"), "important");
  assert.equal(f.doc.documentElement.style.overflow, "");
  assert.equal(f.doc.activeElement, trigger);
  trigger.click();
  f.root.querySelector(".case-close").click();
  assert.equal(f.modal.open, false);
  f.dispose();
});

test("only an actual backdrop click dismisses: padding and dragging a selection outside do not", () => {
  const f = fixture();
  const event = (type, x, y) =>
    new f.view.MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
  f.app.openProject("personal-console");
  f.modal.dispatchEvent(event("pointerdown", 110, 110));
  f.modal.dispatchEvent(event("click", 110, 110));
  assert.equal(f.modal.open, true);
  f.modal.dispatchEvent(event("pointerdown", 110, 110));
  f.modal.dispatchEvent(event("click", 20, 20));
  assert.equal(f.modal.open, true);
  f.modal.dispatchEvent(event("pointerdown", 20, 20));
  f.modal.dispatchEvent(event("click", 20, 20));
  assert.equal(f.modal.open, false);
  f.dispose();
});

test("case content is rendered as text, not executable HTML", () => {
  const f = fixture(),
    original = projects[0].es;
  try {
    projects[0].es = '<img src=x onerror="alert(1)">';
    f.app.openProject("benv");
    assert.equal(
      f.doc.getElementById("project-case-summary").textContent,
      projects[0].es,
    );
    assert.equal(f.modal.querySelector("img"), null);
  } finally {
    projects[0].es = original;
    f.dispose();
  }
});

test("unsupported dialogs fail honestly without locking the page; destroy removes listeners", () => {
  const f = fixture({ dialogSupported: false });
  assert.equal(f.app.openProject("benv"), false);
  assert.equal(f.app.getState().selected, null);
  assert.equal(f.doc.body.style.position, "");
  assert.match(f.doc.getElementById("project-status").textContent, /no admite/);
  f.app.destroy();
  f.root.querySelector('[data-language="en"]').click();
  assert.equal(f.app.getState().language, "es");
  f.dom.window.close();
  assert.equal(initPortfolio(null), null);
});

test("runtime is dependency-free and only local, deployable files enter the Docker artifact", () => {
  const app = readFileSync(resolve(repo, "assets/app.js"), "utf8");
  assert.doesNotMatch(
    app,
    /fetch\(|XMLHttpRequest|https?:\/\/|React|eval\(|new Function/,
  );
  assert.match(
    readFileSync(resolve(repo, "Dockerfile"), "utf8"),
    /COPY assets\//,
  );
  assert.ok(existsSync(resolve(repo, ".nojekyll")));
  assert.equal(
    readdirSync(resolve(repo, "assets")).filter((x) => x.endsWith(".js"))
      .length,
    2,
  );
});
