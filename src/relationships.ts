import { MODULE_ID } from './constants.js';
import { isShowingRelationships } from './settings.js';

interface Relationship {
    label: string;
    value: number | null;
    max: number | null;
    percent: number | null;
    description: string;
    tone: string;
}

const TRACKER_ID = 'GS-Relationship-Tracker';

// Older tracker versions expose the later names in this list
const METHODS = ['describe', 'relationshipFor', 'relationFor', 'getRelationship'];

const log = Grimmtale.createLogger(MODULE_ID);

function toRelationship(entry: unknown): Relationship | null {
    const { label, value, max, description, tone } = (entry ?? {}) as Record<string, unknown>;
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
        description: typeof description === 'string' ? description : '',
        tone: typeof tone === 'string' ? tone : ''
    };
}

export function getRelationships(actor: Actor | null, user: User | null): Relationship[] | null {
    const viewer = user?.character;

    // Relationships are between characters
    if (!actor || !viewer) {
        return null;
    }

    try {
        const found = Grimmtale.callPeer(TRACKER_ID, METHODS, [actor, viewer], null);
        const entries = [found].flat().map(toRelationship).filter((entry) => entry !== null);

        return entries.length ? entries : null;
    } catch (err) {

        // Don't let a tracker error break the window
        log.warn('The Relationship Tracker lookup failed', err);

        return null;
    }
}

export function getFriendlyRelationships(actor: Actor, tokenDoc: TokenDocument | null): Relationship[] | null {
    const disposition = tokenDoc?.disposition ?? actor.prototypeToken?.disposition;

    if (!isShowingRelationships() || actor.type !== 'npc' || disposition !== CONST.TOKEN_DISPOSITIONS.FRIENDLY) {
        return null;
    }

    return getRelationships(actor, game.user);
}
