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

Reel symbols are flat candy blobs drawn for this demo: saturated shapes, black capsule eyes, Outfit labels on the clover, wild, and scatter.

`assets/brand/` is the Figma Buildathon export (hero parade, brown blob, cloud). The hero strip sits above the reels and inside the paytable. Those files are the source characters; the reel SVGs are new drawings in the same language, not traces of another game.

## Audio and motion

Howler plays short synthesized wavs from `assets/audio/` (`tools/make-audio.mjs` rebuilds them). There is no licensed soundtrack.

Land squash, idle bob, and win pulse are Pixi tweens. `game/spineSlot.ts` lists the `.skel` / `.atlas` paths and `idle` / `land` / `win` names to use if someone later exports Spine and links a runtime. This repo does not ship either.

## Trade-off

The reels are tuned so a short session shows lines and the occasional feature. That is a demo hit rate, not a modeled RTP, and a long autoplay can drift the balance either way.
