import { FLAGS, MODULE_ID } from './constants.js';
import { getObserved, isWriter, queueWrite, toNumber, writeObserved } from './observe.js';
import { getRevealStore } from './reveal.js';
const SAMPLE_LIMIT = 20; // enough for an average
function getBloodiedThreshold() {
    const threshold = Number(CONFIG.DND5E.bloodied?.threshold);
    return threshold > 0 && threshold < 1 ? threshold : 0.5;
}
// Players don't see bloodied when dnd5e's setting is none
function isBloodiedShown() {
    return game.settings.get('dnd5e', 'bloodied') !== 'none';
}
function createTally(isFull) {
    return {
        full: isFull,
        dealt: 0,
        low: 1,
        high: null,
        final: false
    };
}
function toTally(stored) {
    const tally = stored;
    if (!tally || typeof tally !== 'object') {
        return null;
    }
    return {
        full: tally.full === true,
        dealt: Math.max(0, toNumber(tally.dealt) ?? 0),
        low: toNumber(tally.low) ?? 1,
        high: toNumber(tally.high),
        final: tally.final === true
    };
}
function addBloodiedBound(tally, remaining, max) {
    if (!isBloodiedShown()) {
        return tally;
    }
    const threshold = getBloodiedThreshold();
    const bloodiedMax = Math.floor(tally.dealt / (1 - threshold));
    if (remaining <= max * threshold) {
        return {
            ...tally,
            high: Math.min(tally.high ?? Infinity, bloodiedMax)
        };
    }
    return {
        ...tally,
        low: Math.max(tally.low, bloodiedMax + 1)
    };
}
// Each state bounds max HP: alive, unbloodied, bloodied, dead
function addDamage(tally, damage, remaining, max) {
    const dealt = tally.dealt + damage;
    if (remaining <= 0) {
        return {
            ...tally,
            dealt,
            high: Math.min(tally.high ?? Infinity, dealt),
            final: true
        };
    }
    return addBloodiedBound({
        ...tally,
        dealt,
        low: Math.max(tally.low, dealt + 1)
    }, remaining, max);
}
function nextTally(tally, before, after, max) {
    if (after > before) {
        // Healing to full HP starts a new tally
        return after >= max ? createTally(true) : {
            ...tally,
            full: false
        };
    }
    if (after === before || tally.final) {
        return null;
    }
    return tally.full ? addDamage(tally, before - after, after, max) : tally;
}
function getTallyHolder(actor) {
    if (actor.isToken) {
        return actor.token;
    }
    return actor.getActiveTokens(true, true)[0] ?? actor;
}
async function recordSample(actor, key, tally) {
    const store = getRevealStore(actor);
    const observed = getObserved(store);
    // low above high means max HP changed mid-tally
    if (!store || !tally.full || tally.high === null || tally.low > tally.high) {
        return;
    }
    // The same tally can be sampled at bloodied and at death
    observed.hp.samples = [...observed.hp.samples.filter((sample) => sample.key !== key), {
            key,
            min: tally.low,
            max: tally.high,
            final: tally.final
        }].slice(-SAMPLE_LIMIT);
    await writeObserved(store, observed);
}
async function noteHitPoints(actor, previous, next) {
    const holder = getTallyHolder(actor);
    const maxNow = Number(next?.effectiveMax ?? next?.max) || 0;
    const maxThen = Number(previous.effectiveMax ?? previous.max) || maxNow;
    const before = Number(previous.value) || 0;
    const after = Number(next?.value);
    const tally = toTally(holder?.getFlag(MODULE_ID, FLAGS.tally)) ?? createTally(before >= maxThen);
    if (!holder || !Number.isFinite(after) || maxNow <= 0) {
        return;
    }
    const counted = nextTally(tally, before, after, maxNow);
    if (!counted) {
        return;
    }
    await holder.setFlag(MODULE_ID, FLAGS.tally, counted);
    await recordSample(actor, holder.id, counted);
}
function onUpdateActor(actor, _changes, options) {
    // dnd5e passes the pre-update HP in options.dnd5e.hp
    const previous = options.dnd5e?.hp;
    const next = actor.system.attributes?.hp; // read before a later update replaces it
    const store = getRevealStore(actor);
    if (isWriter() && previous && store && actor.type === 'npc') {
        void queueWrite(store, () => noteHitPoints(actor, previous, next));
    }
}
export function registerHitPointObservation() {
    Hooks.on('updateActor', onUpdateActor);
}
