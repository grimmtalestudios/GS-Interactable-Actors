import { FLAGS, MODULE_ID } from './constants.js';
import { getRevealStore } from './reveal.js';
import { isAnnouncingReveals, isObservingCombat } from './settings.js';
import { whisperToGM } from './whisper.js';

export interface ArmourRange {
    min: number | null;
    max: number | null;
    swings: number;
}

export interface Sample {
    key: string;
    min: number;
    max: number;
    final: boolean;
    at?: number;
}

export interface Observed {
    ac: ArmourRange;
    hp: { samples: Sample[] };
}

interface Swing {
    total: number;
    isHit: boolean;
}

interface StoreSwings {
    store: Actor;
    actor: Actor;
    swings: Swing[];
}

interface Tally {
    full: boolean;
    dealt: number;
    low: number;
    high: number | null;
    final: boolean;
}

// enough for an average
const SAMPLE_LIMIT = 20;

function toNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toSample(stored: Record<string, unknown> | undefined): Sample | null {
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

export function getObserved(actor: Actor | null): Observed {
    const stored = (getRevealStore(actor)?.getFlag(MODULE_ID, FLAGS.observed) ?? {}) as {
        ac?: Record<string, unknown>,
        hp?: { samples?: unknown }
    };
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
async function writeObserved(store: Actor, observed: Observed): Promise<void> {
    await store.update({ [`flags.${MODULE_ID}.${FLAGS.observed}`]: observed });
}

// Tallies on placed tokens aren't reset
export async function forgetObserved(actor: Actor, stat: string): Promise<void> {
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
    } else {
        observed.hp = { samples: [] };
    }

    await writeObserved(store, observed);
}

// One client writes so a card isn't counted twice
function isWriter(): boolean {
    return game.users.activeGM?.isSelf === true && isObservingCombat();
}

// Natural 20s hit and 1s miss regardless of AC
function isNatural(roll: D20Roll): boolean {
    const face = roll.d20?.results.find((result) => result.active !== false)?.result;

    return roll.isCritical || roll.isFumble || face === 20 || face === 1;
}

function narrowArmour(ac: ArmourRange, { total, isHit }: Swing): void {
    const isContradicted = isHit ? ac.min !== null && total < ac.min : ac.max !== null && total + 1 > ac.max;

    // The AC has changed since the earlier swings
    if (isContradicted) {
        ac.min = isHit ? null : total + 1;
        ac.max = isHit ? total : null;
        ac.swings = 1;

        return;
    }

    if (isHit) {
        ac.max = Math.min(ac.max ?? Infinity, total);
    } else {
        ac.min = Math.max(ac.min ?? -Infinity, total + 1);
    }

    ac.swings += 1;
}

async function noteSwings(store: Actor, actor: Actor, swings: Swing[]): Promise<void> {
    const observed = getObserved(store);
    const before = { ...observed.ac };

    for (const swing of swings) {
        narrowArmour(observed.ac, swing);
    }

    const { min, max } = observed.ac;

    if (before.min === min && before.max === max && before.swings === observed.ac.swings) {
        return;
    }

    await writeObserved(store, observed);

    // Whisper the GM once, when the range narrows to one value
    if (min !== null && min === max && before.min !== before.max && isAnnouncingReveals()) {
        await whisperToGM([game.i18n.format(`${MODULE_ID}.reveal.acPinned`, {
            name: actor.name,
            ac: min
        })]);
    }
}

// One write per reveal store
function getSwingsByStore(targets: AttackTarget[], rolls: D20Roll[]): StoreSwings[] {
    const byStore = new Map<string, StoreSwings>();

    for (const { uuid, ac } of targets) {
        const actor = typeof ac === 'number' && uuid ? fromUuidSync(uuid) : null;
        const store = actor?.type === 'npc' ? getRevealStore(actor) : null;

        if (!actor || !store || typeof ac !== 'number') {
            continue;
        }

        const entry = byStore.get(store.uuid) ?? {
            store,
            actor,
            swings: []
        };

        entry.swings.push(...rolls.map((each) => ({
            total: each.total,
            isHit: each.total >= ac
        })));
        byStore.set(store.uuid, entry);
    }

    return [...byStore.values()];
}

async function onCreateChatMessage(message: ChatMessage): Promise<void> {

    // dnd5e stores each target's AC on the card, except under total cover
    const { roll, targets } = message.flags.dnd5e ?? {};

    if (!isWriter() || roll?.type !== 'attack' || !Array.isArray(targets)) {
        return;
    }

    const rolls = message.rolls.filter((each): each is D20Roll => {
        return each instanceof CONFIG.Dice.D20Roll && typeof each.total === 'number' && !isNatural(each);
    });

    for (const { store, actor, swings } of getSwingsByStore(targets, rolls)) {
        await noteSwings(store, actor, swings);
    }
}

function getBloodiedThreshold(): number {
    const threshold = Number(CONFIG.DND5E.bloodied?.threshold);

    return threshold > 0 && threshold < 1 ? threshold : 0.5;
}

// Players don't see bloodied when dnd5e's setting is none
function isBloodiedShown(): boolean {
    return game.settings.get('dnd5e', 'bloodied') !== 'none';
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

// Each state bounds max HP: alive, unbloodied, bloodied, dead
function addDamage(tally: Tally, dealt: number, remaining: number, max: number): Tally {
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

function getTallyHolder(actor: Actor): TokenDocument | Actor | null {
    if (actor.isToken) {
        return actor.token;
    }

    return actor.getActiveTokens(true, true)[0] ?? actor;
}

async function recordSample(actor: Actor, key: string, tally: Tally): Promise<void> {
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
        final: tally.final,
        at: Date.now()
    }].slice(-SAMPLE_LIMIT);
    await writeObserved(store, observed);
}

// Healing to full HP starts a new tally
async function noteHitPoints(actor: Actor, previous: HitPoints): Promise<void> {
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

function onUpdateActor(actor: Actor, _changes: object, options: { dnd5e?: { hp?: HitPoints } }): void {

    // dnd5e passes the pre-update HP in options.dnd5e.hp
    const previous = options.dnd5e?.hp;

    if (isWriter() && previous && actor.type === 'npc') {
        void noteHitPoints(actor, previous);
    }
}

export function registerObservation(): void {
    Hooks.on('createChatMessage', onCreateChatMessage);
    Hooks.on('updateActor', onUpdateActor);
}
