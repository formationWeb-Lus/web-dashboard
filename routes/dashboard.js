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
    const selectedVehicule = req.query.v || 'all';

    // Appel à l’API de positions
    const apiUrl = 'https://gps-device-server.onrender.com/api/positions/user';
    const apiRes = await axios.get(apiUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("📥 Données brutes reçues de l'API :", JSON.stringify(apiRes.data, null, 2));

    let positions = [];
    if (Array.isArray(apiRes.data)) {
      positions = apiRes.data;
    } else if (Array.isArray(apiRes.data.positions)) {
      positions = apiRes.data.positions;
    }

    console.log("✅ Positions totales reçues :", positions.length);

    // Map ID => nom pour les véhicules
    const idToNomMap = {};
    vehicules.forEach(v => {
      idToNomMap[v.id] = v.nom;
    });

    // Liste des noms des véhicules trouvés dans les positions
    const vehiculesDansPositions = [...new Set(positions.map(p => idToNomMap[p.vehiculeid] || p.vehiculeid))];
    console.log("🚗 Véhicules dans les positions :", vehiculesDansPositions);

    // Filtrage par nom du véhicule si sélectionné
    let filteredPositions = positions;
    if (selectedVehicule.toLowerCase() !== 'all') {
      filteredPositions = positions.filter(p => {
        const nom = idToNomMap[p.vehiculeid];
        return nom && nom.toLowerCase() === selectedVehicule.toLowerCase();
      });
    }

    console.log(`📍 Positions après filtre pour "${selectedVehicule}" :`, filteredPositions.length);

    // Ne garder que les 5 dernières
    filteredPositions = filteredPositions.slice(-5);

    // Géocodage pour chaque position
    const enrichedPositions = await Promise.all(
      filteredPositions.map(async (p) => {
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
          console.error("❌ Erreur géocodage :", geoErr.message);
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
