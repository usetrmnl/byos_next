# BYOS Next.js for TRMNL 🖥️

[![License](https://img.shields.io/github/license/usetrmnl/byos_next)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Integrated-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat)](https://github.com/usetrmnl/byos_next/pulls)
[![GitHub Stars](https://img.shields.io/github/stars/usetrmnl/byos_next?style=social)](https://github.com/usetrmnl/byos_next/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/usetrmnl/byos_next?style=social)](https://github.com/usetrmnl/byos_next/network/members)

## 🚀 Overview
**BYOS (Build Your Own Server) Next.js** is a Next.js implementation that powers device management, playlist-driven content scheduling, and on-demand BMP generation for e-ink displays.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fusetrmnl%2Fbyos_next&env=AUTH_ENABLED&envDefaults=%7B%22AUTH_ENABLED%22%3A%22false%22%7D&envDescription=User%20authentication%20is%20disabled.&envLink=https%3A%2F%2Fgithub.com%2Fusetrmnl%2Fbyos_next%3Ftab%3Dreadme-ov-file&project-name=byos-next&repository-name=byos_next&demo-title=BYOS%20NextJS&demo-description=BYOS%20(Build%20Your%20Own%20Server)%20Next.js%2C%20TRMNL%20server%20with%20local%20recipe%20rendering%20and%20cloud%20proxy%20support.&demo-url=https%3A%2F%2Fbyos-next-demo.vercel.app&demo-image=https%3A%2F%2Fusetrmnl.com%2Fimages%2Fbrand%2Ficons%2Ficon--brand.svg&products=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%2C%22group%22%3A%22postgres%22%7D%5D)

### ✨ Features
- Device management UI with MAC/API key registration, status tracking, and refresh scheduling.
- Playlist-based screen rotation with time and weekday rules, custom durations, and per-device assignment.
- On-demand screen rendering to 1-bit BMP via Takumi/Satori with caching and revalidation.
- Postgres backed persistence for devices, logs, and playlists.
- Recipes gallery to prototype screens and compare direct vs. bitmap rendering before pushing to hardware.
- Tailwind v4 + TypeScript + Next.js 16 + React 19; Biome lint/format baseline.
- Docker Compose for app + Postgres; deploy-ready Vercel button with Supabase/Neon integration.

## Table of Contents
- [BYOS Next.js for TRMNL 🖥️](#byos-nextjs-for-trmnl-️)
  - [🚀 Overview](#-overview)
    - [✨ Features](#-features)
  - [Table of Contents](#table-of-contents)
  - [Highlights](#highlights)
  - [Demo \& Screens](#demo--screens)
  - [Quickstart](#quickstart)
    - [Deploy to Vercel](#deploy-to-vercel)
    - [Run with Docker Compose (app + Postgres)](#run-with-docker-compose-app--postgres)
    - [Run Locally](#run-locally)
  - [Environment](#environment)
    - [Database Options](#database-options)
  - [Project Structure](#project-structure)
  - [Playlists](#playlists)
  - [Recipes](#recipes)
  - [Documentation](#documentation)
  - [Roadmap](#roadmap)
  - [Support \& Feedback](#support--feedback)
  - [License](#license)

## Highlights
- Dynamic BMP generation with Next.js 16, React 19, Tailwind CSS v4, and TypeScript.
- Supabase-backed device management, logging, and playlist scheduling.
- No-DB fallback mode for quickly previewing screens without a database.
- Docker Compose support for local PostgreSQL.
- Recipes gallery for rapid screen prototyping before deploying to devices.
- Clean codebase with Biome linting and formatting.

## Demo & Screens
- Live demo: [https://byos-next-demo.vercel.app](https://byos-next-demo.vercel.app)
- Overview UI: `public/byos-nextjs-overview.png`
- Device UI: `public/byos-nextjs-device.png`

## Quickstart

### Deploy to Vercel
1. Click the Vercel button above.
2. Link a Supabase or Neon project when prompted.
3. Deploy, then open the app and initialize tables.
4. Point your TRMNL device at the deployed URL.
5. Sync environment variables locally via `vercel link` and `vercel env pull` if you also develop on your machine.

### Run with Docker Compose (app + Postgres)
```bash
export POSTGRES_PASSWORD=your_password
docker-compose up -d
# visit http://localhost:3000
```

### Run Locally
```bash
git clone https://github.com/usetrmnl/byos_next
cd byos_next
pnpm install
```

Start the dev server:
```bash
pnpm dev
```

Format/lint:
```bash
pnpm lint
```

## Environment
Create `.env.local` with the keys you need. Common variables:
```
DATABASE_URL
POSTGRES_PASSWORD
```

### Database Options
- **Supabase or Neon:** run migrations in `migrations/` in order to create tables and playlist support.
- **Docker/Postgres:** set `POSTGRES_PASSWORD`, run `docker-compose up -d`.
- **No-DB mode:** run `pnpm dev` without DB env vars to preview screens only (device management disabled).

## Project Structure
- `app/` - Next.js routes and screens (including `/recipes`).
- `components/` - UI components.
- `migrations/` - SQL migrations for Postgres.
- `public/` - Static assets and screenshots.
- `scripts/`, `utils/`, `lib/` - helpers for rendering, caching, and device logic.
- `docs/api.md` - HTTP API reference.

## Playlists
- Schedule screens by time and weekday with custom durations.
- Assign playlists to devices to rotate content automatically.
- Enable playlist mode per device in the UI.

## Recipes
Visit `/recipes` to browse screens and compare direct vs. bitmap rendering. To add one:
1. Create a folder under `app/recipes/screens`.
2. Add your component and data fetching logic.
3. Register it in `app/recipes/screens.json`.

See `docs/recipes.md` for more detail.

## Documentation
- API endpoints and payloads: `docs/api.md`
- Recipes reference: `app/recipes/README.md`
- Contributing guide: `CONTRIBUTING.md`

## Roadmap
- Better recipe management system
- Compatibility with TRMNL recipes

## Support & Feedback
- GitHub Issues: https://github.com/usetrmnl/byos_next/issues
- Discussions: https://github.com/usetrmnl/byos_next/discussions
- Email: manglekuo@gmail.com
- TRMNL Discord: reply to the maintainer thread.

## License
MIT - see `LICENSE`.
