# Pizza Planner

A mobile app that helps you make great pizza at home — dough math, recipe planning, and cooking assistance.

Stack: [Expo](https://expo.dev) (React Native, TypeScript) with Expo Router.

## Current features

- **Dough calculator** — enter the number of pizzas, ball weight, hydration, salt, and fermentation plan; get exact flour, water, salt, and yeast quantities (instant, active dry, fresh, or sourdough starter, with yeast scaled to your bulk time and cold retard).

## Roadmap

- Pizza builder (dough styles, sauce, toppings, quantities)
- Cooking assistant with guided steps and timers
- Saved recipes and shopping lists

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
