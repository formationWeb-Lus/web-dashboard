const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

// Middleware : sécurise l'accès
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

router.get('/dashboard', requireLogin, async (req, res) => {
  try {
    const token = req.session.token;
    const vehicules = req.session.vehicules || [];
    let selectedVehicule = req.query.v || 'all'; // 'all' par défaut si rien choisi

    const response = await axios.get('https://gps-device-server.onrender.com/api/positions', {
      headers: { Authorization: `Bearer ${token}` }
    });

    let positions = Array.isArray(response.data) ? response.data : [];
    console.log("Positions totales reçues :", positions.length);

    // Véhicules présents dans les données reçues (pour debug)
    const vehiculesDansPositions = [...new Set(positions.map(p => p.vehiculeid))];
    console.log("Véhicules dans positions:", vehiculesDansPositions);

    // Filtrer selon selectedVehicule sauf si 'all'
    if (selectedVehicule.toLowerCase() !== 'all') {
      positions = positions.filter(p => p.vehiculeid.toLowerCase() === selectedVehicule.toLowerCase());
    }

    console.log(`Positions après filtre pour "${selectedVehicule}":`, positions.length);

    // Garder les 5 dernières positions
    positions = positions.slice(-5);

    // Géocodage enrichi
    const enrichedPositions = await Promise.all(
      positions.map(async (p) => {
        try {
          const geoRes = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
            params: {
              key: process.env.OPENCAGE_API_KEY,
              q: `${p.latitude},${p.longitude}`,
              language: 'fr',
              no_annotations: 1
            }
          });

          const result = geoRes.data.results[0];
          const comps = result?.components || {};
          const adresse = result?.formatted || "Adresse inconnue";

          return {
            ...p,
            adresse,
            quartier: comps.suburb || comps.village || comps.city_district || '',
            ville: comps.city || comps.town || '',
            territoire: comps.county || '',
            province: comps.state || '',
            pays: comps.country || ''
          };
        } catch (geoErr) {
          console.error("Erreur géocodage :", geoErr.message);
          return { ...p, adresse: "Erreur géocodage" };
        }
      })
    );

    // Envoi à la vue EJS
    res.render('pages/dashboard', {
      user: req.session.user,
      vehicules,
      selectedVehicule,
      positions: enrichedPositions,
      error: null
    });

  } catch (err) {
    console.error("Erreur dashboard :", err.message);
    res.render('pages/dashboard', {
      user: req.session.user,
      vehicules: req.session.vehicules || [],
      selectedVehicule: null,
      positions: [],
      error: "Erreur de chargement des données"
    });
  }
});

module.exports = router;
