const ZOOM_MIN = 1;
const ZOOM_MAX = 4; // token portraits pixelate past 4x
const ZOOM_STEP = 1.25;
const PAN_STEP = 24;
const WHEEL_RATE = 0.0015;
const WHEEL_LINE_PX = 16;
const WHEEL_PAGE_PX = 100;
const IDLE_MS = 200;
const PLATE_KEYS = ['+', '=', '-', '_', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
function clampOffset(value, limit) {
    return Math.clamp(value, -limit, limit);
}
// Line and page wheels report smaller deltas than pixel wheels
function toWheelPixels({ deltaY, deltaMode }) {
    if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
        return deltaY * WHEEL_LINE_PX;
    }
    return deltaMode === WheelEvent.DOM_DELTA_PAGE ? deltaY * WHEEL_PAGE_PX : deltaY;
}
class PortraitPlate {
    plate;
    image;
    reset;
    scale = ZOOM_MIN;
    x = 0;
    y = 0;
    grab = null;
    idle = 0;
    constructor(plate, image, reset) {
        this.plate = plate;
        this.image = image;
        this.reset = reset;
    }
    draw() {
        const { width, height } = this.plate.getBoundingClientRect();
        const { naturalWidth, naturalHeight } = this.image;
        // object-fit: contain can draw the image narrower than the plate
        const fit = naturalWidth && naturalHeight ? Math.min(width / naturalWidth, height / naturalHeight) : 0;
        const drawnWidth = (fit ? naturalWidth * fit : width) * this.scale;
        const drawnHeight = (fit ? naturalHeight * fit : height) * this.scale;
        const isZoomed = this.scale > ZOOM_MIN;
        this.x = clampOffset(this.x, Math.max(0, (drawnWidth - width) / 2));
        this.y = clampOffset(this.y, Math.max(0, (drawnHeight - height) / 2));
        this.image.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.scale})`;
        this.plate.classList.toggle('is-zoomed', isZoomed);
        if (this.reset) {
            this.reset.hidden = !isZoomed;
        }
    }
    // will-change holds a compositor layer while it's set
    markInteracting() {
        this.plate.classList.add('is-interacting');
        window.clearTimeout(this.idle);
        this.idle = window.setTimeout(() => this.plate.classList.remove('is-interacting'), IDLE_MS);
    }
    resetView() {
        this.scale = ZOOM_MIN;
        this.x = 0;
        this.y = 0;
        this.draw();
    }
    // Offsets are from the centre, the transform-origin
    zoomTo(next, originX = 0, originY = 0) {
        const scale = Math.clamp(next, ZOOM_MIN, ZOOM_MAX);
        if (scale === this.scale) {
            return;
        }
        this.x = scale === ZOOM_MIN ? 0 : originX - (originX - this.x) / this.scale * scale;
        this.y = scale === ZOOM_MIN ? 0 : originY - (originY - this.y) / this.scale * scale;
        this.scale = scale;
        this.markInteracting();
        this.draw();
    }
    onWheel = (event) => {
        const box = this.plate.getBoundingClientRect();
        event.preventDefault();
        this.zoomTo(this.scale * Math.exp(-toWheelPixels(event) * WHEEL_RATE), event.clientX - (box.left + box.width / 2), event.clientY - (box.top + box.height / 2));
    };
    onPointerDown = (event) => {
        // At ZOOM_MIN the image fits the plate
        if (event.button !== 0 || this.scale === ZOOM_MIN) {
            return;
        }
        event.preventDefault();
        this.grab = {
            x: event.clientX,
            y: event.clientY,
            viewX: this.x,
            viewY: this.y
        };
        this.plate.setPointerCapture(event.pointerId);
        this.plate.classList.add('is-dragging');
    };
    onPointerMove = (event) => {
        if (!this.grab) {
            return;
        }
        this.x = this.grab.viewX + event.clientX - this.grab.x;
        this.y = this.grab.viewY + event.clientY - this.grab.y;
        this.markInteracting();
        this.draw();
    };
    onPointerUp = (event) => {
        if (!this.grab) {
            return;
        }
        this.grab = null;
        this.plate.classList.remove('is-dragging');
        if (this.plate.hasPointerCapture(event.pointerId)) {
            this.plate.releasePointerCapture(event.pointerId);
        }
    };
    onDoubleClick = (event) => {
        event.preventDefault();
        this.resetView();
    };
    onResetClick = (event) => {
        event.preventDefault();
        this.resetView();
        // Hiding the reset button drops its focus
        this.plate.focus();
    };
    onKeyDown = (event) => {
        if (!PLATE_KEYS.includes(event.key)) {
            return;
        }
        Grimmtale.consumeKey(event);
        this.stepByKey(event.key);
        this.markInteracting();
        this.draw();
    };
    stepByKey(key) {
        switch (key) {
            case '+':
            case '=':
                this.zoomTo(this.scale * ZOOM_STEP);
                break;
            case '-':
            case '_':
                this.zoomTo(this.scale / ZOOM_STEP);
                break;
            // The image moves opposite to the arrow
            case 'ArrowLeft':
                this.x += PAN_STEP;
                break;
            case 'ArrowRight':
                this.x -= PAN_STEP;
                break;
            case 'ArrowUp':
                this.y += PAN_STEP;
                break;
            case 'ArrowDown':
                this.y -= PAN_STEP;
                break;
        }
    }
}
// Each render rebuilds the plate and resets the view
export function bindPlate(root) {
    const plate = root.querySelector('.gs-interactable-actors-plate');
    const image = plate?.querySelector('.gs-interactable-actors-portrait');
    if (!plate || !image) {
        return;
    }
    const reset = root.querySelector('.gs-interactable-actors-plate-reset');
    const view = new PortraitPlate(plate, image, reset);
    plate.addEventListener('wheel', view.onWheel, { passive: false });
    plate.addEventListener('pointerdown', view.onPointerDown);
    plate.addEventListener('pointermove', view.onPointerMove);
    plate.addEventListener('pointerup', view.onPointerUp);
    plate.addEventListener('pointercancel', view.onPointerUp);
    plate.addEventListener('dblclick', view.onDoubleClick);
    plate.addEventListener('keydown', view.onKeyDown);
    view.reset?.addEventListener('click', view.onResetClick);
    view.draw();
    // The clamp needs the image's natural size
    if (!image.complete) {
        image.addEventListener('load', () => view.draw(), { once: true });
    }
}
