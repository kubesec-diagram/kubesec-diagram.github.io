if (typeof config === "undefined") {
  console.error("Required data not loaded: config must be defined");
  throw new Error("Missing required configuration data");
}

const urlParams = new URLSearchParams(window.location.search);
const debug = urlParams.has("debug");

const image = document.getElementById("main-image");
const wrapper = document.getElementById("image-wrapper");
const tooltipLayer = document.getElementById("tooltip-layer");
const container = document.getElementById("container");
const filterPanel = document.getElementById("filter-panel");
const filterPanelBackdrop = document.getElementById("filter-panel-backdrop");
const filterResults = document.getElementById("filter-results");
const filterResultCount = document.getElementById("filter-result-count");
const filterSearchInput = document.getElementById("filter-search-input");
const filterTagControls = document.getElementById("filter-tag-controls");
const openFilterPanelBtn = document.getElementById("floating-filter-toggle");
const fitToViewportBtn = document.getElementById("floating-fit-toggle");
const themeToggleBtn = document.getElementById("floating-theme-toggle");
const closeFilterPanelBtn = document.getElementById("close-filter-panel");
const resetFilterBtn = document.getElementById("filter-reset-btn");

if (
  !image ||
  !wrapper ||
  !tooltipLayer ||
  !container ||
  !filterPanel ||
  !filterPanelBackdrop ||
  !filterResults ||
  !filterResultCount ||
  !filterSearchInput ||
  !filterTagControls ||
  !openFilterPanelBtn ||
  !fitToViewportBtn ||
  !themeToggleBtn ||
  !closeFilterPanelBtn ||
  !resetFilterBtn
) {
  console.error("Required DOM elements not found");
  throw new Error("Missing required DOM elements");
}

let cachedBounds = null;

// Zoom and pan variables
let currentZoom = 1;
let maxZoom = 4;
let minZoom = 1;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let imageTranslateX = 0;
let imageTranslateY = 0;
let isTouchActive = false;
let hoverPanAnimationFrame = null;
let fitAllRestoreState = null;
let goToNavigationToken = 0;

// User annotations variables
let userAnnotations = [];
let editModeEnabled = false;

// UI state
let currentMode = "area"; // Default annotation mode
let selectedType = "info"; // Default selected type
let diagramSourcePath = "";
let diagramAspectRatio = null;
let diagramTagElements = new Map();
let svgHelpRecords = [];
let svgHelpRecordByElement = new Map();
let annotationSearchQuery = "";
let filterPanelOpen = false;
let filterPanelOverlayMode = true;
let pinnedHelpSlugs = new Set();
let onlyShowPinned = false;
let selectedLevel = 0;
let maxDiagramLevel = 0;
let fitAllMode = false;
let fitGeometryMode = "cover";
let pendingCoverSyncAfterFitExit = false;
const tagVisibility = new Map();
const MENU_VISIBLE_PARAM = "menu";
const FILTER_HIDE_TAGS_PARAM = "filter-hide-tags";
const FILTER_QUERY_PARAM = "filter-query";
const FILTER_PINS_PARAM = "pins";
const FILTER_CONSTRAINT_PARAM = "constraint";
const FILTER_LEVEL_PARAM = "filter-level";
const THEME_STORAGE_KEY = "kubesec-theme";
const FILTER_DOCK_MIN_IMAGE_WIDTH = 1100;
const FILTER_SEARCH_PLACEHOLDER_DEFAULT = "Search annotations...";

function normalizePinnedHelpSlugs() {
  const availableSlugs = new Set(
    svgHelpRecords
      .map((record) => `${(record && record.slug) || ""}`.trim())
      .filter(Boolean),
  );

  const nextPinned = new Set();
  pinnedHelpSlugs.forEach((slugValue) => {
    const slug = `${slugValue || ""}`.trim();
    if (!slug) return;
    if (!availableSlugs.has(slug)) return;
    nextPinned.add(slug);
  });

  let changed = pinnedHelpSlugs.size !== nextPinned.size;
  if (!changed) {
    pinnedHelpSlugs.forEach((slug) => {
      if (!nextPinned.has(slug)) {
        changed = true;
      }
    });
  }

  if (changed) {
    pinnedHelpSlugs = nextPinned;
    onPinnedStateChanged();
  }
}

function onPinnedStateChanged() {
  onFilterConstraintStateChanged();
}

function onFilterConstraintStateChanged() {
  if (svgHelpService && typeof svgHelpService.refreshPinnedStates === "function") {
    svgHelpService.refreshPinnedStates();
  }
  urlStateService.updateURLState();
}

function updateFitButtonState() {
  fitToViewportBtn.classList.toggle("active", fitAllMode);
  fitToViewportBtn.setAttribute("aria-pressed", fitAllMode ? "true" : "false");
  fitToViewportBtn.title = fitAllMode ? "Return to clipped view" : "Show full diagram";
}

function updateFitBackdropState() {
  const keepBlackFrame = fitAllMode || pendingCoverSyncAfterFitExit;
  document.body.classList.toggle("diagram-fit-blackframe", keepBlackFrame);
}

function captureViewportAnchor(clientX = null, clientY = null) {
  const wrapperRect = wrapper.getBoundingClientRect();
  const imageRect = image.getBoundingClientRect();
  if (!isRectValid(wrapperRect) || !isRectValid(imageRect)) return null;

  const targetClientX =
    Number.isFinite(clientX) ? clientX : wrapperRect.left + wrapperRect.width / 2;
  const targetClientY =
    Number.isFinite(clientY) ? clientY : wrapperRect.top + wrapperRect.height / 2;
  const anchor = {
    nx: (targetClientX - imageRect.left) / imageRect.width,
    ny: (targetClientY - imageRect.top) / imageRect.height,
    targetClientX,
    targetClientY,
  };

  const rootSvg = image.querySelector("svg");
  if (rootSvg && typeof rootSvg.getScreenCTM === "function") {
    try {
      const ctm = rootSvg.getScreenCTM();
      if (ctm && typeof ctm.inverse === "function") {
        const svgPoint = new DOMPoint(targetClientX, targetClientY).matrixTransform(ctm.inverse());
        if (Number.isFinite(svgPoint.x) && Number.isFinite(svgPoint.y)) {
          anchor.svgX = svgPoint.x;
          anchor.svgY = svgPoint.y;
        }
      }
    } catch (_error) {
      // Fallback to normalized anchor below.
    }
  }

  return anchor;
}

function restoreViewportAnchor(anchor) {
  if (!anchor) return;
  const desiredX =
    Number.isFinite(anchor.targetClientX)
      ? anchor.targetClientX
      : null;
  const desiredY =
    Number.isFinite(anchor.targetClientY)
      ? anchor.targetClientY
      : null;

  let targetX = null;
  let targetY = null;
  if (Number.isFinite(anchor.svgX) && Number.isFinite(anchor.svgY)) {
    const rootSvg = image.querySelector("svg");
    if (rootSvg && typeof rootSvg.getScreenCTM === "function") {
      try {
        const ctm = rootSvg.getScreenCTM();
        if (ctm) {
          const clientPoint = new DOMPoint(anchor.svgX, anchor.svgY).matrixTransform(ctm);
          if (Number.isFinite(clientPoint.x) && Number.isFinite(clientPoint.y)) {
            targetX = clientPoint.x;
            targetY = clientPoint.y;
          }
        }
      } catch (_error) {
        targetX = null;
        targetY = null;
      }
    }
  }

  if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
    const imageRect = image.getBoundingClientRect();
    if (!isRectValid(imageRect)) return;
    targetX = imageRect.left + imageRect.width * anchor.nx;
    targetY = imageRect.top + imageRect.height * anchor.ny;
  }

  const finalDesiredX = Number.isFinite(desiredX) ? desiredX : targetX;
  const finalDesiredY = Number.isFinite(desiredY) ? desiredY : targetY;

  imageTranslateX += finalDesiredX - targetX;
  imageTranslateY += finalDesiredY - targetY;
}

function disableFitAllKeepViewport(options = {}) {
  if (!fitAllMode) {
    updateFitButtonState();
    return;
  }

  setFitAllMode(false, {
    restore: false,
    anchorClientX: options.anchorClientX,
    anchorClientY: options.anchorClientY,
  });
}

function isViewportFullyCoveredAtCurrentZoom() {
  const wrapperRect = wrapper.getBoundingClientRect();
  const imageRect = image.getBoundingClientRect();
  if (!isRectValid(wrapperRect) || !isRectValid(imageRect)) {
    return false;
  }

  const svgEl = image.querySelector("svg");
  const svgStyles = svgEl ? window.getComputedStyle(svgEl) : null;
  const svgPadLeft = svgStyles ? Number.parseFloat(svgStyles.paddingLeft) || 0 : 0;
  const svgPadRight = svgStyles ? Number.parseFloat(svgStyles.paddingRight) || 0 : 0;
  const svgPadTop = svgStyles ? Number.parseFloat(svgStyles.paddingTop) || 0 : 0;
  const svgPadBottom = svgStyles ? Number.parseFloat(svgStyles.paddingBottom) || 0 : 0;
  const scaledPadLeft = svgPadLeft * currentZoom;
  const scaledPadRight = svgPadRight * currentZoom;
  const scaledPadTop = svgPadTop * currentZoom;
  const scaledPadBottom = svgPadBottom * currentZoom;

  const drawableLeft = imageRect.left + scaledPadLeft;
  const drawableTop = imageRect.top + scaledPadTop;
  const drawableRight = imageRect.right - scaledPadRight;
  const drawableBottom = imageRect.bottom - scaledPadBottom;

  const EPSILON = 0.75;
  const PROMOTION_MARGIN = 6;
  return (
    drawableLeft <= wrapperRect.left - PROMOTION_MARGIN + EPSILON &&
    drawableTop <= wrapperRect.top - PROMOTION_MARGIN + EPSILON &&
    drawableRight >= wrapperRect.right + PROMOTION_MARGIN - EPSILON &&
    drawableBottom >= wrapperRect.bottom + PROMOTION_MARGIN - EPSILON
  );
}

function nudgeToSvgAnchor(svgX, svgY, targetClientX, targetClientY, iterations = 2) {
  if (!Number.isFinite(svgX) || !Number.isFinite(svgY)) return;
  if (!Number.isFinite(targetClientX) || !Number.isFinite(targetClientY)) return;

  const rootSvg = image.querySelector("svg");
  if (!rootSvg || typeof rootSvg.getScreenCTM !== "function") return;

  for (let i = 0; i < iterations; i += 1) {
    let point = null;
    try {
      const ctm = rootSvg.getScreenCTM();
      if (!ctm) return;
      point = new DOMPoint(svgX, svgY).matrixTransform(ctm);
    } catch (_error) {
      return;
    }

    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    const dx = targetClientX - point.x;
    const dy = targetClientY - point.y;
    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return;

    imageTranslateX += dx;
    imageTranslateY += dy;
    viewportService.applyRawTransform();
  }
}

function maybePromoteFitGeometryToCover(anchorClientX = null, anchorClientY = null) {
  if (!pendingCoverSyncAfterFitExit) return false;
  if (fitGeometryMode !== "contain") {
    pendingCoverSyncAfterFitExit = false;
    updateFitBackdropState();
    return false;
  }
  if (!isViewportFullyCoveredAtCurrentZoom()) {
    return false;
  }

  const precisionAnchor = captureViewportAnchor(anchorClientX, anchorClientY);
  const rectBefore = image.getBoundingClientRect();
  const zoomBefore = currentZoom;
  const translateBeforeX = imageTranslateX;
  const translateBeforeY = imageTranslateY;

  fitGeometryMode = "cover";
  pendingCoverSyncAfterFitExit = false;
  updateFitBackdropState();
  viewportService.syncDiagramSize();

  const rectAfterSync = image.getBoundingClientRect();
  if (isRectValid(rectBefore) && isRectValid(rectAfterSync)) {
    const scaleFromWidth = rectAfterSync.width > 0 ? rectBefore.width / rectAfterSync.width : 1;
    const scaleFromHeight = rectAfterSync.height > 0 ? rectBefore.height / rectAfterSync.height : 1;
    const scaleFactor = Number.isFinite(scaleFromWidth) ? scaleFromWidth : scaleFromHeight;

    currentZoom = Math.max(minZoom, zoomBefore * scaleFactor);
    imageTranslateX = translateBeforeX + (rectBefore.left - rectAfterSync.left);
    imageTranslateY = translateBeforeY + (rectBefore.top - rectAfterSync.top);
  } else {
    const anchor = captureViewportAnchor(anchorClientX, anchorClientY);
    restoreViewportAnchor(anchor);
  }

  viewportService.applyRawTransform();

  const wrapperRect = wrapper.getBoundingClientRect();
  const targetClientX = Number.isFinite(anchorClientX)
    ? anchorClientX
    : wrapperRect.left + wrapperRect.width / 2;
  const targetClientY = Number.isFinite(anchorClientY)
    ? anchorClientY
    : wrapperRect.top + wrapperRect.height / 2;
  if (precisionAnchor && Number.isFinite(precisionAnchor.svgX) && Number.isFinite(precisionAnchor.svgY)) {
    nudgeToSvgAnchor(precisionAnchor.svgX, precisionAnchor.svgY, targetClientX, targetClientY, 2);
  }

  return true;
}

function exitFitAllStateOnly() {
  if (!fitAllMode) return;

  fitAllMode = false;
  fitAllRestoreState = null;
  pendingCoverSyncAfterFitExit = true;
  document.body.classList.remove("diagram-fit-all");
  updateFitBackdropState();
  updateFitButtonState();
}

function disableFitAllForInteraction(anchorClientX = null, anchorClientY = null) {
  if (!fitAllMode) {
    updateFitButtonState();
    return;
  }

  const anchor = captureViewportAnchor(anchorClientX, anchorClientY);
  fitAllMode = false;
  fitAllRestoreState = null;
  document.body.classList.remove("diagram-fit-all");

  viewportService.syncDiagramSize();
  restoreViewportAnchor(anchor);
  viewportService.updateImageTransform();
  updateFitButtonState();
}

function setFitAllMode(enabled, options = {}) {
  const next = Boolean(enabled);
  if (fitAllMode === next) {
    updateFitButtonState();
    return;
  }

  if (next) {
    fitAllRestoreState = {
      zoom: currentZoom,
      translateX: imageTranslateX,
      translateY: imageTranslateY,
    };
  }

  const shouldRestore = options.restore !== false;
  const preserveAnchor = !next && !shouldRestore;
  const anchor = preserveAnchor
    ? captureViewportAnchor(options.anchorClientX, options.anchorClientY)
    : null;

  fitAllMode = next;
  fitGeometryMode = fitAllMode ? "contain" : "cover";
  if (fitAllMode) {
    pendingCoverSyncAfterFitExit = false;
  } else if (options.restore !== false) {
    pendingCoverSyncAfterFitExit = false;
  }
  document.body.classList.toggle("diagram-fit-all", fitAllMode);
  updateFitBackdropState();

  viewportService.syncDiagramSize();
  if (fitAllMode) {
    currentZoom = minZoom;
    viewportService.updateImageTransform();
  } else {
    if (shouldRestore && fitAllRestoreState) {
      currentZoom = fitAllRestoreState.zoom;
      imageTranslateX = fitAllRestoreState.translateX;
      imageTranslateY = fitAllRestoreState.translateY;
    } else if (preserveAnchor) {
      restoreViewportAnchor(anchor);
    } else if (currentZoom <= minZoom + 0.001) {
      viewportService.alignImageAtCurrentZoom("left", "bottom");
    }
    fitAllRestoreState = null;
  }
  viewportService.updateImageTransform();
  updateFitButtonState();
}

function isRectValid(rect) {
  return (
    rect &&
    Number.isFinite(rect.left) &&
    Number.isFinite(rect.top) &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height) &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function pulseGoToElement(element) {
  if (!element || typeof element.getBoundingClientRect !== "function") return;

  const rect = element.getBoundingClientRect();
  if (!isRectValid(rect)) return;

  if (element._mobileGoToPulseEl && element._mobileGoToPulseEl.parentNode) {
    element._mobileGoToPulseEl.parentNode.removeChild(element._mobileGoToPulseEl);
    element._mobileGoToPulseEl = null;
  }

  if (element._mobileGoToPulseTimeout) {
    clearTimeout(element._mobileGoToPulseTimeout);
    element._mobileGoToPulseTimeout = null;
  }

  const indicator = document.createElement("div");
  indicator.className = "mobile-go-to-indicator";
  const size = Math.max(22, Math.min(60, Math.max(rect.width, rect.height) * 1.35));
  indicator.style.width = `${Math.round(size)}px`;
  indicator.style.height = `${Math.round(size)}px`;
  indicator.style.left = `${Math.round(rect.left + rect.width / 2)}px`;
  indicator.style.top = `${Math.round(rect.top + rect.height / 2)}px`;
  document.body.appendChild(indicator);
  element._mobileGoToPulseEl = indicator;

  element._mobileGoToPulseTimeout = setTimeout(() => {
    if (indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
    if (element._mobileGoToPulseEl === indicator) {
      element._mobileGoToPulseEl = null;
    }
    element._mobileGoToPulseTimeout = null;
  }, 3000);
}

function stopHoverPanAnimation() {
  if (!hoverPanAnimationFrame) return;
  cancelAnimationFrame(hoverPanAnimationFrame);
  hoverPanAnimationFrame = null;
}

function getVisibleViewportCenter() {
  const bounds = getVisibleViewportBounds();
  return {
    x: bounds.minX + (bounds.maxX - bounds.minX) / 2,
    y: bounds.minY + (bounds.maxY - bounds.minY) / 2,
  };
}

function getVisibleViewportBounds() {
  const margin = 8;
  let minX = margin;
  let maxX = Math.max(minX + 1, window.innerWidth - margin);
  let minY = margin;
  let maxY = Math.max(minY + 1, window.innerHeight - margin);

  if (filterPanelOpen && filterPanel) {
    const panelRect = filterPanel.getBoundingClientRect();
    if (panelRect.width > 0) {
      const panelOverlapsViewport = panelRect.left < window.innerWidth && panelRect.right > 0;
      if (panelOverlapsViewport) {
        const anchoredRight = panelRect.left >= window.innerWidth * 0.35;
        if (anchoredRight) {
          maxX = Math.min(maxX, panelRect.left - margin);
        } else {
          minX = Math.max(minX, panelRect.right + margin);
        }
      }
    }
  }

  if (maxX <= minX) {
    minX = margin;
    maxX = Math.max(minX + 1, window.innerWidth - margin);
  }

  if (maxY <= minY) {
    minY = margin;
    maxY = Math.max(minY + 1, window.innerHeight - margin);
  }

  return { minX, maxX, minY, maxY };
}

function getRectFromSvgGraphicsElement(element) {
  if (!element || typeof element.getBBox !== "function" || typeof element.getScreenCTM !== "function") {
    return null;
  }

  try {
    const bbox = element.getBBox();
    const ctm = element.getScreenCTM();
    if (!bbox || !ctm || !Number.isFinite(bbox.width) || !Number.isFinite(bbox.height)) {
      return null;
    }
    if (bbox.width <= 0 || bbox.height <= 0) return null;

    const corners = [
      new DOMPoint(bbox.x, bbox.y),
      new DOMPoint(bbox.x + bbox.width, bbox.y),
      new DOMPoint(bbox.x, bbox.y + bbox.height),
      new DOMPoint(bbox.x + bbox.width, bbox.y + bbox.height),
    ].map((point) => point.matrixTransform(ctm));

    const xs = corners.map((point) => point.x);
    const ys = corners.map((point) => point.y);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    const width = right - left;
    const height = bottom - top;

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }

    return { left, top, right, bottom, width, height };
  } catch (_error) {
    return null;
  }
}

function getElementRect(element) {
  if (!element || typeof element.getBoundingClientRect !== "function") return null;
  const rect = element.getBoundingClientRect();
  if (rect && rect.width > 0 && rect.height > 0) {
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  }

  const svgRect = getRectFromSvgGraphicsElement(element);
  if (svgRect) return svgRect;
  return null;
}

function getElementFocusPoint(element) {
  const viewportArea = window.innerWidth * window.innerHeight;
  const candidates = [element];
  const candidateSelector =
    "rect,circle,ellipse,path,polygon,polyline,line,text,foreignObject,use,image";
  if (element && typeof element.querySelectorAll === "function") {
    candidates.push(...Array.from(element.querySelectorAll(candidateSelector)));
  }

  let bestPoint = null;
  let bestScore = Number.POSITIVE_INFINITY;
  candidates.forEach((candidate) => {
    const rect = getElementRect(candidate);
    if (!rect) return;
    const area = rect.width * rect.height;
    if (!Number.isFinite(area) || area <= 1) return;
    if (area > viewportArea * 0.75) return;
    const score = Math.sqrt(area);
    if (score >= bestScore) return;
    bestScore = score;
    bestPoint = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  });

  return bestPoint;
}

function centerHelpRecordInView(record, durationMs = 250, onComplete = null) {
  const element = record && record.element;
  if (!element || typeof element.getBoundingClientRect !== "function") {
    if (typeof onComplete === "function") onComplete();
    return;
  }

  const hasDesktopHover =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (typeof tooltipService !== "undefined" && tooltipService.isMobileDevice() && !hasDesktopHover) {
    if (typeof onComplete === "function") onComplete();
    return;
  }

  stopHoverPanAnimation();
  viewportService.updateImageTransform();

  const wrapperRect = wrapper.getBoundingClientRect();
  const focusPoint = getElementFocusPoint(element);
  const elementRect = element.getBoundingClientRect();
  if (!isRectValid(wrapperRect) || !isRectValid(elementRect)) {
    if (typeof onComplete === "function") onComplete();
    return;
  }

  const viewportCenter = getVisibleViewportCenter();
  const desiredCenterX = viewportCenter.x;
  const desiredCenterY = viewportCenter.y;
  const currentCenterX = focusPoint ? focusPoint.x : elementRect.left + elementRect.width / 2;
  const currentCenterY = focusPoint ? focusPoint.y : elementRect.top + elementRect.height / 2;

  const visibleBounds = getVisibleViewportBounds();
  const VISIBILITY_PADDING = 12;
  const isAlreadyVisible =
    currentCenterX >= visibleBounds.minX + VISIBILITY_PADDING &&
    currentCenterX <= visibleBounds.maxX - VISIBILITY_PADDING &&
    currentCenterY >= visibleBounds.minY + VISIBILITY_PADDING &&
    currentCenterY <= visibleBounds.maxY - VISIBILITY_PADDING;
  if (isAlreadyVisible) {
    if (typeof onComplete === "function") onComplete();
    return;
  }

  const deltaX = desiredCenterX - currentCenterX;
  const deltaY = desiredCenterY - currentCenterY;
  if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
    if (typeof onComplete === "function") onComplete();
    return;
  }

  const startTranslateX = imageTranslateX;
  const startTranslateY = imageTranslateY;
  const endTranslateX = startTranslateX + deltaX;
  const endTranslateY = startTranslateY + deltaY;
  const duration = Math.max(16, Number(durationMs) || 250);
  const startTime = performance.now();

  const step = (now) => {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    imageTranslateX = startTranslateX + (endTranslateX - startTranslateX) * eased;
    imageTranslateY = startTranslateY + (endTranslateY - startTranslateY) * eased;
    viewportService.updateImageTransform();
    if (
      typeof filterHighlightService !== "undefined" &&
      filterHighlightService &&
      typeof filterHighlightService.refreshConnectionPosition === "function"
    ) {
      filterHighlightService.refreshConnectionPosition();
    }

    if (t < 1) {
      hoverPanAnimationFrame = requestAnimationFrame(step);
      return;
    }

    const finalFocusPoint = getElementFocusPoint(element);
    if (finalFocusPoint) {
      const finalDeltaX = desiredCenterX - finalFocusPoint.x;
      const finalDeltaY = desiredCenterY - finalFocusPoint.y;
      if (Math.abs(finalDeltaX) > 1 || Math.abs(finalDeltaY) > 1) {
        imageTranslateX += finalDeltaX;
        imageTranslateY += finalDeltaY;
        viewportService.updateImageTransform();
        if (
          typeof filterHighlightService !== "undefined" &&
          filterHighlightService &&
          typeof filterHighlightService.refreshConnectionPosition === "function"
        ) {
          filterHighlightService.refreshConnectionPosition();
        }
      }
    }

    hoverPanAnimationFrame = null;
    if (typeof onComplete === "function") onComplete();
  };

  hoverPanAnimationFrame = requestAnimationFrame(step);
}

function focusHelpRecord(record, options = {}) {
  if (!record || !record.element || typeof record.element.getBoundingClientRect !== "function") {
    return;
  }

  const preserveFitAll = Boolean(options.preserveFitAll);
  const shouldKeepFitAllZoom = preserveFitAll && fitAllMode;
  if (!shouldKeepFitAllZoom) {
    const targetZoom = Math.min(maxZoom, Math.max(currentZoom, 2));
    currentZoom = targetZoom;
  }
  viewportService.updateImageTransform();

  const wrapperRect = wrapper.getBoundingClientRect();
  const targetRect = record.element.getBoundingClientRect();
  const focusPoint = getElementFocusPoint(record.element);
  if (!isRectValid(wrapperRect) || !isRectValid(targetRect)) {
    return;
  }

  const visibleCenter = getVisibleViewportCenter();
  const viewportCenterX = visibleCenter.x;
  const viewportCenterY = visibleCenter.y;
  const targetCenterX = focusPoint ? focusPoint.x : targetRect.left + targetRect.width / 2;
  const targetCenterY = focusPoint ? focusPoint.y : targetRect.top + targetRect.height / 2;

  imageTranslateX += viewportCenterX - targetCenterX;
  imageTranslateY += viewportCenterY - targetCenterY;
  viewportService.updateImageTransform();
}

function goToHelpRecord(record, options = {}) {
  if (!record || !record.element) return;
  const token = ++goToNavigationToken;

  if (filterPanelOpen && options.closePanel !== false) {
    filterPanelStateService.setFilterPanelOpen(false);
  }

  requestAnimationFrame(() => {
    if (token !== goToNavigationToken) return;
    requestAnimationFrame(() => {
      if (token !== goToNavigationToken) return;
      viewportService.syncDiagramSize();
      focusHelpRecord(record, options);
      pulseGoToElement(record.element);
      if (typeof options.onComplete === "function") {
        options.onComplete();
      }
    });
  });
}

function togglePinnedHelpSlug(slugValue) {
  const slug = `${slugValue || ""}`.trim();
  if (!slug) return;

  const nextPinned = new Set(pinnedHelpSlugs);
  if (nextPinned.has(slug)) {
    nextPinned.delete(slug);
  } else {
    nextPinned.add(slug);
  }

  pinnedHelpSlugs = nextPinned;
  onPinnedStateChanged();
}

if (typeof window.createTagUtilsService !== "function") {
  console.error("Missing tag utils module: createTagUtilsService");
  throw new Error("Missing tag utils module");
}

const tagUtilsService = window.createTagUtilsService({
  getConfig: () => config,
  getTagVisibility: () => tagVisibility,
  getSelectedLevel: () => selectedLevel,
});

if (typeof window.createUserAnnotationPositioningService !== "function") {
  console.error(
    "Missing user annotation positioning module: createUserAnnotationPositioningService",
  );
  throw new Error("Missing user annotation positioning module");
}

const userAnnotationPositioningService =
  window.createUserAnnotationPositioningService({
    getImageBounds: (forceRefresh = false) =>
      viewportService.getImageBounds(forceRefresh),
    getWrapper: () => wrapper,
    getIsTouchActive: () => isTouchActive,
    getUserAnnotations: () => userAnnotations,
    getCurrentZoom: () => currentZoom,
    getMarkerScale: () => (config && config.markerScale) || 0.01,
    getUserAnnotationStyle: (type) =>
      config && config.userAnnotationTypes
        ? config.userAnnotationTypes[type]
        : null,
  });

if (typeof window.createFilterLayoutService !== "function") {
  console.error("Missing filter layout module: createFilterLayoutService");
  throw new Error("Missing filter layout module");
}

const filterLayoutService = window.createFilterLayoutService({
  wrapper,
  image,
  filterPanel,
  filterPanelBackdrop,
  getFilterDockMinImageWidth: () => FILTER_DOCK_MIN_IMAGE_WIDTH,
  getFitAllMode: () => fitAllMode,
  getDiagramAspectRatio: () => diagramAspectRatio,
  getImageTranslateX: () => imageTranslateX,
  getImageTranslateY: () => imageTranslateY,
  setImageTranslateX: (value) => {
    imageTranslateX = value;
  },
  setImageTranslateY: (value) => {
    imageTranslateY = value;
  },
  syncDiagramSize: () => viewportService.syncDiagramSize(),
  updateImageTransform: () => viewportService.updateImageTransform(),
});

if (typeof window.createFilterPanelStateService !== "function") {
  console.error("Missing filter panel state module: createFilterPanelStateService");
  throw new Error("Missing filter panel state module");
}

const filterPanelStateService = window.createFilterPanelStateService({
  filterPanel,
  openFilterPanelBtn,
  filterSearchInput,
  clearFilterHighlight: () => filterHighlightService.clear(),
  getPanelWidthPx: () => filterLayoutService.getPanelWidthPx(),
  updateLayout: (open) => filterLayoutService.updateLayout(open),
  getFilterPanelOpenState: () => filterPanelOpen,
  setFilterPanelOpenState: (value) => {
    filterPanelOpen = value;
  },
  setFilterPanelOverlayMode: (value) => {
    filterPanelOverlayMode = value;
  },
  updateURLState: () => urlStateService.updateURLState(),
});

if (typeof window.createUrlStateService !== "function") {
  console.error("Missing URL state module: createUrlStateService");
  throw new Error("Missing URL state module");
}

const urlStateService = window.createUrlStateService({
  compareTagsByFilterOrder: (a, b) => tagUtilsService.compareTagsByFilterOrder(a, b),
  getTagVisibilityEntries: () => Array.from(tagVisibility.entries()),
  getFilterPanelOpen: () => filterPanelOpen,
  getAnnotationSearchQuery: () => annotationSearchQuery,
  getPinnedSlugs: () => Array.from(pinnedHelpSlugs).sort((a, b) => a.localeCompare(b)),
  getFilterConstraints: () => (onlyShowPinned ? ["pinned"] : []),
  getSelectedLevel: () => selectedLevel,
  getDefaultSelectedLevel: () => maxDiagramLevel,
  getUserAnnotations: () => userAnnotations,
  getMaxUserAnnotations: () => (config && config.maxUserAnnotations) || 10,
  menuVisibleParam: MENU_VISIBLE_PARAM,
  filterHideTagsParam: FILTER_HIDE_TAGS_PARAM,
  filterQueryParam: FILTER_QUERY_PARAM,
  pinsParam: FILTER_PINS_PARAM,
  constraintParam: FILTER_CONSTRAINT_PARAM,
  filterLevelParam: FILTER_LEVEL_PARAM,
});

if (typeof window.createTooltipService !== "function") {
  console.error("Missing tooltip module: createTooltipService");
  throw new Error("Missing tooltip module");
}

const tooltipService = window.createTooltipService({
  getFilterPanelOpen: () => filterPanelOpen,
  getFilterPanelElement: () => filterPanel,
  getTooltipMinWidth: () => (config && config.tooltipMinWidth) || 380,
});

tooltipService.initialize();

if (typeof window.createViewportService !== "function") {
  console.error("Missing viewport module: createViewportService");
  throw new Error("Missing viewport module");
}

const viewportService = window.createViewportService({
  image,
  wrapper,
  getDiagramAspectRatio: () => diagramAspectRatio,
  getFitAllMode: () => fitAllMode,
  getFitGeometryMode: () => fitGeometryMode,
  getMinZoom: () => minZoom,
  getCurrentZoom: () => currentZoom,
  setCurrentZoom: (value) => {
    currentZoom = value;
  },
  getImageTranslateX: () => imageTranslateX,
  setImageTranslateX: (value) => {
    imageTranslateX = value;
  },
  getImageTranslateY: () => imageTranslateY,
  setImageTranslateY: (value) => {
    imageTranslateY = value;
  },
  getCachedBounds: () => cachedBounds,
  setCachedBounds: (value) => {
    cachedBounds = value;
  },
  getIsTouchActive: () => isTouchActive,
  scheduleMarkerPositioning: (immediate) =>
    userAnnotationPositioningService.scheduleMarkerPositioning(immediate),
});

if (typeof window.createViewportInputService !== "function") {
  console.error("Missing viewport input module: createViewportInputService");
  throw new Error("Missing viewport input module");
}

const viewportInputService = window.createViewportInputService({
  image,
  wrapper,
  filterPanel,
  shouldIgnoreWheelEvent: (event) => {
    const target = event && event.target;
    if (!target || typeof target.closest !== "function") {
      return false;
    }

    return Boolean(
      target.closest("#user-annotations-modal") ||
        target.closest("#edit-annotation-modal"),
    );
  },
  clearFilterHighlight: () => filterHighlightService.clear(),
  getFilterPanelOpen: () => filterPanelOpen,
  getFitAllMode: () => fitAllMode,
  maybePromoteFitGeometryToCover: (x, y) => maybePromoteFitGeometryToCover(x, y),
  exitFitAllStateOnly: () => exitFitAllStateOnly(),
  disableFitAllKeepViewport: (options = {}) => disableFitAllKeepViewport(options),
  disableFitAllForInteraction: (x, y) => disableFitAllForInteraction(x, y),
  updateFilterPanelLayout: (options = {}) =>
    filterPanelStateService.updateFilterPanelLayout(options),
  syncDiagramSize: () => viewportService.syncDiagramSize(),
  alignImageAtCurrentZoom: (horizontal, vertical) =>
    viewportService.alignImageAtCurrentZoom(horizontal, vertical),
  centerImageAtCurrentZoom: () => viewportService.centerImageAtCurrentZoom(),
  getImageBounds: (forceRefresh = false) =>
    viewportService.getImageBounds(forceRefresh),
  updateImageTransform: () => viewportService.updateImageTransform(),
  scheduleMarkerPositioning: (immediate) =>
    userAnnotationPositioningService.scheduleMarkerPositioning(immediate),
  getCurrentZoom: () => currentZoom,
  setCurrentZoom: (value) => {
    currentZoom = value;
  },
  getMinZoom: () => minZoom,
  getMaxZoom: () => maxZoom,
  getImageTranslateX: () => imageTranslateX,
  setImageTranslateX: (value) => {
    imageTranslateX = value;
  },
  getImageTranslateY: () => imageTranslateY,
  setImageTranslateY: (value) => {
    imageTranslateY = value;
  },
  getIsPanning: () => isPanning,
  setIsPanning: (value) => {
    isPanning = value;
  },
  getPanStartX: () => panStartX,
  setPanStartX: (value) => {
    panStartX = value;
  },
  getPanStartY: () => panStartY,
  setPanStartY: (value) => {
    panStartY = value;
  },
  getCachedBounds: () => cachedBounds,
  setCachedBounds: (value) => {
    cachedBounds = value;
  },
  getIsTouchActive: () => isTouchActive,
  setIsTouchActive: (value) => {
    isTouchActive = value;
  },
  getFitAllMode: () => fitAllMode,
});

if (typeof window.createThemeService !== "function") {
  console.error("Missing theme module: createThemeService");
  throw new Error("Missing theme module");
}

const themeService = window.createThemeService({
  storageKey: THEME_STORAGE_KEY,
  toggleButton: themeToggleBtn,
});

if (typeof window.createContentUtilsService !== "function") {
  console.error("Missing content utils module: createContentUtilsService");
  throw new Error("Missing content utils module");
}

const contentUtilsService = window.createContentUtilsService({
  getAllowedHtmlTags: () =>
    (config && config.allowedHtmlTags) || ["br", "b", "strong", "i", "em"],
  getHtmlWhitelist: () => (config && config.htmlWhitelist) || {},
});

if (typeof window.createHelpUtilsService !== "function") {
  console.error("Missing help utils module: createHelpUtilsService");
  throw new Error("Missing help utils module");
}

const helpUtilsService = window.createHelpUtilsService({
  cleanMultiline: (value) => contentUtilsService.cleanMultiline(value),
});

if (typeof window.createFilterHighlightService !== "function") {
  console.error("Missing filter highlight module: createFilterHighlightService");
  throw new Error("Missing filter highlight module");
}

const filterHighlightService = window.createFilterHighlightService({
  centerRecordInView: (record, durationMs, onComplete) =>
    centerHelpRecordInView(record, durationMs, onComplete),
});

if (typeof window.createFilterResultsService !== "function") {
  console.error("Missing filter results module: createFilterResultsService");
  throw new Error("Missing filter results module");
}

const filterResultsService = window.createFilterResultsService({
  filterResults,
  getSvgHelpRecords: () => svgHelpRecords,
  getPinnedHelpSlugs: () => pinnedHelpSlugs,
  setPinnedHelpSlugs: (nextSet) => {
    pinnedHelpSlugs = nextSet;
  },
  onPinnedStateChanged,
  onConstraintStateChanged: () => onFilterConstraintStateChanged(),
  getOnlyShowPinned: () => onlyShowPinned,
  setOnlyShowPinned: (value) => {
    onlyShowPinned = Boolean(value);
  },
  setFilterControlsDisabled: (disabled) => {
    const disable = Boolean(disabled);
    filterPanel.classList.toggle("filter-only-pinned-mode", disable);

    filterSearchInput.disabled = disable;
    filterSearchInput.placeholder = disable
      ? "Disabled while only showing pinned"
      : FILTER_SEARCH_PLACEHOLDER_DEFAULT;

    resetFilterBtn.disabled = disable;

    const tagControlInputs = filterTagControls.querySelectorAll(
      "button, input, select, textarea",
    );
    tagControlInputs.forEach((element) => {
      element.disabled = disable;
    });
  },
  getAnnotationSearchQuery: () => annotationSearchQuery,
  normalizeQuery: (query) => helpUtilsService.normalizeQuery(query),
  helpMatchesSearch: (record, query) => helpUtilsService.helpMatchesSearch(record, query),
  isTagSetVisible: (tags) => tagUtilsService.isTagSetVisible(tags),
  isTagSetWithinSelectedLevel: (tags) =>
    tagUtilsService.isTagSetWithinSelectedLevel(tags),
  isTagSetDisabledByHiddenGroup: (tags) =>
    tagUtilsService.isTagSetDisabledByHiddenGroup(tags),
  hasPriorityTag: (tags) => tagUtilsService.hasPriorityTag(tags),
  getHiddenDisableTags: (tags) => tagUtilsService.getHiddenDisableTags(tags),
  getTagLevel: (tags) => tagUtilsService.getTagLevel(tags),
  getSelectedLevel: () => selectedLevel,
  hasPriorityTag: (tags) => tagUtilsService.hasPriorityTag(tags),
  getSortedVisibleTags: (tags) => tagUtilsService.getSortedVisibleTags(tags),
  compareTagsByFilterOrder: (a, b) => tagUtilsService.compareTagsByFilterOrder(a, b),
  buildTagBadgesHtml: (tags) => tagUtilsService.buildTagBadgesHtml(tags),
  getSeverityClassForTags: (tags) => tagUtilsService.getSeverityClassForTags(tags),
  applySeverityStyleToElement: (element, tags) =>
    tagUtilsService.applySeverityStyleToElement(element, tags),
  escapeHTML: (value) => contentUtilsService.escapeHTML(value),
  clearFilterHighlight: () => filterHighlightService.clear(),
  bindResultHighlight: (item, record) =>
    filterHighlightService.bindResultHighlight(item, record),
  highlightResultTemporarily: (record, sourceEl, durationMs) =>
    filterHighlightService.highlightTemporarily(record, sourceEl, durationMs),
  isMobileDevice: () => tooltipService.isMobileDevice(),
  getFilterPanelOpen: () => filterPanelOpen,
  getFilterPanelOverlayMode: () => filterPanelOverlayMode,
  getFitAllMode: () => fitAllMode,
  goToHelpRecord,
  updateSvgElementVisibility: (element) =>
    svgHelpService.updateSvgElementVisibility(element),
  getTaggedElements: () => image.querySelectorAll("[data-tags]"),
  updateFilterResultSummary: (helpVisible, helpTotal, query) => {
    filterResultCount.textContent = helpUtilsService.getFilterResultSummary(
      helpVisible,
      helpTotal,
      query,
    );
  },
});

if (typeof window.createLoadFeedbackService !== "function") {
  console.error("Missing load feedback module: createLoadFeedbackService");
  throw new Error("Missing load feedback module");
}

const loadFeedbackService = window.createLoadFeedbackService({
  getLoadingIndicatorId: () =>
    (config && config.ui && config.ui.loadingIndicatorId) || "loading-indicator",
  getLoadingMessage: () =>
    (config && config.ui && config.ui.loadingMessage) || "Loading diagram...",
});

if (typeof window.createAppLifecycleService !== "function") {
  console.error("Missing app lifecycle module: createAppLifecycleService");
  throw new Error("Missing app lifecycle module");
}

const appLifecycleService = window.createAppLifecycleService({
  image,
  getCurrentZoom: () => currentZoom,
  setCurrentZoom: (value) => {
    currentZoom = value;
  },
  getImageTranslateX: () => imageTranslateX,
  getImageTranslateY: () => imageTranslateY,
  getFilterPanelOpen: () => filterPanelOpen,
  getDiagramSourcePath: () => diagramSourcePath,
  syncDiagramSize: () => viewportService.syncDiagramSize(),
  alignImageAtCurrentZoom: (horizontal, vertical) =>
    viewportService.alignImageAtCurrentZoom(horizontal, vertical),
  centerImageAtCurrentZoom: () => viewportService.centerImageAtCurrentZoom(),
  getFitAllMode: () => fitAllMode,
  updateImageTransform: () => viewportService.updateImageTransform(),
  setFilterPanelOpen: (open) => filterPanelStateService.setFilterPanelOpen(open),
  renderAllMarkers: () => userAnnotationRenderService.renderAllMarkers(),
  clearUserAnnotationVisuals: () => userAnnotationRenderService.clearUserAnnotationVisuals(),
  showLoadingOverlay: () => loadFeedbackService.showLoadingState(),
  hideLoadingOverlay: () => loadFeedbackService.hideLoadingState(),
  showErrorOverlay: (message, isRetryable) =>
    loadFeedbackService.showError(message, isRetryable),
  loadDiagram: () => svgLoaderService.loadDiagram(diagramSourcePath),
});

if (typeof window.createSvgHelpService !== "function") {
  console.error("Missing SVG help module: createSvgHelpService");
  throw new Error("Missing SVG help module");
}

const svgHelpService = window.createSvgHelpService({
  image,
  tooltipLayer,
  parseTags: (tagValue) => tagUtilsService.parseTags(tagValue),
  parseHelpContent: (rawText) => helpUtilsService.parseHelpContent(rawText),
  buildTagBadgesHtml: (tags) => tagUtilsService.buildTagBadgesHtml(tags),
  getCustomCssClassesForTags: (tags) => tagUtilsService.getCustomCssClassesForTags(tags),
  getSeverityClassForTags: (tags) => tagUtilsService.getSeverityClassForTags(tags),
  applySeverityStyleToElement: (element, tags) =>
    tagUtilsService.applySeverityStyleToElement(element, tags),
  escapeHTML: (value) => contentUtilsService.escapeHTML(value),
  tooltipService,
  getEditModeEnabled: () => editModeEnabled,
  getDebugEnabled: () => debug,
  isSlugPinned: (slugValue) => pinnedHelpSlugs.has(`${slugValue || ""}`.trim()),
  togglePinnedSlug: (slugValue) => togglePinnedHelpSlug(slugValue),
  applyAnnotationFilter: () => filterResultsService.applyAnnotationFilter(),
  getOnlyShowPinned: () => onlyShowPinned,
  getTooltipHideDelay: () => (config && config.ui && config.ui.tooltipHideDelay) || 100,
  getTagVisibility: () => tagVisibility,
  isTagSetVisible: (tags) => tagUtilsService.isTagSetVisible(tags),
  isTagSetDisabledByHiddenGroup: (tags) =>
    tagUtilsService.isTagSetDisabledByHiddenGroup(tags),
  isTagSetWithinSelectedLevel: (tags) =>
    tagUtilsService.isTagSetWithinSelectedLevel(tags),
  getHiddenDisableTags: (tags) => tagUtilsService.getHiddenDisableTags(tags),
  getSvgHelpRecordByElement: () => svgHelpRecordByElement,
});

if (typeof window.createSvgLoaderService !== "function") {
  console.error("Missing SVG loader module: createSvgLoaderService");
  throw new Error("Missing SVG loader module");
}

const svgLoaderService = window.createSvgLoaderService({
  image,
  setDiagramAspectRatio: (value) => {
    diagramAspectRatio = value;
  },
  syncDiagramSize: () => viewportService.syncDiagramSize(),
  initializeSvgPropertyAnnotations: () => {
    const nextState = svgHelpService.initializeSvgPropertyAnnotations();
    svgHelpRecords = nextState.records;
    svgHelpRecordByElement = nextState.recordByElement;
    normalizePinnedHelpSlugs();
  },
  initializeTagControls: () => tagControlsService.initializeTagControls(),
  updateFilterPanelLayout: () => filterPanelStateService.updateFilterPanelLayout(),
  handleImageLoad: () => appLifecycleService.handleImageLoad(),
  handleImageError: (error) => appLifecycleService.handleImageError(error),
});

const initialFilterState = urlStateService.parseFilterStateFromURL();
const initialHiddenTags = new Set(initialFilterState.hiddenTags || []);
const hasInitialHiddenTags = Boolean(initialFilterState.hasHiddenTags);
const hasInitialSelectedLevel = Boolean(initialFilterState.hasLevel);
annotationSearchQuery = initialFilterState.query || "";
filterPanelOpen = Boolean(initialFilterState.open);
pinnedHelpSlugs = new Set(initialFilterState.pinnedSlugs || []);
onlyShowPinned = Array.isArray(initialFilterState.constraints)
  ? initialFilterState.constraints.includes("pinned")
  : false;
selectedLevel = Math.max(0, Number.parseInt(initialFilterState.level, 10) || 0);
filterSearchInput.value = annotationSearchQuery;

if (typeof window.createTagControlsService !== "function") {
  console.error("Missing tag controls module: createTagControlsService");
  throw new Error("Missing tag controls module");
}

const tagControlsService = window.createTagControlsService({
  image,
  filterTagControls,
  parseTags: (tagValue) => tagUtilsService.parseTags(tagValue),
  isLevelTag: (tag) => tagUtilsService.isLevelTag(tag),
  isCssTag: (tag) => tagUtilsService.isCssTag(tag),
  getTagLevel: (tags) => tagUtilsService.getTagLevel(tags),
  applyCssTagClassesToElement: (element, tags) => {
    Array.from(element.classList)
      .filter((className) => className.startsWith("custom-"))
      .forEach((className) => element.classList.remove(className));
    tagUtilsService.getCustomCssClassesForTags(tags).forEach((className) => {
      element.classList.add(className);
    });
  },
  getTagMeta: (tag) => tagUtilsService.getTagMeta(tag),
  getTagGroupMeta: (groupId) => tagUtilsService.getTagGroupMeta(groupId),
  getTagVisibility: () => tagVisibility,
  getDiagramTagElements: () => diagramTagElements,
  setDiagramTagElements: (value) => {
    diagramTagElements = value;
  },
  getInitialHiddenTags: () => initialHiddenTags,
  getHasInitialHiddenTags: () => hasInitialHiddenTags,
  getHasInitialSelectedLevel: () => hasInitialSelectedLevel,
  getSelectedLevel: () => selectedLevel,
  setSelectedLevel: (value) => {
    selectedLevel = Math.max(0, Number.parseInt(value, 10) || 0);
  },
  setMaxDiagramLevel: (value) => {
    maxDiagramLevel = Math.max(0, Number.parseInt(value, 10) || 0);
    if (selectedLevel > maxDiagramLevel) {
      selectedLevel = maxDiagramLevel;
    }
  },
  updateSvgElementVisibility: (element) =>
    svgHelpService.updateSvgElementVisibility(element),
  applyAnnotationFilter: () => filterResultsService.applyAnnotationFilter(),
  updateURLState: () => urlStateService.updateURLState(),
});

if (typeof window.createUserAnnotationFormsService !== "function") {
  console.error(
    "Missing user annotation forms module: createUserAnnotationFormsService",
  );
  throw new Error("Missing user annotation forms module");
}

const userAnnotationFormsService = window.createUserAnnotationFormsService({
  processUserDescription: (text) => contentUtilsService.processUserDescription(text),
  getSelectedType: () => selectedType,
  setSelectedType: (value) => {
    selectedType = value;
  },
  getCurrentMode: () => currentMode,
  getUserAnnotations: () => userAnnotations,
  encodeUserAnnotationsToURL: () => urlStateService.encodeUserAnnotationsToURL(),
  renderAllMarkers: () => userAnnotationRenderService.renderAllMarkers(),
  updateUserAnnotationsList: () => userAnnotationListService.updateUserAnnotationsList(),
});

if (typeof window.createUserAnnotationListService !== "function") {
  console.error(
    "Missing user annotation list module: createUserAnnotationListService",
  );
  throw new Error("Missing user annotation list module");
}

const userAnnotationListService = window.createUserAnnotationListService({
  getUserAnnotations: () => userAnnotations,
  getUserAnnotationStyle: (type) =>
    config && config.userAnnotationTypes ? config.userAnnotationTypes[type] : null,
  escapeHTML: (value) => contentUtilsService.escapeHTML(value),
  updateEditDescriptionPreview: () =>
    userAnnotationFormsService.updateEditDescriptionPreview(),
  encodeUserAnnotationsToURL: () => urlStateService.encodeUserAnnotationsToURL(),
  renderAllMarkers: () => userAnnotationRenderService.renderAllMarkers(),
});

if (typeof window.createUserAnnotationHoverService !== "function") {
  console.error(
    "Missing user annotation hover module: createUserAnnotationHoverService",
  );
  throw new Error("Missing user annotation hover module");
}

const userAnnotationHoverService = window.createUserAnnotationHoverService({
  tooltipService,
  getEditModeEnabled: () => editModeEnabled,
  getTooltipHideDelay: () => (config && config.ui && config.ui.tooltipHideDelay) || 100,
  getAreaHoverTolerance: () =>
    (config &&
      config.areaAnnotationConfig &&
      config.areaAnnotationConfig.minHoverDistance) ||
    5,
});

if (typeof window.createUserAnnotationDragService !== "function") {
  console.error(
    "Missing user annotation drag module: createUserAnnotationDragService",
  );
  throw new Error("Missing user annotation drag module");
}

const userAnnotationDragService = window.createUserAnnotationDragService({
  wrapper,
  getImageElement: () => image,
  getEditModeEnabled: () => editModeEnabled,
  getUserAnnotations: () => userAnnotations,
  getUserAnnotationStyle: (type) =>
    config && config.userAnnotationTypes ? config.userAnnotationTypes[type] : null,
  getImageBounds: (forceRefresh = false) =>
    viewportService.getImageBounds(forceRefresh),
  scheduleMarkerPositioning: (immediate) =>
    userAnnotationPositioningService.scheduleMarkerPositioning(immediate),
  encodeUserAnnotationsToURL: () => urlStateService.encodeUserAnnotationsToURL(),
});

if (typeof window.createUserAnnotationRenderService !== "function") {
  console.error(
    "Missing user annotation render module: createUserAnnotationRenderService",
  );
  throw new Error("Missing user annotation render module");
}

const userAnnotationRenderService = window.createUserAnnotationRenderService({
  image,
  wrapper,
  tooltipLayer,
  getUserAnnotations: () => userAnnotations,
  getUserAnnotationStyle: (type) =>
    config && config.userAnnotationTypes ? config.userAnnotationTypes[type] : null,
  getEditModeEnabled: () => editModeEnabled,
  getImageBounds: (forceRefresh = false) =>
    viewportService.getImageBounds(forceRefresh),
  escapeHTML: (value) => contentUtilsService.escapeHTML(value),
  processUserDescription: (value) => contentUtilsService.processUserDescription(value),
  applyAnnotationFilter: () => filterResultsService.applyAnnotationFilter(),
  scheduleMarkerPositioning: (immediate) =>
    userAnnotationPositioningService.scheduleMarkerPositioning(immediate),
  addPointAnnotationHoverEvents: (wrapperEl, tooltip, ann) =>
    userAnnotationHoverService.addPointAnnotationHoverEvents(wrapperEl, tooltip, ann),
  addUserAnnotationDragListeners: (wrapperEl, marker, index) =>
    userAnnotationDragService.addUserAnnotationDragListeners(wrapperEl, marker, index),
  addAreaResizeHandles: (areaElement, ann, index) =>
    userAnnotationDragService.addAreaResizeHandles(areaElement, ann, index),
  addAreaAnnotationHoverEvents: (areaElement, tooltip, ann) =>
    userAnnotationHoverService.addAreaAnnotationHoverEvents(areaElement, tooltip, ann),
  addAreaAnnotationDragListeners: (wrapperEl, areaElement, index) =>
    userAnnotationDragService.addAreaAnnotationDragListeners(
      wrapperEl,
      areaElement,
      index,
    ),
});

if (typeof window.createUserAnnotationPlacementService !== "function") {
  console.error(
    "Missing user annotation placement module: createUserAnnotationPlacementService",
  );
  throw new Error("Missing user annotation placement module");
}

const userAnnotationPlacementService = window.createUserAnnotationPlacementService({
  getWrapper: () => wrapper,
  getImageElement: () => image,
  getUserAnnotations: () => userAnnotations,
  getUserAnnotationStyle: (type) =>
    config && config.userAnnotationTypes ? config.userAnnotationTypes[type] : null,
  getImageBounds: (forceRefresh = false) =>
    viewportService.getImageBounds(forceRefresh),
  getCurrentZoom: () => currentZoom,
  getMaxUserAnnotations: () => (config && config.maxUserAnnotations) || 10,
  clearInlineForm: () => userAnnotationFormsService.clearInlineForm(),
  encodeUserAnnotationsToURL: () => urlStateService.encodeUserAnnotationsToURL(),
  renderAllMarkers: () => userAnnotationRenderService.renderAllMarkers(),
  updateUserAnnotationsList: () => userAnnotationListService.updateUserAnnotationsList(),
  addAreaAnnotationHoverEvents: (areaElement, tooltip, ann) =>
    userAnnotationHoverService.addAreaAnnotationHoverEvents(areaElement, tooltip, ann),
  addPointAnnotationHoverEvents: (wrapperEl, tooltip, ann) =>
    userAnnotationHoverService.addPointAnnotationHoverEvents(wrapperEl, tooltip, ann),
  setEditModeEnabled: (value) => {
    editModeEnabled = value;
  },
  updateUserAnnotationDragState: () =>
    userAnnotationDragService.updateUserAnnotationDragState(),
  updateEditModeButtonVisibility: () => {
    const exitEditModeBtn = document.getElementById("exit-edit-mode");
    if (exitEditModeBtn) {
      exitEditModeBtn.style.display = editModeEnabled ? "inline-block" : "none";
    }
  },
});

if (typeof window.createUserAnnotationInitService !== "function") {
  console.error(
    "Missing user annotation init module: createUserAnnotationInitService",
  );
  throw new Error("Missing user annotation init module");
}

const userAnnotationInitService = window.createUserAnnotationInitService({
  getConfig: () => config,
  getCurrentMode: () => currentMode,
  setCurrentMode: (value) => {
    currentMode = value;
  },
  getSelectedType: () => selectedType,
  setSelectedType: (value) => {
    selectedType = value;
  },
  getUserAnnotations: () => userAnnotations,
  setUserAnnotations: (value) => {
    userAnnotations = value;
  },
  setEditModeEnabled: (value) => {
    editModeEnabled = value;
  },
  isPlacementModeActive: () => userAnnotationPlacementService.isPlacementModeActive(),
  cleanupPlacementMode: () => userAnnotationPlacementService.cleanupPlacementMode(),
  startAddAnnotationModeWithData: (annotationData) =>
    userAnnotationPlacementService.startAddAnnotationModeWithData(annotationData),
  updateInlineFormValidation: () =>
    userAnnotationFormsService.updateInlineFormValidation(),
  updateUserAnnotationsList: () => userAnnotationListService.updateUserAnnotationsList(),
  updateUserAnnotationDragState: () =>
    userAnnotationDragService.updateUserAnnotationDragState(),
  updateEditModeButtonVisibility: () => {
    const exitEditModeBtn = document.getElementById("exit-edit-mode");
    if (exitEditModeBtn) {
      exitEditModeBtn.style.display = editModeEnabled ? "inline-block" : "none";
    }
  },
  clearInlineForm: () => userAnnotationFormsService.clearInlineForm(),
  initializeInlineForm: () => userAnnotationFormsService.initializeInlineForm(),
  initializeEditForm: () => userAnnotationFormsService.initializeEditForm(),
  encodeUserAnnotationsToURL: () => urlStateService.encodeUserAnnotationsToURL(),
  renderAllMarkers: () => userAnnotationRenderService.renderAllMarkers(),
});

if (typeof window.createFilterPanelInputService !== "function") {
  console.error("Missing filter panel input module: createFilterPanelInputService");
  throw new Error("Missing filter panel input module");
}

const filterPanelInputService = window.createFilterPanelInputService({
  filterPanel,
  filterPanelBackdrop,
  openFilterPanelBtn,
  closeFilterPanelBtn,
  filterSearchInput,
  resetFilterBtn,
  getFilterPanelOpen: () => filterPanelOpen,
  getFilterPanelOverlayMode: () => filterPanelOverlayMode,
  setFilterPanelOpen: (open) => filterPanelStateService.setFilterPanelOpen(open),
  getTagVisibility: () => tagVisibility,
  setAnnotationSearchQuery: (value) => {
    annotationSearchQuery = value;
  },
  applyAnnotationFilter: () => filterResultsService.applyAnnotationFilter(),
  initializeTagControls: () => tagControlsService.initializeTagControls(),
  updateURLState: () => urlStateService.updateURLState(),
  isAnyAnnotationModalOpen: () => {
    const userModal = document.getElementById("user-annotations-modal");
    const editModal = document.getElementById("edit-annotation-modal");
    return (
      (userModal && userModal.style.display !== "none") ||
      (editModal && editModal.style.display !== "none")
    );
  },
});

// Initialize user annotations from URL
userAnnotations = urlStateService.parseUserAnnotationsFromURL();

diagramSourcePath = debug
  ? (config && config.imagePaths && config.imagePaths.debug) ||
    "./kubesec-diagram.svg"
  : (config && config.imagePaths && config.imagePaths.production) ||
    "./kubesec-diagram.svg";

themeToggleBtn.addEventListener("click", () => {
  themeService.toggleTheme();
});

fitToViewportBtn.addEventListener("click", () => {
  setFitAllMode(!fitAllMode);
});

updateFitButtonState();

filterPanelInputService.initialize();

// Show loading state immediately
appLifecycleService.start();

viewportInputService.initialize();

// updateTypePreview function removed - type selection is now visual

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () =>
    userAnnotationInitService.initializeUserAnnotationsUI(),
  );
} else {
  userAnnotationInitService.initializeUserAnnotationsUI();
}

// Handle window resize for area annotations
window.addEventListener("resize", () => {
  // Re-position all markers on window resize
  userAnnotationPositioningService.scheduleMarkerPositioning();
});
