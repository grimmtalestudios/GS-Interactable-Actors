import { MODULE_ID } from './constants.js';
import { getRevealed, getRevealStore, writeRevealed } from './reveal.js';
import { isAnnouncingReveals, isRevealOnDamageEnabled } from './settings.js';
import { getDamageTypeLabel } from './systemLabels.js';
import { whisperToGM } from './whisper.js';

type ProvenCategory = 'dr' | 'di' | 'dv';

type Proof = [category: ProvenCategory, key: string];

const CAUSES = [['resistance', 'dr'], ['immunity', 'di'], ['vulnerability', 'dv']] as const;

// dnd5e also calculates damage for a card's previews
const calculated = new Map<string, DamageDescription[]>();

function onCalculateDamage(actor: Actor, damages: DamageDescription[]): void {
    calculated.set(actor.uuid, damages);
}

function toCategories(marks: DamageMarks | undefined): ProvenCategory[] {
    return CAUSES.filter(([cause]) => marks?.[cause]).map(([, category]) => category);
}

function toProofs({ type, active }: DamageDescription): Proof[] {
    if (!type || !active) {
        return [];
    }

    return [
        ...toCategories(active.type).map((category): Proof => [category, type]),

        // Traits against all damage are revealed as ALL, not as this type
        ...toCategories(active.all).map((category): Proof => [category, 'ALL'])
    ];
}

async function whisperReveals(actor: Actor, added: Proof[]): Promise<void> {
    await whisperToGM(added.map(([category, key]) => game.i18n.format(`${MODULE_ID}.reveal.${category}`, {
        name: actor.name,
        type: getDamageTypeLabel(key)
    })));
}

async function revealProofs(actor: Actor, proofs: Proof[]): Promise<void> {
    const store = getRevealStore(actor);

    // The player may own the token but not its world actor
    if (!proofs.length || !store?.canUserModify(game.user, 'update')) {
        return;
    }

    const revealed = getRevealed(store);
    const added: Proof[] = [];

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
function onPreApplyDamage(actor: Actor): void {
    const damages = calculated.get(actor.uuid);

    calculated.delete(actor.uuid);

    if (damages && isRevealOnDamageEnabled()) {
        void revealProofs(actor, damages.flatMap(toProofs));
    }
}

export function registerAutoReveal(): void {
    Hooks.on('dnd5e.calculateDamage', onCalculateDamage);
    Hooks.on('dnd5e.preApplyDamage', onPreApplyDamage);
}
