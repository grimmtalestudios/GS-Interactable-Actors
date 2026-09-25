import { MODULE_ID } from './constants.js';
import { enrich } from './enrich.js';
import { getToggleLabel, type Revealed, toEntry } from './reveal.js';

const FACTS = ['alignment', 'eyes', 'height', 'faith', 'hair', 'weight', 'gender', 'skin', 'age'];

const PASSAGES = [
    ['ideals', 'ideal'],
    ['personalityTraits', 'trait'],
    ['bonds', 'bond'],
    ['appearance', 'appearance'],
    ['flaws', 'flaw']
];

const localize = Grimmtale.createLocalizer(`${MODULE_ID}.personal`);

function toSlug(name: string): string {
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function getClassRows(actor: Actor, revealed: Revealed, isCurator: boolean) {
    return (['class', 'subclass'] as const).flatMap((group) => {
        const entries = (actor.itemTypes[group] ?? [])
            .filter((item) => item.name.trim())
            .map((item) => {

                // Item ids differ between copies of an actor
                const key = `${group}:${toSlug(item.name)}`;

                // Reveals from before per-class keys used the group key
                const isShown = revealed.personal.includes(key) || revealed.personal.includes(group);

                return {
                    key,
                    name: item.name.trim(),
                    img: item.img,
                    isShown,
                    toggleLabel: getToggleLabel(isShown)
                };
            })
            .filter((entry) => entry.isShown || isCurator);

        return entries.length ? [{
            label: localize(group),
            entries
        }] : [];
    });
}

function getFacts(actor: Actor, revealed: Revealed, isCurator: boolean) {
    const details = actor.system.details ?? {};

    return FACTS
        .map((key) => toEntry({
            key,
            label: localize(key),
            value: String(details[key] ?? '').trim()
        }, revealed))
        .filter((fact) => fact.value && (fact.isShown || isCurator));
}

async function getPassages(actor: Actor, revealed: Revealed, isCurator: boolean) {
    const details = actor.system.details ?? {};
    const passages = PASSAGES
        .map(([key, field]) => toEntry({
            key,
            label: localize(key),
            text: String(details[field] ?? '').trim()
        }, revealed))
        .filter((passage) => passage.text && (passage.isShown || isCurator));

    return Promise.all(passages.map(async (passage) => ({
        ...passage,
        html: await enrich(passage.text, actor)
    })));
}

export async function getPersonal(actor: Actor, revealed: Revealed, isCurator: boolean) {

    // dnd5e keeps these details on character sheets
    if (actor.type !== 'character') {
        return null;
    }

    const classes = getClassRows(actor, revealed, isCurator);
    const facts = getFacts(actor, revealed, isCurator);
    const passages = await getPassages(actor, revealed, isCurator);

    return classes.length || facts.length || passages.length ? {
        classes,
        facts,
        passages
    } : null;
}

export async function getBiographies(actor: Actor, revealed: Revealed, isCurator: boolean) {
    const { value = '', public: blurb = '' } = actor.system.details?.biography ?? {};

    if (actor.type !== 'character') {
        return [];
    }

    const biographies = [['biography', value], ['biographyPublic', blurb]]
        .map(([key, text]) => toEntry({
            key,
            label: localize(key),
            text: text.trim()
        }, revealed))
        .filter((biography) => biography.text && (biography.isShown || isCurator));

    return Promise.all(biographies.map(async (biography) => ({
        ...biography,
        html: await enrich(biography.text, actor)
    })));
}

export async function getLore(actor: Actor, revealed: Revealed, isCurator: boolean) {
    const text = actor.type === 'character' ? '' : actor.system.details?.biography?.public ?? '';
    const lore = toEntry({ key: 'biographyPublic' }, revealed);

    // GMs write secrets in the public biography too
    if (!text || (!lore.isShown && !isCurator)) {
        return null;
    }

    return {
        ...lore,
        html: await enrich(text, actor)
    };
}
