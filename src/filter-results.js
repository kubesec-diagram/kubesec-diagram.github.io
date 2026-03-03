window.createFilterResultsService = function createFilterResultsService(deps) {
  let pinnedSectionCollapsed = false;
  let interactionHandlersBound = false;
  let lastTouchLikeActivationAt = 0;
  const touchTapState = {
    active: false,
    pointerId: null,
    item: null,
    startX: 0,
    startY: 0,
    moved: false,
  };
  const TOUCH_TAP_MOVE_THRESHOLD_PX = 14;
  const TOUCH_CLICK_SUPPRESS_MS = 700;

  function getRecordSlug(record) {
    return `${record && record.slug ? record.slug : ""}`.trim();
  }

  function isRecordPinned(record) {
    const slug = getRecordSlug(record);
    if (!slug) return false;
    return deps.getPinnedHelpSlugs().has(slug);
  }

  function togglePinnedRecord(record) {
    const slug = getRecordSlug(record);
    if (!slug) return;

    const nextPinned = new Set(deps.getPinnedHelpSlugs());
    if (nextPinned.has(slug)) {
      nextPinned.delete(slug);
    } else {
      nextPinned.add(slug);
    }

    deps.setPinnedHelpSlugs(nextPinned);
    deps.onPinnedStateChanged();
    applyAnnotationFilter();
  }

  function formatHiddenReason(options = {}) {
    const hiddenTags = Array.isArray(options.hiddenTags) ? options.hiddenTags.filter(Boolean) : [];
    const hiddenByLevel = Boolean(options.hiddenByLevel);
    const recordLevel = Number.isFinite(options.recordLevel) ? options.recordLevel : 0;
    const selectedLevel = Number.isFinite(options.selectedLevel) ? options.selectedLevel : 0;

    if (hiddenByLevel && hiddenTags.length > 0) {
      const quoted = hiddenTags.map((tag) => `\"${tag}\"`).join(", ");
      return `Hidden because tags ${quoted} are filtered out and level-${recordLevel} is above selected level-${selectedLevel}.`;
    }

    if (hiddenByLevel) {
      return `Hidden because level-${recordLevel} is above selected level-${selectedLevel}.`;
    }

    if (hiddenTags.length === 0) {
      return "Hidden because one or more required tags are filtered out.";
    }
    if (hiddenTags.length === 1) {
      return `Hidden because tag \"${hiddenTags[0]}\" is filtered out.`;
    }
    const quoted = hiddenTags.map((tag) => `\"${tag}\"`).join(", ");
    return `Hidden because tags ${quoted} are filtered out.`;
  }

  function shouldUseGoToNavigation() {
    if (typeof deps.getFilterPanelOpen !== "function") return false;
    return deps.getFilterPanelOpen();
  }

  function isCompactMobileMode() {
    return window.innerWidth <= 768;
  }

  function hasHoverCapability() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    );
  }

  function isInactiveResultItem(item) {
    return !item || item.classList.contains("is-inactive") || item.getAttribute("aria-disabled") === "true";
  }

  function getResultItemFromTarget(target) {
    if (!target || typeof target.closest !== "function") return null;
    const item = target.closest(".filter-result-item");
    if (!item || !deps.filterResults.contains(item)) return null;
    return item;
  }

  function shouldIgnoreActivationTarget(target) {
    if (!target || typeof target.closest !== "function") return false;
    return Boolean(target.closest('[data-role="pin"]'));
  }

  function resetTouchTapState() {
    touchTapState.active = false;
    touchTapState.pointerId = null;
    touchTapState.item = null;
    touchTapState.startX = 0;
    touchTapState.startY = 0;
    touchTapState.moved = false;
  }

  function activateResultItem(item) {
    if (!item || isInactiveResultItem(item)) return;
    if (!shouldUseGoToNavigation()) return;
    if (typeof deps.goToHelpRecord !== "function") return;

    const record = item._filterRecord;
    if (!record) return;

    if (typeof deps.clearFilterHighlight === "function") {
      deps.clearFilterHighlight();
    }

    const activeEl = document.activeElement;
    if (
      activeEl &&
      activeEl !== document.body &&
      typeof activeEl.blur === "function" &&
      activeEl.classList &&
      activeEl.classList.contains("filter-result-item")
    ) {
      activeEl.blur();
    }

    const isMobile = isCompactMobileMode();
    const showPointerLine = !isMobile;
    const preserveFitAll =
      typeof deps.getFitAllMode === "function" ? Boolean(deps.getFitAllMode()) : false;
    deps.goToHelpRecord(record, {
      closePanel: isMobile,
      preserveFitAll,
      onComplete: () => {
        if (typeof deps.highlightResultTemporarily === "function") {
          deps.highlightResultTemporarily(record, showPointerLine ? item : null, 1000);
        }
      },
    });
  }

  function bindInteractionHandlers() {
    if (interactionHandlersBound) return;
    interactionHandlersBound = true;

    deps.filterResults.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "touch") return;
      if (!shouldUseGoToNavigation()) return;

      const item = getResultItemFromTarget(event.target);
      if (!item || isInactiveResultItem(item)) {
        resetTouchTapState();
        return;
      }
      if (shouldIgnoreActivationTarget(event.target)) {
        resetTouchTapState();
        return;
      }

      touchTapState.active = true;
      touchTapState.pointerId = Number.isFinite(event.pointerId) ? event.pointerId : null;
      touchTapState.item = item;
      touchTapState.startX = event.clientX;
      touchTapState.startY = event.clientY;
      touchTapState.moved = false;
    });

    deps.filterResults.addEventListener("pointermove", (event) => {
      if (!touchTapState.active) return;
      if (event.pointerType !== "touch") return;
      if (touchTapState.pointerId !== null && Number.isFinite(event.pointerId)) {
        if (event.pointerId !== touchTapState.pointerId) return;
      }

      const dx = Math.abs(event.clientX - touchTapState.startX);
      const dy = Math.abs(event.clientY - touchTapState.startY);
      if (dx > TOUCH_TAP_MOVE_THRESHOLD_PX || dy > TOUCH_TAP_MOVE_THRESHOLD_PX) {
        touchTapState.moved = true;
      }
    });

    deps.filterResults.addEventListener("pointerup", (event) => {
      if (!touchTapState.active) return;
      if (event.pointerType !== "touch") return;
      if (touchTapState.pointerId !== null && Number.isFinite(event.pointerId)) {
        if (event.pointerId !== touchTapState.pointerId) return;
      }

      const item = touchTapState.item;
      const moved = touchTapState.moved;
      const endedOnItem = getResultItemFromTarget(event.target);
      resetTouchTapState();
      if (!item || moved || endedOnItem !== item) return;

      lastTouchLikeActivationAt = Date.now();
      activateResultItem(item);
    });

    deps.filterResults.addEventListener("pointercancel", () => {
      resetTouchTapState();
    });

    deps.filterResults.addEventListener("click", (event) => {
      const item = getResultItemFromTarget(event.target);
      if (!item || isInactiveResultItem(item)) return;
      if (!shouldUseGoToNavigation()) return;
      if (shouldIgnoreActivationTarget(event.target)) return;

      const now = Date.now();
      if (now - lastTouchLikeActivationAt < TOUCH_CLICK_SUPPRESS_MS) {
        return;
      }

      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
      activateResultItem(item);
    });
  }

  function createResultItem(record, options = {}) {
    const inactive = Boolean(options.inactive);
    const hiddenReason = inactive ? formatHiddenReason(options) : "";
    const item = document.createElement("div");
    item.className = "filter-result-item";
    item._filterRecord = record;
    const enableHoverHighlight = hasHoverCapability();
    item.tabIndex = inactive ? -1 : enableHoverHighlight ? 0 : -1;
    item.setAttribute("aria-disabled", inactive ? "true" : "false");
    if (inactive) {
      item.classList.add("is-inactive");
    }

    const tagsHtml = deps.buildTagBadgesHtml(record.tags || []);
    item.classList.add(deps.getSeverityClassForTags(record.tags || []));
    deps.applySeverityStyleToElement(item, record.tags || []);

    const slug = getRecordSlug(record);
    const pinned = isRecordPinned(record);
    const pinTitle = pinned ? "Unpin" : "Pin";
    const pinStateClass = pinned ? "is-pinned" : "";
    const pinButtonHtml =
      slug.length > 0
        ? `<button type="button" class="result-pin-btn ${pinStateClass}" data-role="pin" title="${pinTitle}" aria-label="${pinTitle}">📌 ${pinTitle}</button>`
        : "";

    const hiddenStateHtml = inactive
      ? `<div class="filter-result-state" role="note" aria-live="polite">${deps.escapeHTML(hiddenReason)}</div>`
      : "";
    const tagsFooterHtml = tagsHtml ? `<div class="filter-result-tags">${tagsHtml}</div>` : "";
    const actionsRowHtml =
      tagsFooterHtml || pinButtonHtml
        ? `<div class="filter-result-actions-row">${tagsFooterHtml}${pinButtonHtml}</div>`
        : "";
    const actionsHtml =
      hiddenStateHtml || actionsRowHtml
        ? `<div class="filter-result-actions">${hiddenStateHtml}${actionsRowHtml}</div>`
        : "";
    item.innerHTML = `<div class="filter-result-head"><strong>${deps.escapeHTML(record.title || "Help")}</strong></div><div class="filter-result-content">${record.bodyHtml || "Help annotation"}</div>${actionsHtml}`;
    if (!inactive && enableHoverHighlight) {
      deps.bindResultHighlight(item, record);
    }

    if (slug.length > 0) {
      const pinBtn = item.querySelector('[data-role="pin"]');
      if (pinBtn) {
        pinBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          togglePinnedRecord(record);
        });
      }
    }

    return item;
  }

  function renderPinnedSection(parentFragment, pinnedEntries) {
    const section = document.createElement("section");
    section.className = "pinned-results-section";

    const header = document.createElement("div");
    header.className = "pinned-results-header";

    const title = document.createElement("strong");
    title.textContent = `Pinned (${pinnedEntries.length})`;

    const controls = document.createElement("div");
    controls.className = "pinned-results-controls";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "pinned-toggle-btn";
    toggle.textContent = pinnedSectionCollapsed ? "Show" : "Hide";
    toggle.addEventListener("click", () => {
      pinnedSectionCollapsed = !pinnedSectionCollapsed;
      applyAnnotationFilter();
    });

    const onlyPinnedToggle = document.createElement("button");
    onlyPinnedToggle.type = "button";
    onlyPinnedToggle.className = "pinned-toggle-btn";
    onlyPinnedToggle.textContent = deps.getOnlyShowPinned()
      ? "Show all"
      : "Only show pinned";
    onlyPinnedToggle.addEventListener("click", () => {
      deps.setOnlyShowPinned(!deps.getOnlyShowPinned());
      deps.onConstraintStateChanged();
      applyAnnotationFilter();
    });

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "pinned-toggle-btn";
    clearBtn.textContent = "Clear";
    clearBtn.disabled = pinnedEntries.length === 0;
    clearBtn.addEventListener("click", () => {
      deps.setPinnedHelpSlugs(new Set());
      deps.setOnlyShowPinned(false);
      deps.onPinnedStateChanged();
      applyAnnotationFilter();
    });

    header.appendChild(title);
    controls.appendChild(onlyPinnedToggle);
    controls.appendChild(clearBtn);
    controls.appendChild(toggle);
    header.appendChild(controls);
    section.appendChild(header);

    if (!pinnedSectionCollapsed) {
      const pinnedList = document.createElement("div");
      pinnedList.className = "pinned-results-list";
      pinnedEntries.forEach((entry) => {
        pinnedList.appendChild(
          createResultItem(entry.record, { inactive: entry.inactive, hiddenTags: entry.hiddenTags }),
        );
      });
      section.appendChild(pinnedList);
    }

    parentFragment.appendChild(section);
  }

  function renderFilterResults(query) {
    const fragment = document.createDocumentFragment();
    const onlyShowPinned = deps.getOnlyShowPinned();

    const allHelp = deps.getSvgHelpRecords();
    const matchingHelp = allHelp.filter(
      (record) =>
        onlyShowPinned
          ? isRecordPinned(record)
          : deps.helpMatchesSearch(record, query) &&
            deps.isTagSetVisible(record.tags) &&
            deps.isTagSetWithinSelectedLevel(record.tags),
    );

    function getEntryTags(entry) {
      return entry.record.tags || [];
    }

    function getPrimarySortTag(entry) {
      const sortedTags = deps.getSortedVisibleTags(getEntryTags(entry));
      return sortedTags[0] || "";
    }

    const sortedEntries = [
      ...matchingHelp.map((record) => ({ kind: "help", title: record.title || "", record })),
    ].sort((a, b) => {
      const primaryTagA = getPrimarySortTag(a);
      const primaryTagB = getPrimarySortTag(b);

      if (primaryTagA && primaryTagB) {
        const tagComparison = deps.compareTagsByFilterOrder(primaryTagA, primaryTagB);
        if (tagComparison !== 0) return tagComparison;
      } else if (primaryTagA || primaryTagB) {
        return primaryTagA ? -1 : 1;
      }

      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    });

    const allEntriesBySlug = new Map();
    allHelp.forEach((record) => {
      const slug = getRecordSlug(record);
      if (!slug || allEntriesBySlug.has(slug)) return;
      allEntriesBySlug.set(slug, { kind: "help", title: record.title || "", record });
    });

    const pinnedEntries = Array.from(deps.getPinnedHelpSlugs())
      .map((slug) => allEntriesBySlug.get(`${slug || ""}`.trim()))
      .filter(Boolean)
      .map((entry) => {
        const hiddenTags = deps.getHiddenDisableTags(entry.record.tags || []);
        const recordLevel = deps.getTagLevel(entry.record.tags || []);
        const selectedLevel = deps.getSelectedLevel();
        const hiddenByLevel = !deps.isTagSetWithinSelectedLevel(entry.record.tags || []);
        return {
          ...entry,
          inactive: hiddenTags.length > 0 || hiddenByLevel,
          hiddenTags,
          hiddenByLevel,
          selectedLevel,
          recordLevel,
        };
      })
      .sort((a, b) => {
        const primaryTagA = getPrimarySortTag(a);
        const primaryTagB = getPrimarySortTag(b);

        if (primaryTagA && primaryTagB) {
          const tagComparison = deps.compareTagsByFilterOrder(primaryTagA, primaryTagB);
          if (tagComparison !== 0) return tagComparison;
        } else if (primaryTagA || primaryTagB) {
          return primaryTagA ? -1 : 1;
        }

        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      });
    const regularEntries = onlyShowPinned
      ? []
      : sortedEntries.filter((entry) => !isRecordPinned(entry.record));

    deps.clearFilterHighlight();

    if (pinnedEntries.length > 0) {
      renderPinnedSection(fragment, pinnedEntries);

      if (regularEntries.length > 0) {
        const divider = document.createElement("div");
        divider.className = "pinned-results-divider";
        divider.textContent = "Matches";
        fragment.appendChild(divider);
      }
    }

    regularEntries.forEach((entry) => {
      fragment.appendChild(createResultItem(entry.record));
    });

    if (onlyShowPinned && pinnedEntries.length === 0) {
      const noPinned = document.createElement("div");
      noPinned.className = "filter-result-item";
      noPinned.innerHTML = "<strong>No pinned items</strong><small>Pin annotations to focus them here.</small>";
      fragment.appendChild(noPinned);
    } else if (matchingHelp.length === 0) {
      const noMatches = document.createElement("div");
      noMatches.className = "filter-result-item";
      noMatches.innerHTML = "<strong>No matches</strong><small>Try another search term.</small>";
      fragment.appendChild(noMatches);
    }

    deps.filterResults.innerHTML = "";
    deps.filterResults.appendChild(fragment);

    return {
      helpVisible: matchingHelp.length,
      helpTotal: deps.getSvgHelpRecords().length,
    };
  }

  function applyAnnotationFilter() {
    const query = deps.normalizeQuery(deps.getAnnotationSearchQuery());
    if (deps.getOnlyShowPinned() && deps.getPinnedHelpSlugs().size === 0) {
      deps.setOnlyShowPinned(false);
      deps.onConstraintStateChanged();
    }
    const onlyShowPinned = deps.getOnlyShowPinned();
    deps.setFilterControlsDisabled(onlyShowPinned);

    const updatedElements = new Set();
    deps.getSvgHelpRecords().forEach((record) => {
      if (onlyShowPinned) {
        record.searchMatch = isRecordPinned(record);
      } else {
        const matchesQuery = deps.helpMatchesSearch(record, query);
        record.searchMatch = matchesQuery;
      }
      deps.updateSvgElementVisibility(record.element);
      updatedElements.add(record.element);
    });

    if (typeof deps.getTaggedElements === "function") {
      const taggedElements = deps.getTaggedElements();
      if (taggedElements && typeof taggedElements.forEach === "function") {
        taggedElements.forEach((element) => {
          if (!element || updatedElements.has(element)) return;
          deps.updateSvgElementVisibility(element);
        });
      }
    }

    const summary = renderFilterResults(query);
    deps.updateFilterResultSummary(
      summary.helpVisible,
      summary.helpTotal,
      onlyShowPinned ? "" : query,
    );
  }

  bindInteractionHandlers();

  return {
    renderFilterResults,
    applyAnnotationFilter,
  };
};
