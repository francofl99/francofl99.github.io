import { descriptions, projects, translations } from "./content.js";

const LANGUAGES = ["es", "en"];
const THEMES = ["light", "dark"];
const FILTERS = ["all", "dev", "ai", "mac"];
const SUN =
  '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>';
const MOON = '<path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/>';

function preference(view, key, previousKey, allowed, fallback) {
  try {
    for (const candidate of [
      view.localStorage.getItem(key),
      view.localStorage.getItem(previousKey),
    ]) {
      if (allowed.includes(candidate)) return candidate;
    }
  } catch {
    /* Storage may be blocked; the controls must still work. */
  }
  return fallback;
}

/** Initialize one static portfolio; no framework or network service is required. */
export function initPortfolio(root) {
  if (!root) return null;
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  const controller = new view.AbortController();
  const listen = (node, event, listener) =>
    node.addEventListener(event, listener, { signal: controller.signal });
  const modal = root.querySelector("#project-dialog");
  const themeButton = root.querySelector("#theme-toggle");
  const cards = [...root.querySelectorAll(".project-card")];
  const state = {
    language: preference(
      view,
      "portfolio-language",
      "ff-portfolio-lang-1",
      LANGUAGES,
      "es",
    ),
    theme: preference(
      view,
      "portfolio-theme",
      "ff-portfolio-theme-1",
      THEMES,
      "light",
    ),
    filter: "all",
    selected: null,
    releasePage: null,
  };
  let backdropPointer = false;
  const text = (es, en) => (state.language === "es" ? es : en);
  const persist = (key, value) => {
    try {
      view.localStorage.setItem(key, value);
    } catch {}
  };
  const category = (project) =>
    ({
      dev: "Developer tools",
      ai: text("Flujos con IA", "AI workflows"),
      mac: "macOS",
    })[project.category];

  function updateThemeControl() {
    const dark = state.theme === "dark";
    themeButton.setAttribute("aria-pressed", String(dark));
    const label = dark
      ? text("Cambiar a tema claro", "Switch to light theme")
      : text("Cambiar a tema oscuro", "Switch to dark theme");
    themeButton.setAttribute("aria-label", label);
    themeButton.title = label;
    themeButton.querySelector("span").textContent = dark
      ? text("Oscuro", "Dark")
      : text("Claro", "Light");
    // These are fixed, local SVG paths, never project or user-provided HTML.
    themeButton.querySelector("svg").innerHTML = dark ? MOON : SUN;
  }

  function announceProjects() {
    const count = cards.filter((card) => !card.hidden).length;
    root.querySelector("#project-status").textContent = text(
      `${count} proyectos visibles.`,
      `${count} projects shown.`,
    );
  }

  function renderCase(project) {
    root
      .querySelector(".case-body")
      .setAttribute(
        "aria-label",
        text("Detalles del proyecto", "Project details"),
      );
    const index = state.language === "es" ? 0 : 1;
    root.querySelector("#case-category").textContent =
      `${text("PROYECTO PROPIO", "PERSONAL PROJECT")} / ${category(project)}`;
    root
      .querySelector(".case-close")
      .setAttribute("aria-label", text("Cerrar caso", "Close case"));
    root.querySelector("#project-case-title").textContent = project.name;
    root.querySelector("#project-case-summary").textContent =
      project[state.language];
    root.querySelector("#case-problem-title").textContent = text(
      "El problema",
      "The problem",
    );
    root.querySelector("#case-problem").textContent = project.problem[index];
    root.querySelector("#case-solution-title").textContent = text(
      "La solución",
      "The solution",
    );
    root.querySelector("#case-solution").textContent = project.solution[index];
    root.querySelector("#case-tech").textContent =
      project.tech === "Node.js · APIs locales"
        ? text(project.tech, "Node.js · Local APIs")
        : project.tech;
  }

  function setLanguage(language) {
    if (!LANGUAGES.includes(language)) return false;
    state.language = language;
    doc.documentElement.lang = language;
    for (const element of root.querySelectorAll("[data-i18n]")) {
      const copy = translations[element.dataset.i18n];
      if (copy) element.textContent = copy[language];
    }
    for (const attribute of ["aria-label", "title", "alt"]) {
      for (const element of root.querySelectorAll(`[data-i18n-${attribute}]`)) {
        const copy =
          translations[element.getAttribute(`data-i18n-${attribute}`)];
        if (copy) element.setAttribute(attribute, copy[language]);
      }
    }
    for (const button of root.querySelectorAll("[data-language]")) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.language === language),
      );
    }
    doc.title = text(
      "Franco Fernández Lorio · Desarrollador Full-Stack Senior",
      "Franco Fernández Lorio · Senior Full-Stack Developer",
    );
    doc.querySelector('meta[name="description"]').content =
      descriptions[language];
    doc.querySelector('meta[property="og:title"]').content = doc.title;
    doc.querySelector('meta[property="og:description"]').content =
      descriptions[language];
    doc.querySelector('meta[property="og:locale"]').content =
      language === "es" ? "es_AR" : "en_US";
    updateThemeControl();
    if (state.selected) renderCase(state.selected);
    announceProjects();
    persist("portfolio-language", language);
    return true;
  }

  function setTheme(theme) {
    if (!THEMES.includes(theme)) return false;
    state.theme = theme;
    root.classList.toggle("theme-dark", theme === "dark");
    root.classList.toggle("theme-light", theme === "light");
    doc.documentElement.dataset.theme = theme;
    doc.querySelector('meta[name="theme-color"]').content =
      theme === "dark" ? "#08141C" : "#F7FAFC";
    updateThemeControl();
    persist("portfolio-theme", theme);
    return true;
  }

  function filterProjects(filter) {
    if (!FILTERS.includes(filter)) return false;
    state.filter = filter;
    for (const card of cards)
      card.hidden = filter !== "all" && card.dataset.category !== filter;
    for (const button of root.querySelectorAll("[data-filter]")) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.filter === filter),
      );
    }
    announceProjects();
    return true;
  }

  function freezePage(opener) {
    const page = doc.documentElement;
    const body = doc.body;
    const x = view.scrollX;
    const y = view.scrollY;
    const pageOverflow = [
      page.style.getPropertyValue("overflow"),
      page.style.getPropertyPriority("overflow"),
    ];
    const properties = [
      "position",
      "top",
      "left",
      "right",
      "width",
      "height",
      "overflow",
    ];
    const previous = properties.map((name) => [
      name,
      body.style.getPropertyValue(name),
      body.style.getPropertyPriority(name),
    ]);
    Object.assign(body.style, {
      position: "fixed",
      top: `-${y}px`,
      left: `-${x}px`,
      right: "0",
      width: "100%",
      height: "auto",
      overflow: "hidden",
    });
    page.style.overflow = "hidden";
    return () => {
      if (pageOverflow[0]) page.style.setProperty("overflow", ...pageOverflow);
      else page.style.removeProperty("overflow");
      for (const [name, value, priority] of previous) {
        if (value) body.style.setProperty(name, value, priority);
        else body.style.removeProperty(name);
      }
      const behavior = page.style.scrollBehavior;
      page.style.scrollBehavior = "auto";
      view.scrollTo(x, y);
      page.style.scrollBehavior = behavior;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }

  function openProject(id, opener = doc.activeElement) {
    const project = projects.find((item) => item.name === id);
    if (!project) return false;
    if (typeof modal.showModal !== "function") {
      root.querySelector("#project-status").textContent = text(
        "Este navegador no admite las fichas de proyecto. Podés leer el resumen de cada herramienta.",
        "This browser does not support project dialogs. You can still read each tool’s summary.",
      );
      return false;
    }
    state.selected = project;
    renderCase(project);
    if (!modal.open) {
      modal.showModal();
      state.releasePage = freezePage(opener);
    }
    root.querySelector(".case-body").scrollTop = 0;
    root.querySelector(".case-close").focus({ preventScroll: true });
    return true;
  }

  function closeProject() {
    const release = state.releasePage;
    state.releasePage = null;
    state.selected = null;
    if (modal.open) modal.close();
    if (release) release();
    backdropPointer = false;
  }

  function outside(event) {
    const box = modal.getBoundingClientRect();
    return (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    );
  }

  listen(root, "click", (event) => {
    const button = event.target.closest("button");
    if (!button || !root.contains(button) || button.disabled) return;
    if (button.dataset.language) setLanguage(button.dataset.language);
    else if (button.dataset.filter) filterProjects(button.dataset.filter);
    else if (button.dataset.projectId)
      openProject(button.dataset.projectId, button);
    else if (button === themeButton)
      setTheme(state.theme === "light" ? "dark" : "light");
    else if (button.classList.contains("case-close")) closeProject();
  });
  listen(modal, "pointerdown", (event) => {
    backdropPointer = outside(event);
  });
  listen(modal, "click", (event) => {
    if (backdropPointer && outside(event)) closeProject();
    backdropPointer = false;
  });
  listen(modal, "cancel", (event) => {
    event.preventDefault();
    closeProject();
  });
  listen(modal, "close", closeProject);
  listen(modal, "keydown", (event) => {
    if (event.key !== "Tab") return;
    const controls = [
      ...modal.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((control) => control.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && doc.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && doc.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  setLanguage(state.language);
  setTheme(state.theme);
  root.querySelector("#copyright-year").textContent = String(
    new Date().getFullYear(),
  );
  for (const button of root.querySelectorAll("button")) button.disabled = false;

  return {
    setLanguage,
    setTheme,
    filterProjects,
    openProject,
    closeProject,
    getState: () => ({
      language: state.language,
      theme: state.theme,
      filter: state.filter,
      selected: state.selected?.name ?? null,
    }),
    destroy() {
      closeProject();
      controller.abort();
    },
  };
}

if (typeof document !== "undefined")
  initPortfolio(
    document.querySelector('[data-release="engineering-studio-v1"]'),
  );
