import { MODULE_ID } from './constants.js';
import { getToggleLabel, type Revealed } from './reveal.js';
import { localizeConfigEntry } from './systemLabels.js';

interface StatEntry {
    key: string;
    label: string;
    value: string;
    isFigure?: boolean;
}

function localize(key: string): string {
    return game.i18n.localize(`${MODULE_ID}.inspect.${key}`);
}

function getCreatureType(actor: Actor): string {
    const type = actor.system.details?.type;

    if (!type || typeof type === 'string') {
        return type ?? '';
    }

    if (type.value === 'custom') {
        return type.custom ?? '';
    }

    const label = localizeConfigEntry(CONFIG.DND5E.creatureTypes[type.value], type.value);
    const subtype = type.subtype?.trim();

    // Humanoid (goblinoid), matching the sheet
    return subtype ? `${label} (${subtype})` : label;
}

function getCreatureSize(actor: Actor): string {
    const size = actor.system.traits?.size;

    return size ? localizeConfigEntry(CONFIG.DND5E.actorSizes[size], size) : '';
}

function getMovementUnit(units: string | undefined): string {
    const { movementUnits } = CONFIG.DND5E;

    // If units is empty, use the first one dnd5e lists
    const key = units || Object.keys(movementUnits)[0] || '';
    const entry = movementUnits[key];
    const label = typeof entry === 'string' ? entry : entry?.abbreviation ?? entry?.label;

    return label ? game.i18n.localize(label) : key;
}

function getMovementEntries(actor: Actor): StatEntry[] {
    const movement = actor.system.attributes?.movement ?? {};
    const unit = getMovementUnit(movement.units);

    return Object.entries(CONFIG.DND5E.movementTypes).flatMap(([key, config]) => {
        const speed = Number(movement[key]);

        // Stat blocks print hover beside the fly speed
        const hover = key === 'fly' && movement.hover ? ` (${localize('hover')})` : '';

        if (config.hidden || !(speed > 0)) {
            return [];
        }

        return [{
            key: `stat.move.${key}`,
            label: localizeConfigEntry(config, key),
            value: `${unit ? `${speed} ${unit}` : speed}${hover}`,
            isFigure: true
        }];
    });
}

export function getStatRows(actor: Actor, revealed: Revealed, isCurator: boolean) {
    const entries: StatEntry[] = [
        {
            key: 'stat.type',
            label: localize('creatureType'),
            value: getCreatureType(actor).trim()
        },
        {
            key: 'stat.size',
            label: localize('creatureSize'),
            value: getCreatureSize(actor)
        },
        ...getMovementEntries(actor)
    ];

    return entries
        .filter(({ key, value }) => value && (isCurator || revealed.personal.includes(key)))
        .map((entry) => {
            const isShown = revealed.personal.includes(entry.key);

            return {
                ...entry,
                isShown,
                toggleLabel: getToggleLabel(isShown)
            };
        });
}
