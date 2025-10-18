/* Aurora Tees Shop — Extended with 3D Try‑On and robust loader
   - 3D Try‑On modal: upload photo, preview on a simple 3D avatar wearing the selected tee.
   - Local+CDN fallback loader for Three.js and OrbitControls (avoids CSP/CDN issues).
   - Demo T‑shirts + “Demo” filter.
*/

/* =========================
   Utilities
========================= */
function money(n){ return `$${n.toFixed(2)}` }


const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0; // <-- ADD THIS LINE
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
   if (!isTouchDevice()) { // <-- ADD THIS CHECK
      media.addEventListener('pointermove', (e) => {
        const rect = media.getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * 100;
        const my = ((e.clientY - rect.top) / rect.height) * 100;
        shine.style.setProperty('--mx', mx+'%');
        shine.style.setProperty('--my', my+'%');
      });
    } // <-- END THE CHECK
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

