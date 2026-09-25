import { getAbilityGroups } from './abilities.js';
import { FLAGS, INSPECT_ICON, MODULE_ID } from './constants.js';
import { getDefenceSections } from './defences.js';
import { bindInputMode } from './inputMode.js';
import { getFoldLabel } from './itemRows.js';
import { forgetObserved } from './observe.js';
import { getBiographies, getLore, getPersonal } from './personal.js';
import { bindPlate } from './portraitPlate.js';
import { getProficiencyGroups } from './proficiencies.js';
import { getFriendlyRelationships } from './relationships.js';
import { canCurate, getKnownName, getRevealed, getRevealStore, getToggleLabel, isRevealed, NAME_KEY, setRevealed } from './reveal.js';
import { getScoreTiles } from './scores.js';
import { getSpellGroups } from './spells.js';
import { getStatRows } from './statistics.js';
import { getVitals } from './vitals.js';
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const theme = Grimmtale.createTheme(MODULE_ID);
const windows = new Map();
function getPendingKey({ dataset }) {
    return dataset.stat ? `observed:${dataset.stat}` : `${dataset.category}:${dataset.key}`;
}
// Disable while saving so a second click doesn't undo the first
function markPending(button) {
    button.setAttribute('aria-busy', 'true');
    button.toggleAttribute('disabled', true);
}
function removeIfBroken(image) {
    if (image.complete && image.naturalWidth === 0) {
        image.remove();
    }
    else {
        image.addEventListener('error', () => image.remove(), { once: true });
    }
}
class InspectWindow extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: `${MODULE_ID}-inspect-{id}`,
        tag: 'div',
        classes: ['gs-shared-base', 'gs-interactable-actors-app', 'gs-interactable-actors-inspect'],
        window: {
            icon: INSPECT_ICON,
            resizable: true
        },
        position: {
            width: 880, // two 440px halves: the portrait and what is known
            height: 'auto'
        },
        actions: {
            toggleReveal: InspectWindow.onToggleReveal,
            toggleDescription: InspectWindow.onToggleDescription,
            forgetObserved: InspectWindow.onForgetObserved
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
    // Descriptions start collapsed and open on a press
    expanded = new Set();
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
        const revealed = getRevealed(this.actor);
        const isNameShown = revealed.personal.includes(NAME_KEY);
        const lore = await getLore(this.actor, revealed, isCurator);
        const vitals = getVitals(this.actor, isCurator);
        const defences = getDefenceSections(this.actor, revealed, isCurator);
        const personal = await getPersonal(this.actor, revealed, isCurator);
        const biographies = await getBiographies(this.actor, revealed, isCurator);
        const statistics = getStatRows(this.actor, revealed, isCurator);
        const scores = getScoreTiles(this.actor, revealed, isCurator);
        const proficiencies = getProficiencyGroups(this.actor, revealed, isCurator);
        const abilityGroups = await getAbilityGroups(this.actor, revealed, isCurator, this.expanded);
        const spellGroups = await getSpellGroups(this.actor, revealed, isCurator, this.expanded);
        const relationships = getFriendlyRelationships(this.actor, this.tokenDoc);
        const sections = [defences, biographies, statistics, scores, proficiencies, abilityGroups, spellGroups];
        return {
            ...context,
            isCurator,
            name: getKnownName(this.actor, this.tokenDoc),
            isNameShown,
            nameToggleLabel: getToggleLabel(isNameShown),
            portrait: this.actor.img,
            lore,
            vitals,
            defences,
            personal,
            biographies,
            statistics,
            scores,
            proficiencies,
            abilityGroups,
            spellGroups,
            relationships,
            isEmpty: !isCurator && !lore && !vitals?.isAnyKnown && !personal && !relationships
                && sections.every((section) => !section.length),
            ...Grimmtale.footerContext(MODULE_ID)
        };
    }
    // Core keeps the frame across renders
    _onFirstRender(context, options) {
        super._onFirstRender(context, options);
        theme.apply(this);
        bindInputMode(this.element);
        Grimmtale.quietCloseButton(this.element);
    }
    _onRender(context, options) {
        super._onRender(context, options);
        // The backdrop and class icon are decoration
        for (const image of this.element.querySelectorAll('.gs-interactable-actors-backdrop, .gs-interactable-actors-class-icon')) {
            removeIfBroken(image);
        }
        bindPlate(this.element);
        for (const control of this.element.querySelectorAll('[data-action="toggleReveal"], [data-stat]')) {
            if (this.pendingKeys.has(getPendingKey(control))) {
                markPending(control);
            }
        }
    }
    static async onToggleReveal(_event, target) {
        const { category = '', key = '' } = target.dataset;
        const pendingKey = getPendingKey(target);
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
    static async onForgetObserved(_event, target) {
        const pendingKey = getPendingKey(target);
        if (!canCurate(this.actor) || this.pendingKeys.has(pendingKey)) {
            return;
        }
        this.pendingKeys.add(pendingKey);
        markPending(target);
        try {
            await forgetObserved(this.actor, target.dataset.stat ?? '');
        }
        finally {
            this.pendingKeys.delete(pendingKey);
            void this.render();
        }
    }
    // Collapsing is local to this window
    static onToggleDescription(_event, target) {
        const key = target.dataset.key ?? '';
        const row = target.closest('.gs-interactable-actors-item');
        const fold = row?.querySelector('.gs-interactable-actors-fold');
        const isCollapsing = this.expanded.has(key);
        if (!row || !fold) {
            return;
        }
        if (isCollapsing) {
            this.expanded.delete(key);
        }
        else {
            this.expanded.add(key);
        }
        row.classList.toggle('is-collapsed', isCollapsing);
        fold.ariaExpanded = String(!isCollapsing);
        fold.ariaLabel = getFoldLabel(isCollapsing);
        fold.dataset.tooltip = getFoldLabel(isCollapsing);
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
export function renderOpenInspects() {
    for (const inspect of windows.values()) {
        void inspect.render();
    }
}
function renderWindowOn(actor) {
    void windows.get(actor?.uuid ?? '')?.render();
}
function isKnowledgeChange(changes) {
    const flags = changes.flags?.[MODULE_ID] ?? {};
    return [FLAGS.revealed, FLAGS.observed].some((flag) => flag in flags || `-=${flag}` in flags);
}
function renderWindowsReading(store) {
    for (const inspect of windows.values()) {
        if (getRevealStore(inspect.actor)?.uuid === store.uuid) {
            void inspect.render();
        }
    }
}
function onUpdateActor(actor, changes) {
    if ('system' in changes) {
        renderWindowOn(actor);
    }
    if (isKnowledgeChange(changes)) {
        renderWindowsReading(actor);
    }
}
function onItemChange(item) {
    renderWindowOn(item.parent);
}
function onDeleteActor(actor) {
    void windows.get(actor.uuid)?.close();
}
// Deleting a token fires no deleteActor for its synthetic actor
function onDeleteToken(tokenDoc) {
    if (tokenDoc.actor?.isToken) {
        onDeleteActor(tokenDoc.actor);
    }
}
export function registerInspectRefresh() {
    Hooks.on('updateActor', onUpdateActor);
    for (const hook of ['createItem', 'updateItem', 'deleteItem']) {
        Hooks.on(hook, onItemChange);
    }
    Hooks.on('deleteActor', onDeleteActor);
    Hooks.on('deleteToken', onDeleteToken);
}
