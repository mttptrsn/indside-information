# What the Executives Know: Foundation Package

This package establishes the reusable visual system and application shell only. It intentionally does not create product pages.

## Install dependencies

From the existing `web/` directory:

```bash
npm install framer-motion lucide-react clsx tailwind-merge
```

## Apply the package

Extract this archive into the Next.js app root so that `src/` overlays the existing `src/` directory.

## Included

- Independent light and dark themes
- Warm print-inspired light mode
- Documentary-film dark mode
- Editorial type and spacing system
- Responsive application shell
- Condensing sticky header
- Mobile navigation
- Search overlay and command shortcut
- Theme switcher
- Page transitions
- Motion primitives
- Buttons, badges, cards, status chips
- Evidence and article cards
- Pull quotes, annotations, timelines, statistics
- Loading, empty, and error states
- Reduced-motion support
- Grain and material texture

## Data integration

`SiteHeader` accepts `searchItems`, but the root layout currently leaves it empty because page/data loaders are intentionally outside this foundation step. A later module should load `/public/data/search-index.json` on the server and pass its items into `AppShell`.

## Verification

```bash
npm run lint
npm run build
```
