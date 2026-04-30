// ============================================================
//  BLOOM & CO. — Express Backend  (server.js)
//  Run: node server.js   |   Default port: 3000
// ============================================================

const express  = require('express');
const mysql    = require('mysql2/promise');
const cors     = require('cors');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));   // serve frontend

// ── Database Connection Pool ─────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || 'yourpassword',
  database: process.env.DB_NAME     || 'bloomco',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

// Verify connection on startup — retries until MySQL is ready
(async () => {
  const maxRetries = 15;
  const delay = ms => new Promise(r => setTimeout(r, ms));

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const conn = await pool.getConnection();
      console.log('✅  MySQL connected successfully.');
      conn.release();
      return;
    } catch (err) {
      console.log(`⏳  DB not ready (attempt ${attempt}/${maxRetries}) — retrying in 3s…`);
      await delay(3000);
    }
  }
  console.error('❌  Could not connect to MySQL after maximum retries. Exiting.');
  process.exit(1);
})();

// ── Helper ───────────────────────────────────────────────────
const handleError = (res, err, msg = 'Internal server error') => {
  console.error(err);
  res.status(500).json({ success: false, message: msg });
};

// ============================================================
//  API ROUTES
// ============================================================

// GET /api/products  — Return all products
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, description, price, image_url, category, stock FROM products ORDER BY created_at DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    handleError(res, err, 'Failed to fetch products');
  }
});

// GET /api/products/:id  — Return a single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    handleError(res, err, 'Failed to fetch product');
  }
});

// GET /api/products/category/:cat  — Filter by category
app.get('/api/products/category/:cat', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE category = ? ORDER BY price ASC',
      [req.params.cat]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    handleError(res, err, 'Failed to fetch category');
  }
});

// POST /api/contact  — Save a contact inquiry
app.post('/api/contact', async (req, res) => {
  const { name, email, phone = '', message } = req.body;

  // Basic validation
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  }

  try {
    await pool.query(
      'INSERT INTO inquiries (name, email, phone, message) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim(), phone.trim(), message.trim()]
    );
    res.status(201).json({ success: true, message: 'Your message has been received. We\'ll be in touch shortly.' });
  } catch (err) {
    handleError(res, err, 'Failed to save inquiry');
  }
});

// GET /api/inquiries  — (Admin) list all inquiries
app.get('/api/inquiries', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM inquiries ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    handleError(res, err, 'Failed to fetch inquiries');
  }
});

// Catch-all → serve index.html (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🌸  Bloom & Co. server running at http://localhost:${PORT}`);
});