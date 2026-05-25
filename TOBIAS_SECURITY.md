# Tobias-local security hardening

This checkout is a pinned local fork of `mrslbt/pdf-it` for Tobias's agent stack.

## Baseline

- Upstream source: `https://github.com/mrslbt/pdf-it`
- Upstream commit: `471f4252bf4ba4f35e58b55c2d3ce7d9f1e6c1a9`
- Local package: `pdf-it-safe-mcp`
- Local version: `1.2.0-tobias.1`
- Local pinned tag: `tobias-pdf-it-safe-v1.2.0-1`

## Changes

- Markdown raw HTML disabled with `markdown-it` `html: false`.
- Chrome JavaScript disabled during rendering.
- Browser requests blocked except `about:blank`, `data:`, and `blob:` URLs.
- Google Fonts import removed; templates use local/system fonts only.
- PDF output paths restricted to `~/Documents/pdf-it/`.
- Chrome is no longer launched with `--no-sandbox`.

## Operational rule

Do not install this MCP through `npx pdf-it-mcp@latest`. Run the local pinned wrapper:

```powershell
C:\Users\Tobias\projects\pdf-it-safe\scripts\run-pdf-it-safe.cmd
```

The wrapper refuses to start unless `HEAD` is exactly tagged `tobias-pdf-it-safe-v1.2.0-1`, the worktree is clean, and `dist\index.js` exists.

## Verification

Run:

```powershell
npm ci
npm run build
npm test
npm audit --omit=dev
```
