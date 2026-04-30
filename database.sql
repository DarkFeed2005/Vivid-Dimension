-- ============================================================
--  BLOOM & CO. — Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS bloomco;
USE bloomco;

-- ── USERS TABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(200)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ── PRODUCTS TABLE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120)   NOT NULL,
  description TEXT,
  price       DECIMAL(10,2)  NOT NULL,
  image_url   VARCHAR(500),
  category    VARCHAR(80),
  stock       INT            DEFAULT 0,
  created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

-- ── INQUIRIES TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inquiries (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT,
  name       VARCHAR(120) NOT NULL,
  email      VARCHAR(200) NOT NULL,
  phone      VARCHAR(30),
  message    TEXT         NOT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ── SEED PRODUCTS ────────────────────────────────────────────
INSERT INTO products (name, description, price, image_url, category, stock) VALUES
('Golden Sunflower Bouquet',  'A radiant arrangement of fresh sunflowers, embodying warmth and joy.',                             48.00, 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=600&q=80', 'Bouquet',     25),
('Midnight Rose Collection',  'Dramatic deep-red roses set against black foliage — a bold, luxurious statement.',                 85.00, 'https://images.unsplash.com/photo-1548094878-84ced0f3b74c?w=600&q=80', 'Luxury',      12),
('Earth & Bloom Centerpiece', 'Earthy dried botanicals, wheat stalks, and seasonal blooms in warm amber tones.',                  62.00, 'https://images.unsplash.com/photo-1487530811015-780ae1b9e6e4?w=600&q=80', 'Centerpiece', 18),
('Wild Meadow Bundle',        'Hand-gathered wildflowers — lavender, chamomile, and cosmos — tied with natural jute twine.',      36.00, 'https://images.unsplash.com/photo-1490750967868-88df5691b207?w=600&q=80', 'Bouquet',     30),
('Solar Orchid Cascade',      'Exotic golden orchids arranged in a cascading waterfall style.',                                  120.00, 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=600&q=80', 'Luxury',       8),
('Terracotta Garden Pot',     'Curated succulents and moss in a hand-thrown terracotta vessel.',                                  55.00, 'https://images.unsplash.com/photo-1459156212016-c812468e2115?w=600&q=80', 'Potted',      20);