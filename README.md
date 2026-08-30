# From Kanto to Paldea

A route for playing the entire Pokémon series, Generation 1 to Generation 9 — **twelve games, one story per region**, with no paired-version repeats and no remakes of regions already on the route.

**→ [pokemon.cativo.dev](https://pokemon.cativo.dev)**

Twenty-two mainline titles have shipped, but many tell the same story twice. Paired versions (Red/Blue, Scarlet/Violet) differ by a handful of exclusive Pokémon. Remakes revisit regions that are already covered — FireRed *is* Kanto, HeartGold *is* Johto. Strip that out and twelve distinct stories remain.

Every stop opens up to show the full generation it came from and which of its games were dropped, so nothing is hidden — just folded away.

## Why

I grew up on these games, lost track around the DS era, and picked up Scarlet years later. Rather than start at the end, I wanted to go back to the beginning. This is the route I drew for myself.

**The version picks are opinions, not facts.** Where a call is genuinely contested — Sun versus Ultra Sun, Crystal versus HeartGold — the page says so and gives the other option.

## Built with

Hand-written HTML, CSS and JavaScript. No framework, no build step, no dependencies, no tracking.

| | |
|---|---|
| Page weight | ~165 KB total, sprites included |
| JavaScript | ~4 KB, vanilla |
| Build step | none — `index.html` is the deployable artifact |
| Fonts | Press Start 2P + Pixelify Sans (Google Fonts) |

The design is built from the Game Boy's own hardware: the accent is `#9BBC0F`, the real phosphor green of the DMG screen, and the four-tone palette on the hero screen is the only four tones that display could show. Each route marker grows brighter with the hardware generation, and **every sprite is drawn in the graphical style of its own game** — so the art visibly evolves from 1998 to 2025 as you scroll.

Progress is stored in `localStorage`; nothing leaves the browser.

```
index.html            the page
assets/tokens.css     colour, type, spacing and motion tokens
assets/styles.css     everything else
assets/app.js         progress tracking and the scroll rail
assets/sprites/       12 era-accurate sprites + 1 animated
deploy/               nginx + compose, behind Traefik
```

## Running it

Any static server will do:

```bash
python3 -m http.server 8000
```

## Credits and licence

Sprites come from [PokeAPI's open sprite repository](https://github.com/PokeAPI/sprites), which indexes them **per game version** — that is what makes the era-accurate art possible. Generation IX has no per-version pixel sprites, so those two were extracted from the first frame of an animated source and downscaled with point sampling.

The code in this repository is MIT licensed (see [LICENSE](LICENSE)). **The sprites are not mine and are not covered by it.**

Pokémon is a trademark of Nintendo, Creatures Inc. and GAME FREAK. This is a fan project, unaffiliated with and unendorsed by any of them. No game files are hosted or linked here — emulators are legal, and the clean path to the games is dumping cartridges and consoles you own.
