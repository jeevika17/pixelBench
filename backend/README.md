# Pixel Bench — backend

A small Express server that saves every submitted pixel art piece as a real
PNG file inside the `gallery/` folder (plus its metadata in
`gallery/index.json`), and serves the drawing app itself.

## Run it

```
npm install
npm start
```

Then open http://localhost:3000 in your browser.

## What happens when someone submits a piece

1. The browser renders the pixel grid to a PNG and uploads it (along with the
   name, grid size, and pixel data) to `POST /api/gallery`.
2. The server writes the PNG straight into `gallery/` and appends an entry to
   `gallery/index.json`.
3. The page reloads the wall via `GET /api/gallery`, which reads that same
   index file.

## Folder layout

```
pixel-bench-backend/
  server.js        the Express app
  package.json
  public/
    index.html      the drawing app + gallery UI
  gallery/           <-- every submitted piece is saved here as a .png
    index.json       metadata for everything in the gallery
```

## Notes

- By default it listens on port 3000 (override with the `PORT` environment
  variable).
- This is a single-server, local-disk setup — good for running on your own
  machine or a single VM. If you deploy it somewhere with an ephemeral
  filesystem (like most serverless platforms), the gallery folder won't
  persist between deploys; use a platform with persistent disk, or swap the
  storage layer for a database/object store (S3, etc.) if you need that.
