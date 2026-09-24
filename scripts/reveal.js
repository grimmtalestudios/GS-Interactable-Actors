import { FLAGS, MODULE_ID } from './constants.js';
export const REVEAL_CATEGORIES = ['dr', 'di', 'dv', 'ci', 'items', 'personal'];
export const NAME_KEY = 'name';
function isCategory(category) {
    return REVEAL_CATEGORIES.includes(category);
}
// We store reveals on the world actor, not the token
export function getRevealStore(actor) {
    if (!actor?.isToken) {
        return actor;
    }
    return actor.token?.baseActor ?? game.actors.get(actor.id) ?? actor;
}
export function getRevealed(actor) {
    const stored = (getRevealStore(actor)?.getFlag(MODULE_ID, FLAGS.revealed) ?? {});
    const entries = REVEAL_CATEGORIES.map((category) => {
        const list = stored[category];
        return [category, Array.isArray(list) ? [...list] : []];
    });
    return Object.fromEntries(entries);
}
export function isRevealed(actor, category, key) {
    return isCategory(category) && getRevealed(actor)[category].includes(key);
}
// update() replaces arrays whole
export async function writeRevealed(store, revealed) {
    await store.update({ [`flags.${MODULE_ID}.${FLAGS.revealed}`]: revealed });
}
export async function setRevealed(actor, category, key, isShown) {
    const store = getRevealStore(actor);
    if (!store || !isCategory(category) || isRevealed(store, category, key) === isShown) {
        return;
    }
    const revealed = getRevealed(store);
    const list = revealed[category];
    revealed[category] = isShown ? [...list, key] : list.filter((entry) => entry !== key);
    await writeRevealed(store, revealed);
}
export function getToggleLabel(isShown) {
    return game.i18n.localize(`${MODULE_ID}.inspect.${isShown ? 'hideEntry' : 'revealEntry'}`);
}
// Owners see the facts on their sheet
export function canCurate(actor) {
    return game.user.isGM || getRevealStore(actor)?.isOwner === true;
}
export function getKnownName(actor, tokenDoc = null) {
    const trueName = tokenDoc?.name ?? actor?.name ?? '';
    if (!actor || canCurate(actor) || getRevealed(actor).personal.includes(NAME_KEY)) {
        return trueName;
    }
    return game.i18n.localize(`${MODULE_ID}.inspect.unknownName`);
}
