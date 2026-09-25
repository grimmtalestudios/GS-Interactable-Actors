export function bindActorDeleted(onDeleted: (uuid: string) => void): void {
    Hooks.on('deleteActor', (actor: Actor) => onDeleted(actor.uuid));

    // Deleting a token fires no deleteActor for its synthetic actor
    Hooks.on('deleteToken', (tokenDoc: TokenDocument) => {
        if (tokenDoc.actor?.isToken) {
            onDeleted(tokenDoc.actor.uuid);
        }
    });
}
