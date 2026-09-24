import { FLAGS, MODULE_ID } from './constants.js';

export interface Revealed {
    dr: string[];
    di: string[];
    dv: string[];
    ci: string[];
    items: string[];
    personal: string[];
}

const CATEGORIES: (keyof Revealed)[] = ['dr', 'di', 'dv', 'ci', 'items', 'personal'];

export const NAME_KEY = 'name';

// We store reveals on the world actor, not the token
export function getRevealStore(actor: Actor | null): Actor | null {
    if (!actor?.isToken) {
        return actor;
    }

    return actor.token?.baseActor ?? game.actors.get(actor.id) ?? actor;
}

export function getRevealed(actor: Actor | null): Revealed {
    const stored = (getRevealStore(actor)?.getFlag(MODULE_ID, FLAGS.revealed) ?? {}) as Partial<Revealed>;
    const entries = CATEGORIES.map((category) => {
        const list = stored[category];

        return [category, Array.isArray(list) ? [...list] : []];
    });

    return Object.fromEntries(entries) as Revealed;
}

// Owners see the facts on their sheet
export function canCurate(actor: Actor | null): boolean {
    return game.user.isGM || getRevealStore(actor)?.isOwner === true;
}

export function getKnownName(actor: Actor | null, tokenDoc: TokenDocument | null = null): string {
    const trueName = tokenDoc?.name ?? actor?.name ?? '';

    if (!actor || canCurate(actor) || getRevealed(actor).personal.includes(NAME_KEY)) {
        return trueName;
    }

    return game.i18n.localize(`${MODULE_ID}.inspect.unknownName`);
}
