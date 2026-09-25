import { MODULE_ID } from './constants.js';
import { enrich, getDescription } from './enrich.js';
import { getToggleLabel } from './reveal.js';

interface ItemRowOrder {
    isShown: boolean;
    name: string;
}

export function getCollapseLabel(isCollapsed: boolean): string {
    return game.i18n.localize(`${MODULE_ID}.inspect.${isCollapsed ? 'expandEntry' : 'collapseEntry'}`);
}

// dnd5e swaps its item card into a tooltip holding this
function getCardTooltip({ uuid }: Item): string {
    const spinner = '<i class="fa-solid fa-spinner fa-spin-pulse" inert></i>';

    return `<section class="loading" data-uuid="${uuid}">${spinner}</section>`;
}

export async function getItemRow(item: Item, isShown: boolean, expanded: Set<string>) {

    // If hidden, show the name but not the description
    const description = isShown ? getDescription(item) : '';
    const descriptionHTML = description ? await enrich(description, item) : '';
    const isCollapsible = descriptionHTML !== '';
    const isCollapsed = isCollapsible && !expanded.has(item.id);

    return {
        id: item.id,
        name: item.name,
        img: item.img,
        isShown,
        descriptionHTML,
        isCollapsible,
        isCollapsed,
        collapseLabel: getCollapseLabel(isCollapsed),
        cardTooltip: getCardTooltip(item),
        toggleLabel: getToggleLabel(isShown)
    };
}

export function byShownThenName(a: ItemRowOrder, b: ItemRowOrder): number {
    return Number(b.isShown) - Number(a.isShown) || a.name.localeCompare(b.name);
}
