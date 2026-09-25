import { openArtConfig } from './artConfig.js';
import { ART_ICON, MODULE_ID } from './constants.js';
import { getArtConfig, getReading } from './tokenArt.js';
const SUMMARY_CLASS = 'gs-interactable-actors-art-summary';
const TEMPLATE = `modules/${MODULE_ID}/templates/art-summary.hbs`;
const theme = Grimmtale.createTheme(MODULE_ID);
const localize = Grimmtale.createLocalizer(`${MODULE_ID}.artSummary`);
async function createSummary(actor) {
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
    Grimmtale.bindInputMode(summary);
    summary.querySelector('button')?.addEventListener('click', () => void openArtConfig(actor));
    return summary;
}
async function addArtSummary(app, html) {
    const tab = html.querySelector('.tab[data-tab="appearance"]');
    // Players cannot edit the bands on tokens they own
    if (!game.user.isGM || !app.actor || !tab) {
        return;
    }
    const summary = await createSummary(app.actor);
    Grimmtale.injectOnce(tab, SUMMARY_CLASS, () => summary);
}
function onUpdateActor(actor) {
    for (const app of foundry.applications.instances.values()) {
        // Synthetic actors have the same id as their base actor
        if (app.element?.querySelector(`.${SUMMARY_CLASS}`) && app.actor?.id === actor.id) {
            void addArtSummary(app, app.element);
        }
    }
}
export function registerArtSummary() {
    Hooks.on('renderTokenConfig', addArtSummary);
    Hooks.on('renderPrototypeTokenConfig', addArtSummary);
    Hooks.on('updateActor', onUpdateActor);
}
