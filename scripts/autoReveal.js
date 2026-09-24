import { MODULE_ID } from './constants.js';
import { getDamageTypeLabel } from './defences.js';
import { getRevealed, getRevealStore, writeRevealed } from './reveal.js';
import { isAnnouncingReveals, isRevealOnDamageEnabled } from './settings.js';
const CAUSES = [['resistance', 'dr'], ['immunity', 'di'], ['vulnerability', 'dv']];
// dnd5e also calculates damage for a card's previews
const calculated = new Map();
function onCalculateDamage(actor, damages) {
    calculated.set(actor.uuid, damages);
}
function toCategories(marks) {
    return CAUSES.filter(([cause]) => marks?.[cause]).map(([, category]) => category);
}
function toProofs({ type, active }) {
    if (!type || !active) {
        return [];
    }
    return [
        ...toCategories(active.type).map((category) => [category, type]),
        // Traits against all damage are revealed as ALL, not as this type
        ...toCategories(active.all).map((category) => [category, 'ALL'])
    ];
}
async function whisperReveals(actor, added) {
    const gmIds = game.users.filter((user) => user.isGM).map((user) => user.id);
    const lines = added.map(([category, key]) => game.i18n.format(`${MODULE_ID}.reveal.${category}`, {
        name: actor.name,
        type: getDamageTypeLabel(key)
    }));
    // If the whisper list is empty, everyone sees the message
    if (!gmIds.length) {
        return;
    }
    await ChatMessage.implementation.create({
        content: `<p class="gs-interactable-actors-reveal-note">${lines.join('<br>')}</p>`,
        whisper: gmIds,
        speaker: { alias: game.i18n.localize(`${MODULE_ID}.title`) }
    });
}
async function revealProofs(actor, proofs) {
    const store = getRevealStore(actor);
    // The player may own the token but not its world actor
    if (!proofs.length || !store?.canUserModify(game.user, 'update')) {
        return;
    }
    const revealed = getRevealed(store);
    const added = [];
    for (const [category, key] of proofs) {
        if (!revealed[category].includes(key)) {
            revealed[category].push(key);
            added.push([category, key]);
        }
    }
    if (!added.length) {
        return;
    }
    await writeRevealed(store, revealed);
    if (isAnnouncingReveals()) {
        await whisperReveals(actor, added);
    }
}
// dnd5e calls this right after calculateDamage in applyDamage
function onPreApplyDamage(actor) {
    const damages = calculated.get(actor.uuid);
    calculated.delete(actor.uuid);
    if (damages && isRevealOnDamageEnabled()) {
        void revealProofs(actor, damages.flatMap(toProofs));
    }
}
export function registerAutoReveal() {
    Hooks.on('dnd5e.calculateDamage', onCalculateDamage);
    Hooks.on('dnd5e.preApplyDamage', onPreApplyDamage);
}
