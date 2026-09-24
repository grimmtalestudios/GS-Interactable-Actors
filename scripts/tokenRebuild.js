import { FLAGS, MODULE_ID } from './constants.js';
const TARGET = 'foundry.documents.TokenDocument.prototype._onUpdateBaseActor';
function isOnly(keys, key) {
    return keys.length === 1 && keys[0] === key;
}
function isRevealOnly(update) {
    // Every update has _id and _stats
    const keys = Object.keys(update).filter((key) => key !== '_id' && key !== '_stats');
    const ours = Object.keys(update.flags?.[MODULE_ID] ?? {}).map((key) => key.replace(/^-=/, ''));
    return isOnly(keys, 'flags') && isOnly(Object.keys(update.flags ?? {}), MODULE_ID) && isOnly(ours, FLAGS.revealed);
}
// Derived data doesn't depend on the knowledge flags
function onUpdateBaseActor(token, rebuild, update = {}, options = {}) {
    if (isRevealOnly(update)) {
        token._onRelatedUpdate(update, options);
    }
    else {
        rebuild(update, options);
    }
}
// Core rebuilds every unlinked token when a reveal updates the actor
export function registerTokenRebuildSkip() {
    if (typeof libWrapper !== 'undefined') {
        libWrapper.register(MODULE_ID, TARGET, function (wrapped, update, options) {
            onUpdateBaseActor(this, wrapped, update, options);
        }, 'MIXED');
        return;
    }
    const prototype = foundry.documents.TokenDocument.prototype;
    const original = prototype._onUpdateBaseActor;
    prototype._onUpdateBaseActor = function (update, options) {
        onUpdateBaseActor(this, (next, nextOptions) => original.call(this, next, nextOptions), update, options);
    };
}
