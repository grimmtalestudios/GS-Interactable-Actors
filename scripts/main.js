import { registerAutoReveal } from './autoReveal.js';
import { MODULE_ID } from './constants.js';
import { addHudButton } from './hudButton.js';
import { registerInspectRefresh, renderOpenInspects } from './inspect.js';
import { registerObservation } from './observe.js';
import { registerSettings } from './settings.js';
import { registerTokenRebuildSkip } from './tokenRebuild.js';
const log = Grimmtale.createLogger(MODULE_ID);
Hooks.once('init', () => {
    void foundry.applications.handlebars.loadTemplates([`modules/${MODULE_ID}/templates/item-row.hbs`]);
    registerSettings(renderOpenInspects);
    registerAutoReveal();
    registerObservation();
    registerTokenRebuildSkip();
    registerInspectRefresh();
});
Hooks.once('ready', () => {
    log.info('Ready');
});
Hooks.on('renderTokenHUD', addHudButton);
