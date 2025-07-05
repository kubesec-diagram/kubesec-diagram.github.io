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
            clearTimeout(hideTimeout);
            const bounds = image.getBoundingClientRect();
            const x = ann.x * bounds.width;
            const y = ann.y * bounds.height;

            tooltip.style.display = 'block';
            tooltip.style.minWidth = ((config && config.tooltipMinWidth) || 380) + 'px';

            requestAnimationFrame(() => {
                const tipWidth = tooltip.offsetWidth;
                let adjustedX = x;

                if (x - tipWidth / 2 < 0) {
                    adjustedX = tipWidth / 2;
                } else if (x + tipWidth / 2 > bounds.width) {
                    adjustedX = bounds.width - tipWidth / 2;
                }

                const offsetY = (y > bounds.height / 2) ? -8 - tooltip.offsetHeight : 8;
                tooltip.style.left = `${adjustedX}px`;
                tooltip.style.top = `${y + offsetY}px`;
            });
        });

        wrapperEl.addEventListener('mouseleave', () => {
            const delay = (config && config.ui && config.ui.tooltipHideDelay) || 100;
            hideTimeout = setTimeout(() => tooltip.style.display = 'none', delay);
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

    positionMarkers();
}

function getCachedBounds() {
    const now = performance.now();
    const cacheDuration = (config && config.boundsCacheDuration) || 16;
    if (!cachedBounds || (now - lastBoundsUpdate) > cacheDuration) {
        cachedBounds = image.getBoundingClientRect();
        lastBoundsUpdate = now;
    }
    return cachedBounds;
}

function positionMarkers() {
    const bounds = getCachedBounds();
    const scale = (config && config.markerScale) || 0.01;

    annotations.forEach(ann => {
        if (!ann._el) return;

        const factor = ann.size === 'small' ? 0.5 : 1.0;
        const size = bounds.width * scale * factor;

        const wrapperEl = ann._el;
        const marker = wrapperEl.querySelector('.marker');

        const left = ann.x * bounds.width * xMultiplier;
        const top = ann.y * bounds.height * yMultiplier;

        wrapperEl.style.left = `${left}px`;
        wrapperEl.style.top = `${top}px`;

        marker.style.width = `${size}px`;
        marker.style.height = `${size}px`;
        marker.style.fontSize = `${size * 0.5}px`;
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

    positionMarkers();
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

    positionMarkers();
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
        renderMarkers();
        positionMarkers();

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
        // Clear cached bounds on resize
        cachedBounds = null;
        positionMarkers();
    } catch (error) {
        console.error('Error during resize handling:', error);
    }
}


window.addEventListener('resize', handleResize);


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
            positionMarkers();
        });
    }

    if (yInput) {
        yInput.addEventListener('input', () => {
            yMultiplier = parseFloat(yInput.value) || 1;
            positionMarkers();
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