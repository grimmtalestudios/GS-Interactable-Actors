import { MODULE_ID } from './constants.js';
import { getObserved } from './observe.js';
import { isObservingCombat } from './settings.js';
function localize(key, data) {
    return game.i18n.format(`${MODULE_ID}.inspect.${key}`, data);
}
// The range narrows: 10–17, then 12–17, then 15
function getArmourText({ min, max }) {
    if (min !== null && max !== null) {
        return min === max ? String(min) : localize('acRange', {
            min,
            max
        });
    }
    if (min !== null) {
        return localize('acAtLeast', { min });
    }
    return max !== null ? localize('acAtMost', { max }) : null;
}
// Tokens from one actor roll different totals
function getHitPointText(samples) {
    const middles = samples.map(({ min, max }) => (min + max) / 2);
    if (!middles.length) {
        return null;
    }
    const average = middles.reduce((sum, middle) => sum + middle, 0) / middles.length;
    return localize('hpAbout', { value: Math.round(average) });
}
// Observed in combat, with no reveal toggle
export function getVitals(actor, isCurator) {
    const { ac: armour, hp } = actor.system.attributes ?? {};
    if (actor.type !== 'npc' || !hp || !isObservingCombat()) {
        return null;
    }
    const { ac, hp: { samples } } = getObserved(actor);
    const armourText = getArmourText(ac);
    const hitPointText = getHitPointText(samples);
    const toTruth = (value) => isCurator ? localize('actually', { value: value ?? '?' }) : '';
    const rows = [
        {
            stat: 'ac',
            label: localize('armourClass'),
            value: armourText ?? localize('unknownValue'),
            note: armourText ? localize('acNote', { n: ac.swings }) : localize('acHowTo'),
            isKnown: armourText !== null,
            truth: toTruth(armour?.value)
        },
        {
            stat: 'hp',
            label: localize('hitPoints'),
            value: hitPointText ?? localize('unknownValue'),
            note: hitPointText ? localize('hpNote', {
                n: samples.length,
                felled: samples.filter((sample) => sample.final).length
            }) : localize('hpHowTo'),
            isKnown: hitPointText !== null,
            truth: toTruth(hp.max)
        }
    ];
    return {
        isAnyKnown: rows.some((row) => row.isKnown),
        forgetLabel: localize('forgetObserved'),
        rows
    };
}
