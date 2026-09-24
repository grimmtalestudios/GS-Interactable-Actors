import { MODULE_ID } from './constants.js';
// Conditions use name where other dnd5e entries use label
export function localizeConfigEntry(entry, fallback) {
    const label = typeof entry === 'string' ? entry : entry?.label ?? entry?.name;
    return label ? game.i18n.localize(label) : fallback;
}
export function getDamageTypeLabel(key) {
    const { damageTypes, healingTypes, conditionTypes } = CONFIG.DND5E;
    if (key === 'ALL') {
        return game.i18n.localize(`${MODULE_ID}.inspect.allDamage`);
    }
    return localizeConfigEntry(damageTypes[key] ?? healingTypes[key] ?? conditionTypes[key], key);
}
