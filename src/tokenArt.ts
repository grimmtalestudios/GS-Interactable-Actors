import { FLAGS, MODULE_ID } from './constants.js';

export interface ArtBand {
    threshold: number;
    img: string;
}

export interface ArtConfig {
    enabled: boolean;
    resource: string;
    mode: 'percent' | 'value';
    bands: ArtBand[];
}

interface BaseArt {
    src: string | null;
    subject: string | null;
}

interface Resource {
    value: number;
    max: number | null;
}

interface TokenCounts {
    tokens: number;
    scenes: number;
}

export const DEFAULT_RESOURCE = 'attributes.hp';

// The active GM writes for everyone
function isWriter(): boolean {
    return game.users.activeGM?.isSelf === true;
}

export function getArtConfig(actor: Actor | null): ArtConfig {
    const stored = (actor?.getFlag(MODULE_ID, FLAGS.tokenArt) ?? {}) as Partial<Record<keyof ArtConfig, unknown>>;
    const resource = typeof stored.resource === 'string' ? stored.resource.trim() : '';
    const bands = (Array.isArray(stored.bands) ? stored.bands : []) as Partial<ArtBand>[];

    return {
        enabled: stored.enabled === true,
        resource: resource || DEFAULT_RESOURCE,
        mode: stored.mode === 'value' ? 'value' : 'percent',
        bands: bands
            .map((band) => ({
                threshold: Number(band?.threshold),
                img: typeof band?.img === 'string' ? band.img.trim() : ''
            }))
            .filter((band) => Number.isFinite(band.threshold) && band.img)
    };
}

function getResource(actor: Actor | null, path: string): Resource | null {
    const found = foundry.utils.getProperty(actor?.system ?? {}, path);

    // Bare numbers have no max
    const pool = (typeof found === 'object' ? found : { value: found }) as HitPoints | null;
    const value = Number(pool?.value);

    // Includes temp max so Heroes' Feast doesn't count as damage
    const max = Number(pool?.effectiveMax ?? pool?.max);

    if (found === null || found === undefined || !Number.isFinite(value)) {
        return null;
    }

    return {
        value,
        max: Number.isFinite(max) && max > 0 ? max : null
    };
}

export function getReading(actor: Actor, path: string): string | null {
    const resource = getResource(actor, path);

    if (!resource) {
        return null;
    }

    return resource.max === null ? `${resource.value}` : `${resource.value} / ${resource.max}`;
}

export function resolveArt(actor: Actor | null): string | null {
    const config = getArtConfig(actor);
    const resource = config.enabled && config.bands.length ? getResource(actor, config.resource) : null;
    const isPercent = config.mode === 'percent';

    if (!resource || (isPercent && !resource.max)) {
        return null;
    }

    const measure = isPercent ? resource.value / (resource.max ?? 1) * 100 : resource.value;
    const reached = config.bands.filter((band) => measure <= band.threshold);

    reached.sort((a, b) => a.threshold - b.threshold);

    return reached[0]?.img ?? null;
}

function getBandUpdate(tokenDoc: TokenDocument, img: string, base: BaseArt | undefined): TokenUpdate | null {
    if (tokenDoc.texture.src === img) {
        return null;
    }

    const update: TokenUpdate = {
        _id: tokenDoc.id,
        'texture.src': img
    };

    if (!base) {
        update[`flags.${MODULE_ID}.${FLAGS.baseArt}`] = {
            src: tokenDoc.texture.src ?? null,
            subject: tokenDoc.ring.subject.texture || null
        };
    }

    // If the subject texture is empty, the ring shows texture.src
    if (tokenDoc.ring.enabled && tokenDoc.ring.subject.texture) {
        update['ring.subject.texture'] = img;
    }

    return update;
}

// Store the token's art from before the first band
function getArtUpdate(tokenDoc: TokenDocument, img: string | null): TokenUpdate | null {
    const base = tokenDoc.getFlag(MODULE_ID, FLAGS.baseArt) as BaseArt | undefined;

    if (img) {
        return getBandUpdate(tokenDoc, img, base);
    }

    if (!base) {
        return null;
    }

    const update: TokenUpdate = {
        _id: tokenDoc.id,
        [`flags.${MODULE_ID}.-=${FLAGS.baseArt}`]: null
    };

    if (base.src) {
        update['texture.src'] = base.src;
    }

    if (base.subject && tokenDoc.ring.subject.texture !== undefined) {
        update['ring.subject.texture'] = base.subject;
    }

    return update;
}

function getTokensByScene(actor: Actor): Map<Scene, TokenDocument[]> {
    const byScene = new Map<Scene, TokenDocument[]>();

    if (actor.isToken) {
        return actor.token?.parent ? byScene.set(actor.token.parent, [actor.token]) : byScene;
    }

    for (const scene of game.scenes) {
        const tokens = scene.tokens.filter((tokenDoc) => tokenDoc.actorLink && tokenDoc.actorId === actor.id);

        if (tokens.length) {
            byScene.set(scene, tokens);
        }
    }

    return byScene;
}

export async function applyArtForActor(actor: Actor | null): Promise<void> {
    const img = resolveArt(actor);

    if (!actor || !isWriter()) {
        return;
    }

    for (const [scene, tokens] of getTokensByScene(actor)) {
        const updates = tokens.map((tokenDoc) => getArtUpdate(tokenDoc, img)).filter((update) => update !== null);

        if (updates.length) {

            // Updates placed tokens, not the prototype token
            await scene.updateEmbeddedDocuments('Token', updates, { animation: {} });
        }
    }
}

export function getTokenCounts(actor: Actor): TokenCounts {
    const byScene = [...getTokensByScene(actor).values()];

    return {
        tokens: byScene.flat().length,
        scenes: byScene.length
    };
}

// Macros may pass a partial config
export async function setArtConfig(actor: Actor | null, config: Partial<ArtConfig> | null): Promise<void> {
    if (!actor) {
        return;
    }

    if (config?.enabled || config?.bands?.length) {
        await actor.setFlag(MODULE_ID, FLAGS.tokenArt, config);
    } else {
        await actor.unsetFlag(MODULE_ID, FLAGS.tokenArt);
    }

    await applyArtForActor(actor);
}

// New tokens get the prototype token's texture
async function onCreateToken(tokenDoc: TokenDocument): Promise<void> {
    const update = isWriter() && tokenDoc.actor ? getArtUpdate(tokenDoc, resolveArt(tokenDoc.actor)) : null;

    if (update) {
        const { _id, ...changes } = update;

        await tokenDoc.update(changes, { animation: {} });
    }
}

function isArtChange(changes: ActorUpdate): boolean {
    const flags = changes.flags?.[MODULE_ID] ?? {};

    return 'system' in changes || FLAGS.tokenArt in flags || `-=${FLAGS.tokenArt}` in flags;
}

function onUpdateActor(actor: Actor, changes: ActorUpdate): void {
    if (isArtChange(changes)) {
        void applyArtForActor(actor);
    }
}

export function registerTokenArt(): void {
    Hooks.on('updateActor', onUpdateActor);
    Hooks.on('createToken', onCreateToken);
}
