/* Aurora Tees Shop — Extended with 3D Try‑On and robust loader
   - 3D Try‑On modal: upload photo, preview on a simple 3D avatar wearing the selected tee.
   - Local+CDN fallback loader for Three.js and OrbitControls (avoids CSP/CDN issues).
   - Demo T‑shirts + “Demo” filter.
*/

/* =========================
   Utilities
========================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function money(n){ return `$${n.toFixed(2)}` }
function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1) }
function addRipple(e){
  const btn = e.currentTarget;
  const r = document.createElement('span');
  r.className = 'ripple';
  btn.appendChild(r);
  const rect = btn.getBoundingClientRect();
  r.style.left = `${e.clientX - rect.left - 120}px`;
  r.style.top = `${e.clientY - rect.top - 120}px`;
  setTimeout(() => r.remove(), 600);
}
function shuffleArray(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function makeGradient(colors){
  const [c0, c1, c2] = [...colors, colors[0], colors[1]].slice(0,3);
  return `conic-gradient(from 220deg, ${c0}, ${c1}, ${c2}, ${c0})`;
}

/* =========================
   Data
========================= */
const PRODUCTS = [
  {
    id: 'aurora',
    name: 'Aurora Wave Tee',
    price: 29,
    category: 'abstract',
    colors: ['#7C5CFF', '#00E0FF', '#FF8BA7'],
    isNew: true
  },
  {
    id: 'mono',
    name: 'Mono Minimal Tee',
    price: 24,
    category: 'minimal',
    colors: ['#111827', '#374151', '#9ca3af']
  },
  {
    id: 'sunset',
    name: 'Sunset Bloom Tee',
    price: 27,
    category: 'nature',
    colors: ['#FF7A00', '#FFD166', '#2DD4BF']
  },
  {
    id: 'retro',
    name: 'Retro Grid Tee',
    price: 26,
    category: 'retro',
    colors: ['#F72585', '#7209B7', '#4895EF']
  },
  {
    id: 'flow',
    name: 'Flow Lines Tee',
    price: 28,
    category: 'abstract',
    colors: ['#06D6A0', '#118AB2', '#073B4C']
  },
  {
    id: 'flora',
    name: 'Flora Ink Tee',
    price: 25,
    category: 'nature',
    colors: ['#00C853', '#A3E635', '#0EA5E9']
  },
  {
    id: 'noir',
    name: 'Noir Script Tee',
    price: 23,
    category: 'minimal',
    colors: ['#0F172A', '#334155', '#94A3B8']
  },
  {
    id: 'pixel',
    name: 'Pixel Pop Tee',
    price: 30,
    category: 'retro',
    colors: ['#FF1B6B', '#45CAFF', '#FFE45E'],
    isNew: true
  }
];

// Add some "Demo" tees
const DEMO_PRODUCTS = [
  { id: 'demo-neon',   name: 'Demo Neon Tee',       price: 20, category: 'demo', colors: ['#ff1b6b','#45caff','#ffe45e'], isNew: true },
  { id: 'demo-geo',    name: 'Demo Geometry Tee',   price: 22, category: 'demo', colors: ['#00dbde','#fc00ff','#ffd200'] },
  { id: 'demo-waves',  name: 'Demo Waves Tee',      price: 21, category: 'demo', colors: ['#00c6ff','#0072ff','#9d50bb'] },
  { id: 'demo-earth',  name: 'Demo Earth Tee',      price: 23, category: 'demo', colors: ['#0bab64','#3bb78f','#26a0da'] }
];
PRODUCTS.push(...DEMO_PRODUCTS);

const state = {
  filter: 'all',
  search: '',
  cart: loadCart()
};

let cartTriggerElement = null;

/* =========================
   Init
========================= */
function init(){
  const yearEl = $('#year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  // Render products
  renderProducts();

  // Filters (if present)
  $$('#filters .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('#filters .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filter = chip.dataset.filter;
      renderProducts();
    });
  });

  // Search (if present)
  const searchEl = $('#search');
  if(searchEl){
    searchEl.addEventListener('input', (e) => {
      state.search = e.target.value.toLowerCase();
      renderProducts();
    });
  }

  // Cart open/close
  const cartBtn = $('#cart-button'), closeCartBtn = $('#close-cart'), overlay = $('#overlay');
  if(cartBtn) cartBtn.addEventListener('click', openCart);
  if(closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
  if(overlay) overlay.addEventListener('click', closeCart);
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){
      closeCart();
      TryOnModal.close();
    }
  });

  // Checkout (demo)
  const checkoutBtn = $('#checkout');
  if(checkoutBtn){
    checkoutBtn.addEventListener('click', () => {
      if(state.cart.length === 0){
        alert('Your cart is empty.');
        return;
      }
      const summary = state.cart.map(it => `${it.qty} × ${it.name} (${it.color}) - $${(it.price*it.qty).toFixed(2)}`).join('\n');
      alert(`Order Summary:\n\n${summary}\n\nTotal: ${$('#cart-total').textContent}\n\nThis is a demo. Integrate a payment gateway to complete checkout.`);
    });
  }

  // Typed effect (if element exists)
  const typedEl = $('#typed');
  if(typedEl) typeWriter(typedEl, ['bold', 'animated', 'unique'], {speed: 90, hold: 1200});

  // Reveal on scroll
  setupReveals();

  // Update cart UI
  updateCartBadge();
  renderCart();

  // 3D Try-on Modal
  TryOnModal.injectStyles();
  TryOnModal.mountUI();
}
document.addEventListener('DOMContentLoaded', init);

/* =========================
   Rendering: Products
========================= */
function renderProducts(){
  const grid = $('#grid');
  if(!grid) return;
  grid.innerHTML = '';

  const list = PRODUCTS.filter(p =>
    (state.filter === 'all' || p.category === state.filter) &&
    (state.search === '' || p.name.toLowerCase().includes(state.search))
  );

  if(list.length === 0){
    grid.innerHTML = `<p style="grid-column: 1/-1; color: var(--muted)">No products match your search.</p>`;
    return;
  }

  const tpl = $('#product-card-template');
  list.forEach(product => {
    const card = tpl.content.firstElementChild.cloneNode(true);

    const media = $('.media', card);
    const art = $('.art', media);
    const shine = $('.shine', media);

    // Dynamic conic gradient based on first 3 colors
    art.style.backgroundImage = makeGradient(product.colors);

    // Mouse move parallax light
    media.addEventListener('pointermove', (e) => {
      const rect = media.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 100;
      const my = ((e.clientY - rect.top) / rect.height) * 100;
      shine.style.setProperty('--mx', mx+'%');
      shine.style.setProperty('--my', my+'%');
    });

    // Badge
    if(product.isNew) {
      $('.badge.new', media).style.display = 'inline-block';
    } else {
      $('.badge.new', media).style.display = 'none';
    }

    // Wishlist
    const fav = $('.fav', card);
    fav.addEventListener('click', () => fav.classList.toggle('active'));

    // Info
    $('.title', card).textContent = product.name;
    $('.price', card).textContent = money(product.price);
    $('.meta', card).textContent = capitalize(product.category) + ' • 100% cotton';

    // Swatches
    const swatches = $('.swatches', card);
    let selectedColor = product.colors[0];
    product.colors.forEach((c, idx) => {
      const s = document.createElement('button');
      s.className = 'swatch' + (idx === 0 ? ' active' : '');
      s.style.background = c;
      s.setAttribute('aria-label', `Select color ${c}`);
      s.addEventListener('click', () => {
        selectedColor = c;
        $$('.swatch', swatches).forEach(el => el.classList.remove('active'));
        s.classList.add('active');
        art.style.backgroundImage = makeGradient([selectedColor, ...shuffleArray(product.colors).slice(0,2)]);
      });
      swatches.appendChild(s);
    });

    // Add to cart
    const btn = $('.btn.add', card);
    btn.addEventListener('click', (e) => {
      addRipple(e);
      addToCart({
        id: `${product.id}-${selectedColor}`.toLowerCase(),
        sku: product.id,
        name: product.name,
        color: selectedColor,
        price: product.price,
        qty: 1,
        colors: product.colors
      });
      // Confetti at cart icon
      const cartButton = $('#cart-button');
      if(cartButton) confettiBurst(cartButton, [selectedColor, ...product.colors]);
    });

    // Attach and set reveal
    grid.appendChild(card);
    requestAnimationFrame(() => card.classList.add('visible'));
  });
}

/* =========================
   Cart
========================= */
function loadCart(){
  try{
    return JSON.parse(localStorage.getItem('aurora_cart') || '[]');
  }catch(e){ return []; }
}
function saveCart(){
  localStorage.setItem('aurora_cart', JSON.stringify(state.cart));
}
function updateCartBadge(){
  const count = state.cart.reduce((n, it) => n + it.qty, 0);
  const badge = $('#cart-count');
  if(badge) badge.textContent = count;
}
function renderCart(){
  const wrap = $('#cart-items');
  if(!wrap) return;
  wrap.innerHTML = '';
  let subtotal = 0;

  state.cart.forEach(item => {
    subtotal += item.price * item.qty;

    const row = document.createElement('div');
    row.className = 'cart-item';

    const thumb = document.createElement('div');
    thumb.className = 'cart-thumb';
    const art = document.createElement('div');
    art.className = 'art';
    art.style.backgroundImage = makeGradient([item.color, ...shuffleArray(item.colors).slice(0,2)]);
    thumb.appendChild(art);

    const details = document.createElement('div');
    const name = document.createElement('p');
    name.className = 'name';
    name.textContent = item.name;
    const sub = document.createElement('p');
    sub.className = 'sub';
    sub.textContent = `Color ${item.color.toUpperCase()}`;
    const qty = document.createElement('div');
    qty.className = 'qty';
    const minus = document.createElement('button'); minus.textContent = '−';
    const q = document.createElement('span'); q.textContent = item.qty;
    const plus = document.createElement('button'); plus.textContent = '+';

    minus.addEventListener('click', () => updateQty(item.id, -1));
    plus.addEventListener('click', () => updateQty(item.id, +1));

    qty.append(minus, q, plus);

    // Try-on button
    const tryBtn = document.createElement('button');
    tryBtn.className = 'btn small';
    tryBtn.style.marginTop = '8px';
    tryBtn.textContent = 'Try on';
    tryBtn.addEventListener('click', () => {
      TryOnModal.open(item);
      closeCart(); // Close cart to focus on try-on modal
    });

    details.append(name, sub, qty, tryBtn);

    const price = document.createElement('div');
    price.className = 'price';
    price.textContent = money(item.price * item.qty);

    row.append(thumb, details, price);
    wrap.appendChild(row);
  });

  const subEl = $('#cart-subtotal');
  const totalEl = $('#cart-total');
  if(subEl) subEl.textContent = money(subtotal);
  if(totalEl) totalEl.textContent = money(subtotal); // shipping could be added
}
function addToCart(newItem){
  const i = state.cart.findIndex(it => it.id === newItem.id);
  if(i > -1){
    state.cart[i].qty += newItem.qty;
  } else {
    state.cart.push(newItem);
  }
  saveCart();
  updateCartBadge();
  renderCart();
}
function updateQty(id, delta){
  const i = state.cart.findIndex(it => it.id === id);
  if(i === -1) return;
  state.cart[i].qty += delta;
  if(state.cart[i].qty <= 0) state.cart.splice(i, 1);
  saveCart();
  updateCartBadge();
  renderCart();
}

/* Drawer */
function openCart(){
  cartTriggerElement = document.activeElement;
  const cart = $('#cart'), overlay = $('#overlay');
  if(cart) cart.classList.add('show');
  if(overlay) overlay.classList.add('show');
  if(cart) cart.setAttribute('aria-hidden', 'false');
}
function closeCart(){
  const cart = $('#cart'), overlay = $('#overlay');
  if(cart) cart.classList.remove('show');
  if(overlay) overlay.classList.remove('show');
  if(cart) cart.setAttribute('aria-hidden', 'true');
  if (cartTriggerElement) {
    cartTriggerElement.focus();
    cartTriggerElement = null;
  }
}

/* =========================
   Typed Text
========================= */
function typeWriter(el, words, {speed=100, hold=1000} = {}){
  let i = 0, j = 0, forward = true;
  function step(){
    const word = words[i % words.length];
    if(forward){
      j++;
      el.textContent = word.slice(0, j);
      if(j === word.length){ forward = false; setTimeout(step, hold); return; }
    } else {
      j--;
      el.textContent = word.slice(0, j);
      if(j === 0){ forward = true; i++; }
    }
    setTimeout(step, speed);
  }
  step();
}

/* =========================
   Reveal on Scroll
========================= */
function setupReveals(){
  const els = $$('.reveal');
  if(els.length === 0) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
}

/* =========================
   Confetti
========================= */
function confettiBurst(targetEl, colors){
  const rect = targetEl.getBoundingClientRect();
  const x = rect.left + rect.width/2;
  const y = rect.top + rect.height/2;

  const pieces = 18;
  for(let i=0;i<pieces;i++){
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = x + 'px';
    piece.style.top = y + 'px';
    const angle = Math.random() * 2 * Math.PI;
    const distance = 60 + Math.random() * 60;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    piece.style.setProperty('--dx', `${dx}px`);
    piece.style.setProperty('--dy', `${dy}px`);
    piece.style.setProperty('--rot', `${(Math.random()*360)|0}deg`);
    piece.style.background = colors[i % colors.length];
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 750);
  }
}

/* =========================
   3D Try-on Modal
========================= */
const TryOnModal = (() => {
  // Robust loader: local files first, then jsDelivr, then unpkg
  // FIX: Using a stable three.js version (r128) where UMD builds for controls are reliably available.
  const THREE_SOURCES = [
    './libs/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js'
  ];
  const ORBIT_SOURCES = [
    './libs/OrbitControls.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'
  ];

  let root, backdrop, modal, canvasWrap, controlsWrap, headerName, headerPrice, fileInput, swatchesWrap, closeBtn, continueBtn;
  let hasMounted = false;

  const state = {
    open: false,
    item: null,
    selectedColor: null,
    threeLoaded: !!(window.THREE && window.THREE.OrbitControls),
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    avatar: null,
    shirtMesh: null,
    faceMesh: null,
    ro: null,
    animId: 0,
    triggerElement: null
  };

  const CSS = `
  .tryon-root{ position: fixed; inset: 0; display: none; z-index: 60; }
  .tryon-root.show{ display: grid; place-items: center; }
  .tryon-backdrop{ position:absolute; inset:0; background: rgba(9,10,12,0.55); backdrop-filter: blur(4px); }
  .tryon-modal{ position:relative; width:min(1000px, 92vw); height:min(80vh, 760px); background: var(--surface, #fff); border-radius: 16px; box-shadow: var(--shadow, 0 12px 40px rgba(14,21,37,.15)); display:grid; grid-template-rows: auto 1fr; overflow:hidden; }
  .tryon-header{ display:flex; align-items:center; justify-content:space-between; padding: 10px 12px; border-bottom: 1px solid rgba(0,0,0,0.06) }
  .tryon-header h3{ margin:0; font-size: 16px }
  .tryon-close{ border:0; background:#fff; border-radius: 10px; padding: 8px 10px; cursor:pointer; box-shadow: var(--shadow-soft, 0 8px 24px rgba(14,21,37,.1)); }
  .tryon-body{ display:grid; grid-template-columns: 1.2fr .8fr; min-height:0 }
  .tryon-canvas{ position: relative; background: linear-gradient(180deg, #f4f7ff, #eef4ff); }
  .tryon-controls{ padding: 12px; overflow:auto; display:grid; gap: 12px; align-content: start; background: #fafbff }
  .tryon-controls .box{ background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 10px }
  .tryon-controls label{ display:block; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted, #64748b); margin-bottom: 6px }
  .tryon-controls input[type="file"]{ width:100%; background: #fff; border: 1px dashed rgba(0,0,0,0.15); border-radius: 10px; padding: 10px }
  .tryon-swatches{ display:flex; gap: 8px; flex-wrap: wrap }
  .tryon-swatches .swatch{ width: 28px; height: 28px; border-radius: 999px; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.12); outline: 2px solid transparent; cursor:pointer }
  .tryon-swatches .swatch.active{ outline-color: rgba(0,0,0,0.2) }
  .tryon-meta{ display:flex; align-items:center; justify-content:space-between; gap:8px }
  .tryon-title{ font-weight:700; }
  .tryon-price{ font-weight:700; }
  @media (max-width: 900px){
    .tryon-body{ grid-template-columns: 1fr; grid-template-rows: 1fr auto }
  }`;

  function injectStyles(){
    // Skip inject if styles already included in main CSS
    if(document.getElementById('tryon-styles')) return;
    const style = document.createElement('style');
    style.id = 'tryon-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function mountUI(){
    if(hasMounted) return;

    root = document.createElement('div');
    root.className = 'tryon-root';
    root.setAttribute('aria-hidden', 'true');

    backdrop = document.createElement('div');
    backdrop.className = 'tryon-backdrop';

    modal = document.createElement('div');
    modal.className = 'tryon-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', '3D Try-on');

    const header = document.createElement('div');
    header.className = 'tryon-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'tryon-meta';
    headerName = document.createElement('div');
    headerName.className = 'tryon-title';
    headerPrice = document.createElement('div');
    headerPrice.className = 'tryon-price';
    titleWrap.append(headerName, headerPrice);

    closeBtn = document.createElement('button');
    closeBtn.className = 'tryon-close';
    closeBtn.textContent = '✕';

    header.append(titleWrap, closeBtn);

    const body = document.createElement('div');
    body.className = 'tryon-body';

    canvasWrap = document.createElement('div');
    canvasWrap.className = 'tryon-canvas';

    controlsWrap = document.createElement('div');
    controlsWrap.className = 'tryon-controls';

    // Controls content
    const upBox = document.createElement('div');
    upBox.className = 'box';
    const upLabel = document.createElement('label');
    upLabel.textContent = 'Upload your photo';
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    upBox.append(upLabel, fileInput);

    const swBox = document.createElement('div');
    swBox.className = 'box';
    const swLabel = document.createElement('label');
    swLabel.textContent = 'Shirt color';
    swatchesWrap = document.createElement('div');
    swatchesWrap.className = 'tryon-swatches';
    swBox.append(swLabel, swatchesWrap);

    continueBtn = document.createElement('button');
    continueBtn.className = 'btn primary full';
    continueBtn.textContent = 'Continue shopping';

    controlsWrap.append(upBox, swBox, continueBtn);

    body.append(canvasWrap, controlsWrap);
    modal.append(header, body);
    root.append(backdrop, modal);
    document.body.appendChild(root);

    // Events
    backdrop.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    continueBtn.addEventListener('click', close);
    fileInput.addEventListener('change', onPhotoSelected);

    hasMounted = true;
  }

  function loadScriptOnce(src){
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[data-dyn="${src}"]`) || document.querySelector(`script[src="${src}"]`)){
        // Already present
        setTimeout(resolve, 0);
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.dataset.dyn = src;
      s.crossOrigin = 'anonymous';
      s.referrerPolicy = 'no-referrer';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  function loadFirst(urls, readyTest){
    return new Promise(async (resolve, reject) => {
      for(const url of urls){
        try{
          await loadScriptOnce(url);
          if(!readyTest || readyTest()){
            console.info('[TryOn] Using', url);
            return resolve(url);
          }else{
            console.warn('[TryOn] Loaded but readiness test failed:', url);
          }
        }catch(err){
          console.warn('[TryOn] Failed source:', url, err);
        }
      }
      reject(new Error('All sources failed: ' + urls.join(', ')));
    });
  }

  function ensureThree(){
    if(state.threeLoaded && window.THREE && window.THREE.OrbitControls){
      return Promise.resolve(window.THREE);
    }
    const haveTHREE = !!window.THREE;

    const loadCore = haveTHREE
      ? Promise.resolve()
      : loadFirst(THREE_SOURCES, () => !!window.THREE);

    return loadCore
      .then(() => loadFirst(ORBIT_SOURCES, () => window.THREE && window.THREE.OrbitControls))
      .then(() => {
        state.threeLoaded = true;
        return window.THREE;
      });
  }

  function createGradientTextureThree(colors){
    const size = 1024;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');

    // vertical gradient
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    const steps = colors.length;
    colors.forEach((col, i) => grad.addColorStop(i/(steps-1), col));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // simple design overlay stripes
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#000';
    for(let i=0;i<16;i++){
      ctx.fillRect(0, i*size/16, size, 2);
    }
    ctx.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 8;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1,1);
    return tex;
  }

  function createAvatar(item, selectedColor){
    const group = new THREE.Group();

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222244, 0.8);
    group.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(-2, 3, 4);
    dir.castShadow = false;
    group.add(dir);

    // Ground
    const groundGeo = new THREE.CircleGeometry(5, 64);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xf0f4ff, roughness: 1, metalness: 0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI/2;
    ground.position.y = 0;
    group.add(ground);

    // Skin material
    const skin = new THREE.MeshStandardMaterial({ color: 0xffd8c2, roughness: 0.8 });

    // Torso (body)
    const torsoGeo = new THREE.CylinderGeometry(0.65, 0.75, 1.4, 24, 1, false);
    const torso = new THREE.Mesh(torsoGeo, skin);
    torso.position.y = 1.4;
    group.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.35, 24, 16);
    const head = new THREE.Mesh(headGeo, skin);
    head.position.y = 2.3;
    group.add(head);

    // Face plane (for photo)
    const faceGeo = new THREE.PlaneGeometry(0.7, 0.9);
    const faceMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.set(0, 2.28, 0.36);
    group.add(face);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.0, 16);
    const lArm = new THREE.Mesh(armGeo, skin);
    const rArm = new THREE.Mesh(armGeo, skin);
    lArm.position.set(-0.85, 1.5, 0);
    rArm.position.set(0.85, 1.5, 0);
    lArm.rotation.z = Math.PI/8;
    rArm.rotation.z = -Math.PI/8;
    group.add(lArm, rArm);

    // Shirt (cylinder around torso)
    const colors = rotateColorsFor(selectedColor, item.colors);
    const shirtTexture = createGradientTextureThree(colors);
    const shirtMat = new THREE.MeshStandardMaterial({
      map: shirtTexture, roughness: 0.6, metalness: 0.0
    });
    const shirtGeo = new THREE.CylinderGeometry(0.7, 0.8, 1.2, 32, 1, true);
    const shirt = new THREE.Mesh(shirtGeo, shirtMat);
    shirt.position.y = 1.4;

    // Seam at back
    shirt.rotation.y = Math.PI;
    group.add(shirt);

    // Neckline (ring)
    const ringGeo = new THREE.TorusGeometry(0.36, 0.03, 12, 64);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
    ring.position.y = 2.0;
    ring.rotation.x = Math.PI/2;
    group.add(ring);

    // Subtle idle motion
    group.tick = (t) => {
      const lift = Math.sin(t/900) * 0.01;
      group.position.y = lift;
      dir.position.x = Math.sin(t/1200)*3;
      dir.position.z = 3.5 + Math.cos(t/1500);
    };

    return { group, shirt, face };
  }

  function rotateColorsFor(selected, colors){
    const idx = colors.indexOf(selected);
    if(idx <= 0) return colors;
    return [...colors.slice(idx), ...colors.slice(0, idx)];
  }

  function onPhotoSelected(e){
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      applyFaceTexture(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function applyFaceTexture(dataUrl){
    if(!state.faceMesh) return;
    const img = new Image();
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.needsUpdate = true;
      tex.anisotropy = 8;
      state.faceMesh.material.map = tex;
      state.faceMesh.material.opacity = 1;
      state.faceMesh.material.needsUpdate = true;

      // Fit plane aspect to image
      const aspect = img.width / img.height;
      state.faceMesh.scale.set(aspect, 1, 1);
    };
    img.src = dataUrl;
  }

  function resizeRenderer(){
    if(!state.renderer || !state.camera || !canvasWrap) return;
    const rect = canvasWrap.getBoundingClientRect();
    state.renderer.setSize(rect.width, rect.height, false);
    state.camera.aspect = rect.width / rect.height;
    state.camera.updateProjectionMatrix();
  }

  function startRenderLoop(){
    cancelAnimationFrame(state.animId);
    const render = (t) => {
      if(state.avatar && state.avatar.group.tick) state.avatar.group.tick(t);
      if(state.controls && state.controls.update) state.controls.update();
      state.renderer.render(state.scene, state.camera);
      state.animId = requestAnimationFrame(render);
    };
    state.animId = requestAnimationFrame(render);
  }

  function initThree(item){
    const rect = canvasWrap.getBoundingClientRect();

    // Renderer
    state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    state.renderer.setSize(rect.width, rect.height);
    canvasWrap.innerHTML = '';
    canvasWrap.appendChild(state.renderer.domElement);

    // Scene + Camera
    state.scene = new THREE.Scene();
    state.camera = new THREE.PerspectiveCamera(45, rect.width/rect.height, 0.1, 100);
    state.camera.position.set(0, 1.6, 4);

    // Avatar
    const selectedColor = state.selectedColor || item.color || item.colors[0] || '#ffffff';
    state.avatar = createAvatar(item, selectedColor);
    state.scene.add(state.avatar.group);
    state.shirtMesh = state.avatar.shirt;
    state.faceMesh = state.avatar.face;

    // Controls
    state.controls = new THREE.OrbitControls(state.camera, state.renderer.domElement);
    state.controls.target.set(0, 1.6, 0);
    state.controls.enablePan = false;
    state.controls.enableDamping = true;
    state.controls.minDistance = 2;
    state.controls.maxDistance = 6;
    state.controls.maxPolarAngle = Math.PI * 0.58;

    // Resize
    if(state.ro) state.ro.disconnect();
    state.ro = new ResizeObserver(resizeRenderer);
    state.ro.observe(canvasWrap);
    window.addEventListener('resize', resizeRenderer);

    startRenderLoop();
  }

  function updateShirtColors(colors){
    if(!state.shirtMesh) return;
    const tex = createGradientTextureThree(colors);
    state.shirtMesh.material.map = tex;
    state.shirtMesh.material.needsUpdate = true;
  }

  function buildSwatches(item){
    swatchesWrap.innerHTML = '';
    const colors = item.colors || ['#ffffff'];
    colors.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'swatch' + (c === state.selectedColor ? ' active' : '');
      b.style.background = c;
      b.setAttribute('aria-label', `Select color ${c}`);
      b.addEventListener('click', () => {
        state.selectedColor = c;
        $$('.swatch', swatchesWrap).forEach(el => el.classList.remove('active'));
        b.classList.add('active');
        const rotated = rotateColorsFor(c, item.colors);
        updateShirtColors(rotated);
      });
      swatchesWrap.appendChild(b);
    });
  }

  function open(item){
    if(!hasMounted) mountUI();
    state.triggerElement = document.activeElement;
    state.item = item;
    state.selectedColor = item.color || (item.colors && item.colors[0]) || '#ffffff';

    headerName.textContent = item.name || 'Selected Tee';
    headerPrice.textContent = money(item.price || 0);

    buildSwatches(item);

    root.classList.add('show');
    root.setAttribute('aria-hidden', 'false');
    state.open = true;

    ensureThree().then(() => {
      initThree(item);
    }).catch(err => {
      console.error('Failed to load 3D engine:', err);
      canvasWrap.innerHTML = '<div style="padding:20px;color:#e11d48">Failed to load 3D viewer. Check your connection or CSP.</div>';
    });
  }

  function close(){
    if(!state.open) return;
    root.classList.remove('show');
    root.setAttribute('aria-hidden', 'true');
    state.open = false;
    if (state.triggerElement) {
        state.triggerElement.focus();
        state.triggerElement = null;
    }

    // Cleanup renderer loop
    cancelAnimationFrame(state.animId);
    if(state.controls && state.controls.dispose) state.controls.dispose();
    if(state.renderer){
      state.renderer.dispose?.();
      const cnv = state.renderer.domElement;
      if(cnv && cnv.parentNode === canvasWrap) canvasWrap.removeChild(cnv);
    }
    state.scene = null;
    state.camera = null;
    state.controls = null;
    state.avatar = null;
    state.shirtMesh = null;
    state.faceMesh = null;
  }

  return {
    injectStyles,
    mountUI,
    open,
    close
  };
})();

/* =========================
   End of Try-on Modal
========================= */

/* Optional: smooth anchor scroll for older browsers */
$$('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const el = document.querySelector(id);
    if(el){
      e.preventDefault();
      el.scrollIntoView({behavior:'smooth'});
    }
  });
});

