require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.connect()
  .then(() => console.log('✅ Connexion PostgreSQL réussie depuis web-dashboard'))
  .catch((err) => console.error('❌ Connexion PostgreSQL échouée :', err.message));

module.exports = pool;
