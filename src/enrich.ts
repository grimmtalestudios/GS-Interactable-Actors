import { isUsingChatDescriptions } from './settings.js';

const ROLL_LINKS = [
    'a.inline-roll',
    'a.roll-link',
    'button.roll-link',
    'a.roll-link-group',
    'a.enricher-action',
    '.roll-link-group a',
    '.roll-link-group button'
].join(', ');
const ORPHAN_PUNCTUATION = /^[.,:;!?)\]}%…”’»]+/;

// Don't let players roll the creature's attacks from its description
function flattenRolls(root: DocumentFragment): void {
    for (const link of root.querySelectorAll(ROLL_LINKS)) {
        const text = document.createElement('span');

        text.className = 'gs-interactable-actors-roll-text';
        text.textContent = link.textContent;
        link.replaceWith(text);
    }
}

// Keeps a full stop from wrapping alone after an enricher
function tuckPunctuation(root: DocumentFragment): void {
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const orphans: [Node, Element, string][] = [];

    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const [punctuation] = ORPHAN_PUNCTUATION.exec(node.textContent ?? '') ?? [];
        const before = node.previousSibling;

        if (punctuation && before instanceof Element) {
            orphans.push([node, before, punctuation]);
        }
    }

    for (const [node, before, punctuation] of orphans) {
        node.textContent = (node.textContent ?? '').slice(punctuation.length);
        before.append(punctuation);
    }
}

export async function enrich(text: string, relativeTo: Actor | Item): Promise<string> {
    const template = document.createElement('template');

    template.innerHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(text, {
        secrets: false,
        relativeTo
    });
    flattenRolls(template.content);
    tuckPunctuation(template.content);

    return template.innerHTML;
}

// Items without a chat description use the full text
export function getDescription(item: Item): string {
    const { value, chat } = item.system.description ?? {};

    return isUsingChatDescriptions() && chat?.trim() ? chat : value ?? '';
}
