import { FLAGS, MODULE_ID } from './constants.js';
import { getRevealStore } from './reveal.js';
import { isObservingCombat } from './settings.js';
export function toNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function toSample(stored) {
    const min = toNumber(stored?.min);
    const max = toNumber(stored?.max);
    if (min === null || max === null || max < min) {
        return null;
    }
    return {
        key: String(stored?.key ?? ''),
        min,
        max,
        final: stored?.final === true
    };
}
export function getObserved(actor) {
    const stored = (getRevealStore(actor)?.getFlag(MODULE_ID, FLAGS.observed) ?? {});
    const samples = Array.isArray(stored.hp?.samples) ? stored.hp.samples : [];
    return {
        ac: {
            min: toNumber(stored.ac?.min),
            max: toNumber(stored.ac?.max),
            swings: Math.max(0, Math.round(Number(stored.ac?.swings) || 0))
        },
        hp: { samples: samples.map(toSample).filter((sample) => sample !== null) }
    };
}
// Written whole to drop forgotten samples
export async function writeObserved(store, observed) {
    await store.update({ [`flags.${MODULE_ID}.${FLAGS.observed}`]: observed });
}
// Tallies on placed tokens aren't reset
export async function forgetObserved(actor, stat) {
    const store = getRevealStore(actor);
    const observed = getObserved(store);
    if (!store || (stat !== 'ac' && stat !== 'hp')) {
        return;
    }
    if (stat === 'ac') {
        observed.ac = {
            min: null,
            max: null,
            swings: 0
        };
    }
    else {
        observed.hp = { samples: [] };
    }
    await writeObserved(store, observed);
}
// One client writes so a card isn't counted twice
export function isWriter() {
    return game.users.activeGM?.isSelf === true && isObservingCombat();
}
