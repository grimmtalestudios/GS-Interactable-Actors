import { INSPECT_ICON, MODULE_ID } from './constants.js';
import { trackInputMode } from './inputMode.js';
import { openInspect } from './inspect.js';
import { getKnownName } from './reveal.js';
import { isContextMenuEnabled } from './settings.js';
// QoL and Spectator call the hook by its old name
const MENU_HOOKS = ['Interactable-Actors.contextMenuItems', `${MODULE_ID}.contextMenuItems`];
const TARGET_ICON = 'fa-solid fa-bullseye';
const DRAG_TOLERANCE = 6;
const EDGE_GAP = 4;
const MENU_KEYS = ['Escape', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
const PRESS_KEYS = [' ', 'Enter'];
const theme = Grimmtale.createTheme(MODULE_ID);
let menu = null;
let menuToken = null;
let focusBefore = null;
let rightDownAt = null;
function localize(key) {
    return game.i18n.localize(`${MODULE_ID}.menu.${key}`);
}
// QoL's token menu replaces this one when enabled
function isTokenMenuActive() {
    return Grimmtale.callPeer('GS-Quality-of-Life', 'tokenMenuActive', [], false) === true;
}
function getTokenAt(event) {
    const point = canvas.canvasCoordinatesFromClient({
        x: event.clientX,
        y: event.clientY
    });
    // Token#visible covers vision, fog and hidden tokens
    const hits = canvas.tokens.placeables.filter((token) => token.visible && token.bounds.contains(point.x, point.y));
    hits.sort((a, b) => a.document.sort - b.document.sort || a.document.elevation - b.document.elevation);
    return hits.at(-1) ?? null;
}
// Ending a right-drag pan fires contextmenu too
function wasDragged(event) {
    const moved = rightDownAt ? Math.hypot(event.clientX - rightDownAt.x, event.clientY - rightDownAt.y) : 0;
    rightDownAt = null;
    return moved > DRAG_TOLERANCE;
}
function getItems() {
    return menu ? [...menu.querySelectorAll('.gs-interactable-actors-menu-item')] : [];
}
// The GM can reveal the name while the menu is open
function refreshMenuName() {
    const header = menu?.querySelector('.gs-interactable-actors-menu-name');
    if (header && menuToken) {
        header.textContent = getKnownName(menuToken.actor, menuToken.document);
    }
}
function onDismissPress(event) {
    if (menu && !menu.contains(event.target)) {
        closeMenu();
    }
}
function getNextIndex(key, index, count) {
    switch (key) {
        case 'ArrowDown':
            return index < 0 ? 0 : (index + 1) % count;
        case 'ArrowUp':
            return index < 0 ? count - 1 : (index - 1 + count) % count;
        case 'Home':
            return 0;
        case 'End':
            return count - 1;
        default:
            return null;
    }
}
// Ignore Enter and Space when no row has focus
function isMenuKey(key, index) {
    return MENU_KEYS.includes(key) || (PRESS_KEYS.includes(key) && index >= 0);
}
function applyMenuKey(key, items, index) {
    const next = getNextIndex(key, index, items.length);
    if (key === 'Escape') {
        closeMenu();
    }
    else if (next === null) {
        items[index].click();
    }
    else {
        items[next].focus();
    }
}
function onMenuKey(event) {
    const items = getItems();
    const index = items.indexOf(document.activeElement);
    if (!menu) {
        return;
    }
    // This window listener runs before the menu's input tracking
    menu.dataset.input = 'keyboard';
    // Tab closes the menu and lets focus move on
    if (event.key === 'Tab') {
        closeMenu();
    }
    else if (isMenuKey(event.key, index)) {
        // Core pans the canvas with the arrow keys
        event.preventDefault();
        event.stopPropagation();
        applyMenuKey(event.key, items, index);
    }
}
function createMenuRow(item) {
    const row = document.createElement('li');
    const button = document.createElement('button');
    const icon = document.createElement('i');
    const label = document.createElement('span');
    row.setAttribute('role', 'none');
    button.type = 'button';
    button.tabIndex = -1; // rows are reached with the arrow keys, not Tab
    button.className = 'gs-interactable-actors-menu-item';
    button.setAttribute('role', 'menuitem');
    icon.className = item.icon;
    icon.inert = true;
    label.textContent = item.label;
    button.append(icon, label);
    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        item.onClick?.();
    });
    row.append(button);
    return row;
}
function createMenu(token, items) {
    const root = document.createElement('div');
    const header = document.createElement('header');
    const list = document.createElement('ol');
    root.className = 'gs-overlay gs-interactable-actors-menu';
    header.className = 'gs-interactable-actors-menu-name';
    header.textContent = getKnownName(token.actor, token.document);
    list.setAttribute('role', 'menu');
    list.append(...items.map(createMenuRow));
    root.append(header, list);
    theme.applyTo(root);
    trackInputMode(root);
    return root;
}
// Measure after insertion, when the content has a size
function placeMenu(root, x, y) {
    const { width, height } = root.getBoundingClientRect();
    root.style.left = `${Math.min(x, window.innerWidth - width - EDGE_GAP)}px`;
    root.style.top = `${Math.min(y, window.innerHeight - height - EDGE_GAP)}px`;
}
function openMenu(token, x, y) {
    const items = [];
    // Our rows are added through the hooks like everyone's
    for (const hook of MENU_HOOKS) {
        Hooks.callAll(hook, token, items);
    }
    items.sort((a, b) => (a.sort ?? 100) - (b.sort ?? 100));
    menu = createMenu(token, items);
    menuToken = token;
    focusBefore = document.activeElement;
    document.body.append(menu);
    placeMenu(menu, x, y);
    getItems()[0]?.focus();
    window.addEventListener('pointerdown', onDismissPress, true);
    window.addEventListener('keydown', onMenuKey, true);
}
function closeMenu() {
    const isFocusInside = menu?.contains(document.activeElement) ?? false;
    const back = focusBefore;
    if (!menu) {
        return;
    }
    menu.remove();
    menu = null;
    menuToken = null;
    focusBefore = null;
    window.removeEventListener('pointerdown', onDismissPress, true);
    window.removeEventListener('keydown', onMenuKey, true);
    // Restore focus so core's canvas keys keep working
    if (isFocusInside && back instanceof HTMLElement && back.isConnected && back !== document.body) {
        back.focus();
    }
}
function onBoardPointerDown(event) {
    if (event.button === 2) {
        rightDownAt = {
            x: event.clientX,
            y: event.clientY
        };
    }
}
function onBoardContextMenu(event) {
    const isOurs = isContextMenuEnabled() && !isTokenMenuActive() && !wasDragged(event);
    const token = isOurs ? getTokenAt(event) : null;
    closeMenu();
    // Owners get the token HUD on right-click
    if (!token || token.document.isOwner) {
        return;
    }
    event.preventDefault();
    openMenu(token, event.clientX, event.clientY);
}
function bindBoard() {
    const board = document.getElementById('board');
    // canvasReady fires on every scene change
    if (!board || board.dataset.interactableActorsBound) {
        return;
    }
    board.dataset.interactableActorsBound = '1';
    board.addEventListener('pointerdown', onBoardPointerDown, true);
    board.addEventListener('contextmenu', onBoardContextMenu);
}
function addMenuRows(token, items) {
    // Both hooks fire for one menu
    if (items.some((item) => item.action === 'inspect')) {
        return;
    }
    items.push({
        action: 'inspect',
        sort: 20,
        icon: INSPECT_ICON,
        label: localize('inspect'),
        onClick: () => void openInspect(token.actor, token.document)
    }, {
        action: 'target',
        sort: 30,
        icon: TARGET_ICON,
        label: localize(token.isTargeted ? 'untarget' : 'target'),
        onClick: () => token.setTarget(!token.isTargeted, { releaseOthers: false })
    });
}
export function registerContextMenu() {
    Hooks.on('canvasReady', bindBoard);
    Hooks.on('canvasPan', closeMenu);
    Hooks.on('updateActor', refreshMenuName);
    Hooks.on('updateToken', refreshMenuName);
    for (const hook of MENU_HOOKS) {
        Hooks.on(hook, addMenuRows);
    }
}
