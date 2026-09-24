import { MODULE_ID } from './constants.js';
import { byShownThenName, toItemRow } from './itemRows.js';
import type { Revealed } from './reveal.js';

function getLevel(item: Item): number {
    return Number(item.system.level) || 0;
}

// Same labels as the rest of dnd5e
function getLevelLabel(level: number): string {
    return CONFIG.DND5E.spellLevels[level] ?? game.i18n.format(`${MODULE_ID}.inspect.spellLevel`, { level });
}

export async function getSpellGroups(actor: Actor, revealed: Revealed, isCurator: boolean, expanded: Set<string>) {
    const spells = actor.items.filter((item) => {
        return item.type === 'spell' && (isCurator || revealed.items.includes(item.id));
    });
    const rows = await Promise.all(spells.map(async (item) => ({
        ...await toItemRow(item, revealed.items.includes(item.id), expanded),
        level: getLevel(item)
    })));
    const levels = [...new Set(rows.map((row) => row.level))].sort((a, b) => a - b);

    return levels.map((level) => ({
        label: getLevelLabel(level),
        spells: rows.filter((row) => row.level === level).sort(byShownThenName)
    }));
}
