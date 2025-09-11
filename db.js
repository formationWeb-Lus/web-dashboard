// db.cjs
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ✅ Test de connexion une seule fois
pool.query("SELECT NOW()")
  .then(() => console.log('✅ Connexion PostgreSQL OK depuis web-dashboard'))
  .catch((err) => console.error('❌ Connexion PostgreSQL échouée :', err.message));

module.exports = pool;
