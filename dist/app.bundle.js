// Auto-generated bundle. Do not edit manually.

// ---- ./src/url-state.js ----
window.createUrlStateService = function createUrlStateService(deps) {
  function serializeFilterState() {
    const hiddenTags = deps
      .getTagVisibilityEntries()
      .filter(([, visible]) => visible === false)
      .map(([tag]) => tag)
      .sort((a, b) => deps.compareTagsByFilterOrder(a, b));

    return {
      visible: deps.getFilterPanelOpen(),
      query: (deps.getAnnotationSearchQuery() || "").trim(),
      hiddenTags,
      pinnedSlugs: deps.getPinnedSlugs(),
      constraints: deps.getFilterConstraints(),
      level:
        typeof deps.getSelectedLevel === "function"
          ? Math.max(0, Number.parseInt(deps.getSelectedLevel(), 10) || 0)
          : 0,
    };
  }

  function parseFilterStateFromURL() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const visibleRaw = urlParams.get(deps.menuVisibleParam);
      const queryRaw = urlParams.get(deps.filterQueryParam);
      const hideTagsRaw = urlParams.get(deps.filterHideTagsParam);
      const pinsRaw = urlParams.get(deps.pinsParam);
      const constraintsRaw = urlParams.get(deps.constraintParam);
      const levelRaw = urlParams.get(deps.filterLevelParam);

      const hiddenTags = hideTagsRaw
        ? hideTagsRaw
            .split(",")
            .map((tag) => `${tag || ""}`.trim())
            .filter(Boolean)
        : [];

      const pinnedSlugs = pinsRaw
        ? pinsRaw
            .split(",")
            .map((slug) => `${slug || ""}`.trim())
            .filter(Boolean)
        : [];

      const constraints = constraintsRaw
        ? constraintsRaw
            .split(",")
            .map((constraint) => `${constraint || ""}`.trim())
            .filter(Boolean)
        : [];

      return {
        open: visibleRaw === "true",
        query: typeof queryRaw === "string" ? queryRaw : "",
        hiddenTags,
        pinnedSlugs,
        constraints,
        level: Math.max(0, Number.parseInt(levelRaw, 10) || 0),
        hasLevel: levelRaw !== null,
        hasHiddenTags: hideTagsRaw !== null,
      };
    } catch (error) {
      console.warn("Failed to parse filter state from URL:", error);
      return {
        open: false,
        query: "",
        hiddenTags: [],
        pinnedSlugs: [],
        constraints: [],
        level: 0,
        hasLevel: false,
        hasHiddenTags: false,
      };
    }
  }

  function updateURLState() {
    try {
      const url = new URL(window.location);
      const userAnnotations = deps.getUserAnnotations();

      if (!userAnnotations || userAnnotations.length === 0) {
        url.searchParams.delete("annotations");
      } else {
        const jsonString = JSON.stringify(userAnnotations);
        const base64 = btoa(unescape(encodeURIComponent(jsonString)));
        url.searchParams.set("annotations", base64);
      }

      const filterState = serializeFilterState();
      const query = filterState.query;
      const hiddenTags = filterState.hiddenTags;
      const pinnedSlugs = (filterState.pinnedSlugs || []).filter(Boolean);
      const constraints = (filterState.constraints || []).filter(Boolean);
      const level = Math.max(0, Number.parseInt(filterState.level, 10) || 0);
      const defaultLevel =
        typeof deps.getDefaultSelectedLevel === "function"
          ? Math.max(0, Number.parseInt(deps.getDefaultSelectedLevel(), 10) || 0)
          : 0;
      const hasNonDefaultLevel = level !== defaultLevel;
      const hasFilterCriteria = query.length > 0 || hiddenTags.length > 0 || hasNonDefaultLevel;

      if (
        !filterState.visible &&
        !hasFilterCriteria &&
        pinnedSlugs.length === 0 &&
        constraints.length === 0
      ) {
        url.searchParams.delete(deps.menuVisibleParam);
        url.searchParams.delete(deps.filterQueryParam);
        url.searchParams.delete(deps.filterHideTagsParam);
        url.searchParams.delete(deps.pinsParam);
        url.searchParams.delete(deps.constraintParam);
        url.searchParams.delete(deps.filterLevelParam);
      } else {
        if (filterState.visible) {
          url.searchParams.set(deps.menuVisibleParam, "true");
        } else {
          url.searchParams.delete(deps.menuVisibleParam);
        }

        if (query.length > 0) {
          url.searchParams.set(deps.filterQueryParam, query);
        } else {
          url.searchParams.delete(deps.filterQueryParam);
        }

        if (hiddenTags.length > 0) {
          url.searchParams.set(deps.filterHideTagsParam, hiddenTags.join(","));
        } else {
          url.searchParams.delete(deps.filterHideTagsParam);
        }

        if (pinnedSlugs.length > 0) {
          url.searchParams.set(deps.pinsParam, pinnedSlugs.join(","));
        } else {
          url.searchParams.delete(deps.pinsParam);
        }

        if (constraints.length > 0) {
          url.searchParams.set(deps.constraintParam, constraints.join(","));
        } else {
          url.searchParams.delete(deps.constraintParam);
        }

        if (hasNonDefaultLevel) {
          url.searchParams.set(deps.filterLevelParam, `${level}`);
        } else {
          url.searchParams.delete(deps.filterLevelParam);
        }
      }

      window.history.replaceState({}, "", url);
    } catch (error) {
      console.error("Failed to update URL state:", error);
    }
  }

  function encodeUserAnnotationsToURL() {
    updateURLState();
  }

  function parseUserAnnotationsFromURL() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const annotationsParam = urlParams.get("annotations");

      if (!annotationsParam) {
        return [];
      }

      const jsonString = decodeURIComponent(escape(atob(annotationsParam)));
      const parsed = JSON.parse(jsonString);

      if (!Array.isArray(parsed)) {
        console.warn("Invalid user annotations format in URL");
        return [];
      }

      const maxAnnotations = deps.getMaxUserAnnotations();
      return parsed
        .slice(0, maxAnnotations)
        .filter((ann) => {
          return (
            ann &&
            typeof ann === "object" &&
            typeof ann.x === "number" &&
            typeof ann.y === "number" &&
            typeof ann.type === "string" &&
            typeof ann.title === "string" &&
            ann.x >= 0 &&
            ann.x <= 1 &&
            ann.y >= 0 &&
            ann.y <= 1 &&
            ann.title.length <= 50
          );
        })
        .map((ann) => {
          const cleanAnn = {
            x: ann.x,
            y: ann.y,
            type: ann.type,
            title: ann.title.substring(0, 50),
            description: ann.description ? ann.description.substring(0, 500) : "",
          };

          if (
            typeof ann.shape === "string" &&
            (ann.shape === "circle" || ann.shape === "rectangle")
          ) {
            cleanAnn.shape = ann.shape;
          } else {
            cleanAnn.shape = "rectangle";
          }

          if (typeof ann.widthRel === "number" && ann.widthRel > 0) {
            cleanAnn.widthRel = ann.widthRel;
          }
          if (typeof ann.heightRel === "number" && ann.heightRel > 0) {
            cleanAnn.heightRel = ann.heightRel;
          }

          return cleanAnn;
        });
    } catch (error) {
      console.error("Failed to parse user annotations from URL:", error);
      return [];
    }
  }

  return {
    serializeFilterState,
    parseFilterStateFromURL,
    updateURLState,
    encodeUserAnnotationsToURL,
    parseUserAnnotationsFromURL,
  };
};

// ---- ./src/tag-utils.js ----
window.createTagUtilsService = function createTagUtilsService(deps) {
  function escapeHTML(str) {
    const div = document.createElement("div");
    div.innerText = str;
    return div.innerHTML;
  }

  function parseTags(tagValue) {
    if (!tagValue || typeof tagValue !== "string") return [];
    return tagValue
      .split(/[\s,]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  function getTagFilterConfig() {
    return (deps.getConfig() && deps.getConfig().tagFilters) || { groups: [], tags: {} };
  }

  function getTagMeta(tag) {
    const tagConfig = getTagFilterConfig();
    const defaultMeta = {
      shortName: tag,
      label: tag,
      group: "general",
      order: Number.MAX_SAFE_INTEGER,
      style: null,
    };
    return {
      ...defaultMeta,
      ...((tagConfig.tags && tagConfig.tags[tag]) || {}),
      shortName: tag,
    };
  }

  function getTagGroupMeta(groupId) {
    const tagConfig = getTagFilterConfig();
    const groups = Array.isArray(tagConfig.groups) ? tagConfig.groups : [];
    return groups.find((group) => group.id === groupId) || {
      id: groupId,
      label: groupId,
      order: Number.MAX_SAFE_INTEGER,
    };
  }

  function compareTagsByFilterOrder(a, b) {
    const metaA = getTagMeta(a);
    const metaB = getTagMeta(b);
    const groupA = getTagGroupMeta(metaA.group || "general");
    const groupB = getTagGroupMeta(metaB.group || "general");

    if ((groupA.order || 0) !== (groupB.order || 0)) {
      return (groupA.order || 0) - (groupB.order || 0);
    }

    if ((metaA.order || Number.MAX_SAFE_INTEGER) !== (metaB.order || Number.MAX_SAFE_INTEGER)) {
      return (metaA.order || Number.MAX_SAFE_INTEGER) - (metaB.order || Number.MAX_SAFE_INTEGER);
    }

    return (metaA.label || metaA.shortName).localeCompare(metaB.label || metaB.shortName);
  }

  function getSortedVisibleTags(tags) {
    return [...new Set(getNonLevelTags(tags))].sort(compareTagsByFilterOrder);
  }

  function isLevelTag(tag) {
    return /^level-\d+$/i.test(`${tag || ""}`.trim());
  }

  function parseLevelTag(tag) {
    const match = `${tag || ""}`.trim().toLowerCase().match(/^level-(\d+)$/);
    if (!match) return null;
    const parsed = Number.parseInt(match[1], 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function getTagLevel(tags) {
    let level = 0;
    (tags || []).forEach((tag) => {
      const parsed = parseLevelTag(tag);
      if (Number.isFinite(parsed)) {
        level = Math.max(level, parsed);
      }
    });
    return level;
  }

  function getNonLevelTags(tags) {
    return (tags || []).filter((tag) => tag && !isLevelTag(tag));
  }

  function buildTagBadgesHtml(tags) {
    const sortedTags = getSortedVisibleTags(tags);
    if (!sortedTags.length) return "";

    const badges = sortedTags
      .map((tag) => {
        const meta = getTagMeta(tag);
        let inlineStyle = "";
        if (meta.style) {
          if (meta.style.background) inlineStyle += `background:${meta.style.background};`;
          if (meta.style.color) inlineStyle += `color:${meta.style.color};`;
          if (meta.style.borderColor) inlineStyle += `border-color:${meta.style.borderColor};`;
          if (meta.style.borderWidth) inlineStyle += `border-width:${meta.style.borderWidth};`;
          if (meta.style.fontWeight) inlineStyle += `font-weight:${meta.style.fontWeight};`;
        }
        return `<span class="annotation-tag-badge" style="${inlineStyle}">${escapeHTML(meta.label || tag)}</span>`;
      })
      .join("");

    return `<div class="annotation-tag-badges">${badges}</div>`;
  }

  function getPrimarySeverityTag(tags) {
    const normalized = (tags || []).map((tag) => `${tag || ""}`.trim().toLowerCase());
    const priorities = normalized
      .map((tag) => {
        const match = tag.match(/^pri-(\d+)$/);
        if (!match) return null;
        return Number.parseInt(match[1], 10);
      })
      .filter((value) => Number.isFinite(value));

    if (priorities.length > 0) {
      const highestPriority = Math.min(...priorities);
      return `pri-${highestPriority}`;
    }

    if (normalized.includes("info")) return "info";
    return null;
  }

  function applySeverityStyleToElement(element, tags) {
    const severityTag = getPrimarySeverityTag(tags);
    if (!severityTag) return;

    const meta = getTagMeta(severityTag);
    const style = meta.panelStyle || null;
    if (!style) return;

    if (style.borderColor) {
      element.style.borderColor = style.borderColor;
    }
    if (style.borderWidth) {
      element.style.borderWidth = style.borderWidth;
    }
    if (style.boxShadow) {
      element.style.boxShadow = style.boxShadow;
    }
  }

  function getSeverityClassForTags(tags) {
    const severityTag = getPrimarySeverityTag(tags);
    if (severityTag) {
      return `severity-${severityTag}`;
    }
    return "severity-default";
  }

  function isTagSetVisible(tags) {
    const visibility = deps.getTagVisibility();
    return getNonLevelTags(tags).every((tag) => visibility.get(tag) !== false);
  }

  function isTagSetWithinSelectedLevel(tags) {
    const selectedLevelRaw =
      typeof deps.getSelectedLevel === "function" ? deps.getSelectedLevel() : 0;
    const selectedLevel = Math.max(0, Number.parseInt(selectedLevelRaw, 10) || 0);
    return getTagLevel(tags) <= selectedLevel;
  }

  function isTagSetDisabledByHiddenGroup(tags) {
    return getHiddenDisableTags(tags).length > 0;
  }

  function getHiddenDisableTags(tags) {
    const visibility = deps.getTagVisibility();
    return getNonLevelTags(tags).filter((tag) => {
      const meta = getTagMeta(tag);
      const group = getTagGroupMeta(meta.group || "general");
      return group.disableHelpIfHidden === true && visibility.get(tag) === false;
    });
  }

  return {
    parseTags,
    getTagFilterConfig,
    getTagMeta,
    getTagGroupMeta,
    compareTagsByFilterOrder,
    isLevelTag,
    parseLevelTag,
    getTagLevel,
    getNonLevelTags,
    getSortedVisibleTags,
    buildTagBadgesHtml,
    getPrimarySeverityTag,
    applySeverityStyleToElement,
    getSeverityClassForTags,
    isTagSetVisible,
    isTagSetWithinSelectedLevel,
    isTagSetDisabledByHiddenGroup,
    getHiddenDisableTags,
  };
};

// ---- ./src/tag-controls.js ----
window.createTagControlsService = function createTagControlsService(deps) {
  function getLevelLabel(level, maxLevel) {
    const normalizedLevel = Math.max(0, Number.parseInt(level, 10) || 0);
    const normalizedMax = Math.max(0, Number.parseInt(maxLevel, 10) || 0);
    return normalizedLevel >= normalizedMax ? "max" : `${normalizedLevel}`;
  }

  function applyTagVisibility(tag) {
    const elements = deps.getDiagramTagElements().get(tag);
    if (!elements) return;

    elements.forEach((el) => {
      deps.updateSvgElementVisibility(el);
    });
  }

  function updateTagToggleVisual(tag, toggleEl) {
    const visible = deps.getTagVisibility().get(tag) !== false;
    toggleEl.classList.toggle("active", visible);
  }

  function applyTagButtonStyle(tag, buttonEl) {
    const tagMeta = deps.getTagMeta(tag);
    if (!tagMeta.style) return;

    if (tagMeta.style.background) {
      buttonEl.style.background = tagMeta.style.background;
    }
    if (tagMeta.style.color) {
      buttonEl.style.color = tagMeta.style.color;
    }
    if (tagMeta.style.borderColor) {
      buttonEl.style.borderColor = tagMeta.style.borderColor;
    }
    if (tagMeta.style.borderWidth) {
      buttonEl.style.borderWidth = tagMeta.style.borderWidth;
    }
    if (tagMeta.style.borderStyle) {
      buttonEl.style.borderStyle = tagMeta.style.borderStyle;
    }
    if (tagMeta.style.fontWeight) {
      buttonEl.style.fontWeight = tagMeta.style.fontWeight;
    }
  }

  function initializeTagControls() {
    if (!deps.filterTagControls) return;

    deps.filterTagControls.innerHTML = "";
    const nextDiagramTagElements = new Map();
    deps.setDiagramTagElements(nextDiagramTagElements);

    const taggedElements = deps.image.querySelectorAll("[data-tags]");
    let maxDiscoveredLevel = 0;
    taggedElements.forEach((el) => {
      const tags = deps.parseTags(el.getAttribute("data-tags"));
      maxDiscoveredLevel = Math.max(maxDiscoveredLevel, deps.getTagLevel(tags));
      tags.forEach((tag) => {
        if (deps.isLevelTag(tag)) return;
        if (!nextDiagramTagElements.has(tag)) {
          nextDiagramTagElements.set(tag, []);
        }
        nextDiagramTagElements.get(tag).push(el);
      });
    });

    const hasInitialSelectedLevel =
      typeof deps.getHasInitialSelectedLevel === "function"
        ? deps.getHasInitialSelectedLevel()
        : false;

    if (typeof deps.setMaxDiagramLevel === "function") {
      deps.setMaxDiagramLevel(maxDiscoveredLevel);
    }
    if (typeof deps.getSelectedLevel === "function" && typeof deps.setSelectedLevel === "function") {
      const selectedLevel = deps.getSelectedLevel();
      const parsedSelectedLevel = Number.parseInt(selectedLevel, 10);
      const fallbackLevel = maxDiscoveredLevel;
      const initialLevel = Number.isFinite(parsedSelectedLevel) ? parsedSelectedLevel : fallbackLevel;
      const clampedLevel = Math.max(0, Math.min(maxDiscoveredLevel, initialLevel));
      if (!hasInitialSelectedLevel && maxDiscoveredLevel > 0) {
        deps.setSelectedLevel(maxDiscoveredLevel);
      } else if (clampedLevel !== selectedLevel) {
        deps.setSelectedLevel(clampedLevel);
      }
    }

    if (maxDiscoveredLevel > 0) {
      const levelWrap = document.createElement("div");
      levelWrap.className = "level-filter-control";

      const levelHeader = document.createElement("div");
      levelHeader.className = "level-filter-header";

      const levelTitle = document.createElement("div");
      levelTitle.className = "tag-group-title";
      levelTitle.textContent = "Level";

      const levelValue = document.createElement("strong");
      levelValue.className = "level-filter-value";

      const levelInput = document.createElement("input");
      levelInput.type = "range";
      levelInput.className = "level-filter-slider";
      levelInput.min = "0";
      levelInput.max = `${maxDiscoveredLevel}`;
      levelInput.step = "1";

      const selectedLevelRaw =
        typeof deps.getSelectedLevel === "function" ? deps.getSelectedLevel() : maxDiscoveredLevel;
      const selectedLevel = Number.parseInt(selectedLevelRaw, 10);
      const clampedSelectedLevel = Math.max(
        0,
        Math.min(maxDiscoveredLevel, Number.isFinite(selectedLevel) ? selectedLevel : maxDiscoveredLevel),
      );
      levelInput.value = `${clampedSelectedLevel}`;
      levelValue.textContent = `Level ${getLevelLabel(clampedSelectedLevel, maxDiscoveredLevel)}`;

      const handleLevelChange = () => {
        const nextLevel = Math.max(
          0,
          Math.min(maxDiscoveredLevel, Number.parseInt(levelInput.value, 10) || 0),
        );
        levelValue.textContent = `Level ${getLevelLabel(nextLevel, maxDiscoveredLevel)}`;
        deps.setSelectedLevel(nextLevel);
        deps.applyAnnotationFilter();
        deps.updateURLState();
      };

      levelInput.addEventListener("input", handleLevelChange);
      levelInput.addEventListener("change", handleLevelChange);

      levelHeader.appendChild(levelTitle);
      levelHeader.appendChild(levelValue);
      levelWrap.appendChild(levelHeader);
      levelWrap.appendChild(levelInput);
      deps.filterTagControls.appendChild(levelWrap);
    }

    const discoveredTags = Array.from(nextDiagramTagElements.keys()).sort((a, b) =>
      a.localeCompare(b),
    );
    if (discoveredTags.length === 0) {
      const message = document.createElement("div");
      message.className = "filter-result-item";
      message.innerHTML =
        maxDiscoveredLevel > 0
          ? "<small>No regular tags found in this diagram.</small>"
          : "<small>No tags found in this diagram.</small>";
      deps.filterTagControls.appendChild(message);
      return;
    }

    const groupsMap = new Map();
    discoveredTags.forEach((tag) => {
      const tagMeta = deps.getTagMeta(tag);
      const groupId = tagMeta.group || "general";
      if (!groupsMap.has(groupId)) {
        groupsMap.set(groupId, []);
      }
      groupsMap.get(groupId).push(tag);
    });

    const orderedGroups = Array.from(groupsMap.keys()).sort((a, b) => {
      const groupA = deps.getTagGroupMeta(a);
      const groupB = deps.getTagGroupMeta(b);
      if ((groupA.order || 0) !== (groupB.order || 0)) {
        return (groupA.order || 0) - (groupB.order || 0);
      }
      return (groupA.label || groupA.id).localeCompare(groupB.label || groupB.id);
    });

    orderedGroups.forEach((groupId) => {
      const groupMeta = deps.getTagGroupMeta(groupId);
      const groupWrap = document.createElement("div");
      groupWrap.className = "tag-group";

      const groupTitle = document.createElement("div");
      groupTitle.className = "tag-group-title";
      groupTitle.textContent = groupMeta.label || groupMeta.id;
      groupWrap.appendChild(groupTitle);

      const groupButtons = document.createElement("div");
      groupButtons.className = "tag-group-buttons";

      const orderedTags = groupsMap.get(groupId).sort((a, b) => {
        const metaA = deps.getTagMeta(a);
        const metaB = deps.getTagMeta(b);
        if ((metaA.order || Number.MAX_SAFE_INTEGER) !== (metaB.order || Number.MAX_SAFE_INTEGER)) {
          return (metaA.order || Number.MAX_SAFE_INTEGER) - (metaB.order || Number.MAX_SAFE_INTEGER);
        }
        return (metaA.label || metaA.shortName).localeCompare(metaB.label || metaB.shortName);
      });

      orderedTags.forEach((tag) => {
        if (!deps.getTagVisibility().has(tag)) {
          const initiallyVisible = deps.getHasInitialHiddenTags()
            ? !deps.getInitialHiddenTags().has(tag)
            : true;
          deps.getTagVisibility().set(tag, initiallyVisible);
        }

        const tagMeta = deps.getTagMeta(tag);
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "tag-filter-btn";
        toggle.title = `Toggle tag: ${tag}`;
        toggle.textContent = tagMeta.label || tag;
        applyTagButtonStyle(tag, toggle);

        updateTagToggleVisual(tag, toggle);
        toggle.addEventListener("click", () => {
          const currentlyVisible = deps.getTagVisibility().get(tag) !== false;
          deps.getTagVisibility().set(tag, !currentlyVisible);
          updateTagToggleVisual(tag, toggle);
          applyTagVisibility(tag);
          deps.applyAnnotationFilter();
          deps.updateURLState();
        });

        groupButtons.appendChild(toggle);
        applyTagVisibility(tag);
      });

      groupWrap.appendChild(groupButtons);
      deps.filterTagControls.appendChild(groupWrap);
    });
  }

  return {
    applyTagVisibility,
    updateTagToggleVisual,
    applyTagButtonStyle,
    initializeTagControls,
  };
};

// ---- ./src/tooltip.js ----
window.createTooltipService = function createTooltipService(deps) {
  let currentMobileTooltip = null;
  let mobileTooltipOriginalParent = null;
  let mobileTooltipNextSibling = null;
  let initialized = false;

  function isMobileDevice() {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) ||
      window.innerWidth <= 768 ||
      "ontouchstart" in window
    );
  }

  function handleMobileTooltipOutsideClick(e) {
    if (currentMobileTooltip && !currentMobileTooltip.contains(e.target)) {
      hideMobile();
    }
  }

  function showMobile(tooltip, content, anchorPoint = null) {
    hideMobile();

    const normalizeContent = (rawHtml) => {
      const temp = document.createElement("div");
      temp.innerHTML = rawHtml || "";
      temp.querySelectorAll(".mobile-close-btn").forEach((btn) => btn.remove());
      return temp.innerHTML;
    };

    const sanitizedContent = normalizeContent(content);
    const isSmallScreen = window.innerWidth <= 768;

    if (isSmallScreen && tooltip.parentElement !== document.body) {
      mobileTooltipOriginalParent = tooltip.parentElement;
      mobileTooltipNextSibling = tooltip.nextSibling;
      document.body.appendChild(tooltip);
    }

    tooltip.classList.add("mobile-tooltip");
    document.body.classList.add("mobile-tooltip-open");
    tooltip.innerHTML = sanitizedContent;
    tooltip.style.display = "block";

    if (!isSmallScreen && anchorPoint) {
      const margin = 10;
      const gap = 12;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      tooltip.style.position = "fixed";
      tooltip.style.transform = "none";
      tooltip.style.width = "min(420px, 86vw)";
      tooltip.style.maxWidth = "86vw";
      tooltip.style.minWidth = "260px";
      tooltip.style.maxHeight = "70vh";
      tooltip.style.overflowY = "auto";
      tooltip.style.left = `${margin}px`;
      tooltip.style.top = `${margin}px`;

      requestAnimationFrame(() => {
        const tipWidth = tooltip.offsetWidth;
        const tipHeight = tooltip.offsetHeight;

        let x = anchorPoint.x + gap;
        if (x + tipWidth > viewportWidth - margin) {
          const leftCandidate = anchorPoint.x - gap - tipWidth;
          if (leftCandidate >= margin) {
            x = leftCandidate;
          } else {
            x = Math.max(margin, viewportWidth - tipWidth - margin);
          }
        }

        let y = anchorPoint.y + gap;
        if (y + tipHeight > viewportHeight - margin) {
          const topCandidate = anchorPoint.y - gap - tipHeight;
          if (topCandidate >= margin) {
            y = topCandidate;
          } else {
            y = Math.max(margin, viewportHeight - tipHeight - margin);
          }
        }

        tooltip.style.left = `${Math.round(x)}px`;
        tooltip.style.top = `${Math.round(y)}px`;
      });
    }

    currentMobileTooltip = tooltip;
    window.currentMobileTooltip = tooltip;

    setTimeout(() => {
      document.addEventListener("touchstart", handleMobileTooltipOutsideClick, true);
      document.addEventListener("click", handleMobileTooltipOutsideClick, true);
    }, 100);
  }

  function hideMobile() {
    if (currentMobileTooltip) {
      currentMobileTooltip.style.display = "none";
      currentMobileTooltip.classList.remove("mobile-tooltip");
      document.body.classList.remove("mobile-tooltip-open");
      currentMobileTooltip.style.removeProperty("position");
      currentMobileTooltip.style.removeProperty("transform");
      currentMobileTooltip.style.removeProperty("width");
      currentMobileTooltip.style.removeProperty("max-width");
      currentMobileTooltip.style.removeProperty("min-width");
      currentMobileTooltip.style.removeProperty("max-height");
      currentMobileTooltip.style.removeProperty("overflow-y");
      currentMobileTooltip.style.removeProperty("left");
      currentMobileTooltip.style.removeProperty("top");

      if (mobileTooltipOriginalParent) {
        if (mobileTooltipNextSibling && mobileTooltipNextSibling.parentNode === mobileTooltipOriginalParent) {
          mobileTooltipOriginalParent.insertBefore(currentMobileTooltip, mobileTooltipNextSibling);
        } else {
          mobileTooltipOriginalParent.appendChild(currentMobileTooltip);
        }
      }

      mobileTooltipOriginalParent = null;
      mobileTooltipNextSibling = null;
      currentMobileTooltip = null;
      window.currentMobileTooltip = null;
    }

    if (!currentMobileTooltip) {
      document.body.classList.remove("mobile-tooltip-open");
    }

    document.removeEventListener("touchstart", handleMobileTooltipOutsideClick, true);
    document.removeEventListener("click", handleMobileTooltipOutsideClick, true);
  }

  function getTooltipHorizontalBounds(margin = 10) {
    let minX = margin;
    let maxX = window.innerWidth - margin;

    if (deps.getFilterPanelOpen()) {
      const panelRect = deps.getFilterPanelElement().getBoundingClientRect();
      if (panelRect.width > 0 && panelRect.left < window.innerWidth) {
        maxX = Math.min(maxX, panelRect.left - margin);
      }
    }

    if (maxX <= minX + 80) {
      maxX = window.innerWidth - margin;
    }

    return { minX, maxX };
  }

  function positionNearPoint(tooltip, pointX, pointY, margin = 10) {
    const tipWidth = tooltip.offsetWidth;
    const tipHeight = tooltip.offsetHeight;
    const viewportHeight = window.innerHeight;
    const horizontalBounds = getTooltipHorizontalBounds(margin);
    const gap = 14;

    let left = pointX + gap;
    if (left + tipWidth > horizontalBounds.maxX) {
      const leftCandidate = pointX - gap - tipWidth;
      if (leftCandidate >= horizontalBounds.minX) {
        left = leftCandidate;
      } else {
        left = Math.max(horizontalBounds.minX, horizontalBounds.maxX - tipWidth);
      }
    }

    let top = pointY + gap;
    if (top + tipHeight > viewportHeight - margin) {
      const topCandidate = pointY - gap - tipHeight;
      if (topCandidate >= margin) {
        top = topCandidate;
      } else {
        top = Math.max(margin, viewportHeight - tipHeight - margin);
      }
    }

    tooltip.style.left = `${Math.round(left + tipWidth / 2)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
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
    const svgRect = getRectFromSvgGraphicsElement(element);
    if (svgRect) return svgRect;
    if (!element || typeof element.getBoundingClientRect !== "function") return null;
    const rect = element.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  }

  function resolveElementAnchorPoint(targetEl) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const viewportArea = viewportWidth * viewportHeight;

    const candidates = [targetEl];
    const candidateSelector =
      "rect,circle,ellipse,path,polygon,polyline,line,text,foreignObject,use,image";
    if (targetEl && typeof targetEl.querySelectorAll === "function") {
      candidates.push(...Array.from(targetEl.querySelectorAll(candidateSelector)));
    }

    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;

    candidates.forEach((candidate) => {
      const rect = getElementRect(candidate);
      if (!rect) return;
      const area = rect.width * rect.height;
      if (!Number.isFinite(area) || area <= 1) return;
      if (area > viewportArea * 0.75) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const score = Math.sqrt(area);
      if (score < bestScore) {
        bestScore = score;
        best = { x: centerX, y: centerY };
      }
    });

    if (best) return best;
    const fallbackRect = getElementRect(targetEl);
    if (fallbackRect) {
      return {
        x: fallbackRect.left + fallbackRect.width / 2,
        y: fallbackRect.top + fallbackRect.height / 2,
      };
    }

    return {
      x: viewportWidth / 2,
      y: viewportHeight / 2,
    };
  }

  function showForSvgElement(tooltip, targetEl, hoverEvent = null) {
    tooltip.style.display = "block";
    tooltip.style.minWidth = `${deps.getTooltipMinWidth()}px`;

    requestAnimationFrame(() => {
      if (
        hoverEvent &&
        Number.isFinite(hoverEvent.clientX) &&
        Number.isFinite(hoverEvent.clientY)
      ) {
        positionNearPoint(tooltip, hoverEvent.clientX, hoverEvent.clientY);
        return;
      }

      const targetPoint = resolveElementAnchorPoint(targetEl);
      positionNearPoint(tooltip, targetPoint.x, targetPoint.y);
    });
  }

  function showAtPointer(tooltip, ann, mouseEvent) {
    if (!mouseEvent) return;

    const x = mouseEvent.clientX;
    const y = mouseEvent.clientY;
    tooltip.style.display = "block";
    tooltip.style.minWidth = `${deps.getTooltipMinWidth()}px`;

    requestAnimationFrame(() => {
      positionNearPoint(tooltip, x, y);
    });
  }

  function showForUserAnnotation(tooltip, ann) {
    if (!ann._el) return;

    const markerRect = ann._el.getBoundingClientRect();
    const markerCenterX = markerRect.left + markerRect.width / 2;
    const markerCenterY = markerRect.top + markerRect.height / 2;
    showAtPointer(tooltip, ann, {
      clientX: markerCenterX,
      clientY: markerCenterY,
    });
  }

  function getVisualViewportHeight() {
    const vv = window.visualViewport;
    if (vv && Number.isFinite(vv.height) && vv.height > 0) {
      return vv.height;
    }
    return window.innerHeight || document.documentElement.clientHeight || 0;
  }

  function applyMobileViewportHeightVar() {
    const viewportHeight = getVisualViewportHeight();
    if (!viewportHeight) return;
    document.documentElement.style.setProperty(
      "--mobile-vh",
      `${Math.round(viewportHeight)}px`,
    );
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    applyMobileViewportHeightVar();
    window.addEventListener("resize", applyMobileViewportHeightVar);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", applyMobileViewportHeightVar);
    }
    window.hideMobileTooltip = hideMobile;
  }

  return {
    initialize,
    isMobileDevice,
    showMobile,
    hideMobile,
    getHorizontalBounds: getTooltipHorizontalBounds,
    positionNearPoint,
    showForSvgElement,
    showForUserAnnotation,
    showAtPointer,
  };
};

// ---- ./src/filter-layout.js ----
window.createFilterLayoutService = function createFilterLayoutService(deps) {
  let panelSpaceAnimationFrame = null;

  function captureViewportAnchor() {
    if (!deps.wrapper || !deps.image) return null;
    const wrapperRect = deps.wrapper.getBoundingClientRect();
    const imageRect = deps.image.getBoundingClientRect();
    if (!wrapperRect || !imageRect || imageRect.width <= 0 || imageRect.height <= 0) {
      return null;
    }

    const centerX = wrapperRect.left + wrapperRect.width / 2;
    const centerY = wrapperRect.top + wrapperRect.height / 2;
    return {
      nx: (centerX - imageRect.left) / imageRect.width,
      ny: (centerY - imageRect.top) / imageRect.height,
    };
  }

  function restoreViewportAnchor(anchor) {
    if (!anchor || !deps.wrapper || !deps.image) return;
    const wrapperRect = deps.wrapper.getBoundingClientRect();
    const imageRect = deps.image.getBoundingClientRect();
    if (!wrapperRect || !imageRect || imageRect.width <= 0 || imageRect.height <= 0) {
      return;
    }

    const centerX = wrapperRect.left + wrapperRect.width / 2;
    const centerY = wrapperRect.top + wrapperRect.height / 2;
    const targetX = imageRect.left + imageRect.width * anchor.nx;
    const targetY = imageRect.top + imageRect.height * anchor.ny;
    const deltaX = centerX - targetX;
    const deltaY = centerY - targetY;

    deps.setImageTranslateX(deps.getImageTranslateX() + deltaX);
    deps.setImageTranslateY(deps.getImageTranslateY() + deltaY);
  }

  function readCurrentPanelSpacePx() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--filter-panel-space");
    const numeric = Number.parseFloat(raw);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function writePanelSpacePx(value) {
    const px = Math.max(0, Number(value) || 0);
    document.documentElement.style.setProperty("--filter-panel-space", `${Math.round(px)}px`);
  }

  function applyPanelSpaceWithLayout(panelSpacePx, options = {}) {
    writePanelSpacePx(panelSpacePx);

    if (deps.getDiagramAspectRatio()) {
      const anchor = options.anchor || null;
      deps.syncDiagramSize();
      if (anchor) {
        restoreViewportAnchor(anchor);
      }
      if (!options.skipImageTransform) {
        deps.updateImageTransform();
      }
    }
  }

  function animatePanelSpaceTo(targetPanelSpacePx, options = {}) {
    const duration = 400;
    const startPanelSpacePx = readCurrentPanelSpacePx();
    const delta = targetPanelSpacePx - startPanelSpacePx;

    if (panelSpaceAnimationFrame) {
      cancelAnimationFrame(panelSpaceAnimationFrame);
      panelSpaceAnimationFrame = null;
    }

    if (Math.abs(delta) < 0.5 || options.disableAnimation) {
      applyPanelSpaceWithLayout(targetPanelSpacePx, options);
      return;
    }

    const anchor = options.preserveView ? captureViewportAnchor() : null;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const panelSpacePx = startPanelSpacePx + delta * eased;

      applyPanelSpaceWithLayout(panelSpacePx, {
        ...options,
        anchor,
      });

      if (t < 1) {
        panelSpaceAnimationFrame = requestAnimationFrame(step);
      } else {
        panelSpaceAnimationFrame = null;
        applyPanelSpaceWithLayout(targetPanelSpacePx, {
          ...options,
          anchor,
        });
      }
    };

    panelSpaceAnimationFrame = requestAnimationFrame(step);
  }

  function getPanelWidthPx() {
    if (window.innerWidth <= 768) {
      return window.innerWidth;
    }

    const panelRect = deps.filterPanel.getBoundingClientRect();
    if (panelRect.width > 0) return panelRect.width;

    return Math.min(420, window.innerWidth * 0.92);
  }

  function updateLayout(filterPanelOpen, options = {}) {
    const skipImageTransform = Boolean(options.skipImageTransform);
    const fitAllMode = typeof deps.getFitAllMode === "function" ? deps.getFitAllMode() : false;
    const preserveView =
      typeof options.preserveView === "boolean" ? options.preserveView : !fitAllMode;
    const disablePanelAnimation = Boolean(options.disablePanelAnimation);
    const panelWidth = getPanelWidthPx();
    const canDockPanel = window.innerWidth > 768;

    const filterPanelOverlayMode = !(filterPanelOpen && canDockPanel);
    document.body.classList.toggle(
      "filter-overlay-open",
      filterPanelOpen && filterPanelOverlayMode,
    );
    document.body.classList.toggle(
      "filter-docked-open",
      filterPanelOpen && !filterPanelOverlayMode,
    );
    deps.filterPanelBackdrop.classList.toggle(
      "open",
      filterPanelOpen && filterPanelOverlayMode,
    );

    const panelSpace =
      filterPanelOpen && !filterPanelOverlayMode
        ? `${Math.ceil(panelWidth)}px`
        : "0px";
    const targetPanelSpacePx = Number.parseFloat(panelSpace) || 0;

    animatePanelSpaceTo(targetPanelSpacePx, {
      preserveView,
      disableAnimation: disablePanelAnimation,
      skipImageTransform,
    });

    return filterPanelOverlayMode;
  }

  return {
    getPanelWidthPx,
    updateLayout,
  };
};

// ---- ./src/filter-panel-state.js ----
window.createFilterPanelStateService = function createFilterPanelStateService(deps) {
  let pendingFocusTimeout = null;

  function isMobileLayout() {
    return window.innerWidth <= 768 || "ontouchstart" in window;
  }

  function clearPendingSearchFocus() {
    if (pendingFocusTimeout) {
      clearTimeout(pendingFocusTimeout);
      pendingFocusTimeout = null;
    }
  }

  function setFilterPanelOpen(open) {
    const isOpen = Boolean(open);
    clearPendingSearchFocus();

    deps.setFilterPanelOpenState(isOpen);

    document.body.classList.toggle("filter-panel-open", isOpen);
    deps.filterPanel.classList.toggle("open", isOpen);
    deps.filterPanel.setAttribute("aria-hidden", isOpen ? "false" : "true");
    deps.openFilterPanelBtn.classList.toggle("active", isOpen);

    updateFilterPanelLayout();

    if (isOpen) {
      if (!isMobileLayout()) {
        pendingFocusTimeout = setTimeout(() => {
          pendingFocusTimeout = null;
          if (!deps.getFilterPanelOpenState()) return;
          deps.filterSearchInput.focus();
        }, 80);
      }
    } else {
      deps.filterSearchInput.blur();
      deps.clearFilterHighlight();
    }

    deps.updateURLState();
  }

  function getFilterPanelWidthPx() {
    return deps.getPanelWidthPx();
  }

  function updateFilterPanelLayout(options = {}) {
    const overlayMode = deps.updateLayout(deps.getFilterPanelOpenState(), options);
    deps.setFilterPanelOverlayMode(overlayMode);
  }

  return {
    setFilterPanelOpen,
    getFilterPanelWidthPx,
    updateFilterPanelLayout,
  };
};

// ---- ./src/filter-panel-input.js ----
window.createFilterPanelInputService = function createFilterPanelInputService(deps) {
  function initialize() {
    deps.openFilterPanelBtn.addEventListener("click", () => {
      deps.setFilterPanelOpen(!deps.getFilterPanelOpen());
    });

    deps.closeFilterPanelBtn.addEventListener("click", () => {
      deps.setFilterPanelOpen(false);
    });

    deps.filterPanelBackdrop.addEventListener("click", () => {
      if (deps.getFilterPanelOpen() && deps.getFilterPanelOverlayMode()) {
        deps.setFilterPanelOpen(false);
      }
    });

    document.addEventListener("mousedown", (e) => {
      if (!deps.getFilterPanelOpen() || !deps.getFilterPanelOverlayMode()) return;
      if (
        deps.filterPanel.contains(e.target) ||
        deps.openFilterPanelBtn.contains(e.target)
      ) {
        return;
      }
      deps.setFilterPanelOpen(false);
    });

    deps.filterSearchInput.addEventListener("input", () => {
      deps.setAnnotationSearchQuery(deps.filterSearchInput.value || "");
      deps.applyAnnotationFilter();
      deps.updateURLState();
    });

    deps.resetFilterBtn.addEventListener("click", () => {
      deps.setAnnotationSearchQuery("");
      deps.filterSearchInput.value = "";

      deps.getTagVisibility().forEach((_, tag) => {
        deps.getTagVisibility().set(tag, true);
      });

      deps.initializeTagControls();
      deps.applyAnnotationFilter();
      deps.updateURLState();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !deps.getFilterPanelOpen()) return;
      if (deps.isAnyAnnotationModalOpen()) return;
      deps.setFilterPanelOpen(false);
    });
  }

  return {
    initialize,
  };
};

// ---- ./src/viewport.js ----
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

// ---- ./src/viewport-input.js ----
window.createViewportInputService = function createViewportInputService(deps) {
  let lastPinchDistance = 0;
  let lastPinchCenter = { x: 0, y: 0 };
  let isPinching = false;
  let blockSingleTouchPan = false;
  let initialized = false;
  let resizeAnchor = null;
  let resizeAnchorResetTimeout = null;
  let viewportInteractionStarted = false;
  let resizeSettleTimeout = null;

  function applyRawImageTransform() {
    const currentZoom = deps.getCurrentZoom();
    const imageTranslateX = deps.getImageTranslateX();
    const imageTranslateY = deps.getImageTranslateY();
    deps.image.style.transform = `matrix(${currentZoom}, 0, 0, ${currentZoom}, ${imageTranslateX}, ${imageTranslateY})`;
    deps.image.style.cursor = currentZoom > deps.getMinZoom() ? "grab" : "default";
  }

  function handleResize() {
    try {
      const currentZoom = deps.getCurrentZoom();
      const minZoom = deps.getMinZoom();

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
      if (!viewportInteractionStarted && currentZoom <= minZoom + 0.001) {
        deps.updateFilterPanelLayout({
          skipImageTransform: true,
          disablePanelAnimation: true,
        });
        if (typeof deps.getFitAllMode === "function" && deps.getFitAllMode()) {
          deps.centerImageAtCurrentZoom();
        } else if (typeof deps.alignImageAtCurrentZoom === "function") {
          deps.alignImageAtCurrentZoom("left", "bottom");
        } else {
          deps.centerImageAtCurrentZoom();
        }
        applyRawImageTransform();

        deps.setCachedBounds(null);
        deps.setIsTouchActive(false);
        deps.scheduleMarkerPositioning(true);
        return;
      }

      if (!resizeAnchor) {
        const beforeWrapperRect = deps.wrapper.getBoundingClientRect();
        const beforeImageRect = deps.image.getBoundingClientRect();
        const centerXBefore = beforeWrapperRect.left + beforeWrapperRect.width / 2;
        const centerYBefore = beforeWrapperRect.top + beforeWrapperRect.height / 2;
        const nx =
          beforeImageRect.width > 0
            ? (centerXBefore - beforeImageRect.left) / beforeImageRect.width
            : 0.5;
        const ny =
          beforeImageRect.height > 0
            ? (centerYBefore - beforeImageRect.top) / beforeImageRect.height
            : 0.5;
        resizeAnchor = { nx, ny };
      }

      if (resizeAnchorResetTimeout) {
        clearTimeout(resizeAnchorResetTimeout);
        resizeAnchorResetTimeout = null;
      }
      resizeAnchorResetTimeout = setTimeout(() => {
        resizeAnchor = null;
        resizeAnchorResetTimeout = null;
      }, 20);

      const nx = resizeAnchor.nx;
      const ny = resizeAnchor.ny;

      deps.updateFilterPanelLayout({
        skipImageTransform: true,
        disablePanelAnimation: true,
      });

      const afterWrapperRect = deps.wrapper.getBoundingClientRect();
      const afterImageRect = deps.image.getBoundingClientRect();
      const centerXAfter = afterWrapperRect.left + afterWrapperRect.width / 2;
      const centerYAfter = afterWrapperRect.top + afterWrapperRect.height / 2;
      const targetXAfter = afterImageRect.left + afterImageRect.width * nx;
      const targetYAfter = afterImageRect.top + afterImageRect.height * ny;
      const deltaX = centerXAfter - targetXAfter;
      const deltaY = centerYAfter - targetYAfter;

      if (currentZoom <= minZoom + 0.001) {
        deps.centerImageAtCurrentZoom();
      } else {
        deps.setImageTranslateX(deps.getImageTranslateX() + deltaX);
        deps.setImageTranslateY(deps.getImageTranslateY() + deltaY);
      }
      applyRawImageTransform();

      if (resizeSettleTimeout) {
        clearTimeout(resizeSettleTimeout);
        resizeSettleTimeout = null;
      }
      resizeSettleTimeout = setTimeout(() => {
        resizeSettleTimeout = null;
        deps.updateImageTransform();
      }, 20);

      deps.setCachedBounds(null);
      deps.setIsTouchActive(false);
      deps.scheduleMarkerPositioning(true);
    } catch (error) {
      console.error("Error during resize handling:", error);
    }
  }

  function isViewportLockedByMobileTooltip() {
    if (document.body.classList.contains("mobile-tooltip-open")) {
      return true;
    }

    const mobileTooltip = window.currentMobileTooltip;
    return Boolean(
      mobileTooltip &&
      mobileTooltip.style &&
      mobileTooltip.style.display !== "none",
    );
  }

  function handleWheel(e) {
    const wasFitAll =
      typeof deps.getFitAllMode === "function" && deps.getFitAllMode();
    const oldZoom = deps.getCurrentZoom();
    if (isViewportLockedByMobileTooltip()) {
      const mobileTooltip = window.currentMobileTooltip;
      const rawTarget = e && e.target;
      const target =
        rawTarget && rawTarget.nodeType === 1
          ? rawTarget
          : rawTarget && rawTarget.parentElement
            ? rawTarget.parentElement
            : null;
      const insideMobileTooltip =
        mobileTooltip &&
        target &&
        mobileTooltip.contains(target);

      if (!insideMobileTooltip && e.cancelable) e.preventDefault();
      return;
    }

    if (typeof deps.shouldIgnoreWheelEvent === "function" && deps.shouldIgnoreWheelEvent(e)) {
      return;
    }

    if (deps.getFilterPanelOpen() && deps.filterPanel.contains(e.target)) {
      return;
    }

    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      return;
    }

    let imageRect = deps.image.getBoundingClientRect();
    let isOverImage =
      e.clientX >= imageRect.left &&
      e.clientX <= imageRect.right &&
      e.clientY >= imageRect.top &&
      e.clientY <= imageRect.bottom;

    if (!isOverImage) {
      return;
    }

    e.preventDefault();

    const zoomStep = 0.05;
    const imageRectBeforeZoom = deps.image.getBoundingClientRect();
    if (e.deltaY < 0) {
      deps.setCurrentZoom(Math.min(oldZoom + zoomStep, deps.getMaxZoom()));
    } else {
      deps.setCurrentZoom(Math.max(oldZoom - zoomStep, deps.getMinZoom()));
    }

    const currentZoom = deps.getCurrentZoom();
    if (Math.abs(currentZoom - oldZoom) <= 0.001) {
      return;
    }

    viewportInteractionStarted = true;

    const wrapperRectNow = deps.wrapper.getBoundingClientRect();
    const anchorXOnWrapper = e.clientX - wrapperRectNow.left;
    const anchorYOnWrapper = e.clientY - wrapperRectNow.top;

    const imageLeftOnWrapper = imageRectBeforeZoom.left - wrapperRectNow.left;
    const imageTopOnWrapper = imageRectBeforeZoom.top - wrapperRectNow.top;
    const imageBaseLeftOnWrapper = imageLeftOnWrapper - deps.getImageTranslateX();
    const imageBaseTopOnWrapper = imageTopOnWrapper - deps.getImageTranslateY();

    const targetX = (anchorXOnWrapper - imageLeftOnWrapper) / oldZoom;
    const targetY = (anchorYOnWrapper - imageTopOnWrapper) / oldZoom;

    deps.setImageTranslateX(
      anchorXOnWrapper - imageBaseLeftOnWrapper - targetX * currentZoom,
    );
    deps.setImageTranslateY(
      anchorYOnWrapper - imageBaseTopOnWrapper - targetY * currentZoom,
    );

    if (deps.getCurrentZoom() < deps.getMinZoom()) {
      deps.setCurrentZoom(deps.getMinZoom());
    }

    const shouldExitFitAllOnThisStep =
      wasFitAll &&
      e.deltaY < 0 &&
      deps.getCurrentZoom() > deps.getMinZoom() + 0.0001 &&
      typeof deps.exitFitAllStateOnly === "function";

    if (shouldExitFitAllOnThisStep) {
      deps.exitFitAllStateOnly();
    }

    deps.updateImageTransform();

    if (typeof deps.maybePromoteFitGeometryToCover === "function") {
      deps.maybePromoteFitGeometryToCover(e.clientX, e.clientY);
    }

  }

  function handleMouseDown(e) {
    if (isViewportLockedByMobileTooltip()) return;
    if (!canPanAtCurrentZoom()) return;
    if (e.button !== 0) return;
    if (!deps.image.contains(e.target)) return;

    if (typeof deps.getFitAllMode === "function" && deps.getFitAllMode()) {
      if (typeof deps.disableFitAllForInteraction === "function") {
        deps.disableFitAllForInteraction(e.clientX, e.clientY);
      } else if (typeof deps.disableFitAllKeepViewport === "function") {
        deps.disableFitAllKeepViewport({
          anchorClientX: e.clientX,
          anchorClientY: e.clientY,
        });
      }
    }

    deps.setIsPanning(true);
    viewportInteractionStarted = true;
    deps.setPanStartX(e.clientX - deps.getImageTranslateX());
    deps.setPanStartY(e.clientY - deps.getImageTranslateY());

    deps.image.style.cursor = "grabbing";
    e.preventDefault();
  }

  function handleMouseMove(e) {
    if (isViewportLockedByMobileTooltip()) return;
    if (!deps.getIsPanning()) return;

    deps.setImageTranslateX(e.clientX - deps.getPanStartX());
    deps.setImageTranslateY(e.clientY - deps.getPanStartY());

    deps.updateImageTransform();
    e.preventDefault();
  }

  function handleMouseUp(e) {
    if (isViewportLockedByMobileTooltip()) {
      if (deps.getIsPanning()) {
        deps.setIsPanning(false);
      }
      return;
    }

    if (!deps.getIsPanning()) return;

    deps.setIsPanning(false);
    deps.image.style.cursor =
      deps.getCurrentZoom() > deps.getMinZoom() ? "grab" : "default";
    e.preventDefault();
  }

  function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getTouchCenter(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }

  function canPanAtCurrentZoom() {
    const currentZoom = deps.getCurrentZoom();
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

    return (
      displayedWidth * currentZoom > viewportWidth ||
      displayedHeight * currentZoom > viewportHeight
    );
  }

  function shouldIgnoreTouchEvent(e) {
    const rawTarget = e && e.target;
    const target =
      rawTarget && typeof rawTarget.closest === "function"
        ? rawTarget
        : rawTarget && rawTarget.parentElement && typeof rawTarget.parentElement.closest === "function"
          ? rawTarget.parentElement
          : null;

    const mobileTooltip = window.currentMobileTooltip;
    if (
      mobileTooltip &&
      mobileTooltip.style &&
      mobileTooltip.style.display !== "none" &&
      target &&
      mobileTooltip.contains(target)
    ) {
      return true;
    }

    if (!target || typeof target.closest !== "function") return false;

    return Boolean(
      target.closest(".tooltip-box") ||
      target.closest("#filter-panel") ||
      target.closest("#user-annotations-modal") ||
      target.closest("#edit-annotation-modal"),
    );
  }

  function handleTouchStart(e) {
    if (isViewportLockedByMobileTooltip()) {
      deps.setIsPanning(false);
      deps.setIsTouchActive(false);
      return;
    }

    if (shouldIgnoreTouchEvent(e)) {
      deps.setIsPanning(false);
      deps.setIsTouchActive(false);
      return;
    }

    deps.setIsTouchActive(true);

    deps.setCachedBounds(null);
    deps.getImageBounds(true);

    if (e.touches.length === 2) {
      if (typeof deps.getFitAllMode === "function" && deps.getFitAllMode()) {
        if (typeof deps.disableFitAllForInteraction === "function") {
          deps.disableFitAllForInteraction(
            e.touches[0] ? e.touches[0].clientX : null,
            e.touches[0] ? e.touches[0].clientY : null,
          );
        } else if (typeof deps.disableFitAllKeepViewport === "function") {
          deps.disableFitAllKeepViewport({
            anchorClientX: e.touches[0] ? e.touches[0].clientX : null,
            anchorClientY: e.touches[0] ? e.touches[0].clientY : null,
          });
        }
      }
      viewportInteractionStarted = true;
      isPinching = true;
      blockSingleTouchPan = false;
      deps.setIsPanning(false);
      lastPinchDistance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      const wrapperRect = deps.wrapper.getBoundingClientRect();
      lastPinchCenter = {
        x: center.x - wrapperRect.left,
        y: center.y - wrapperRect.top,
      };
      if (e.cancelable) e.preventDefault();
      return;
    }

    if (e.touches.length === 1 && !blockSingleTouchPan && canPanAtCurrentZoom()) {
      if (typeof deps.getFitAllMode === "function" && deps.getFitAllMode()) {
        if (typeof deps.disableFitAllForInteraction === "function") {
          deps.disableFitAllForInteraction(
            e.touches[0] ? e.touches[0].clientX : null,
            e.touches[0] ? e.touches[0].clientY : null,
          );
        } else if (typeof deps.disableFitAllKeepViewport === "function") {
          deps.disableFitAllKeepViewport({
            anchorClientX: e.touches[0] ? e.touches[0].clientX : null,
            anchorClientY: e.touches[0] ? e.touches[0].clientY : null,
          });
        }
      }
      deps.setIsPanning(true);
      viewportInteractionStarted = true;
      deps.setPanStartX(e.touches[0].clientX - deps.getImageTranslateX());
      deps.setPanStartY(e.touches[0].clientY - deps.getImageTranslateY());
      if (e.cancelable) e.preventDefault();
    }
  }

  function handleTouchMove(e) {
    if (isViewportLockedByMobileTooltip()) {
      return;
    }

    if (shouldIgnoreTouchEvent(e)) {
      return;
    }

    if (e.touches.length === 2) {
      if (!isPinching) {
        isPinching = true;
        deps.setIsPanning(false);
        lastPinchDistance = getTouchDistance(e.touches);
        const center = getTouchCenter(e.touches);
        const wrapperRectInit = deps.wrapper.getBoundingClientRect();
        lastPinchCenter = {
          x: center.x - wrapperRectInit.left,
          y: center.y - wrapperRectInit.top,
        };
      }

      const currentDistance = getTouchDistance(e.touches);
      const currentCenter = getTouchCenter(e.touches);
      const imageRectBeforeZoom = deps.image.getBoundingClientRect();

      const safeLastDistance = lastPinchDistance > 0 ? lastPinchDistance : currentDistance;
      const distanceRatio = currentDistance / safeLastDistance;
      const newZoom = Math.max(
        deps.getMinZoom(),
        Math.min(deps.getMaxZoom(), deps.getCurrentZoom() * distanceRatio),
      );

      const wrapperRect = deps.wrapper.getBoundingClientRect();
      const centerX = currentCenter.x - wrapperRect.left;
      const centerY = currentCenter.y - wrapperRect.top;
      const imageLeftOnWrapper = imageRectBeforeZoom.left - wrapperRect.left;
      const imageTopOnWrapper = imageRectBeforeZoom.top - wrapperRect.top;
      const imageBaseLeftOnWrapper = imageLeftOnWrapper - deps.getImageTranslateX();
      const imageBaseTopOnWrapper = imageTopOnWrapper - deps.getImageTranslateY();

      const oldZoom = deps.getCurrentZoom();
      deps.setCurrentZoom(newZoom);

      if (Math.abs(deps.getCurrentZoom() - oldZoom) > 0.0001) {
        const targetX = (centerX - imageLeftOnWrapper) / oldZoom;
        const targetY = (centerY - imageTopOnWrapper) / oldZoom;

        deps.setImageTranslateX(
          centerX - imageBaseLeftOnWrapper - targetX * deps.getCurrentZoom(),
        );
        deps.setImageTranslateY(
          centerY - imageBaseTopOnWrapper - targetY * deps.getCurrentZoom(),
        );
      } else {
        const deltaX = centerX - lastPinchCenter.x;
        const deltaY = centerY - lastPinchCenter.y;
        deps.setImageTranslateX(deps.getImageTranslateX() + deltaX);
        deps.setImageTranslateY(deps.getImageTranslateY() + deltaY);
      }

      if (deps.getCurrentZoom() < deps.getMinZoom()) {
        deps.setCurrentZoom(deps.getMinZoom());
      }

      deps.updateImageTransform();
      lastPinchDistance = currentDistance;
      lastPinchCenter = { x: centerX, y: centerY };
      if (e.cancelable) e.preventDefault();
      return;
    }

    if (e.touches.length === 1 && blockSingleTouchPan) {
      if (e.cancelable) e.preventDefault();
      return;
    }

    if (e.touches.length === 1 && deps.getIsPanning()) {
      deps.setImageTranslateX(e.touches[0].clientX - deps.getPanStartX());
      deps.setImageTranslateY(e.touches[0].clientY - deps.getPanStartY());
      deps.updateImageTransform();
      if (e.cancelable) e.preventDefault();
    }
  }

  function handleTouchEnd(e) {
    if (isViewportLockedByMobileTooltip()) {
      deps.setIsPanning(false);
      deps.setIsTouchActive(false);
      return;
    }

    if (shouldIgnoreTouchEvent(e)) {
      return;
    }

    if (e.touches.length === 1 && isPinching) {
      isPinching = false;
      blockSingleTouchPan = true;
      deps.setIsPanning(false);
      lastPinchDistance = 0;
      if (e.cancelable) e.preventDefault();
      return;
    }

    if (e.touches.length === 2) {
      isPinching = true;
      deps.setIsPanning(false);
      lastPinchDistance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      const wrapperRect = deps.wrapper.getBoundingClientRect();
      lastPinchCenter = {
        x: center.x - wrapperRect.left,
        y: center.y - wrapperRect.top,
      };
      return;
    }

    if (e.touches.length !== 0) return;

    deps.setIsPanning(false);
    isPinching = false;
    blockSingleTouchPan = false;
    lastPinchDistance = 0;
    lastPinchCenter = { x: 0, y: 0 };

    deps.setIsTouchActive(false);
    deps.setCachedBounds(null);
    deps.scheduleMarkerPositioning(true);
  }

  function handleDocumentTouchMove(e) {
    if (isViewportLockedByMobileTooltip()) {
      return;
    }

    if (!deps.getIsTouchActive()) return;
    if (!e.touches || e.touches.length < 2) return;
    if (e.cancelable) e.preventDefault();
  }

  function handleGestureEvent(e) {
    if (e.cancelable) e.preventDefault();
  }

  function initialize() {
    if (initialized) return;
    initialized = true;

    window.addEventListener("resize", handleResize);

    document.addEventListener("wheel", handleWheel, { passive: false });
    deps.image.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    deps.wrapper.addEventListener("touchstart", handleTouchStart, { passive: false });
    deps.wrapper.addEventListener("touchmove", handleTouchMove, { passive: false });
    deps.wrapper.addEventListener("touchend", handleTouchEnd);

    document.addEventListener("touchmove", handleDocumentTouchMove, { passive: false });
    deps.wrapper.addEventListener("gesturestart", handleGestureEvent, { passive: false });
    deps.wrapper.addEventListener("gesturechange", handleGestureEvent, { passive: false });
    deps.wrapper.addEventListener("gestureend", handleGestureEvent, { passive: false });
  }

  return {
    initialize,
    handleResize,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};

// ---- ./src/theme.js ----
window.createThemeService = function createThemeService(deps) {
  const THEME_DARK = "dark";
  const THEME_LIGHT = "light";

  function getInitialTheme() {
    const saved = localStorage.getItem(deps.storageKey);
    if (saved === THEME_DARK || saved === THEME_LIGHT) {
      return saved;
    }

    //// Dark theme still too ugly to be default
    // if (
    //   window.matchMedia &&
    //   window.matchMedia("(prefers-color-scheme: dark)").matches
    // ) {
    //   return THEME_DARK;
    // }

    return THEME_LIGHT;
  }

  function applyTheme(theme) {
    const isDark = theme === THEME_DARK;
    document.body.classList.toggle("theme-dark", isDark);
    deps.toggleButton.classList.toggle("active", isDark);

    const themeLabel = deps.toggleButton.querySelector(".theme-label");
    if (themeLabel) {
      themeLabel.textContent = isDark ? "Light theme" : "Dark theme";
    }

    deps.toggleButton.setAttribute("aria-pressed", isDark ? "true" : "false");
    deps.toggleButton.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode",
    );
    deps.toggleButton.setAttribute(
      "title",
      isDark ? "Switch to light mode" : "Switch to dark mode",
    );
  }

  let currentTheme = getInitialTheme();
  applyTheme(currentTheme);

  function toggleTheme() {
    currentTheme = currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
    localStorage.setItem(deps.storageKey, currentTheme);
    applyTheme(currentTheme);
    return currentTheme;
  }

  return {
    getCurrentTheme: () => currentTheme,
    applyTheme,
    toggleTheme,
  };
};

// ---- ./src/content-utils.js ----
window.createContentUtilsService = function createContentUtilsService(deps) {
  function escapeHTML(str) {
    const div = document.createElement("div");
    div.innerText = str;
    return div.innerHTML;
  }

  function cleanMultiline(str) {
    if (!str) return "";

    const raw = str.replace(/^\s*\n/, "").trimEnd();
    const lines = raw.split("\n");

    const indent = lines
      .filter((line) => line.trim())
      .map((line) => line.match(/^(\s*)/)?.[1].length || 0)
      .reduce((a, b) => Math.min(a, b), Infinity);

    return lines.map((line) => line.slice(indent)).join("<br>");
  }

  function sanitizeUserHtml(html) {
    if (!html) return "";

    const allowedTags = deps.getAllowedHtmlTags();
    const whitelist = deps.getHtmlWhitelist();

    const div = document.createElement("div");
    div.innerHTML = html;

    function cleanNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();

        if (allowedTags.includes(tagName)) {
          const allowedAttrs = whitelist[tagName] || [];
          let result = `<${tagName}`;

          for (const attr of allowedAttrs) {
            if (node.hasAttribute(attr)) {
              result += ` ${attr}="${escapeHTML(node.getAttribute(attr))}"`;
            }
          }

          result += ">";

          for (const child of node.childNodes) {
            result += cleanNode(child);
          }

          if (!["br", "hr"].includes(tagName)) {
            result += `</${tagName}>`;
          }

          return result;
        }

        let result = "";
        for (const child of node.childNodes) {
          result += cleanNode(child);
        }
        return result;
      }

      return "";
    }

    let result = "";
    for (const child of div.childNodes) {
      result += cleanNode(child);
    }

    return result;
  }

  function processUserDescription(text) {
    if (!text) return "";
    const withBreaks = text.replace(/\n/g, "<br>");
    return sanitizeUserHtml(withBreaks);
  }

  return {
    escapeHTML,
    cleanMultiline,
    sanitizeUserHtml,
    processUserDescription,
  };
};

// ---- ./src/help-utils.js ----
window.createHelpUtilsService = function createHelpUtilsService(deps) {
  function normalizeQuery(query) {
    return (query || "").trim().toLowerCase();
  }

  function helpMatchesSearch(record, query) {
    if (!query) return true;
    return record.searchText.includes(query);
  }

  function parseHelpContent(rawText) {
    if (!rawText || typeof rawText !== "string") return null;

    const normalized = rawText.replace(/\r\n?/g, "\n").trim();
    if (!normalized) return null;

    const lines = normalized.split("\n");
    const firstContentIndex = lines.findIndex((line) => line.trim().length > 0);
    if (firstContentIndex === -1) return null;

    const title = lines[firstContentIndex].trim();
    const bodyRaw = lines.slice(firstContentIndex + 1).join("\n");
    const bodyHtml = deps.cleanMultiline(bodyRaw).trim();

    return {
      title,
      bodyHtml,
      searchText: `${title}\n${bodyRaw}`.toLowerCase(),
    };
  }

  function getFilterResultSummary(helpVisible, helpTotal, query) {
    const total = helpTotal;
    const totalMatches = helpVisible;

    if (query) {
      return `${totalMatches} match${totalMatches === 1 ? "" : "es"} for \"${query}\"`;
    }

    if (totalMatches === total) {
      return `Showing all annotations (${total})`;
    }

    return `Showing ${totalMatches} of ${total} annotations`;
  }

  return {
    normalizeQuery,
    helpMatchesSearch,
    parseHelpContent,
    getFilterResultSummary,
  };
};

// ---- ./src/filter-highlight.js ----
window.createFilterHighlightService = function createFilterHighlightService(deps = {}) {
  let activeFilterHighlight = null;
  let activeConnection = null;
  let pendingHighlightToken = 0;
  let lineLayer = null;
  let lineElement = null;
  let lineFrame = null;
  let lineAnimationFrame = null;
  let temporaryHighlightTimeout = null;
  const VIEWPORT_PADDING = 8;

  function clampToViewport(value, max) {
    return Math.max(VIEWPORT_PADDING, Math.min(value, max - VIEWPORT_PADDING));
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
    const svgRect = getRectFromSvgGraphicsElement(element);
    if (svgRect) return svgRect;
    if (!element || typeof element.getBoundingClientRect !== "function") return null;
    const rect = element.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  }

  function resolveElementAnchorPoint(targetEl, sourceX, sourceY) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const viewportArea = viewportWidth * viewportHeight;

    const candidates = [targetEl];
    const candidateSelector =
      "rect,circle,ellipse,path,polygon,polyline,line,text,foreignObject,use,image";
    if (targetEl && typeof targetEl.querySelectorAll === "function") {
      candidates.push(...Array.from(targetEl.querySelectorAll(candidateSelector)));
    }

    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;

    candidates.forEach((candidate) => {
      const rect = getElementRect(candidate);
      if (!rect) return;

      const area = rect.width * rect.height;
      if (!Number.isFinite(area) || area <= 1) return;
      if (area > viewportArea * 0.75) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = centerX - sourceX;
      const dy = centerY - sourceY;
      const dist = Math.hypot(dx, dy);
      const areaPenalty = Math.sqrt(area) * 0.35;
      const score = dist + areaPenalty;

      if (score < bestScore) {
        bestScore = score;
        best = { x: centerX, y: centerY };
      }
    });

    if (best) return best;

    const fallbackRect = getElementRect(targetEl);
    if (fallbackRect) {
      return {
        x: fallbackRect.left + fallbackRect.width / 2,
        y: fallbackRect.top + fallbackRect.height / 2,
      };
    }

    return {
      x: viewportWidth / 2,
      y: viewportHeight / 2,
    };
  }

  function setLinePoints(x1, y1, x2, y2) {
    if (!lineElement) return;
    lineElement.setAttribute("x1", `${x1}`);
    lineElement.setAttribute("y1", `${y1}`);
    lineElement.setAttribute("x2", `${x2}`);
    lineElement.setAttribute("y2", `${y2}`);
  }

  function getConnectionPoints() {
    if (!activeConnection) return null;
    const { sourceEl, targetEl } = activeConnection;
    if (!sourceEl || !targetEl || !document.body.contains(sourceEl) || !document.body.contains(targetEl)) {
      return null;
    }

    const sourceRect = sourceEl.getBoundingClientRect();
    const targetPoint = resolveElementAnchorPoint(targetEl, sourceRect.left + 8, sourceRect.top + sourceRect.height / 2);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const sourceViewportEl = sourceEl.closest(".filter-panel-body");

    const sourceRawX = sourceRect.left + 8;
    const sourceRawY = sourceRect.top + sourceRect.height / 2;
    const targetRawX = targetPoint.x;
    const targetRawY = targetPoint.y;

    let sourceMinY = VIEWPORT_PADDING;
    let sourceMaxY = viewportHeight - VIEWPORT_PADDING;
    if (sourceViewportEl) {
      const sourceViewportRect = sourceViewportEl.getBoundingClientRect();
      sourceMinY = Math.max(sourceMinY, sourceViewportRect.top + VIEWPORT_PADDING);
      sourceMaxY = Math.min(sourceMaxY, sourceViewportRect.bottom - VIEWPORT_PADDING);
    }

    if (sourceMaxY < sourceMinY) {
      sourceMinY = VIEWPORT_PADDING;
      sourceMaxY = viewportHeight - VIEWPORT_PADDING;
    }

    return {
      viewportWidth,
      viewportHeight,
      sourceX: clampToViewport(sourceRawX, viewportWidth),
      sourceY: Math.max(sourceMinY, Math.min(sourceRawY, sourceMaxY)),
      targetX: clampToViewport(targetRawX, viewportWidth),
      targetY: clampToViewport(targetRawY, viewportHeight),
    };
  }

  function stopLineAnimation() {
    if (!lineAnimationFrame) return;
    cancelAnimationFrame(lineAnimationFrame);
    lineAnimationFrame = null;
  }

  function animateLineToTarget(durationMs = 200) {
    stopLineAnimation();

    const points = getConnectionPoints();
    if (!points || !lineLayer) {
      if (lineLayer) lineLayer.classList.remove("active");
      return;
    }

    lineLayer.setAttribute(
      "viewBox",
      `0 0 ${points.viewportWidth} ${points.viewportHeight}`,
    );
    lineLayer.classList.add("active");

    const { sourceX, sourceY, targetX, targetY } = points;
    setLinePoints(sourceX, sourceY, sourceX, sourceY);

    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      const x = sourceX + (targetX - sourceX) * t;
      const y = sourceY + (targetY - sourceY) * t;
      setLinePoints(sourceX, sourceY, x, y);

      if (t < 1) {
        lineAnimationFrame = requestAnimationFrame(step);
      } else {
        lineAnimationFrame = null;
      }
    };

    lineAnimationFrame = requestAnimationFrame(step);
  }

  function ensureLineLayer() {
    if (lineLayer && lineElement) return;

    const ns = "http://www.w3.org/2000/svg";
    lineLayer = document.createElementNS(ns, "svg");
    lineLayer.classList.add("filter-highlight-line-layer");
    lineElement = document.createElementNS(ns, "line");
    lineElement.classList.add("filter-highlight-line");
    lineLayer.appendChild(lineElement);
    document.body.appendChild(lineLayer);

    window.addEventListener("resize", scheduleLineUpdate, { passive: true });
    window.addEventListener("scroll", scheduleLineUpdate, true);
  }

  function updateLinePosition() {
    lineFrame = null;
    if (!activeConnection || !lineLayer || !lineElement) return;

    const points = getConnectionPoints();
    if (!points) {
      lineLayer.classList.remove("active");
      return;
    }

    lineLayer.setAttribute(
      "viewBox",
      `0 0 ${points.viewportWidth} ${points.viewportHeight}`,
    );
    setLinePoints(points.sourceX, points.sourceY, points.targetX, points.targetY);
    lineLayer.classList.add("active");
  }

  function scheduleLineUpdate() {
    if (!activeConnection) return;
    if (lineFrame) return;
    lineFrame = requestAnimationFrame(updateLinePosition);
  }

  function clear() {
    pendingHighlightToken += 1;
    if (temporaryHighlightTimeout) {
      clearTimeout(temporaryHighlightTimeout);
      temporaryHighlightTimeout = null;
    }

    if (!activeFilterHighlight) return;

    if (activeFilterHighlight.type === "help") {
      activeFilterHighlight.record?.element?.classList.remove("help-highlight");
    }

    stopLineAnimation();
    activeConnection = null;
    if (lineLayer) {
      lineLayer.classList.remove("active");
    }

    activeFilterHighlight = null;
  }

  function highlightHelpAnnotation(record, sourceEl = null) {
    clear();
    if (!record?.element) return;

    record.element.classList.add("help-highlight");

    if (sourceEl) {
      ensureLineLayer();
      activeConnection = {
        sourceEl,
        targetEl: record.element,
      };
      animateLineToTarget(200);
    }

    activeFilterHighlight = { type: "help", record };
  }

  function highlightTemporarily(record, sourceEl = null, durationMs = 1000) {
    if (!record?.element) return;
    if (temporaryHighlightTimeout) {
      clearTimeout(temporaryHighlightTimeout);
      temporaryHighlightTimeout = null;
    }

    highlightHelpAnnotation(record, sourceEl);
    temporaryHighlightTimeout = setTimeout(() => {
      temporaryHighlightTimeout = null;
      if (activeFilterHighlight?.record === record) {
        clear();
      }
    }, Math.max(100, Number(durationMs) || 1000));
  }

  function bindResultHighlight(item, record) {
    const onEnter = () => {
      if (typeof deps.centerRecordInView === "function") {
        const token = ++pendingHighlightToken;
        deps.centerRecordInView(record, 250, () => {
          if (token !== pendingHighlightToken) return;
          highlightHelpAnnotation(record, item);
        });
        return;
      }

      highlightHelpAnnotation(record, item);
    };

    item.addEventListener("mouseenter", onEnter);
    item.addEventListener("focus", onEnter);
    item.addEventListener("mouseleave", clear);
    item.addEventListener("blur", clear);
  }

  function refreshConnectionPosition() {
    scheduleLineUpdate();
  }

  return {
    clear,
    highlightHelpAnnotation,
    highlightTemporarily,
    bindResultHighlight,
    refreshConnectionPosition,
  };
};

// ---- ./src/filter-results.js ----
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

// ---- ./src/user-annotation-positioning.js ----
window.createUserAnnotationPositioningService = function createUserAnnotationPositioningService(
  deps,
) {
  let frameId = null;

  function isValidBounds(bounds) {
    return (
      bounds &&
      typeof bounds.left === "number" &&
      typeof bounds.top === "number" &&
      typeof bounds.width === "number" &&
      typeof bounds.height === "number" &&
      bounds.width > 0 &&
      bounds.height > 0 &&
      !Number.isNaN(bounds.left) &&
      !Number.isNaN(bounds.top) &&
      !Number.isNaN(bounds.width) &&
      !Number.isNaN(bounds.height)
    );
  }

  function positionUserAnnotationMarkers() {
    const bounds = deps.getImageBounds();
    const wrapper = deps.getWrapper();
    const wrapperRect = wrapper.getBoundingClientRect();

    if (!isValidBounds(bounds)) {
      console.warn(
        "Invalid bounds detected, skipping user annotation positioning",
      );
      return;
    }

    const scale = deps.getMarkerScale();

    deps.getUserAnnotations().forEach((ann) => {
      if (!ann._el) return;

      const style = deps.getUserAnnotationStyle(ann.type);
      if (!style) return;

      const wrapperEl = ann._el;
      const relativeX = ann.x * bounds.width * deps.getCurrentZoom();
      const relativeY = ann.y * bounds.height * deps.getCurrentZoom();

      const imageLeftInWrapper =
        bounds.left - wrapperRect.left + wrapper.scrollLeft;
      const imageTopInWrapper = bounds.top - wrapperRect.top + wrapper.scrollTop;
      const left = imageLeftInWrapper + relativeX;
      const top = imageTopInWrapper + relativeY;

      wrapperEl.style.left = `${left}px`;
      wrapperEl.style.top = `${top}px`;

      if (style.annotationType === "area") {
        const areaElement = wrapperEl.querySelector(".area-annotation");
        if (areaElement) {
          const widthRel = ann.widthRel;
          const heightRel = ann.heightRel;

          const pixelWidth = widthRel * bounds.width * deps.getCurrentZoom();
          const pixelHeight = heightRel * bounds.height * deps.getCurrentZoom();

          areaElement.style.width = `${pixelWidth}px`;
          areaElement.style.height = `${pixelHeight}px`;
        }
      } else {
        const marker = wrapperEl.querySelector(".marker");
        if (marker) {
          const baseSize = bounds.width * scale;
          const userSize =
            baseSize * (style.scale || 2.0) * deps.getCurrentZoom();

          marker.style.width = `${userSize}px`;
          marker.style.height = `${userSize}px`;
          marker.style.fontSize = `${userSize * 0.4}px`;
        }
      }
    });
  }

  function scheduleMarkerPositioning(immediate = false) {
    if (immediate || deps.getIsTouchActive()) {
      if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      positionUserAnnotationMarkers();
      return;
    }

    if (frameId) return;

    frameId = requestAnimationFrame(() => {
      frameId = null;
      positionUserAnnotationMarkers();
    });
  }

  return {
    isValidBounds,
    positionUserAnnotationMarkers,
    scheduleMarkerPositioning,
  };
};

// ---- ./src/user-annotation-forms.js ----
window.createUserAnnotationFormsService = function createUserAnnotationFormsService(
  deps,
) {
  function updateInlineFormValidation() {
    const title = document.getElementById("inline-title").value.trim();
    const type = deps.getSelectedType();
    const placeBtn = document.getElementById("place-annotation-btn");

    let isValid = title && type && deps.getCurrentMode();

    const rectangleBtn = document.getElementById("shape-rectangle");
    const circleBtn = document.getElementById("shape-circle");
    const hasShapeSelected =
      (rectangleBtn && rectangleBtn.classList.contains("active")) ||
      (circleBtn && circleBtn.classList.contains("active"));
    isValid = isValid && hasShapeSelected;

    placeBtn.disabled = !isValid;
  }

  function updateInlineDescriptionPreview() {
    const descInput = document.getElementById("inline-description");
    const preview = document.getElementById("inline-description-preview");

    const processedText = deps.processUserDescription(descInput.value);
    preview.innerHTML = processedText || "<em>No description</em>";
  }

  function updateEditDescriptionPreview() {
    const descInput = document.getElementById("edit-description");
    const preview = document.getElementById("edit-description-preview");

    const processedText = deps.processUserDescription(descInput.value);
    preview.innerHTML = processedText || "<em>No description</em>";
  }

  function initializeInlineForm() {
    const titleInput = document.getElementById("inline-title");
    const descInput = document.getElementById("inline-description");
    const titleCount = document.getElementById("inline-title-count");
    const descCount = document.getElementById("inline-desc-count");

    titleInput.addEventListener("input", () => {
      titleCount.textContent = titleInput.value.length;
      updateInlineFormValidation();
    });

    descInput.addEventListener("input", () => {
      descCount.textContent = descInput.value.length;
      updateInlineDescriptionPreview();
    });

    updateInlineDescriptionPreview();
  }

  function initializeEditForm() {
    const form = document.getElementById("edit-annotation-form");
    const titleInput = document.getElementById("edit-title");
    const descInput = document.getElementById("edit-description");
    const titleCount = document.getElementById("edit-title-count");
    const descCount = document.getElementById("edit-desc-count");
    const cancelBtn = document.getElementById("cancel-edit");

    titleInput.addEventListener("input", () => {
      titleCount.textContent = titleInput.value.length;
    });

    descInput.addEventListener("input", () => {
      descCount.textContent = descInput.value.length;
      updateEditDescriptionPreview();
    });

    form.addEventListener("submit", (e) => {
      if (e.cancelable) e.preventDefault();

      const title = titleInput.value.trim();
      const description = descInput.value;
      const type = document.getElementById("edit-type").value;
      const editIndex = Number.parseInt(form.dataset.editIndex, 10);

      if (!title || !type || Number.isNaN(editIndex)) return;

      const userAnnotations = deps.getUserAnnotations();
      userAnnotations[editIndex] = {
        ...userAnnotations[editIndex],
        title: title.substring(0, 50),
        description: description.substring(0, 500),
        type,
      };

      deps.encodeUserAnnotationsToURL();
      deps.renderAllMarkers();
      deps.updateUserAnnotationsList();

      document.getElementById("edit-annotation-modal").style.display = "none";
    });

    cancelBtn.addEventListener("click", () => {
      document.getElementById("edit-annotation-modal").style.display = "none";
    });
  }

  function clearInlineForm() {
    document.getElementById("inline-title").value = "";
    document.getElementById("inline-description").value = "";

    deps.setSelectedType("info");
    const typeSelector = document.getElementById("type-selector");
    if (typeSelector) {
      const infoBtn = typeSelector.querySelector('[data-type="info"]');
      if (infoBtn) {
        typeSelector
          .querySelectorAll(".type-btn")
          .forEach((btn) => btn.classList.remove("active"));
        infoBtn.classList.add("active");
      }
    }

    document.getElementById("inline-title-count").textContent = "0";
    document.getElementById("inline-desc-count").textContent = "0";
    updateInlineDescriptionPreview();
    updateInlineFormValidation();
  }

  return {
    updateInlineFormValidation,
    initializeInlineForm,
    updateInlineDescriptionPreview,
    initializeEditForm,
    updateEditDescriptionPreview,
    clearInlineForm,
  };
};

// ---- ./src/user-annotation-list.js ----
window.createUserAnnotationListService = function createUserAnnotationListService(
  deps,
) {
  function showEditAnnotationForm(index) {
    const ann = deps.getUserAnnotations()[index];
    if (!ann) return;

    const editModal = document.getElementById("edit-annotation-modal");
    const form = document.getElementById("edit-annotation-form");
    const titleInput = document.getElementById("edit-title");
    const descInput = document.getElementById("edit-description");
    const typeSelect = document.getElementById("edit-type");
    const titleCount = document.getElementById("edit-title-count");
    const descCount = document.getElementById("edit-desc-count");

    titleInput.value = ann.title;
    descInput.value = ann.description || "";
    typeSelect.value = ann.type;
    titleCount.textContent = ann.title.length;
    descCount.textContent = (ann.description || "").length;

    form.dataset.editIndex = index;

    editModal.style.display = "block";
    titleInput.focus();

    deps.updateEditDescriptionPreview();
  }

  function updateUserAnnotationsList() {
    const container = document.getElementById("user-annotation-items");
    const count = document.getElementById("annotation-count");
    const userAnnotations = deps.getUserAnnotations();

    count.textContent = userAnnotations.length;
    container.innerHTML = "";

    if (userAnnotations.length === 0) {
      container.innerHTML = "<p><em>No user annotations yet.</em></p>";
      return;
    }

    userAnnotations.forEach((ann, index) => {
      const item = document.createElement("div");
      item.className = "user-annotation-item";

      const style = deps.getUserAnnotationStyle(ann.type) || {};
      const isArea = style.annotationType === "area";
      const shapeIcon = ann.shape === "circle" ? "●" : "■";
      const modeIcon = isArea ? "⬛" : "●";

      item.innerHTML = `
            <div class="annotation-item-row">
                <div class="type-indicator" style="background: ${style.bg}; border-color: ${style.border}; border-radius: ${ann.shape === "circle" ? "50%" : "4px"};"></div>
                <div class="annotation-info">
                    <span class="annotation-title">${deps.escapeHTML(ann.title)}</span>
                    <span class="annotation-meta">${modeIcon} ${shapeIcon}</span>
                </div>
                <div class="annotation-actions">
                    <button class="action-btn edit-btn desktop-only" data-action="edit" title="Edit">✏️</button>
                    <button class="action-btn delete-btn" data-action="delete" title="Delete">🗑️</button>
                </div>
            </div>
        `;

      const editBtn = item.querySelector('[data-action="edit"]');
      if (editBtn) {
        editBtn.addEventListener("click", () => {
          showEditAnnotationForm(index);
        });
      }

      const deleteBtn = item.querySelector('[data-action="delete"]');
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
          deleteUserAnnotation(index);
        });
      }

      container.appendChild(item);
    });
  }

  function deleteUserAnnotation(index) {
    if (!confirm("Delete this annotation?")) return;

    const userAnnotations = deps.getUserAnnotations();
    userAnnotations.splice(index, 1);
    deps.encodeUserAnnotationsToURL();
    deps.renderAllMarkers();
    updateUserAnnotationsList();
  }

  return {
    showEditAnnotationForm,
    updateUserAnnotationsList,
    deleteUserAnnotation,
  };
};

// ---- ./src/user-annotation-render.js ----
window.createUserAnnotationRenderService = function createUserAnnotationRenderService(
  deps,
) {
  function clearUserAnnotationVisuals() {
    document.querySelectorAll(".marker").forEach((el) => {
      if (el.parentElement) el.parentElement.remove();
    });
    document
      .querySelectorAll(".user-annotation-wrapper")
      .forEach((el) => el.remove());
    document
      .querySelectorAll(".tooltip-box:not(.svg-property-tooltip)")
      .forEach((el) => el.remove());

    document.querySelectorAll(".area-annotation").forEach((el) => {
      if (el.parentElement) el.parentElement.remove();
    });

    deps.getUserAnnotations().forEach((ann) => {
      delete ann._el;
      delete ann._tooltip;
      delete ann._index;
    });
  }

  function createAnnotationTooltip(ann) {
    const tooltip = document.createElement("div");
    tooltip.className = "tooltip-box user-annotation-tooltip";

    const description = ann.description && ann.description.trim();
    if (description) {
      tooltip.innerHTML = `<b>${deps.escapeHTML(ann.title)}</b><br><br>${deps.processUserDescription(ann.description)}`;
    } else {
      tooltip.innerHTML = `<b>${deps.escapeHTML(ann.title)}</b>`;
    }

    tooltip.style.display = "none";
    tooltip.style.whiteSpace = "pre-wrap";
    deps.tooltipLayer.appendChild(tooltip);
    return tooltip;
  }

  function renderPointAnnotation(ann, index, style) {
    const wrapperEl = document.createElement("div");
    wrapperEl.className = "user-annotation-wrapper";
    wrapperEl.style.position = "absolute";
    wrapperEl.style.transform = "translate(-50%, -50%)";
    wrapperEl.style.zIndex = "15";

    const marker = document.createElement("div");
    marker.className = "marker user-annotation-marker";
    marker.style.background = style.bg;
    marker.style.color = style.color;

    const shape = ann.shape || "rectangle";
    marker.style.borderRadius = shape === "circle" ? "50%" : "8px";
    marker.style.borderColor = style.border;
    marker.style.borderWidth = style.borderWidth || "3px";
    marker.style.borderStyle = style.borderStyle || "solid";
    marker.style.cursor = deps.getEditModeEnabled() ? "move" : "pointer";
    marker.setAttribute("data-user-index", index);

    const tooltip = createAnnotationTooltip(ann);

    wrapperEl.offsetHeight;
    deps.addPointAnnotationHoverEvents(wrapperEl, tooltip, ann);
    deps.addUserAnnotationDragListeners(wrapperEl, marker, index);

    wrapperEl.appendChild(marker);
    deps.wrapper.appendChild(wrapperEl);

    ann._el = wrapperEl;
    ann._tooltip = tooltip;
    ann._index = index;
  }

  function renderAreaAnnotation(ann, index, style) {
    const wrapperEl = document.createElement("div");
    wrapperEl.className = "user-annotation-wrapper area-annotation-wrapper";
    wrapperEl.style.position = "absolute";
    wrapperEl.style.zIndex = "5";

    const areaElement = document.createElement("div");
    const shape = ann.shape || "rectangle";
    areaElement.className = `area-annotation ${shape}`;
    areaElement.style.background = style.bg;
    areaElement.style.borderColor = style.border;
    areaElement.style.borderWidth = style.borderWidth || "3px";
    areaElement.style.borderStyle = style.borderStyle || "solid";

    const bounds = deps.getImageBounds(true);
    const widthRel = ann.widthRel;
    const heightRel = ann.heightRel;
    areaElement.style.width = `${widthRel * bounds.width}px`;
    areaElement.style.height = `${heightRel * bounds.height}px`;
    areaElement.style.cursor = deps.getEditModeEnabled() ? "move" : "pointer";
    areaElement.style.pointerEvents = deps.getEditModeEnabled() ? "auto" : "none";
    areaElement.setAttribute("data-user-index", index);

    if (deps.getEditModeEnabled()) {
      areaElement.classList.add("edit-mode");
      deps.addAreaResizeHandles(areaElement, ann, index);
    }

    const tooltip = createAnnotationTooltip(ann);
    areaElement.offsetHeight;
    deps.addAreaAnnotationHoverEvents(areaElement, tooltip, ann);
    deps.addAreaAnnotationDragListeners(wrapperEl, areaElement, index);

    wrapperEl.appendChild(areaElement);
    deps.wrapper.appendChild(wrapperEl);

    ann._el = wrapperEl;
    ann._tooltip = tooltip;
    ann._index = index;
  }

  function renderUserAnnotationMarkers() {
    deps.getUserAnnotations().forEach((ann, index) => {
      const style = deps.getUserAnnotationStyle(ann.type);
      if (!style) return;

      if (style.annotationType === "area") {
        renderAreaAnnotation(ann, index, style);
      } else {
        renderPointAnnotation(ann, index, style);
      }
    });
  }

  function renderAllMarkers() {
    clearUserAnnotationVisuals();

    if (!deps.image.querySelector("svg")) {
      return;
    }

    deps.applyAnnotationFilter();
    renderUserAnnotationMarkers();
    requestAnimationFrame(() => {
      deps.scheduleMarkerPositioning();
    });
  }

  return {
    clearUserAnnotationVisuals,
    renderAllMarkers,
    renderUserAnnotationMarkers,
    renderPointAnnotation,
    renderAreaAnnotation,
    createAnnotationTooltip,
  };
};

// ---- ./src/user-annotation-hover.js ----
window.createUserAnnotationHoverService = function createUserAnnotationHoverService(
  deps,
) {
  function addPointAnnotationHoverEvents(wrapperEl, tooltip, ann) {
    let hideTimeout;

    wrapperEl.addEventListener("mouseenter", () => {
      if (deps.getEditModeEnabled()) return;

      clearTimeout(hideTimeout);
      deps.tooltipService.showForUserAnnotation(tooltip, ann);
    });

    wrapperEl.addEventListener("mouseleave", () => {
      hideTimeout = setTimeout(
        () => (tooltip.style.display = "none"),
        deps.getTooltipHideDelay(),
      );
    });

    wrapperEl.addEventListener("touchstart", (e) => {
      if (deps.getEditModeEnabled()) return;

      if (e.cancelable) e.preventDefault();
      clearTimeout(hideTimeout);
      deps.tooltipService.showForUserAnnotation(tooltip, ann);
    });

    document.addEventListener("touchstart", (e) => {
      if (!wrapperEl.contains(e.target) && !tooltip.contains(e.target)) {
        tooltip.style.display = "none";
        clearTimeout(hideTimeout);
      }
    });

    tooltip.addEventListener("mouseenter", () => clearTimeout(hideTimeout));
    tooltip.addEventListener("mouseleave", () => {
      hideTimeout = setTimeout(
        () => (tooltip.style.display = "none"),
        deps.getTooltipHideDelay(),
      );
    });
  }

  function addAreaAnnotationHoverEvents(areaElement, tooltip, ann) {
    let hideTimeout;
    const borderWidth =
      Number.parseInt(getComputedStyle(areaElement).borderWidth, 10) || 3;
    const tolerance = deps.getAreaHoverTolerance();
    const hitboxSize = Math.max(4, borderWidth + tolerance);

    const createBorderHitbox = (edge) => {
      const hitbox = document.createElement("div");
      hitbox.className = `area-border-hitbox area-border-hitbox-${edge}`;
      hitbox.style.position = "absolute";
      hitbox.style.zIndex = "1";
      hitbox.style.background = "transparent";
      hitbox.style.pointerEvents = "auto";

      if (edge === "top") {
        hitbox.style.left = "0";
        hitbox.style.top = "0";
        hitbox.style.width = "100%";
        hitbox.style.height = `${hitboxSize}px`;
      } else if (edge === "right") {
        hitbox.style.right = "0";
        hitbox.style.top = "0";
        hitbox.style.width = `${hitboxSize}px`;
        hitbox.style.height = "100%";
      } else if (edge === "bottom") {
        hitbox.style.left = "0";
        hitbox.style.bottom = "0";
        hitbox.style.width = "100%";
        hitbox.style.height = `${hitboxSize}px`;
      } else {
        hitbox.style.left = "0";
        hitbox.style.top = "0";
        hitbox.style.width = `${hitboxSize}px`;
        hitbox.style.height = "100%";
      }

      hitbox.addEventListener("mouseenter", (e) => {
        if (deps.getEditModeEnabled()) return;
        clearTimeout(hideTimeout);
        deps.tooltipService.showAtPointer(tooltip, ann, e);
      });

      hitbox.addEventListener("mousemove", (e) => {
        if (deps.getEditModeEnabled()) return;
        clearTimeout(hideTimeout);
        deps.tooltipService.showAtPointer(tooltip, ann, e);
      });

      hitbox.addEventListener("mouseleave", () => {
        hideTimeout = setTimeout(
          () => (tooltip.style.display = "none"),
          deps.getTooltipHideDelay(),
        );
      });

      hitbox.addEventListener("touchstart", (e) => {
        if (deps.getEditModeEnabled()) return;
        if (e.cancelable) e.preventDefault();
        clearTimeout(hideTimeout);
        deps.tooltipService.showAtPointer(
          tooltip,
          ann,
          e.touches && e.touches[0] ? e.touches[0] : e,
        );
      });

      return hitbox;
    };

    ["top", "right", "bottom", "left"].forEach((edge) => {
      areaElement.appendChild(createBorderHitbox(edge));
    });

    tooltip.addEventListener("mouseenter", () => clearTimeout(hideTimeout));
    tooltip.addEventListener("mouseleave", () => {
      hideTimeout = setTimeout(
        () => (tooltip.style.display = "none"),
        deps.getTooltipHideDelay(),
      );
    });
  }

  return {
    addPointAnnotationHoverEvents,
    addAreaAnnotationHoverEvents,
  };
};

// ---- ./src/user-annotation-drag.js ----
window.createUserAnnotationDragService = function createUserAnnotationDragService(
  deps,
) {
  function getImageFrameInWrapper() {
    const wrapperBounds = deps.wrapper.getBoundingClientRect();
    const imageBounds = deps.getImageBounds(true);

    let left = imageBounds.left - wrapperBounds.left;
    let top = imageBounds.top - wrapperBounds.top;
    let width = imageBounds.width;
    let height = imageBounds.height;

    const imageEl =
      typeof deps.getImageElement === "function" ? deps.getImageElement() : null;
    if (imageEl && typeof imageEl.getBoundingClientRect === "function") {
      const imageRect = imageEl.getBoundingClientRect();
      if (imageRect && imageRect.width > 0 && imageRect.height > 0) {
        left = imageRect.left - wrapperBounds.left;
        top = imageRect.top - wrapperBounds.top;
        width = imageRect.width;
        height = imageRect.height;
      }
    }

    return {
      left,
      top,
      width: Math.max(1, width),
      height: Math.max(1, height),
      right: left + Math.max(1, width),
      bottom: top + Math.max(1, height),
    };
  }

  function updateUserAnnotationDragState() {
    if (deps.getEditModeEnabled()) {
      const allTooltips = document.querySelectorAll(".tooltip-box");
      allTooltips.forEach((tooltip) => {
        tooltip.style.display = "none";
      });
    }

    const userMarkers = document.querySelectorAll(".user-annotation-marker");
    userMarkers.forEach((marker) => {
      if (deps.getEditModeEnabled()) {
        marker.style.cursor = "move";
        marker.style.opacity = "0.9";
      } else {
        marker.style.cursor = "pointer";
        marker.style.opacity = "0.8";
      }
    });

    const areaAnnotations = document.querySelectorAll(".area-annotation");
    areaAnnotations.forEach((area) => {
      if (deps.getEditModeEnabled()) {
        area.classList.add("edit-mode");
        area.style.cursor = "move";
        area.style.pointerEvents = "auto";

        if (area.querySelectorAll(".resize-handle").length === 0) {
          const userIndex = Number.parseInt(area.getAttribute("data-user-index"), 10);
          const userAnnotations = deps.getUserAnnotations();
          if (!Number.isNaN(userIndex) && userAnnotations[userIndex]) {
            addAreaResizeHandles(area, userAnnotations[userIndex], userIndex);
          }
        }

        const handles = area.querySelectorAll(".resize-handle");
        handles.forEach((handle) => {
          handle.style.display = "block";
        });
      } else {
        area.classList.remove("edit-mode");
        area.style.cursor = "pointer";
        area.style.pointerEvents = "none";

        const handles = area.querySelectorAll(".resize-handle");
        handles.forEach((handle) => {
          handle.style.display = "none";
        });
      }
    });
  }

  function addUserAnnotationDragListeners(wrapperEl, marker, index) {
    let isDragging = false;
    let startX;
    let startY;
    let startLeft;
    let startTop;
    let elementWidth;
    let elementHeight;

    const startDrag = (e) => {
      if (e.target !== marker || !deps.getEditModeEnabled()) return;

      isDragging = true;
      startX = e.clientX || (e.touches && e.touches[0].clientX);
      startY = e.clientY || (e.touches && e.touches[0].clientY);

      startLeft = Number.parseInt(wrapperEl.style.left, 10) || 0;
      startTop = Number.parseInt(wrapperEl.style.top, 10) || 0;

      const elementRect = wrapperEl.getBoundingClientRect();
      elementWidth =
        elementRect.width ||
        Number.parseInt(wrapperEl.style.width, 10) ||
        wrapperEl.offsetWidth;
      elementHeight =
        elementRect.height ||
        Number.parseInt(wrapperEl.style.height, 10) ||
        wrapperEl.offsetHeight;

      wrapperEl.style.zIndex = "100";
      marker.style.opacity = "0.7";

      e.preventDefault();
    };

    const drag = (e) => {
      if (!isDragging) return;

      const currentX = e.clientX || (e.touches && e.touches[0].clientX);
      const currentY = e.clientY || (e.touches && e.touches[0].clientY);

      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      let newLeft = startLeft + deltaX;
      let newTop = startTop + deltaY;

      const imageFrame = getImageFrameInWrapper();

      const halfWidth = elementWidth / 2;
      const halfHeight = elementHeight / 2;

      const imageLeftInWrapper = imageFrame.left;
      const imageTopInWrapper = imageFrame.top;
      const imageRightInWrapper = imageFrame.right;
      const imageBottomInWrapper = imageFrame.bottom;

      const minLeft = imageLeftInWrapper + halfWidth;
      const minTop = imageTopInWrapper + halfHeight;
      const maxLeft = imageRightInWrapper - halfWidth;
      const maxTop = imageBottomInWrapper - halfHeight;

      newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
      newTop = Math.max(minTop, Math.min(newTop, maxTop));

      wrapperEl.style.left = `${newLeft}px`;
      wrapperEl.style.top = `${newTop}px`;

      e.preventDefault();
    };

    const endDrag = (e) => {
      if (!isDragging) return;

      isDragging = false;
      wrapperEl.style.zIndex = "15";
      marker.style.opacity = "";

      const imageFrame = getImageFrameInWrapper();
      const centerX = Number.parseFloat(wrapperEl.style.left) || 0;
      const centerY = Number.parseFloat(wrapperEl.style.top) || 0;

      const newX = (centerX - imageFrame.left) / imageFrame.width;
      const newY = (centerY - imageFrame.top) / imageFrame.height;

      if (newX >= 0 && newX <= 1 && newY >= 0 && newY <= 1) {
        const userAnnotations = deps.getUserAnnotations();
        userAnnotations[index].x = newX;
        userAnnotations[index].y = newY;
        deps.encodeUserAnnotationsToURL();
      }

      deps.scheduleMarkerPositioning();
      e.preventDefault();
    };

    marker.addEventListener("mousedown", startDrag);
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", endDrag);

    marker.addEventListener("touchstart", startDrag);
    document.addEventListener("touchmove", drag);
    document.addEventListener("touchend", endDrag);
  }

  function addAreaAnnotationDragListeners(wrapperEl, areaElement, index) {
    let isDragging = false;
    let startX;
    let startY;
    let startLeft;
    let startTop;
    let elementWidth;
    let elementHeight;

    const startDrag = (e) => {
      if (!deps.getEditModeEnabled() || e.target.classList.contains("resize-handle")) return;

      isDragging = true;
      startX = e.clientX || (e.touches && e.touches[0].clientX);
      startY = e.clientY || (e.touches && e.touches[0].clientY);
      startLeft = Number.parseInt(wrapperEl.style.left, 10) || 0;
      startTop = Number.parseInt(wrapperEl.style.top, 10) || 0;

      const childAreaElement = wrapperEl.querySelector(".area-annotation");
      const areaWidth = childAreaElement
        ? Number.parseInt(childAreaElement.style.width, 10)
        : 0;
      const areaHeight = childAreaElement
        ? Number.parseInt(childAreaElement.style.height, 10)
        : 0;

      const elementRect = wrapperEl.getBoundingClientRect();
      elementWidth =
        areaWidth ||
        elementRect.width ||
        Number.parseInt(wrapperEl.style.width, 10) ||
        wrapperEl.offsetWidth;
      elementHeight =
        areaHeight ||
        elementRect.height ||
        Number.parseInt(wrapperEl.style.height, 10) ||
        wrapperEl.offsetHeight;

      wrapperEl.style.zIndex = "100";
      areaElement.style.opacity = "0.7";

      e.preventDefault();
    };

    const drag = (e) => {
      if (!isDragging) return;

      const currentX = e.clientX || (e.touches && e.touches[0].clientX);
      const currentY = e.clientY || (e.touches && e.touches[0].clientY);

      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      let newLeft = startLeft + deltaX;
      let newTop = startTop + deltaY;

      const imageFrame = getImageFrameInWrapper();

      const imageLeftInWrapper = imageFrame.left;
      const imageTopInWrapper = imageFrame.top;
      const imageRightInWrapper = imageFrame.right;
      const imageBottomInWrapper = imageFrame.bottom;

      const minLeft = imageLeftInWrapper;
      const minTop = imageTopInWrapper;
      const maxLeft = imageRightInWrapper - elementWidth;
      const maxTop = imageBottomInWrapper - elementHeight;

      newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
      newTop = Math.max(minTop, Math.min(newTop, maxTop));

      wrapperEl.style.left = `${newLeft}px`;
      wrapperEl.style.top = `${newTop}px`;

      e.preventDefault();
    };

    const endDrag = (e) => {
      if (!isDragging) return;

      isDragging = false;
      wrapperEl.style.zIndex = "5";
      areaElement.style.opacity = "";

      const imageFrame = getImageFrameInWrapper();
      const newLeft = Number.parseFloat(wrapperEl.style.left) || 0;
      const newTop = Number.parseFloat(wrapperEl.style.top) || 0;

      const newX = (newLeft - imageFrame.left) / imageFrame.width;
      const newY = (newTop - imageFrame.top) / imageFrame.height;

      if (newX >= 0 && newX <= 1 && newY >= 0 && newY <= 1) {
        const userAnnotations = deps.getUserAnnotations();
        userAnnotations[index].x = newX;
        userAnnotations[index].y = newY;
        deps.encodeUserAnnotationsToURL();
      }

      deps.scheduleMarkerPositioning();
      e.preventDefault();
    };

    areaElement.addEventListener("mousedown", startDrag);
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", endDrag);

    areaElement.addEventListener("touchstart", startDrag);
    document.addEventListener("touchmove", drag);
    document.addEventListener("touchend", endDrag);
  }

  function addAreaResizeHandles(areaElement, ann, index) {
    const handles = ["nw", "ne", "sw", "se"];
    const style = deps.getUserAnnotationStyle(ann.type);

    handles.forEach((position) => {
      const handle = document.createElement("div");
      handle.className = `resize-handle ${position}`;
      handle.style.borderColor = style.border;

      addResizeHandleListeners(handle, areaElement, ann, index, position);
      areaElement.appendChild(handle);
    });
  }

  function addResizeHandleListeners(handle, areaElement, ann, index, position) {
    let isResizing = false;
    let startX;
    let startY;
    let startWidth;
    let startHeight;
    let startLeft;
    let startTop;

    const startResize = (e) => {
      isResizing = true;
      startX = e.clientX || (e.touches && e.touches[0].clientX);
      startY = e.clientY || (e.touches && e.touches[0].clientY);
      startWidth = Number.parseInt(areaElement.style.width, 10);
      startHeight = Number.parseInt(areaElement.style.height, 10);

      const wrapperEl = areaElement.parentElement;
      startLeft = Number.parseInt(wrapperEl.style.left, 10) || 0;
      startTop = Number.parseInt(wrapperEl.style.top, 10) || 0;

      e.preventDefault();
      e.stopPropagation();
    };

    const resize = (e) => {
      if (!isResizing) return;

      const currentX = e.clientX || (e.touches && e.touches[0].clientX);
      const currentY = e.clientY || (e.touches && e.touches[0].clientY);

      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      const style = deps.getUserAnnotationStyle(ann.type);
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newLeft = startLeft;
      let newTop = startTop;

      if (position.includes("e")) {
        newWidth = startWidth + deltaX;
      }
      if (position.includes("w")) {
        newWidth = startWidth - deltaX;
        newLeft = startLeft + deltaX;
      }
      if (position.includes("s")) {
        newHeight = startHeight + deltaY;
      }
      if (position.includes("n")) {
        newHeight = startHeight - deltaY;
        newTop = startTop + deltaY;
      }

      const imageFrame = getImageFrameInWrapper();
      const maxScreenWidth = imageFrame.width * 0.8;
      const maxScreenHeight = imageFrame.height * 0.8;

      const effectiveMaxWidth = Math.min(style.maxSize.width, maxScreenWidth);
      const effectiveMaxHeight = Math.min(style.maxSize.height, maxScreenHeight);

      let constrainedWidth = Math.max(
        style.minSize.width,
        Math.min(effectiveMaxWidth, newWidth),
      );
      let constrainedHeight = Math.max(
        style.minSize.height,
        Math.min(effectiveMaxHeight, newHeight),
      );

      const imageLeft = imageFrame.left;
      const imageTop = imageFrame.top;
      const imageRight = imageFrame.right;
      const imageBottom = imageFrame.bottom;

      if (position.includes("e")) {
        const maxWidthFromPosition = imageRight - startLeft;
        constrainedWidth = Math.min(constrainedWidth, maxWidthFromPosition);
      }
      if (position.includes("s")) {
        const maxHeightFromPosition = imageBottom - startTop;
        constrainedHeight = Math.min(constrainedHeight, maxHeightFromPosition);
      }

      if (position.includes("w")) {
        const maxWidthFromLeft = startLeft - imageLeft + startWidth;
        constrainedWidth = Math.min(constrainedWidth, maxWidthFromLeft);
        newLeft = Math.max(imageLeft, startLeft + (startWidth - constrainedWidth));
      }
      if (position.includes("n")) {
        const maxHeightFromTop = startTop - imageTop + startHeight;
        constrainedHeight = Math.min(constrainedHeight, maxHeightFromTop);
        newTop = Math.max(imageTop, startTop + (startHeight - constrainedHeight));
      }

      newLeft = Math.max(imageLeft, Math.min(newLeft, imageRight - constrainedWidth));
      newTop = Math.max(imageTop, Math.min(newTop, imageBottom - constrainedHeight));

      areaElement.style.width = `${constrainedWidth}px`;
      areaElement.style.height = `${constrainedHeight}px`;

      const wrapperEl = areaElement.parentElement;
      wrapperEl.style.left = `${newLeft}px`;
      wrapperEl.style.top = `${newTop}px`;

      e.preventDefault();
    };

    const endResize = (e) => {
      if (!isResizing) return;

      isResizing = false;

      const imageFrame = getImageFrameInWrapper();
      const pixelWidth = Number.parseInt(areaElement.style.width, 10);
      const pixelHeight = Number.parseInt(areaElement.style.height, 10);

      const userAnnotations = deps.getUserAnnotations();
      userAnnotations[index].widthRel = pixelWidth / imageFrame.width;
      userAnnotations[index].heightRel = pixelHeight / imageFrame.height;

      const wrapperEl = areaElement.parentElement;
      const newLeft = Number.parseFloat(wrapperEl.style.left) || 0;
      const newTop = Number.parseFloat(wrapperEl.style.top) || 0;

      const newX = (newLeft - imageFrame.left) / imageFrame.width;
      const newY = (newTop - imageFrame.top) / imageFrame.height;

      if (newX >= 0 && newX <= 1 && newY >= 0 && newY <= 1) {
        userAnnotations[index].x = newX;
        userAnnotations[index].y = newY;
      }

      deps.encodeUserAnnotationsToURL();
      e.preventDefault();
    };

    handle.addEventListener("mousedown", startResize);
    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", endResize);

    handle.addEventListener("touchstart", startResize);
    document.addEventListener("touchmove", resize);
    document.addEventListener("touchend", endResize);
  }

  return {
    updateUserAnnotationDragState,
    addUserAnnotationDragListeners,
    addAreaAnnotationDragListeners,
    addAreaResizeHandles,
    addResizeHandleListeners,
  };
};

// ---- ./src/user-annotation-placement.js ----
window.createUserAnnotationPlacementService =
  function createUserAnnotationPlacementService(deps) {
    let isInPlacementMode = false;
    let currentPlacementData = null;
    let placementMouseMoveHandler = null;
    let placementClickHandler = null;
    let dragGhost = null;

    function cleanupPlacementMode() {
      if (!isInPlacementMode) return;

      const wrapper = deps.getWrapper();

      if (placementMouseMoveHandler) {
        wrapper.removeEventListener("mousemove", placementMouseMoveHandler);
        placementMouseMoveHandler = null;
      }

      if (placementClickHandler) {
        wrapper.removeEventListener("click", placementClickHandler);
        placementClickHandler = null;
      }

      if (dragGhost && dragGhost.parentNode) {
        dragGhost.parentNode.removeChild(dragGhost);
      }
      dragGhost = null;

      wrapper.style.cursor = "";

      isInPlacementMode = false;
      currentPlacementData = null;
    }

    function startAddAnnotationModeWithData(annotationData) {
      if (isInPlacementMode) {
        cleanupPlacementMode();
      }

      const style = deps.getUserAnnotationStyle(annotationData.type);
      if (!annotationData.type || !style) {
        return;
      }

      isInPlacementMode = true;
      currentPlacementData = annotationData;

      const wrapper = deps.getWrapper();
      const isAreaAnnotation = style.annotationType === "area";

      dragGhost = document.createElement("div");
      dragGhost.className = "user-annotation-ghost";
      dragGhost.style.position = "absolute";
      dragGhost.style.background = style.bg;
      dragGhost.style.color = style.color;
      const borderWidth = style.borderWidth || "3px";
      const borderStyle = style.borderStyle || "solid";
      dragGhost.style.border = `${borderWidth} ${borderStyle} ${style.border}`;
      dragGhost.style.cursor = "move";
      dragGhost.style.zIndex = "1000";
      dragGhost.style.pointerEvents = "none";
      dragGhost.style.opacity = "0.8";

      if (isAreaAnnotation) {
        const width = style.defaultSize.width;
        const height = style.defaultSize.height;
        dragGhost.style.width = `${width}px`;
        dragGhost.style.height = `${height}px`;
        dragGhost.style.borderRadius =
          annotationData.shape === "circle" ? "50%" : "4px";
        dragGhost.style.display = "flex";
        dragGhost.style.alignItems = "center";
        dragGhost.style.justifyContent = "center";
        dragGhost.style.fontWeight = "bold";
        dragGhost.style.fontSize = "14px";
        dragGhost.textContent = "+";
      } else {
        dragGhost.style.borderRadius =
          annotationData.shape === "circle" ? "50%" : "8px";
        dragGhost.style.width = "32px";
        dragGhost.style.height = "32px";
        dragGhost.style.display = "flex";
        dragGhost.style.alignItems = "center";
        dragGhost.style.justifyContent = "center";
        dragGhost.style.fontWeight = "bold";
        dragGhost.style.fontSize = "14px";
        dragGhost.textContent = "+";
      }

      wrapper.appendChild(dragGhost);
      wrapper.style.cursor = "crosshair";

      placementMouseMoveHandler = (e) => {
        if (!dragGhost) return;

        const bounds = wrapper.getBoundingClientRect();
        const ghostWidth = Number.parseInt(dragGhost.style.width, 10);
        const ghostHeight = Number.parseInt(dragGhost.style.height, 10);
        const x = e.clientX - bounds.left - ghostWidth / 2;
        const y = e.clientY - bounds.top - ghostHeight / 2;

        dragGhost.style.left = `${x}px`;
        dragGhost.style.top = `${y}px`;
      };

      placementClickHandler = (e) => {
        if (!isInPlacementMode || !currentPlacementData) {
          return;
        }

        const currentStyle = deps.getUserAnnotationStyle(currentPlacementData.type);
        const currentIsAreaAnnotation =
          currentStyle && currentStyle.annotationType === "area";

        const bounds = deps.getImageBounds(true);
        const imageEl =
          typeof deps.getImageElement === "function" ? deps.getImageElement() : null;
        const imageRect =
          imageEl && typeof imageEl.getBoundingClientRect === "function"
            ? imageEl.getBoundingClientRect()
            : null;
        const rectLeft = imageRect ? imageRect.left : bounds.left;
        const rectTop = imageRect ? imageRect.top : bounds.top;
        const rectWidth = imageRect ? imageRect.width : bounds.width;
        const rectHeight = imageRect ? imageRect.height : bounds.height;
        let x = (e.clientX - rectLeft) / rectWidth;
        let y = (e.clientY - rectTop) / rectHeight;

        if (currentIsAreaAnnotation && currentStyle.defaultSize) {
          const pixelWidth = currentStyle.defaultSize.width;
          const pixelHeight = currentStyle.defaultSize.height;

          const halfWidthRel = pixelWidth / 2 / bounds.width;
          const halfHeightRel = pixelHeight / 2 / bounds.height;

          x -= halfWidthRel;
          y -= halfHeightRel;
        }

        if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
          const userAnnotations = deps.getUserAnnotations();
          const maxAnnotations = deps.getMaxUserAnnotations();
          if (userAnnotations.length >= maxAnnotations) {
            alert(`Maximum ${maxAnnotations} user annotations allowed.`);
            cleanupPlacementMode();
            return;
          }

          const annotation = {
            x,
            y,
            title: currentPlacementData.title,
            description: currentPlacementData.description,
            type: currentPlacementData.type,
            shape: currentPlacementData.shape || "rectangle",
          };

          if (currentIsAreaAnnotation) {
            annotation.widthRel = currentStyle.defaultSize.width / bounds.width;
            annotation.heightRel = currentStyle.defaultSize.height / bounds.height;
          }

          userAnnotations.push(annotation);
          cleanupPlacementMode();
          deps.clearInlineForm();
          deps.encodeUserAnnotationsToURL();

          requestAnimationFrame(() => {
            deps.renderAllMarkers();
            deps.updateUserAnnotationsList();

            setTimeout(() => {
              const newAnnotationIndex = userAnnotations.length - 1;
              const newAnnotation = userAnnotations[newAnnotationIndex];
              if (newAnnotation && newAnnotation._el) {
                const newStyle = deps.getUserAnnotationStyle(newAnnotation.type);
                if (newStyle) {
                  if (newStyle.annotationType === "area") {
                    const areaElement =
                      newAnnotation._el.querySelector(".area-annotation");
                    if (areaElement && newAnnotation._tooltip) {
                      deps.addAreaAnnotationHoverEvents(
                        areaElement,
                        newAnnotation._tooltip,
                        newAnnotation,
                      );
                    }
                  } else if (newAnnotation._tooltip) {
                    deps.addPointAnnotationHoverEvents(
                      newAnnotation._el,
                      newAnnotation._tooltip,
                      newAnnotation,
                    );
                  }
                }
              }
            }, 50);

            setTimeout(() => {
              deps.setEditModeEnabled(true);
              const editModeCheckbox = document.getElementById("edit-mode-checkbox");
              if (editModeCheckbox) {
                editModeCheckbox.checked = true;
              }
              deps.updateUserAnnotationDragState();
              deps.updateEditModeButtonVisibility();
            }, 150);
          });
        } else {
          cleanupPlacementMode();
        }
      };

      wrapper.addEventListener("mousemove", placementMouseMoveHandler);
      wrapper.addEventListener("click", placementClickHandler);
    }

    function isPlacementModeActive() {
      return isInPlacementMode;
    }

    return {
      cleanupPlacementMode,
      startAddAnnotationModeWithData,
      isPlacementModeActive,
    };
  };

// ---- ./src/user-annotation-init.js ----
window.createUserAnnotationInitService = function createUserAnnotationInitService(
  deps,
) {
  function updateUserAnnotationTypeOptions(typeSelector) {
    typeSelector.innerHTML = "";

    const cfg = deps.getConfig();
    if (cfg && cfg.userAnnotationTypes) {
      const uniqueTypes = new Set();
      Object.keys(cfg.userAnnotationTypes).forEach((type) => {
        const baseType = type.replace(/^(user-|area-)/, "");
        uniqueTypes.add(baseType);
      });

      uniqueTypes.forEach((baseType) => {
        const prefix = deps.getCurrentMode() === "area" ? "area-" : "user-";
        const fullTypeKey = prefix + baseType;
        const style = cfg.userAnnotationTypes[fullTypeKey];
        if (!style) return;

        const typeBtn = document.createElement("button");
        typeBtn.type = "button";
        typeBtn.className = `type-btn ${baseType === deps.getSelectedType() ? "active" : ""}`;
        typeBtn.title = style.label;
        typeBtn.dataset.type = baseType;

        const circleBtn = document.getElementById("shape-circle");
        const isCircleShape = circleBtn && circleBtn.classList.contains("active");

        if (deps.getCurrentMode() === "area") {
          typeBtn.style.background = "transparent";
          typeBtn.style.borderColor = style.border;
          typeBtn.style.borderWidth = style.borderWidth || "3px";
          typeBtn.style.borderStyle = style.borderStyle || "solid";
        } else {
          typeBtn.style.background = style.bg;
          typeBtn.style.borderColor = style.border;
          typeBtn.style.borderWidth = style.borderWidth || "2px";
          typeBtn.style.borderStyle = style.borderStyle || "solid";
        }

        typeBtn.style.borderRadius = isCircleShape ? "50%" : "6px";

        typeBtn.addEventListener("click", () => {
          typeSelector.querySelectorAll(".type-btn").forEach((btn) => {
            btn.classList.remove("active");
          });
          typeBtn.classList.add("active");
          deps.setSelectedType(baseType);
          deps.updateInlineFormValidation();
        });

        typeSelector.appendChild(typeBtn);
      });

      if (!deps.getSelectedType()) {
        deps.setSelectedType("info");
      }

      typeSelector.querySelectorAll(".type-btn").forEach((btn) => {
        btn.classList.remove("active");
      });

      const currentBtn = typeSelector.querySelector(
        `[data-type="${deps.getSelectedType()}"]`,
      );
      if (currentBtn) {
        currentBtn.classList.add("active");
      }
    }

    deps.updateInlineFormValidation();
  }

  function populateEditTypeOptions(editTypeSelect) {
    const cfg = deps.getConfig();
    if (!cfg || !cfg.userAnnotationTypes) return;

    Object.entries(cfg.userAnnotationTypes).forEach(([type, style]) => {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = style.label;
      editTypeSelect.appendChild(option.cloneNode(true));
    });
  }

  function bindModeAndShapeSelectors(typeSelector) {
    const pointModeBtn = document.getElementById("mode-point");
    const areaModeBtn = document.getElementById("mode-area");
    const rectangleBtn = document.getElementById("shape-rectangle");
    const circleBtn = document.getElementById("shape-circle");

    if (pointModeBtn && areaModeBtn) {
      pointModeBtn.addEventListener("click", () => {
        deps.setCurrentMode("point");
        pointModeBtn.classList.add("active");
        areaModeBtn.classList.remove("active");
        updateUserAnnotationTypeOptions(typeSelector);
        deps.updateInlineFormValidation();
      });

      areaModeBtn.addEventListener("click", () => {
        deps.setCurrentMode("area");
        areaModeBtn.classList.add("active");
        pointModeBtn.classList.remove("active");
        updateUserAnnotationTypeOptions(typeSelector);
        deps.updateInlineFormValidation();
      });
    }

    if (rectangleBtn && circleBtn) {
      rectangleBtn.addEventListener("click", () => {
        rectangleBtn.classList.add("active");
        circleBtn.classList.remove("active");
        updateUserAnnotationTypeOptions(typeSelector);
        deps.updateInlineFormValidation();
      });

      circleBtn.addEventListener("click", () => {
        circleBtn.classList.add("active");
        rectangleBtn.classList.remove("active");
        updateUserAnnotationTypeOptions(typeSelector);
        deps.updateInlineFormValidation();
      });
    }
  }

  function bindUserModalOpenClose({
    toggleBtn,
    modal,
    editModal,
    closeBtn,
    closeEditBtn,
    typeSelector,
  }) {
    toggleBtn.addEventListener("click", () => {
      const isVisible = modal.style.display !== "none";
      modal.style.display = isVisible ? "none" : "block";
      if (!isVisible) {
        deps.clearInlineForm();

        deps.setCurrentMode("area");
        const areaModeBtn = document.getElementById("mode-area");
        const pointModeBtn = document.getElementById("mode-point");
        if (areaModeBtn && pointModeBtn) {
          areaModeBtn.classList.add("active");
          pointModeBtn.classList.remove("active");
        }

        const rectangleBtn = document.getElementById("shape-rectangle");
        const circleBtn = document.getElementById("shape-circle");
        if (rectangleBtn && circleBtn) {
          rectangleBtn.classList.add("active");
          circleBtn.classList.remove("active");
        }

        updateUserAnnotationTypeOptions(typeSelector);
        deps.updateUserAnnotationsList();
        deps.updateInlineFormValidation();
      }
    });

    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
      deps.cleanupPlacementMode();
    });

    closeEditBtn.addEventListener("click", () => {
      editModal.style.display = "none";
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
        deps.cleanupPlacementMode();
      }
    });

    editModal.addEventListener("click", (e) => {
      if (e.target === editModal) {
        editModal.style.display = "none";
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (deps.isPlacementModeActive()) deps.cleanupPlacementMode();
      if (modal.style.display !== "none") modal.style.display = "none";
      if (editModal.style.display !== "none") editModal.style.display = "none";
    });
  }

  function bindEditModeActions({ editModeCheckbox, exitEditModeBtn }) {
    editModeCheckbox.addEventListener("change", () => {
      deps.setEditModeEnabled(editModeCheckbox.checked);
      deps.updateUserAnnotationDragState();
      deps.updateEditModeButtonVisibility();
    });

    exitEditModeBtn.addEventListener("click", () => {
      deps.setEditModeEnabled(false);
      editModeCheckbox.checked = false;
      deps.updateUserAnnotationDragState();
      deps.updateEditModeButtonVisibility();
    });
  }

  function bindUserAnnotationActions({ placeBtn, modal }) {
    placeBtn.addEventListener("click", () => {
      const title = document.getElementById("inline-title").value.trim();
      const type = deps.getSelectedType();
      const description = document.getElementById("inline-description").value;
      const mode = deps.getCurrentMode();

      if (!title || !type || !mode) return;

      let shape = "rectangle";
      const circleBtn = document.getElementById("shape-circle");
      if (circleBtn && circleBtn.classList.contains("active")) {
        shape = "circle";
      }

      const prefix = mode === "area" ? "area-" : "user-";
      const fullType = prefix + type;

      const annotationData = {
        title: title.substring(0, 50),
        type: fullType,
        description: description.substring(0, 500),
        shape,
      };

      deps.startAddAnnotationModeWithData(annotationData);
      modal.style.display = "none";
    });
  }

  function bindShareAndClearActions({ shareBtn, clearAllBtn }) {
    shareBtn.addEventListener("click", () => {
      try {
        navigator.clipboard.writeText(window.location.href);
        shareBtn.textContent = "✓ Copied!";
        setTimeout(() => {
          shareBtn.textContent = "📋 Copy Share URL";
        }, 2000);
      } catch (error) {
        console.error("Failed to copy URL:", error);
        shareBtn.textContent = "Failed to copy";
        setTimeout(() => {
          shareBtn.textContent = "📋 Copy Share URL";
        }, 2000);
      }
    });

    clearAllBtn.addEventListener("click", () => {
      if (!confirm("Are you sure you want to remove all user annotations?")) return;
      deps.setUserAnnotations([]);
      deps.encodeUserAnnotationsToURL();
      deps.renderAllMarkers();
      deps.updateUserAnnotationsList();
    });
  }

  function initializeUserAnnotations() {
    const toggleBtn = document.getElementById("toggle-user-annotations");
    const modal = document.getElementById("user-annotations-modal");
    const editModal = document.getElementById("edit-annotation-modal");
    const closeBtn = document.getElementById("close-user-modal");
    const closeEditBtn = document.getElementById("close-edit-modal");
    const typeSelector = document.getElementById("type-selector");
    const editTypeSelect = document.getElementById("edit-type");
    const placeBtn = document.getElementById("place-annotation-btn");
    const shareBtn = document.getElementById("share-url-btn");
    const clearAllBtn = document.getElementById("clear-all-annotations");
    const editModeCheckbox = document.getElementById("edit-mode-checkbox");
    const exitEditModeBtn = document.getElementById("exit-edit-mode");

    populateEditTypeOptions(editTypeSelect);
    bindModeAndShapeSelectors(typeSelector);
    bindUserModalOpenClose({
      toggleBtn,
      modal,
      editModal,
      closeBtn,
      closeEditBtn,
      typeSelector,
    });
    bindEditModeActions({ editModeCheckbox, exitEditModeBtn });
    bindUserAnnotationActions({ placeBtn, modal });
    bindShareAndClearActions({ shareBtn, clearAllBtn });

    updateUserAnnotationTypeOptions(typeSelector);
    deps.updateEditModeButtonVisibility();

    deps.initializeInlineForm();
    deps.initializeEditForm();
  }

  function initializeUserAnnotationsUI() {
    initializeUserAnnotations();
    if (deps.getUserAnnotations().length > 0) {
      setTimeout(() => {
        deps.renderAllMarkers();
      }, 100);
    }
  }

  return {
    updateUserAnnotationTypeOptions,
    populateEditTypeOptions,
    bindModeAndShapeSelectors,
    bindUserModalOpenClose,
    bindEditModeActions,
    bindUserAnnotationActions,
    bindShareAndClearActions,
    initializeUserAnnotations,
    initializeUserAnnotationsUI,
  };
};

// ---- ./src/load-feedback.js ----
window.createLoadFeedbackService = function createLoadFeedbackService(deps) {
  function showLoadingState() {
    const loadingDiv = document.createElement("div");
    loadingDiv.id = deps.getLoadingIndicatorId();
    loadingDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 12000;
        font-family: sans-serif;
        text-align: center;
    `;
    const loadingMessage = deps.getLoadingMessage();
    loadingDiv.innerHTML = `
        <div style="margin-bottom: 12px;">${loadingMessage}</div>
        <div style="width: 40px; height: 40px; border: 3px solid #333; border-top: 3px solid #4fc3f7; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    document.body.appendChild(loadingDiv);
    return loadingDiv;
  }

  function hideLoadingState() {
    const loadingDiv = document.getElementById(deps.getLoadingIndicatorId());
    if (loadingDiv) {
      loadingDiv.parentNode.removeChild(loadingDiv);
    }
  }

  function showError(message, isRetryable = false) {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(3, 7, 18, 0.45);
        z-index: 30000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        box-sizing: border-box;
    `;

    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
        background: #ff4444;
        color: white;
        padding: 20px;
        border-radius: 8px;
        font-family: sans-serif;
        font-size: 14px;
        max-width: 400px;
        width: min(400px, 92vw);
        text-align: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    const retryButton = isRetryable
      ? '<br><br><button onclick="location.reload()" style="background: #fff; color: #ff4444; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Retry</button>'
      : "";

    errorDiv.innerHTML = `
        <div style="margin-bottom: 8px; font-weight: bold;">⚠️ Error</div>
        <div>${message}</div>
        ${retryButton}
        <div style="margin-top: 12px; font-size: 12px; opacity: 0.8;"><button class="error-close-btn" style="background: #fff; color: #ff4444; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">Close</button></div>
    `;

    const closeBtn = errorDiv.querySelector(".error-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        overlay.remove();
      });
    }

    overlay.appendChild(errorDiv);
    document.body.appendChild(overlay);
  }

  return {
    showLoadingState,
    hideLoadingState,
    showError,
  };
};

// ---- ./src/app-lifecycle.js ----
window.createAppLifecycleService = function createAppLifecycleService(deps) {
  function showLoadingState() {
    return deps.showLoadingOverlay();
  }

  function hideLoadingState() {
    deps.hideLoadingOverlay();
  }

  function showError(message, isRetryable = false) {
    deps.showErrorOverlay(message, isRetryable);
  }

  function handleImageLoad() {
    try {
      hideLoadingState();
      deps.syncDiagramSize();

      deps.setCurrentZoom(1);
      if (typeof deps.alignImageAtCurrentZoom === "function") {
        deps.alignImageAtCurrentZoom("left", "bottom");
      } else {
        deps.centerImageAtCurrentZoom();
      }
      deps.updateImageTransform();

      deps.renderAllMarkers();
      deps.setFilterPanelOpen(deps.getFilterPanelOpen());
    } catch (error) {
      hideLoadingState();
      console.error("Error during image load handling:", error);
      showError("Failed to initialize annotations");
    }
  }

  function handleImageError(error) {
    hideLoadingState();
    deps.clearUserAnnotationVisuals();
    console.error("Failed to load image:", deps.getDiagramSourcePath(), error || "Unknown error");
    showError(
      "Failed to load diagram image. Please check your connection and try refreshing the page.",
    );
  }

  async function start() {
    showLoadingState();
    await deps.loadDiagram();
  }

  return {
    showLoadingState,
    hideLoadingState,
    showError,
    handleImageLoad,
    handleImageError,
    start,
  };
};

// ---- ./src/svg-help.js ----
window.createSvgHelpService = function createSvgHelpService(deps) {
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
    const visibleByPinnedConstraint = onlyShowPinned ? pinned : true;
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

// ---- ./src/svg-loader.js ----
window.createSvgLoaderService = function createSvgLoaderService(deps) {
  async function loadDiagram(diagramSourcePath) {
    try {
      const response = await fetch(diagramSourcePath, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} while loading ${diagramSourcePath}`);
      }

      const svgMarkup = await response.text();
      deps.image.innerHTML = svgMarkup;

      const svgEl = deps.image.querySelector("svg");
      if (!svgEl) {
        throw new Error("Loaded diagram is not a valid SVG");
      }

      svgEl.setAttribute("preserveAspectRatio", "xMinYMin meet");
      svgEl.style.display = "block";
      svgEl.style.width = "100%";
      svgEl.style.height = "100%";
      svgEl.style.pointerEvents = "auto";

      let nextAspectRatio = null;
      const viewBox = svgEl.getAttribute("viewBox");
      if (viewBox) {
        const parts = viewBox.split(/[\s,]+/).map(Number);
        if (
          parts.length === 4 &&
          Number.isFinite(parts[2]) &&
          Number.isFinite(parts[3]) &&
          parts[2] > 0 &&
          parts[3] > 0
        ) {
          nextAspectRatio = parts[2] / parts[3];
        }
      }

      deps.setDiagramAspectRatio(nextAspectRatio);
      deps.syncDiagramSize();
      deps.initializeSvgPropertyAnnotations();
      deps.initializeTagControls();
      deps.updateFilterPanelLayout();
      requestAnimationFrame(() => deps.handleImageLoad());
    } catch (error) {
      deps.handleImageError(error);
    }
  }

  return {
    loadDiagram,
  };
};

// ---- ./src/app.js ----
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
  getHiddenDisableTags: (tags) => tagUtilsService.getHiddenDisableTags(tags),
  getTagLevel: (tags) => tagUtilsService.getTagLevel(tags),
  getSelectedLevel: () => selectedLevel,
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
  getTagLevel: (tags) => tagUtilsService.getTagLevel(tags),
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
