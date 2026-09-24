const NAVIGATION_KEYS = [
    'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' ', 'Escape'
];
// :focus-visible also matches focus() calls from scripts
export function trackInputMode(root) {
    root.dataset.input = 'pointer';
    root.addEventListener('pointerdown', () => {
        root.dataset.input = 'pointer';
    }, true);
    root.addEventListener('keydown', (event) => {
        if (NAVIGATION_KEYS.includes(event.key)) {
            root.dataset.input = 'keyboard';
        }
    }, true);
}
