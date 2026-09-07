# Pixel Bench — Vercel + Vercel Blob

This version is built for Vercel specifically: the drawing page is a static
`index.html`, and `/api/gallery.js` is a serverless function. Instead of
writing files to disk (which Vercel doesn't allow), it stores each piece's
PNG — and the gallery's index — in **Vercel Blob**, Vercel's object storage.

## One-time setup

1. **Push this project to a Git repo** (GitHub/GitLab/Bitbucket) and import
   it into Vercel, or deploy straight from this folder with the Vercel CLI:
   ```
   npm i -g vercel
   vercel
   ```
2. **Create a Blob store and connect it to the project:**
   - In the Vercel dashboard, open your project → **Storage** tab →
     **Create Database** → **Blob**.
   - Connect it to this project. Vercel will automatically add a
     `BLOB_READ_WRITE_TOKEN` environment variable — you don't need to copy
     it anywhere yourself.
3. **Redeploy** (or trigger a new deployment) so the function picks up the
   new environment variable.

No build command, install command, or output directory is needed —
leave those as they are (or "none"/".", matching what you already have).
Vercel auto-detects `api/gallery.js` as a serverless function and serves
`index.html` as the static site.

## Local development

```
npm install
npx vercel dev
```

`vercel dev` runs the function locally and pulls down your project's real
environment variables (including `BLOB_READ_WRITE_TOKEN`), so uploads made
locally land in your actual Vercel Blob store. Plain `node` won't work here
since there's no long-running server — `api/gallery.js` only runs as a
Vercel function.

## How it works

- **Submitting a piece:** the browser renders the grid to a PNG and uploads
  it (plus name, size, and pixel data) to `POST /api/gallery`.
- **The function** saves the PNG to Blob storage at `gallery/<id>.png`,
  then reads, updates, and rewrites a single `gallery/index.json` blob that
  holds every piece's metadata (name, size, pixel data, image URL,
  timestamp).
- **Loading the wall:** `GET /api/gallery` reads that same `index.json` and
  returns it as a list.

## Known limitation

The whole gallery's metadata lives in one `index.json` file that gets
read, modified, and rewritten on every submission. If two people submit at
the exact same moment, one write could overwrite the other. Fine for
casual/personal use; if you expect heavy simultaneous traffic, swap the
index for a real database (Vercel Postgres, Vercel KV, etc.) and keep Blob
just for the images.
