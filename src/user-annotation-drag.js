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
