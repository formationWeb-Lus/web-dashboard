const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

// Middleware : sécurise l'accès
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// Fonction de normalisation : trim, minuscule, sans espaces
function normalize(str) {
  return (str || '').trim().toLowerCase().replace(/\s+/g, '');
}

router.get('/dashboard', requireLogin, async (req, res) => {
  try {
    const token = req.session.token;
    const vehicules = req.session.vehicules || [];
    let selectedVehicule = req.query.v || 'all'; // 'all' par défaut

    // Appel à l’API de positions
    const response = await axios.get('https://gps-device-server.onrender.com/api/positions/user', {
      headers: { Authorization: `Bearer ${token}` }
    });

    let positions = Array.isArray(response.data) ? response.data : [];
    console.log("✅ Positions totales reçues :", positions.length);

    // Map ID => nom pour les véhicules de l'utilisateur
    const idToNomMap = {};
    vehicules.forEach(v => {
      idToNomMap[v.id] = v.nom;
    });

    // Debug : véhicules présents dans les positions reçues
    const vehiculesDansPositions = [...new Set(positions.map(p => idToNomMap[p.vehiculeid] || p.vehiculeid))];
    console.log("🚗 Véhicules dans les positions :", vehiculesDansPositions);

    // Filtrage selon le véhicule sélectionné (via nom)
    if (normalize(selectedVehicule) !== 'all') {
      positions = positions.filter(p => {
        const nomVehicule = idToNomMap[p.vehiculeid];
        const isMatch = normalize(nomVehicule) === normalize(selectedVehicule);
        if (!isMatch) {
          console.log(`⛔ Pas un match : "${selectedVehicule}" vs "${nomVehicule}"`);
        }
        return isMatch;
      });
    }

    console.log(`📍 Positions après filtre pour "${selectedVehicule}":`, positions.length);

    // Ne garder que les 5 dernières
    positions = positions.slice(-5);

    // Géocodage enrichi pour chaque position
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
            vehiculeNom: idToNomMap[p.vehiculeid] || 'Inconnu',
            adresse,
            quartier: comps.suburb || comps.village || comps.city_district || '',
            ville: comps.city || comps.town || '',
            territoire: comps.county || '',
            province: comps.state || '',
            pays: comps.country || ''
          };
        } catch (geoErr) {
          console.error("⚠️ Erreur géocodage :", geoErr.message);
          return {
            ...p,
            vehiculeNom: idToNomMap[p.vehiculeid] || 'Inconnu',
            adresse: "Erreur géocodage"
          };
        }
      })
    );

    // Rendu de la vue
    res.render('pages/dashboard', {
      user: req.session.user,
      vehicules,
      selectedVehicule,
      positions: enrichedPositions,
      error: null
    });

  } catch (err) {
    console.error("❌ Erreur dashboard :", err.message);
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
