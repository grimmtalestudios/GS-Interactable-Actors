export function bindActorDeleted(onDeleted) {
    Hooks.on('deleteActor', (actor) => onDeleted(actor.uuid));
    // Deleting a token fires no deleteActor for its synthetic actor
    Hooks.on('deleteToken', (tokenDoc) => {
        if (tokenDoc.actor?.isToken) {
            onDeleted(tokenDoc.actor.uuid);
        }
    });
}
