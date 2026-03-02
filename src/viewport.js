window.createViewportService = function createViewportService(deps) {
  const PAN_INDICATOR_EPSILON = 2;
  const FIT_ALL_INSET = 20;
  const FIT_ALL_GAP_EPSILON = 0.75;
  let panIndicatorLayer = null;
  let panIndicatorUp = null;
  let panIndicatorRight = null;
  let panIndicatorDown = null;
  let panIndicatorLeft = null;

  function ensurePanIndicatorLayer() {
    if (panIndicatorLayer) return;

    panIndicatorLayer = document.createElement("div");
    panIndicatorLayer.className = "pan-indicator-layer";

    panIndicatorUp = document.createElement("div");
    panIndicatorUp.className = "pan-indicator pan-indicator-up";

    panIndicatorRight = document.createElement("div");
    panIndicatorRight.className = "pan-indicator pan-indicator-right";

    panIndicatorDown = document.createElement("div");
    panIndicatorDown.className = "pan-indicator pan-indicator-down";

    panIndicatorLeft = document.createElement("div");
    panIndicatorLeft.className = "pan-indicator pan-indicator-left";

    panIndicatorLayer.appendChild(panIndicatorUp);
    panIndicatorLayer.appendChild(panIndicatorRight);
    panIndicatorLayer.appendChild(panIndicatorDown);
    panIndicatorLayer.appendChild(panIndicatorLeft);

    deps.wrapper.appendChild(panIndicatorLayer);
  }

  function setIndicatorVisible(indicator, visible) {
    if (!indicator) return;
    indicator.classList.toggle("active", Boolean(visible));
  }

  function getAxisTranslate(alignment, viewportSize, scaledSize) {
    if (alignment === "right" || alignment === "bottom") {
      return viewportSize - scaledSize;
    }
    if (alignment === "center") {
      return (viewportSize - scaledSize) / 2;
    }
    return 0;
  }

  function updatePanIndicators(viewportWidth, viewportHeight, scaledWidth, scaledHeight) {
    ensurePanIndicatorLayer();

    const imageTranslateX = deps.getImageTranslateX();
    const imageTranslateY = deps.getImageTranslateY();
    const minX = viewportWidth - scaledWidth;
    const minY = viewportHeight - scaledHeight;

    const canRevealLeft = scaledWidth > viewportWidth && imageTranslateX < -PAN_INDICATOR_EPSILON;
    const canRevealRight =
      scaledWidth > viewportWidth && imageTranslateX > minX + PAN_INDICATOR_EPSILON;
    const canRevealTop = scaledHeight > viewportHeight && imageTranslateY < -PAN_INDICATOR_EPSILON;
    const canRevealBottom =
      scaledHeight > viewportHeight && imageTranslateY > minY + PAN_INDICATOR_EPSILON;

    setIndicatorVisible(panIndicatorLeft, canRevealLeft);
    setIndicatorVisible(panIndicatorRight, canRevealRight);
    setIndicatorVisible(panIndicatorUp, canRevealTop);
    setIndicatorVisible(panIndicatorDown, canRevealBottom);
  }

  function syncDiagramSize() {
    const wrapperStyles = window.getComputedStyle(deps.wrapper);
    const padLeft = Number.parseFloat(wrapperStyles.paddingLeft) || 0;
    const padRight = Number.parseFloat(wrapperStyles.paddingRight) || 0;
    const padTop = Number.parseFloat(wrapperStyles.paddingTop) || 0;
    const padBottom = Number.parseFloat(wrapperStyles.paddingBottom) || 0;

    const viewportWidth = Math.max(
      1,
      (deps.wrapper.clientWidth || window.innerWidth) - padLeft - padRight,
    );
    const viewportHeight = Math.max(
      1,
      (deps.wrapper.clientHeight || window.innerHeight) - padTop - padBottom,
    );

    const viewportAspectRatio = viewportWidth / Math.max(1, viewportHeight);
    const diagramAspectRatio = deps.getDiagramAspectRatio();
    const hasAspectRatio =
      Number.isFinite(diagramAspectRatio) && diagramAspectRatio > 0;
    const fitAllMode = typeof deps.getFitAllMode === "function" ? deps.getFitAllMode() : false;
    const fitGeometryMode =
      typeof deps.getFitGeometryMode === "function" ? deps.getFitGeometryMode() : "cover";
    const useContainFit = fitGeometryMode === "contain";

    if (hasAspectRatio) {
      const fitByHeight = useContainFit
        ? viewportAspectRatio > diagramAspectRatio
        : viewportAspectRatio < diagramAspectRatio;
      if (fitByHeight) {
        const fittedWidth = Math.max(1, viewportHeight * diagramAspectRatio);
        deps.image.style.height = `${viewportHeight}px`;
        deps.image.style.width = `${fittedWidth}px`;
      } else {
        const fittedHeight = Math.max(1, viewportWidth / diagramAspectRatio);
        deps.image.style.width = `${viewportWidth}px`;
        deps.image.style.height = `${fittedHeight}px`;
      }
    } else {
      deps.image.style.width = `${viewportWidth}px`;
      deps.image.style.height = `${viewportHeight}px`;
    }

    deps.setCachedBounds(null);
  }

  function clampPanToBounds() {
    const displayedWidth = deps.image.offsetWidth || deps.image.clientWidth;
    const displayedHeight = deps.image.offsetHeight || deps.image.clientHeight;
    const wrapperStyles = window.getComputedStyle(deps.wrapper);
    const padLeft = Number.parseFloat(wrapperStyles.paddingLeft) || 0;
    const padRight = Number.parseFloat(wrapperStyles.paddingRight) || 0;
    const padTop = Number.parseFloat(wrapperStyles.paddingTop) || 0;
    const padBottom = Number.parseFloat(wrapperStyles.paddingBottom) || 0;

    const viewportWidth = Math.max(
      1,
      (deps.wrapper.clientWidth || window.innerWidth) - padLeft - padRight,
    );
    const viewportHeight = Math.max(
      1,
      (deps.wrapper.clientHeight || window.innerHeight) - padTop - padBottom,
    );

    if (!displayedWidth || !displayedHeight || !viewportWidth || !viewportHeight) {
      return;
    }

    const currentZoom = deps.getCurrentZoom();
    const minZoom = typeof deps.getMinZoom === "function" ? deps.getMinZoom() : 1;

    let imageTranslateX = deps.getImageTranslateX();
    let imageTranslateY = deps.getImageTranslateY();

    const scaledWidth = displayedWidth * currentZoom;
    const scaledHeight = displayedHeight * currentZoom;
    const fitAllMode = typeof deps.getFitAllMode === "function" ? deps.getFitAllMode() : false;
    const fitGeometryMode =
      typeof deps.getFitGeometryMode === "function" ? deps.getFitGeometryMode() : "cover";

    if (!fitAllMode && fitGeometryMode === "contain") {
      return;
    }
    const gapX = Math.max(0, viewportWidth - scaledWidth);
    const gapY = Math.max(0, viewportHeight - scaledHeight);
    const hasGapX = gapX > FIT_ALL_GAP_EPSILON;
    const hasGapY = gapY > FIT_ALL_GAP_EPSILON;
    const insetAxis =
      fitAllMode && hasGapX && hasGapY
        ? gapX >= gapY
          ? "x"
          : "y"
        : null;

    if (scaledWidth > viewportWidth) {
      const minX = viewportWidth - scaledWidth;
      const maxX = 0;
      imageTranslateX = Math.max(minX, Math.min(imageTranslateX, maxX));
    } else {
      if (fitAllMode) {
        const useInsetX = insetAxis === "x" || (!insetAxis && hasGapX && !hasGapY);
        imageTranslateX =
          useInsetX && gapX >= FIT_ALL_INSET * 2
            ? FIT_ALL_INSET + (gapX - FIT_ALL_INSET * 2) / 2
            : gapX / 2;
      } else if (currentZoom > minZoom + 0.0001) {
        const minX = 0;
        const maxX = Math.max(0, viewportWidth - scaledWidth);
        imageTranslateX = Math.max(minX, Math.min(imageTranslateX, maxX));
      } else {
        imageTranslateX = getAxisTranslate("left", viewportWidth, scaledWidth);
      }
    }

    if (scaledHeight > viewportHeight) {
      const minY = viewportHeight - scaledHeight;
      const maxY = 0;
      imageTranslateY = Math.max(minY, Math.min(imageTranslateY, maxY));
    } else {
      if (fitAllMode) {
        const useInsetY = insetAxis === "y" || (!insetAxis && hasGapY && !hasGapX);
        imageTranslateY =
          useInsetY && gapY >= FIT_ALL_INSET * 2
            ? FIT_ALL_INSET + (gapY - FIT_ALL_INSET * 2) / 2
            : gapY / 2;
      } else if (currentZoom > minZoom + 0.0001) {
        const minY = 0;
        const maxY = Math.max(0, viewportHeight - scaledHeight);
        imageTranslateY = Math.max(minY, Math.min(imageTranslateY, maxY));
      } else {
        imageTranslateY = getAxisTranslate("bottom", viewportHeight, scaledHeight);
      }
    }

    deps.setImageTranslateX(imageTranslateX);
    deps.setImageTranslateY(imageTranslateY);
  }

  function alignImageAtCurrentZoom(horizontal = "center", vertical = "center") {
    const displayedWidth = deps.image.offsetWidth || deps.image.clientWidth;
    const displayedHeight = deps.image.offsetHeight || deps.image.clientHeight;
    const wrapperStyles = window.getComputedStyle(deps.wrapper);
    const padLeft = Number.parseFloat(wrapperStyles.paddingLeft) || 0;
    const padRight = Number.parseFloat(wrapperStyles.paddingRight) || 0;
    const padTop = Number.parseFloat(wrapperStyles.paddingTop) || 0;
    const padBottom = Number.parseFloat(wrapperStyles.paddingBottom) || 0;

    const viewportWidth = Math.max(
      1,
      (deps.wrapper.clientWidth || window.innerWidth) - padLeft - padRight,
    );
    const viewportHeight = Math.max(
      1,
      (deps.wrapper.clientHeight || window.innerHeight) - padTop - padBottom,
    );

    const currentZoom = deps.getCurrentZoom();
    const scaledWidth = displayedWidth * currentZoom;
    const scaledHeight = displayedHeight * currentZoom;

    deps.setImageTranslateX(getAxisTranslate(horizontal, viewportWidth, scaledWidth));
    deps.setImageTranslateY(getAxisTranslate(vertical, viewportHeight, scaledHeight));
  }

  function centerImageAtCurrentZoom() {
    alignImageAtCurrentZoom("center", "center");
  }

  function getImageBounds(forceRefresh = false) {
    const cachedBounds = deps.getCachedBounds();
    const isTouchActive = deps.getIsTouchActive();

    if (!forceRefresh && isTouchActive && cachedBounds) {
      const imageTranslateX = deps.getImageTranslateX();
      const imageTranslateY = deps.getImageTranslateY();
      return {
        ...cachedBounds,
        left: cachedBounds.left + imageTranslateX,
        top: cachedBounds.top + imageTranslateY,
        right: cachedBounds.right + imageTranslateX,
        bottom: cachedBounds.bottom + imageTranslateY,
      };
    }

    if (forceRefresh || !cachedBounds) {
      void deps.image.offsetHeight;
    }

    const imageRect = deps.image.getBoundingClientRect();
    const baseWidth = deps.image.offsetWidth || deps.image.clientWidth;
    const baseHeight = deps.image.offsetHeight || deps.image.clientHeight;
    let displayedWidth = baseWidth;
    let displayedHeight = baseHeight;

    const diagramAspectRatio = deps.getDiagramAspectRatio();
    const hasAspectRatio =
      Number.isFinite(diagramAspectRatio) && diagramAspectRatio > 0;
    if (hasAspectRatio && baseWidth > 0 && baseHeight > 0) {
      const elementAspectRatio = baseWidth / baseHeight;
      if (elementAspectRatio > diagramAspectRatio) {
        displayedHeight = baseHeight;
        displayedWidth = displayedHeight * diagramAspectRatio;
      } else {
        displayedWidth = baseWidth;
        displayedHeight = displayedWidth / diagramAspectRatio;
      }
    }

    const bounds = {
      left: imageRect.left,
      top: imageRect.top,
      width: displayedWidth,
      height: displayedHeight,
      right: imageRect.left + displayedWidth,
      bottom: imageRect.top + displayedHeight,
    };

    if (!isTouchActive) {
      deps.setCachedBounds({
        left: imageRect.left,
        top: imageRect.top,
        width: displayedWidth,
        height: displayedHeight,
        right: imageRect.left + displayedWidth,
        bottom: imageRect.top + displayedHeight,
      });
    }

    return bounds;
  }

  function updateImageTransform() {
    clampPanToBounds();

    const currentZoom = deps.getCurrentZoom();
    const imageTranslateX = deps.getImageTranslateX();
    const imageTranslateY = deps.getImageTranslateY();
    deps.image.style.transform = `matrix(${currentZoom}, 0, 0, ${currentZoom}, ${imageTranslateX}, ${imageTranslateY})`;
    const displayedWidth = deps.image.offsetWidth || deps.image.clientWidth;
    const displayedHeight = deps.image.offsetHeight || deps.image.clientHeight;
    const wrapperStyles = window.getComputedStyle(deps.wrapper);
    const padLeft = Number.parseFloat(wrapperStyles.paddingLeft) || 0;
    const padRight = Number.parseFloat(wrapperStyles.paddingRight) || 0;
    const padTop = Number.parseFloat(wrapperStyles.paddingTop) || 0;
    const padBottom = Number.parseFloat(wrapperStyles.paddingBottom) || 0;
    const viewportWidth = Math.max(
      1,
      (deps.wrapper.clientWidth || window.innerWidth) - padLeft - padRight,
    );
    const viewportHeight = Math.max(
      1,
      (deps.wrapper.clientHeight || window.innerHeight) - padTop - padBottom,
    );
    const canPan =
      displayedWidth * currentZoom > viewportWidth ||
      displayedHeight * currentZoom > viewportHeight;
    deps.image.style.cursor = canPan ? "grab" : "default";

    updatePanIndicators(viewportWidth, viewportHeight, displayedWidth * currentZoom, displayedHeight * currentZoom);

    deps.scheduleMarkerPositioning(deps.getIsTouchActive());
  }

  function applyRawTransform() {
    const currentZoom = deps.getCurrentZoom();
    const imageTranslateX = deps.getImageTranslateX();
    const imageTranslateY = deps.getImageTranslateY();
    deps.image.style.transform = `matrix(${currentZoom}, 0, 0, ${currentZoom}, ${imageTranslateX}, ${imageTranslateY})`;

    const displayedWidth = deps.image.offsetWidth || deps.image.clientWidth;
    const displayedHeight = deps.image.offsetHeight || deps.image.clientHeight;
    const wrapperStyles = window.getComputedStyle(deps.wrapper);
    const padLeft = Number.parseFloat(wrapperStyles.paddingLeft) || 0;
    const padRight = Number.parseFloat(wrapperStyles.paddingRight) || 0;
    const padTop = Number.parseFloat(wrapperStyles.paddingTop) || 0;
    const padBottom = Number.parseFloat(wrapperStyles.paddingBottom) || 0;
    const viewportWidth = Math.max(
      1,
      (deps.wrapper.clientWidth || window.innerWidth) - padLeft - padRight,
    );
    const viewportHeight = Math.max(
      1,
      (deps.wrapper.clientHeight || window.innerHeight) - padTop - padBottom,
    );
    const canPan =
      displayedWidth * currentZoom > viewportWidth ||
      displayedHeight * currentZoom > viewportHeight;
    deps.image.style.cursor = canPan ? "grab" : "default";

    updatePanIndicators(
      viewportWidth,
      viewportHeight,
      displayedWidth * currentZoom,
      displayedHeight * currentZoom,
    );

    deps.scheduleMarkerPositioning(deps.getIsTouchActive());
  }

  return {
    syncDiagramSize,
    clampPanToBounds,
    alignImageAtCurrentZoom,
    centerImageAtCurrentZoom,
    getImageBounds,
    updateImageTransform,
    applyRawTransform,
  };
};
