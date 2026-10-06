# GS: Interactable Actors

Players right-click any token they can see to inspect its portrait and whatever has been revealed
about it, or to target it without hotkeys. Resistances, immunities and vulnerabilities reveal
themselves once damage proves them. Threshold token art changes how a creature's token looks as its
hit points or another resource fall.

> Foundry v13 minimum, verified on **v13 and v14**. Requires
> [Foundry Virtual Tabletop](https://foundryvtt.com), licensed separately by Foundry Gaming, LLC.

## Features

- A right-click menu lets players inspect or target any token they can see but do not own. The menu
  and the Inspect window call a creature "Unknown" until its name is revealed.
- The Inspect window shows the creature's portrait, which you can zoom and drag, and only what has
  been revealed: lore, resistances, immunities and vulnerabilities, type, size and speed, ability
  scores, proficiencies, abilities and spells.
- For player characters the Inspect window can also show personal details and biography, and each
  player chooses what others can see.
- "Defence Auto-Reveal" reveals a resistance, immunity or vulnerability the first time it changes
  the damage a creature takes.
- "Armour and Health Estimates" calculates an NPC's armour class from the attacks that land or miss,
  and its hit points from the damage it takes. 
- "GM Reveal Whispers" whispers to the GM when damage reveals a defence or attacks pin down an NPC's
  armour class.
- "Chat Descriptions" shows an ability's or spell's chat description, if it has one, instead of its
  full description.
- Threshold token art changes a creature's token to another image or video as its hit points, or
  another resource, fall past each threshold, and back to its own art when it recovers.

## Using it

- Players can right-click a token they can see but do not own and choose "Inspect" or "Target".
- In the Inspect window, the GM and a player looking at their own character see every entry. 
  Information that is currently hidden is dimmed. Press the eye beside an entry, or click the information, to reveal it or hide it again.
- Reveals and estimates are kept on the actor, so every token of that actor shares them.
- The GM sets up threshold token art: right-click an actor in the Actors directory and choose
  "Threshold token art", or press "Configure threshold art" on the Appearance tab of a token's
  configuration.

## Compatibility and limitations

- While GS: Quality of Life is enabled it takes priority over the right-click menu provided and integrates it into its own menu.
- Armour class estimates count only attacks rolled in public with the NPC targeted.
- Health estimates for creatures that are not friendly wait until they are felled, unless dnd5e's
  "Bloodied Status" setting (under "Configure Visibility") is "Display for Allies & Enemies".
- "Defence Auto-Reveal" works only on damage applied through dnd5e with a damage type, such as from
  a damage roll in chat; hit points changed by hand reveal nothing.
- Threshold token art set from a placed token that is not linked to its actor applies to that token
  only; set it from the Actors directory or the prototype token to cover every token.

## Dependencies

GS: Library 1.0.0 or later and the dnd5e game system 4.0.0 or later, both required.

## Contributing

The source is public so that you can read what runs at your table. Issues and pull requests are
welcome. By opening a pull request you accept clause 5 of the [LICENSE](LICENSE): your
contribution is your own work, you license it to Grimmtale Studios LLC on the terms there.

## Credits

Built by **Grimmtale Studios LLC**.

## Licence

**Source-available, not open source.** Copyright 2026 Grimmtale Studios LLC. All rights reserved.

This module is published under the Grimmtale Studios Proprietary Licence, version 1.2.
The source is published so that anyone can read, study and propose changes to it.
Installing and running a subscriber module needs a current subscription or content key;
the free modules may be installed and used by anyone.
Every version you download while entitled to it is yours to keep using. Redistributing a module, bundling it into
another product, removing the in-app Grimmtale Studios attribution, or sharing a key or install
link is not permitted.

See [LICENSE](LICENSE) for the full terms. The current version of the licence is at
[grimmtalestudios.com/licence](https://grimmtalestudios.com/licence).

Foundry Virtual Tabletop and Foundry VTT are trademarks of Foundry Gaming, LLC. 
