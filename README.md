# Grok Bot Slots

Playable **demo** slot. Five reels, ten lines, a local wallet, and candy-blob symbols. It spends play credits only. It is not a casino product, it does not take real money, and the math is not a certified RTP.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

```bash
npm test          # host wallet + pay evaluation
npm run build     # typecheck and production bundle
npm run preview   # serve the production bundle
```

Useful query params:

- `?lang=es` — Spanish UI strings
- `?seed=42` — repeatable reel stops
- `?force=scatter` — the next spin awards the free-spin hook
- `?force=line` — the next spin lands a clover line

Space or Spin starts one round. Stop hurries that round and cancels autoplay. Free spins wait for another Spin unless Auto is already running. **Stop auto** ends a run, including the gap between spins.

## Architecture

Same layering idea as a modern hosted slot demo: a host, a shell, and a game pack. The code and art are original. Nothing here is copied from a commercial slot runtime.

```
host/     demo wallet, spin request, RNG, paytable, feature state
shared/   the only contract both sides share (events, symbol ids, money)
shell/    balance, bet, spin, autoplay stub, paytable, l10n, Howler cues
game/     Pixi 7 stage, reel motion, win lines
assets/   blob symbols, Figma brand exports, synthesized wavs, strings
public/   favicon
```

Boot lives in `src/main.ts`. The host decides the outcome (`spinStart` carries stops, the grid, and wins). The game only animates that result, then calls `completePresentation()`, which credits the wallet and emits `spinStop`, `win`, `balanceUpdate`, `featureStart`, and `featureEnd`.

Free spins are a host state (no debit, 2× wins, retrigger adds spins). They do not start by themselves. **Preview free spins** forces three scatters on the next Spin. Reel symbols are eyes-only blobs — no letters or line icons.

## Art

Reel symbols are flat candy blobs: saturated shapes and black capsule eyes. No letters or line icons on the symbols.

`assets/brand/` is the Figma Buildathon export (hero parade, brown blob, cloud). The hero strip sits above the reels and inside the paytable. Those files are the source characters; the reel SVGs are new drawings in the same language, not traces of another game.

## Motion

`motion/` is a thin overlay. Timeline clips (logo sting, ambient blob drift, scatter tease, kinetic win count-up, big-win flourish, free-spin intro and outro, soft phase washes) play on host and reel events. They use the same blob sprites as the reels. There is no music bed.

Sound is still the short spin ticks. The Sound button mutes them. Browsers block audio until the first tap or Spin.

Land squash, idle bob, and win pulse stay in the reel view. `game/spineSlot.ts` is the drop-in point if `.skel` / `.atlas` files show up later.

## Trade-off

The reels are tuned so a short session shows lines and the occasional feature. That is a demo hit rate, not a modeled RTP, and a long autoplay can drift the balance either way.
