import { MODULE_ID } from './constants.js';
import type { Revealed } from './reveal.js';
import { getDamageTypeLabel, localizeConfigEntry } from './systemLabels.js';

interface DefenceChip {
    category: string;
    key: string;
    label: string;
    isShown: boolean;
}

interface DefenceSection {
    label: string;
    chips: DefenceChip[];
    bypassNote: string;
}

const DEFENCE_CATEGORIES = ['dr', 'di', 'dv', 'ci'] as const;

function getBypassNote({ bypasses }: ActorTrait): string {
    const labels = [...bypasses ?? []].map((key) => localizeConfigEntry(CONFIG.DND5E.itemProperties[key], key));

    if (!labels.length) {
        return '';
    }

    return game.i18n.format(`${MODULE_ID}.inspect.bypassNote`, { properties: labels.join(', ') });
}

function toChips(category: keyof Revealed, { value, custom }: ActorTrait, revealed: Revealed): DefenceChip[] {
    const typed = [...value ?? []].map((key) => [key, getDamageTypeLabel(key)]);
    const written = custom?.trim() ? [['custom', custom.trim()]] : [];

    return [...typed, ...written].map(([key, label]) => ({
        category,
        key,
        label,
        isShown: revealed[category].includes(key)
    }));
}

export function getDefenceSections(actor: Actor, revealed: Revealed, isCurator: boolean): DefenceSection[] {
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
