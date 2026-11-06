# Wheel of Names

3D wheel of names built with Three.js. Choose a theme, spin the wheel, hear sound as it ticks, and get fireworks when a winner is chosen.

Live demo: https://wheel.malbq.dev

## Setup

Needs Node.js (see `.node-version`). Install with the lockfile:

```bash
npm install
```

## Run

```bash
npm run dev
```

Starts the local Cloudflare dev server and serves the static files in `public/`. There is no separate build step.

## Deploy

```bash
npm run deploy
```

Publishes the Worker and static assets to Cloudflare (Cloudflare login required).

## License

MIT. See [LICENSE](LICENSE). Copyright (c) 2026 Mauro Albuquerque.

Third-party runtime dependencies are loaded from CDNs and keep their own licenses:

- [Three.js](https://threejs.org/) and [fireworks-js](https://github.com/crashmax-dev/fireworks-js) via jsDelivr (see versions in `public/index.html`)
- Theme fonts via Google Fonts

This repo does not vendor those packages. Sound is generated with the Web Audio API; there are no bundled audio or image media files in the tree. If you add media assets later, confirm each file's license before treating it as project-owned.
