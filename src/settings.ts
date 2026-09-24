import { MODULE_ID } from './constants.js';

export function registerSettings(): void {
    Grimmtale.registerSettings(MODULE_ID, `${MODULE_ID}.settings`, {
        revealOnDamage: {
            type: Boolean,
            default: true
        },
        announceReveals: {
            type: Boolean,
            default: true
        }
    });
}

export function isRevealOnDamageEnabled(): boolean {
    return game.settings.get(MODULE_ID, 'revealOnDamage') === true;
}

export function isAnnouncingReveals(): boolean {
    return game.settings.get(MODULE_ID, 'announceReveals') === true;
}
