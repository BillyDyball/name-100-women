# Name 100 Women

A fast little browser game: given 10 minutes, how many notable / influential women can you list? Your goal is to reach 100 before the timer expires. The timer only starts after your first submission so you can get ready.

## Gameplay
- Objective: enter 100 distinct full names of women in 10 minutes.
- Timer starts on your first attempt.
- Press Enter or click Verify to submit a name.
- Duplicate or unknown names are rejected.
- Press R (or the Reset button) any time to start over.
- Progress & personal best are stored locally in your browser (no accounts).
- Share button lets you copy / share a link and (if you win) your time.

## Tech Stack
- Next.js 15 (App served via Pages Router here)
- React 19
- Tailwind CSS (v4 postcss pipeline)
- TypeScript
- Lightweight client‑side analytics (PostHog)

## Run Locally
```bash
# 1. Clone
git clone https://github.com/billydyball/name-100-women.git
cd name-100-women

# 2. Install deps (pick one)
npm install  # or yarn install / pnpm install / bun install

# 3. Start dev server
npm run dev
```
Open http://localhost:3000

### Tests
```bash
npm test
```

### Lint
```bash
npm run lint
```

## Build for Production
```bash
npm run build
npm start   # serves the production build
```

## Deployment
Optimized for Vercel (zero config). Any Node host that can run `npm run build && npm start` will work.

## Project Structure (trimmed)
```
src/
  components/NameGame.tsx   # Main game component
  lib/                      # Canonicalization, loading list, analytics
  pages/                    # Next.js pages
public/names.txt            # Source list of accepted names
```

## Dataset

Data for this project was collected from the pantheon 2.0 `2025 Person Dataset`.

> https://pantheon.world/data/datasets

## Contributing
Simple ideas (accessibility tweaks, more names, performance) are welcome. Open an issue or PR.

## License
MIT
