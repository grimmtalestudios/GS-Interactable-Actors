import { registerArtConfig } from './artConfig.js';
import { registerArtSummary } from './artSummary.js';
import { registerAutoReveal } from './autoReveal.js';
import { MODULE_ID } from './constants.js';
import { registerContextMenu } from './contextMenu.js';
import { addHudButton } from './hudButton.js';
import { registerInspectRefresh, renderOpenInspects } from './inspect.js';
import { registerObservation } from './observe.js';
import { registerSettings } from './settings.js';
import { registerTokenArt } from './tokenArt.js';
import { registerTokenRebuildSkip } from './tokenRebuild.js';

const log = Grimmtale.createLogger(MODULE_ID);

Hooks.once('init', () => {
    void foundry.applications.handlebars.loadTemplates([`modules/${MODULE_ID}/templates/item-row.hbs`]);
    registerSettings(renderOpenInspects);
    registerAutoReveal();
    registerObservation();
    registerTokenRebuildSkip();
    registerInspectRefresh();
    registerContextMenu();
    registerTokenArt();
    registerArtConfig();
    registerArtSummary();
});

Hooks.once('ready', () => {
    log.info('Ready');
});

Hooks.on('renderTokenHUD', addHudButton);
