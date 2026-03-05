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
      if (typeof deps.applyCssTagClassesToElement === "function") {
        deps.applyCssTagClassesToElement(el, tags);
      }
      maxDiscoveredLevel = Math.max(maxDiscoveredLevel, deps.getTagLevel(tags));
      tags.forEach((tag) => {
        if (deps.isLevelTag(tag) || (typeof deps.isCssTag === "function" && deps.isCssTag(tag))) {
          return;
        }
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
