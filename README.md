# Pizza Planner

A mobile app that helps you make great pizza at home — dough math, recipe planning, and cooking assistance.

Stack: [Expo](https://expo.dev) (React Native, TypeScript) with Expo Router.

## Current features

- **Dough calculator** — enter the number of pizzas, ball weight, hydration, salt, and fermentation plan; get exact flour, water, salt, and yeast quantities (instant, active dry, fresh, or sourdough starter, with yeast scaled to your bulk time and cold proof).
- **Cooking assistant** — turns your dough plan into a step-by-step timeline (mix, knead, bulk rise with stretch-and-fold cadence, cold proof, pre-shape, shape, final proof, bake) with a wall-clock countdown per step and lock-screen alarms via local notifications. Tested on iOS.

Also available as an installable offline-capable web app (deployed to GitHub Pages), with dark mode, unit conversions, saved recipes, a shopping list, and shareable recipe links.

## Getting started

```bash
cd mobile
npm install
npm start          # open with the Expo Go app or an emulator
```

## Checks

```bash
cd mobile
npm test           # unit tests (dough math)
npx tsc --noEmit   # typecheck
npm run lint       # eslint via expo lint
```
