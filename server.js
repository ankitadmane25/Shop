const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Password hashing helpers
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedValue) {
  if (!storedValue || !storedValue.includes(':')) return false;
  const [salt, hash] = storedValue.split(':');
  const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === checkHash;
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'aetheric-shop-secret-key-1337',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: false // set to true if running HTTPS
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// --- AUTH API ENDPOINTS ---

// Register
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Please provide email, password, and name' });
  }

  try {
    const checkStmt = db.prepare('SELECT id FROM users WHERE email = ?');
    const existing = checkStmt.get(email.toLowerCase().trim());
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = hashPassword(password);
    const insertStmt = db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)');
    const info = insertStmt.run(email.toLowerCase().trim(), hashedPassword, name.trim());

    req.session.userId = Number(info.lastInsertRowid);
    req.session.userName = name.trim();
    req.session.userEmail = email.toLowerCase().trim();

    return res.status(201).json({
      message: 'Registration successful',
      user: { id: req.session.userId, name: req.session.userName, email: req.session.userEmail }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Database error during registration' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  try {
    const getUserStmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = getUserStmt.get(email.toLowerCase().trim());

    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.userEmail = user.email;

    return res.json({
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Database error during login' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to log out user session' });
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logout successful' });
  });
});

// Get current user profile
app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ loggedIn: false });
  }
  return res.json({
    loggedIn: true,
    user: {
      id: req.session.userId,
      name: req.session.userName,
      email: req.session.userEmail
    }
  });
});


// --- PRODUCTS API ENDPOINTS ---

// Get all products (with optional filter/search)
app.get('/api/products', (req, res) => {
  const { search, category, sort } = req.query;
  
  let sql = 'SELECT * FROM products';
  const params = [];
  const clauses = [];

  if (category) {
    clauses.push('category = ?');
    params.push(category);
  }

  if (search) {
    clauses.push('(name LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (clauses.length > 0) {
    sql += ' WHERE ' + clauses.join(' AND ');
  }

  // Sorting
  if (sort === 'price-asc') {
    sql += ' ORDER BY price ASC';
  } else if (sort === 'price-desc') {
    sql += ' ORDER BY price DESC';
  } else if (sort === 'name-asc') {
    sql += ' ORDER BY name ASC';
  } else {
    sql += ' ORDER BY id ASC'; // Default
  }

  try {
    const productsStmt = db.prepare(sql);
    const products = productsStmt.all(...params);
    res.json(products);
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ error: 'Database error fetching products' });
  }
});

// Get product details
app.get('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  try {
    const productStmt = db.prepare('SELECT * FROM products WHERE id = ?');
    const product = productStmt.get(productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    return res.json(product);
  } catch (err) {
    console.error('Fetch product details error:', err);
    return res.status(500).json({ error: 'Database error fetching product details' });
  }
});


// --- ORDERS API ENDPOINTS ---

// Create Order (Checkout)
app.post('/api/orders', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required. Please log in to complete checkout.' });
  }

  const { cartItems, shippingAddress, paymentMethod } = req.body;
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ error: 'Shopping cart is empty' });
  }
  if (!shippingAddress || shippingAddress.trim() === '') {
    return res.status(400).json({ error: 'Please enter a valid shipping address' });
  }

  try {
    // Validate products and check stock first
    const itemsToProcess = [];
    let totalPrice = 0;

    for (const item of cartItems) {
      const getProductStmt = db.prepare('SELECT * FROM products WHERE id = ?');
      const product = getProductStmt.get(item.id);
      
      if (!product) {
        return res.status(400).json({ error: `Product not found: ID ${item.id}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}` });
      }

      totalPrice += product.price * item.quantity;
      itemsToProcess.push({
        product,
        quantity: item.quantity,
        price: product.price
      });
    }

    // Process order in a transaction
    db.exec('BEGIN TRANSACTION');

    try {
      // 1. Create order
      const createOrderStmt = db.prepare(`
        INSERT INTO orders (user_id, total_price, shipping_address, payment_method, status)
        VALUES (?, ?, ?, ?, 'Completed')
      `);
      const orderInfo = createOrderStmt.run(
        req.session.userId,
        totalPrice,
        shippingAddress.trim(),
        paymentMethod || 'Credit Card'
      );
      
      const orderId = Number(orderInfo.lastInsertRowid);

      // 2. Insert order items & update product stock
      const insertOrderItemStmt = db.prepare(`
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `);
      
      const updateStockStmt = db.prepare(`
        UPDATE products SET stock = stock - ? WHERE id = ?
      `);

      for (const item of itemsToProcess) {
        // Insert item record
        insertOrderItemStmt.run(orderId, item.product.id, item.quantity, item.price);
        // Deduct stock
        updateStockStmt.run(item.quantity, item.product.id);
      }

      db.exec('COMMIT');

      return res.status(201).json({
        message: 'Order processed successfully',
        orderId: orderId,
        totalPrice: totalPrice
      });
    } catch (transactionErr) {
      db.exec('ROLLBACK');
      throw transactionErr; // Bubble up to main catch
    }
  } catch (err) {
    console.error('Order creation error:', err);
    return res.status(500).json({ error: 'Database transaction error processing order' });
  }
});

// Get user orders (Order History)
app.get('/api/orders', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const ordersStmt = db.prepare(`
      SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC
    `);
    const orders = ordersStmt.all(req.session.userId);

    // Fetch items for each order
    const ordersWithItems = [];
    const getItemsStmt = db.prepare(`
      SELECT oi.*, p.name as product_name, p.image_url 
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `);

    for (const order of orders) {
      const items = getItemsStmt.all(order.id);
      ordersWithItems.push({
        ...order,
        items
      });
    }

    return res.json(ordersWithItems);
  } catch (err) {
    console.error('Fetch order history error:', err);
    return res.status(500).json({ error: 'Database error fetching order history' });
  }
});

// Serve frontend routing for simple client SPA or direct files
app.get('*', (req, res, next) => {
  // If request is for an API, move to next middleware (which will result in a 404 for APIs)
  if (req.path.startsWith('/api/')) {
    return next();
  }
  // Otherwise, default to landing page (since this is client SPA or routing fallback)
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Aetheric Tech Store server running on http://localhost:${PORT}`);
});
