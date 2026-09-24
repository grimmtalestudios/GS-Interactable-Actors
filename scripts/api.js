import { openArtConfig } from './artConfig.js';
import { openInspect } from './inspect.js';
import { getRelationships } from './relationships.js';
import { getKnownName, getRevealed, setRevealed } from './reveal.js';
import { applyArtForActor, getArtConfig, resolveArt, setArtConfig } from './tokenArt.js';
// Keys kept from the old module for macros and peers
export const api = {
    openInspect,
    openArtConfig,
    revealedFor: getRevealed,
    setRevealed,
    knownNameFor: getKnownName,
    artConfigFor: getArtConfig,
    setArtConfig,
    resolveArt,
    applyArtForActor,
    relationshipsFor: getRelationships
};
