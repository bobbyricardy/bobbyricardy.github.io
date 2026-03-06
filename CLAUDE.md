# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code style

- Simplistic easy to understand code with understandable code variables and function names
- Destructure imports when possible
- Proper

## Overview

This is a static personal portfolio website hosted on GitHub Pages at `bobbyricardy.github.io`. There is no build system, package manager, or test suite — all files are served directly as static assets.

## Commands

```bash
npm install          # install dev dependencies (Prettier)
npm run pretty       # check formatting
npm run pretty:write # auto-format all files
```
Prettier ignores `assets/` and `*.min.*` files (see `.prettierignore`).

## Deployment

Pushing to the `master` branch triggers automatic GitHub Pages deployment. The site uses a custom domain (`bobbyricardy.dev`). The `rum-alpha` branch is used for developing RUM features before merging to `master`.

## Documentation & Architecture

### JSDoc Requirements

- Use `@param`, `@returns`, and `@throws` for all exported functions.
- Use `@type` for complex variable declarations to assist IDE intellisense.
- Define shared types using `@typedef` in a `types.js` file and require it where needed.

### Frontend/Backend Boundary

- **No Inline Scripts/Styles**: Keep JavaScript in `.js` files and CSS in `.css` files.
- **Client-Side JS**: Keep client-side logic in `/public/js`. Do not use CommonJS `require` here (use standard browser `<script>` or a bundler).
- **Template Logic**: Keep logic in the Controller; the View (HTML) should only handle display/iteration.

### Pages

- `index.html` — Main portfolio page (intro, nav, contact links, resume link)
- `404.html` — Custom 404 error page
- `rum.html` — Standalone RUM 3D trace visualization (not linked from main nav)

### Key JavaScript

- `assets/js/portfolio_enhancements.js` — All custom logic for the main page: footer year calculation, Typed.js animation, section fade effects, resume link shake animation, smooth scrolling, Bootstrap tooltips, and a Konami code easter egg that inverts page colors.
- `assets/js/rum.js` — Three.js ES module powering the WebGL 3D trace view in `rum.html`. Uses an import map to load `three@0.162.0` from CDN.
- `assets/js/typed.js` — Local copy of Typed.js used for the typewriter name animation in the masthead.

### Elastic APM RUM

`index.html` loads the Elastic APM RUM agent (`@elastic/apm-rum@4.8.1`) and sends telemetry to `https://apm.bobbyricardy.dev` (a Cloudflare Worker proxy). The service is named `rotom-dex-portfolio`. The `rum.html` page visualizes this RUM data as a 3D network waterfall using Three.js.

### Stylesheets

- `assets/cover.css` — Core full-page cover layout
- `assets/css/custom_classes.css` — Project-specific overrides (blink animation, typed cursor, layout tweaks)
- Bootstrap, Font-Awesome, and Animate.css are also included as local copies under `assets/css/`

### External Dependencies (CDN)

- jQuery 3.1.1 (Google CDN, with local fallback)
- Tether 1.4.0 (Cloudflare CDN)
- Bootstrap 4 JS/CSS from `./dist/` (local copy)
- Three.js 0.162.0 via import map in `rum.html`
