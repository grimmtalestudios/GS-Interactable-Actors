import { MODULE_ID } from './constants.js';
import { addHudButton } from './hudButton.js';

const log = Grimmtale.createLogger(MODULE_ID);

Hooks.once('ready', () => {
    log.info('Ready');
});

Hooks.on('renderTokenHUD', addHudButton);
