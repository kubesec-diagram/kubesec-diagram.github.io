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
