import { INSPECT_ICON, MODULE_ID } from './constants.js';
import { openInspect } from './inspect.js';
// Owners get the HUD on right-click, not our menu
export function addHudButton(hud, html) {
    const token = hud.object;
    const label = game.i18n.localize(`${MODULE_ID}.menu.inspect`);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'control-icon gs-interactable-actors-hud-inspect';
    button.dataset.tooltip = label;
    button.ariaLabel = label;
    button.innerHTML = `<i class="${INSPECT_ICON}" inert></i>`;
    button.addEventListener('click', (event) => {
        event.preventDefault();
        void openInspect(token.actor, token.document);
    });
    html.querySelector('.col.right')?.append(button);
}
