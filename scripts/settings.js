import { MODULE_ID } from './constants.js';
export function registerSettings(onInspectChange) {
    Grimmtale.registerSettings(MODULE_ID, `${MODULE_ID}.settings`, {
        revealOnDamage: {
            type: Boolean,
            default: true
        },
        announceReveals: {
            type: Boolean,
            default: true
        },
        chatDescriptions: {
            type: Boolean,
            default: false,
            onChange: onInspectChange
        }
    });
}
export function isRevealOnDamageEnabled() {
    return game.settings.get(MODULE_ID, 'revealOnDamage') === true;
}
export function isAnnouncingReveals() {
    return game.settings.get(MODULE_ID, 'announceReveals') === true;
}
export function isUsingChatDescriptions() {
    return game.settings.get(MODULE_ID, 'chatDescriptions') === true;
}
