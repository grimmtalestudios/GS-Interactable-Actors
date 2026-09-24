import { FLAGS, MODULE_ID } from './constants.js';

type Rebuild = (update?: ActorUpdate, options?: object) => void;

const KNOWLEDGE_FLAGS = [FLAGS.revealed, FLAGS.observed];

const TARGET = 'foundry.documents.TokenDocument.prototype._onUpdateBaseActor';

function isOnly(keys: string[], key: string): boolean {
    return keys.length === 1 && keys[0] === key;
}

function isRevealOnly(update: ActorUpdate): boolean {

    // Every update has _id and _stats
    const keys = Object.keys(update).filter((key) => key !== '_id' && key !== '_stats');
    const ours = Object.keys(update.flags?.[MODULE_ID] ?? {}).map((key) => key.replace(/^-=/, ''));

    return isOnly(keys, 'flags') && isOnly(Object.keys(update.flags ?? {}), MODULE_ID)
        && ours.length === 1 && KNOWLEDGE_FLAGS.includes(ours[0]);
}

// Derived data doesn't depend on the knowledge flags
function onUpdateBaseActor(
    token: TokenDocument,
    rebuild: Rebuild,
    update: ActorUpdate = {},
    options: object = {}
): void {
    if (isRevealOnly(update)) {
        token._onRelatedUpdate(update, options);
    } else {
        rebuild(update, options);
    }
}

// Core rebuilds every unlinked token when a reveal updates the actor
export function registerTokenRebuildSkip(): void {
    if (typeof libWrapper !== 'undefined') {
        libWrapper.register(MODULE_ID, TARGET, function (
            this: TokenDocument,
            wrapped: Rebuild,
            update?: ActorUpdate,
            options?: object
        ) {
            onUpdateBaseActor(this, wrapped, update, options);
        }, 'MIXED');

        return;
    }

    const prototype = foundry.documents.TokenDocument.prototype;
    const original = prototype._onUpdateBaseActor;

    prototype._onUpdateBaseActor = function (this: TokenDocument, update?: ActorUpdate, options?: object) {
        onUpdateBaseActor(this, (next, nextOptions) => original.call(this, next, nextOptions), update, options);
    };
}
