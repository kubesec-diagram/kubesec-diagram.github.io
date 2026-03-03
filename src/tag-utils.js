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
