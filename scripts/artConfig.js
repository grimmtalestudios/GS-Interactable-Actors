import { ART_ICON, MODULE_ID } from './constants.js';
import { trackInputMode } from './inputMode.js';
import { DEFAULT_RESOURCE, getArtConfig, getReading, getTokenCounts, setArtConfig } from './tokenArt.js';
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODES = {
    percent: `${MODULE_ID}.artConfig.percent`,
    value: `${MODULE_ID}.artConfig.value`
};
const theme = Grimmtale.createTheme(MODULE_ID);
const windows = new Map();
function localize(key, data) {
    return game.i18n.format(`${MODULE_ID}.artConfig.${key}`, data);
}
function isResource(node) {
    const value = node?.value;
    return typeof node === 'object' && node !== null && Number.isFinite(Number(value));
}
// Only suggestions for the datalist
function getResourcePaths(actor) {
    const paths = new Set([DEFAULT_RESOURCE]);
    for (const [key, node] of Object.entries(actor.system)) {
        if (isResource(node)) {
            paths.add(key);
        }
        for (const [subKey, subNode] of Object.entries(typeof node === 'object' && node ? node : {})) {
            if (isResource(subNode) && Number.isFinite(Number(subNode.max))) {
                paths.add(`${key}.${subKey}`);
            }
        }
    }
    return [...paths];
}
function getSavedMessage(actor, isEnabled) {
    const { tokens, scenes } = getTokenCounts(actor);
    const { name } = actor;
    if (!isEnabled) {
        return localize('savedOff', { name });
    }
    if (!tokens) {
        return localize('savedNone', { name });
    }
    return localize('saved', {
        name,
        tokens: localize(tokens === 1 ? 'count.token' : 'count.tokens', { count: tokens }),
        scenes: localize(scenes === 1 ? 'count.scene' : 'count.scenes', { count: scenes })
    });
}
function markSaving(button) {
    button?.setAttribute('aria-busy', 'true');
    button?.toggleAttribute('disabled', true);
    button?.querySelector('i')?.setAttribute('class', 'fa-solid fa-fw fa-spinner gs-spin');
}
class ArtConfigWindow extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: `${MODULE_ID}-art-config-{id}`,
        tag: 'form',
        classes: ['gs-shared-base', 'gs-interactable-actors-app', 'gs-interactable-actors-art-config'],
        window: {
            title: `${MODULE_ID}.artConfig.title`,
            icon: ART_ICON,
            resizable: true
        },
        position: {
            width: 520, // room for a threshold, an image path and two buttons
            height: 'auto'
        },
        // onSubmit closes the window once the save succeeds
        form: { handler: ArtConfigWindow.onSubmit },
        actions: {
            addBand: ArtConfigWindow.onAddBand,
            removeBand: ArtConfigWindow.onRemoveBand,
            pickImage: ArtConfigWindow.onPickImage
        }
    };
    static PARTS = {
        body: {
            template: `modules/${MODULE_ID}/templates/art-config.hbs`,
            scrollable: ['.gs-scroll']
        }
    };
    actor;
    // Typed values are copied here before each re-render
    draft;
    constructor(actor) {
        super();
        this.actor = actor;
        this.draft = getArtConfig(actor);
    }
    get title() {
        return localize('windowTitle', { name: this.actor.name });
    }
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const { enabled, resource, mode, bands } = this.draft;
        return {
            ...context,
            name: this.actor.name,
            image: this.actor.prototypeToken?.texture?.src ?? this.actor.img,
            enabled,
            resource,
            mode,
            modes: MODES,
            isPercent: mode === 'percent',
            bands: bands.map((band, index) => ({
                ...band,
                index
            })),
            pathListId: `${this.id}-paths`,
            resourcePaths: getResourcePaths(this.actor),
            reading: getReading(this.actor, resource),
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
    captureDraft() {
        const form = new foundry.applications.ux.FormDataExtended(this.element);
        const data = foundry.utils.expandObject(form.object);
        this.draft = {
            enabled: data.enabled === true,
            resource: data.resource?.trim() || DEFAULT_RESOURCE,
            mode: data.mode === 'value' ? 'value' : 'percent',
            bands: Object.values(data.bands ?? {}).map((band) => ({
                threshold: Number(band.threshold),
                img: band.img?.trim() ?? ''
            }))
        };
    }
    static onAddBand() {
        this.captureDraft();
        const last = this.draft.bands.at(-1);
        this.draft.bands.push({
            threshold: last ? Math.max(0, Math.floor(last.threshold / 2)) : 50,
            img: ''
        });
        void this.render();
    }
    static onRemoveBand(_event, target) {
        this.captureDraft();
        this.draft.bands.splice(Number(target.dataset.index), 1);
        void this.render();
    }
    static onPickImage(_event, target) {
        const index = Number(target.dataset.index);
        const current = this.element.querySelector(`[name="bands.${index}.img"]`)?.value;
        const FilePicker = foundry.applications.apps.FilePicker.implementation;
        const picker = new FilePicker({
            type: 'imagevideo',
            current: current || this.actor.prototypeToken?.texture?.src || '',
            callback: (path) => {
                this.captureDraft();
                if (this.draft.bands[index]) {
                    this.draft.bands[index].img = path;
                }
                void this.render();
            }
        });
        void picker.browse();
    }
    static async onSubmit() {
        this.captureDraft();
        const config = {
            ...this.draft,
            bands: this.draft.bands.filter((band) => Number.isFinite(band.threshold) && band.img)
        };
        if (config.enabled && !config.bands.length) {
            ui.notifications.warn(localize('noBands'));
            return;
        }
        markSaving(this.element.querySelector('button[type="submit"]'));
        try {
            await setArtConfig(this.actor, config);
        }
        catch (error) {
            // Re-render to restore the save button
            void this.render();
            throw error;
        }
        ui.notifications.info(getSavedMessage(this.actor, config.enabled));
        await this.close();
    }
    _onClose(options) {
        super._onClose(options);
        windows.delete(this.actor.uuid);
    }
}
export async function openArtConfig(actor) {
    // Saving writes to tokens on all scenes
    if (!actor || !game.user.isGM) {
        return null;
    }
    const artConfig = windows.get(actor.uuid) ?? new ArtConfigWindow(actor);
    windows.set(actor.uuid, artConfig);
    return artConfig.render({ force: true });
}
function addDirectoryEntry(_directory, entries) {
    entries.push({
        name: `${MODULE_ID}.artConfig.title`,
        icon: `<i class="${ART_ICON}"></i>`,
        condition: () => game.user.isGM,
        callback: (target) => void openArtConfig(game.actors.get(target.dataset.entryId ?? '') ?? null)
    });
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
export function registerArtConfig() {
    Hooks.on('getActorContextOptions', addDirectoryEntry);
    Hooks.on('deleteActor', onDeleteActor);
    Hooks.on('deleteToken', onDeleteToken);
}
