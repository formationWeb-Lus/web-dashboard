require('dotenv').config(); // Pour charger les variables d'environnement

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const registerRoutes = require('./routes/register');
const loginRoutes = require('./routes/login');
const dashboardRoutes = require('./routes/dashboard');
const pool = require('./db');

const app = express();

// === MIDDLEWARE ===
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-1234567890', // 🔐 Change en prod
  resave: false,
  saveUninitialized: true
}));

// === MOTEUR EJS ===
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// === CONNEXION DB ===
pool.connect()
  .then(() => console.log('✅ Connexion PostgreSQL réussie depuis web-dashboard'))
  .catch(err => console.error('❌ Échec connexion PostgreSQL :', err));

// === ROUTES ===
app.use('/', loginRoutes);
app.use('/', registerRoutes);
app.use('/', dashboardRoutes);

// === PAGE D'ACCUEIL ===
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// === DÉMARRAGE DU SERVEUR ===
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});
