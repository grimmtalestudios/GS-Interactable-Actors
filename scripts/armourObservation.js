import { MODULE_ID } from './constants.js';
import { getObserved, isWriter, writeObserved } from './observe.js';
import { getRevealStore } from './reveal.js';
import { isAnnouncingReveals } from './settings.js';
import { whisperToGM } from './whisper.js';
// Natural 20s hit and 1s miss regardless of AC
function isNatural(roll) {
    const face = roll.d20?.results.find((result) => result.active !== false)?.result;
    return roll.isCritical || roll.isFumble || face === 20 || face === 1;
}
function narrowArmour(ac, { total, isHit }) {
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
    }
    else {
        ac.min = Math.max(ac.min ?? -Infinity, total + 1);
    }
    ac.swings += 1;
}
async function noteSwings(store, actor, swings) {
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
function getSwingsByStore(targets, rolls) {
    const byStore = new Map();
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
async function onCreateChatMessage(message) {
    // dnd5e stores each target's AC on the card, except under total cover
    const { roll, targets } = message.flags.dnd5e ?? {};
    if (!isWriter() || roll?.type !== 'attack' || !Array.isArray(targets)) {
        return;
    }
    const rolls = message.rolls.filter((each) => {
        return each instanceof CONFIG.Dice.D20Roll && typeof each.total === 'number' && !isNatural(each);
    });
    for (const { store, actor, swings } of getSwingsByStore(targets, rolls)) {
        await noteSwings(store, actor, swings);
    }
}
export function registerArmourObservation() {
    Hooks.on('createChatMessage', onCreateChatMessage);
}
