import { MODULE_ID } from './constants.js';
export function registerSettings(onInspectChange) {
    Grimmtale.registerSettings(MODULE_ID, `${MODULE_ID}.settings`, {
        revealOnDamage: {
            type: Boolean,
            default: true
        },
        observeCombat: {
            type: Boolean,
            default: true,
            onChange: onInspectChange
        },
        announceReveals: {
            type: Boolean,
            default: true
        },
        showRelationships: {
            type: Boolean,
            default: true,
            onChange: onInspectChange
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
export function isObservingCombat() {
    return game.settings.get(MODULE_ID, 'observeCombat') === true;
}
export function isAnnouncingReveals() {
    return game.settings.get(MODULE_ID, 'announceReveals') === true;
}
export function isShowingRelationships() {
    return game.settings.get(MODULE_ID, 'showRelationships') === true;
}
export function isUsingChatDescriptions() {
    return game.settings.get(MODULE_ID, 'chatDescriptions') === true;
}
