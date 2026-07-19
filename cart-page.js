const cartItemsList = document.getElementById('cart-items-list');
const summarySubtotal = document.getElementById('summary-subtotal');
const summaryTotal = document.getElementById('summary-total');
const checkoutForm = document.getElementById('checkout-form');
const checkoutAuthWarning = document.getElementById('checkout-auth-warning');
const shippingName = document.getElementById('shipping-name');
const shippingAddress = document.getElementById('shipping-address');
const btnCheckoutSubmit = document.getElementById('btn-checkout-submit');
const cartContentWrapper = document.getElementById('cart-content-wrapper');

let isLoggedIn = false;

// Initialize cart page
async function initCartPage() {
  // Check auth state
  const session = await checkUserSession();
  if (session && session.loggedIn) {
    isLoggedIn = true;
    checkoutAuthWarning.style.display = 'none';
    shippingName.removeAttribute('disabled');
    shippingAddress.removeAttribute('disabled');
    btnCheckoutSubmit.removeAttribute('disabled');
  } else {
    isLoggedIn = false;
    checkoutAuthWarning.style.display = 'block';
    shippingName.setAttribute('disabled', 'true');
    shippingAddress.setAttribute('disabled', 'true');
    btnCheckoutSubmit.setAttribute('disabled', 'true');
  }

  renderCartItems();
}

// Render list of cart items
function renderCartItems() {
  const cart = getCart();
  
  if (cart.length === 0) {
    cartItemsList.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <p>Your shopping cart is empty.</p>
        <a href="index.html" class="btn-continue">Explore Products</a>
      </div>
    `;
    summarySubtotal.textContent = '$0.00';
    summaryTotal.textContent = '$0.00';
    btnCheckoutSubmit.setAttribute('disabled', 'true');
    return;
  }

  cartItemsList.innerHTML = '';
  let subtotal = 0;

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    const cartRow = document.createElement('div');
    cartRow.className = 'cart-item';
    
    cartRow.innerHTML = `
      <div class="cart-item-img">
        <img src="${item.imageUrl}" alt="${item.name}">
      </div>
      <div class="cart-item-info">
        <h4><a href="product.html?id=${item.productId}">${item.name}</a></h4>
        <span class="price">$${item.price.toFixed(2)}</span>
      </div>
      <div class="cart-item-actions">
        <div class="qty-selector" style="height: 40px;">
          <button class="qty-btn qty-minus-btn" data-index="${index}" aria-label="Decrease quantity">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            </svg>
          </button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn qty-plus-btn" data-index="${index}" aria-label="Increase quantity">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
        <button class="btn-remove-item remove-btn" data-index="${index}" aria-label="Remove item">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    `;

    cartItemsList.appendChild(cartRow);
  });

  summarySubtotal.textContent = `$${subtotal.toFixed(2)}`;
  summaryTotal.textContent = `$${subtotal.toFixed(2)}`;

  if (isLoggedIn) {
    btnCheckoutSubmit.removeAttribute('disabled');
  }

  // Attach event listeners
  attachCartEventListeners();
}

function attachCartEventListeners() {
  const cart = getCart();

  // Quantity Minus Buttons
  const minusButtons = cartItemsList.querySelectorAll('.qty-minus-btn');
  minusButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      if (cart[index].quantity > 1) {
        cart[index].quantity--;
        saveCart(cart);
        renderCartItems();
      } else {
        // If qty is 1, remove item
        removeItem(index);
      }
    });
  });

  // Quantity Plus Buttons
  const plusButtons = cartItemsList.querySelectorAll('.qty-plus-btn');
  plusButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      if (cart[index].quantity < cart[index].stock) {
        cart[index].quantity++;
        saveCart(cart);
        renderCartItems();
      } else {
        showToast(`Cannot add more. Only ${cart[index].stock} units available in stock.`, 'warning');
      }
    });
  });

  // Remove Item Buttons
  const removeButtons = cartItemsList.querySelectorAll('.remove-btn');
  removeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      removeItem(index);
    });
  });
}

function removeItem(index) {
  const cart = getCart();
  const itemName = cart[index].name;
  cart.splice(index, 1);
  saveCart(cart);
  renderCartItems();
  showToast(`"${itemName}" removed from cart.`, 'info');
}

// Checkout Submit Form Handler
checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!isLoggedIn) {
    showToast('You must login before checking out.', 'error');
    return;
  }

  const cart = getCart();
  if (cart.length === 0) {
    showToast('Your cart is empty.', 'error');
    return;
  }

  // Map cart items for API
  const items = cart.map(item => ({
    productId: item.productId,
    quantity: item.quantity
  }));

  const fullShipping = `${shippingName.value.trim()}\n${shippingAddress.value.trim()}`;

  btnCheckoutSubmit.setAttribute('disabled', 'true');
  btnCheckoutSubmit.textContent = 'Processing Order...';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items,
        shippingAddress: fullShipping
      })
    });

    const data = await res.json();

    if (res.ok) {
      // Clear Cart
      localStorage.removeItem('ecommerce_cart');
      updateCartCount();

      // Render Order Success Screen
      renderOrderSuccess(data);
    } else {
      showToast(data.error || 'An error occurred during checkout.', 'error');
      btnCheckoutSubmit.removeAttribute('disabled');
      btnCheckoutSubmit.innerHTML = `
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Complete Purchase
      `;
    }
  } catch (error) {
    console.error('Checkout post error:', error);
    showToast('Network error during checkout.', 'error');
    btnCheckoutSubmit.removeAttribute('disabled');
    btnCheckoutSubmit.innerHTML = `
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      Complete Purchase
    `;
  }
});

// Render dynamic success card
function renderOrderSuccess(orderData) {
  cartContentWrapper.className = 'container';
  cartContentWrapper.style.display = 'block';
  cartContentWrapper.innerHTML = `
    <div class="success-screen" style="max-width: 600px; margin: 60px auto; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 50px;">
      <div class="success-icon">
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 style="font-size: 32px; font-weight: 700; margin-bottom: 12px; letter-spacing: -1px;">Order Placed Successfully!</h2>
      <p style="color: var(--text-secondary); margin-bottom: 24px;">Thank you for your purchase. We are processing your order right away.</p>
      
      <div style="background: var(--bg-dark); border: 1px solid var(--border-color); width: 100%; border-radius: var(--radius-md); padding: 20px; text-align: left; margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="color: var(--text-muted); font-size: 13px;">Order Confirmation</span>
          <span style="font-weight: 600; color: var(--pastel-blue);">#AST-${orderData.orderId.toString().padStart(5, '0')}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted); font-size: 13px;">Total Amount</span>
          <span style="font-weight: 700; color: var(--pastel-yellow);">$${orderData.totalAmount.toFixed(2)}</span>
        </div>
      </div>
      
      <a href="index.html" class="btn-continue">Continue Shopping</a>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  initCartPage();
});
