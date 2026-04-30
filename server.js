// ============================================================
//  BLOOM & CO. — Express Backend  (server.js)
//  Auth: JWT (register / login / me)
// ============================================================

const express   = require('express');
const mysql     = require('mysql2/promise');
const cors      = require('cors');
const path      = require('path');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bloomco_super_secret_change_in_prod';

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

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

// ── DB Retry on startup ──────────────────────────────────────
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

// ── Helpers ──────────────────────────────────────────────────
const handleError = (res, err, msg = 'Internal server error') => {
  console.error(err);
  res.status(500).json({ success: false, message: msg });
};

// ── JWT Auth Middleware ──────────────────────────────────────
const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access denied. Please log in.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// ============================================================
//  AUTH ROUTES
// ============================================================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  if (password.length < 6)
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length)
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), hash]
    );
    const token = jwt.sign(
      { id: result.insertId, email: email.toLowerCase(), name: name.trim() },
      JWT_SECRET, { expiresIn: '7d' }
    );
    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: { id: result.insertId, name: name.trim(), email: email.toLowerCase() }
    });
  } catch (err) { handleError(res, err, 'Registration failed.'); }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!rows.length)
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET, { expiresIn: '7d' }
    );
    res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) { handleError(res, err, 'Login failed.'); }
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = ?', [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user: rows[0] });
  } catch (err) { handleError(res, err, 'Failed to fetch user.'); }
});

// ============================================================
//  PRODUCT ROUTES (public)
// ============================================================

app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, description, price, image_url, category, stock FROM products ORDER BY created_at DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) { handleError(res, err, 'Failed to fetch products'); }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { handleError(res, err, 'Failed to fetch product'); }
});

// ============================================================
//  CONTACT ROUTE (requires login)
// ============================================================

app.post('/api/contact', requireAuth, async (req, res) => {
  const { name, email, phone = '', message } = req.body;
  if (!name || !email || !message)
    return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
  try {
    await pool.query(
      'INSERT INTO inquiries (name, email, phone, message, user_id) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email.trim(), phone.trim(), message.trim(), req.user.id]
    );
    res.status(201).json({ success: true, message: "Your message has been received. We'll be in touch shortly." });
  } catch (err) { handleError(res, err, 'Failed to save inquiry'); }
});

app.get('/api/inquiries', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM inquiries ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) { handleError(res, err, 'Failed to fetch inquiries'); }
});

// Catch-all SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌸  Bloom & Co. server running at http://localhost:${PORT}`);
});