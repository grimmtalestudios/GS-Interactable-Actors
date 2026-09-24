import { FLAGS, MODULE_ID } from './constants.js';
const CATEGORIES = ['dr', 'di', 'dv', 'ci', 'items', 'personal'];
export const NAME_KEY = 'name';
// We store reveals on the world actor, not the token
export function getRevealStore(actor) {
    if (!actor?.isToken) {
        return actor;
    }
    return actor.token?.baseActor ?? game.actors.get(actor.id) ?? actor;
}
export function getRevealed(actor) {
    const stored = (getRevealStore(actor)?.getFlag(MODULE_ID, FLAGS.revealed) ?? {});
    const entries = CATEGORIES.map((category) => {
        const list = stored[category];
        return [category, Array.isArray(list) ? [...list] : []];
    });
    return Object.fromEntries(entries);
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
