# CMS-SwiftLayer (Directus + Postgres + Next.js)

A professional CMS-driven website demo:
- **Directus** manages structured homepage content (menu, hero, stats, services, process, testimonials, CTA) and posts.
- **Next.js** renders a full multi-section landing page with a Three.js hero and dynamic content blocks.
- Only items with `status = published` are publicly visible.

## Quick start

1. Copy environment config:
```bash
cp .env.example .env
```

2. Start the stack:
```bash
docker compose up -d --build
```

3. Bootstrap Directus schema, permissions, and seed content:
```bash
node scripts/bootstrap-directus.mjs
```

## URLs

- Directus Admin: [http://localhost:8055/admin](http://localhost:8055/admin)
- Frontend: [http://localhost:3000](http://localhost:3000)

## Directus default admin

- Email: `admin@example.com`
- Password: `admin1234`

## Collections created by bootstrap

- `site_settings`
- `nav_links`
- `home_hero`
- `home_stats`
- `home_services`
- `home_process_steps`
- `home_testimonials`
- `home_final_cta`
- `posts`

## Optional: run frontend outside Docker

```bash
cd frontend
cp .env.local.example .env.local
npm ci
npm run dev
```

## Troubleshooting

1. If schema or permissions get out of sync:
```bash
docker compose down -v
docker compose up -d --build
node scripts/bootstrap-directus.mjs
```

2. If public read permissions fail to apply automatically:
- Open Directus Admin.
- Go to `Settings` -> `Access Policies` (or `Roles & Permissions`).
- Select role `Public`.
- For each homepage collection and `posts`, allow `Read` with filter `status _eq published`.
