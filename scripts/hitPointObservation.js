import { FLAGS, MODULE_ID } from './constants.js';
import { getObserved, isWriter, toNumber, writeObserved } from './observe.js';
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
// Each state bounds max HP: alive, unbloodied, bloodied, dead
function addDamage(tally, dealt, remaining, max) {
    const threshold = getBloodiedThreshold();
    const share = 1 - threshold;
    const isWatched = isBloodiedShown();
    const isAlive = remaining > 0;
    const isBloodied = isAlive && remaining <= max * threshold;
    const next = {
        ...tally,
        dealt: tally.dealt + dealt
    };
    if (isAlive) {
        next.low = Math.max(next.low, next.dealt + 1);
    }
    if (isAlive && !isBloodied && isWatched) {
        next.low = Math.max(next.low, Math.floor(next.dealt / share) + 1);
    }
    if (isBloodied && isWatched) {
        next.high = Math.min(next.high ?? Infinity, Math.floor(next.dealt / share));
    }
    if (!isAlive) {
        next.high = Math.min(next.high ?? Infinity, next.dealt);
        next.final = true;
    }
    return next;
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
    if (!store || tally.high === null) {
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
// Healing to full HP starts a new tally
async function noteHitPoints(actor, previous) {
    const next = actor.system.attributes?.hp;
    const holder = getTallyHolder(actor);
    const maxNow = Number(next?.effectiveMax ?? next?.max) || 0;
    const maxThen = Number(previous.effectiveMax ?? previous.max) || maxNow;
    const before = Number(previous.value) || 0;
    const after = Number(next?.value);
    const tally = toTally(holder?.getFlag(MODULE_ID, FLAGS.tally)) ?? createTally(before >= maxThen);
    if (!holder || !Number.isFinite(after) || maxNow <= 0) {
        return;
    }
    if (after > before) {
        await holder.setFlag(MODULE_ID, FLAGS.tally, after >= maxNow ? createTally(true) : {
            ...tally,
            full: false
        });
        return;
    }
    if (before - after <= 0 || tally.final) {
        return;
    }
    const counted = tally.full ? addDamage(tally, before - after, after, maxNow) : tally;
    await holder.setFlag(MODULE_ID, FLAGS.tally, counted);
    // low above high means max HP changed mid-tally
    if (counted.full && counted.high !== null && counted.low <= counted.high) {
        await recordSample(actor, holder.id, counted);
    }
}
function onUpdateActor(actor, _changes, options) {
    // dnd5e passes the pre-update HP in options.dnd5e.hp
    const previous = options.dnd5e?.hp;
    if (isWriter() && previous && actor.type === 'npc') {
        void noteHitPoints(actor, previous);
    }
}
export function registerHitPointObservation() {
    Hooks.on('updateActor', onUpdateActor);
}
