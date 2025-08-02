const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../db'); // ta connexion PostgreSQL

// === Affichage du formulaire de login ===
router.get('/login', (req, res) => {
  res.render('pages/login', { error: null });
});

// === Soumission du formulaire login ===
router.post('/login', async (req, res) => {
  const { phone } = req.body;

  try {
    // Requête avec jointure pour récupérer user + vehiculeid
    const result = await pool.query(`
      SELECT u.*, v.vehiculeid
      FROM users u
      LEFT JOIN vehicules v ON v.user_id = u.id
      WHERE u.phone = $1
    `, [phone]);

    if (result.rows.length === 0) {
      return res.render('pages/login', {
        error: "Ce numéro n'est pas enregistré."
      });
    }

    const user = result.rows[0];
    const vehiculeId = user.vehiculeid;

    if (!vehiculeId) {
      return res.render('pages/login', {
        error: "Aucun véhicule associé à cet utilisateur."
      });
    }

    console.log("📦 vehiculeId envoyé à l'API distante :", vehiculeId);

    // Appel API distante pour récupérer token JWT
    const apiResponse = await axios.post(
      'https://gps-device-server.onrender.com/api/vehicules-token',
      { vehiculeId }
    );

    const token = apiResponse.data.token;

    // Sauvegarde en session
    req.session.user = user;
    req.session.token = token;

    console.log("✅ Utilisateur connecté :", user);
    console.log("🔐 Token API reçu :", token);

    return res.redirect('/dashboard');

  } catch (err) {
    console.error('❌ Erreur lors de la connexion :', err.message);
    if (err.response) {
      console.error('📡 Erreur API distante :', err.response.status, err.response.data);
    }
    return res.render('pages/login', {
      error: "Impossible de se connecter. Vérifiez votre numéro ou réessayez plus tard."
    });
  }
});

module.exports = router;
