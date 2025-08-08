const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../config/db');
const requireLogin = require('../middlewares/requireLogin');

router.get('/dashboard', requireLogin, async (req, res) => {
  const user = req.session.user;
  const selectedVehicule = req.query.v || 'all';

  try {
    // Récupérer les véhicules de l’utilisateur
    const vehiculesResult = await pool.query('SELECT id, nom FROM vehicules WHERE user_id = $1', [user.id]);
    const vehicules = vehiculesResult.rows;

    const vehiculeIds = (vehicules || []).map(v => v.id); // Sécurité ici
    const vehiculeNoms = (vehicules || []).map(v => v.nom);

    console.log('✅ Utilisateur connecté :', user);
    console.log('🚗 Véhicules associés :', vehiculeNoms);
    console.log('🚗 Véhicules associés (IDs) :', vehiculeIds);

    // Si aucun véhicule, on affiche directement la page
    if (!vehiculeIds.length) {
      return res.render('dashboard', {
        user,
        selectedVehicule,
        vehicules,
        positions: [],
        error: null,
      });
    }

    // Générer un token JWT temporaire pour l’API
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { vehiculeId: selectedVehicule !== 'all' ? selectedVehicule : null, userId: user.id },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '1h' }
    );
    console.log('🔐 Token API reçu :', token);

    // Construire l’URL de l’API
    let url = 'https://gps-device-server.onrender.com/api/positions/user';

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const params = selectedVehicule === 'all' ? {} : { vehicule: selectedVehicule };

    // Appel à l’API
    const apiResponse = await axios.get(url, { headers, params });

    const positions = apiResponse.data || [];
    console.log('📍 Positions récupérées :', positions.length);

    res.render('dashboard', {
      user,
      selectedVehicule,
      vehicules,
      positions,
      error: null,
    });
  } catch (err) {
    console.error('❌ Erreur dashboard :', err.message);

    res.render('dashboard', {
      user: req.session.user,
      selectedVehicule: req.query.v || 'all',
      vehicules: [],
      positions: [],
      error: 'Une erreur est survenue lors du chargement des données.',
    });
  }
});

module.exports = router;
