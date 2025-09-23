const express = require('express');
const session = require('express-session');
const path = require('path');
const pool = require('./db'); // Pool PostgreSQL prêt

// Routes
const loginRoutes = require('./routes/login');
const registerRoutes = require('./routes/register'); // ✅ doit être correct
const dashboardRoutes = require('./routes/dashboard');
const historyRoutes = require('./routes/history');
const stopsRoutes = require('./routes/stop');
const settingsRoutes = require('./routes/settings');

const app = express();

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-123456',
  resave: false,
  saveUninitialized: true
}));

// EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/stops', stopsRoutes);
app.use('/', loginRoutes);
app.use('/register', registerRoutes); // ✅ doit fonctionner
app.use('/', dashboardRoutes);
app.use('/', historyRoutes);
app.use('/', settingsRoutes);

// Route map
app.get('/map', async (req, res) => {
  try {
    const vehicules = (await pool.query('SELECT * FROM vehicules')).rows;
    const positions = (await pool.query('SELECT * FROM positions ORDER BY timestamp DESC')).rows;

    const { lat, lng, vehicule } = req.query;
    res.render('map', { vehicules, positions, lat, lng, vehicule });
  } catch (err) {
    console.error("❌ Erreur /map :", err.message);
    res.status(500).send('Erreur serveur');
  }
});

// Racine → redirection vers login
app.get('/', (req, res) => res.redirect('/login'));

// Lancement serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur port ${PORT}`));
