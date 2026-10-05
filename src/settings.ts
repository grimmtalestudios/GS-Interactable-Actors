import { MODULE_ID } from './constants.js';

export function registerSettings(onInspectChange: () => void): void {
    Grimmtale.registerSettings(MODULE_ID, `${MODULE_ID}.settings`, {
        contextMenu: {
            type: Boolean,
            default: true
        },
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
        chatDescriptions: {
            type: Boolean,
            default: false,
            onChange: onInspectChange
        },
        renameMigrated: {
            type: Boolean,
            default: false,
            config: false
        }
    });
}

export function isContextMenuEnabled(): boolean {
    return game.settings.get(MODULE_ID, 'contextMenu') === true;
}

export function isRevealOnDamageEnabled(): boolean {
    return game.settings.get(MODULE_ID, 'revealOnDamage') === true;
}

export function isObservingCombat(): boolean {
    return game.settings.get(MODULE_ID, 'observeCombat') === true;
}

export function isAnnouncingReveals(): boolean {
    return game.settings.get(MODULE_ID, 'announceReveals') === true;
}

export function isUsingChatDescriptions(): boolean {
    return game.settings.get(MODULE_ID, 'chatDescriptions') === true;
}

export function isRenameMigrated(): boolean {
    return game.settings.get(MODULE_ID, 'renameMigrated') === true;
}
