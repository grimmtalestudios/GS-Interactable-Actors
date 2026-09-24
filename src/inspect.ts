import { getAbilityGroups } from './abilities.js';
import { FLAGS, INSPECT_ICON, MODULE_ID } from './constants.js';
import { getDefenceSections } from './defences.js';
import { trackInputMode } from './inputMode.js';
import { getFoldLabel } from './itemRows.js';
import { bindPlate } from './portraitPlate.js';
import { getProficiencyGroups } from './proficiencies.js';
import {
    canCurate,
    getKnownName,
    getRevealed,
    getRevealStore,
    getToggleLabel,
    isRevealed,
    NAME_KEY,
    setRevealed
} from './reveal.js';
import { getScoreTiles } from './scores.js';
import { getSpellGroups } from './spells.js';
import { getStatRows } from './statistics.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const theme = Grimmtale.createTheme(MODULE_ID);
const windows = new Map<string, InspectWindow>();

// Disable while saving so a second click doesn't undo the first
function markPending(button: HTMLElement): void {
    button.setAttribute('aria-busy', 'true');
    button.toggleAttribute('disabled', true);
}

function dropBrokenVeil(veil: HTMLImageElement): void {
    if (veil.complete && veil.naturalWidth === 0) {
        veil.remove();
    } else {
        veil.addEventListener('error', () => veil.remove(), { once: true });
    }
}

class InspectWindow extends HandlebarsApplicationMixin(ApplicationV2) {
    declare element: HTMLElement;

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
            toggleReveal: InspectWindow.onToggleReveal,
            toggleDescription: InspectWindow.onToggleDescription
        }
    };

    static PARTS = {
        body: {
            template: `modules/${MODULE_ID}/templates/inspect.hbs`,
            scrollable: ['.gs-scroll']
        }
    };

    actor: Actor;
    tokenDoc: TokenDocument | null;

    pendingKeys = new Set<string>();

    // Descriptions start collapsed and open on a press
    expanded = new Set<string>();

    constructor(actor: Actor, tokenDoc: TokenDocument | null) {
        super();
        this.actor = actor;
        this.tokenDoc = tokenDoc;
    }

    get title(): string {
        return game.i18n.format(`${MODULE_ID}.inspect.windowTitle`, { name: getKnownName(this.actor, this.tokenDoc) });
    }

    // Core sets the title on the first render only
    _configureRenderOptions(options: { window?: object }): void {
        super._configureRenderOptions(options);
        options.window = {
            ...options.window,
            title: this.title
        };
    }

    async _prepareContext(options: unknown) {
        const context = await super._prepareContext(options);
        const isCurator = canCurate(this.actor);
        const revealed = getRevealed(this.actor);
        const isNameShown = revealed.personal.includes(NAME_KEY);
        const defences = getDefenceSections(this.actor, revealed, isCurator);
        const statistics = getStatRows(this.actor, revealed, isCurator);
        const scores = getScoreTiles(this.actor, revealed, isCurator);
        const proficiencies = getProficiencyGroups(this.actor, revealed, isCurator);
        const abilityGroups = await getAbilityGroups(this.actor, revealed, isCurator, this.expanded);
        const spellGroups = await getSpellGroups(this.actor, revealed, isCurator, this.expanded);
        const sections = [defences, statistics, scores, proficiencies, abilityGroups, spellGroups];

        return {
            ...context,
            isCurator,
            name: getKnownName(this.actor, this.tokenDoc),
            isNameShown,
            nameToggleLabel: getToggleLabel(isNameShown),
            portrait: this.actor.img,
            defences,
            statistics,
            scores,
            proficiencies,
            abilityGroups,
            spellGroups,
            isEmpty: !isCurator && sections.every((section) => !section.length),
            ...Grimmtale.footerContext(MODULE_ID)
        };
    }

    // Core keeps the frame across renders
    _onFirstRender(context: unknown, options: unknown): void {
        super._onFirstRender(context, options);
        theme.apply(this);
        trackInputMode(this.element);
        Grimmtale.quietCloseButton(this.element);
    }

    _onRender(context: unknown, options: unknown): void {
        super._onRender(context, options);

        const veil = this.element.querySelector<HTMLImageElement>('.gs-interactable-actors-veil');

        if (veil) {
            dropBrokenVeil(veil);
        }

        bindPlate(this.element);

        for (const eye of this.element.querySelectorAll<HTMLElement>('[data-action="toggleReveal"]')) {
            if (this.pendingKeys.has(`${eye.dataset.category}:${eye.dataset.key}`)) {
                markPending(eye);
            }
        }
    }

    static async onToggleReveal(this: InspectWindow, _event: Event, target: HTMLElement): Promise<void> {
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
        } finally {
            this.pendingKeys.delete(pendingKey);
            void this.render();
        }
    }

    // Collapsing is local to this window
    static onToggleDescription(this: InspectWindow, _event: Event, target: HTMLElement): void {
        const key = target.dataset.key ?? '';
        const row = target.closest('.gs-interactable-actors-item');
        const fold = row?.querySelector<HTMLElement>('.gs-interactable-actors-fold');
        const isCollapsing = this.expanded.has(key);

        if (!row || !fold) {
            return;
        }

        if (isCollapsing) {
            this.expanded.delete(key);
        } else {
            this.expanded.add(key);
        }

        row.classList.toggle('is-collapsed', isCollapsing);
        fold.ariaExpanded = String(!isCollapsing);
        fold.ariaLabel = getFoldLabel(isCollapsing);
        fold.dataset.tooltip = getFoldLabel(isCollapsing);
    }

    _onClose(options: unknown): void {
        super._onClose(options);
        windows.delete(this.actor.uuid);
    }
}

export async function openInspect(
    actor: Actor | null,
    tokenDoc: TokenDocument | null = null
): Promise<InspectWindow | null> {
    if (!actor) {
        return null;
    }

    // Inspecting the same creature again brings its window forward
    const inspect = windows.get(actor.uuid) ?? new InspectWindow(actor, tokenDoc);

    inspect.tokenDoc = tokenDoc ?? inspect.tokenDoc;
    windows.set(actor.uuid, inspect);

    return inspect.render({ force: true });
}

export function renderOpenInspects(): void {
    for (const inspect of windows.values()) {
        void inspect.render();
    }
}

function renderWindowOn(actor: Actor | null | undefined): void {
    void windows.get(actor?.uuid ?? '')?.render();
}

function onUpdateActor(actor: Actor, changes: ActorUpdate): void {
    const flags = changes.flags?.[MODULE_ID] ?? {};

    if ('system' in changes) {
        renderWindowOn(actor);
    }

    if (!(FLAGS.revealed in flags) && !(`-=${FLAGS.revealed}` in flags)) {
        return;
    }

    for (const inspect of windows.values()) {
        if (getRevealStore(inspect.actor)?.uuid === actor.uuid) {
            void inspect.render();
        }
    }
}

function onItemChange(item: Item): void {
    renderWindowOn(item.parent);
}

function onDeleteActor(actor: Actor): void {
    void windows.get(actor.uuid)?.close();
}

// Deleting a token fires no deleteActor for its synthetic actor
function onDeleteToken(tokenDoc: TokenDocument): void {
    if (tokenDoc.actor?.isToken) {
        onDeleteActor(tokenDoc.actor);
    }
}

export function registerInspectRefresh(): void {
    Hooks.on('updateActor', onUpdateActor);

    for (const hook of ['createItem', 'updateItem', 'deleteItem']) {
        Hooks.on(hook, onItemChange);
    }

    Hooks.on('deleteActor', onDeleteActor);
    Hooks.on('deleteToken', onDeleteToken);
}
