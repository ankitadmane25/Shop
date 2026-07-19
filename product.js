const detailContainer = document.getElementById('product-detail-container');

// Get product ID from URL query parameters
function getProductId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

async function fetchAndRenderProductDetail() {
  const id = getProductId();
  if (!id) {
    renderError('No product ID provided.');
    return;
  }

  try {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) {
      if (res.status === 404) {
        renderError('Product not found.');
      } else {
        throw new Error('Failed to load product details');
      }
      return;
    }

    const product = await res.json();
    renderProductDetail(product);
  } catch (error) {
    console.error('Error fetching product details:', error);
    renderError('An error occurred while loading product details. Please try again.');
  }
}

function renderError(message) {
  detailContainer.innerHTML = `
    <div class="empty-state" style="grid-column: 1 / -1;">
      <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p>${message}</p>
      <a href="index.html" class="btn-continue" style="margin-top: 16px;">Back to Catalog</a>
    </div>
  `;
}

function renderProductDetail(product) {
  const isOutOfStock = product.stock <= 0;
  
  detailContainer.innerHTML = `
    <div class="detail-img-container">
      <img src="${product.image_url}" alt="${product.name}">
    </div>
    <div class="detail-info">
      <span class="detail-category">${product.category}</span>
      <h1 class="detail-title">${product.name}</h1>
      <span class="detail-price">$${product.price.toFixed(2)}</span>
      
      <p class="detail-desc">${product.description}</p>
      
      <div class="detail-meta">
        <div class="meta-item">
          <span class="meta-label">Availability</span>
          <span class="meta-val" style="color: ${isOutOfStock ? 'var(--error)' : 'var(--success)'}">
            ${isOutOfStock ? 'Out of Stock' : `${product.stock} units available`}
          </span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Category</span>
          <span class="meta-val">${product.category}</span>
        </div>
      </div>
      
      ${isOutOfStock ? `
        <div class="detail-actions">
          <button class="btn-buy" disabled>Sold Out</button>
        </div>
      ` : `
        <div class="detail-actions">
          <div class="qty-selector">
            <button class="qty-btn" id="qty-minus" aria-label="Decrease quantity">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
              </svg>
            </button>
            <span class="qty-val" id="qty-value">1</span>
            <button class="qty-btn" id="qty-plus" aria-label="Increase quantity">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
          <button class="btn-buy" id="btn-add-to-cart">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Add to Cart
          </button>
        </div>
      `}
    </div>
  `;

  if (isOutOfStock) return;

  // Manage Quantity Selectors
  let currentQty = 1;
  const qtyVal = document.getElementById('qty-value');
  const qtyMinus = document.getElementById('qty-minus');
  const qtyPlus = document.getElementById('qty-plus');
  const addCartBtn = document.getElementById('btn-add-to-cart');

  qtyMinus.addEventListener('click', () => {
    if (currentQty > 1) {
      currentQty--;
      qtyVal.textContent = currentQty;
    }
  });

  qtyPlus.addEventListener('click', () => {
    if (currentQty < product.stock) {
      currentQty++;
      qtyVal.textContent = currentQty;
    } else {
      showToast(`Cannot increase. Only ${product.stock} units in stock.`, 'warning');
    }
  });

  addCartBtn.addEventListener('click', () => {
    const success = addToCart(product, currentQty);
    if (success) {
      currentQty = 1;
      qtyVal.textContent = 1;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  fetchAndRenderProductDetail();
});
