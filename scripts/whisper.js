import { MODULE_ID } from './constants.js';
export async function whisperToGM(lines) {
    const gmIds = game.users.filter((user) => user.isGM).map((user) => user.id);
    // If the whisper list is empty, everyone sees the message
    if (!gmIds.length) {
        return;
    }
    await ChatMessage.implementation.create({
        content: `<p class="gs-interactable-actors-reveal-note">${lines.join('<br>')}</p>`,
        whisper: gmIds,
        speaker: { alias: game.i18n.localize(`${MODULE_ID}.title`) }
    });
}
