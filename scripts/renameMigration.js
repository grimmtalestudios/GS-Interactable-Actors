import { FLAGS, MODULE_ID } from './constants.js';
import { REVEAL_CATEGORIES } from './reveal.js';
import { isRenameMigrated } from './settings.js';
const OLD_MODULE_ID = 'Interactable-Actors';
const log = Grimmtale.createLogger(MODULE_ID);
// Merging keeps every reveal from both stores
function mergeRevealed(...stores) {
    const merged = {};
    for (const category of REVEAL_CATEGORIES) {
        const entries = stores.flatMap((store) => {
            const list = store?.[category];
            return Array.isArray(list) ? list : [];
        });
        if (entries.length) {
            merged[category] = [...new Set(entries)];
        }
    }
    return merged;
}
function getMissingFlags(stale, current) {
    return Object.fromEntries(Object.entries(stale ?? {}).filter(([key]) => !(key in (current ?? {}))));
}
function getActorUpdates() {
    const updates = new Map();
    for (const actor of game.actors) {
        const carried = getMissingFlags(actor.flags[OLD_MODULE_ID], actor.flags[MODULE_ID]);
        if (Object.keys(carried).length) {
            updates.set(actor.id, carried);
        }
    }
    return updates;
}
function foldDeltaReveals(tokenDoc, actorUpdates, row) {
    const flags = (tokenDoc.delta?.toObject().flags ?? {});
    const underNewName = flags[MODULE_ID]?.[FLAGS.revealed];
    const deltaReveals = mergeRevealed(flags[OLD_MODULE_ID]?.[FLAGS.revealed], underNewName);
    const base = tokenDoc.baseActor;
    if (!Object.keys(deltaReveals).length) {
        return;
    }
    if (base) {
        const pending = actorUpdates.get(base.id) ?? {};
        const current = pending[FLAGS.revealed] ?? base.getFlag(MODULE_ID, FLAGS.revealed);
        pending[FLAGS.revealed] = mergeRevealed(current, deltaReveals);
        actorUpdates.set(base.id, pending);
    }
    else if (!underNewName) {
        // If the base actor is gone, the reveals stay on the token
        row[`delta.flags.${MODULE_ID}.${FLAGS.revealed}`] = deltaReveals;
    }
}
// Base art and the tally are stored per token
function getTokenRow(tokenDoc, actorUpdates) {
    const carried = getMissingFlags(tokenDoc.flags[OLD_MODULE_ID], tokenDoc.flags[MODULE_ID]);
    const row = { _id: tokenDoc.id };
    for (const [key, value] of Object.entries(carried)) {
        row[`flags.${MODULE_ID}.${key}`] = value;
    }
    foldDeltaReveals(tokenDoc, actorUpdates, row);
    return Object.keys(row).length > 1 ? row : null;
}
async function carryFlags() {
    const actorUpdates = getActorUpdates();
    const rowsByScene = [...game.scenes].map((scene) => ({
        scene,
        rows: scene.tokens.map((tokenDoc) => getTokenRow(tokenDoc, actorUpdates)).filter((row) => row !== null)
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
function getStoredSetting(key) {
    return game.settings.storage.get('world')?.find((setting) => setting.key === key)?.value;
}
async function carrySettings() {
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
        }
        catch (error) {
            log.warn(`The ${key} setting could not be carried across the rename`, error);
        }
    }
    return moved;
}
export async function migrateRename() {
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
    }
    catch (error) {
        log.error('The rename migration failed and will run again on the next load', error);
    }
}
