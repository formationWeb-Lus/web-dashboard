const express = require('express');
const router = express.Router();
// fetch est déjà disponible dans Node.js v18+

router.get('/', (req, res) => {
  res.redirect('/login');
});

// Page de connexion
router.get('/login', (req, res) => {
  res.render('pages/login', { error: null });
});

// Page d'inscription
router.get('/register', (req, res) => {
  res.render('pages/register', { error: null });
});

// Traitement de l'inscription
router.post('/register', async (req, res) => {
  const phone = req.body.phone?.trim();
  if (!phone || phone.length < 8) {
    return res.render('pages/register', { error: 'Numéro de téléphone invalide.' });
  }

  try {
    const userRes = await fetch('https://gps-device-server.onrender.com/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });

    const userData = await userRes.json();

    if (!userRes.ok || !userData?.user || !userData.user.vehiculeid) {
      return res.render('pages/register', {
        error: userData?.message || "Utilisateur introuvable ou véhicule manquant.",
      });
    }

    // Rediriger vers login
    res.redirect('/login');
  } catch (err) {
    console.error('Erreur register:', err);
    res.render('pages/register', { error: "Erreur serveur. Veuillez réessayer." });
  }
});

// Traitement de la connexion
router.post('/login', async (req, res) => {
  const phone = req.body.phone?.trim();
  if (!phone || phone.length < 8) {
    return res.render('pages/login', { error: 'Numéro de téléphone invalide.' });
  }

  try {
    const userRes = await fetch('https://gps-device-server.onrender.com/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });

    const userData = await userRes.json();
    if (!userRes.ok || !userData?.user || !userData.user.vehiculeid) {
      return res.render('pages/login', {
        error: userData?.message || "Utilisateur ou véhicule introuvable.",
      });
    }

    const tokenRes = await fetch('https://gps-device-server.onrender.com/api/vehicule-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehiculeId: userData.user.vehiculeid }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData?.token) {
      return res.render('pages/login', { error: 'Échec de la génération du token.' });
    }

    // ✅ Stockage du token dans la session
    req.session.token = tokenData.token;
    req.session.user = userData.user;
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Erreur login:', err);
    res.render('pages/login', { error: "Erreur serveur. Veuillez réessayer." });
  }
});

// Page protégée (dashboard)
router.get('/dashboard', (req, res) => {
  if (!req.session.token) return res.redirect('/login');
  res.render('pages/dashboard', {
    token: req.session.token,
    user: req.session.user
  });
});

// Déconnexion
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});
// API pour inscription mobile
router.post('/api/pending', async (req, res) => {
  const { firstname, lastname, phone, plan, vehicleCount } = req.body;

  if (!firstname || !lastname || !phone || !plan || !vehicleCount) {
    return res.status(400).json({ message: 'Champs manquants' });
  }

  try {
    // Enregistre dans ta base ou log temporaire
    console.log('✅ Nouvelle inscription mobile ➤', req.body);

    // Tu peux l'enregistrer dans PostgreSQL ici (à ajouter)
    return res.status(200).json({ message: 'Inscription réussie' });
  } catch (err) {
    console.error('❌ Erreur API pending:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});


module.exports = router;
