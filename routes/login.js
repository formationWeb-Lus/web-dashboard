const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../db'); // Connexion PostgreSQL

// === Affichage du formulaire de login ===
router.get('/login', (req, res) => {
  res.render('pages/login', { error: null });
});

// === Soumission du formulaire de login ===
router.post('/login', async (req, res) => {
  const { phone } = req.body;

  try {
    // Récupérer toutes les lignes user + véhicules
    const result = await pool.query(`
      SELECT u.id, u.name, u.firstname, u.phone, v.vehiculeid
      FROM users u
      LEFT JOIN vehicules v ON v.user_id = u.id
      WHERE u.phone = $1
    `, [phone]);

    if (result.rows.length === 0) {
      return res.render('pages/login', {
        error: "Ce numéro n'est pas enregistré."
      });
    }

    // Construire l'objet utilisateur de base (une seule fois)
    const user = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      firstname: result.rows[0].firstname,
      phone: result.rows[0].phone
    };

    // Extraire tous les vehiculeId liés à ce user
    const vehicules = result.rows.map(row => row.vehiculeid).filter(Boolean); // retire les null

    if (vehicules.length === 0) {
      return res.render('pages/login', {
        error: "Aucun véhicule associé à cet utilisateur."
      });
    }

    const vehiculeId = vehicules[0]; // on utilise le premier pour le token

    console.log("📦 vehiculeId envoyé à l'API distante :", vehiculeId);

    // Appel à l'API distante pour obtenir le token
    const apiResponse = await axios.post(
      'https://gps-device-server.onrender.com/api/vehicule-token',
      { vehiculeId }
    );

    const token = apiResponse.data.token;

    // Sauvegarde en session
    req.session.user = user;
    req.session.vehicules = vehicules;
    req.session.token = token;

    console.log("✅ Utilisateur connecté :", user);
    console.log("🚗 Véhicules associés :", vehicules);
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

