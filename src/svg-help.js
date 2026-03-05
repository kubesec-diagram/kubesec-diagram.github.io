window.createSvgHelpService = function createSvgHelpService(deps) {
  function applyCssTagClasses(element, tags) {
    if (!element || !Array.isArray(tags)) return;

    Array.from(element.classList)
      .filter((className) => className.startsWith("custom-"))
      .forEach((className) => element.classList.remove(className));

    const customClasses =
      typeof deps.getCustomCssClassesForTags === "function"
        ? deps.getCustomCssClassesForTags(tags)
        : [];
    customClasses.forEach((className) => element.classList.add(className));
  }

  function getElementSlug(targetEl) {
    return `${targetEl.getAttribute("data-slug") || ""}`.trim();
  }

  function updateTooltipPinButtonState(targetEl, pinned) {
    if (!targetEl || !targetEl._svgPropertyTooltip) return;
    const pinBtn = targetEl._svgPropertyTooltip.querySelector('[data-role="tooltip-pin"]');
    if (!pinBtn) return;
    pinBtn.classList.toggle("is-pinned", pinned);
    pinBtn.setAttribute("aria-pressed", pinned ? "true" : "false");
    pinBtn.setAttribute("title", pinned ? "Unpin" : "Pin");
    pinBtn.textContent = pinned ? "📌 Unpin" : "📌 Pin";
  }

  function applyPinnedVisualState(targetEl) {
    const slug = getElementSlug(targetEl);
    const pinned = slug ? deps.isSlugPinned(slug) : false;
    const showPinnedHighlight = pinned && !(deps.getOnlyShowPinned && deps.getOnlyShowPinned());
    targetEl.classList.toggle("svg-help-pinned", showPinnedHighlight);
    targetEl.setAttribute("data-pinned", pinned ? "true" : "false");
    updateTooltipPinButtonState(targetEl, pinned);
  }

  function refreshPinnedStates() {
    const annotationElements = Array.from(deps.image.querySelectorAll("[data-help]"));
    annotationElements.forEach((targetEl) => applyPinnedVisualState(targetEl));
  }

  function runDebugSlugValidation(annotationElements) {
    if (!deps.getDebugEnabled || !deps.getDebugEnabled()) return;

    const errors = [];
    const slugToElements = new Map();

    annotationElements.forEach((targetEl, index) => {
      const slug = `${targetEl.getAttribute("data-slug") || ""}`.trim();
      const elementId = targetEl.getAttribute("id") || "(no id)";
      const rawHelp = targetEl.getAttribute("data-help") || "";
      const title = rawHelp.split("\n")[0].trim() || "(no title)";

      if (!slug) {
        errors.push({
          type: "missing-data-slug",
          id: elementId,
          title,
          index,
        });
        return;
      }

      if (!slugToElements.has(slug)) {
        slugToElements.set(slug, []);
      }
      slugToElements.get(slug).push({ id: elementId, title, index });
    });

    slugToElements.forEach((entries, slug) => {
      if (entries.length <= 1) return;
      errors.push({
        type: "duplicate-data-slug",
        slug,
        entries,
      });
    });

    if (errors.length > 0) {
      console.groupCollapsed(
        `[DEBUG] data-slug validation failed (${errors.length} issues)`,
      );
      console.error(
        "All [data-help] elements must have non-empty unique data-slug.",
      );
      errors.forEach((issue, i) => {
        console.error(`${i + 1}.`, issue);
      });
      console.groupEnd();
    }
  }

  function initializeSvgPropertyAnnotations() {
    const existingTooltips = deps.tooltipLayer.querySelectorAll(
      ".svg-property-tooltip",
    );
    existingTooltips.forEach((tip) => tip.remove());

    const records = [];
    const recordByElement = new Map();

    const annotationElements = Array.from(
      deps.image.querySelectorAll("[data-help]"),
    );
    runDebugSlugValidation(annotationElements);
    annotationElements.forEach((targetEl) => {
      const rawText = targetEl.getAttribute("data-help");
      const parsedHelp = deps.parseHelpContent(rawText);
      if (!parsedHelp) return;

      const tooltip = document.createElement("div");
      const slug = getElementSlug(targetEl);
      const tags = deps.parseTags(targetEl.getAttribute("data-tags"));
      applyCssTagClasses(targetEl, tags);
      const tooltipTags = deps.buildTagBadgesHtml(tags);
      const pinActionHtml = slug
        ? '<button type="button" class="tooltip-pin-btn" data-role="tooltip-pin" aria-pressed="false" title="Pin">📌 Pin</button>'
        : "";
      const footerParts = [];
      if (tooltipTags) {
        footerParts.push(`<div class="tooltip-tag-wrap">${tooltipTags}</div>`);
      }
      if (pinActionHtml) {
        footerParts.push(pinActionHtml);
      }
      const tooltipFooterHtml = footerParts.length
        ? `<div class="tooltip-actions">${footerParts.join("")}</div>`
        : "";
      tooltip.className = `tooltip-box svg-property-tooltip ${deps.getSeverityClassForTags(tags)}`;
      tooltip.innerHTML = `<div class="tooltip-head"><b>${deps.escapeHTML(parsedHelp.title)}</b></div><div class="tooltip-content">${parsedHelp.bodyHtml || ""}</div>${tooltipFooterHtml}`;
      deps.applySeverityStyleToElement(tooltip, tags);
      tooltip.style.display = "none";
      tooltip.style.whiteSpace = "pre-wrap";
      deps.tooltipLayer.appendChild(tooltip);

      const tooltipTagBadges = tooltip.querySelector(".annotation-tag-badges");
      if (tooltipTagBadges) {
        tooltipTagBadges.classList.add("tooltip-tag-badges");
      }

      targetEl.style.cursor = "pointer";
      targetEl.style.opacity = "0";
      targetEl.style.display = "none";
      targetEl._svgPropertyTooltip = tooltip;

      const record = {
        element: targetEl,
        tooltip,
        title: parsedHelp.title,
        bodyHtml: parsedHelp.bodyHtml,
        searchText: parsedHelp.searchText,
        searchMatch: false,
        tags,
        slug,
      };
      records.push(record);
      recordByElement.set(targetEl, record);
      applyPinnedVisualState(targetEl);

      let hideTimeout;

      targetEl.addEventListener("mouseenter", (e) => {
        if (deps.getEditModeEnabled()) return;
        clearTimeout(hideTimeout);
        deps.tooltipService.showForSvgElement(tooltip, targetEl, e);
      });

      targetEl.addEventListener("mouseleave", () => {
        hideTimeout = setTimeout(() => {
          tooltip.style.display = "none";
        }, deps.getTooltipHideDelay());
      });

      targetEl.addEventListener("touchstart", (e) => {
        if (deps.getEditModeEnabled()) return;

        if (e.cancelable) e.preventDefault();
        clearTimeout(hideTimeout);

        if (deps.tooltipService.isMobileDevice()) {
          const touch = e.touches && e.touches[0];
          const anchorPoint = touch
            ? { x: touch.clientX, y: touch.clientY }
            : null;
          deps.tooltipService.showMobile(tooltip, tooltip.innerHTML, anchorPoint);
        } else {
          deps.tooltipService.showForSvgElement(tooltip, targetEl);
        }
      });

      tooltip.addEventListener("mouseenter", () => clearTimeout(hideTimeout));
      const onTooltipPinInteraction = (event) => {
        const eventTarget = event.target instanceof Element ? event.target : null;
        const pinBtn = eventTarget
          ? eventTarget.closest('[data-role="tooltip-pin"]')
          : null;
        if (!pinBtn) return;
        event.preventDefault();
        event.stopPropagation();
        const slug = getElementSlug(targetEl);
        if (!slug) return;
        deps.togglePinnedSlug(slug);
        applyPinnedVisualState(targetEl);
        deps.applyAnnotationFilter();
      };

      tooltip.addEventListener("click", onTooltipPinInteraction);
      tooltip.addEventListener("touchend", onTooltipPinInteraction, { passive: false });
      tooltip.addEventListener("mouseleave", () => {
        hideTimeout = setTimeout(() => {
          tooltip.style.display = "none";
        }, deps.getTooltipHideDelay());
      });
    });

    return { records, recordByElement };
  }

  function updateSvgElementVisibility(element) {
    const onlyShowPinned = deps.getOnlyShowPinned && deps.getOnlyShowPinned();
    const tags = deps.parseTags(element.getAttribute("data-tags"));
    const slug = getElementSlug(element);
    const pinned = slug ? deps.isSlugPinned(slug) : false;
    const visibleByAllTags = deps.isTagSetVisible
      ? deps.isTagSetVisible(tags)
      : tags.every((tag) => deps.getTagVisibility().get(tag) !== false);
    const hiddenByDisabledGroup = deps.isTagSetDisabledByHiddenGroup
      ? deps.isTagSetDisabledByHiddenGroup(tags)
      : false;
    const hiddenByLevel = deps.isTagSetWithinSelectedLevel
      ? !deps.isTagSetWithinSelectedLevel(tags)
      : false;
    const constrainByPinned = onlyShowPinned && slug.length > 0;
    const visibleByPinnedConstraint = constrainByPinned ? pinned : true;
    const visibleByTags = hiddenByDisabledGroup || hiddenByLevel ? false : pinned || visibleByAllTags;
    const helpRecord = deps.getSvgHelpRecordByElement().get(element);
    const visibleBySearch = pinned ? true : helpRecord ? helpRecord.searchMatch !== false : true;
    const shouldShow = visibleByPinnedConstraint && visibleByTags && visibleBySearch;

    if (!element._visibilityInitialized) {
      element._visibilityInitialized = true;
      if (shouldShow) {
        element.style.removeProperty("display");
        element.style.opacity = "1";
      } else {
        element.style.opacity = "0";
        element.style.display = "none";
        if (element._svgPropertyTooltip) {
          element._svgPropertyTooltip.style.display = "none";
        }
      }
      return;
    }

    if (element._visibilityFadeTimeout) {
      clearTimeout(element._visibilityFadeTimeout);
      element._visibilityFadeTimeout = null;
    }

    if (shouldShow) {
      const wasHidden = element.style.display === "none";
      if (wasHidden) {
        element.style.display = "";
      }
      element.style.opacity = "0";
      requestAnimationFrame(() => {
        element.style.opacity = "1";
      });
      element.style.removeProperty("display");
      return;
    }

    element.style.opacity = "0";
    element._visibilityFadeTimeout = setTimeout(() => {
      element.style.display = "none";
      element._visibilityFadeTimeout = null;
      if (element._svgPropertyTooltip) {
        element._svgPropertyTooltip.style.display = "none";
      }
    }, 120);
  }

  return {
    initializeSvgPropertyAnnotations,
    updateSvgElementVisibility,
    refreshPinnedStates,
  };
};
