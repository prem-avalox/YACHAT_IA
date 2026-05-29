/* =============================================
   TechCore EC — main.js
   Lógica de la tienda: catálogo, carrito, filtros
   ============================================= */

const API = '/api';
const SESSION_KEY = 'techcore_session';

// Obtener o generar ID de sesión
function getSessionId() {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = 'tc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}
const SESSION_ID = getSessionId();

// ---- Emojis por categoría ----
const CATEGORY_ICONS = {
  'Procesador': '🔲',
  'Placa madre': '🔌',
  'Memoria RAM': '🧮',
  'Tarjeta grafica': '🎮',
  'Fuente de poder': '⚡',
  'Almacenamiento': '💾',
  'Gabinete': '🖥',
  'Monitor': '🖥️',
  'Periferico': '🖱',
};

// ---- Estado ----
let allProducts = [];
let filteredProducts = [];
let activeFilter = 'all';
let maxPrice = 1500;
let sortMode = 'default';
let searchQuery = '';

// ---- Cargar productos ----
async function loadProducts() {
  try {
    showLoading(true);
    const res = await fetch(`${API}/products?limit=100`);
    const data = await res.json();
    allProducts = data.productos || [];
    applyFilters();
  } catch (err) {
    console.error('Error cargando productos:', err);
    document.getElementById('loadingState').innerHTML =
      '<p style="color:var(--red)">Error al cargar productos. Verifica que el servidor esté corriendo.</p>';
  }
}

function showLoading(show) {
  const el = document.getElementById('loadingState');
  if (el) el.style.display = show ? 'flex' : 'none';
}

// ---- Filtros ----
function applyFilters() {
  let result = [...allProducts];

  if (activeFilter !== 'all') {
    result = result.filter(p => p.categoria === activeFilter);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.marca.toLowerCase().includes(q) ||
      p.descripcion?.toLowerCase().includes(q)
    );
  }
  result = result.filter(p => parseFloat(p.precio) <= maxPrice);

  // Sort
  if (sortMode === 'price-asc') result.sort((a, b) => a.precio - b.precio);
  else if (sortMode === 'price-desc') result.sort((a, b) => b.precio - a.precio);
  else if (sortMode === 'name-asc') result.sort((a, b) => a.nombre.localeCompare(b.nombre));

  filteredProducts = result;
  renderProducts(result);
  document.getElementById('resultsCount').textContent = `${result.length} producto${result.length !== 1 ? 's' : ''}`;
}

// ---- Render cards ----
function renderProducts(products) {
  showLoading(false);
  const grid = document.getElementById('catalogGrid');
  const empty = document.getElementById('emptyState');

  if (!products.length) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = products.map(p => {
    const icon = CATEGORY_ICONS[p.categoria] || '📦';
    const stockClass = p.stock === 0 ? 'stock-out' : p.stock <= 3 ? 'stock-low' : 'stock-ok';
    const stockLabel = p.stock === 0 ? 'Agotado' : p.stock <= 3 ? `${p.stock} en stock` : 'En stock';
    const price = parseFloat(p.precio).toFixed(2);

    return `
      <article class="product-card" onclick="openProductModal(${p.id_producto})">
        <div class="card-category-bar">
          <span class="card-category">${p.categoria}</span>
          <span class="card-stock ${stockClass}">${stockLabel}</span>
        </div>
        <div class="card-img-placeholder">${icon}</div>
        <div class="card-body">
          <div class="card-brand">${p.marca}</div>
          <div class="card-name">${p.nombre}</div>
          <div class="card-model">${p.modelo}</div>
          <p class="card-desc">${p.descripcion || ''}</p>
        </div>
        <div class="card-footer">
          <div>
            <div class="card-price"><span class="price-symbol">$</span>${price}</div>
            <div class="card-warranty">${p.garantia_meses} meses garantía</div>
          </div>
          <button
            class="card-add-btn"
            ${p.stock === 0 ? 'disabled' : ''}
            onclick="event.stopPropagation(); addToCart(${p.id_producto}, '${escapeHtml(p.nombre)}')"
          >
            ${p.stock === 0 ? 'Agotado' : '+ Agregar'}
          </button>
        </div>
      </article>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ---- Modal producto ----
async function openProductModal(id) {
  try {
    const res = await fetch(`${API}/products/${id}`);
    const p = await res.json();
    if (!p || p.error) return;

    const specs = buildSpecsHTML(p);
    const price = parseFloat(p.precio).toFixed(2);
    const icon = CATEGORY_ICONS[p.categoria] || '📦';

    document.getElementById('modalContent').innerHTML = `
      <div class="modal-header">
        <div style="font-size:48px;margin-bottom:12px">${icon}</div>
        <div class="modal-cat">${p.categoria}</div>
        <div class="modal-title">${p.nombre}</div>
        <div class="modal-brand">${p.marca} · ${p.modelo}</div>
      </div>
      <p class="modal-desc">${p.descripcion || ''}</p>
      ${specs ? `<div class="modal-specs">${specs}</div>` : ''}
      <div class="modal-footer">
        <div class="modal-price">$${price}</div>
        <button class="btn-primary modal-add-btn" ${p.stock === 0 ? 'disabled' : ''}
          onclick="addToCart(${p.id_producto}, '${escapeHtml(p.nombre)}'); closeModal()">
          ${p.stock === 0 ? 'Agotado' : '🛒 Agregar al carrito'}
        </button>
      </div>
    `;

    document.getElementById('modalOverlay').classList.add('open');
    document.getElementById('productModal').classList.add('open');
  } catch (err) {
    console.error('Error abriendo modal:', err);
  }
}

function buildSpecsHTML(p) {
  const rows = [];
  const add = (label, val) => {
    if (val !== null && val !== undefined && val !== '') {
      rows.push(`<div class="spec-row"><span class="spec-label">${label}</span><span class="spec-value">${val}</span></div>`);
    }
  };

  // Specs según categoría
  if (p.cpu_nucleos) { add('Núcleos / Hilos', `${p.cpu_nucleos} / ${p.cpu_hilos}`); add('Socket', p.cpu_socket_cpu); add('TDP', `${p.cpu_tdp_w}W`); }
  if (p.placa_socket_cpu) { add('Socket', p.placa_socket_cpu); add('Tipo RAM', p.placa_tipo_ram); add('Formato', p.placa_formato); add('RAM máx', `${p.placa_ram_max_gb}GB`); }
  if (p.ram_capacidad_gb) { add('Capacidad', `${p.ram_capacidad_gb}GB`); add('Tipo', p.ram_tipo); add('Velocidad', `${p.ram_velocidad_mhz}MHz`); }
  if (p.gpu_vram_gb) { add('VRAM', `${p.gpu_vram_gb}GB`); add('Consumo', `${p.gpu_consumo_recomendado_w}W`); add('Largo', `${p.gpu_largo_mm}mm`); }
  if (p.fuente_potencia_w) { add('Potencia', `${p.fuente_potencia_w}W`); add('Certificación', p.fuente_certificacion); }
  if (p.almacenamiento_capacidad_gb) { add('Capacidad', `${p.almacenamiento_capacidad_gb >= 1000 ? p.almacenamiento_capacidad_gb/1000 + 'TB' : p.almacenamiento_capacidad_gb + 'GB'}`); add('Interfaz', p.almacenamiento_interfaz); add('Tipo', p.almacenamiento_tipo); }
  if (p.gabinete_formato_soportado) { add('Formatos', p.gabinete_formato_soportado); add('GPU máx', `${p.gabinete_largo_gpu_max_mm}mm`); }
  if (p.monitor_pulgadas) { add('Tamaño', `${p.monitor_pulgadas}"`); add('Resolución', p.monitor_resolucion); add('Refresco', `${p.monitor_tasa_refresco_hz}Hz`); }
  if (p.tipo_periferico) { add('Tipo', p.tipo_periferico); add('Conexión', p.periferico_conexion); }

  return rows.join('');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('productModal').classList.remove('open');
}

// ---- Carrito ----
let cartData = { items: [], total: 0 };

async function loadCart() {
  try {
    const res = await fetch(`${API}/cart/${SESSION_ID}`);
    cartData = await res.json();
    renderCart();
    updateCartBadge();
  } catch (err) {
    console.error('Error cargando carrito:', err);
  }
}

async function addToCart(id_producto, nombre) {
  try {
    const res = await fetch(`${API}/cart/${SESSION_ID}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_producto, cantidad: 1 }),
    });
    const data = await res.json();
    if (data.ok) {
      showToast(`✓ ${nombre} agregado al carrito`);
      await loadCart();
    } else {
      showToast(data.error || 'Error al agregar');
    }
  } catch (err) {
    console.error('Error agregando al carrito:', err);
  }
}

async function removeFromCart(itemId) {
  try {
    await fetch(`${API}/cart/${SESSION_ID}/item/${itemId}`, { method: 'DELETE' });
    await loadCart();
  } catch (err) {
    console.error('Error eliminando item:', err);
  }
}

async function clearCart() {
  try {
    await fetch(`${API}/cart/${SESSION_ID}/clear`, { method: 'DELETE' });
    await loadCart();
  } catch (err) {
    console.error('Error vaciando carrito:', err);
  }
}

function renderCart() {
  const itemsEl = document.getElementById('cartItems');
  const footerEl = document.getElementById('cartFooter');

  if (!cartData.items || cartData.items.length === 0) {
    itemsEl.innerHTML = '<p class="cart-empty">Tu carrito está vacío.</p>';
    footerEl.style.display = 'none';
    return;
  }

  footerEl.style.display = 'flex';
  itemsEl.innerHTML = cartData.items.map(item => {
    const icon = CATEGORY_ICONS[item.categoria] || '📦';
    const subtotal = (parseFloat(item.precio_unitario) * item.cantidad).toFixed(2);
    return `
      <div class="cart-item">
        <span class="cart-item-icon">${icon}</span>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.nombre}</div>
          <div class="cart-item-meta">${item.marca || ''} · x${item.cantidad} · $${parseFloat(item.precio_unitario).toFixed(2)} c/u</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <span class="cart-item-price">$${subtotal}</span>
          <button class="cart-item-remove" onclick="removeFromCart(${item.id_item})">✕</button>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('cartTotal').textContent = `$${parseFloat(cartData.total).toFixed(2)}`;
}

function updateCartBadge() {
  const count = cartData.items?.length || 0;
  document.getElementById('cartBadge').textContent = count;
}

// ---- Toast ----
let toastTimeout;
function showToast(msg) {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ---- Función global para abrir el widget (llamada desde el HTML) ----
function openAgentWidget() {
  if (window.TechCoreAgent && window.TechCoreAgent.open) {
    window.TechCoreAgent.open();
  } else {
    showToast('⚠️ El agente IA aún no está conectado');
  }
}

// ---- Exponer función addToCart al widget del agente ----
window.TechCoreStore = {
  addToCart,
  getSessionId: () => SESSION_ID,
  loadCart,
  showToast,
};

// ---- Event listeners ----
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  loadCart();

  // Filtros por categoría (nav)
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      activeFilter = link.dataset.filter;
      applyFilters();
    });
  });

  // Precio
  const priceRange = document.getElementById('priceRange');
  const priceLabel = document.getElementById('priceLabel');
  priceRange.addEventListener('input', () => {
    maxPrice = parseInt(priceRange.value);
    priceLabel.textContent = `$${maxPrice}`;
    applyFilters();
  });

  // Ordenar
  document.getElementById('sortSelect').addEventListener('change', e => {
    sortMode = e.target.value;
    applyFilters();
  });

  // Búsqueda
  let searchTimer;
  document.getElementById('searchInput').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = e.target.value.trim();
      applyFilters();
    }, 300);
  });

  // Carrito toggle
  document.getElementById('cartBtn').addEventListener('click', () => {
    document.getElementById('cartSidebar').classList.toggle('open');
    document.getElementById('cartOverlay').classList.toggle('open');
  });
  document.getElementById('cartClose').addEventListener('click', () => {
    document.getElementById('cartSidebar').classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('open');
  });
  document.getElementById('cartOverlay').addEventListener('click', () => {
    document.getElementById('cartSidebar').classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('open');
  });
  document.getElementById('cartClearBtn').addEventListener('click', clearCart);

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', closeModal);
});
