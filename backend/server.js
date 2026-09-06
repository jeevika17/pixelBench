const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const GALLERY_DIR = path.join(__dirname, 'gallery');
const INDEX_FILE = path.join(GALLERY_DIR, 'index.json');

// Make sure the gallery folder (and its index) exist before anything else runs.
fs.mkdirSync(GALLERY_DIR, { recursive: true });
if (!fs.existsSync(INDEX_FILE)) {
  fs.writeFileSync(INDEX_FILE, '[]', 'utf8');
}

function readIndex() {
  try {
    const raw = fs.readFileSync(INDEX_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function writeIndex(items) {
  fs.writeFileSync(INDEX_FILE, JSON.stringify(items, null, 2), 'utf8');
}

// Every uploaded piece is written straight into /gallery as a .png file.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, GALLERY_DIR),
  filename: (req, file, cb) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    req.generatedId = id;
    cb(null, `${id}.png`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image is plenty for pixel art
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'image/png') {
      return cb(new Error('Only PNG uploads are accepted.'));
    }
    cb(null, true);
  }
});

app.use(express.static(path.join(__dirname, 'public')));
// The saved PNG files are served directly from the gallery folder.
app.use('/gallery-files', express.static(GALLERY_DIR));

app.get('/api/gallery', (req, res) => {
  res.json(readIndex());
});

app.post('/api/gallery', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed.' });
    }
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file was received.' });
      }

      const name = (req.body.name || '').toString().trim().slice(0, 60) || 'Untitled';
      const size = parseInt(req.body.size, 10) || 16;
      let pixels = [];
      try {
        pixels = JSON.parse(req.body.pixels || '[]');
      } catch (parseErr) {
        pixels = [];
      }

      const entry = {
        id: req.generatedId,
        name,
        size,
        pixels,
        filename: req.file.filename,
        createdAt: new Date().toISOString()
      };

      const index = readIndex();
      index.push(entry);
      writeIndex(index);

      res.status(201).json(entry);
    } catch (err2) {
      console.error(err2);
      res.status(500).json({ error: 'Could not save this piece.' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Pixel Bench backend running at http://localhost:${PORT}`);
  console.log(`Saving pieces into: ${GALLERY_DIR}`);
});
