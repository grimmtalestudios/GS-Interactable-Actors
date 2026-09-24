import { MODULE_ID } from './constants.js';

export function registerSettings(onInspectChange: () => void): void {
    Grimmtale.registerSettings(MODULE_ID, `${MODULE_ID}.settings`, {
        revealOnDamage: {
            type: Boolean,
            default: true
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

export function isRevealOnDamageEnabled(): boolean {
    return game.settings.get(MODULE_ID, 'revealOnDamage') === true;
}

export function isAnnouncingReveals(): boolean {
    return game.settings.get(MODULE_ID, 'announceReveals') === true;
}

export function isShowingRelationships(): boolean {
    return game.settings.get(MODULE_ID, 'showRelationships') === true;
}

export function isUsingChatDescriptions(): boolean {
    return game.settings.get(MODULE_ID, 'chatDescriptions') === true;
}
