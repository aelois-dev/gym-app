# Gym Planner

A mobile-first web app that builds a gym workout from the muscles you want to train and the time you have, then runs the session with a guided rest timer.

## Features

**Coach (all rules run on your phone; nothing leaves it)**
- **Onboarding:** goal, experience, days per week, session length, equipment, and optional bodyweight, height, age and sex.
- **Weekly program:** full body, push/pull/legs or upper/lower, depending on your days and experience. Days run in rotation, and the Today tab shows what's next.
- **Recovery and readiness:** a body map shades muscles that are still recovering. When today's muscles are tired, the coach suggests the next day instead. A three-tap check-in (sleep, soreness, energy) makes low days lighter.
- **Progression:** suggested weights follow double progression: one step heavier after finishing every set, the same weight after missed sets, and 10% lighter after missing twice. Progress shows weekly sets per muscle against your goal's range, your personal records, and a chart for each lift.
- **Habits:** daily protein and water targets from bodyweight and goal, a calorie estimate (Mifflin-St Jeor), steps and sleep, each with a 7-day strip.

**Workouts**

- **Plan by muscle and time:** tap the muscles you want on a front and back body map, then choose how long you have (15–120 minutes). The same map shows what you trained on the summary and in the log.
- **Equipment:** Full gym, Dumbbells, or Bodyweight. Exercises are filtered to match.
- **Goal-based presets:** Strength 4×5, Muscle 3×10, Endurance 3×15 (compound lifts get +1 set). Every set and rep count can be edited.
- **Choose how many exercises** on the setup screen, or leave it on Auto to fit as many as your time allows. With a set number, the sets adjust to fit your time.
- **Log the weight you lift:** kg per dumbbell, total kg on a barbell (bar and plates), or kg on the stack for machines and cables. Set it on the plan and adjust it on any set. The app remembers your last weight for each exercise, and the log shows what you lifted.
- **Rest per exercise:** 3:00 by default after compound lifts and 2:00 after everything else. You can change both defaults on the setup screen and adjust any exercise's rest on the plan. The time estimate updates as you edit.
- **Animated exercise demos:** a jointed mannequin performs every exercise, with the muscle it works shown in red. Tap a plan row's thumbnail to watch it. When you swap or add an exercise, you can preview each option before choosing it.
- **Swap, add, reorder or remove exercises,** each with a form tip.
- **Guided session:** tap *Set done* to start the rest countdown, with a beep and vibration when it ends. Rest can be changed by ±15 s or skipped. Timed holds (plank, wall sit) count down on their own. An optional 5-minute warm-up runs first.
- **Keeps the screen awake** during a workout (Wake Lock API).
- **Timers are based on timestamps,** so they stay accurate if the phone locks or you switch apps. Sessions can be resumed later.
- **History and saved workouts** are stored on the device in localStorage. There are no accounts.
- **Installable PWA** that works offline. Light (chalk) and dark (rubber floor) themes follow the phone's setting.

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
| `src/data/exercises.ts` | Exercise library (129 moves) with muscle, equipment, compound flag and form cue |
| `src/lib/planner.ts` | Time-budgeted plan generator, time estimate, swap/add candidates |
| `src/lib/storage.ts` | localStorage for history, saved workouts, in-progress session and preferences |
| `src/figure/*` | Animated exercise demos: a 2D mannequin rig (forward kinematics plus 2-bone IK) and the movement patterns each exercise maps to. Preview every animation at `/?figures` in `npm run dev`. |
| `src/lib/feedback.ts` | Web Audio beeps, vibration, Wake Lock |
| `src/screens/*` | Setup → Plan → Session → Summary, plus Library |
