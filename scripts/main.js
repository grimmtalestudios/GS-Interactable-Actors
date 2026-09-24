import { registerAutoReveal } from './autoReveal.js';
import { MODULE_ID } from './constants.js';
import { addHudButton } from './hudButton.js';
import { registerSettings } from './settings.js';
const log = Grimmtale.createLogger(MODULE_ID);
Hooks.once('init', () => {
    registerSettings();
    registerAutoReveal();
});
Hooks.once('ready', () => {
    log.info('Ready');
});
Hooks.on('renderTokenHUD', addHudButton);
