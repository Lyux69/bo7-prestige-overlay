const IS_LOCAL_SERVER = window.location.port === "8765";
const CLOUD_DATA_URL = String(window.BO7_CLOUD_DATA_URL || "").trim();
const DATA_URL = IS_LOCAL_SERVER ? "/api/data" : CLOUD_DATA_URL || "data.json";

const state = {
  data: null,
  activeView: "prestige",
  autoRotate: true,
  displayMode: "full",
  lastDefaultView: null,
  lastRotationAt: Date.now(),
};

const ROTATION_VIEWS = ["prestige", "categories", "pending", "completed", "arsenal"];

const DEFAULT_CUSTOMIZATION = {
  title: "Weapon Prestige",
  subtitle: "Black Ops 7",
  logoUrl: "",
  accentColor: "#00d7df",
  secondaryColor: "#ff00c8",
  highlightColor: "#ffcda8",
  panelOpacity: 0.88,
  overlayWidth: 700,
  overlayHeight: 480,
  autoRotate: true,
  displayMode: "full",
  overlayPosition: "center",
  defaultView: "prestige",
  rotationSeconds: 9,
};

const formatPercent = (current, total) => {
  if (!total) return 0;
  return Math.round((current / total) * 100);
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function hexToRgb(hex, fallback) {
  const match = String(hex || "").trim().match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return fallback;
  return `${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)}`;
}

function renderWeaponVisual(weapon) {
  const initials = weapon.name
    .split(/\s|\.|-/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return `<div class="weapon-visual no-image" aria-hidden="true"><span>${initials}</span></div>`;
}

async function loadData() {
  state.data = await fetchData();
  render();
}

async function fetchData() {
  const urls = CLOUD_DATA_URL && !IS_LOCAL_SERVER ? [CLOUD_DATA_URL, "data.json"] : [DATA_URL];
  let lastError;

  for (const url of urls) {
    try {
      const separator = url.includes("?") ? "&" : "?";
      const response = await fetch(`${url}${separator}v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo cargar datos");
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No se pudieron cargar los datos del overlay");
}

function render() {
  normalizeData();
  applyCustomization();
  renderSummary();
  renderPrestiges();
  renderCategories();
  renderPending();
  renderCompleted();
  renderArsenal();
}

function normalizeData() {
  state.data.stages ||= [];
  state.data.weapons ||= [];
  state.data.weaponProgress ||= {};
  state.data.pendingWeapons ||= [];
  state.data.categoryStage ||= state.data.stages[0]?.id;
  state.data.customization = { ...DEFAULT_CUSTOMIZATION, ...(state.data.customization || {}) };
}

function applyCustomization() {
  const customization = state.data.customization;
  const root = document.documentElement;
  const logo = document.getElementById("brand-logo");

  document.getElementById("overlay-title").textContent = customization.title || DEFAULT_CUSTOMIZATION.title;
  document.getElementById("overlay-subtitle").textContent = customization.subtitle || DEFAULT_CUSTOMIZATION.subtitle;
  document.body.classList.toggle("compact-mode", customization.displayMode === "compact");
  document.body.dataset.position = customization.overlayPosition || DEFAULT_CUSTOMIZATION.overlayPosition;
  applyDefaultView(customization.defaultView);
  root.style.setProperty("--green", customization.accentColor);
  root.style.setProperty("--gold", customization.secondaryColor);
  root.style.setProperty("--skin", customization.highlightColor);
  root.style.setProperty("--accent-rgb", hexToRgb(customization.accentColor, "0, 215, 223"));
  root.style.setProperty("--secondary-rgb", hexToRgb(customization.secondaryColor, "255, 0, 200"));
  root.style.setProperty("--highlight-rgb", hexToRgb(customization.highlightColor, "255, 205, 168"));
  root.style.setProperty("--panel", `rgba(9, 14, 18, ${customization.panelOpacity})`);
  root.style.setProperty("--overlay-width", `${Number(customization.overlayWidth) || DEFAULT_CUSTOMIZATION.overlayWidth}px`);
  root.style.setProperty("--overlay-height", `${Number(customization.overlayHeight) || DEFAULT_CUSTOMIZATION.overlayHeight}px`);

  if (customization.logoUrl) {
    logo.src = customization.logoUrl;
    logo.classList.add("active");
  } else {
    logo.removeAttribute("src");
    logo.classList.remove("active");
  }
}

function applyDefaultView(defaultView) {
  const view = ROTATION_VIEWS.includes(defaultView) ? defaultView : DEFAULT_CUSTOMIZATION.defaultView;
  if (state.lastDefaultView === view) return;
  state.lastDefaultView = view;
  setView(view);
}

function getRotationMs() {
  const seconds = Number(state.data?.customization?.rotationSeconds) || DEFAULT_CUSTOMIZATION.rotationSeconds;
  return clamp(seconds, 5, 120) * 1000;
}

function getStageProgress(stage) {
  return state.data.weapons.filter((weapon) => state.data.weaponProgress[weapon.name]?.[stage.id]).length;
}

function getPrestiges() {
  return state.data.stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    current: getStageProgress(stage),
    total: state.data.weapons.length,
  }));
}

function getCategories() {
  const stageId = state.data.categoryStage;
  const categories = [...new Set(state.data.weapons.map((weapon) => weapon.category))];
  return categories.map((category) => {
    const weapons = state.data.weapons.filter((weapon) => weapon.category === category);
    return {
      name: category,
      current: weapons.filter((weapon) => state.data.weaponProgress[weapon.name]?.[stageId]).length,
      total: weapons.length,
    };
  });
}

function renderSummary() {
  const prestiges = getPrestiges();
  const totalCurrent = prestiges.reduce((sum, item) => sum + item.current, 0);
  const totalMax = prestiges.reduce((sum, item) => sum + item.total, 0);
  const percent = formatPercent(totalCurrent, totalMax);

  document.getElementById("total-percent").textContent = `${percent}%`;
  document.getElementById("total-progress").textContent = `${totalCurrent} / ${totalMax}`;
  document.getElementById("total-bar").style.width = `${clamp(percent, 0, 100)}%`;
  document.getElementById("status-text").textContent = getStatusText(percent);
  document.getElementById("updated-at").textContent = state.data.updatedAt ? `Actualizado: ${state.data.updatedAt}` : "Esperando datos";
  updateViewportLabel();
}

function updateViewportLabel() {
  const label = document.getElementById("viewport-size");
  if (!label) return;
  const configuredWidth = Number(state.data?.customization?.overlayWidth) || DEFAULT_CUSTOMIZATION.overlayWidth;
  const configuredHeight = Number(state.data?.customization?.overlayHeight) || DEFAULT_CUSTOMIZATION.overlayHeight;
  const viewportWidth = Math.round(window.visualViewport?.width || window.innerWidth);
  const viewportHeight = Math.round(window.visualViewport?.height || window.innerHeight);
  const isScaled = viewportWidth < configuredWidth || viewportHeight < configuredHeight;
  label.textContent = isScaled ? `Pantalla: ${viewportWidth} x ${viewportHeight}` : `OBS: ${configuredWidth} x ${configuredHeight}`;
}

function renderPrestiges() {
  const list = document.getElementById("prestige-list");
  list.innerHTML = getPrestiges()
    .map((item) => {
      const percent = formatPercent(item.current, item.total);
      return `
        <article class="row">
          <div class="row-main">
            <div class="row-title">
              <span>${item.name}</span>
              <span>${item.current} / ${item.total}</span>
            </div>
            <div class="progress-shell">
              <div class="progress-fill" style="width: ${clamp(percent, 0, 100)}%"></div>
            </div>
          </div>
          <div class="percent">${percent}%</div>
        </article>
      `;
    })
    .join("");
}

function renderCategories() {
  const list = document.getElementById("category-list");
  list.innerHTML = getCategories()
    .map((item) => {
      const percent = formatPercent(item.current, item.total);
      return `
        <article class="category-card">
          <div class="category-title">
            <span>${item.name}</span>
            <span>${item.current} / ${item.total}</span>
          </div>
          <div class="progress-shell">
            <div class="progress-fill" style="width: ${clamp(percent, 0, 100)}%"></div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderPending() {
  const list = document.getElementById("pending-list");
  if (!state.data.pendingWeapons.length) {
    list.innerHTML = `<article class="empty-card">No hay armas pendientes seleccionadas.</article>`;
    return;
  }

  list.innerHTML = state.data.pendingWeapons
    .slice(0, 8)
    .map((weapon) => `
      <article class="weapon-card">
        ${renderWeaponVisual(weapon)}
        <div class="weapon-name">${weapon.name}</div>
        <div class="weapon-meta">${weapon.category} | ${weapon.nextGoal}</div>
      </article>
    `)
    .join("");
}

function getCompletedWeapons() {
  return state.data.weapons
    .map((weapon) => {
      const completedStages = state.data.stages.filter((stage) => state.data.weaponProgress[weapon.name]?.[stage.id]);
      return {
        ...weapon,
        completedStages,
        latestStage: completedStages.at(-1),
      };
    })
    .filter((weapon) => weapon.completedStages.length > 0)
    .sort((a, b) => b.completedStages.length - a.completedStages.length || a.name.localeCompare(b.name));
}

function renderCompleted() {
  const list = document.getElementById("completed-list");
  const weapons = getCompletedWeapons();

  if (!weapons.length) {
    list.innerHTML = `<article class="empty-card">Todavia no hay armas marcadas como completadas.</article>`;
    return;
  }

  list.innerHTML = weapons
    .map((weapon) => {
      const percent = formatPercent(weapon.completedStages.length, state.data.stages.length);
      return `
        <article class="completed-card">
          ${renderWeaponVisual(weapon)}
          <div class="completed-info">
            <div class="weapon-name">${weapon.name}</div>
            <div class="weapon-meta">${weapon.category} | ${weapon.latestStage.name}</div>
            <div class="mini-progress"><span style="width: ${clamp(percent, 0, 100)}%"></span></div>
          </div>
          <div class="completed-count">${weapon.completedStages.length}/${state.data.stages.length}</div>
        </article>
      `;
    })
    .join("");
}

function renderArsenal() {
  const list = document.getElementById("arsenal-list");
  list.innerHTML = state.data.weapons
    .map((weapon) => {
      const done = state.data.stages.filter((stage) => state.data.weaponProgress[weapon.name]?.[stage.id]).length;
      const percent = formatPercent(done, state.data.stages.length);
      return `
        <article class="arsenal-card">
          ${renderWeaponVisual(weapon)}
          <div class="arsenal-info">
            <div class="weapon-name">${weapon.name}</div>
            <div class="weapon-meta">${weapon.category} | ${done}/${state.data.stages.length}</div>
            <div class="mini-progress"><span style="width: ${clamp(percent, 0, 100)}%"></span></div>
          </div>
        </article>
      `;
    })
    .join("");
}

function getStatusText(percent) {
  if (percent >= 100) return "Prestige completo";
  if (percent >= 75) return "Ultimo empuje";
  if (percent >= 40) return "Grind avanzado";
  if (percent > 0) return "Grind en marcha";
  return "Empezando el grind";
}

function setView(view) {
  state.activeView = view;
  state.lastRotationAt = Date.now();
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("active", section.id === `${view}-view`);
  });
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    state.autoRotate = false;
    setView(tab.dataset.view);
  });
});

loadData().catch((error) => {
  document.getElementById("status-text").textContent = error.message;
});

setInterval(loadData, 5000);

setInterval(() => {
  if (!state.autoRotate || state.data?.customization?.autoRotate === false) return;
  if (Date.now() - state.lastRotationAt < getRotationMs()) return;
  const currentIndex = ROTATION_VIEWS.indexOf(state.activeView);
  setView(ROTATION_VIEWS[(currentIndex + 1) % ROTATION_VIEWS.length]);
}, 1000);

window.addEventListener("resize", updateViewportLabel);
window.visualViewport?.addEventListener("resize", updateViewportLabel);
