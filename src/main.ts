import { registerAutoReveal } from './autoReveal.js';
import { MODULE_ID } from './constants.js';
import { addHudButton } from './hudButton.js';
import { registerInspectRefresh } from './inspect.js';
import { registerSettings } from './settings.js';
import { registerTokenRebuildSkip } from './tokenRebuild.js';

const log = Grimmtale.createLogger(MODULE_ID);

Hooks.once('init', () => {
    registerSettings();
    registerAutoReveal();
    registerTokenRebuildSkip();
    registerInspectRefresh();
});

Hooks.once('ready', () => {
    log.info('Ready');
});

Hooks.on('renderTokenHUD', addHudButton);
