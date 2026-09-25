import { ART_ICON, MODULE_ID } from './constants.js';
import {
    type ArtConfig,
    DEFAULT_RESOURCE,
    getArtConfig,
    getReading,
    getTokenCounts,
    setArtConfig
} from './tokenArt.js';

interface DraftForm {
    enabled?: boolean;
    resource?: string;
    mode?: string;
    bands?: Record<string, {
        threshold?: number | null;
        img?: string
    }>;
}

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MODES = {
    percent: `${MODULE_ID}.artConfig.percent`,
    value: `${MODULE_ID}.artConfig.value`
};

const theme = Grimmtale.createTheme(MODULE_ID);
const localize = Grimmtale.createLocalizer(`${MODULE_ID}.artConfig`);
const windows = new Map<string, ArtConfigWindow>();

function isResource(node: unknown): node is Record<string, unknown> {
    const value = (node as Record<string, unknown> | null)?.value;

    return typeof node === 'object' && node !== null && Number.isFinite(Number(value));
}

// Only suggestions for the datalist
function getResourcePaths(actor: Actor): string[] {
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

function getSavedMessage(actor: Actor, isEnabled: boolean): string {
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

function markSaving(button: HTMLButtonElement | null): void {
    button?.setAttribute('aria-busy', 'true');
    button?.toggleAttribute('disabled', true);
    button?.querySelector('i')?.setAttribute('class', 'fa-solid fa-fw fa-spinner gs-spin');
}

class ArtConfigWindow extends HandlebarsApplicationMixin(ApplicationV2) {
    declare element: HTMLFormElement;

    static DEFAULT_OPTIONS = {
        id: `${MODULE_ID}-art-config-{id}`,
        tag: 'form',
        classes: ['gs-shared-base', 'gs-interactable-actors-app', 'gs-interactable-actors-art-config'],
        window: {
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

    actor: Actor;

    // Typed values are copied here before each re-render
    draft: ArtConfig;

    constructor(actor: Actor) {
        super();
        this.actor = actor;
        this.draft = getArtConfig(actor);
    }

    get title(): string {
        return localize('windowTitle', { name: this.actor.name });
    }

    async _prepareContext(options: unknown) {
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
    _onFirstRender(context: unknown, options: unknown): void {
        super._onFirstRender(context, options);
        theme.apply(this);
        Grimmtale.bindInputMode(this.element);
        Grimmtale.quietCloseButton(this.element);
    }

    captureDraft(): void {
        const form = new foundry.applications.ux.FormDataExtended(this.element);
        const data = foundry.utils.expandObject(form.object) as DraftForm;

        this.draft = {
            enabled: data.enabled === true,
            resource: data.resource?.trim() || DEFAULT_RESOURCE,
            mode: data.mode === 'value' ? 'value' : 'percent',
            bands: Object.values(data.bands ?? {}).map((band) => ({
                threshold: band.threshold ?? NaN,
                img: band.img?.trim() ?? ''
            }))
        };
    }

    static onAddBand(this: ArtConfigWindow): void {
        this.captureDraft();

        const last = this.draft.bands.at(-1);

        this.draft.bands.push({
            threshold: last ? Math.max(0, Math.floor(last.threshold / 2)) : 50,
            img: ''
        });
        void this.render();
    }

    static onRemoveBand(this: ArtConfigWindow, _event: Event, target: HTMLElement): void {
        this.captureDraft();
        this.draft.bands.splice(Number(target.dataset.index), 1);
        void this.render();
    }

    static onPickImage(this: ArtConfigWindow, _event: Event, target: HTMLElement): void {
        const index = Number(target.dataset.index);
        const current = this.element.querySelector<HTMLInputElement>(`[name="bands.${index}.img"]`)?.value;
        const FilePicker = foundry.applications.apps.FilePicker.implementation;
        const picker = new FilePicker({
            type: 'imagevideo',
            current: current || this.actor.prototypeToken?.texture?.src || '',
            callback: (path: string) => {
                this.captureDraft();

                if (this.draft.bands[index]) {
                    this.draft.bands[index].img = path;
                }

                void this.render();
            }
        });

        void picker.browse();
    }

    static async onSubmit(this: ArtConfigWindow): Promise<void> {
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
        } catch (error) {

            // Re-render to restore the save button
            void this.render();
            throw error;
        }

        ui.notifications.info(getSavedMessage(this.actor, config.enabled));
        await this.close();
    }

    _onClose(options: unknown): void {
        super._onClose(options);
        windows.delete(this.actor.uuid);
    }
}

export async function openArtConfig(actor: Actor | null): Promise<ArtConfigWindow | null> {

    // Saving writes to tokens on all scenes
    if (!actor || !game.user.isGM) {
        return null;
    }

    const artConfig = windows.get(actor.uuid) ?? new ArtConfigWindow(actor);

    windows.set(actor.uuid, artConfig);

    return artConfig.render({ force: true });
}

function addDirectoryEntry(_directory: unknown, entries: ContextMenuEntry[]): void {
    entries.push({
        name: `${MODULE_ID}.artConfig.title`,
        icon: `<i class="${ART_ICON}"></i>`,
        condition: () => game.user.isGM,
        callback: (target) => void openArtConfig(game.actors.get(target.dataset.entryId ?? '') ?? null)
    });
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

export function registerArtConfig(): void {
    Hooks.on('getActorContextOptions', addDirectoryEntry);
    Hooks.on('deleteActor', onDeleteActor);
    Hooks.on('deleteToken', onDeleteToken);
}
