const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../db');

// === Affichage du formulaire de login ===
router.get('/login', (req, res) => {
  res.render('pages/login', { error: null });
});

// === Soumission du login ===
router.post('/login', async (req, res) => {
  const { phone } = req.body;

  try {
    // 1. Vérifie si l'utilisateur existe dans la base locale
    const result = await pool.query(
      'SELECT * FROM users WHERE phone = $1',
      [phone]
    );

    if (result.rows.length === 0) {
      return res.render('pages/login', {
        error: "Ce numéro n'est pas enregistré."
      });
    }

    const user = result.rows[0]; // récupère l'utilisateur trouvé
    const vehiculeId = user.vehiculeid;

    // 2. Appel à l’API distante pour obtenir le token JWT du véhicule
    const apiResponse = await axios.post(
      'https://gps-device-server.onrender.com/api/vehicules-token',
      { vehiculeId }
    );

    const token = apiResponse.data.token;

    // 3. Sauvegarde des infos en session
    req.session.user = user;
    req.session.token = token;

    console.log("✅ Utilisateur connecté :", req.session.user);
    console.log("🔐 Token API reçu :", req.session.token);

    return res.redirect('/dashboard');

  } catch (err) {
    console.error('❌ Erreur lors de la connexion :', err.message);

    return res.render('pages/login', {
      error: "Impossible de se connecter. Vérifiez votre numéro ou réessayez plus tard."
    });
  }
});

module.exports = router;
