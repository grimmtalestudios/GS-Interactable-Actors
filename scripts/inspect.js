import { INSPECT_ICON, MODULE_ID } from './constants.js';
import { trackInputMode } from './inputMode.js';
import { canCurate, getKnownName, isRevealed, NAME_KEY, setRevealed } from './reveal.js';
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const theme = Grimmtale.createTheme(MODULE_ID);
const windows = new Map();
function getToggleLabel(isShown) {
    return game.i18n.localize(`${MODULE_ID}.inspect.${isShown ? 'hideEntry' : 'revealEntry'}`);
}
// Disable while saving so a second click doesn't undo the first
function markPending(button) {
    button.setAttribute('aria-busy', 'true');
    button.toggleAttribute('disabled', true);
}
function dropBrokenVeil(veil) {
    if (veil.complete && veil.naturalWidth === 0) {
        veil.remove();
    }
    else {
        veil.addEventListener('error', () => veil.remove(), { once: true });
    }
}
class InspectWindow extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: `${MODULE_ID}-inspect-{id}`,
        tag: 'div',
        classes: ['gs-shared-base', 'gs-interactable-actors-app', 'gs-interactable-actors-inspect'],
        window: {
            title: `${MODULE_ID}.inspect.title`,
            icon: INSPECT_ICON,
            resizable: true
        },
        position: {
            width: 880, // two 440px halves: the portrait and what is known
            height: 'auto'
        },
        actions: {
            toggleReveal: InspectWindow.onToggleReveal
        }
    };
    static PARTS = {
        body: {
            template: `modules/${MODULE_ID}/templates/inspect.hbs`,
            scrollable: ['.gs-scroll']
        }
    };
    actor;
    tokenDoc;
    pendingKeys = new Set();
    constructor(actor, tokenDoc) {
        super();
        this.actor = actor;
        this.tokenDoc = tokenDoc;
    }
    get title() {
        return game.i18n.format(`${MODULE_ID}.inspect.windowTitle`, { name: getKnownName(this.actor, this.tokenDoc) });
    }
    // Core sets the title on the first render only
    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        options.window = {
            ...options.window,
            title: this.title
        };
    }
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const isCurator = canCurate(this.actor);
        const isNameShown = isRevealed(this.actor, 'personal', NAME_KEY);
        return {
            ...context,
            isCurator,
            name: getKnownName(this.actor, this.tokenDoc),
            isNameShown,
            nameToggleLabel: getToggleLabel(isNameShown),
            portrait: this.actor.img,
            isEmpty: !isCurator,
            ...Grimmtale.footerContext(MODULE_ID)
        };
    }
    // Core keeps the frame across renders
    _onFirstRender(context, options) {
        super._onFirstRender(context, options);
        theme.apply(this);
        trackInputMode(this.element);
        Grimmtale.quietCloseButton(this.element);
    }
    _onRender(context, options) {
        super._onRender(context, options);
        const veil = this.element.querySelector('.gs-interactable-actors-veil');
        if (veil) {
            dropBrokenVeil(veil);
        }
        for (const eye of this.element.querySelectorAll('[data-action="toggleReveal"]')) {
            if (this.pendingKeys.has(`${eye.dataset.category}:${eye.dataset.key}`)) {
                markPending(eye);
            }
        }
    }
    static async onToggleReveal(_event, target) {
        const { category = '', key = '' } = target.dataset;
        const pendingKey = `${category}:${key}`;
        // Ownership can change after the render
        if (!canCurate(this.actor) || this.pendingKeys.has(pendingKey)) {
            return;
        }
        this.pendingKeys.add(pendingKey);
        markPending(target);
        try {
            await setRevealed(this.actor, category, key, !isRevealed(this.actor, category, key));
        }
        finally {
            this.pendingKeys.delete(pendingKey);
            void this.render();
        }
    }
    _onClose(options) {
        super._onClose(options);
        windows.delete(this.actor.uuid);
    }
}
export async function openInspect(actor, tokenDoc = null) {
    if (!actor) {
        return null;
    }
    // Inspecting the same creature again brings its window forward
    const inspect = windows.get(actor.uuid) ?? new InspectWindow(actor, tokenDoc);
    inspect.tokenDoc = tokenDoc ?? inspect.tokenDoc;
    windows.set(actor.uuid, inspect);
    return inspect.render({ force: true });
}
