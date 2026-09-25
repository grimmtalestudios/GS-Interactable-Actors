import { MODULE_ID } from './constants.js';
import { type ArmourRange, getObserved, isWriter, writeObserved } from './observe.js';
import { getRevealStore } from './reveal.js';
import { isAnnouncingReveals } from './settings.js';
import { whisperToGM } from './whisper.js';

interface Swing {
    total: number;
    isHit: boolean;
}

interface StoreSwings {
    store: Actor;
    actor: Actor;
    swings: Swing[];
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

function isSameRange(a: ArmourRange, b: ArmourRange): boolean {
    return a.min === b.min && a.max === b.max && a.swings === b.swings;
}

function isNewlyPinned(before: ArmourRange, after: ArmourRange): boolean {
    return after.min !== null && after.min === after.max && before.min !== before.max;
}

async function whisperPinnedArmour(actor: Actor, ac: ArmourRange): Promise<void> {
    await whisperToGM([game.i18n.format(`${MODULE_ID}.reveal.acPinned`, {
        name: actor.name,
        ac: ac.min
    })]);
}

async function observeSwings(store: Actor, actor: Actor, swings: Swing[]): Promise<void> {
    const observed = getObserved(store);
    const before = { ...observed.ac };

    for (const swing of swings) {
        narrowArmour(observed.ac, swing);
    }

    if (isSameRange(before, observed.ac)) {
        return;
    }

    await writeObserved(store, observed);

    if (isNewlyPinned(before, observed.ac) && isAnnouncingReveals()) {
        await whisperPinnedArmour(actor, observed.ac);
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
        await observeSwings(store, actor, swings);
    }
}

export function registerArmourObservation(): void {
    Hooks.on('createChatMessage', onCreateChatMessage);
}
