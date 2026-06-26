/**
 * UIHelpers — HTML overlay helpers for crosshair, HUD anchoring, etc.
 */

/**
 * Create a crosshair overlay element anchored at center screen.
 */
export function createCrosshair(options?: {
    size?: number;
    color?: string;
    thickness?: number;
}): HTMLDivElement {
    const size = options?.size ?? 20;
    const color = options?.color ?? '#ffffff';
    const thickness = options?.thickness ?? 2;

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '9999';

    // Horizontal line
    const h = document.createElement('div');
    h.style.position = 'absolute';
    h.style.width = `${size}px`;
    h.style.height = `${thickness}px`;
    h.style.background = color;
    h.style.top = '50%';
    h.style.left = '50%';
    h.style.transform = 'translate(-50%, -50%)';
    container.appendChild(h);

    // Vertical line
    const v = document.createElement('div');
    v.style.position = 'absolute';
    v.style.width = `${thickness}px`;
    v.style.height = `${size}px`;
    v.style.background = color;
    v.style.top = '50%';
    v.style.left = '50%';
    v.style.transform = 'translate(-50%, -50%)';
    container.appendChild(v);

    return container;
}

/**
 * Anchor a HUD element to a specific screen corner.
 */
export function anchorHUD(
    element: HTMLElement,
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
    padding = 16
): void {
    element.style.position = 'fixed';
    element.style.zIndex = '9998';
    element.style.pointerEvents = 'none';

    switch (position) {
        case 'top-left':
            element.style.top = `${padding}px`;
            element.style.left = `${padding}px`;
            break;
        case 'top-right':
            element.style.top = `${padding}px`;
            element.style.right = `${padding}px`;
            break;
        case 'bottom-left':
            element.style.bottom = `${padding}px`;
            element.style.left = `${padding}px`;
            break;
        case 'bottom-right':
            element.style.bottom = `${padding}px`;
            element.style.right = `${padding}px`;
            break;
    }
}
