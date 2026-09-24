interface Grab {
    x: number;
    y: number;
    viewX: number;
    viewY: number;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 4; // token portraits pixelate past 4x
const ZOOM_STEP = 1.25;
const PAN_STEP = 24;
const WHEEL_RATE = 0.0015;
const WHEEL_LINE_PX = 16;
const WHEEL_PAGE_PX = 100;
const IDLE_MS = 200;

function clampOffset(value: number, limit: number): number {
    return Math.min(limit, Math.max(-limit, value));
}

// Line and page wheels report smaller deltas than pixel wheels
function toWheelPixels({ deltaY, deltaMode }: WheelEvent): number {
    if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
        return deltaY * WHEEL_LINE_PX;
    }

    return deltaMode === WheelEvent.DOM_DELTA_PAGE ? deltaY * WHEEL_PAGE_PX : deltaY;
}

class PortraitPlate {
    scale = ZOOM_MIN;
    x = 0;
    y = 0;
    grab: Grab | null = null;
    idle = 0;

    constructor(readonly plate: HTMLElement, readonly image: HTMLImageElement, readonly reset: HTMLElement | null) {}

    draw(): void {
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
    markWorking(): void {
        this.plate.classList.add('is-interacting');
        window.clearTimeout(this.idle);
        this.idle = window.setTimeout(() => this.plate.classList.remove('is-interacting'), IDLE_MS);
    }

    goHome(): void {
        this.scale = ZOOM_MIN;
        this.x = 0;
        this.y = 0;
        this.draw();
    }

    // Offsets are from the centre, the transform-origin
    zoomTo(next: number, originX = 0, originY = 0): void {
        const scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));

        if (scale === this.scale) {
            return;
        }

        this.x = scale === ZOOM_MIN ? 0 : originX - (originX - this.x) / this.scale * scale;
        this.y = scale === ZOOM_MIN ? 0 : originY - (originY - this.y) / this.scale * scale;
        this.scale = scale;
        this.markWorking();
        this.draw();
    }

    onWheel = (event: WheelEvent): void => {
        const box = this.plate.getBoundingClientRect();

        event.preventDefault();
        this.zoomTo(
            this.scale * Math.exp(-toWheelPixels(event) * WHEEL_RATE),
            event.clientX - (box.left + box.width / 2),
            event.clientY - (box.top + box.height / 2)
        );
    };

    onPointerDown = (event: PointerEvent): void => {

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

    onPointerMove = (event: PointerEvent): void => {
        if (!this.grab) {
            return;
        }

        this.x = this.grab.viewX + event.clientX - this.grab.x;
        this.y = this.grab.viewY + event.clientY - this.grab.y;
        this.markWorking();
        this.draw();
    };

    onPointerUp = (event: PointerEvent): void => {
        if (!this.grab) {
            return;
        }

        this.grab = null;
        this.plate.classList.remove('is-dragging');

        if (this.plate.hasPointerCapture(event.pointerId)) {
            this.plate.releasePointerCapture(event.pointerId);
        }
    };

    onDoubleClick = (event: MouseEvent): void => {
        event.preventDefault();
        this.goHome();
    };

    onResetClick = (event: MouseEvent): void => {
        event.preventDefault();
        this.goHome();

        // Hiding the reset button drops its focus
        this.plate.focus();
    };

    // Core pans the canvas with the arrow keys
    onKeyDown = (event: KeyboardEvent): void => {
        if (!this.stepByKey(event.key)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.markWorking();
        this.draw();
    };

    stepByKey(key: string): boolean {
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
            default:
                return false;
        }

        return true;
    }
}

// Each render rebuilds the plate and resets the view
export function bindPlate(root: HTMLElement): void {
    const plate = root.querySelector<HTMLElement>('.gs-interactable-actors-plate');
    const image = plate?.querySelector<HTMLImageElement>('.gs-interactable-actors-portrait');

    if (!plate || !image) {
        return;
    }

    const reset = root.querySelector<HTMLElement>('.gs-interactable-actors-plate-reset');
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
