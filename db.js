const { DatabaseSync } = require('node:sqlite');
const path = require('path');

// Initialize database
const dbPath = path.join(__dirname, 'shop.db');
const db = new DatabaseSync(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 10
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total_price REAL NOT NULL,
    shipping_address TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Credit Card',
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );
`);

// Function to seed products if they don't exist yet
function seedProducts() {
  const checkStmt = db.prepare('SELECT COUNT(*) as count FROM products');
  const result = checkStmt.get();
  
  if (result.count === 0) {
    console.log('Seeding products database...');
    const seedData = [
      {
        name: 'Apex Pro Mechanical Keyboard',
        description: 'Next-gen OmniPoint 2.0 adjustable switches, OLED smart display, premium aluminum top plate, dynamic per-key RGB customization, and magnetic wrist rest.',
        price: 189.99,
        image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
        category: 'Keyboards',
        stock: 15
      },
      {
        name: 'Aether H1 Planar Headphones',
        description: 'Open-back reference-class headphones with custom-tuned planar magnetic drivers, plush micro-suede earcups, and detachable silver-core premium cable.',
        price: 299.99,
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
        category: 'Audio',
        stock: 8
      },
      {
        name: 'Nebula Desk Mat (Extra Large)',
        description: 'Ultra-smooth micro-woven cloth surface, anti-fray stitched edges, non-slip rubber base, and a stunning high-definition deep space nebula illustration.',
        price: 29.99,
        image_url: 'https://images.unsplash.com/photo-1616440347437-b1c73416efc2?w=600&auto=format&fit=crop&q=80',
        category: 'Accessories',
        stock: 50
      },
      {
        name: 'Chronos Wireless Ergonomic Mouse',
        description: 'Flawless tracking with a 26K DPI optical sensor, triple-mode connectivity (2.4G/Bluetooth/Wired), 150 hours of battery life, and lightweight ergonomic shell.',
        price: 89.99,
        image_url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80',
        category: 'Mice',
        stock: 20
      },
      {
        name: 'Helios 27" QHD Gaming Monitor',
        description: 'IPS panel with QHD (2560x1440) resolution, 180Hz refresh rate, 1ms response time, VESA DisplayHDR 400 certification, and factory-calibrated colors.',
        price: 349.99,
        image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80',
        category: 'Monitors',
        stock: 5
      },
      {
        name: 'Vanguard Modular Macro Pad',
        description: '12 fully programmable tactile keys, dual clicky rotary encoders, hot-swappable sockets, and a premium anodized aluminum black case.',
        price: 59.99,
        image_url: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=600&auto=format&fit=crop&q=80',
        category: 'Keyboards',
        stock: 12
      },
      {
        name: 'Orion XLR Condenser Microphone',
        description: 'Studio-grade cardioid polar pattern, ultra-low self-noise, built-in pop filter, custom shockmount, and a rich, warm broadcast sound profile.',
        price: 149.99,
        image_url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&auto=format&fit=crop&q=80',
        category: 'Audio',
        stock: 10
      },
      {
        name: 'Zenith Walnut Monitor Stand',
        description: 'Handcrafted from premium solid walnut wood, matte black steel support legs, raises monitor to ergonomic height, and features an integrated desk organizer slot.',
        price: 79.99,
        image_url: 'https://images.unsplash.com/photo-1616627547474-f00865a2b57e?w=600&auto=format&fit=crop&q=80',
        category: 'Accessories',
        stock: 14
      }
    ];

    const insertStmt = db.prepare(`
      INSERT INTO products (name, description, price, image_url, category, stock)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const item of seedData) {
      insertStmt.run(item.name, item.description, item.price, item.image_url, item.category, item.stock);
    }
    console.log('Seeded products database successfully.');
  }
}

seedProducts();

module.exports = db;
