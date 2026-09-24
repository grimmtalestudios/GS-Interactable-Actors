import { FLAGS, MODULE_ID } from './constants.js';

export interface Revealed {
    dr: string[];
    di: string[];
    dv: string[];
    ci: string[];
    items: string[];
    personal: string[];
}

export const REVEAL_CATEGORIES: (keyof Revealed)[] = ['dr', 'di', 'dv', 'ci', 'items', 'personal'];

export const NAME_KEY = 'name';

function isCategory(category: string): category is keyof Revealed {
    return (REVEAL_CATEGORIES as string[]).includes(category);
}

// We store reveals on the world actor, not the token
export function getRevealStore(actor: Actor | null): Actor | null {
    if (!actor?.isToken) {
        return actor;
    }

    return actor.token?.baseActor ?? game.actors.get(actor.id) ?? actor;
}

export function getRevealed(actor: Actor | null): Revealed {
    const stored = (getRevealStore(actor)?.getFlag(MODULE_ID, FLAGS.revealed) ?? {}) as Partial<Revealed>;
    const entries = REVEAL_CATEGORIES.map((category) => {
        const list = stored[category];

        return [category, Array.isArray(list) ? [...list] : []];
    });

    return Object.fromEntries(entries) as Revealed;
}

export function isRevealed(actor: Actor | null, category: string, key: string): boolean {
    return isCategory(category) && getRevealed(actor)[category].includes(key);
}

// update() replaces arrays whole
export async function writeRevealed(store: Actor, revealed: Revealed): Promise<void> {
    await store.update({ [`flags.${MODULE_ID}.${FLAGS.revealed}`]: revealed });
}

export async function setRevealed(actor: Actor | null, category: string, key: string, isShown: boolean): Promise<void> {
    const store = getRevealStore(actor);

    if (!store || !isCategory(category) || isRevealed(store, category, key) === isShown) {
        return;
    }

    const revealed = getRevealed(store);
    const list = revealed[category];

    revealed[category] = isShown ? [...list, key] : list.filter((entry) => entry !== key);
    await writeRevealed(store, revealed);
}

export function getToggleLabel(isShown: boolean): string {
    return game.i18n.localize(`${MODULE_ID}.inspect.${isShown ? 'hideEntry' : 'revealEntry'}`);
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
