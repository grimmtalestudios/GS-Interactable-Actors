import { MODULE_ID } from './constants.js';
import { byShownThenName, getItemRow } from './itemRows.js';
import type { Revealed } from './reveal.js';

const ABILITY_TYPES = ['feat', 'weapon'];

// Stat block order
const ACTIVATION_ORDER = ['action', 'bonus', 'reaction', 'legendary', 'lair', 'special', 'passive'];

function getActivation(item: Item): string {
    const type = item.system.activities?.contents[0]?.activation?.type?.trim();

    if (!type) {
        return 'passive';
    }

    // Count homebrew types as special
    return ACTIVATION_ORDER.includes(type) ? type : 'special';
}

export async function getAbilityGroups(actor: Actor, revealed: Revealed, isCurator: boolean, expanded: Set<string>) {
    const items = actor.items.filter((item) => {
        return ABILITY_TYPES.includes(item.type) && (isCurator || revealed.items.includes(item.id));
    });
    const rows = await Promise.all(items.map(async (item) => ({
        ...await getItemRow(item, revealed.items.includes(item.id), expanded),
        activation: getActivation(item)
    })));

    rows.sort(byShownThenName);

    return ACTIVATION_ORDER
        .map((key) => ({
            label: game.i18n.localize(`${MODULE_ID}.inspect.activation.${key}`),
            abilities: rows.filter((row) => row.activation === key)
        }))
        .filter((group) => group.abilities.length);
}
