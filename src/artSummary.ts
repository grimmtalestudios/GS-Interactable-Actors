import { openArtConfig } from './artConfig.js';
import { ART_ICON, MODULE_ID } from './constants.js';
import { bindInputMode } from './inputMode.js';
import { getArtConfig, getReading } from './tokenArt.js';

interface TokenConfigApp {
    element?: HTMLElement;
    actor?: Actor | null;
}

const SUMMARY = '.gs-interactable-actors-art-summary';
const TEMPLATE = `modules/${MODULE_ID}/templates/art-summary.hbs`;

const theme = Grimmtale.createTheme(MODULE_ID);

function localize(key: string, data?: Record<string, unknown>): string {
    return game.i18n.format(`${MODULE_ID}.artSummary.${key}`, data);
}

async function createSummary(actor: Actor): Promise<HTMLElement> {
    const { enabled, resource, bands } = getArtConfig(actor);
    const isOn = enabled && bands.length > 0;
    const html = await foundry.applications.handlebars.renderTemplate(TEMPLATE, {
        icon: ART_ICON,
        isOn,
        state: isOn ? localize('on', { count: bands.length }) : localize('off'),
        watching: localize('watching', {
            resource,
            now: getReading(actor, resource) ?? localize('unreadable')
        }),
        bands
    });
    const summary = foundry.utils.parseHTML(html);

    theme.applyTo(summary);
    bindInputMode(summary);
    summary.querySelector('button')?.addEventListener('click', () => void openArtConfig(actor));

    return summary;
}

async function addArtSummary(app: TokenConfigApp, html: HTMLElement): Promise<void> {
    const tab = html.querySelector('.tab[data-tab="appearance"]');

    // Players cannot edit the bands on tokens they own
    if (!game.user.isGM || !app.actor || !tab) {
        return;
    }

    const summary = await createSummary(app.actor);

    // Replace any summary from an earlier render
    tab.querySelector(SUMMARY)?.remove();
    tab.append(summary);
}

// Synthetic actors have the same id as their base actor
function onUpdateActor(actor: Actor): void {
    for (const app of foundry.applications.instances.values()) {
        if (app.element?.querySelector(SUMMARY) && app.actor?.id === actor.id) {
            void addArtSummary(app, app.element);
        }
    }
}

export function registerArtSummary(): void {
    Hooks.on('renderTokenConfig', addArtSummary);
    Hooks.on('renderPrototypeTokenConfig', addArtSummary);
    Hooks.on('updateActor', onUpdateActor);
}
