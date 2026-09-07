const multer = require('multer');
const { put, list } = require('@vercel/blob');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB is plenty for pixel art
});

const INDEX_PATH = 'gallery/index.json';

function runMiddleware(req, res, middleware) {
  return new Promise((resolve, reject) => {
    middleware(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      resolve(result);
    });
  });
}

async function readIndex() {
  try {
    const { blobs } = await list({ prefix: INDEX_PATH });
    const match = blobs.find((b) => b.pathname === INDEX_PATH);
    if (!match) return [];
    // Cache-bust so we don't read a stale, CDN-cached copy right after a write.
    const res = await fetch(`${match.url}?ts=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('readIndex failed:', err);
    return [];
  }
}

async function writeIndex(items) {
  await put(INDEX_PATH, JSON.stringify(items), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60
  });
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const items = await readIndex();
    res.status(200).json(items);
    return;
  }

  if (req.method === 'POST') {
    try {
      await runMiddleware(req, res, upload.single('image'));
    } catch (err) {
      res.status(400).json({ error: err.message || 'Upload failed.' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No image file was received.' });
      return;
    }

    const name = (req.body.name || '').toString().trim().slice(0, 60) || 'Untitled';
    const size = parseInt(req.body.size, 10) || 16;
    let pixels = [];
    try {
      pixels = JSON.parse(req.body.pixels || '[]');
    } catch (err) {
      pixels = [];
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const blob = await put(`gallery/${id}.png`, req.file.buffer, {
        access: 'public',
        contentType: 'image/png',
        addRandomSuffix: false
      });

      const entry = {
        id,
        name,
        size,
        pixels,
        imageUrl: blob.url,
        createdAt: new Date().toISOString()
      };

      const items = await readIndex();
      items.push(entry);
      await writeIndex(items);

      res.status(201).json(entry);
    } catch (err) {
      console.error('Save failed:', err);
      res.status(500).json({ error: 'Could not save this piece.' });
    }
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Method not allowed.' });
};

// Vercel's Node runtime needs this to skip its default body parser so
// multer can read the raw multipart stream itself.
module.exports.config = {
  api: {
    bodyParser: false
  }
};
