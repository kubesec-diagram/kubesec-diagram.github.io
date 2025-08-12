if (typeof config === 'undefined' || typeof annotations === 'undefined') {
    console.error('Required data not loaded: config and annotations must be defined');
    throw new Error('Missing required configuration or annotations data');
}

const urlParams = new URLSearchParams(window.location.search);
const debug = urlParams.has('debug');

let xMultiplier = 1.0;
let yMultiplier = 1.0;

const image = document.getElementById('main-image');
const wrapper = document.getElementById('image-wrapper');
const tooltipLayer = document.getElementById('tooltip-layer');
const container = document.getElementById('container');
const list = document.getElementById('annotation-list');

if (!image || !wrapper || !tooltipLayer || !container || !list) {
    console.error('Required DOM elements not found');
    throw new Error('Missing required DOM elements');
}

let markersRendered = false;
let priCounter = 1;
let infoCounter = 1;
let eventListeners = [];
let timeoutIds = [];
let cachedBounds = null;
let lastBoundsUpdate = 0;

// Zoom and pan variables
let currentZoom = 1;
let maxZoom = 4;
let minZoom = 1;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let imageTranslateX = 0;
let imageTranslateY = 0;
let isPositioningMarkers = false;
let boundsFrameId = null;
let isTouchActive = false;

// User annotations variables
let userAnnotations = [];
let isDraggingUserAnnotation = false;
let dragGhost = null;
let dragStartPos = null;

// Placement mode state
let isInPlacementMode = false;
let currentPlacementData = null;
let placementMouseMoveHandler = null;
let placementClickHandler = null;

// UI state
let currentMode = 'area'; // Default annotation mode
let selectedType = 'info'; // Default selected type

function addEventListenerWithCleanup(element, event, handler) {
    element.addEventListener(event, handler);
    eventListeners.push({ element, event, handler });
}

function addTimeoutWithCleanup(callback, delay) {
    const id = setTimeout(callback, delay);
    timeoutIds.push(id);
    return id;
}

function cleanup() {
    // Clear all event listeners
    eventListeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
    });
    eventListeners = [];
    
    // Clear all timeouts
    timeoutIds.forEach(id => clearTimeout(id));
    timeoutIds = [];
    
    // Clear any existing markers and tooltips
    if (tooltipLayer) {
        tooltipLayer.innerHTML = '';
    }
    
    annotations.forEach(ann => {
        if (ann._el && ann._el.parentNode) {
            ann._el.parentNode.removeChild(ann._el);
        }
        delete ann._el;
        delete ann._tooltip;
        delete ann._index;
    });
    
    markersRendered = false;
}

function isValidAnnotation(ann) {
    return ann && 
           typeof ann === 'object' && 
           'x' in ann && 
           'y' in ann && 
           ann.type !== 'separator' && 
           typeof ann.x === 'number' && 
           typeof ann.y === 'number';
}

function isLegendItem(ann) {
    return ann && 
           typeof ann === 'object' && 
           ann.type !== 'separator' && 
           (!('x' in ann) || !('y' in ann));
}

function calculateCounters() {
    let pri = 1;
    let info = 1;
    
    annotations.forEach((ann) => {
        if (!isValidAnnotation(ann)) return;
        
        if (ann.type === 'info') {
            info++;
        } else {
            pri++;
        }
    });
    
    return { pri, info };
}

// Initialize user annotations from URL
userAnnotations = parseUserAnnotationsFromURL();

image.src = debug ? 
    ((config && config.imagePaths && config.imagePaths.debug) || './kubesec-diagram.png') : 
    ((config && config.imagePaths && config.imagePaths.production) || 'https://media.githubusercontent.com/media/kubesec-diagram/kubesec-diagram.github.io/refs/heads/main/kubesec-diagram.png');

function escapeHTML(str) {
    const div = document.createElement('div');
    div.innerText = str;
    return div.innerHTML;
}

function cleanMultiline(str) {
    if (!str) return '';

    const raw = str.replace(/^\s*\n/, '').trimEnd();
    const lines = raw.split('\n');

    const indent = lines
        .filter(line => line.trim())
        .map(line => line.match(/^(\s*)/)?.[1].length || 0)
        .reduce((a, b) => Math.min(a, b), Infinity);

    return lines.map(line => line.slice(indent)).join('<br>');
}

// HTML sanitization for user annotations
function sanitizeUserHtml(html) {
    if (!html) return '';
    
    const allowedTags = (config && config.allowedHtmlTags) || ['br', 'b', 'strong', 'i', 'em'];
    const whitelist = (config && config.htmlWhitelist) || {};
    
    // Create a temporary div to parse HTML
    const div = document.createElement('div');
    div.innerHTML = html;
    
    // Recursively clean the HTML
    function cleanNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent;
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            
            if (allowedTags.includes(tagName)) {
                const allowedAttrs = whitelist[tagName] || [];
                let result = `<${tagName}`;
                
                // Add allowed attributes (currently none for our whitelist)
                for (let attr of allowedAttrs) {
                    if (node.hasAttribute(attr)) {
                        result += ` ${attr}="${escapeHTML(node.getAttribute(attr))}"`;
                    }
                }
                
                result += '>';
                
                // Process children
                for (let child of node.childNodes) {
                    result += cleanNode(child);
                }
                
                // Self-closing tags don't need closing tag
                if (!['br', 'hr'].includes(tagName)) {
                    result += `</${tagName}>`;
                }
                
                return result;
            } else {
                // Strip tag but keep content
                let result = '';
                for (let child of node.childNodes) {
                    result += cleanNode(child);
                }
                return result;
            }
        }
        
        return '';
    }
    
    let result = '';
    for (let child of div.childNodes) {
        result += cleanNode(child);
    }
    
    return result;
}

function processUserDescription(text) {
    if (!text) return '';
    
    // Convert newlines to <br> tags, but preserve existing HTML
    const withBreaks = text.replace(/\n/g, '<br>');
    
    // Sanitize the HTML
    return sanitizeUserHtml(withBreaks);
}

// URL encoding/decoding for user annotations
function encodeUserAnnotationsToURL() {
    if (!userAnnotations || userAnnotations.length === 0) {
        // Remove annotations parameter if no user annotations
        const url = new URL(window.location);
        url.searchParams.delete('annotations');
        window.history.replaceState({}, '', url);
        return;
    }
    
    try {
        const jsonString = JSON.stringify(userAnnotations);
        const base64 = btoa(unescape(encodeURIComponent(jsonString)));
        
        const url = new URL(window.location);
        url.searchParams.set('annotations', base64);
        window.history.replaceState({}, '', url);
    } catch (error) {
        console.error('Failed to encode user annotations to URL:', error);
    }
}

function parseUserAnnotationsFromURL() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const annotationsParam = urlParams.get('annotations');
        
        if (!annotationsParam) {
            return [];
        }
        
        const jsonString = decodeURIComponent(escape(atob(annotationsParam)));
        const parsed = JSON.parse(jsonString);
        
        if (!Array.isArray(parsed)) {
            console.warn('Invalid user annotations format in URL');
            return [];
        }
        
        // Validate and sanitize each annotation
        const maxAnnotations = (config && config.maxUserAnnotations) || 10;
        const validAnnotations = parsed.slice(0, maxAnnotations).filter(ann => {
            return ann &&
                   typeof ann === 'object' &&
                   typeof ann.x === 'number' &&
                   typeof ann.y === 'number' &&
                   typeof ann.type === 'string' &&
                   typeof ann.title === 'string' &&
                   ann.x >= 0 && ann.x <= 1 &&
                   ann.y >= 0 && ann.y <= 1 &&
                   ann.title.length <= 50;
        }).map(ann => {
            const cleanAnn = {
                x: ann.x,
                y: ann.y,
                type: ann.type,
                title: ann.title.substring(0, 50),
                description: ann.description ? ann.description.substring(0, 500) : ''
            };
            
            // Include shape if it exists
            if (typeof ann.shape === 'string' && (ann.shape === 'circle' || ann.shape === 'rectangle')) {
                cleanAnn.shape = ann.shape;
            } else {
                cleanAnn.shape = 'rectangle'; // default shape
            }
            
            // Include area-specific properties if they exist
            if (typeof ann.widthRel === 'number' && ann.widthRel > 0) {
                cleanAnn.widthRel = ann.widthRel;
            }
            if (typeof ann.heightRel === 'number' && ann.heightRel > 0) {
                cleanAnn.heightRel = ann.heightRel;
            }
            
            return cleanAnn;
        });
        
        return validAnnotations;
    } catch (error) {
        console.error('Failed to parse user annotations from URL:', error);
        return [];
    }
}

function mergeAnnotations() {
    // Combine standard annotations with user annotations
    const combined = [...annotations];
    
    userAnnotations.forEach(userAnn => {
        combined.push({
            ...userAnn,
            _isUserAnnotation: true
        });
    });
    
    return combined;
}

function renderMarkers() {
    if (markersRendered || !annotations || !Array.isArray(annotations)) return;
    markersRendered = true;

    priCounter = 1;
    infoCounter = 1;

    annotations.forEach((ann) => {
        if (!isValidAnnotation(ann)) return;

        const style = (config && config.typeStyles && config.typeStyles[ann.type]) || { bg: '#ccc', color: '#000', radius: '50%', border: 'gray' };
        const isInfo = ann.type === 'info';
        const index = isInfo ? infoCounter++ : priCounter++;

        const wrapperEl = document.createElement('div');
        wrapperEl.style.position = 'absolute';
        wrapperEl.style.transform = 'translate(-50%, -50%)';
        wrapperEl.style.zIndex = '10';

        const marker = document.createElement('div');
        marker.className = 'marker';
        marker.setAttribute('data-index', index);
        marker.style.background = style.bg;
        marker.style.color = style.color;
        marker.style.borderRadius = style.radius;
        marker.style.borderColor = style.border;
        if (isInfo) marker.textContent = '?';

        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip-box';
        tooltip.innerHTML = `<b>${index}. ${escapeHTML(ann.title)}</b><br><br>${cleanMultiline(ann.description)}`;
        tooltip.style.display = 'none';
        tooltipLayer.appendChild(tooltip);

        let hideTimeout;

        wrapperEl.addEventListener('mouseenter', () => {
            // Don't show tooltips in edit mode
            if (editModeEnabled) return;
            
            clearTimeout(hideTimeout);
            
            const markerRect = wrapperEl.getBoundingClientRect();
            const markerCenterX = markerRect.left + markerRect.width / 2;
            const markerCenterY = markerRect.top + markerRect.height / 2;

            tooltip.style.display = 'block';
            tooltip.style.minWidth = ((config && config.tooltipMinWidth) || 380) + 'px';

            requestAnimationFrame(() => {
                const tipWidth = tooltip.offsetWidth;
                const tipHeight = tooltip.offsetHeight;
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const margin = 10;

                // Start with tooltip centered above marker
                // Note: CSS has transform: translate(-50%, 0) so we position the center point
                let adjustedX = markerCenterX;
                let adjustedY = markerCenterY - tipHeight - 15;

                // Keep within horizontal bounds (accounting for CSS centering)
                if (adjustedX - tipWidth / 2 < margin) {
                    adjustedX = margin + tipWidth / 2;
                } else if (adjustedX + tipWidth / 2 > viewportWidth - margin) {
                    adjustedX = viewportWidth - margin - tipWidth / 2;
                }

                // Keep within vertical bounds
                if (adjustedY < margin) {
                    // Show below marker if not enough space above
                    adjustedY = markerCenterY + 15;
                    // Double-check it fits below too
                    if (adjustedY + tipHeight > viewportHeight - margin) {
                        adjustedY = viewportHeight - tipHeight - margin;
                    }
                } else if (adjustedY + tipHeight > viewportHeight - margin) {
                    // Move up if tooltip extends below viewport
                    adjustedY = viewportHeight - tipHeight - margin;
                }

                tooltip.style.left = `${adjustedX}px`;
                tooltip.style.top = `${adjustedY}px`;
            });
        });

        wrapperEl.addEventListener('mouseleave', () => {
            const delay = (config && config.ui && config.ui.tooltipHideDelay) || 100;
            hideTimeout = setTimeout(() => tooltip.style.display = 'none', delay);
        });

        // Touch support for mobile - show tooltip on tap
        wrapperEl.addEventListener('touchstart', (e) => {
            // Don't show tooltips in edit mode
            if (editModeEnabled) return;
            
            e.preventDefault(); // Prevent mouse events
            clearTimeout(hideTimeout);
            
            const markerRect = wrapperEl.getBoundingClientRect();
            const markerCenterX = markerRect.left + markerRect.width / 2;
            const markerCenterY = markerRect.top + markerRect.height / 2;

            tooltip.style.display = 'block';
            tooltip.style.minWidth = ((config && config.tooltipMinWidth) || 380) + 'px';

            requestAnimationFrame(() => {
                const tipWidth = tooltip.offsetWidth;
                const tipHeight = tooltip.offsetHeight;
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const margin = 10;

                // Start with tooltip centered above marker
                // Note: CSS has transform: translate(-50%, 0) so we position the center point
                let adjustedX = markerCenterX;
                let adjustedY = markerCenterY - tipHeight - 15;

                // Keep within horizontal bounds (accounting for CSS centering)
                if (adjustedX - tipWidth / 2 < margin) {
                    adjustedX = margin + tipWidth / 2;
                } else if (adjustedX + tipWidth / 2 > viewportWidth - margin) {
                    adjustedX = viewportWidth - margin - tipWidth / 2;
                }

                // Keep within vertical bounds
                if (adjustedY < margin) {
                    // Show below marker if not enough space above
                    adjustedY = markerCenterY + 15;
                    // Double-check it fits below too
                    if (adjustedY + tipHeight > viewportHeight - margin) {
                        adjustedY = viewportHeight - tipHeight - margin;
                    }
                } else if (adjustedY + tipHeight > viewportHeight - margin) {
                    // Move up if tooltip extends below viewport
                    adjustedY = viewportHeight - tipHeight - margin;
                }

                tooltip.style.left = `${adjustedX}px`;
                tooltip.style.top = `${adjustedY}px`;
            });
        });

        // Hide tooltip when tapping elsewhere
        document.addEventListener('touchstart', (e) => {
            if (!wrapperEl.contains(e.target) && !tooltip.contains(e.target)) {
                tooltip.style.display = 'none';
                clearTimeout(hideTimeout);
            }
        });

        tooltip.addEventListener('mouseenter', () => {
            clearTimeout(hideTimeout);
        });

        tooltip.addEventListener('mouseleave', () => {
            const delay = (config && config.ui && config.ui.tooltipHideDelay) || 100;
            hideTimeout = setTimeout(() => tooltip.style.display = 'none', delay);
        });

        wrapperEl.appendChild(marker);
        wrapper.appendChild(wrapperEl);

        ann._el = wrapperEl;
        ann._tooltip = tooltip;
        ann._index = index;
    });

    scheduleMarkerPositioning();
}

function getImageBounds(forceRefresh = false) {
    // During touch gestures, use cached bounds to avoid stale DOM readings
    if (!forceRefresh && isTouchActive && cachedBounds) {
        // Apply current translate values to cached bounds
        const translateAdjustedBounds = {
            ...cachedBounds,
            left: cachedBounds.left + imageTranslateX,
            top: cachedBounds.top + imageTranslateY,
            right: cachedBounds.right + imageTranslateX,
            bottom: cachedBounds.bottom + imageTranslateY
        };
        return translateAdjustedBounds;
    }
    
    // Force a layout reflow to ensure DOM is up-to-date
    if (forceRefresh || !cachedBounds) {
        // Reading offsetHeight forces layout
        void image.offsetHeight;
    }
    
    const wrapperRect = wrapper.getBoundingClientRect();
    const displayedWidth = image.offsetWidth || image.clientWidth;
    const displayedHeight = image.offsetHeight || image.clientHeight;
    const effectiveLeft = wrapperRect.left + imageTranslateX;
    const effectiveTop = wrapperRect.top + imageTranslateY;
    
    const bounds = {
        left: effectiveLeft,
        top: effectiveTop,
        width: displayedWidth,
        height: displayedHeight,
        right: effectiveLeft + displayedWidth,
        bottom: effectiveTop + displayedHeight
    };
    
    // Cache bounds when not in touch mode
    if (!isTouchActive) {
        cachedBounds = {
            left: wrapperRect.left,
            top: wrapperRect.top,
            width: displayedWidth,
            height: displayedHeight,
            right: wrapperRect.left + displayedWidth,
            bottom: wrapperRect.top + displayedHeight
        };
    }
    
    return bounds;
}

function isValidBounds(bounds) {
    return bounds && 
           typeof bounds.left === 'number' && 
           typeof bounds.top === 'number' && 
           typeof bounds.width === 'number' && 
           typeof bounds.height === 'number' &&
           bounds.width > 0 && 
           bounds.height > 0 &&
           !isNaN(bounds.left) && 
           !isNaN(bounds.top) &&
           !isNaN(bounds.width) && 
           !isNaN(bounds.height);
}

function scheduleMarkerPositioning(immediate = false) {
    // Prevent overlapping positioning calls
    if (isPositioningMarkers) return;
    
    // During touch gestures, position immediately to avoid timing issues
    if (immediate || isTouchActive) {
        isPositioningMarkers = true;
        positionMarkers();
        isPositioningMarkers = false;
        return;
    }
    
    isPositioningMarkers = true;
    requestAnimationFrame(() => {
        positionMarkers();
        isPositioningMarkers = false;
    });
}

function positionMarkers() {
    const bounds = getImageBounds();
    
    // Validate bounds to prevent positioning with invalid coordinates
    if (!isValidBounds(bounds)) {
        console.warn('Invalid bounds detected, skipping marker positioning');
        return;
    }
    
    const scale = (config && config.markerScale) || 0.01;

    annotations.forEach(ann => {
        if (!ann._el) return;

        const factor = ann.size === 'small' ? 0.5 : 1.0;
        const baseSize = bounds.width * scale * factor;
        const scaledSize = baseSize * currentZoom;

        const wrapperEl = ann._el;
        const marker = wrapperEl.querySelector('.marker');

        const relativeX = ann.x * bounds.width * xMultiplier * currentZoom;
        const relativeY = ann.y * bounds.height * yMultiplier * currentZoom;
        
        const left = bounds.left + relativeX;
        const top = bounds.top + relativeY;

        wrapperEl.style.left = `${left}px`;
        wrapperEl.style.top = `${top}px`;

        marker.style.width = `${scaledSize}px`;
        marker.style.height = `${scaledSize}px`;
        marker.style.fontSize = `${scaledSize * 0.5}px`;
    });
    
    positionUserAnnotationMarkers();
}

function positionUserAnnotationMarkers() {
    const bounds = getImageBounds();
    
    // Validate bounds to prevent positioning with invalid coordinates
    if (!isValidBounds(bounds)) {
        console.warn('Invalid bounds detected, skipping user annotation positioning');
        return;
    }
    
    const scale = (config && config.markerScale) || 0.01;

    userAnnotations.forEach(ann => {
        if (!ann._el) return;

        const style = config.userAnnotationTypes[ann.type];
        if (!style) return;
        
        const wrapperEl = ann._el;
        
        // Calculate position on the zoomed/panned image
        const relativeX = ann.x * bounds.width * xMultiplier * currentZoom;
        const relativeY = ann.y * bounds.height * yMultiplier * currentZoom;
        
        const left = bounds.left + relativeX;
        const top = bounds.top + relativeY;

        wrapperEl.style.left = `${left}px`;
        wrapperEl.style.top = `${top}px`;

        if (style.annotationType === 'area') {
            // Area annotation positioning
            const areaElement = wrapperEl.querySelector('.area-annotation');
            if (areaElement) {
                // Convert relative size back to pixels based on current bounds and zoom
                const widthRel = ann.widthRel;
                const heightRel = ann.heightRel;
                
                const pixelWidth = widthRel * bounds.width * currentZoom;
                const pixelHeight = heightRel * bounds.height * currentZoom;
                
                areaElement.style.width = `${pixelWidth}px`;
                areaElement.style.height = `${pixelHeight}px`;
            }
        } else {
            // Point annotation positioning
            const marker = wrapperEl.querySelector('.marker');
            if (marker) {
                const baseSize = bounds.width * scale;
                const userSize = baseSize * (style.scale || 2.0) * currentZoom; // Scale with zoom
                
                marker.style.width = `${userSize}px`;
                marker.style.height = `${userSize}px`;
                marker.style.fontSize = `${userSize * 0.4}px`;
            }
        }
    });
}

function renderList() {
    if (!annotations || !Array.isArray(annotations)) return;
    
    list.innerHTML = '';
    let tempPriCounter = 1;
    let tempInfoCounter = 1;

    annotations.forEach((ann) => {
        if (!ann || typeof ann !== 'object') return;
        
        if (ann.type === 'separator') {
            const sep = document.createElement('div');
            sep.className = 'annotation-separator';
            sep.innerHTML = `<span>${escapeHTML(ann.title || '')}</span>`;
            list.appendChild(sep);
            return;
        }

        if (isLegendItem(ann)) {
            const item = document.createElement('div');
            item.className = 'annotation-item';
            const style = config.typeStyles[ann.type] || { bg: '#ccc', color: '#000' };
            item.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 6px;">
            <div style="background:${style.bg};color:${style.color};padding:2px 6px;border-radius:4px;white-space:nowrap;">-</div>
            <div>
                <b>${escapeHTML(ann.title || '')}</b><br>${cleanMultiline(ann.description || '')}
            </div>
        </div>`;
            list.appendChild(item);
            return;
        }

        const style = config.typeStyles[ann.type] || { bg: '#ccc', color: '#000' };
        const isInfo = ann.type === 'info';
        const index = isInfo ? tempInfoCounter++ : tempPriCounter++;

        const item = document.createElement('div');
        item.className = 'annotation-item';
        item.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 6px;">
            <div style="background:${style.bg};color:${style.color};padding:2px 6px;border-radius:4px;white-space:nowrap;">
                ${index}
            </div>
            <div>
                <b>${escapeHTML(ann.title || '')}</b><br>${cleanMultiline(ann.description || '')}
            </div>
        </div>`;
        list.appendChild(item);
    });
}

const toggleAnnotationsBtn = document.getElementById('toggle-annotations');
const toggleMarkersBtn = document.getElementById('toggle-markers');

let annotationsVisible = false;
let markersVisible = true;

toggleMarkersBtn.classList.add('active');
document.body.classList.remove('annotations-active');
document.body.classList.remove('hidden-markers');

toggleAnnotationsBtn.addEventListener('click', () => {
    if (!markersVisible) {
        markersVisible = true;
        document.body.classList.remove('hidden-markers');
        toggleMarkersBtn.classList.add('active');
    }

    annotationsVisible = !annotationsVisible;
    toggleAnnotationsBtn.classList.toggle('active', annotationsVisible);

    if (annotationsVisible) {
        document.body.classList.add('annotations-active');
        renderList();
    } else {
        document.body.classList.remove('annotations-active');
        list.innerHTML = '';
    }

    scheduleMarkerPositioning();
});

toggleMarkersBtn.addEventListener('click', () => {
    markersVisible = !markersVisible;
    toggleMarkersBtn.classList.toggle('active', markersVisible);

    if (markersVisible) {
        document.body.classList.remove('hidden-markers');
    } else {
        document.body.classList.add('hidden-markers');

        annotationsVisible = false;
        document.body.classList.remove('annotations-active');
        list.innerHTML = '';
        toggleAnnotationsBtn.classList.remove('active');
    }

    scheduleMarkerPositioning();
});

function showLoadingState() {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = (config && config.ui && config.ui.loadingIndicatorId) || 'loading-indicator';
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
    const loadingMessage = (config && config.ui && config.ui.loadingMessage) || 'Loading diagram...';
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
    const loadingId = (config && config.ui && config.ui.loadingIndicatorId) || 'loading-indicator';
    const loadingDiv = document.getElementById(loadingId);
    if (loadingDiv) {
        loadingDiv.parentNode.removeChild(loadingDiv);
    }
}

function handleImageLoad() {
    try {
        hideLoadingState();
        
        currentZoom = 1;
        imageTranslateX = 0;
        imageTranslateY = 0;
        image.style.transform = 'none';
        image.style.cursor = 'default';
        
        renderMarkers();
        scheduleMarkerPositioning();

        if (debug) {
            const debugControls = document.getElementById('debug-controls');
            if (debugControls) {
                debugControls.style.display = 'flex';
            }
        }
    } catch (error) {
        hideLoadingState();
        console.error('Error during image load handling:', error);
        showError('Failed to initialize annotations');
    }
}

function handleImageError() {
    hideLoadingState();
    console.error('Failed to load image:', image.src);
    showError('Failed to load diagram image. Please check your connection and try refreshing the page.');
}

function showError(message, isRetryable = false) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ff4444;
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 12000;
        font-family: sans-serif;
        font-size: 14px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    const retryButton = isRetryable ? '<br><br><button onclick="location.reload()" style="background: #fff; color: #ff4444; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Retry</button>' : '';
    
    errorDiv.innerHTML = `
        <div style="margin-bottom: 8px; font-weight: bold;">⚠️ Error</div>
        <div>${message}</div>
        ${retryButton}
        <div style="margin-top: 12px; font-size: 12px; opacity: 0.8;"><button onclick="this.parentElement.parentElement.remove()" style="background: #fff; color: #ff4444; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">Close</button></div>
    `;
    
    document.body.appendChild(errorDiv);
    
}

// Show loading state immediately
showLoadingState();

image.addEventListener('load', handleImageLoad);
image.addEventListener('error', handleImageError);

function handleResize() {
    try {
        currentZoom = 1;
        imageTranslateX = 0;
        imageTranslateY = 0;
        image.style.transform = 'none';
        image.style.cursor = 'default';
        
        // Clear bounds cache and ensure touch is not active during resize
        cachedBounds = null;
        isTouchActive = false;
        
        scheduleMarkerPositioning(true); // Immediate positioning after resize
    } catch (error) {
        console.error('Error during resize handling:', error);
    }
}

function updateImageTransform() {
    const transform = `translate(${imageTranslateX}px, ${imageTranslateY}px) scale(${currentZoom})`;
    image.style.transform = transform;
    image.style.cursor = currentZoom > 1 ? 'grab' : 'default';
    
    // Use immediate positioning during touch gestures to avoid timing issues
    scheduleMarkerPositioning(isTouchActive);
}

function handleWheel(e) {
    // Don't zoom on horizontal scroll
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        return;
    }
    
    // Check if mouse is over the image wrapper
    const wrapperRect = wrapper.getBoundingClientRect();
    const isOverWrapper = e.clientX >= wrapperRect.left && e.clientX <= wrapperRect.right &&
                         e.clientY >= wrapperRect.top && e.clientY <= wrapperRect.bottom;
    
    if (!isOverWrapper) {
        return;
    }
    
    e.preventDefault();
    
    const zoomStep = 0.05;
    
    // Calculate mouse position relative to wrapper, accounting for its scroll
    const mouseX = e.clientX - wrapperRect.left + wrapper.scrollLeft;
    const mouseY = e.clientY - wrapperRect.top;
    
    const oldZoom = currentZoom;
    if (e.deltaY < 0) {
        currentZoom = Math.min(currentZoom + zoomStep, maxZoom);
    } else {
        currentZoom = Math.max(currentZoom - zoomStep, minZoom);
    }
    
    if (Math.abs(currentZoom - oldZoom) > 0.001) {
        const targetX = (mouseX - imageTranslateX) / oldZoom;
        const targetY = (mouseY - imageTranslateY) / oldZoom;
        
        imageTranslateX = mouseX - targetX * currentZoom;
        imageTranslateY = mouseY - targetY * currentZoom;
        
        if (currentZoom <= 1) {
            currentZoom = 1;
            imageTranslateX = 0;
            imageTranslateY = 0;
        }
        
        updateImageTransform();
    }
}

function handleMouseDown(e) {
    if (e.target !== image || currentZoom <= 1) return;
    
    isPanning = true;
    panStartX = e.clientX - imageTranslateX;
    panStartY = e.clientY - imageTranslateY;
    
    image.style.cursor = 'grabbing';
    e.preventDefault();
}

function handleMouseMove(e) {
    if (!isPanning) return;
    
    imageTranslateX = e.clientX - panStartX;
    imageTranslateY = e.clientY - panStartY;
    
    updateImageTransform();
    e.preventDefault();
}

function handleMouseUp(e) {
    if (!isPanning) return;
    
    isPanning = false;
    image.style.cursor = currentZoom > minZoom ? 'grab' : 'default';
    e.preventDefault();
}


window.addEventListener('resize', handleResize);

document.addEventListener('wheel', handleWheel, { passive: false });
image.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('mouseup', handleMouseUp);

// Touch support for mobile zoom/pan
let touchStartDistance = 0;
let touchStartZoom = 1;
let touchStartCenter = { x: 0, y: 0 };

function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(touches) {
    return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
    };
}

function handleTouchStart(e) {
    // Mark touch as active to enable special handling
    isTouchActive = true;
    
    // Cache bounds at start of touch to avoid stale readings during gesture
    cachedBounds = null;
    getImageBounds(true); // Force refresh and cache
    
    if (e.touches.length === 2) {
        touchStartDistance = getTouchDistance(e.touches);
        touchStartZoom = currentZoom;
        const center = getTouchCenter(e.touches);
        const wrapperRect = wrapper.getBoundingClientRect();
        touchStartCenter = {
            x: center.x - wrapperRect.left + wrapper.scrollLeft,
            y: center.y - wrapperRect.top
        };
        e.preventDefault();
    } else if (e.touches.length === 1 && currentZoom > 1) {
        isPanning = true;
        panStartX = e.touches[0].clientX - imageTranslateX;
        panStartY = e.touches[0].clientY - imageTranslateY;
        e.preventDefault();
    }
    // Don't preventDefault for single touches at zoom=1 to allow marker interaction
}

function handleTouchMove(e) {
    if (e.touches.length === 2) {
        const currentDistance = getTouchDistance(e.touches);
        const currentCenter = getTouchCenter(e.touches);
        
        const distanceRatio = currentDistance / touchStartDistance;
        const zoomFactor = Math.max(0.5, Math.min(2.0, distanceRatio));
        const newZoom = Math.max(minZoom, Math.min(maxZoom, touchStartZoom * zoomFactor));
        
        const wrapperRect = wrapper.getBoundingClientRect();
        const centerX = currentCenter.x - wrapperRect.left + wrapper.scrollLeft;
        const centerY = currentCenter.y - wrapperRect.top;
        
        // Use same logic as desktop wheel zoom for consistency
        const oldZoom = currentZoom;
        currentZoom = newZoom;
        
        // Touch center is now relative to image coordinate system (same as desktop)
        const targetX = (centerX - imageTranslateX) / oldZoom;
        const targetY = (centerY - imageTranslateY) / oldZoom;
        
        imageTranslateX = centerX - targetX * currentZoom;
        imageTranslateY = centerY - targetY * currentZoom;
        
        if (currentZoom <= 1) {
            currentZoom = 1;
            imageTranslateX = 0;
            imageTranslateY = 0;
        }
        
        updateImageTransform();
        e.preventDefault();
    } else if (e.touches.length === 1 && isPanning) {
        imageTranslateX = e.touches[0].clientX - panStartX;
        imageTranslateY = e.touches[0].clientY - panStartY;
        updateImageTransform();
        e.preventDefault();
    }
}

function handleTouchEnd(e) {
    if (e.touches.length === 0) {
        isPanning = false;
        touchStartDistance = 0;
        
        // Mark touch as inactive and refresh bounds cache
        isTouchActive = false;
        cachedBounds = null;
        
        // Final positioning update with fresh bounds
        scheduleMarkerPositioning(true);
    }
}

// Add touch event listeners
image.addEventListener('touchstart', handleTouchStart, { passive: false });
image.addEventListener('touchmove', handleTouchMove, { passive: false });
image.addEventListener('touchend', handleTouchEnd);


if (debug) {
    image.addEventListener('click', e => {
        const rect = image.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        console.log(`{ x: ${x.toFixed(3)}, y: ${y.toFixed(3)}, type: 'pri-3', title: 'Title', description: 'Description' },`);
    });

    const debugControls = document.getElementById('debug-controls');
    if (debugControls) {
        debugControls.style.display = 'flex';
    }

    const xInput = document.getElementById('x-multiplier');
    const yInput = document.getElementById('y-multiplier');
    const exportBtn = document.getElementById('export-coords');

    if (xInput) {
        xInput.addEventListener('input', () => {
            xMultiplier = parseFloat(xInput.value) || 1;
            scheduleMarkerPositioning();
        });
    }

    if (yInput) {
        yInput.addEventListener('input', () => {
            yMultiplier = parseFloat(yInput.value) || 1;
            scheduleMarkerPositioning();
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const updated = annotations.map(a => {
                const clean = Object.fromEntries(
                    Object.entries(a).filter(([key, _]) => !key.startsWith('_'))
                );

                if ('x' in clean && 'y' in clean) {
                    clean.x = parseFloat((clean.x * xMultiplier).toFixed(4));
                    clean.y = parseFloat((clean.y * yMultiplier).toFixed(4));
                }

                return clean;
            });

            console.log(updated);
        });
    }
}

// User annotation functions
let editModeEnabled = false;

function initializeUserAnnotations() {
    const toggleBtn = document.getElementById('toggle-user-annotations');
    const modal = document.getElementById('user-annotations-modal');
    const editModal = document.getElementById('edit-annotation-modal');
    const closeBtn = document.getElementById('close-user-modal');
    const closeEditBtn = document.getElementById('close-edit-modal');
    const typeSelector = document.getElementById('type-selector');
    const editTypeSelect = document.getElementById('edit-type');
    const placeBtn = document.getElementById('place-annotation-btn');
    const shareBtn = document.getElementById('share-url-btn');
    const clearAllBtn = document.getElementById('clear-all-annotations');
    const editModeCheckbox = document.getElementById('edit-mode-checkbox');
    const exitEditModeBtn = document.getElementById('exit-edit-mode');
    
    // Mode selector state (using global currentMode variable)
    
    function updateTypeOptions() {
        // Clear existing type buttons
        typeSelector.innerHTML = '';
        
        if (config && config.userAnnotationTypes) {
            // Get unique types (without area-/user- prefixes)
            const uniqueTypes = new Set();
            Object.entries(config.userAnnotationTypes).forEach(([type, style]) => {
                // Extract the base type name (remove 'user-' or 'area-' prefix)
                const baseType = type.replace(/^(user-|area-)/, '');
                uniqueTypes.add(baseType);
            });
            
            // Create visual type buttons
            uniqueTypes.forEach(baseType => {
                const prefix = currentMode === 'area' ? 'area-' : 'user-';
                const fullTypeKey = prefix + baseType;
                const style = config.userAnnotationTypes[fullTypeKey];
                
                if (style) {
                    const typeBtn = document.createElement('button');
                    typeBtn.type = 'button';
                    typeBtn.className = `type-btn ${baseType === selectedType ? 'active' : ''}`;
                    typeBtn.title = style.label;
                    typeBtn.dataset.type = baseType;
                    
                    // Get current shape selection
                    const circleBtn = document.getElementById('shape-circle');
                    const isCircleShape = circleBtn && circleBtn.classList.contains('active');
                    
                    // Set background color and shape based on mode and shape
                    if (currentMode === 'area') {
                        typeBtn.style.background = 'transparent';
                        typeBtn.style.borderColor = style.border;
                        typeBtn.style.borderWidth = style.borderWidth || '3px';
                        typeBtn.style.borderStyle = style.borderStyle || 'solid';
                    } else {
                        typeBtn.style.background = style.bg;
                        typeBtn.style.borderColor = style.border;
                        typeBtn.style.borderWidth = style.borderWidth || '2px';
                        typeBtn.style.borderStyle = style.borderStyle || 'solid';
                    }
                    
                    // Set border radius based on selected shape
                    typeBtn.style.borderRadius = isCircleShape ? '50%' : '6px';
                    
                    // Add click handler
                    typeBtn.addEventListener('click', () => {
                        // Remove active from all buttons
                        typeSelector.querySelectorAll('.type-btn').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        // Add active to clicked button
                        typeBtn.classList.add('active');
                        selectedType = baseType;
                        updateInlineFormValidation();
                    });
                    
                    typeSelector.appendChild(typeBtn);
                }
            });
            
            // Restore current selection or default to 'info'
            if (!selectedType) {
                selectedType = 'info';
            }
            
            // Clear all active states first
            typeSelector.querySelectorAll('.type-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Set the currently selected type as active
            const currentBtn = typeSelector.querySelector(`[data-type="${selectedType}"]`);
            if (currentBtn) {
                currentBtn.classList.add('active');
            }
        }
        
        // Update form validation
        updateInlineFormValidation();
    }
    
    // Populate edit type select with all types
    if (config && config.userAnnotationTypes) {
        Object.entries(config.userAnnotationTypes).forEach(([type, style]) => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = style.label;
            editTypeSelect.appendChild(option.cloneNode(true));
        });
    }
    
    // Mode selector handlers
    const pointModeBtn = document.getElementById('mode-point');
    const areaModeBtn = document.getElementById('mode-area');
    
    if (pointModeBtn && areaModeBtn) {
        pointModeBtn.addEventListener('click', () => {
            currentMode = 'point';
            pointModeBtn.classList.add('active');
            areaModeBtn.classList.remove('active');
            updateTypeOptions(); // Update type buttons for new mode
            updateInlineFormValidation();
        });
        
        areaModeBtn.addEventListener('click', () => {
            currentMode = 'area';
            areaModeBtn.classList.add('active');
            pointModeBtn.classList.remove('active');
            updateTypeOptions(); // Update type buttons for new mode
            updateInlineFormValidation();
        });
    }
    
    // Shape selector handlers
    const rectangleBtn = document.getElementById('shape-rectangle');
    const circleBtn = document.getElementById('shape-circle');
    
    if (rectangleBtn && circleBtn) {
        rectangleBtn.addEventListener('click', () => {
            rectangleBtn.classList.add('active');
            circleBtn.classList.remove('active');
            updateTypeOptions(); // Update type buttons for new shape
            updateInlineFormValidation();
        });
        
        circleBtn.addEventListener('click', () => {
            circleBtn.classList.add('active');
            rectangleBtn.classList.remove('active');
            updateTypeOptions(); // Update type buttons for new shape
            updateInlineFormValidation();
        });
    }
    
    // Initialize type options
    updateTypeOptions();
    
    // Initialize edit mode button visibility
    updateEditModeButtonVisibility();
    
    // Toggle modal
    toggleBtn.addEventListener('click', () => {
        const isVisible = modal.style.display !== 'none';
        modal.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            // Clear form and initialize default selections when opening modal
            clearInlineForm(); // This resets form fields and selectedType
            
            currentMode = 'area';
            const areaModeBtn = document.getElementById('mode-area');
            const pointModeBtn = document.getElementById('mode-point');
            if (areaModeBtn && pointModeBtn) {
                areaModeBtn.classList.add('active');
                pointModeBtn.classList.remove('active');
            }
            
            // Reset shape to rectangle (default)
            const rectangleBtn = document.getElementById('shape-rectangle');
            const circleBtn = document.getElementById('shape-circle');
            if (rectangleBtn && circleBtn) {
                rectangleBtn.classList.add('active');
                circleBtn.classList.remove('active');
            }
            
            updateTypeOptions();
            updateUserAnnotationsList();
            updateInlineFormValidation();
        }
    });
    
    // Close modals
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        cleanupPlacementMode(); // Cleanup if in placement mode
    });
    closeEditBtn.addEventListener('click', () => editModal.style.display = 'none');
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            cleanupPlacementMode(); // Cleanup if in placement mode
        }
    });
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) editModal.style.display = 'none';
    });
    
    // Add escape key handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (isInPlacementMode) {
                cleanupPlacementMode();
            }
            if (modal.style.display !== 'none') {
                modal.style.display = 'none';
            }
            if (editModal.style.display !== 'none') {
                editModal.style.display = 'none';
            }
        }
    });
    
    // Type selection is now handled by visual type selector buttons
    
    // Edit mode toggle
    editModeCheckbox.addEventListener('change', () => {
        editModeEnabled = editModeCheckbox.checked;
        updateUserAnnotationDragState();
        updateEditModeButtonVisibility();
    });
    
    // Exit edit mode button
    exitEditModeBtn.addEventListener('click', () => {
        editModeEnabled = false;
        editModeCheckbox.checked = false;
        updateUserAnnotationDragState();
        updateEditModeButtonVisibility();
    });
    
    // Place annotation button
    placeBtn.addEventListener('click', () => {
        const title = document.getElementById('inline-title').value.trim();
        const type = selectedType;
        const description = document.getElementById('inline-description').value;
        const mode = currentMode;
        
        if (title && type && mode) {
            // Get shape for both point and area annotations
            let shape = 'rectangle'; // default
            const circleBtn = document.getElementById('shape-circle');
            if (circleBtn && circleBtn.classList.contains('active')) {
                shape = 'circle';
            }
            
            // Construct the full type key
            const prefix = mode === 'area' ? 'area-' : 'user-';
            const fullType = prefix + type;
            
            const annotationData = {
                title: title.substring(0, 50),
                type: fullType,
                description: description.substring(0, 500),
                shape: shape
            };
            
            startAddAnnotationModeWithData(annotationData);
            modal.style.display = 'none';
        }
    });
    
    // Share URL
    shareBtn.addEventListener('click', () => {
        try {
            navigator.clipboard.writeText(window.location.href);
            shareBtn.textContent = '✓ Copied!';
            setTimeout(() => {
                shareBtn.textContent = '📋 Copy Share URL';
            }, 2000);
        } catch (error) {
            console.error('Failed to copy URL:', error);
            shareBtn.textContent = 'Failed to copy';
            setTimeout(() => {
                shareBtn.textContent = '📋 Copy Share URL';
            }, 2000);
        }
    });
    
    // Clear all annotations
    clearAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to remove all user annotations?')) {
            userAnnotations = [];
            encodeUserAnnotationsToURL();
            renderAllMarkers();
            updateUserAnnotationsList();
        }
    });
    
    // Form handling
    initializeInlineForm();
    initializeEditForm();
}

// updateTypePreview function removed - type selection is now visual

function updateInlineFormValidation() {
    const title = document.getElementById('inline-title').value.trim();
    const type = selectedType;
    const placeBtn = document.getElementById('place-annotation-btn');
    
    let isValid = title && type && currentMode;
    
    // Check that a shape is selected
    const rectangleBtn = document.getElementById('shape-rectangle');
    const circleBtn = document.getElementById('shape-circle');
    const hasShapeSelected = (rectangleBtn && rectangleBtn.classList.contains('active')) || 
                            (circleBtn && circleBtn.classList.contains('active'));
    isValid = isValid && hasShapeSelected;
    
    placeBtn.disabled = !isValid;
}

function updateEditModeButtonVisibility() {
    const exitEditModeBtn = document.getElementById('exit-edit-mode');
    if (exitEditModeBtn) {
        exitEditModeBtn.style.display = editModeEnabled ? 'inline-block' : 'none';
    }
}

function updateUserAnnotationDragState() {
    // Hide all tooltips when entering edit mode
    if (editModeEnabled) {
        const allTooltips = document.querySelectorAll('.tooltip-box');
        allTooltips.forEach(tooltip => {
            tooltip.style.display = 'none';
        });
    }
    
    // Update cursor and enable/disable drag for existing user annotations
    const userMarkers = document.querySelectorAll('.user-annotation-marker');
    userMarkers.forEach(marker => {
        if (editModeEnabled) {
            marker.style.cursor = 'move';
            marker.style.opacity = '0.9';
        } else {
            marker.style.cursor = 'pointer';
            marker.style.opacity = '0.8';
        }
    });
    
    // Update area annotations
    const areaAnnotations = document.querySelectorAll('.area-annotation');
    areaAnnotations.forEach((area, index) => {
        if (editModeEnabled) {
            area.classList.add('edit-mode');
            area.style.cursor = 'move';
            
            // Add resize handles if not already present
            if (area.querySelectorAll('.resize-handle').length === 0) {
                const userIndex = parseInt(area.getAttribute('data-user-index'));
                if (!isNaN(userIndex) && userAnnotations[userIndex]) {
                    addAreaResizeHandles(area, userAnnotations[userIndex], userIndex);
                }
            }
            
            // Show existing handles
            const handles = area.querySelectorAll('.resize-handle');
            handles.forEach(handle => {
                handle.style.display = 'block';
            });
        } else {
            area.classList.remove('edit-mode');
            area.style.cursor = 'pointer';
            
            // Hide resize handles
            const handles = area.querySelectorAll('.resize-handle');
            handles.forEach(handle => {
                handle.style.display = 'none';
            });
        }
    });
}

function initializeInlineForm() {
    const titleInput = document.getElementById('inline-title');
    const descInput = document.getElementById('inline-description');
    const titleCount = document.getElementById('inline-title-count');
    const descCount = document.getElementById('inline-desc-count');
    const preview = document.getElementById('inline-description-preview');
    
    // Character counting and validation
    titleInput.addEventListener('input', () => {
        titleCount.textContent = titleInput.value.length;
        updateInlineFormValidation();
    });
    
    descInput.addEventListener('input', () => {
        descCount.textContent = descInput.value.length;
        updateInlineDescriptionPreview();
    });
    
    // Initialize preview
    updateInlineDescriptionPreview();
}

function updateInlineDescriptionPreview() {
    const descInput = document.getElementById('inline-description');
    const preview = document.getElementById('inline-description-preview');
    
    const processedText = processUserDescription(descInput.value);
    preview.innerHTML = processedText || '<em>No description</em>';
}

function initializeEditForm() {
    const form = document.getElementById('edit-annotation-form');
    const titleInput = document.getElementById('edit-title');
    const descInput = document.getElementById('edit-description');
    const titleCount = document.getElementById('edit-title-count');
    const descCount = document.getElementById('edit-desc-count');
    const preview = document.getElementById('edit-description-preview');
    const cancelBtn = document.getElementById('cancel-edit');
    
    // Character counting
    titleInput.addEventListener('input', () => {
        titleCount.textContent = titleInput.value.length;
    });
    
    descInput.addEventListener('input', () => {
        descCount.textContent = descInput.value.length;
        updateEditDescriptionPreview();
    });
    
    // Form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = titleInput.value.trim();
        const description = descInput.value;
        const type = document.getElementById('edit-type').value;
        const editIndex = parseInt(form.dataset.editIndex);
        
        if (!title || !type || isNaN(editIndex)) return;
        
        // Update existing annotation
        userAnnotations[editIndex] = {
            ...userAnnotations[editIndex],
            title: title.substring(0, 50),
            description: description.substring(0, 500),
            type: type
        };
        
        // Update URL and re-render
        encodeUserAnnotationsToURL();
        renderAllMarkers();
        updateUserAnnotationsList();
        
        // Close edit modal
        document.getElementById('edit-annotation-modal').style.display = 'none';
    });
    
    // Cancel button
    cancelBtn.addEventListener('click', () => {
        document.getElementById('edit-annotation-modal').style.display = 'none';
    });
}

function updateEditDescriptionPreview() {
    const descInput = document.getElementById('edit-description');
    const preview = document.getElementById('edit-description-preview');
    
    const processedText = processUserDescription(descInput.value);
    preview.innerHTML = processedText || '<em>No description</em>';
}

function cleanupPlacementMode() {
    if (!isInPlacementMode) return;
    
    // Remove event listeners
    if (placementMouseMoveHandler) {
        wrapper.removeEventListener('mousemove', placementMouseMoveHandler);
        placementMouseMoveHandler = null;
    }
    
    if (placementClickHandler) {
        wrapper.removeEventListener('click', placementClickHandler);
        placementClickHandler = null;
    }
    
    // Remove ghost element
    if (dragGhost && dragGhost.parentNode) {
        dragGhost.parentNode.removeChild(dragGhost);
    }
    dragGhost = null;
    
    // Reset cursor
    wrapper.style.cursor = '';
    
    // Reset state
    isInPlacementMode = false;
    currentPlacementData = null;
}

function startAddAnnotationModeWithData(annotationData) {
    // Prevent multiple placement modes
    if (isInPlacementMode) {
        cleanupPlacementMode();
    }
    
    if (!annotationData.type || !config.userAnnotationTypes[annotationData.type]) {
        return;
    }
    
    // Set placement mode state
    isInPlacementMode = true;
    currentPlacementData = annotationData;
    
    const style = config.userAnnotationTypes[annotationData.type];
    const isAreaAnnotation = style.annotationType === 'area';
    
    // Create ghost element
    dragGhost = document.createElement('div');
    dragGhost.className = 'user-annotation-ghost';
    dragGhost.style.position = 'absolute';
    dragGhost.style.background = style.bg;
    dragGhost.style.color = style.color;
    const borderWidth = style.borderWidth || '3px';
    const borderStyle = style.borderStyle || 'solid';
    dragGhost.style.border = `${borderWidth} ${borderStyle} ${style.border}`;
    dragGhost.style.cursor = 'move';
    dragGhost.style.zIndex = '1000';
    dragGhost.style.pointerEvents = 'none';
    dragGhost.style.opacity = '0.8';
    
    if (isAreaAnnotation) {
        // Area annotation ghost
        const width = style.defaultSize.width;
        const height = style.defaultSize.height;
        dragGhost.style.width = `${width}px`;
        dragGhost.style.height = `${height}px`;
        dragGhost.style.borderRadius = annotationData.shape === 'circle' ? '50%' : '4px';
        dragGhost.style.display = 'flex';
        dragGhost.style.alignItems = 'center';
        dragGhost.style.justifyContent = 'center';
        dragGhost.style.fontWeight = 'bold';
        dragGhost.style.fontSize = '14px';
        dragGhost.textContent = '+';
    } else {
        // Point annotation ghost
        dragGhost.style.borderRadius = annotationData.shape === 'circle' ? '50%' : '8px';
        dragGhost.style.width = '32px';
        dragGhost.style.height = '32px';
        dragGhost.style.display = 'flex';
        dragGhost.style.alignItems = 'center';
        dragGhost.style.justifyContent = 'center';
        dragGhost.style.fontWeight = 'bold';
        dragGhost.style.fontSize = '14px';
        dragGhost.textContent = '+';
    }
    
    wrapper.appendChild(dragGhost);
    
    // Set cursor to crosshair
    wrapper.style.cursor = 'crosshair';
    
    // Create mouse move handler
    placementMouseMoveHandler = (e) => {
        if (!dragGhost) return;
        
        const bounds = wrapper.getBoundingClientRect();
        const ghostWidth = parseInt(dragGhost.style.width);
        const ghostHeight = parseInt(dragGhost.style.height);
        const x = e.clientX - bounds.left - (ghostWidth / 2);
        const y = e.clientY - bounds.top - (ghostHeight / 2);
        
        dragGhost.style.left = `${x}px`;
        dragGhost.style.top = `${y}px`;
    };
    
    // Create click handler
    placementClickHandler = (e) => {
        if (!isInPlacementMode || !currentPlacementData) {
            return;
        }
        
        // Re-get style and isAreaAnnotation for this placement
        const currentStyle = config.userAnnotationTypes[currentPlacementData.type];
        const currentIsAreaAnnotation = currentStyle && currentStyle.annotationType === 'area';
        
        const bounds = image.getBoundingClientRect();
        let x = (e.clientX - bounds.left) / bounds.width;
        let y = (e.clientY - bounds.top) / bounds.height;
        
        // For area annotations, adjust coordinates so the center is at cursor position
        if (currentIsAreaAnnotation && currentStyle.defaultSize) {
            const pixelWidth = currentStyle.defaultSize.width;
            const pixelHeight = currentStyle.defaultSize.height;
            
            // Convert half size to relative coordinates
            const halfWidthRel = (pixelWidth / 2) / bounds.width;
            const halfHeightRel = (pixelHeight / 2) / bounds.height;
            
            // Adjust x,y to represent top-left corner instead of center
            x = x - halfWidthRel;
            y = y - halfHeightRel;
        }
        
        // Validate bounds
        if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
            // Check max annotations limit
            const maxAnnotations = (config && config.maxUserAnnotations) || 10;
            if (userAnnotations.length >= maxAnnotations) {
                alert(`Maximum ${maxAnnotations} user annotations allowed.`);
                cleanupPlacementMode();
                return;
            }
            
            // Create annotation object
            const annotation = {
                x: x,
                y: y,
                title: currentPlacementData.title,
                description: currentPlacementData.description,
                type: currentPlacementData.type,
                shape: currentPlacementData.shape || 'rectangle'
            };
            
            
            // Add area-specific properties
            if (currentIsAreaAnnotation) {
                // Store size as relative coordinates (0-1) like x/y position
                annotation.widthRel = currentStyle.defaultSize.width / bounds.width;
                annotation.heightRel = currentStyle.defaultSize.height / bounds.height;
            }
            
            // Add annotation
            userAnnotations.push(annotation);
            
            // Cleanup placement mode first
            cleanupPlacementMode();
            
            // Clear the inline form
            clearInlineForm();
            
            // Update URL and re-render with proper timing
            encodeUserAnnotationsToURL();
            
            // Force a reflow then render
            requestAnimationFrame(() => {
                renderAllMarkers();
                updateUserAnnotationsList();
                
                // Re-setup hover events for the newly added annotation after DOM is ready
                setTimeout(() => {
                    const newAnnotationIndex = userAnnotations.length - 1;
                    const newAnnotation = userAnnotations[newAnnotationIndex];
                    if (newAnnotation && newAnnotation._el) {
                        const style = config.userAnnotationTypes[newAnnotation.type];
                        if (style) {
                            if (style.annotationType === 'area') {
                                const areaElement = newAnnotation._el.querySelector('.area-annotation');
                                if (areaElement && newAnnotation._tooltip) {
                                    addAreaAnnotationHoverEvents(areaElement, newAnnotation._tooltip, newAnnotation);
                                }
                            } else {
                                if (newAnnotation._tooltip) {
                                    addPointAnnotationHoverEvents(newAnnotation._el, newAnnotation._tooltip, newAnnotation);
                                }
                            }
                        }
                    }
                }, 50);
                
                // Enable edit mode after hover events are set up
                setTimeout(() => {
                    editModeEnabled = true;
                    const editModeCheckbox = document.getElementById('edit-mode-checkbox');
                    if (editModeCheckbox) {
                        editModeCheckbox.checked = true;
                    }
                    updateUserAnnotationDragState();
                    updateEditModeButtonVisibility();
                }, 150);
            });
        } else {
            cleanupPlacementMode();
        }
    };
    
    // Add event listeners
    wrapper.addEventListener('mousemove', placementMouseMoveHandler);
    wrapper.addEventListener('click', placementClickHandler);
}

function clearInlineForm() {
    document.getElementById('inline-title').value = '';
    document.getElementById('inline-description').value = '';
    
    selectedType = 'info'; // Reset to default
    const typeSelector = document.getElementById('type-selector');
    if (typeSelector) {
        const infoBtn = typeSelector.querySelector('[data-type="info"]');
        if (infoBtn) {
            typeSelector.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
            infoBtn.classList.add('active');
        }
    }
    
    document.getElementById('inline-title-count').textContent = '0';
    document.getElementById('inline-desc-count').textContent = '0';
    updateInlineDescriptionPreview();
    updateInlineFormValidation();
}

function showEditAnnotationForm(index) {
    const ann = userAnnotations[index];
    if (!ann) return;
    
    const editModal = document.getElementById('edit-annotation-modal');
    const form = document.getElementById('edit-annotation-form');
    const titleInput = document.getElementById('edit-title');
    const descInput = document.getElementById('edit-description');
    const typeSelect = document.getElementById('edit-type');
    const titleCount = document.getElementById('edit-title-count');
    const descCount = document.getElementById('edit-desc-count');
    
    // Set form data
    titleInput.value = ann.title;
    descInput.value = ann.description || '';
    typeSelect.value = ann.type;
    titleCount.textContent = ann.title.length;
    descCount.textContent = (ann.description || '').length;
    
    // Store edit index
    form.dataset.editIndex = index;
    
    editModal.style.display = 'block';
    titleInput.focus();
    
    updateEditDescriptionPreview();
}


function updateUserAnnotationsList() {
    const container = document.getElementById('user-annotation-items');
    const count = document.getElementById('annotation-count');
    
    count.textContent = userAnnotations.length;
    container.innerHTML = '';
    
    if (userAnnotations.length === 0) {
        container.innerHTML = '<p><em>No user annotations yet.</em></p>';
        return;
    }
    
    userAnnotations.forEach((ann, index) => {
        const item = document.createElement('div');
        item.className = 'user-annotation-item';
        
        const style = config.userAnnotationTypes[ann.type] || {};
        const isArea = style.annotationType === 'area';
        const shapeIcon = ann.shape === 'circle' ? '●' : '■';
        const modeIcon = isArea ? '⬛' : '●';
        
        item.innerHTML = `
            <div class="annotation-item-row">
                <div class="type-indicator" style="background: ${style.bg}; border-color: ${style.border}; border-radius: ${ann.shape === 'circle' ? '50%' : '4px'};"></div>
                <div class="annotation-info">
                    <span class="annotation-title">${escapeHTML(ann.title)}</span>
                    <span class="annotation-meta">${modeIcon} ${shapeIcon}</span>
                </div>
                <div class="annotation-actions">
                    <button class="action-btn edit-btn desktop-only" onclick="editUserAnnotation(${index})" title="Edit">✏️</button>
                    <button class="action-btn delete-btn" onclick="deleteUserAnnotation(${index})" title="Delete">🗑️</button>
                </div>
            </div>
        `;
        
        container.appendChild(item);
    });
}

function editUserAnnotation(index) {
    showEditAnnotationForm(index);
}

function deleteUserAnnotation(index) {
    if (confirm('Delete this annotation?')) {
        userAnnotations.splice(index, 1);
        encodeUserAnnotationsToURL();
        renderAllMarkers();
        updateUserAnnotationsList();
    }
}

function renderAllMarkers() {
    // Clear existing markers - both point and area annotations
    document.querySelectorAll('.marker').forEach(el => {
        if (el.parentElement) el.parentElement.remove();
    });
    document.querySelectorAll('.user-annotation-wrapper').forEach(el => el.remove());
    document.querySelectorAll('.tooltip-box').forEach(el => el.remove());
    
    // Clear any remaining area annotation elements
    document.querySelectorAll('.area-annotation').forEach(el => {
        if (el.parentElement) el.parentElement.remove();
    });
    
    // Reset render state
    markersRendered = false;
    priCounter = 1;
    infoCounter = 1;
    
    // Clear annotation references
    annotations.forEach(ann => {
        delete ann._el;
        delete ann._tooltip;
        delete ann._index;
    });
    
    // Clear user annotation references
    userAnnotations.forEach(ann => {
        delete ann._el;
        delete ann._tooltip;
        delete ann._index;
    });
    
    // Render standard markers
    renderMarkers();
    
    // Render user annotation markers
    renderUserAnnotationMarkers();
    
    // Position all markers with a small delay to ensure DOM is ready
    requestAnimationFrame(() => {
        scheduleMarkerPositioning();
    });
}

function renderUserAnnotationMarkers() {
    userAnnotations.forEach((ann, index) => {
        const style = config.userAnnotationTypes[ann.type];
        if (!style) return;
        
        const isAreaAnnotation = style.annotationType === 'area';
        
        if (isAreaAnnotation) {
            renderAreaAnnotation(ann, index, style);
        } else {
            renderPointAnnotation(ann, index, style);
        }
    });
}

function renderPointAnnotation(ann, index, style) {
    const wrapperEl = document.createElement('div');
    wrapperEl.className = 'user-annotation-wrapper';
    wrapperEl.style.position = 'absolute';
    wrapperEl.style.transform = 'translate(-50%, -50%)';
    wrapperEl.style.zIndex = '15'; // Higher than standard annotations but not too high
    
    const marker = document.createElement('div');
    marker.className = 'marker user-annotation-marker';
    marker.style.background = style.bg;
    marker.style.color = style.color;
    
    const shape = ann.shape || 'rectangle';
    marker.style.borderRadius = shape === 'circle' ? '50%' : '8px';
    marker.style.borderColor = style.border;
    marker.style.borderWidth = style.borderWidth || '3px';
    marker.style.borderStyle = style.borderStyle || 'solid';
    marker.style.cursor = editModeEnabled ? 'move' : 'pointer';
    marker.setAttribute('data-user-index', index);
    
    // Create tooltip
    const tooltip = createAnnotationTooltip(ann);
    
    // Add hover events
    // Force a reflow first to ensure DOM is ready
    wrapperEl.offsetHeight;
    addPointAnnotationHoverEvents(wrapperEl, tooltip, ann);
    
    // Add drag functionality
    addUserAnnotationDragListeners(wrapperEl, marker, index);
    
    wrapperEl.appendChild(marker);
    wrapper.appendChild(wrapperEl);
    
    // Store references
    ann._el = wrapperEl;
    ann._tooltip = tooltip;
    ann._index = index;
}

function renderAreaAnnotation(ann, index, style) {
    const wrapperEl = document.createElement('div');
    wrapperEl.className = 'user-annotation-wrapper area-annotation-wrapper';
    wrapperEl.style.position = 'absolute';
    wrapperEl.style.zIndex = '5'; // Lower than standard annotations
    
    const areaElement = document.createElement('div');
    const shape = ann.shape || 'rectangle'; // Use shape from annotation or default to rectangle
    areaElement.className = `area-annotation ${shape}`;
    areaElement.style.background = style.bg;
    areaElement.style.borderColor = style.border;
    areaElement.style.borderWidth = style.borderWidth || '3px';
    areaElement.style.borderStyle = style.borderStyle || 'solid';
    // Use relative size that scales with image
    const bounds = image.getBoundingClientRect();
    const widthRel = ann.widthRel;
    const heightRel = ann.heightRel;
    
    const pixelWidth = widthRel * bounds.width;
    const pixelHeight = heightRel * bounds.height;
    
    areaElement.style.width = `${pixelWidth}px`;
    areaElement.style.height = `${pixelHeight}px`;
    areaElement.style.cursor = editModeEnabled ? 'move' : 'pointer';
    areaElement.setAttribute('data-user-index', index);
    
    if (editModeEnabled) {
        areaElement.classList.add('edit-mode');
        addAreaResizeHandles(areaElement, ann, index);
    }
    
    // Create tooltip
    const tooltip = createAnnotationTooltip(ann);
    
    // Add border-only hover events for area annotations
    // Force a reflow first to ensure DOM is ready
    areaElement.offsetHeight;
    addAreaAnnotationHoverEvents(areaElement, tooltip, ann);
    
    // Add drag functionality for area annotations
    addAreaAnnotationDragListeners(wrapperEl, areaElement, index);
    
    wrapperEl.appendChild(areaElement);
    wrapper.appendChild(wrapperEl);
    
    // Store references
    ann._el = wrapperEl;
    ann._tooltip = tooltip;
    ann._index = index;
}

function createAnnotationTooltip(ann) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip-box user-annotation-tooltip';
    
    // Only add description if it exists and is not empty
    const description = ann.description && ann.description.trim();
    if (description) {
        tooltip.innerHTML = `<b>${escapeHTML(ann.title)}</b><br><br>${processUserDescription(ann.description)}`;
    } else {
        tooltip.innerHTML = `<b>${escapeHTML(ann.title)}</b>`;
    }
    
    tooltip.style.display = 'none';
    tooltip.style.whiteSpace = 'pre-wrap';
    tooltipLayer.appendChild(tooltip);
    return tooltip;
}

function addPointAnnotationHoverEvents(wrapperEl, tooltip, ann) {
    let hideTimeout;
    
    wrapperEl.addEventListener('mouseenter', () => {
        // Don't show tooltips in edit mode
        if (editModeEnabled) return;
        
        clearTimeout(hideTimeout);
        showTooltip(tooltip, ann);
    });

    wrapperEl.addEventListener('mouseleave', () => {
        const delay = (config && config.ui && config.ui.tooltipHideDelay) || 100;
        hideTimeout = setTimeout(() => tooltip.style.display = 'none', delay);
    });

    // Touch support for mobile - show tooltip on tap
    wrapperEl.addEventListener('touchstart', (e) => {
        // Don't show tooltips in edit mode
        if (editModeEnabled) return;
        
        e.preventDefault(); // Prevent mouse events
        clearTimeout(hideTimeout);
        showTooltip(tooltip, ann);
    });

    // Hide tooltip when tapping elsewhere
    document.addEventListener('touchstart', (e) => {
        if (!wrapperEl.contains(e.target) && !tooltip.contains(e.target)) {
            tooltip.style.display = 'none';
            clearTimeout(hideTimeout);
        }
    });

    tooltip.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
    tooltip.addEventListener('mouseleave', () => {
        const delay = (config && config.ui && config.ui.tooltipHideDelay) || 100;
        hideTimeout = setTimeout(() => tooltip.style.display = 'none', delay);
    });
}

function addAreaAnnotationHoverEvents(areaElement, tooltip, ann) {
    let hideTimeout;
    let tooltipPositioned = false;
    
    // Create an inner overlay that blocks hover events in the center
    const centerOverlay = document.createElement('div');
    centerOverlay.className = 'area-center-overlay';
    
    // Style the overlay to cover the inner area (with border spacing)
    const borderWidth = parseInt(getComputedStyle(areaElement).borderWidth) || 3;
    const tolerance = config.areaAnnotationConfig.minHoverDistance || 5;
    const inset = borderWidth + tolerance;
    
    centerOverlay.style.cssText = `
        position: absolute;
        top: ${inset}px;
        left: ${inset}px;
        right: ${inset}px;
        bottom: ${inset}px;
        pointer-events: auto;
        z-index: 1;
        background: transparent;
    `;
    
    // If it's a circle, make the overlay circular too
    if (areaElement.classList.contains('circle')) {
        centerOverlay.style.borderRadius = '50%';
    }
    
    // Add overlay to the area element
    areaElement.appendChild(centerOverlay);
    
    // Show tooltip when hovering the area (but not the center overlay)
    areaElement.addEventListener('mouseenter', (e) => {
        // Don't show tooltips in edit mode
        if (editModeEnabled) return;
        
        // Only show if we're not hovering the center overlay
        if (e.target === centerOverlay) return;
        
        clearTimeout(hideTimeout);
        showTooltipAtMouse(tooltip, ann, e);
        tooltipPositioned = true;
    });
    
    areaElement.addEventListener('mousemove', (e) => {
        // Don't show tooltips in edit mode
        if (editModeEnabled) return;
        
        // Hide tooltip if we move to center overlay
        if (e.target === centerOverlay) {
            tooltipPositioned = false;
            const delay = (config && config.ui && config.ui.tooltipHideDelay) || 100;
            hideTimeout = setTimeout(() => tooltip.style.display = 'none', delay);
            return;
        }
        
        clearTimeout(hideTimeout);
        // Only position if not already positioned
        if (!tooltipPositioned) {
            showTooltipAtMouse(tooltip, ann, e);
            tooltipPositioned = true;
        }
    });
    
    areaElement.addEventListener('mouseleave', () => {
        tooltipPositioned = false;
        const delay = (config && config.ui && config.ui.tooltipHideDelay) || 100;
        hideTimeout = setTimeout(() => tooltip.style.display = 'none', delay);
    });

    tooltip.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
    tooltip.addEventListener('mouseleave', () => {
        tooltipPositioned = false;
        const delay = (config && config.ui && config.ui.tooltipHideDelay) || 100;
        hideTimeout = setTimeout(() => tooltip.style.display = 'none', delay);
    });
}

function showTooltip(tooltip, ann) {
    tooltip.style.display = 'block';
    tooltip.style.minWidth = ((config && config.tooltipMinWidth) || 380) + 'px';

    requestAnimationFrame(() => {
        // Get the actual position of the marker on screen (already correctly positioned!)
        if (!ann._el) return;
        
        const markerRect = ann._el.getBoundingClientRect();
        const markerCenterX = markerRect.left + markerRect.width / 2;
        const markerCenterY = markerRect.top + markerRect.height / 2;
        
        const tipWidth = tooltip.offsetWidth;
        const tipHeight = tooltip.offsetHeight;
        
        // Position tooltip relative to the actual marker position
        let adjustedX = markerCenterX;
        let adjustedY = markerCenterY;

        // Keep tooltip within viewport bounds horizontally
        if (markerCenterX - tipWidth / 2 < 0) {
            adjustedX = tipWidth / 2;
        } else if (markerCenterX + tipWidth / 2 > window.innerWidth) {
            adjustedX = window.innerWidth - tipWidth / 2;
        }

        // Position above or below marker
        const offsetY = (markerCenterY > window.innerHeight / 2) ? -8 - tipHeight : 8;
        adjustedY = markerCenterY + offsetY;
        
        // Keep tooltip within viewport vertically
        if (adjustedY < 0) {
            adjustedY = 8;
        } else if (adjustedY + tipHeight > window.innerHeight) {
            adjustedY = window.innerHeight - tipHeight - 8;
        }

        tooltip.style.left = `${adjustedX}px`;
        tooltip.style.top = `${adjustedY}px`;
    });
}

function showTooltipAtMouse(tooltip, ann, mouseEvent) {
    // Use mouse position directly (already in viewport coordinates)
    const x = mouseEvent.clientX;
    const y = mouseEvent.clientY;

    tooltip.style.display = 'block';
    tooltip.style.minWidth = ((config && config.tooltipMinWidth) || 380) + 'px';

    requestAnimationFrame(() => {
        const tipWidth = tooltip.offsetWidth;
        const tipHeight = tooltip.offsetHeight;
        let adjustedX = x;
        let adjustedY = y;

        // Adjust X position to keep tooltip within viewport
        if (x - tipWidth / 2 < 0) {
            adjustedX = tipWidth / 2;
        } else if (x + tipWidth / 2 > window.innerWidth) {
            adjustedX = window.innerWidth - tipWidth / 2;
        }

        // Position tooltip above or below mouse, with some offset
        const offsetY = (y > window.innerHeight / 2) ? -8 - tipHeight : 8;
        adjustedY = y + offsetY;

        // Make sure tooltip doesn't go outside viewport vertically
        if (adjustedY < 0) {
            adjustedY = 8;
        } else if (adjustedY + tipHeight > window.innerHeight) {
            adjustedY = window.innerHeight - tipHeight - 8;
        }

        tooltip.style.left = `${adjustedX}px`;
        tooltip.style.top = `${adjustedY}px`;
    });
}

function addUserAnnotationDragListeners(wrapperEl, marker, index) {
    let isDragging = false;
    let startX, startY, startLeft, startTop, elementWidth, elementHeight;
    
    const startDrag = (e) => {
        if (e.target !== marker || !editModeEnabled) return;
        
        isDragging = true;
        startX = e.clientX || (e.touches && e.touches[0].clientX);
        startY = e.clientY || (e.touches && e.touches[0].clientY);
        
        // Use same coordinate system as resize (which works)
        startLeft = parseInt(wrapperEl.style.left) || 0;
        startTop = parseInt(wrapperEl.style.top) || 0;
        
        // Store element dimensions before drag starts when they're reliable
        // Try multiple methods to get dimensions since getBoundingClientRect might fail
        const elementRect = wrapperEl.getBoundingClientRect();
        elementWidth = elementRect.width || parseInt(wrapperEl.style.width) || wrapperEl.offsetWidth;
        elementHeight = elementRect.height || parseInt(wrapperEl.style.height) || wrapperEl.offsetHeight;
        
        
        wrapperEl.style.zIndex = '100';
        marker.style.opacity = '0.7';
        
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
        
        // Point annotations are positioned in wrapper coordinates but should stay within image bounds
        const imageBounds = image.getBoundingClientRect();
        const wrapperBounds = wrapper.getBoundingClientRect();
        
        // Use stored element dimensions from startDrag
        
        // Point annotations are centered due to transform: translate(-50%, -50%)
        // So we need to account for the centering offset
        const halfWidth = elementWidth / 2;
        const halfHeight = elementHeight / 2;
        
        // Calculate image position within wrapper (in wrapper coordinates)
        const imageLeftInWrapper = imageBounds.left - wrapperBounds.left;
        const imageTopInWrapper = imageBounds.top - wrapperBounds.top;
        const imageRightInWrapper = imageLeftInWrapper + imageBounds.width;
        const imageBottomInWrapper = imageTopInWrapper + imageBounds.height;
        
        // Constrain to image boundaries (accounting for centering)
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
        wrapperEl.style.zIndex = '15';
        marker.style.opacity = '';
        
        const finalLeft = parseInt(wrapperEl.style.left);
        const finalTop = parseInt(wrapperEl.style.top);
        
        // Calculate new relative position
        const bounds = image.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        const rect = wrapperEl.getBoundingClientRect();
        
        const centerX = rect.left + rect.width / 2 - bounds.left;
        const centerY = rect.top + rect.height / 2 - bounds.top;
        
        const newX = centerX / bounds.width;
        const newY = centerY / bounds.height;
        
        // Validate bounds
        if (newX >= 0 && newX <= 1 && newY >= 0 && newY <= 1) {
            // Update annotation position
            userAnnotations[index].x = newX;
            userAnnotations[index].y = newY;
            encodeUserAnnotationsToURL();
        }
        
        // Re-position to exact coordinates
        scheduleMarkerPositioning();
        
        e.preventDefault();
    };
    
    // Mouse events
    marker.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    // Touch events
    marker.addEventListener('touchstart', startDrag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', endDrag);
}

function addAreaAnnotationDragListeners(wrapperEl, areaElement, index) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    let elementWidth, elementHeight; // Store dimensions
    
    const startDrag = (e) => {
        if (!editModeEnabled || e.target.classList.contains('resize-handle')) return;
        
        isDragging = true;
        startX = e.clientX || (e.touches && e.touches[0].clientX);
        startY = e.clientY || (e.touches && e.touches[0].clientY);
        
        // Use same coordinate system as resize (which works)
        startLeft = parseInt(wrapperEl.style.left) || 0;
        startTop = parseInt(wrapperEl.style.top) || 0;
        
        // Store element dimensions before drag starts when they're reliable
        // Try multiple methods to get dimensions, prioritizing actual CSS dimensions from resize operations
        const childAreaElement = wrapperEl.querySelector('.area-annotation');
        const areaWidth = childAreaElement ? parseInt(childAreaElement.style.width) : 0;
        const areaHeight = childAreaElement ? parseInt(childAreaElement.style.height) : 0;
        
        const elementRect = wrapperEl.getBoundingClientRect();
        elementWidth = areaWidth || elementRect.width || parseInt(wrapperEl.style.width) || wrapperEl.offsetWidth;
        elementHeight = areaHeight || elementRect.height || parseInt(wrapperEl.style.height) || wrapperEl.offsetHeight;
        
        const imageBounds = image.getBoundingClientRect();
        const wrapperBounds = wrapper.getBoundingClientRect();
        const imageLeftInWrapper = imageBounds.left - wrapperBounds.left;
        const imageRightInWrapper = imageLeftInWrapper + imageBounds.width;
        
        
        wrapperEl.style.zIndex = '100';
        areaElement.style.opacity = '0.7';
        
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
        
        // Elements are positioned in wrapper coordinates, but need to stay within image bounds
        const imageBounds = image.getBoundingClientRect();
        const wrapperBounds = wrapper.getBoundingClientRect();
        
        // Use stored element dimensions from startDrag
        
        // Calculate image position within wrapper (in wrapper coordinates)
        const imageLeftInWrapper = imageBounds.left - wrapperBounds.left;
        const imageTopInWrapper = imageBounds.top - wrapperBounds.top;
        const imageRightInWrapper = imageLeftInWrapper + imageBounds.width;
        const imageBottomInWrapper = imageTopInWrapper + imageBounds.height;
        
        // Constrain element to stay within image bounds (using wrapper coordinates)
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
        wrapperEl.style.zIndex = '5';
        areaElement.style.opacity = '';
        
        const finalLeft = parseInt(wrapperEl.style.left);
        const finalTop = parseInt(wrapperEl.style.top);
        
        // Calculate max allowed position for debug
        const imageBounds = image.getBoundingClientRect();
        const wrapperBounds = wrapper.getBoundingClientRect();
        const imageLeftInWrapper = imageBounds.left - wrapperBounds.left;
        const imageRightInWrapper = imageLeftInWrapper + imageBounds.width;
        const maxAllowedLeft = imageRightInWrapper - wrapperEl.offsetWidth;
        
        
        // Calculate new relative position
        const bounds = image.getBoundingClientRect();
        const rect = wrapperEl.getBoundingClientRect();
        
        const newX = (rect.left - bounds.left) / bounds.width;
        const newY = (rect.top - bounds.top) / bounds.height;
        
        // Validate bounds
        if (newX >= 0 && newX <= 1 && newY >= 0 && newY <= 1) {
            // Update annotation position
            userAnnotations[index].x = newX;
            userAnnotations[index].y = newY;
            encodeUserAnnotationsToURL();
        }
        
        // Re-position to exact coordinates
        scheduleMarkerPositioning();
        
        e.preventDefault();
    };
    
    // Mouse events
    areaElement.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    // Touch events
    areaElement.addEventListener('touchstart', startDrag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', endDrag);
}

function addAreaResizeHandles(areaElement, ann, index) {
    const handles = ['nw', 'ne', 'sw', 'se'];
    const style = config.userAnnotationTypes[ann.type];
    
    handles.forEach(position => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${position}`;
        handle.style.borderColor = style.border;
        
        addResizeHandleListeners(handle, areaElement, ann, index, position);
        areaElement.appendChild(handle);
    });
}

function addResizeHandleListeners(handle, areaElement, ann, index, position) {
    let isResizing = false;
    let startX, startY, startWidth, startHeight, startLeft, startTop;
    
    const startResize = (e) => {
        isResizing = true;
        startX = e.clientX || (e.touches && e.touches[0].clientX);
        startY = e.clientY || (e.touches && e.touches[0].clientY);
        startWidth = parseInt(areaElement.style.width);
        startHeight = parseInt(areaElement.style.height);
        
        // Store initial position for west/north handles
        const wrapperEl = areaElement.parentElement;
        startLeft = parseInt(wrapperEl.style.left) || 0;
        startTop = parseInt(wrapperEl.style.top) || 0;
        
        e.preventDefault();
        e.stopPropagation();
    };
    
    const resize = (e) => {
        if (!isResizing) return;
        
        const currentX = e.clientX || (e.touches && e.touches[0].clientX);
        const currentY = e.clientY || (e.touches && e.touches[0].clientY);
        
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        
        const style = config.userAnnotationTypes[ann.type];
        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;
        
        // Calculate new dimensions and positions based on handle position
        if (position.includes('e')) {
            // East: drag right increases width
            newWidth = startWidth + deltaX;
        }
        if (position.includes('w')) {
            // West: drag left increases width and moves element right
            newWidth = startWidth - deltaX;
            newLeft = startLeft + deltaX;
        }
        if (position.includes('s')) {
            // South: drag down increases height
            newHeight = startHeight + deltaY;
        }
        if (position.includes('n')) {
            // North: drag up increases height and moves element down
            newHeight = startHeight - deltaY;
            newTop = startTop + deltaY;
        }
        
        // Get image bounds for boundary constraints (area annotations are positioned relative to image)
        const imageBounds = image.getBoundingClientRect();
        const wrapperBounds = wrapper.getBoundingClientRect();
        const maxScreenWidth = imageBounds.width * 0.8;
        const maxScreenHeight = imageBounds.height * 0.8;
        
        const effectiveMaxWidth = Math.min(style.maxSize.width, maxScreenWidth);
        const effectiveMaxHeight = Math.min(style.maxSize.height, maxScreenHeight);
        
        // Apply size constraints
        let constrainedWidth = Math.max(style.minSize.width, Math.min(effectiveMaxWidth, newWidth));
        let constrainedHeight = Math.max(style.minSize.height, Math.min(effectiveMaxHeight, newHeight));
        
        // Calculate image boundaries relative to wrapper
        const imageLeft = imageBounds.left - wrapperBounds.left;
        const imageTop = imageBounds.top - wrapperBounds.top;
        const imageRight = imageLeft + imageBounds.width;
        const imageBottom = imageTop + imageBounds.height;
        
        // Apply boundary constraints - ensure element doesn't go outside image bounds
        // For east/south expansion, limit by remaining space within image
        if (position.includes('e')) {
            const maxWidthFromPosition = imageRight - startLeft;
            constrainedWidth = Math.min(constrainedWidth, maxWidthFromPosition);
        }
        if (position.includes('s')) {
            const maxHeightFromPosition = imageBottom - startTop;
            constrainedHeight = Math.min(constrainedHeight, maxHeightFromPosition);
        }
        
        // For west/north expansion, limit by current position within image
        if (position.includes('w')) {
            const maxWidthFromLeft = startLeft - imageLeft + startWidth;
            constrainedWidth = Math.min(constrainedWidth, maxWidthFromLeft);
            newLeft = Math.max(imageLeft, startLeft + (startWidth - constrainedWidth));
        }
        if (position.includes('n')) {
            const maxHeightFromTop = startTop - imageTop + startHeight;
            constrainedHeight = Math.min(constrainedHeight, maxHeightFromTop);
            newTop = Math.max(imageTop, startTop + (startHeight - constrainedHeight));
        }
        
        // Final boundary check for position within image bounds
        newLeft = Math.max(imageLeft, Math.min(newLeft, imageRight - constrainedWidth));
        newTop = Math.max(imageTop, Math.min(newTop, imageBottom - constrainedHeight));
        
        // Apply new size and position
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
        
        // Update annotation size as relative coordinates
        const imageBounds = image.getBoundingClientRect();
        const pixelWidth = parseInt(areaElement.style.width);
        const pixelHeight = parseInt(areaElement.style.height);
        
        userAnnotations[index].widthRel = pixelWidth / imageBounds.width;
        userAnnotations[index].heightRel = pixelHeight / imageBounds.height;
        
        // Update position in relative coordinates
        const wrapperEl = areaElement.parentElement;
        const bounds = image.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        const rect = wrapperEl.getBoundingClientRect();
        
        const newX = (rect.left - bounds.left) / bounds.width;
        const newY = (rect.top - bounds.top) / bounds.height;
        
        // Validate bounds and update
        if (newX >= 0 && newX <= 1 && newY >= 0 && newY <= 1) {
            userAnnotations[index].x = newX;
            userAnnotations[index].y = newY;
        }
        
        encodeUserAnnotationsToURL();
        
        e.preventDefault();
    };
    
    // Mouse events
    handle.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', endResize);
    
    // Touch events
    handle.addEventListener('touchstart', startResize);
    document.addEventListener('touchmove', resize);
    document.addEventListener('touchend', endResize);
}

// Initialize user annotations when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeUserAnnotations();
    if (userAnnotations.length > 0) {
        // Re-render with user annotations after initial load
        setTimeout(() => {
            renderAllMarkers();
        }, 100);
    }
});

// Handle window resize for area annotations
window.addEventListener('resize', () => {
    // Re-position all markers on window resize
    scheduleMarkerPositioning();
});