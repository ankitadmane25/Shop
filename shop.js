let selectedCategory = '';
let searchQuery = '';
let selectedSort = '';
let productsData = [];

const productsContainer = document.getElementById('products-container');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const categoryContainer = document.getElementById('category-container');

// Fetch and render products
async function fetchAndRenderProducts() {
  productsContainer.innerHTML = `
    <div class="empty-state" style="grid-column: 1 / -1;">
      <p>Loading curated catalog...</p>
    </div>
  `;

  try {
    const url = new URL('/api/products', window.location.origin);
    if (selectedCategory) url.searchParams.append('category', selectedCategory);
    if (searchQuery) url.searchParams.append('search', searchQuery);
    if (selectedSort) url.searchParams.append('sort', selectedSort);

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load products');
    
    productsData = await res.json();
    renderProducts(productsData);
  } catch (error) {
    console.error('Error fetching products:', error);
    productsContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p>Could not load products. Please check if backend server is running.</p>
      </div>
    `;
  }
}

// Render products list
function renderProducts(products) {
  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>No products found matching your search or filters.</p>
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = '';
  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const isOutOfStock = product.stock <= 0;
    
    card.innerHTML = `
      <div class="product-image">
        <a href="product.html?id=${product.id}">
          <img src="${product.image_url}" alt="${product.name}">
        </a>
        <span class="product-category">${product.category}</span>
      </div>
      <div class="product-info">
        <h3 class="product-title">
          <a href="product.html?id=${product.id}">${product.name}</a>
        </h3>
        <p class="product-desc">${product.description}</p>
        <div class="product-footer">
          <span class="product-price">$${product.price.toFixed(2)}</span>
          ${isOutOfStock 
            ? '<span class="out-of-stock-badge">Sold Out</span>' 
            : `<button class="btn-add-cart" data-id="${product.id}" aria-label="Add to Cart">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
               </button>`
          }
        </div>
      </div>
    `;
    
    productsContainer.appendChild(card);
  });

  // Attach event listeners to Add to Cart buttons
  const addButtons = productsContainer.querySelectorAll('.btn-add-cart');
  addButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = parseInt(btn.dataset.id);
      const product = products.find(p => p.id === id);
      if (product) {
        addToCart(product, 1);
      }
    });
  });
}

// Debounce helper
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = e.target.value;
    fetchAndRenderProducts();
  }, 300);
});

// Sort select change
sortSelect.addEventListener('change', (e) => {
  selectedSort = e.target.value;
  fetchAndRenderProducts();
});

// Category chip selection
categoryContainer.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;

  // Update active chip UI
  categoryContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');

  selectedCategory = chip.dataset.category;
  fetchAndRenderProducts();
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
  fetchAndRenderProducts();
});
