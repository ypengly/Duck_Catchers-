# 🦆 Duck Road

A playable 3D endless road-crossing arcade game, built from scratch with **Three.js**
and vanilla JavaScript — no game engine, no external art/audio assets, no copied
characters or branding.

## How to run it

1. Unzip/keep `index.html` and `game.js` in the same folder.
2. Open `index.html` in a modern desktop or mobile browser (Chrome, Edge, Safari, Firefox).
3. You need an internet connection the first time you open it — the page loads the
   Three.js rendering library from a public CDN (`cdnjs.cloudflare.com`). Everything else
   (models, sounds, game logic) is generated on the fly, so there are no other files to host.

You can also drop the folder on any static web host (GitHub Pages, Netlify, a simple
`python3 -m http.server`, etc.) — no build step required.

## Controls

- **Desktop:** `W`/`↑` forward, `S`/`↓` back, `A`/`←` left, `D`/`→` right. `Esc` pauses.
- **Mobile:** swipe in any direction, or use the on-screen ▲ ◀ ▼ ▶ pad (bottom-right).

## What's implemented

- Endless procedurally-generated world: country road, highway-style traffic, rivers with
  floating logs, railway crossings with warning lights/bells and trains, plus safe
  grass/village/forest stretches — all built from Three.js primitives.
- Grid-based duck movement with smooth hop animation, waddle/wing-flap idle animation,
  scared/hit wobble, sinking-in-water animation, and a spin-and-hop celebration on
  achievements.
- 3 lives, score, distance, and bread counters, with a game-over screen and restart.
- Difficulty (traffic speed/density, train frequency) increases the further you travel.
- 🍞 Bread collectible currency, saved permanently via `localStorage`.
- 13 unlockable duck skins (Classic is free) with simple procedural accessories
  (crown, shades, cowboy hat, cape, chef hat, top hat, ninja headband...).
- A shop that spends bread on ducks, a cosmetic trail, and a "free starting shield" perk
  — no real-money purchases anywhere.
- 6 power-ups: Shield, Bread Magnet, Speed, Extra Life, Flying Duck, Slow Time.
- 10 achievements with toast notifications.
- Dynamic weather/time-of-day cycling (sunny, cloudy, rain with particles, fog, sunset,
  night) that tints the lighting and fog.
- Procedural WebAudio sound effects (footsteps, bread pickup, collisions, splashes,
  power-ups, train bell, achievement chime) and a tiny looping background jingle — all
  generated in-browser, so the game works with zero audio asset files. Real `.mp3`/`.ogg`
  files could be swapped in later by extending the `Audio_` object.
- Full save system (`localStorage`) for best score, total bread, unlocked ducks, selected
  duck, achievements, and settings — progress survives a refresh.
- Mobile-responsive layout with on-screen touch controls and swipe support.

## Project structure

Because this needs to run as a single portable page with **zero build step or server**,
the game logic lives in one `game.js` file rather than the deeper `/js/*.js` module split
suggested in the brief — but it's organized internally into the same clearly-labelled
sections (constants/skins, save system, audio, scene setup, mesh factories, world/traffic/
trains/collectibles, weather, player, and the main game controller), each commented with
the module name it corresponds to, so it's easy to split into separate files later if you
want a bundler-based project instead.

## Notes / next steps

- All 3D art is procedural (primitives), and all audio is procedurally synthesized —
  by design, per the brief, since no external assets were provided. Swapping in real
  models (`/assets/models`) or sound files (`/assets/audio`) would be a drop-in
  enhancement to `buildDuck`/`buildVehicle`/etc. and the `Audio_` object.
- The game keeps a rolling window of generated rows ahead of and behind the duck and
  disposes their geometry when culled, to stay smooth over long sessions.
