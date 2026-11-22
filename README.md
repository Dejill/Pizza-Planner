# Pizza Planner

A mobile app that helps you make great pizza at home — dough math, recipe planning, and cooking assistance.

Stack: [Expo](https://expo.dev) (React Native, TypeScript) with Expo Router.

## Current features

- **Dough calculator** — enter the number of pizzas, ball weight, hydration, salt, and fermentation plan; get exact flour, water, salt, and yeast quantities (instant, active dry, fresh, or sourdough starter, with yeast scaled to your bulk time and cold proof).
- **Style presets** — Neapolitan, New York, Sicilian, Detroit, and Roman pinsa, each with its own bake guidance.
- **Preferments** — optional poolish or biga with the flour/water/yeast split computed for you.
- **Whole-grain and gluten-free modes** — yeast scaled for whole-grain flour; xanthan gum amounts and handling tips for gluten-free blends.
- **Cooking assistant** — turns your dough plan into a step-by-step timeline (mix, knead, bulk rise with stretch-and-fold cadence, cold proof, pre-shape, shape, final proof, bake) with a wall-clock countdown per step, clock times for upcoming steps, a progress bar, adjustable stage lengths, and lock-screen alarms via local notifications. The screen stays awake while you cook.
- **Bake history** — completed plans are logged automatically with an optional note about how the bake went.
- **Pizza builder** — per-pizza gram amounts for sauces, cheeses, and toppings (with a dairy-free filter), batch totals, and a shareable shopping list.
- **Saved recipes** — store up to 50 setups, duplicate them, and export everything as a shareable JSON backup.
- **Share links** — send a recipe as a URL that pre-fills the calculator.

Also available as an installable offline-capable web app (deployed to GitHub Pages), with dark mode, unit conversions (cups/tsp), and an add-to-home-screen flow with a real app icon.

## Getting started

```bash
cd mobile
npm install
npm start          # open with the Expo Go app or an emulator
```

## Checks

```bash
cd mobile
npm test           # unit tests (dough math, schedule, recipes, history, preferments)
npx tsc --noEmit   # typecheck
npm run lint       # eslint via expo lint
```
