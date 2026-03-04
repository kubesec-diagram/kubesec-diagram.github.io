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
