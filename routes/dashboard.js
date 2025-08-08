const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../db');
const requireLogin = require('../middlewares/requireLogin');
const jwt = require('jsonwebtoken');

router.get('/dashboard', requireLogin, async (req, res) => {
  const user = req.session.user;
  const selectedVehiculeNom = req.query.v || 'all';

  try {
    // Récupérer les véhicules de l’utilisateur
    const vehiculesResult = await pool.query('SELECT id, nom FROM vehicules WHERE user_id = $1', [user.id]);
    const vehicules = vehiculesResult.rows;

    // Map nom => id pour faciliter la recherche
    const nomToIdMap = {};
    vehicules.forEach(v => {
      nomToIdMap[v.nom] = v.id;
    });

    console.log('✅ Utilisateur connecté :', user);
    console.log('🚗 Véhicules associés :', vehicules.map(v => v.nom));

    let vehiculeIdForToken = null;
    if (selectedVehiculeNom !== 'all') {
      vehiculeIdForToken = nomToIdMap[selectedVehiculeNom];
      if (!vehiculeIdForToken) {
        return res.render('dashboard', {
          user,
          selectedVehicule: 'all',
          vehicules,
          positions: [],
          error: `Véhicule "${selectedVehiculeNom}" non trouvé.`,
        });
      }
    }

    // Générer token JWT avec vehiculeId (ou null si tous)
    const token = jwt.sign(
      { vehiculeId: vehiculeIdForToken, userId: user.id },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '1h' }
    );
    console.log('🔐 Token API généré :', token);

    // Construire l’URL de l’API
    let url = 'https://gps-device-server.onrender.com/api/positions/user';

    // Préparer params pour filtrer véhicule si besoin
    const params = vehiculeIdForToken ? { vehicule: vehiculeIdForToken } : {};

    // Appel API avec axios
    const apiResponse = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });

    const positions = apiResponse.data || [];
    console.log(`📍 Positions récupérées : ${positions.length}`);

    res.render('dashboard', {
      user,
      selectedVehicule: selectedVehiculeNom,
      vehicules,
      positions,
      error: null,
    });
  } catch (err) {
    console.error('❌ Erreur dashboard :', err.message);
    res.render('dashboard', {
      user,
      selectedVehicule: req.query.v || 'all',
      vehicules: [],
      positions: [],
      error: 'Une erreur est survenue lors du chargement des données.',
    });
  }
});

module.exports = router;
