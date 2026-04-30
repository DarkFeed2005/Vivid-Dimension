/* ============================================================
   BLOOM & CO. — main.js
   Three.js 3D Hero  +  API integration  +  UI interactions
   ============================================================ */

'use strict';

// ─────────────────────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────────────────────
const API_BASE = ''; // empty = same origin; set to 'http://localhost:3000' if testing standalone HTML

// ─────────────────────────────────────────────────────────────
//  1. THREE.JS — Floating 3D Garden Hero
// ─────────────────────────────────────────────────────────────
(function initThreeJS() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas || typeof THREE === 'undefined') return;

  /* ── Renderer ──────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setClearColor(0x000000, 0);

  /* ── Scene & Camera ────────────────────────────────────── */
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 8);

  /* ── Colour helpers ────────────────────────────────────── */
  const BLACK  = new THREE.Color(0x0a0905);
  const BROWN  = new THREE.Color(0x7a5230);
  const YELLOW = new THREE.Color(0xf5c518);
  const CREAM  = new THREE.Color(0xf7f0e3);

  /* ── Lights ────────────────────────────────────────────── */
  const ambient  = new THREE.AmbientLight(0xffffff, 0.4);
  const keyLight = new THREE.DirectionalLight(0xf5c518, 2.5);
  keyLight.position.set(5, 8, 6);
  const fillLight = new THREE.PointLight(0x7a5230, 1.5, 20);
  fillLight.position.set(-5, -3, 4);
  const rimLight = new THREE.DirectionalLight(0xf7f0e3, 0.6);
  rimLight.position.set(-4, 4, -6);
  scene.add(ambient, keyLight, fillLight, rimLight);

  /* ── Material factory ──────────────────────────────────── */
  const mat = (col, rough = 0.4, metal = 0.1, opacity = 1) => {
    const m = new THREE.MeshStandardMaterial({
      color: col, roughness: rough, metalness: metal,
      transparent: opacity < 1, opacity
    });
    return m;
  };

  /* ── BUILD: Central 3D Flower ──────────────────────────── */
  const flowerGroup = new THREE.Group();
  scene.add(flowerGroup);

  // Stem
  const stemGeo = new THREE.CylinderGeometry(0.04, 0.07, 2.8, 8);
  const stem    = new THREE.Mesh(stemGeo, mat(BROWN, 0.8, 0));
  stem.position.y = -1.8;
  flowerGroup.add(stem);

  // Flower centre (sphere)
  const centreGeo = new THREE.SphereGeometry(0.42, 32, 32);
  const centre    = new THREE.Mesh(centreGeo, mat(BROWN, 0.5, 0.2));
  flowerGroup.add(centre);

  // Petals
  const petalCount = 12;
  for (let i = 0; i < petalCount; i++) {
    const angle  = (i / petalCount) * Math.PI * 2;
    const layer  = i % 2; // two layers for realism
    const radius = 0.78 + layer * 0.18;
    const petalGeo = new THREE.SphereGeometry(0.28, 12, 8);
    const petal    = new THREE.Mesh(petalGeo, mat(YELLOW, 0.55, 0.05));
    petal.scale.set(1, 1.7, 0.35);
    petal.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.35 - 0.04,
      layer * 0.08
    );
    petal.rotation.z = angle + Math.PI / 2;
    flowerGroup.add(petal);
  }

  // Inner ring of smaller petals
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const pg    = new THREE.SphereGeometry(0.14, 8, 6);
    const p     = new THREE.Mesh(pg, mat(new THREE.Color(0xe8b412), 0.6, 0.05));
    p.scale.set(1, 1.5, 0.4);
    p.position.set(Math.cos(angle) * 0.54, Math.sin(angle) * 0.22 - 0.02, 0.12);
    p.rotation.z = angle + Math.PI / 2;
    flowerGroup.add(p);
  }

  // Two leaves on stem
  [-0.6, 0.6].forEach((side, i) => {
    const leafGeo = new THREE.SphereGeometry(0.22, 8, 6);
    const leaf    = new THREE.Mesh(leafGeo, mat(new THREE.Color(0x3a5c2a), 0.7, 0));
    leaf.scale.set(1.3, 0.4, 0.15);
    leaf.position.set(side * 0.45, -0.9 - i * 0.4, 0.1);
    leaf.rotation.z = side * 0.6;
    flowerGroup.add(leaf);
  });

  flowerGroup.position.set(2.8, 0.2, 0);

  /* ── BUILD: Floating Particle Field ────────────────────── */
  const particleCount = 280;
  const positions = new Float32Array(particleCount * 3);
  const colors    = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    positions[i3]     = (Math.random() - 0.5) * 18;
    positions[i3 + 1] = (Math.random() - 0.5) * 12;
    positions[i3 + 2] = (Math.random() - 0.5) * 10 - 2;

    // Random colour: yellow or cream
    const col = Math.random() > 0.4 ? YELLOW : CREAM;
    colors[i3]     = col.r;
    colors[i3 + 1] = col.g;
    colors[i3 + 2] = col.b;
  }

  const partGeo = new THREE.BufferGeometry();
  partGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  partGeo.setAttribute('color',    new THREE.BufferAttribute(colors,    3));

  const partMat = new THREE.PointsMaterial({
    size: 0.06,
    vertexColors: true,
    transparent: true,
    opacity: 0.65,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(partGeo, partMat);
  scene.add(particles);

  /* ── BUILD: Floating mini spheres ──────────────────────── */
  const miniSpheres = [];
  const miniData    = [
    { col: YELLOW, s: 0.12, pos: [-3.5,  2.0, -1] },
    { col: BROWN,  s: 0.18, pos: [-2.0, -2.5, -0.5] },
    { col: CREAM,  s: 0.08, pos: [ 4.5,  1.5,  0] },
    { col: YELLOW, s: 0.10, pos: [ 1.0,  3.2, -2] },
    { col: BROWN,  s: 0.22, pos: [-4.2, -0.8,  0.5] },
    { col: CREAM,  s: 0.14, pos: [ 3.0, -2.8, -1] },
    { col: YELLOW, s: 0.09, pos: [-1.5,  3.5,  1] },
  ];
  miniData.forEach(({ col, s, pos }) => {
    const g    = new THREE.SphereGeometry(s, 16, 16);
    const mesh = new THREE.Mesh(g, mat(col, 0.3, 0.4, 0.82));
    mesh.position.set(...pos);
    mesh._offset = Math.random() * Math.PI * 2;
    mesh._speed  = 0.3 + Math.random() * 0.5;
    scene.add(mesh);
    miniSpheres.push(mesh);
  });

  /* ── Mouse parallax ────────────────────────────────────── */
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  window.addEventListener('mousemove', e => {
    mouse.targetX = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  /* ── Resize handler ────────────────────────────────────── */
  const onResize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  window.addEventListener('resize', onResize);

  /* ── Animation loop ────────────────────────────────────── */
  const clock = new THREE.Clock();
  const animate = () => {
    requestAnimationFrame(animate);
    const t  = clock.getElapsedTime();
    const dt = clock.getDelta ? 0.016 : 0.016;

    // Smooth mouse interpolation
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    // Flower: slow spin + gentle bob + mouse parallax
    flowerGroup.rotation.y = t * 0.25 + mouse.x * 0.3;
    flowerGroup.rotation.x = mouse.y * 0.15;
    flowerGroup.position.y = 0.2 + Math.sin(t * 0.7) * 0.12;

    // Particles: slow drift
    particles.rotation.y = t * 0.04;
    particles.rotation.x = t * 0.02;

    // Mini spheres: orbit / float
    miniSpheres.forEach(m => {
      m.position.y += Math.sin(t * m._speed + m._offset) * 0.003;
      m.rotation.y += 0.005;
    });

    // Camera subtle parallax
    camera.position.x = mouse.x * 0.4;
    camera.position.y = -mouse.y * 0.25;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  };
  animate();
})();

// ─────────────────────────────────────────────────────────────
//  2. NAVBAR — scroll effect + mobile toggle
// ─────────────────────────────────────────────────────────────
(function initNavbar() {
  const navbar    = document.getElementById('navbar');
  const toggle    = document.getElementById('navToggle');
  const navLinks  = document.getElementById('navLinks');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  toggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });

  // Close menu on link click
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => navLinks.classList.remove('open'));
  });
})();

// ─────────────────────────────────────────────────────────────
//  3. PRODUCTS — fetch from API, render grid
// ─────────────────────────────────────────────────────────────
(function initProducts() {
  const grid        = document.getElementById('productGrid');
  const loadingEl   = document.getElementById('loadingState');
  const errorEl     = document.getElementById('errorState');
  const filterBar   = document.getElementById('filterBar');

  let allProducts   = [];
  let activeFilter  = 'all';

  /* Fetch products from the Express API */
  async function fetchProducts() {
    try {
      const res  = await fetch(`${API_BASE}/api/products`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data;
    } catch (err) {
      console.error('Products fetch failed:', err);
      return null;
    }
  }

  /* Build a single product card element */
  function buildCard(product, delay = 0) {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.category = product.category || '';
    card.style.animationDelay = `${delay}ms`;

    const price   = parseFloat(product.price).toFixed(2);
    const [dollars, cents] = price.split('.');
    const imgSrc  = product.image_url || 'https://images.unsplash.com/photo-1490750967868-88df5691b207?w=600&q=80';

    card.innerHTML = `
      <div class="product-img-wrap">
        <img src="${imgSrc}" alt="${escHtml(product.name)}" loading="lazy" />
        ${product.category ? `<span class="product-category">${escHtml(product.category)}</span>` : ''}
      </div>
      <div class="product-info">
        <h3>${escHtml(product.name)}</h3>
        ${product.description ? `<p class="desc">${escHtml(product.description)}</p>` : ''}
        <div class="product-footer">
          <div class="product-price">
            <sup>$</sup>${escHtml(dollars)}<small>.${cents}</small>
          </div>
          <button class="add-to-cart" data-id="${product.id}">Add to Cart</button>
        </div>
      </div>`;

    // Add-to-cart feedback
    card.querySelector('.add-to-cart').addEventListener('click', function () {
      this.textContent = 'Added ✓';
      this.style.background = 'var(--yellow)';
      this.style.color = 'var(--black)';
      setTimeout(() => {
        this.textContent = 'Add to Cart';
        this.style.background = '';
        this.style.color = '';
      }, 2000);
    });

    return card;
  }

  /* Render currently-filtered products */
  function renderProducts() {
    grid.innerHTML = '';
    const filtered = activeFilter === 'all'
      ? allProducts
      : allProducts.filter(p => p.category === activeFilter);

    if (!filtered.length) {
      grid.innerHTML = '<p style="color:var(--muted);text-align:center;grid-column:1/-1;padding:3rem">No products in this category.</p>';
      return;
    }
    filtered.forEach((p, i) => grid.appendChild(buildCard(p, i * 60)));
  }

  /* Filter buttons */
  filterBar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderProducts();
  });

  /* Init */
  (async () => {
    const data = await fetchProducts();
    loadingEl.classList.add('hidden');

    if (!data) {
      errorEl.classList.remove('hidden');
      // Fallback sample data so the UI still looks good offline
      allProducts = [
        { id: 1, name: 'Golden Sunflower Bouquet', description: 'A radiant arrangement of fresh sunflowers.', price: 48.00, image_url: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=600&q=80', category: 'Bouquet' },
        { id: 2, name: 'Midnight Rose Collection', description: 'Dramatic deep-red roses — a luxurious statement.', price: 85.00, image_url: 'https://images.unsplash.com/photo-1548094878-84ced0f3b74c?w=600&q=80', category: 'Luxury' },
        { id: 3, name: 'Earth & Bloom Centerpiece', description: 'Earthy dried botanicals in warm amber tones.', price: 62.00, image_url: 'https://images.unsplash.com/photo-1487530811015-780ae1b9e6e4?w=600&q=80', category: 'Centerpiece' },
        { id: 4, name: 'Wild Meadow Bundle', description: 'Hand-gathered wildflowers tied with natural jute.', price: 36.00, image_url: 'https://images.unsplash.com/photo-1490750967868-88df5691b207?w=600&q=80', category: 'Bouquet' },
        { id: 5, name: 'Solar Orchid Cascade', description: 'Exotic golden orchids in a cascading style.', price: 120.00, image_url: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=600&q=80', category: 'Luxury' },
        { id: 6, name: 'Terracotta Garden Pot', description: 'Succulents and moss in a hand-thrown terracotta vessel.', price: 55.00, image_url: 'https://images.unsplash.com/photo-1459156212016-c812468e2115?w=600&q=80', category: 'Potted' },
      ];
      renderProducts();
      return;
    }

    allProducts = data;
    renderProducts();
  })();
})();

// ─────────────────────────────────────────────────────────────
//  4. CONTACT FORM — POST to /api/contact
// ─────────────────────────────────────────────────────────────
(function initContactForm() {
  const form       = document.getElementById('contactForm');
  const submitBtn  = document.getElementById('submitBtn');
  const feedback   = document.getElementById('formFeedback');
  const btnText    = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');

  const showFeedback = (msg, type) => {
    feedback.textContent = msg;
    feedback.className   = `form-feedback ${type}`;
    feedback.classList.remove('hidden');
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    feedback.classList.add('hidden');

    // Client-side validation
    const name    = form.name.value.trim();
    const email   = form.email.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !message) {
      showFeedback('Please fill in all required fields.', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFeedback('Please enter a valid email address.', 'error');
      return;
    }

    // Loading state
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');
    submitBtn.disabled = true;

    try {
      const res  = await fetch(`${API_BASE}/api/contact`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, phone: form.phone.value.trim(), message }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        showFeedback(json.message, 'success');
        form.reset();
      } else {
        showFeedback(json.message || 'Something went wrong. Please try again.', 'error');
      }
    } catch (err) {
      showFeedback('Network error — please check your connection and try again.', 'error');
    } finally {
      btnText.classList.remove('hidden');
      btnLoading.classList.add('hidden');
      submitBtn.disabled = false;
    }
  });
})();

// ─────────────────────────────────────────────────────────────
//  5. UTILITIES
// ─────────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}