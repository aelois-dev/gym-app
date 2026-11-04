# Gym Planner

A mobile-first web app that builds a gym workout from the muscles you want to train and the time you have, then runs the session with a guided rest timer.

## Features

- **Plan by muscle and time:** pick any mix of Chest, Back, Shoulders, Biceps, Triceps, Legs, Glutes and Core, then set 15–120 minutes.
- **Equipment:** Full gym, Dumbbells, or Bodyweight. Exercises are filtered to match.
- **Goal-based presets:** Strength 4×5, Muscle 3×10, Endurance 3×15 (compound lifts get +1 set). Every set and rep count can be edited.
- **You set the rest time** (15 s to 5 min). The time estimate updates as you edit the plan.
- **Swap, add, reorder or remove exercises.** Each exercise has a form tip.
- **Guided session:** tap *Set done* to start the rest countdown, with a beep and vibration when it ends. Rest can be changed by ±15 s or skipped. Timed holds (plank, wall sit) count down on their own. An optional 5-minute warm-up runs first.
- **Keeps the screen awake** during a workout (Wake Lock API).
- **Timers are based on timestamps,** so they stay accurate if the phone locks or you switch apps. Sessions can be resumed later.
- **History and saved workouts** are stored on the device in localStorage. There are no accounts.
- **Installable PWA** that works offline. Light and dark themes follow the phone's setting.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173 (add --host to open on your phone over Wi-Fi)
npm test           # planner unit tests
npm run build      # production build in dist/
npm run preview    # serve the build
```

## Deploy

`dist/` is a static site built with a relative base, so it works from any path.

### Cloudflare Workers (recommended)

**Option A: Git integration (auto-deploys on every push)**

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository**, then choose this repo.
2. Build command: `npm run build`. Deploy command: `npx wrangler deploy` (the default).
3. Deploy. The app is served at `https://gym-app.<your-subdomain>.workers.dev`.

**Option B: deploy from the command line**

```bash
npx wrangler login        # or set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
npm run deploy            # builds, then uploads dist/ as the "gym-app" Worker
```

`wrangler.toml` serves `dist/` as static assets. Its `name` must match the Worker's name in the dashboard. `public/_headers` makes the service worker and HTML revalidate on every visit, so updates reach installed copies, and caches hashed assets long-term.

### Other hosts

- **Netlify / Vercel:** build command `npm run build`, output directory `dist`.
- **GitHub Pages:** push `dist/` to a `gh-pages` branch (for example with `npx gh-pages -d dist`).

Install it as an app from the browser's **Add to Home Screen** option. Service workers, the Wake Lock and installing need HTTPS (or localhost).

## Code map

| Path | What it does |
| --- | --- |
| `src/data/exercises.ts` | Exercise library (~85 moves) with muscle, equipment, compound flag and form cue |
| `src/lib/planner.ts` | Time-budgeted plan generator, time estimate, swap/add candidates |
| `src/lib/storage.ts` | localStorage for history, saved workouts, in-progress session and preferences |
| `src/lib/feedback.ts` | Web Audio beeps, vibration, Wake Lock |
| `src/screens/*` | Setup → Plan → Session → Summary, plus Library |
