import { MODULE_ID } from './constants.js';
import { enrich, getDescription } from './enrich.js';
import { getToggleLabel } from './reveal.js';
const ABILITY_TYPES = ['feat', 'weapon'];
// Stat block order
const ACTIVATION_ORDER = ['action', 'bonus', 'reaction', 'legendary', 'lair', 'special', 'passive'];
function localize(key) {
    return game.i18n.localize(`${MODULE_ID}.inspect.${key}`);
}
export function getFoldLabel(isCollapsed) {
    return localize(isCollapsed ? 'expandEntry' : 'collapseEntry');
}
function getActivation(item) {
    const type = item.system.activities?.contents[0]?.activation?.type?.trim();
    if (!type) {
        return 'passive';
    }
    // Count homebrew types as special
    return ACTIVATION_ORDER.includes(type) ? type : 'special';
}
// dnd5e swaps its item card into a tooltip holding this
function toCardTooltip({ uuid }) {
    const spinner = '<i class="fa-solid fa-spinner fa-spin-pulse" inert></i>';
    return `<section class="loading" data-uuid="${uuid}">${spinner}</section>`;
}
async function toAbilityRow(item, isShown, expanded) {
    const description = isShown ? getDescription(item) : '';
    const descriptionHTML = description ? await enrich(description, item) : '';
    const isFoldable = descriptionHTML !== '';
    const isCollapsed = isFoldable && !expanded.has(item.id);
    return {
        id: item.id,
        name: item.name,
        img: item.img,
        activation: getActivation(item),
        isShown,
        descriptionHTML,
        isFoldable,
        isCollapsed,
        foldLabel: getFoldLabel(isCollapsed),
        cardTooltip: toCardTooltip(item),
        toggleLabel: getToggleLabel(isShown)
    };
}
export async function getAbilityGroups(actor, revealed, isCurator, expanded) {
    const items = actor.items.filter((item) => {
        return ABILITY_TYPES.includes(item.type) && (isCurator || revealed.items.includes(item.id));
    });
    const rows = await Promise.all(items.map((item) => toAbilityRow(item, revealed.items.includes(item.id), expanded)));
    rows.sort((a, b) => Number(b.isShown) - Number(a.isShown) || a.name.localeCompare(b.name));
    return ACTIVATION_ORDER
        .map((key) => ({
        label: localize(`activation.${key}`),
        abilities: rows.filter((row) => row.activation === key)
    }))
        .filter((group) => group.abilities.length);
}
