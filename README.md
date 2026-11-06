# Wheel of Names

A 3D wheel for drawing names, with themes, sound and fireworks. Built with Three.js.

Live: https://wheel.malbq.dev

The site is 100% static: plain HTML, CSS and JavaScript in `public/`, with no build step and no backend. Three.js and fireworks-js load from a CDN, and sounds come from the Web Audio API.

## Run locally

```bash
npm install
npm run dev
```

## Deploy

Every push to `master` deploys to Cloudflare. To deploy by hand, run `npm run deploy`.
