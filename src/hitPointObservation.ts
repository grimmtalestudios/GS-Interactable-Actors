import { FLAGS, MODULE_ID } from './constants.js';
import { getObserved, isWriter, toNumber, writeObserved } from './observe.js';
import { getRevealStore } from './reveal.js';

interface Tally {
    full: boolean;
    dealt: number;
    low: number;
    high: number | null;
    final: boolean;
}

const SAMPLE_LIMIT = 20; // enough for an average

function getBloodiedThreshold(): number {
    const threshold = Number(CONFIG.DND5E.bloodied?.threshold);

    return threshold > 0 && threshold < 1 ? threshold : 0.5;
}

// dnd5e's isConcealed hides bloodied from players unless the token is friendly
function isBloodiedShown(actor: Actor): boolean {
    const mode = game.settings.get('dnd5e', 'bloodied');

    return mode === 'all' || (mode === 'player' && actor.token?.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY);
}

function createTally(isFull: boolean): Tally {
    return {
        full: isFull,
        dealt: 0,
        low: 1,
        high: null,
        final: false
    };
}

function toTally(stored: unknown): Tally | null {
    const tally = stored as Record<string, unknown> | undefined;

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

function addBloodiedBound(tally: Tally, remaining: number, max: number, actor: Actor): Tally {
    if (!isBloodiedShown(actor)) {
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
function addDamage(tally: Tally, damage: number, remaining: number, max: number, actor: Actor): Tally {
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
    }, remaining, max, actor);
}

function nextTally(tally: Tally, before: number, after: number, max: number, actor: Actor): Tally | null {
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

    return tally.full ? addDamage(tally, before - after, after, max, actor) : tally;
}

function getTallyHolder(actor: Actor): TokenDocument | Actor | null {
    return actor.isToken ? actor.token : actor; // one tally per linked creature across scenes
}

async function recordSample(actor: Actor, key: string, tally: Tally): Promise<void> {
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

async function noteHitPoints(actor: Actor, previous: HitPoints, next: HitPoints | undefined): Promise<void> {
    const holder = getTallyHolder(actor);
    const maxNow = Number(next?.effectiveMax ?? next?.max) || 0;
    const maxThen = Number(previous.effectiveMax ?? previous.max) || maxNow;
    const before = Number(previous.value) || 0;
    const after = Number(next?.value);
    const tally = toTally(holder?.getFlag(MODULE_ID, FLAGS.tally)) ?? createTally(before >= maxThen);

    if (!holder || !Number.isFinite(after) || maxNow <= 0) {
        return;
    }

    const counted = nextTally(tally, before, after, maxNow, actor);

    if (!counted) {
        return;
    }

    await holder.setFlag(MODULE_ID, FLAGS.tally, counted);
    await recordSample(actor, holder.id, counted);
}

function onUpdateActor(actor: Actor, _changes: object, options: { dnd5e?: { hp?: HitPoints } }): void {

    // dnd5e passes the pre-update HP in options.dnd5e.hp
    const previous = options.dnd5e?.hp;
    const next = actor.system.attributes?.hp; // read before a later update replaces it
    const store = getRevealStore(actor);

    if (isWriter() && previous && store && actor.type === 'npc') {

        // dnd5e applies damage to every controlled token at once
        void Grimmtale.queueWrite(store.uuid, () => noteHitPoints(actor, previous, next));
    }
}

export function registerHitPointObservation(): void {
    Hooks.on('updateActor', onUpdateActor);
}
