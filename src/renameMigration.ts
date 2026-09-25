import { FLAGS, MODULE_ID } from './constants.js';
import { REVEAL_CATEGORIES, type Revealed } from './reveal.js';
import { isRenameMigrated } from './settings.js';

type Flags = Record<string, unknown>;

interface Carried {
    actors: number;
    tokens: number;
}

const OLD_MODULE_ID = 'Interactable-Actors';

const log = Grimmtale.createLogger(MODULE_ID);

// Merging keeps every reveal from both stores
function mergeRevealed(...stores: unknown[]): Partial<Revealed> {
    const merged: Partial<Revealed> = {};

    for (const category of REVEAL_CATEGORIES) {
        const entries = stores.flatMap((store) => {
            const list = (store as Partial<Revealed> | undefined)?.[category];

            return Array.isArray(list) ? list : [];
        });

        if (entries.length) {
            merged[category] = [...new Set(entries)];
        }
    }

    return merged;
}

function getMissingFlags(stale: Flags | undefined, current: Flags | undefined): Flags {
    return Object.fromEntries(Object.entries(stale ?? {}).filter(([key]) => !(key in (current ?? {}))));
}

function getDeltaReveals(tokenDoc: TokenDocument) {
    const flags = (tokenDoc.delta?.toObject().flags ?? {}) as Record<string, Flags | undefined>;

    return {
        stale: flags[OLD_MODULE_ID]?.[FLAGS.revealed],
        current: flags[MODULE_ID]?.[FLAGS.revealed]
    };
}

function addDeltaReveals(updates: Map<string, Flags>, tokenDoc: TokenDocument): void {
    const { stale, current } = getDeltaReveals(tokenDoc);
    const deltaReveals = mergeRevealed(stale, current);
    const base = tokenDoc.baseActor;

    if (!base || !Object.keys(deltaReveals).length) {
        return;
    }

    const pending = updates.get(base.id) ?? {};
    const revealed = pending[FLAGS.revealed] ?? base.getFlag(MODULE_ID, FLAGS.revealed);

    pending[FLAGS.revealed] = mergeRevealed(revealed, deltaReveals);
    updates.set(base.id, pending);
}

function getActorUpdates(): Map<string, Flags> {
    const updates = new Map<string, Flags>();

    for (const actor of game.actors) {
        const carried = getMissingFlags(actor.flags[OLD_MODULE_ID], actor.flags[MODULE_ID]);

        if (Object.keys(carried).length) {
            updates.set(actor.id, carried);
        }
    }

    for (const tokenDoc of [...game.scenes].flatMap((scene) => scene.tokens.contents)) {
        addDeltaReveals(updates, tokenDoc);
    }

    return updates;
}

// If the base actor is gone, the reveals stay on the token
function getStrandedReveals(tokenDoc: TokenDocument): Partial<Revealed> {
    const { stale, current } = getDeltaReveals(tokenDoc);

    return tokenDoc.baseActor || current ? {} : mergeRevealed(stale);
}

// Base art and the tally are stored per token
function getTokenRow(tokenDoc: TokenDocument): TokenUpdate | null {
    const carried = getMissingFlags(tokenDoc.flags[OLD_MODULE_ID], tokenDoc.flags[MODULE_ID]);
    const stranded = getStrandedReveals(tokenDoc);
    const row: TokenUpdate = { _id: tokenDoc.id };

    for (const [key, value] of Object.entries(carried)) {
        row[`flags.${MODULE_ID}.${key}`] = value;
    }

    if (Object.keys(stranded).length) {
        row[`delta.flags.${MODULE_ID}.${FLAGS.revealed}`] = stranded;
    }

    return Object.keys(row).length > 1 ? row : null;
}

async function carryFlags(): Promise<Carried> {
    const actorUpdates = getActorUpdates();
    const rowsByScene = [...game.scenes].map((scene) => ({
        scene,
        rows: scene.tokens.map(getTokenRow).filter((row) => row !== null)
    }));
    let tokens = 0;

    if (actorUpdates.size) {
        await Actor.implementation.updateDocuments([...actorUpdates].map(([_id, flags]) => ({
            _id,
            [`flags.${MODULE_ID}`]: flags
        })));
    }

    for (const { scene, rows } of rowsByScene.filter((entry) => entry.rows.length)) {
        await scene.updateEmbeddedDocuments('Token', rows);
        tokens += rows.length;
    }

    return {
        actors: actorUpdates.size,
        tokens
    };
}

// Untouched settings have no stored row
function getStoredSetting(key: string): unknown {
    return game.settings.storage.get('world')?.find((setting) => setting.key === key)?.value;
}

async function carrySettings(): Promise<number> {
    const keys = [...game.settings.settings.values()]
        .filter((setting) => setting.namespace === MODULE_ID && setting.key !== 'renameMigrated')
        .map((setting) => setting.key);
    let moved = 0;

    for (const key of keys) {
        const stale = getStoredSetting(`${OLD_MODULE_ID}.${key}`);

        if (stale === undefined || getStoredSetting(`${MODULE_ID}.${key}`) !== undefined) {
            continue;
        }

        // One refused value should not stop the rest
        try {
            await game.settings.set(MODULE_ID, key, stale);
            moved += 1;
        } catch (error) {
            log.warn(`The ${key} setting could not be carried across the rename`, error);
        }
    }

    return moved;
}

export async function migrateRename(): Promise<void> {
    if (!Grimmtale.isPrimaryGM() || isRenameMigrated()) {
        return;
    }

    try {
        const { actors, tokens } = await carryFlags();
        const settings = await carrySettings();

        await game.settings.set(MODULE_ID, 'renameMigrated', true);

        if (actors || tokens || settings) {
            log.info(`Carried ${actors} actors, ${tokens} tokens and ${settings} settings from ${OLD_MODULE_ID}`);
            ui.notifications.info(game.i18n.format(`${MODULE_ID}.migration.carried`, {
                actors,
                tokens
            }));
        }
    } catch (error) {
        log.error('The rename migration failed and will run again on the next load', error);
    }
}
