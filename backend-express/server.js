const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}_${file.originalname}`);
  }
});

const upload = multer({ storage });

// Initialize SQLite database
const db = new sqlite3.Database('../type_editor.db', (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Database connected');
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      parent_id INTEGER,
      node_type TEXT NOT NULL,
      title TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      indent_level INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES nodes(id) ON DELETE CASCADE
    )
  `);

  // Add image_url column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE nodes ADD COLUMN image_url TEXT`, (err) => {
    // Ignore error if column already exists
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id INTEGER NOT NULL UNIQUE,
      content_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
    )
  `);
}

// Document routes
app.get('/api/documents', (req, res) => {
  db.all('SELECT * FROM documents ORDER BY updated_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/documents', (req, res) => {
  const { title } = req.body;
  db.run('INSERT INTO documents (title) VALUES (?)', [title], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM documents WHERE id = ?', [this.lastID], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    });
  });
});

app.get('/api/documents/:id', (req, res) => {
  db.get('SELECT * FROM documents WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Document not found' });
    res.json(row);
  });
});

app.put('/api/documents/:id', (req, res) => {
  const { title } = req.body;
  db.run(
    'UPDATE documents SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [title, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM documents WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
      });
    }
  );
});

app.delete('/api/documents/:id', (req, res) => {
  db.run('DELETE FROM documents WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(204).send();
  });
});

// Node routes
app.get('/api/documents/:doc_id/nodes', (req, res) => {
  db.all(
    'SELECT * FROM nodes WHERE document_id = ? ORDER BY order_index',
    [req.params.doc_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/nodes', (req, res) => {
  const { document_id, parent_id, node_type, title, order_index, indent_level, image_url } = req.body;
  db.run(
    'INSERT INTO nodes (document_id, parent_id, node_type, title, order_index, indent_level, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [document_id, parent_id, node_type, title, order_index, indent_level, image_url],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM nodes WHERE id = ?', [this.lastID], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
      });
    }
  );
});

app.get('/api/nodes/:id', (req, res) => {
  db.get('SELECT * FROM nodes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Node not found' });
    res.json(row);
  });
});

app.put('/api/nodes/:id', (req, res) => {
  const updates = [];
  const values = [];

  if (req.body.title !== undefined) {
    updates.push('title = ?');
    values.push(req.body.title);
  }
  if (req.body.order_index !== undefined) {
    updates.push('order_index = ?');
    values.push(req.body.order_index);
  }
  if (req.body.indent_level !== undefined) {
    updates.push('indent_level = ?');
    values.push(req.body.indent_level);
  }
  if (req.body.parent_id !== undefined) {
    updates.push('parent_id = ?');
    values.push(req.body.parent_id);
  }
  if (req.body.image_url !== undefined) {
    updates.push('image_url = ?');
    values.push(req.body.image_url);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.id);

  db.run(
    `UPDATE nodes SET ${updates.join(', ')} WHERE id = ?`,
    values,
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM nodes WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
      });
    }
  );
});

app.delete('/api/nodes/:id', (req, res) => {
  db.run('DELETE FROM nodes WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(204).send();
  });
});

// Content routes
app.get('/api/content/:node_id', (req, res) => {
  db.get('SELECT * FROM content WHERE node_id = ?', [req.params.node_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Content not found' });
    res.json(row);
  });
});

app.put('/api/content/:node_id', (req, res) => {
  const { content_json } = req.body;
  db.run(
    `INSERT INTO content (node_id, content_json) VALUES (?, ?)
     ON CONFLICT(node_id) DO UPDATE SET content_json = ?, updated_at = CURRENT_TIMESTAMP`,
    [req.params.node_id, content_json, content_json],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM content WHERE node_id = ?', [req.params.node_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
      });
    }
  );
});

// File upload route
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename
  });
});

// PDF export route (placeholder)
app.post('/api/export/pdf', (req, res) => {
  const { document_id, template } = req.body;
  res.json({
    message: 'PDF export not yet implemented',
    document_id,
    template
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});
