import type { Revealed } from './reveal.js';

function toSigned(value: number): string {
    return `${value >= 0 ? '+' : ''}${value}`;
}

export function getScoreTiles(actor: Actor, revealed: Revealed, isCurator: boolean) {
    const abilities = actor.system.abilities ?? {};

    return Object.entries(CONFIG.DND5E.abilities).flatMap(([key, config]) => {
        const score = abilities[key];
        const value = Number(score?.value);
        const mod = Number(score?.mod);
        const revealKey = `stat.ability.${key}`;
        const isShown = revealed.personal.includes(revealKey);

        if (!Number.isFinite(value) || (!isShown && !isCurator)) {
            return [];
        }

        return [{
            key: revealKey,
            abbr: (config.abbreviation ?? key).toUpperCase(),
            value,
            mod: Number.isFinite(mod) ? toSigned(mod) : '',
            isShown
        }];
    });
}
