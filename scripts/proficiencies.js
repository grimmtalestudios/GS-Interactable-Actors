import { MODULE_ID } from './constants.js';
import { toSigned } from './scores.js';
function getTraitLabel(trait, key) {
    return dnd5e.documents.Trait.keyLabel(key, { trait }) || key;
}
function byLabel(a, b) {
    return a.label.localeCompare(b.label);
}
function toBonus(value) {
    const bonus = Number(value);
    return Number.isFinite(bonus) ? toSigned(bonus) : '';
}
function getSaveEntries(actor) {
    const abilities = actor.system.abilities ?? {};
    return Object.entries(CONFIG.DND5E.abilities).flatMap(([key, config]) => {
        const ability = abilities[key];
        const save = typeof ability?.save === 'object' ? ability.save.value : ability?.save;
        // If not proficient, the save is the ability modifier
        if (Number(ability?.proficient ?? 0) < 1) {
            return [];
        }
        return [{
                key: `stat.save.${key}`,
                label: config.label ?? key,
                detail: toBonus(save)
            }];
    });
}
function getSkillEntries(actor) {
    return Object.entries(actor.system.skills ?? {})
        .filter(([, skill]) => Number(skill?.value ?? 0) >= 1)
        .map(([key, skill]) => ({
        key: `stat.skill.${key}`,
        label: CONFIG.DND5E.skills[key]?.label ?? key,
        detail: toBonus(skill?.total)
    }))
        .sort(byLabel);
}
function getToolEntries(actor) {
    return Object.entries(actor.system.tools ?? {})
        .filter(([, tool]) => Number(tool?.value ?? 0) >= 1)
        .map(([key]) => ({
        key: `stat.tool.${key}`,
        label: getTraitLabel('tool', key)
    }))
        .sort(byLabel);
}
function toTraitEntries(trait, prefix, held) {
    const typed = [...held?.value ?? []].map((key) => ({
        key: `${prefix}.${key}`,
        label: getTraitLabel(trait, key)
    }));
    // "Thieves' Cant; Deep Speech" typed by a GM is two languages
    const written = (held?.custom ?? '').split(';').map((part) => part.trim()).filter(Boolean).map((part) => ({
        key: `${prefix}.custom.${part.toLowerCase().replace(/\s+/g, '-')}`,
        label: part
    }));
    return [...typed, ...written].sort(byLabel);
}
export function getProficiencyGroups(actor, revealed, isCurator) {
    const { traits } = actor.system;
    const groups = [
        ['savingThrows', getSaveEntries(actor)],
        ['skillsTrained', getSkillEntries(actor)],
        ['toolsTrained', getToolEntries(actor)],
        ['armorTrained', toTraitEntries('armor', 'stat.armor', traits?.armorProf)],
        ['weaponsTrained', toTraitEntries('weapon', 'stat.weapon', traits?.weaponProf)],
        ['languages', toTraitEntries('languages', 'stat.lang', traits?.languages)]
    ];
    return groups.flatMap(([labelKey, entries]) => {
        const chips = entries
            .map((entry) => ({
            ...entry,
            isShown: revealed.personal.includes(entry.key)
        }))
            .filter((chip) => chip.isShown || isCurator);
        if (!chips.length) {
            return [];
        }
        return [{
                label: game.i18n.localize(`${MODULE_ID}.inspect.${labelKey}`),
                chips
            }];
    });
}
