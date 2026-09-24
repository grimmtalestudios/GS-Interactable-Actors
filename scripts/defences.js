import { MODULE_ID } from './constants.js';
import { getDamageTypeLabel, localizeConfigEntry } from './systemLabels.js';
const DEFENCE_CATEGORIES = ['dr', 'di', 'dv', 'ci'];
function getBypassNote({ bypasses }) {
    const labels = [...bypasses ?? []].map((key) => localizeConfigEntry(CONFIG.DND5E.itemProperties[key], key));
    if (!labels.length) {
        return '';
    }
    return game.i18n.format(`${MODULE_ID}.inspect.bypassNote`, { properties: labels.join(', ') });
}
function toChips(category, { value, custom }, revealed) {
    const typed = [...value ?? []].map((key) => [key, getDamageTypeLabel(key)]);
    const written = custom?.trim() ? [['custom', custom.trim()]] : [];
    return [...typed, ...written].map(([key, label]) => ({
        category,
        key,
        label,
        isShown: revealed[category].includes(key)
    }));
}
export function getDefenceSections(actor, revealed, isCurator) {
    return DEFENCE_CATEGORIES.flatMap((category) => {
        const trait = actor.system.traits?.[category];
        const chips = trait ? toChips(category, trait, revealed).filter((chip) => isCurator || chip.isShown) : [];
        if (!trait || !chips.length) {
            return [];
        }
        return [{
                label: game.i18n.localize(`${MODULE_ID}.inspect.${category}`),
                chips,
                bypassNote: getBypassNote(trait)
            }];
    });
}
