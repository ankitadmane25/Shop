// Toast Notification Helper
function showToast(message, type = 'success', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Choose icon based on type
  let icon = `
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  `;
  if (type === 'success') {
    icon = `
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    `;
  } else if (type === 'error') {
    icon = `
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    `;
  } else if (type === 'warning') {
    icon = `
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    `;
  }

  toast.innerHTML = `
    ${icon}
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Automatically remove toast
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, duration);
}

// Cart Helpers (LocalStorage base)
function getCart() {
  const cart = localStorage.getItem('ecommerce_cart');
  return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
  localStorage.setItem('ecommerce_cart', JSON.stringify(cart));
  updateCartCount();
}

function addToCart(product, qty = 1) {
  const cart = getCart();
  const existingItemIndex = cart.findIndex(item => item.productId === product.id);

  if (existingItemIndex > -1) {
    // Check if new quantity exceeds product stock
    if (cart[existingItemIndex].quantity + qty > product.stock) {
      showToast(`Cannot add more items. Only ${product.stock} items available in stock.`, 'warning');
      return false;
    }
    cart[existingItemIndex].quantity += qty;
  } else {
    // Check if quantity exceeds stock
    if (qty > product.stock) {
      showToast(`Only ${product.stock} items available in stock.`, 'warning');
      return false;
    }
    cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.image_url,
      quantity: qty,
      stock: product.stock
    });
  }

  saveCart(cart);
  showToast(`"${product.name}" added to cart!`, 'success');
  return true;
}

function updateCartCount() {
  const cart = getCart();
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const badge = document.querySelector('.cart-count');
  if (badge) {
    badge.textContent = count;
  }
}

// User Session check and Header Update
async function checkUserSession() {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    
    const authWrapper = document.getElementById('header-auth-wrapper');
    if (!authWrapper) return data;

    if (data.loggedIn) {
      authWrapper.innerHTML = `
        <div class="user-badge">
          <span>Logged in as: <strong class="username">${data.username}</strong></span>
          <button onclick="handleLogout()" class="btn-logout">Logout</button>
        </div>
      `;
    } else {
      authWrapper.innerHTML = `
        <a href="login.html" class="btn-auth">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Sign In
        </a>
      `;
    }
    return data;
  } catch (error) {
    console.error('Error checking user session:', error);
  }
}

async function handleLogout() {
  try {
    const res = await fetch('/api/logout', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      showToast('Logged out successfully!', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      showToast(data.error || 'Logout failed.', 'error');
    }
  } catch (error) {
    console.error('Error during logout:', error);
    showToast('Network error during logout.', 'error');
  }
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  checkUserSession();
});
