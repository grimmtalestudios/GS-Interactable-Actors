const TRACKER_ID = 'GS-Relationship-Tracker';
// Older tracker versions expose the later names in this list
const METHODS = ['describe', 'relationshipFor', 'relationFor', 'getRelationship'];
function toRelationship(entry) {
    const { label, value, max, description } = (entry ?? {});
    const amount = Number(value);
    const limit = Number(max);
    const hasMeter = Number.isFinite(amount) && Number.isFinite(limit) && limit > 0;
    if (typeof label !== 'string') {
        return null;
    }
    return {
        label,
        value: hasMeter ? amount : null,
        max: hasMeter ? limit : null,
        percent: hasMeter ? Math.round(Math.clamp(amount / limit * 100, 0, 100)) : null,
        description: typeof description === 'string' ? description : ''
    };
}
export function getRelationships(actor, user) {
    const viewer = user?.character;
    // Relationships are between characters
    if (!actor || !viewer) {
        return null;
    }
    const found = Grimmtale.callPeer(TRACKER_ID, METHODS, [actor, viewer], null);
    const entries = [found].flat().map(toRelationship).filter((entry) => entry !== null);
    return entries.length ? entries : null;
}
export function getFriendlyRelationships(actor, tokenDoc) {
    const disposition = tokenDoc?.disposition ?? actor.prototypeToken?.disposition;
    if (actor.type !== 'npc' || disposition !== CONST.TOKEN_DISPOSITIONS.FRIENDLY) {
        return null;
    }
    return getRelationships(actor, game.user);
}
