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
    // 1) Récupérer l'utilisateur selon son téléphone
    const userResult = await pool.query(`
      SELECT id, name, firstname, phone
      FROM users
      WHERE phone = $1
    `, [phone]);

    if (userResult.rows.length === 0) {
      return res.render('pages/login', {
        error: "Ce numéro n'est pas enregistré."
      });
    }
    const user = userResult.rows[0];

    // 2) Récupérer toutes les positions de tous les véhicules de cet utilisateur
    const positionsResult = await pool.query(`
      SELECT 
        p.id,
        p.vehiculeid,
        p.userid,
        p.latitude,
        p.longitude,
        p.vitesse,
        p.timestamp,
        p.quartier,
        p.rue,
        p.ville,
        p.comte,
        p.region,
        p.code_postal,
        p.pays
      FROM positions p
      JOIN vehicules v ON p.vehiculeid = v.vehiculeid
      WHERE v.user_id = $1
      ORDER BY p.timestamp DESC
    `, [user.id]);

    if (positionsResult.rows.length === 0) {
      return res.render('pages/login', {
        error: "Aucune position trouvée pour les véhicules associés."
      });
    }

    // Extraire la liste des véhicules (sans doublons)
    const vehicules = [...new Set(positionsResult.rows.map(pos => pos.vehiculeid))];
    const vehiculeId = vehicules[0]; // pour obtenir le token API

    // 3) Appeler l'API distante pour obtenir le token
    const apiResponse = await axios.post(
      'https://gps-device-server.onrender.com/api/vehicules-token',
      { vehiculeId }
    );
    const token = apiResponse.data.token;

    // 4) Stocker les infos en session
    req.session.user = user;
    req.session.vehicules = vehicules;
    req.session.positions = positionsResult.rows;
    req.session.token = token;

    console.log("✅ Utilisateur connecté :", user);
    console.log("🚗 Véhicules associés :", vehicules);
    console.log("📍 Positions récupérées :", positionsResult.rows.length);
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
